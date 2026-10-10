'use strict';
const STORAGE_KEY='dienstplan_pwa_v4'; // absichtlich unverändert: vorhandene lokale Daten bleiben erhalten
let persisted = loadState();
let state = null;
let selected = new Set();
let deferredInstallPrompt = null;
const SHIFT_LABELS = {N:'Nacht',B:'Begleit',U:'Urlaub',F:'Frei',S:'Supervision',T:'Team'};
const DAYS = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag','Feiertag'];
const WEEKDAYS = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const TIME_COLS = [['accomp_school','Begleit Schule'],['accomp_vacation','Begleit Ferien'],['vacation','Urlaub'],['team','Team']];
const NIGHT_CONTEXTS = [['school','Schulzeit'],['vacation','Ferien / Brückentag'],['holiday','Feiertag']];
const NIGHT_FIELDS = [['main_start','Hauptblock von'],['main_end','Hauptblock bis'],['follow_start','Frühblock von'],['follow_end','Frühblock bis']];

function el(id){return document.getElementById(id)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmt(n){let x=Number(n||0);return x.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2})}
function showStatus(text,error=false){const s=el('status');s.textContent=text||'';s.className='status show'+(error?' error':'');if(!text)s.className='status'}
function loadState(){try{return Engine.sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'))}catch{return Engine.defaultState()}}
function saveState(){persisted=Engine.sanitizeState(persisted);localStorage.setItem(STORAGE_KEY,JSON.stringify(persisted));}
function refresh(month){const m=month||persisted.current_month||'2026-02';state=Engine.clientPayload(persisted,m);saveState();selected.clear();renderAll();}

function renderAll(){renderPlan();renderOverview();renderSettings();el('monthInput').value=state.current_month}
function renderPlan(){
  const t=el('planTable');let h='<thead><tr><th>Datum</th>';
  state.employees.forEach((e,i)=>h+=`<th><input class="emp-name" data-emp="${i}" value="${esc(e.name)}" placeholder="Mitarbeiter ${i+1}"></th>`);h+='</tr></thead><tbody>';
  for(const d of state.days){
    const specials=[];if(d.vacation)specials.push('Ferien');if(d.holiday)specials.push('Feiertag');if(d.bridge)specials.push('Brücke');
    h+=`<tr><th class="date-cell ${d.vacation||d.holiday?'special':''}">${d.weekday.slice(0,2)}, ${String(d.day).padStart(2,'0')}.<span class="meta">${specials.join(' · ')}</span></th>`;
    d.cells.forEach((c,i)=>{const key=d.date+'|'+i,cls=c?c.type.toLowerCase():'',txt=c?SHIFT_LABELS[c.type]:'';h+=`<td class="shift-cell ${cls} ${selected.has(key)?'selected':''}" data-date="${d.date}" data-emp="${i}">${txt}${c&&c.automatic?'<span class="auto-badge">auto</span>':''}</td>`});h+='</tr>';
  }
  h+='<tr class="hours-row"><th>Stunden Soll</th>';state.employees.forEach((e,i)=>h+=`<td><input type="number" step="0.1" class="target" data-emp="${i}" value="${Number(e.target||0)}"></td>`);h+='</tr>';
  h+='<tr class="hours-row night-limit-row"><th>Nacht-Obergrenze (Basis)</th>';state.employees.forEach((e,i)=>h+=`<td><input type="number" min="0" step="1" class="night-max" data-emp="${i}" value="${e.night_max===null||e.night_max===undefined?'':Number(e.night_max)}" placeholder="–"></td>`);h+='</tr>';
  h+='<tr class="hours-row night-limit-row"><th>Nacht-Ziel/Limit nach Urlaub</th>';state.employees.forEach(e=>h+=`<td class="${e.nightLimitExceeded?'limit-exceeded':''}">${e.nightLimit===null?'–':fmt(e.nightLimit)}</td>`);h+='</tr>';
  h+='<tr class="hours-row night-limit-row"><th>Nachtdienste Ist</th>';state.employees.forEach(e=>h+=`<td class="${e.nightLimitExceeded?'limit-exceeded':''}">${fmt(e.nightCount)}</td>`);h+='</tr>';
  h+='<tr class="hours-row"><th>Stunden Ist</th>';state.employees.forEach(e=>h+=`<td>${fmt(e.actual)}</td>`);h+='</tr>';
  h+='<tr class="hours-row"><th>Differenz</th>';state.employees.forEach(e=>h+=`<td>${fmt(e.difference)}</td>`);h+='</tr>';
  h+='<tr class="hours-row supplement-row"><th>Nachtarbeit</th>';state.employees.forEach(e=>h+=`<td>${fmt(e.nightWork)}</td>`);h+='</tr>';
  h+='<tr class="hours-row supplement-row"><th>Nachtbereitschaft</th>';state.employees.forEach(e=>h+=`<td>${fmt(e.nightReadiness)}</td>`);h+='</tr>';
  h+='<tr class="hours-row supplement-row"><th>Sonn-/Feiertagsarbeit</th>';state.employees.forEach(e=>h+=`<td>${fmt(e.sundayHoliday)}</td>`);h+='</tr></tbody>';
  t.innerHTML=h;
  t.querySelectorAll('.shift-cell').forEach(td=>td.addEventListener('click',()=>{const k=td.dataset.date+'|'+td.dataset.emp;if(selected.has(k))selected.delete(k);else selected.add(k);td.classList.toggle('selected')}));
  t.querySelectorAll('.emp-name,.target,.night-max').forEach(inp=>inp.addEventListener('change',saveEmployees));
}
function saveEmployees(){state.employees.forEach((e,i)=>{const rawNightMax=document.querySelector(`.night-max[data-emp="${i}"]`)?.value??'';persisted.employees[i]={name:document.querySelector(`.emp-name[data-emp="${i}"]`)?.value||'',target:Number(document.querySelector(`.target[data-emp="${i}"]`)?.value||0),night_max:rawNightMax===''?null:Math.max(0,Math.round(Number(rawNightMax)||0))}});saveState();refresh(state.current_month)}
function selectedCells(){return [...selected].map(k=>{const [date,employee]=k.split('|');return {date,employee:Number(employee)}})}
function mark(type){if(!selected.size)return showStatus('Bitte zuerst mindestens eine Dienstplanzelle auswählen.',true);const cells=selectedCells();let n=0,blocked=0;for(const c of cells){if(!String(persisted.employees[c.employee]?.name||'').trim())continue;const d=Engine.parseDate(c.date),existing=Engine.getShift(persisted,d,c.employee);if(type==='N'&&!Engine.canSetNightWithinLimit(persisted,d,c.employee)){blocked++;continue;}Engine.setShift(persisted,d,c.employee,type,false);n++}saveState();const month=state.current_month;refresh(month);showStatus(`${n} Zelle(n) markiert.${blocked?` ${blocked} Nachtdienst(e) wegen der Nacht-Obergrenze nicht gesetzt.`:''}`,blocked>0&&n===0)}
function clearSelected(){if(!selected.size)return showStatus('Bitte zuerst Zellen auswählen.',true);let n=0;for(const c of selectedCells()){if(Engine.getShift(persisted,Engine.parseDate(c.date),c.employee)){Engine.clearShift(persisted,Engine.parseDate(c.date),c.employee);n++}}saveState();refresh(state.current_month);showStatus(`${n} markierte Schicht(en) gelöscht.`)}
function monthLabel(monthKey){
  const [y,m]=monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
}
function overviewDateLabel(item,weekdayIndex){
  if(!item?.date)return '';
  const d=Engine.parseDate(item.date);
  const short=['Mo','Di','Mi','Do','Fr','Sa','So'][weekdayIndex];
  return `<span class="overview-weekday">${short}</span><span class="overview-date">${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.</span>`;
}
function renderOverview(){
  el('overviewTitle').textContent=`Wochenübersicht – ${monthLabel(state.current_month)}`;
  let h='';
  state.overview.forEach((week,weekIndex)=>{
    const hasDays=week.some(d=>d.date);
    if(!hasDays)return;
    h+=`<div class="overview-week-card" data-week="${weekIndex}"><table class="overview-week-table"><tbody>`;
    h+='<tr class="overview-date-row"><th class="overview-row-label">Datum</th>';
    week.forEach((d,i)=>{const weekend=i>=5?' weekend':'';const special=d?.special?' special':'';h+=d?.date?`<th class="overview-day-head${weekend}${special}">${overviewDateLabel(d,i)}</th>`:`<th class="overview-day-head empty${weekend}"></th>`});
    h+='</tr>';
    h+='<tr class="overview-night-row"><th class="overview-row-label night-label">Nachtdienst</th>';
    week.forEach((d,i)=>h+=`<td class="overview-name-cell${i>=5?' weekend':''}">${esc(d?.night||'')}</td>`);h+='</tr>';
    h+='<tr class="overview-day-row"><th class="overview-row-label day-label">Tagdienst</th>';
    week.forEach((d,i)=>h+=`<td class="overview-name-cell${i>=5?' weekend':''}">${esc(d?.accomp||'')}</td>`);h+='</tr>';
    h+='</tbody></table></div>';
  });
  el('overviewWeeks').innerHTML=h||'<p>Für diesen Monat sind keine Tage vorhanden.</p>';
}
function exportOverviewPdf(){
  document.body.classList.add('print-overview');
  const cleanup=()=>document.body.classList.remove('print-overview');
  window.addEventListener('afterprint',cleanup,{once:true});
  setTimeout(()=>{window.print();setTimeout(cleanup,1000)},50);
}

function renderNightSettings(){
  const times=state.settings.night_times||{};
  let html='<div class="night-grid">';
  for(const [context,label] of NIGHT_CONTEXTS){
    html+=`<div class="night-card"><h3>${label}</h3><div class="table-scroll"><table class="settings-table night-table"><thead><tr><th>Tag</th>${NIGHT_FIELDS.map(x=>`<th>${x[1]}</th>`).join('')}</tr></thead><tbody>`;
    for(const day of WEEKDAYS){
      html+=`<tr><th>${day}</th>${NIGHT_FIELDS.map(([key])=>`<td><input class="clock-input" type="text" inputmode="numeric" placeholder="HH:MM" data-night-context="${context}" data-night-day="${day}" data-night-key="${key}" value="${esc(times?.[context]?.[day]?.[key]||'')}"></td>`).join('')}</tr>`;
    }
    html+='</tbody></table></div></div>';
  }
  html+='</div>';el('nightTimes').innerHTML=html;
}
function renderSettings(){
  renderNightSettings();
  const times=state.settings.shift_times||{};let h='<thead><tr><th>Tag</th>'+TIME_COLS.map(x=>`<th>${x[1]}</th>`).join('')+'</tr></thead><tbody>';
  DAYS.forEach(day=>{h+=`<tr><th>${day}</th>`+TIME_COLS.map(([key])=>`<td><input type="number" step="0.1" data-day="${day}" data-key="${key}" value="${Number(times[day]?.[key]||0)}"></td>`).join('')+'</tr>'});h+='</tbody>';el('timesTable').innerHTML=h;
  el('vacations').innerHTML=(state.settings.vacations||[]).map((v,i)=>`<div class="setting-row"><input type="date" data-vac="${i}" data-pos="0" value="${esc(v[0])}"><span>bis</span><input type="date" data-vac="${i}" data-pos="1" value="${esc(v[1])}"><button data-del-vac="${i}">×</button></div>`).join('');
  el('holidays').innerHTML=(state.settings.holidays||[]).map((v,i)=>`<div class="setting-row"><input type="date" data-hol="${i}" value="${esc(v)}"><button data-del-hol="${i}">×</button></div>`).join('');
  document.querySelectorAll('[data-del-vac]').forEach(b=>b.onclick=()=>{state.settings.vacations.splice(Number(b.dataset.delVac),1);renderSettings()});document.querySelectorAll('[data-del-hol]').forEach(b=>b.onclick=()=>{state.settings.holidays.splice(Number(b.dataset.delHol),1);renderSettings()});
}
function saveSettings(){
  const times={};DAYS.forEach(day=>{times[day]={};TIME_COLS.forEach(([key])=>times[day][key]=Number(document.querySelector(`input[data-day="${day}"][data-key="${key}"]`)?.value||0))});
  const nightTimes={};
  for(const [context,label] of NIGHT_CONTEXTS){
    nightTimes[context]={};
    for(const day of WEEKDAYS){
      nightTimes[context][day]={};
      for(const [key,fieldLabel] of NIGHT_FIELDS){
        const inp=document.querySelector(`input[data-night-context="${context}"][data-night-day="${day}"][data-night-key="${key}"]`);
        const normalized=Engine.normalizeClock(inp?.value||'',key.endsWith('_end'));
        if(normalized===null){showStatus(`Ungültige Zeit bei ${label}, ${day}, ${fieldLabel}. Bitte HH:MM verwenden; als Schichtende ist auch 24:00 erlaubt.`,true);inp?.focus();return;}
        nightTimes[context][day][key]=normalized;
      }
      const r=nightTimes[context][day];
      const toMin=(v)=>v==='24:00'?1440:Number(v.slice(0,2))*60+Number(v.slice(3,5));
      if(toMin(r.main_end)<=toMin(r.main_start)||toMin(r.follow_end)<=toMin(r.follow_start)){showStatus(`Bei ${label}, ${day} muss „bis“ jeweils nach „von“ liegen. Für Mitternacht bitte 24:00 verwenden.`,true);return;}
    }
  }
  const vacations=[];document.querySelectorAll('[data-vac][data-pos="0"]').forEach(inp=>{const i=Number(inp.dataset.vac),end=document.querySelector(`[data-vac="${i}"][data-pos="1"]`)?.value;if(inp.value&&end)vacations.push([inp.value,end])});
  const holidays=[...document.querySelectorAll('[data-hol]')].map(x=>x.value).filter(Boolean).sort();
  persisted.settings={...persisted.settings,shift_times:times,night_times:nightTimes,vacations,holidays};saveState();refresh(state.current_month);showStatus('Einstellungen gespeichert. Nachtstunden und Zuschlagszeiten wurden neu berechnet.');
}
function downloadBackup(){const blob=new Blob([JSON.stringify(persisted,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`dienstplan-sicherung-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function installHelp(){const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);if(isiOS){alert('iPhone/iPad: In Safari auf Teilen tippen und „Zum Home-Bildschirm“ wählen. Danach startet der Dienstplan wie eine App.')}else{alert('Falls kein Installationsdialog erscheint: Browser-Menü öffnen und „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.')}}
async function tryInstall(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;el('installApp').textContent='App installieren';}else installHelp()}
function initEvents(){
  el('loadMonth').onclick=()=>{const m=el('monthInput').value;if(/^\d{4}-\d{2}$/.test(m)){persisted.current_month=m;saveState();refresh(m);showStatus('Monat geladen.')}};
  document.querySelectorAll('.shift').forEach(b=>b.onclick=()=>mark(b.dataset.shift));el('clearSelected').onclick=clearSelected;el('clearSelection').onclick=()=>{selected.clear();document.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'))};
  el('autoSchedule').onclick=()=>{if(!confirm('Automatische Verteilung starten? Manuelle Markierungen bleiben bestehen.'))return;const r=Engine.autoSchedule(persisted,state.current_month);saveState();refresh(state.current_month);showStatus((r.messages||[]).join('\n'),!r.ok)};
  el('fillTeam').onclick=()=>{if(!confirm('Alle freien Zellen an Teamtagen gelb füllen?'))return;const n=Engine.fillTeam(persisted,state.current_month);saveState();refresh(state.current_month);showStatus(`${n} Team-Zelle(n) ergänzt.`)};
  el('clearAuto').onclick=()=>{if(!confirm('Alle automatisch erzeugten Schichten dieses Monats entfernen?'))return;const n=Engine.clearAutomatic(persisted,state.current_month);saveState();refresh(state.current_month);showStatus(`${n} automatische Schicht(en) entfernt.`)};
  el('clearExcept').onclick=()=>{if(!confirm('Alle Schichten außer Urlaub und Freiwunsch dieses Monats entfernen?'))return;const n=Engine.clearExceptLeaveFree(persisted,state.current_month);saveState();refresh(state.current_month);showStatus(`${n} Schicht(en) entfernt; Urlaub/Freiwunsch bleiben.`)};
  el('clearAll').onclick=()=>{if(!confirm('Wirklich alle Schichten dieses Monats entfernen?'))return;const n=Engine.clearAll(persisted,state.current_month);saveState();refresh(state.current_month);showStatus(`${n} Schicht(en) des Monats entfernt.`)};
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');el(b.dataset.tab).classList.add('active')});
  el('exportOverviewPdf').onclick=exportOverviewPdf;
  el('saveSettings').onclick=saveSettings;el('addVacation').onclick=()=>{state.settings.vacations.push(['','']);renderSettings()};el('addHoliday').onclick=()=>{state.settings.holidays.push('');renderSettings()};el('exportBtn').onclick=downloadBackup;el('installApp').onclick=tryInstall;
  el('importFile').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;try{persisted=Engine.sanitizeState(JSON.parse(await f.text()));saveState();refresh(persisted.current_month);showStatus('Sicherung importiert.')}catch(e){showStatus('Import fehlgeschlagen: '+e.message,true)}};
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;el('installApp').textContent='App installieren'});
}
window.addEventListener('DOMContentLoaded',async()=>{try{initEvents();refresh(persisted.current_month);if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('./service-worker.js')}catch(e){console.warn(e)}}}catch(e){console.error(e);const box=document.getElementById('status');if(box){box.textContent='Startfehler: '+(e&&e.message?e.message:String(e));box.className='status show error';}}});
