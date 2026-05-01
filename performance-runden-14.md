# Performance-Runden 14

Ziel: Viel weitere Performance ohne sichtbare Qualitaetsreduktion. Fokus diesmal: weniger Wiederholungsarbeit in Chunks, Wanddaten, Strassenpunkten, Navi und Missionen.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.32`.

## Runde 1: Loaded-Chunks ohne Object.values/filter
- Beobachtung: Geladene Chunks wurden regelmaessig ueber `Object.values(...).filter(Boolean)` gesammelt.
- Verbesserung: Der Fastpath sammelt Chunks direkt per Schleife.
- Developer-Schalter: `perfLoadedChunkEnumeration`.

## Runde 2: Wandoeffnungen indexiert
- Beobachtung: Tuer- und Fenster-Oeffnungen wurden fuer jede Wand neu aus der Gesamtliste gefiltert.
- Verbesserung: Pro Spec entsteht ein Edge-Index fuer `doors` und `windows`.
- Developer-Schalter: `perfWallOpeningIndex`.

## Runde 3: Terrain-Samples ohne Array-Erzeugung
- Beobachtung: Fenster- und Tuer-Bodensamples erzeugten kleine Arrays pro Oeffnung.
- Verbesserung: Die drei Samples laufen direkt ueber feste Schleifen.
- Developer-Schalter: `perfTerrainSampleLoops`.

## Runde 4: Overlay-Signaturen gecacht
- Beobachtung: Custom-Building-Overlay-Signaturen wurden fuer dieselben Match-Listen wiederholt gebaut.
- Verbesserung: Match-Arrays speichern ihre letzte Signatur und Laenge.
- Developer-Schalter: `perfOverlaySignatureCache`.

## Runde 5: Build-Job Match-Reuse
- Beobachtung: Jeder Haus-Build-Job kopierte die Match-Liste.
- Verbesserung: Stabile Match-Arrays werden direkt wiederverwendet.
- Developer-Schalter: `perfBuildJobMatchReuse`.

## Runde 6: Cache-Eviction Fast Path
- Beobachtung: Cache-Eviction pruefte immer die komplette while-Logik.
- Verbesserung: Wenn der Cache unter Limit ist, wird sofort beendet.
- Developer-Schalter: `perfCacheEvictionFastPath`.

## Runde 7: Town-Label Cache
- Beobachtung: Ortsnamen werden an vielen Stellen immer gleich normalisiert.
- Verbesserung: Normalisierte Texte werden begrenzt gecacht.
- Developer-Schalter: `perfTownLabelCache`.

## Runde 8: Road-World-Point Cache
- Beobachtung: Strassenpunkte wurden immer wieder von Chunk-lokal nach Weltkoordinaten umgerechnet.
- Verbesserung: Edge-Weltpunkte werden pro Road-Edge und Chunk-Center gecacht.
- Developer-Schalter: `perfRoadWorldPointCache`.

## Runde 9: Road-Segment Point-Reuse
- Beobachtung: Autopilot-Segmenttests holten die Weltpunkte fuer jedes Segment erneut.
- Verbesserung: Segmenttests verwenden die bereits geladene Punkte-Liste.
- Developer-Schalter: `perfRoadSegmentPointReuse`.

## Runde 10: Navi-Zielauswahl ohne filter/map/sort
- Beobachtung: Das naechste Navi-Ziel wurde ueber mehrere Array-Ketten bestimmt.
- Verbesserung: Der Fastpath findet das beste Ziel in einem Durchlauf.
- Developer-Schalter: `perfNaviTargetSelection`.

## Runde 11: Find-Place Missionen ohne Vollsortierung im Fallback
- Beobachtung: Find-Place-Ziele erzeugten komplette Score-Listen.
- Verbesserung: Der Fastpath sammelt nur passende Ziele und findet Fallbacks direkt.
- Developer-Schalter: `perfMissionTargetSelection`.

## Runde 12: Passenger-Flight ohne Airport-Vollsortierung
- Beobachtung: Flughafenziele wurden komplett gemappt und sortiert.
- Verbesserung: Start- und Ziel-Flughafen werden in direkten Durchlaeufen gesucht.
- Developer-Schalter: `perfMissionTargetSelection`.

## Runde 13: Residential/Fuel/Forest Missionen ohne Sort-Ketten
- Beobachtung: Mehrere Missionstypen sortierten Zielarrays nur um das erste passende Ziel zu finden.
- Verbesserung: Die passenden Stops werden direkt mit Best-Distance-Variablen bestimmt.
- Developer-Schalter: `perfMissionTargetSelection`.

## Runde 14: Wall-Frame Lookup direkter
- Beobachtung: Angefragte Wand-Indizes wurden ueber `.find(...)` gesucht.
- Verbesserung: Der Lookup laeuft direkt per Schleife.
- Status: umgesetzt in `tm-collision-hook.user.js`.
