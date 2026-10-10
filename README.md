# Dienstplan Handy-App – Version v5

Die App läuft vollständig im Browser bzw. als installierbare PWA. Es wird kein Server benötigt; Daten werden lokal auf dem jeweiligen Gerät gespeichert.

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
