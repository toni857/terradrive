# Performance-Runden 8

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: weniger Zwischenarrays, weniger Callback-Overhead und leichtere Custom-Building-Vorbereitung.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.25`.

## Runde 1: POI-Signatur ohne Array.from-Kette
- Beobachtung: POI-Overlays bauten Signaturen ueber `Array.from`, `map`, `reduce` und weitere Zwischenarrays.
- Verbesserung: Chunk-Keys, POI-Zaehler und erwartete Anzahl werden in direkten Loops aufgebaut.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Bestehende POIs in einem Durchlauf erfassen
- Beobachtung: Bestehende POIs wurden erst gefiltert und danach gemappt.
- Verbesserung: Zaehler und Key-Set entstehen jetzt in einem einzigen Loop ueber `overlayItems`.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: POI-Listen sicher einmal normalisieren
- Beobachtung: Beim Erzeugen neuer POIs wurde implizit davon ausgegangen, dass die Cache-Liste direkt ein Array ist.
- Verbesserung: Jede POI-Liste wird einmal mit `toSafeArray` normalisiert und danach wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Custom-Building-Prepare-Signatur ohne slice/map
- Beobachtung: Die Chunk-Signatur erzeugte fuer die ersten 180 Haeuser ein Slice-Array und danach ein Map-Array.
- Verbesserung: Die Signaturteile werden in einem begrenzten For-Loop aufgebaut.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Catalog-Buildings nur einmal lesen
- Beobachtung: Beim Matchen von Custom-Buildings wurde `toSafeArray(catalog.buildings)` mehrfach pro Iteration aufgerufen.
- Verbesserung: Catalog-Buildings und Templates werden vor der Schleife gecacht.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Restliche PNG-Haeuser ohne filter-Callback
- Beobachtung: Nach dem Matching wurde die verbleibende Building-Liste per `filter` erzeugt.
- Verbesserung: Ein direkter Loop baut die Liste der nicht ersetzten Haeuser.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Unique-Chunk-Liste ohne filter-Chain
- Beobachtung: Custom-Building-Vorbereitung erzeugte `Set`, Filterliste und Arbeitsliste als Kette.
- Verbesserung: Deduplizierung und Work-Check passieren in einem Loop.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Near-Position-Vorbereitung ohne geladene Chunks zu filtern
- Beobachtung: Nahe Custom-Building-Chunks wurden ueber `getLoadedChunks().filter(...)` gesammelt.
- Verbesserung: Ein direkter Loop sammelt nur passende Chunks.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Door-/Queue-Cleanup ohne filter-Neuaufbau
- Beobachtung: Mehrere Cleanup-Pfade bauten Door-, Build- und Optimize-Queues per `filter` neu.
- Verbesserung: Kleine Helper entfernen Chunk-/Overlay-Eintraege mit direkten Loops oder Splice.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Build-Queue-Sortierung leichter
- Beobachtung: Die Build-Queue nutzte `filter().map().sort().map()` und echte Distanzen.
- Verbesserung: Scoring passiert in einem Loop mit Prioritaetsrang und Distanzquadrat.
- Status: umgesetzt in `tm-collision-hook.user.js`.
