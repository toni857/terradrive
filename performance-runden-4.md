# Performance-Runden 4

Ziel: Noch mehr Performance ohne sichtbare Qualitaetseinbussen. Fokus diesmal: raeumliche Kollisionssuche, weniger Cache-Neuaufbau und weniger Traversals bei Haus-Overlays.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.21`.

## Runde 1: Raeumlicher Index fuer Weltkollisionen
- Beobachtung: Kollisionsabfragen mussten trotz Query-Cache grosse Polygon- und Segmentlisten filtern.
- Verbesserung: Statische Kollisionsdaten bekommen Buckets, damit pro Position nur nahe Kandidaten geprueft werden.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Laenger gueltiger Static-Cache
- Beobachtung: Der Weltkollisionscache wurde bei gleicher Signatur sehr schnell neu gebaut.
- Verbesserung: Die TTL wurde erhoeht; echte Aenderungen invalidieren den Cache weiterhin sofort.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Signatur-Cache fuer geladene Chunks
- Beobachtung: Die Chunk-Signatur wurde auch bei identischer Chunk-Liste mehrfach neu zusammengesetzt.
- Verbesserung: Signaturen werden kurz wiederverwendet und bei Invalidierung geloescht.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Schnellere Custom-Wall-Abfragen
- Beobachtung: Custom-Waende und Fallback-Polygone wurden separat ueber komplette Listen gesucht.
- Verbesserung: Beide nutzen denselben Bucket-Index und bleiben danach im kurzen Query-Cache.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Overlay-Culling schreibt nur bei Aenderung
- Beobachtung: Sichtbarkeit wurde auch dann gesetzt, wenn sie bereits korrekt war.
- Verbesserung: `visible` wird nur aktualisiert, wenn sich der Wert wirklich aendert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Cleanup von Haus-Overlays von hinten
- Beobachtung: Entfernen von `children[0]` verschiebt bei vielen Meshes staendig das Array.
- Verbesserung: Kinder werden rueckwaerts entfernt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Batchable-Mesh-Count cachen
- Beobachtung: Vor dem Optimieren wurde jedes Overlay erneut traversiert, nur um die Mesh-Anzahl zu kennen.
- Verbesserung: Der Mesh-Count wird nach dem Build gespeichert und bei der Optimierung genutzt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Weniger Material-Clones beim Batching
- Beobachtung: Auch bei nur einem Output-Mesh pro Batch wurde ein Material geklont.
- Verbesserung: Einzel-Batches verwenden das vorbereitete Batch-Material direkt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Prioritaets-Builds koennen Timer vorziehen
- Beobachtung: Adress- oder nahe Hauschunks konnten hinter einem spaeteren Build-Timer warten.
- Verbesserung: Priorisierte Builds duerfen den bestehenden Timer nach vorne ziehen.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Build-Queue-Sortierung mit vorberechneten Scores
- Beobachtung: Die Sortierung berechnete Distanz und Prioritaet im Comparator mehrfach.
- Verbesserung: Scores werden einmal pro Chunk berechnet und dann sortiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.
