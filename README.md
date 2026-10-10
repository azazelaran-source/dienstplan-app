# Dienstplan Handy-App – Version v8

Die App läuft vollständig im Browser bzw. als installierbare PWA. Es wird kein Server benötigt; Dienstplandaten werden lokal auf dem jeweiligen Gerät gespeichert.

## Neu in v8
- Die bisherige harte Nacht-Obergrenze ist jetzt ein **weiches Nacht-Ziel**.
- Das persönliche Monatsziel wird weiterhin urlaubskorrigiert berechnet: `(Nacht-Ziel Basis / Kalendertage) × (Kalendertage − eingetragene Urlaubstage U)`, anschließend gerundet.
- Mitarbeiter unter ihrem Nacht-Ziel werden bei der automatischen Nachtverteilung deutlich bevorzugt; oberhalb des Ziels werden sie deutlich schlechter bewertet, bleiben aber einsetzbar. Die Planung wird deshalb nicht mehr durch das Ziel blockiert.
- Harte Ruhezeitregel: Direkt nach einem Nachtdienst darf dieselbe Person **weder Nacht- noch Begleitdienst** erhalten. Das gilt für automatische und manuelle Einträge und wird auch über Monatsgrenzen hinweg geprüft.
- Die Wochenübersicht bleibt als kompakte Wochenblöcke aufgebaut: oben Datum/Wochentag, darunter Nachtdienst, darunter Tagdienst; Wochenende dezent abgesetzt.
- Der PDF-Export der Wochenübersicht ist für **genau eine A4-Seite im Querformat** verdichtet, auch bei Monaten mit sechs dargestellten Wochenblöcken. Im Druckdialog „Als PDF speichern“ wählen.

## Nachtdienst-Zeiten und Auswertungen
- Nachtdienste bestehen aus Hauptblock am Starttag und Frühblock am tatsächlichen Folgetag.
- Zeiten sind getrennt nach Wochentag sowie Schulzeit, Ferien/Brückentag und Feiertag einstellbar.
- `24:00` ist als Schichtende zulässig.
- Arbeitszeit, Nachtarbeit (22:00–06:00), Nachtbereitschaft und Sonn-/Feiertagsarbeit werden automatisch berechnet.
- Nachtbereitschaft zählt nicht zu „Stunden Ist“; Nachtarbeit und Sonn-/Feiertagsarbeit können sich überschneiden.

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
