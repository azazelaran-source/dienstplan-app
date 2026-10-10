'use strict';

const Engine = (() => {
  const SHIFT_TYPES = new Set(['N','B','U','F','S','T']);
  const WEEKDAY_NAMES = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
  const NIGHT_CONTEXTS = ['school','vacation','holiday'];

  const DEFAULT_VACATIONS = [
    ['2026-01-01','2026-01-05'], ['2026-02-02','2026-02-03'], ['2026-03-23','2026-04-07'],
    ['2026-05-15','2026-05-15'], ['2026-05-26','2026-05-26'], ['2026-07-02','2026-08-12'],
    ['2026-10-12','2026-10-24'], ['2026-12-23','2027-01-09'], ['2027-02-01','2027-02-02'],
    ['2027-03-22','2027-04-03'], ['2027-05-07','2027-05-07'], ['2027-05-18','2027-05-18'],
    ['2027-07-08','2027-08-18'], ['2027-10-16','2027-10-30'], ['2027-12-23','2028-01-08'],
    ['2028-01-31','2028-02-01'], ['2028-04-10','2028-04-22'], ['2028-05-26','2028-05-26'],
    ['2028-06-06','2028-06-06'], ['2028-07-20','2028-08-30'], ['2028-10-02','2028-10-02'],
    ['2028-10-23','2028-11-04'], ['2028-12-27','2028-12-31']
  ];

  const DEFAULT_HOLIDAYS = [
    '2026-01-01','2026-04-03','2026-04-06','2026-05-01','2026-05-14','2026-05-25','2026-10-03','2026-10-31','2026-12-25','2026-12-26',
    '2027-01-01','2027-03-26','2027-03-29','2027-05-01','2027-05-06','2027-05-17','2027-10-03','2027-10-31','2027-12-25','2027-12-26',
    '2028-01-01','2028-04-14','2028-04-17','2028-05-01','2028-05-25','2028-06-05','2028-10-03','2028-10-31','2028-12-25','2028-12-26'
  ];

  // Die bisherigen Stundenwerte bleiben für Begleit, Urlaub und Team bestehen.
  // night_school/night_vacation bleiben nur zur Abwärtskompatibilität in alten Sicherungen erhalten.
  const DEFAULT_SHIFT_TIMES = {
    Montag:     {night_school:14, night_vacation:15.5, accomp_school:5.5, accomp_vacation:5.5, vacation:7.7, team:0},
    Dienstag:   {night_school:14, night_vacation:15.5, accomp_school:5.5, accomp_vacation:5.5, vacation:7.7, team:0},
    Mittwoch:   {night_school:14, night_vacation:15.5, accomp_school:5.5, accomp_vacation:5.5, vacation:7.7, team:4},
    Donnerstag: {night_school:14, night_vacation:15.5, accomp_school:5.5, accomp_vacation:5.5, vacation:7.7, team:0},
    Freitag:    {night_school:15.5, night_vacation:15.5, accomp_school:5.5, accomp_vacation:5.5, vacation:7.7, team:0},
    Samstag:    {night_school:15.5, night_vacation:15.5, accomp_school:0, accomp_vacation:0, vacation:7.7, team:0},
    Sonntag:    {night_school:14, night_vacation:15.5, accomp_school:0, accomp_vacation:0, vacation:7.7, team:0},
    Feiertag:   {night_school:15.5, night_vacation:15.5, accomp_school:0, accomp_vacation:0, vacation:7.7, team:0}
  };

  // Standardwerte erhalten die bisherigen 14/15,5-Stunden-Nächte:
  // Hauptblock 14:00-23:00 (= 9h), Frühblock werktags 5h, Wochenende/Ferien/Feiertag 6,5h.
  function makeNightContext(followWeekendLong){
    const out={};
    WEEKDAY_NAMES.forEach((day,i)=>{
      const long = followWeekendLong || i>=5;
      out[day]={main_start:'14:00',main_end:'23:00',follow_start:'05:30',follow_end:long?'12:00':'10:30'};
    });
    return out;
  }
  const DEFAULT_NIGHT_TIMES = {
    school: makeNightContext(false),
    vacation: makeNightContext(true),
    holiday: makeNightContext(true)
  };

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function pad(n){ return String(n).padStart(2,'0'); }
  function round2(n){ return Math.round((Number(n)||0)*100)/100; }
  function parseDate(s){ const [y,m,d]=String(s).split('-').map(Number); return new Date(y,m-1,d,12,0,0,0); }
  function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function addDays(d,n){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n,12,0,0,0); }
  function cmpDate(a,b){ return dateKey(a).localeCompare(dateKey(b)); }
  function weekdayIndex(d){ return (d.getDay()+6)%7; } // Montag=0
  function monthDates(monthKey){ const [y,m]=monthKey.split('-').map(Number); const count=new Date(y,m,0).getDate(); return Array.from({length:count},(_,i)=>new Date(y,m-1,i+1,12)); }

  function normalizeClock(value,allow24=false){
    const m=String(value??'').trim().match(/^(\d{1,2}):(\d{2})$/);
    if(!m) return null;
    const h=Number(m[1]),min=Number(m[2]);
    if(min<0||min>59) return null;
    if(h===24 && min===0 && allow24) return '24:00';
    if(h<0||h>23) return null;
    return `${pad(h)}:${pad(min)}`;
  }
  function clockMinutes(value,allow24=false){
    const v=normalizeClock(value,allow24); if(v===null) return null;
    if(v==='24:00') return 1440;
    const [h,m]=v.split(':').map(Number); return h*60+m;
  }
  function validNightRow(row){
    if(!row||typeof row!=='object') return false;
    const ms=clockMinutes(row.main_start,false), me=clockMinutes(row.main_end,true);
    const fs=clockMinutes(row.follow_start,false), fe=clockMinutes(row.follow_end,true);
    return ms!==null&&me!==null&&fs!==null&&fe!==null&&me>ms&&fe>fs;
  }
  function mergeNightTimes(raw){
    const out=clone(DEFAULT_NIGHT_TIMES);
    if(!raw||typeof raw!=='object') return out;
    for(const context of NIGHT_CONTEXTS){
      for(const day of WEEKDAY_NAMES){
        const src=raw?.[context]?.[day]; if(!src||typeof src!=='object') continue;
        const row={
          main_start:normalizeClock(src.main_start,false),
          main_end:normalizeClock(src.main_end,true),
          follow_start:normalizeClock(src.follow_start,false),
          follow_end:normalizeClock(src.follow_end,true)
        };
        if(validNightRow(row)) out[context][day]=row;
      }
    }
    return out;
  }
  function mergeShiftTimes(raw){
    const out=clone(DEFAULT_SHIFT_TIMES); if(!raw||typeof raw!=='object') return out;
    for(const day of [...WEEKDAY_NAMES,'Feiertag']){
      const src=raw[day]; if(!src||typeof src!=='object') continue;
      for(const key of ['night_school','night_vacation','accomp_school','accomp_vacation','vacation','team']){
        if(src[key]!==undefined && Number.isFinite(Number(src[key]))) out[day][key]=Number(src[key]);
      }
    }
    return out;
  }

  function defaultState(){
    const names=['','','','','','','','','',''];
    return {
      version:4,
      current_month:'2026-02',
      employees:names.map(name=>({name,target:0,night_max:null})),
      shifts:{},
      settings:{
        vacations:clone(DEFAULT_VACATIONS),
        holidays:[...DEFAULT_HOLIDAYS],
        shift_times:clone(DEFAULT_SHIFT_TIMES),
        night_times:clone(DEFAULT_NIGHT_TIMES)
      }
    };
  }

  function sanitizeState(raw){
    const out=defaultState();
    if(!raw || typeof raw!=='object') return out;
    if(/^\d{4}-\d{2}$/.test(String(raw.current_month||''))) out.current_month=String(raw.current_month);
    if(Array.isArray(raw.employees)){
      out.employees=[];
      for(let i=0;i<10;i++){
        const e=(raw.employees[i]&&typeof raw.employees[i]==='object')?raw.employees[i]:{};
        const rawNightMax=e.night_max;
        const nightMax=(rawNightMax===null||rawNightMax===undefined||rawNightMax==='')?null:Math.max(0,Math.round(Number(rawNightMax)||0));
        out.employees.push({name:String(e.name||'').slice(0,80),target:Number(e.target||0)||0,night_max:nightMax});
      }
    }
    if(raw.shifts && typeof raw.shifts==='object'){
      out.shifts={};
      for(const [k,day] of Object.entries(raw.shifts)){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(k) || !day || typeof day!=='object') continue;
        for(const [emp,s] of Object.entries(day)){
          const i=Number(emp);
          if(!Number.isInteger(i)||i<0||i>9||!s||typeof s!=='object'||!SHIFT_TYPES.has(s.type)) continue;
          setShift(out,parseDate(k),i,s.type,!!s.automatic);
        }
      }
    }
    if(raw.settings && typeof raw.settings==='object'){
      if(Array.isArray(raw.settings.vacations)) out.settings.vacations=raw.settings.vacations.filter(v=>Array.isArray(v)&&v.length===2).map(v=>[String(v[0]),String(v[1])]);
      if(Array.isArray(raw.settings.holidays)) out.settings.holidays=raw.settings.holidays.map(String);
      out.settings.shift_times=mergeShiftTimes(raw.settings.shift_times);
      out.settings.night_times=mergeNightTimes(raw.settings.night_times);
    }
    out.version=4;
    return out;
  }

  function activeEmployeeIndexes(state){ return state.employees.slice(0,10).map((e,i)=>String(e.name||'').trim()?i:null).filter(i=>i!==null); }
  function getShift(state,d,emp){ const s=state.shifts?.[dateKey(d)]?.[String(emp)]; return s&&SHIFT_TYPES.has(s.type)?s:null; }
  function setShift(state,d,emp,type,automatic=false){ if(!SHIFT_TYPES.has(type)) throw new Error('Unbekannter Schichttyp'); const k=dateKey(d); state.shifts[k]??={}; state.shifts[k][String(emp)]={type,automatic:!!automatic}; }
  function clearShift(state,d,emp){ const k=dateKey(d); if(!state.shifts[k]) return; delete state.shifts[k][String(emp)]; if(!Object.keys(state.shifts[k]).length) delete state.shifts[k]; }

  function isSchoolVacation(state,d){
    const k=dateKey(d);
    for(const item of state.settings?.vacations||[]){ if(!Array.isArray(item)||item.length!==2) continue; if(String(item[0])<=k && k<=String(item[1])) return true; }
    return false;
  }
  function isHoliday(state,d){ return new Set(state.settings?.holidays||[]).has(dateKey(d)); }
  function isBridgeDay(state,d){
    if(isSchoolVacation(state,d)) return false;
    const wi=weekdayIndex(d);
    if(wi===0){ const a=addDays(d,1); return isHoliday(state,a)&&!isSchoolVacation(state,a); }
    if(wi===4){ const a=addDays(d,-1); return isHoliday(state,a)&&!isSchoolVacation(state,a); }
    return false;
  }
  function timeRowName(state,d){ if(isHoliday(state,d)&&!isSchoolVacation(state,d)) return 'Feiertag'; return WEEKDAY_NAMES[weekdayIndex(d)]; }
  function nightDayType(state,d){
    // Ferien haben wie bisher Vorrang vor Feiertagen. Brückentage verwenden die Ferien-/Langnacht-Zeiten.
    if(isSchoolVacation(state,d)||isBridgeDay(state,d)) return 'vacation';
    if(isHoliday(state,d)) return 'holiday';
    return 'school';
  }
  function nightRowForDate(state,d){
    const all=state.settings?.night_times||DEFAULT_NIGHT_TIMES;
    const context=nightDayType(state,d), day=WEEKDAY_NAMES[weekdayIndex(d)];
    return all?.[context]?.[day] || DEFAULT_NIGHT_TIMES[context][day];
  }
  function intervalMinutes(a,b){ return Math.max(0,(Number(b)||0)-(Number(a)||0)); }
  function overlapMinutes(a,b,c,d){ return Math.max(0,Math.min(b,d)-Math.max(a,c)); }
  function nightMinutesForInterval(start,end){ return overlapMinutes(start,end,0,360)+overlapMinutes(start,end,1320,1440); }

  function nightShiftBreakdown(state,d){
    const next=addDays(d,1), main=nightRowForDate(state,d), follow=nightRowForDate(state,next);
    const ms=clockMinutes(main.main_start,false), me=clockMinutes(main.main_end,true);
    const fs=clockMinutes(follow.follow_start,false), fe=clockMinutes(follow.follow_end,true);
    if([ms,me,fs,fe].some(x=>x===null) || me<=ms || fe<=fs) return {workHours:0,nightWorkHours:0,readinessHours:0,sundayHolidayHours:0,workIntervals:[],readinessIntervals:[]};
    const workIntervals=[{date:d,start:ms,end:me},{date:next,start:fs,end:fe}];
    const readinessIntervals=[];
    if(me<1440) readinessIntervals.push({date:d,start:me,end:1440});
    if(fs>0) readinessIntervals.push({date:next,start:0,end:fs});
    let work=0,night=0,sunHol=0,ready=0;
    for(const x of workIntervals){
      const mins=intervalMinutes(x.start,x.end); work+=mins; night+=nightMinutesForInterval(x.start,x.end);
      if(weekdayIndex(x.date)===6 || isHoliday(state,x.date)) sunHol+=mins;
    }
    for(const x of readinessIntervals) ready+=intervalMinutes(x.start,x.end);
    return {workHours:round2(work/60),nightWorkHours:round2(night/60),readinessHours:round2(ready/60),sundayHolidayHours:round2(sunHol/60),workIntervals,readinessIntervals};
  }

  function hoursFor(state,d,type){
    const times=state.settings?.shift_times||DEFAULT_SHIFT_TIMES;
    const weekday=WEEKDAY_NAMES[weekdayIndex(d)];
    const weekdayRow=times[weekday]||DEFAULT_SHIFT_TIMES[weekday];
    const inVac=isSchoolVacation(state,d);
    if(type==='N') return nightShiftBreakdown(state,d).workHours;
    if(type==='B'){ const row=times[timeRowName(state,d)]||{}; const key=inVac?'accomp_vacation':'accomp_school'; return Number(row[key]||0); }
    if(type==='U') return Number(weekdayRow.vacation||0);
    if(type==='T'){ const row=times[timeRowName(state,d)]||{}; return Number(row.team||0); }
    return 0;
  }

  function monthActualHours(state,emp,monthKey){ let t=0; for(const d of monthDates(monthKey)){ const s=getShift(state,d,emp); if(s)t+=hoursFor(state,d,s.type); } return round2(t); }
  function monthDistributionHours(state,emp,monthKey){ let t=0; for(const d of monthDates(monthKey)){ const s=getShift(state,d,emp); if(s&&s.type!=='U') t+=hoursFor(state,d,s.type); } return round2(t); }
  function monthVacationDays(state,emp,monthKey){ let n=0; for(const d of monthDates(monthKey)) if(getShift(state,d,emp)?.type==='U') n++; return n; }
  function monthNightCount(state,emp,monthKey){ let n=0; for(const d of monthDates(monthKey)) if(getShift(state,d,emp)?.type==='N') n++; return n; }
  function adjustedNightLimit(state,emp,monthKey){
    const raw=state.employees?.[emp]?.night_max;
    if(raw===null||raw===undefined||raw==='') return null;
    const base=Math.max(0,Math.round(Number(raw)||0));
    const days=monthDates(monthKey).length, vacationDays=monthVacationDays(state,emp,monthKey);
    return Math.max(0,Math.round((base/days)*(days-vacationDays)));
  }
  function nightLimitInfo(state,emp,monthKey){
    const raw=state.employees?.[emp]?.night_max;
    const base=(raw===null||raw===undefined||raw==='')?null:Math.max(0,Math.round(Number(raw)||0));
    const vacationDays=monthVacationDays(state,emp,monthKey), count=monthNightCount(state,emp,monthKey), limit=adjustedNightLimit(state,emp,monthKey);
    return {base,vacationDays,count,limit,remaining:limit===null?null:Math.max(0,limit-count),exceeded:limit!==null&&count>limit};
  }
  // Kompatibilitätsnamen aus v6/v7: Das Nachtlimit ist ab v8 nur noch ein weiches Ziel.
  function canAddNightWithinLimit(){ return true; }
  function canSetNightWithinLimit(){ return true; }
  function monthSpecialHours(state,emp,monthKey){
    let nightWork=0,nightReadiness=0,sundayHoliday=0;
    const dates=monthDates(monthKey), first=dates[0], last=dates[dates.length-1];
    // Ein Nachtdienst des Vormonats kann am 1. des Monats noch Frühblock/Bereitschaft erzeugen.
    for(let d=addDays(first,-1);cmpDate(d,last)<=0;d=addDays(d,1)){
      const s=getShift(state,d,emp); if(s?.type!=='N') continue;
      const b=nightShiftBreakdown(state,d);
      for(const x of b.workIntervals){
        if(!dateKey(x.date).startsWith(monthKey+'-')) continue;
        nightWork+=nightMinutesForInterval(x.start,x.end)/60;
        if(weekdayIndex(x.date)===6 || isHoliday(state,x.date)) sundayHoliday+=intervalMinutes(x.start,x.end)/60;
      }
      for(const x of b.readinessIntervals){
        if(dateKey(x.date).startsWith(monthKey+'-')) nightReadiness+=intervalMinutes(x.start,x.end)/60;
      }
    }
    // Begleit/Team liegen vollständig auf ihrem Kalendertag. Urlaub ist keine gearbeitete Zeit.
    for(const d of dates){
      const s=getShift(state,d,emp); if(!s||s.type==='N') continue;
      if((weekdayIndex(d)===6||isHoliday(state,d)) && ['B','T'].includes(s.type)) sundayHoliday+=hoursFor(state,d,s.type);
    }
    return {nightWork:round2(nightWork),nightReadiness:round2(nightReadiness),sundayHoliday:round2(sundayHoliday)};
  }

  function hasNightImmediatelyBefore(state,d,emp){ return getShift(state,addDays(d,-1),emp)?.type==='N'; }
  function canSetDutyRespectingNightRest(state,d,emp,type){
    if(type==='B') return !hasNightImmediatelyBefore(state,d,emp);
    if(type==='N'){
      if(hasNightImmediatelyBefore(state,d,emp)) return false;
      const below=getShift(state,addDays(d,1),emp);
      return !below || ['T','S'].includes(below.type);
    }
    return true;
  }
  function canPlaceNight(state,d,emp){ return !getShift(state,d,emp) && canSetDutyRespectingNightRest(state,d,emp,'N'); }
  function canPlaceAccompaniment(state,d,emp){ return !getShift(state,d,emp) && canSetDutyRespectingNightRest(state,d,emp,'B'); }

  function wouldExceedTwoNightsInSixDays(state,d,emp){
    for(let offset=-5;offset<=0;offset++){
      const start=addDays(d,offset); let count=0;
      for(let j=0;j<6;j++){
        const cur=addDays(start,j); if(dateKey(cur)===dateKey(d)) continue;
        const s=getShift(state,cur,emp); if(s&&s.type==='N'){ count++; if(count>=2) return true; }
      }
    }
    return false;
  }
  function isFreeDay(state,d,emp,assumeTeamFill=true){ const s=getShift(state,d,emp); if(s) return ['U','F'].includes(s.type); if(assumeTeamFill&&hoursFor(state,d,'T')>0) return false; return true; }
  function freePairViolations(state,emp,focusMonth){
    let rangeStart,rangeEnd;
    if(focusMonth){ const ds=monthDates(focusMonth); rangeStart=addDays(ds[0],-13); rangeEnd=addDays(ds[ds.length-1],13); }
    else { const keys=Object.keys(state.shifts||{}).sort(); if(!keys.length)return []; rangeStart=parseDate(keys[0]); rangeEnd=parseDate(keys[keys.length-1]); }
    const out=[];
    for(let start=rangeStart; cmpDate(addDays(start,13),rangeEnd)<=0; start=addDays(start,1)){
      const end=addDays(start,13); let has=false;
      for(let cur=start; cmpDate(cur,end)<0; cur=addDays(cur,1)) if(isFreeDay(state,cur,emp)&&isFreeDay(state,addDays(cur,1),emp)){has=true;break;}
      if(!has) out.push([dateKey(start),dateKey(end)]);
    }
    return out;
  }

  function candidateScore(state,emp,d,type,monthKey){
    const target=Number(state.employees[emp]?.target||0); const current=monthDistributionHours(state,emp,monthKey); const deficit=target-current; const h=hoursFor(state,d,type);
    let score=deficit-0.15*Math.abs(deficit-h); let nearby=0;
    for(let delta=-3;delta<=3;delta++){ const s=getShift(state,addDays(d,delta),emp); if(!s)continue; if(s.type===type) score-=5; if(s.type==='N') nearby++; }
    if(type==='N'){
      score-=6*nearby;
      const info=nightLimitInfo(state,emp,monthKey);
      // Das urlaubskorrigierte Nacht-Ziel ist bewusst weich: deutlich bevorzugen,
      // solange jemand unter Ziel liegt; oberhalb des Ziels nur stark abwerten, nie sperren.
      if(info.limit!==null){
        const delta=info.limit-info.count;
        if(delta>0) score+=70+20*Math.min(delta,3);
        else score-=90+35*Math.min(-delta,3);
      }
    }
    const before=freePairViolations(state,emp,monthKey).length; setShift(state,d,emp,type,true); const after=freePairViolations(state,emp,monthKey).length; clearShift(state,d,emp); if(after>before) score-=250*(after-before);
    return score;
  }

  function validateManualCounts(state,monthKey){
    const msgs=[],active=activeEmployeeIndexes(state);
    for(const d of monthDates(monthKey)){
      const n=active.filter(e=>getShift(state,d,e)?.type==='N').length; const b=active.filter(e=>getShift(state,d,e)?.type==='B').length;
      if(n>1) msgs.push(`${pad(d.getDate())}.${pad(d.getMonth()+1)}.: mehr als ein Nachtdienst`);
      if(b>1) msgs.push(`${pad(d.getDate())}.${pad(d.getMonth()+1)}.: mehr als ein Begleitdienst`);
    }
    const monthDays=monthDates(monthKey);
    for(const d of monthDays) for(const e of active){
      if(getShift(state,addDays(d,-1),e)?.type==='N' && ['N','B'].includes(getShift(state,d,e)?.type)){
        msgs.push(`${pad(d.getDate())}.${pad(d.getMonth()+1)}.: ${state.employees[e].name} hat direkt nach einem Nachtdienst erneut Nacht/Begleit`);
      }
    }
    // Monatsgrenze nach vorn ebenfalls prüfen (z. B. Nacht am 31. und Begleit am 1. des Folgemonats).
    const lastDay=monthDays[monthDays.length-1];
    for(const e of active){
      if(getShift(state,lastDay,e)?.type==='N' && ['N','B'].includes(getShift(state,addDays(lastDay,1),e)?.type)){
        const next=addDays(lastDay,1);
        msgs.push(`${pad(next.getDate())}.${pad(next.getMonth()+1)}.: ${state.employees[e].name} hat direkt nach einem Nachtdienst erneut Nacht/Begleit`);
      }
    }
    return msgs;
  }

  function autoSchedule(state,monthKey){
    const errors=validateManualCounts(state,monthKey); if(errors.length) return {ok:false,messages:['Bitte zuerst Konflikte im bestehenden Plan beheben.',...errors]};
    const active=activeEmployeeIndexes(state); if(!active.length) return {ok:false,messages:['Es sind keine Mitarbeiter eingetragen.']};
    const messages=[]; const dates=[...monthDates(monthKey)].reverse();
    for(const d of dates){
      if(active.some(e=>getShift(state,d,e)?.type==='N')) continue;
      let candidates=active.filter(e=>canPlaceNight(state,d,e)&&!wouldExceedTwoNightsInSixDays(state,d,e)); let relaxed=false;
      if(!candidates.length){ candidates=active.filter(e=>canPlaceNight(state,d,e)); relaxed=!!candidates.length; }
      if(!candidates.length){ messages.push(`${pad(d.getDate())}.${pad(d.getMonth()+1)}.: Nacht wegen Ruhezeit oder anderer Regeln nicht besetzbar`); continue; }
      let best=candidates[0],bestScore=-Infinity; for(const e of candidates){ const s=candidateScore(state,e,d,'N',monthKey); if(s>bestScore){bestScore=s;best=e;} }
      setShift(state,d,best,'N',true); if(relaxed) messages.push(`${pad(d.getDate())}.${pad(d.getMonth()+1)}.: 2-Nächte-in-6-Tagen-Regel ausnahmsweise überschritten (${state.employees[best].name})`);
    }
    for(const d of dates){
      const existing=active.filter(e=>getShift(state,d,e)?.type==='B'); const required=hoursFor(state,d,'B')>0;
      if(!required){ if(existing.length) messages.push(`${pad(d.getDate())}.${pad(d.getMonth()+1)}.: Begleitdienst vorhanden, obwohl laut Zeiten keiner benötigt wird`); continue; }
      if(existing.length) continue;
      const candidates=active.filter(e=>canPlaceAccompaniment(state,d,e)); if(!candidates.length){messages.push(`${pad(d.getDate())}.${pad(d.getMonth()+1)}.: Begleit nicht besetzbar`);continue;}
      let best=candidates[0],bestScore=-Infinity; for(const e of candidates){ const s=candidateScore(state,e,d,'B',monthKey); if(s>bestScore){bestScore=s;best=e;} }
      setShift(state,d,best,'B',true);
    }
    for(const d of monthDates(monthKey)) for(const e of active){ const s=getShift(state,d,e); if(s?.type==='N'){ const nxt=getShift(state,addDays(d,1),e); if(nxt&&!['T','S'].includes(nxt.type)) messages.push(`${pad(d.getDate())}.${pad(d.getMonth()+1)}.: ${state.employees[e].name} hat am Folgetag einen unzulässigen Dienst nach Nacht`); } }
    for(const e of active){ const v=freePairViolations(state,e,monthKey); if(v.length) messages.push(`${state.employees[e].name}: Zwei-Tage-frei-Ziel konnte in ${v.length} gleitenden 14-Tage-Fenster(n) nicht vollständig eingehalten werden`); }
    for(const e of active){
      const info=nightLimitInfo(state,e,monthKey);
      if(info.limit!==null) messages.push(`${state.employees[e].name}: Nachtdienste ${info.count}/${info.limit} (weiches Ziel; Basis ${info.base}, Urlaub ${info.vacationDays} Tag${info.vacationDays===1?'':'e'})`);
    }
    return {ok:true,messages:messages.length?messages:['Nacht- und Begleitdienste wurden verteilt.']};
  }

  function fillTeam(state,monthKey){ let c=0; for(const d of monthDates(monthKey)){ if(hoursFor(state,d,'T')<=0)continue; for(const e of activeEmployeeIndexes(state)) if(!getShift(state,d,e)){setShift(state,d,e,'T',true);c++;} } return c; }
  function clearAutomatic(state,monthKey){ let c=0; for(const k of Object.keys(state.shifts||{})){ if(monthKey&&!k.startsWith(monthKey+'-'))continue; for(const [emp,s] of Object.entries(state.shifts[k]||{})) if(s?.automatic){delete state.shifts[k][emp];c++;} if(!Object.keys(state.shifts[k]||{}).length)delete state.shifts[k]; } return c; }
  function clearExceptLeaveFree(state,monthKey){ let c=0; for(const k of Object.keys(state.shifts||{})){ if(monthKey&&!k.startsWith(monthKey+'-'))continue; for(const [emp,s] of Object.entries(state.shifts[k]||{})) if(!s||!['U','F'].includes(s.type)){delete state.shifts[k][emp];c++;} if(!Object.keys(state.shifts[k]||{}).length)delete state.shifts[k]; } return c; }
  function clearAll(state,monthKey){ let c=0; for(const k of Object.keys(state.shifts||{})){ if(monthKey&&!k.startsWith(monthKey+'-'))continue; c+=Object.keys(state.shifts[k]||{}).length; delete state.shifts[k]; } return c; }

  function overview(state,monthKey){
    const [y,m]=monthKey.split('-').map(Number); const first=new Date(y,m-1,1,12); const start=addDays(first,-weekdayIndex(first)); const weeks=[];
    for(let w=0;w<6;w++){
      const row=[]; for(let j=0;j<7;j++){ const d=addDays(start,w*7+j); if(d.getMonth()!==m-1){row.push({date:null,night:'',accomp:''});continue;} let night='',accomp=''; for(const e of activeEmployeeIndexes(state)){ const s=getShift(state,d,e); if(s?.type==='N')night=state.employees[e].name; if(s?.type==='B')accomp=state.employees[e].name; } row.push({date:dateKey(d),day:d.getDate(),night,accomp,special:isSchoolVacation(state,d)||isHoliday(state,d)}); } weeks.push(row);
    }
    return weeks;
  }

  function clientPayload(state,monthKey){
    state.current_month=monthKey; const employees=clone(state.employees);
    employees.forEach((e,i)=>{
      e.actual=String(e.name||'').trim()?monthActualHours(state,i,monthKey):0;
      e.difference=round2(e.actual-Number(e.target||0));
      const nightInfo=String(e.name||'').trim()?nightLimitInfo(state,i,monthKey):{base:e.night_max??null,vacationDays:0,count:0,limit:e.night_max??null,remaining:e.night_max??null,exceeded:false};
      e.nightCount=nightInfo.count; e.nightLimit=nightInfo.limit; e.vacationDays=nightInfo.vacationDays; e.nightLimitExceeded=nightInfo.exceeded;
      const extra=String(e.name||'').trim()?monthSpecialHours(state,i,monthKey):{nightWork:0,nightReadiness:0,sundayHoliday:0};
      e.nightWork=extra.nightWork; e.nightReadiness=extra.nightReadiness; e.sundayHoliday=extra.sundayHoliday;
    });
    const days=monthDates(monthKey).map(d=>({date:dateKey(d),day:d.getDate(),weekday:WEEKDAY_NAMES[weekdayIndex(d)],vacation:isSchoolVacation(state,d),holiday:isHoliday(state,d),bridge:isBridgeDay(state,d),cells:Array.from({length:10},(_,e)=>getShift(state,d,e)?clone(getShift(state,d,e)):null)}));
    return {current_month:monthKey,employees,days,overview:overview(state,monthKey),settings:clone(state.settings)};
  }

  return {
    defaultState,sanitizeState,parseDate,dateKey,monthDates,activeEmployeeIndexes,getShift,setShift,clearShift,
    isSchoolVacation,isHoliday,isBridgeDay,hoursFor,monthActualHours,monthDistributionHours,monthVacationDays,monthNightCount,adjustedNightLimit,nightLimitInfo,canAddNightWithinLimit,canSetNightWithinLimit,monthSpecialHours,
    nightShiftBreakdown,normalizeClock,hasNightImmediatelyBefore,canSetDutyRespectingNightRest,canPlaceNight,canPlaceAccompaniment,wouldExceedTwoNightsInSixDays,
    freePairViolations,autoSchedule,fillTeam,clearAutomatic,clearExceptLeaveFree,clearAll,clientPayload
  };
})();
