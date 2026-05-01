# Performance-Runden 3

Ziel: Noch mehr Performance ohne sichtbare Qualitaetseinbussen. Fokus diesmal: weniger Traversals, weniger temporaere Objekte, weniger Kollisionssuche und bessere Priorisierung.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.20`.

## Runde 1: Kleine Overlays nicht batchen
- Beobachtung: Mesh-Merging kostet bei kleinen Hausgruppen mehr Zeit als es spart.
- Verbesserung: Overlays unter einem Mindestwert werden als optimiert markiert und nicht gemerged.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Culling in Portionen
- Beobachtung: Sichtfeld-Culling ueber alle geladenen Chunks kann selbst zu einem kleinen Spike werden.
- Verbesserung: Pro Tick wird nur eine begrenzte Anzahl Chunks geprueft, mit Round-Robin-Fortschritt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Wiederverwendete Culling-Objekte
- Beobachtung: Matrix, Frustum und Sphere wurden bei jedem Culling neu erzeugt.
- Verbesserung: Temp-Objekte werden im Runtime-State wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Kollisionsquery-Cache
- Beobachtung: Weltkollisionen filtern pro Frame mehrfach dieselben Polygone/Segmente.
- Verbesserung: Quantisierte Query-Ergebnisse werden kurz gecacht und nach Cache-Invalidierung geleert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Wall-Frames pro Haus wiederverwenden
- Beobachtung: Wand-Frames werden fuer Tueren, Fenster, Fallback-Tueren und Detail-Waende mehrfach berechnet.
- Verbesserung: Frames werden pro Spec gespeichert und wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Build-Queue nach Entfernung sortieren
- Beobachtung: Nicht alle wartenden Chunks sind gleich wichtig.
- Verbesserung: Die Queue sortiert nahe/priorisierte Chunks nach vorne.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Optimierungs-Queue entdoppeln und klein halten
- Beobachtung: Optimierungen koennen fuer nicht mehr sichtbare oder schon erledigte Overlays im Queue bleiben.
- Verbesserung: Die Queue wird beim Einfuegen und Abarbeiten staerker dedupliziert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Geometry-Normalisierung fuer bereits einfache Geometrien abkuerzen
- Beobachtung: Beim Batching werden Attribute geloescht und Normals geprueft, auch wenn das Ergebnis schon passt.
- Verbesserung: Fruehe Rueckgabe fuer einfache, nicht texturierte Positions/Normal-Geometrien.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Door-Update noch staerker drosseln
- Beobachtung: Tueren brauchen nur nahe am Spieler sehr haeufige Updates.
- Verbesserung: Entfernte oder geschlossene Tueren werden seltener aktualisiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Cache-Cleanup bei Reload/Feature-Wechsel
- Beobachtung: Performance-Caches sollen schnell bleiben und keine alten Daten halten.
- Verbesserung: Caches werden bei Reload und Feature-Neuaufbau gezielt geleert oder begrenzt.
- Status: umgesetzt in `tm-collision-hook.user.js`.
