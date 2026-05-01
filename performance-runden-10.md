# Performance-Runden 10

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Runtime-Listen in-place kompaktieren, Airport-Systeme leichter halten und Reichweitenchecks ohne Wurzelberechnung fortsetzen.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.27`.

## Runde 1: Overlay-Kind-Cleanup ohne filter
- Beobachtung: Beim Deaktivieren von Overlay-Arten wurde die ganze Overlay-Liste per `filter` neu gebaut.
- Verbesserung: Geloeschte Gruppen werden entfernt, verbleibende Items werden in einem direkten Loop gesammelt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Runway-Liste ohne filter
- Beobachtung: Flughafen-Runways wurden ueber eine Filter-Kette gesammelt.
- Verbesserung: Gueltige Runways werden in einem direkten Loop gesammelt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Runway-Building-Unterdrueckung ohne filter
- Beobachtung: Haeuser auf Landebahnen wurden per `chunk.buildings.filter(...)` entfernt.
- Verbesserung: Die verbleibenden Haeuser werden direkt in eine Liste geschrieben.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Runway-Abstand ohne Math.hypot
- Beobachtung: Jeder Haus-zu-Runway-Test berechnete eine echte Distanz.
- Verbesserung: Der Check nutzt Distanzquadrate und vermeidet Wurzelberechnungen.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Airport-Punkte ohne map-Callback
- Beobachtung: Runway-Weltpunkte wurden per `map(point => point.clone()...)` aufgebaut.
- Verbesserung: Ein direkter Loop baut die Punktliste und ueberspringt zu kurze Runways.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Flugzeuglichter schreiben nur bei Wechsel
- Beobachtung: Parkende Flugzeuge setzten die Sichtbarkeit der Lichter jedes Animationsupdate neu.
- Verbesserung: `visible` wird nur geschrieben, wenn sich der Blinkzustand aendert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Airport-Signatur ohne map/sort-Kette
- Beobachtung: Airport-Overlay-Signaturen erzeugten Zwischenarrays per `map`.
- Verbesserung: Keys werden direkt gesammelt, sortiert und verbunden.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Airport-Existing-Keys ohne filter/map
- Beobachtung: Bestehende Airport-/Aircraft-Keys wurden per `filter(...).map(...)` gesammelt.
- Verbesserung: Ein einziger Loop fuellt das Key-Set.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Bot-Flugzeuge in-place kompaktieren
- Beobachtung: `updateBotAircraft` erzeugte pro Update ein neues `keep`-Array.
- Verbesserung: Die bestehende Botliste wird mit Write-Index in-place kompaktiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Projektile in-place kompaktieren
- Beobachtung: Projektilupdates bauten pro Frame eine neue Keep-Liste.
- Verbesserung: Projektile werden in-place behalten oder entfernt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 11: Polizei-Zielliste ohne filter beim Raketenhit
- Beobachtung: Bei einem Raketentreffer wurde die Polizeiliste per `filter` neu erzeugt.
- Verbesserung: Getroffene Polizeieintraege werden rueckwaerts per `splice` entfernt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 12: Overlay-Cleanup in-place
- Beobachtung: Periodisches Overlay-Cleanup baute die Liste per `filter` neu.
- Verbesserung: Die Liste wird direkt ueber einen Write-Index verdichtet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 13: Ersatzauto-Suche ohne Entries-Array
- Beobachtung: Die Suche nach einem stehlbaren Botauto baute erst eine komplette Entry-Liste.
- Verbesserung: Die CarMaps werden je nach Datenstruktur direkt besucht.
- Status: umgesetzt in `tm-collision-hook.user.js`.
