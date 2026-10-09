# Dienstplan Handy-App – korrigierte Version v3

Diese Version behebt den Startfehler der vorherigen PWA, durch den die Dienstplan- und Wochenübersichtstabellen nicht gerendert wurden.

Die App zeigt unter **Planung** die Dienstplantabelle mit Datum und bis zu 10 Mitarbeiterspalten. Unter **Wochenübersicht** erscheinen Nacht- und Begleitdienste.

Beim Austausch einer bereits installierten Version bitte die Seite nach dem Hochladen einmal neu laden. Der Offline-Cache wurde auf v3 angehoben, damit die alte fehlerhafte Fassung ersetzt wird.

# Dienstplan Handy-App (PWA)

Diese Version läuft vollständig im Browser des Handys. Es wird kein Python-Server und kein PC benötigt.

## Funktionen
- Bis zu 10 variable Mitarbeiter
- Nacht, Begleit, Urlaub, Freiwunsch, Supervision, Team
- Monatsplanung, Wochenübersicht, Soll/Ist/Differenz
- Ferien, Feiertage und automatisch erkannte Brückentage
- Urlaub zählt zur Ist-Zeit, nicht zum Verteilungskontingent
- Nachtstunden richten sich nach dem Folgetag
- Kein Begleitdienst direkt nach Nacht
- Möglichst höchstens 2 Nachtdienste in 6 Tagen
- Weiche Zwei-Tage-frei-Regel in 14-Tage-Fenstern
- Automatische Dienstverteilung
- Lokale Datenspeicherung auf dem Gerät
- JSON-Sicherung und Wiederherstellung
- Offline-Nutzung nach Installation

## Wichtig für die Installation
Eine PWA muss einmal über eine HTTPS-Adresse geöffnet werden. Die Dateien können auf jedem statischen HTTPS-Webspace liegen (z. B. GitHub Pages, Netlify oder eigener Webspace). Danach lässt sich die App installieren und offline benutzen.

### Android
1. HTTPS-Adresse in Chrome öffnen.
2. `App installieren` antippen oder Browser-Menü > `App installieren` / `Zum Startbildschirm hinzufügen`.
3. Danach erscheint `Dienstplan` wie eine normale App.

### iPhone/iPad
1. HTTPS-Adresse in Safari öffnen.
2. Teilen-Symbol antippen.
3. `Zum Home-Bildschirm` wählen.
4. Danach startet die App im eigenen App-Fenster und funktioniert offline.

## Lokaler Test am PC
Im entpackten Ordner z. B. ausführen:

    python -m http.server 8080

Dann `http://localhost:8080` öffnen. Für die Installation auf einem Handy ist jedoch eine HTTPS-Adresse erforderlich.

## Datensicherheit
Die Dienstplandaten werden im lokalen Browser-Speicher des Geräts abgelegt. Regelmäßig unter `Einstellungen > Sicherung herunterladen` eine JSON-Sicherung erstellen. Browserdaten löschen entfernt auch die lokal gespeicherten Dienstplandaten.
