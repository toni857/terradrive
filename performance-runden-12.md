# Performance-Runden 12

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: weniger Zwischenarrays in Signaturen, Caches und Custom-Building-Queues.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.29`.

## Runde 1: World-Collision-Signatur ohne map-Kette
- Beobachtung: Die Chunk-Signatur fuer Weltkollisionen erzeugte erst eine Map-Liste und sortierte diese danach.
- Verbesserung: Signaturteile werden direkt gesammelt und nur bei mehreren Chunks sortiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Match-/Edge-Laengen direkter lesen
- Beobachtung: Signaturen normalisierten Arrays ueber `toSafeArray`, obwohl die Hotpath-Daten bereits Arrays sind.
- Verbesserung: Match- und Edge-Laengen werden direkt aus Arrays gelesen.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Static-Collision-Cache ohne Spread-Push
- Beobachtung: Chunk-Caches wurden mit `push(...array)` zusammengefuegt.
- Verbesserung: Cache-Listen werden direkt per Loop angehaengt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Spatial-Index ohne unnoetige Safe-Array-Wrapper
- Beobachtung: Der raeumliche Kollisionsindex normalisierte jede Cache-Liste erneut.
- Verbesserung: Bekannte Cache-Arrays werden direkt iteriert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Custom-Building-Bounds ohne Punkte-Sammelliste
- Beobachtung: Overlay-Bounds sammelten alle Footprint-Punkte in `worldPoints`.
- Verbesserung: Summe, Min/Max und Punktzahl werden waehrend der Iteration berechnet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Bounds-Radius ueber Min/Max statt zweiter Punktpass
- Beobachtung: Fuer den Radius wurde nach dem Mittelpunkt nochmal jeder Punkt durchlaufen.
- Verbesserung: Der Radius wird konservativ aus den Min/Max-Ausdehnungen berechnet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Optimize-Queue in-place kompaktiert
- Beobachtung: Vor jedem Queue-Push wurde eine neue `compacted`-Liste gebaut.
- Verbesserung: Die bestehende Optimize-Queue wird per Write-Index verdichtet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Build-Queue-Sortierung ohne finale map
- Beobachtung: Nach dem Sortieren wurde die Queue per `scored.map(...)` neu erzeugt.
- Verbesserung: Die bestehende Queue wird mit sortierten Chunk-Referenzen ueberschrieben.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Priority-Targets ohne filter/slice
- Beobachtung: Adress-Prioritaetsziele wurden per `filter(...).slice(-8)` erneuert.
- Verbesserung: Die Liste wird in-place bereinigt und auf acht Eintraege begrenzt.
- Status: umgesetzt in `tm-collision-hook.user.js`.
