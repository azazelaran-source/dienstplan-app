# Dienstplan Handy-App – Version v7

Die App läuft vollständig im Browser bzw. als installierbare PWA. Es wird kein Server benötigt; Daten werden lokal auf dem jeweiligen Gerät gespeichert.

## Neu in v7
- Pro Mitarbeiter gibt es eine editierbare **Nacht-Obergrenze**. Leer bedeutet: keine Begrenzung.
- Für den gewählten Monat wird daraus automatisch das gerundete **Nacht-Ziel nach Urlaub** berechnet: `(Obergrenze / Kalendertage) × (Kalendertage − eingetragene Urlaubstage U)`.
- Die Obergrenze ist hart: Automatische und manuelle neue Nachtdienste werden oberhalb des berechneten Monatslimits nicht vergeben. Bereits vorhandene Pläne, die nachträglich über die Grenze geraten, werden markiert und müssen vor einer neuen Automatik-Verteilung korrigiert werden.
- Zusätzlich zeigt die Haupttabelle die bereits eingetragenen Nachtdienste je Mitarbeiter an.
- Die sonstige Gewichtung und Verteilungslogik der Automatik bleibt unverändert, damit die Wirkung der Obergrenze separat getestet werden kann.

## Neu in v5
- Nachtdienste bestehen aus zwei echten Zeitblöcken: Hauptblock am Starttag und Frühblock am Folgetag.
- Zeiten sind getrennt nach Wochentag sowie Schulzeit, Ferien/Brückentag und Feiertag einstellbar.
- Der Hauptblock wird nach dem Starttag gewählt; der Frühblock nach dem tatsächlichen Folgetag.
- `24:00` ist als Schichtende zulässig.
- Die Arbeitszeit eines Nachtdienstes wird aus beiden Zeitblöcken automatisch berechnet.
- Unter der Haupttabelle werden je Mitarbeiter zusätzlich ausgewiesen:
  - Nachtarbeit: tatsächlich gearbeitete Zeit zwischen 22:00 und 06:00 Uhr
  - Nachtbereitschaft: Lücke zwischen Hauptblock und Frühblock
  - Sonn-/Feiertagsarbeit: tatsächlich gearbeitete Zeit an Sonntagen oder Feiertagen
- Nachtarbeit und Sonn-/Feiertagsarbeit dürfen sich überschneiden. Nachtbereitschaft zählt nicht zu Stunden Ist.
- Bestehende lokale Daten der vorherigen anonymisierten Version werden weiterverwendet. Fehlende neue Nachtdienst-Zeiten werden mit kompatiblen Standardwerten ergänzt.

## Weitere Funktionen
- Bis zu 10 Mitarbeiter
- Nacht, Begleit, Urlaub, Freiwunsch, Supervision und Team
- Monatsplanung und Wochenübersicht
- Soll/Ist/Differenz
- Ferien, Feiertage und Brückentage
- Automatische Dienstverteilung
- JSON-Sicherung und Wiederherstellung
- Offline-Nutzung nach Installation

## Datensicherheit
Die Dienstplandaten liegen im lokalen Browser-Speicher des Geräts. Das öffentliche Repository enthält keine eingetragenen Mitarbeiterdaten. Regelmäßig unter `Einstellungen > Sicherung herunterladen` eine JSON-Sicherung erstellen. Das Löschen der Website-Daten entfernt auch die lokal gespeicherten Dienstplandaten.


## Neu in v7
- Wochenübersicht als klar getrennte Wochenblöcke: Datum oben, Nachtdienst darüber vor Tagdienst.
- Samstag/Sonntag dezent farblich abgesetzt und Wochen mit kräftigerem Außenrahmen.
- PDF-Export über die Schaltfläche „Wochenübersicht als PDF“; im System-Druckdialog „Als PDF speichern“ wählen.
