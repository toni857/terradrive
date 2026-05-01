# Performance-Runden 9

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: weniger DOM-Schreibzugriffe, weniger wiederholte QuerySelector-Suchen und leichtere Building-Helfer.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.26`.

## Runde 1: Navi-Status cached DOM-Node
- Beobachtung: Jede Navi-Statusmeldung suchte den Statusknoten neu.
- Verbesserung: Der Statusknoten wird am Panel gespeichert und nur noch bei Text-/Farbwechsel beschrieben.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Navi-Modusbuttons cached
- Beobachtung: Beim Synchronisieren des Navi-Panels wurden die Mode-Buttons wiederholt gesucht und immer neu gestylt.
- Verbesserung: Buttonliste und aktiver Zustand werden gecacht; Styles werden nur bei Aenderung geschrieben.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Feature-Menue ohne globale QuerySelector-Suche
- Beobachtung: Das Feature-Menue lief periodisch ueber globale Selector-Suchen.
- Verbesserung: Die beiden bekannten Panels werden direkt per ID gelesen und ihre Inputs am Panel gecacht.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Feature-Menue schreibt nur Aenderungen
- Beobachtung: Checkboxen, Titles und Fehlerstyles wurden auch bei gleichem Zustand wieder geschrieben.
- Verbesserung: Checked-Werte und Fault-Styles werden nur aktualisiert, wenn sie sich wirklich geaendert haben.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Navi-Guidance statische Zeilen gedrosselt
- Beobachtung: Wegweiser-Status, Beschreibung und feste Eintraege wurden alle 120 ms neu geschrieben.
- Verbesserung: Statische Navi-Zeilen werden nur bei Zielwechsel oder nach einem kurzen Refresh-Intervall aktualisiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Navi-Distanzzeile nur bei Textwechsel
- Beobachtung: Die Distanzanzeige wurde auch dann neu gesetzt, wenn der sichtbare Text gleich blieb.
- Verbesserung: Der zuletzt geschriebene Distanztext wird gemerkt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Haus-Progress cached DOM-Nodes
- Beobachtung: Das Progress-Popup suchte Label, Prozentwert und Balken bei jedem Fortschritt erneut.
- Verbesserung: Die drei Nodes werden am Panel gespeichert und wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Haus-Progress schreibt nur Aenderungen
- Beobachtung: Label, Prozenttext, Balkenbreite und Display wurden auch bei gleichem Zustand neu geschrieben.
- Verbesserung: Fortschrittswerte werden gecacht und nur bei Aenderung ins DOM geschrieben.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Building-Helfer ohne unnoetige Arrays
- Beobachtung: Original-Hausmeshes, Factory-Reset und Wall-Opening-Checks erzeugten kleine Filter-/Map-Arrays.
- Verbesserung: Die Listen werden direkt gelesen oder in-place geloescht; Wall-Opening-Pruefungen laufen ueber direkte Schleifen.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Wall-Openings nach Edge gruppiert
- Beobachtung: Beim Platzieren jedes Fensters wurden Tuer-Oeffnungen derselben Wand per `filter` neu gesucht.
- Verbesserung: Tuer-Oeffnungen werden waehrend der Vorbereitung pro Edge gruppiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 11: Template-Anzahl im Building-Katalog gecacht
- Beobachtung: Die Custom-Building-Signatur zaehlte Template-Keys pro Chunk erneut.
- Verbesserung: Die Template-Anzahl wird am geladenen Katalog gespeichert.
- Status: umgesetzt in `tm-collision-hook.user.js`.
