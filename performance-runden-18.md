# Performance-Runden 18

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Missionsziele, POI-Overlays, Airport-Daten, Custom-Haus-Pipeline und Mesh-/Material-Hotpaths.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.36`.

## Runde 1: Gasstation-Missionsziele cachen
- Beobachtung: Fuel-Missionsziele wurden bei jedem Mission-Aufbau neu aus allen geladenen Chunks gesammelt.
- Verbesserung: Der Fastpath cached die Ziel-Liste anhand der geladenen Chunk-Signatur.
- Developer-Schalter: `perfGasStationMissionCache`.

## Runde 2: Main-Road-Missionsziele cachen
- Beobachtung: Main-Road-Checkpoints liefen wiederholt ueber alle Road-Edges.
- Verbesserung: Der Fastpath cached Checkpoints pro Chunk- und Road-Typ-Signatur.
- Developer-Schalter: `perfMainRoadMissionCache`.

## Runde 3: POI-Signatur ohne Zwischenarrays
- Beobachtung: POI-Overlay-Signaturen wurden ueber `chunkKeys` und `poiCounts` Arrays aufgebaut.
- Verbesserung: Der Fastpath baut die Signatur direkt als String.
- Developer-Schalter: `perfPoiOverlaySignatureDirect`.

## Runde 4: Naechster POI ohne Hilfsfunktion
- Beobachtung: Die POI-Naehesuche rief fuer jedes Overlay eine Distanzfunktion auf.
- Verbesserung: Der Fastpath rechnet X/Z-Distanz direkt in der Schleife.
- Developer-Schalter: `perfNearestPoiScan`.

## Runde 5: Airport-Richtung ohne Vector-Klone
- Beobachtung: Runway-Richtung und Mittelpunkt wurden ueber mehrere Vector-Klone berechnet.
- Verbesserung: Der Fastpath berechnet Richtung und Center direkt numerisch.
- Developer-Schalter: `perfAirportDirectionMath`.

## Runde 6: Batchable-Mesh-Count wirklich cachen
- Beobachtung: Overlays mit wenigen Meshes konnten trotzdem erneut traversiert werden.
- Verbesserung: Mesh-Counts speichern jetzt Gueltigkeit und Limit mit.
- Developer-Schalter: `perfBatchableMeshCountCache`.

## Runde 7: Chunk-Work-Fastpath
- Beobachtung: `needsCustomBuildingChunkWork` berechnete die Overlay-Signatur auch dann, wenn klar neu gebaut werden muss.
- Verbesserung: Der Fastpath bricht vor der Signatur ab, wenn Overlay/Parent/Ready-State fehlen.
- Developer-Schalter: `perfNeedsChunkWorkFastPath`.

## Runde 8: Prepare-near Chunk Cache
- Beobachtung: Adressnahe Custom-Haus-Vorbereitung suchte wiederholt passende Chunks.
- Verbesserung: Der Fastpath cached die Chunk-Liste fuer gerundete Positionen und die aktuelle Loaded-Chunk-Liste.
- Developer-Schalter: `perfPrepareNearChunkCache`.

## Runde 9: Static-Cache Early Bypass
- Beobachtung: Wenn der Static-Collision-Cache im Developer-Menue aus ist, wurde trotzdem zuerst eine Signatur berechnet.
- Verbesserung: Der Fastpath baut die Static-Daten direkt ohne Signaturvorarbeit.
- Developer-Schalter: `perfStaticCacheEarlyBypass`.

## Runde 10: Build-Queue-Score wiederverwenden
- Beobachtung: Die Custom-Haus-Build-Queue berechnete Prioritaet und Distanz bei Sortierungen neu.
- Verbesserung: Scores werden pro Chunk fuer gerundete Spielerposition und Priority-Signatur wiederverwendet.
- Developer-Schalter: `perfBuildQueueScoreReuse`.

## Runde 11: Geometry-Merge ohne filter
- Beobachtung: Geometry-Merges erzeugten vor dem Merge ein neues Filter-Array per Callback.
- Verbesserung: Der Fastpath sammelt gueltige Geometrien in einer direkten Schleife.
- Developer-Schalter: `perfGeometryMergeFilter`.

## Runde 12: Geometry-Attribute ohne Object.keys/every im Fastpath
- Beobachtung: Batch-Normalisierung pruefte einfache Attribute ueber `Object.keys(...).every(...)`.
- Verbesserung: Der Fastpath prueft Attribute direkt per `for...in`.
- Developer-Schalter: `perfNormalizeGeometryAttributes`.

## Runde 13: Basic-Material-Key ohne Array-Join
- Beobachtung: Materialcache-Keys fuer Basic-Materialien wurden ueber ein Array gebaut.
- Verbesserung: Der Fastpath baut den Key direkt per String.
- Developer-Schalter: `perfBasicMaterialKey`.
