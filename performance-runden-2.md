# Performance-Runden 2

Ziel: Weitere 10 unabhaengige Performance-Updates fuer die 3D-Haeuser und Runtime-Overlays, ohne sichtbare Qualitaetsreduktion. `index.js` bleibt unveraendert.

## Runde 1: Shared Custom-Building-Materialien
- Beobachtung: Beim Hausbau entstehen viele gleiche MeshBasicMaterial-Objekte mit identischer Farbe/Transparenz/Textur.
- Verbesserung: Material-Cache fuer Custom-Building- und Detail-Materialien. Geteilte Materialien werden beim normalen Overlay-Cleanup nicht disposed.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Shared BoxGeometries
- Beobachtung: Tueren, Fenster, Rahmen, Waende und Details erzeugen sehr viele BoxGeometry-Instanzen mit gleichen oder fast gleichen Massen.
- Verbesserung: Gerundete BoxGeometry-Cache-Keys, geteilte Geometrien und sicherer Dispose-Schutz.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Window-Layout-Cache
- Beobachtung: Fensterrechtecke werden pro Wand immer wieder aus denselben Parametern berechnet.
- Verbesserung: Cache fuer `computeWindowLayout`, begrenzt per LRU.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Terrain-Sample-Cache beim Hausbau
- Beobachtung: Terrainhoehen werden fuer Fundament, Fensterfreiheit und Tueren mehrfach an fast identischen Punkten abgefragt.
- Verbesserung: Custom-building-spezifischer Terrain-Cache mit gerundeten Weltkoordinaten.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Tuer-Update-Cache
- Beobachtung: Jede Tuer berechnet alle 50 ms ihre World-Position neu, obwohl sich Haus und Tueranker nicht bewegen.
- Verbesserung: Tuer-Weltposition beim Sammeln speichern; im Auto geschlossene Tueren nicht weiter animieren.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Sichtfeld-Culling fuer Haus-Overlays
- Beobachtung: Der Browser rendert auch 3D-Haus-Overlays, die sicher ausserhalb des Sichtfelds liegen.
- Verbesserung: Konservatives Frustum-/Distanz-Culling pro Overlay. Das ist bewusst kein aggressives Occlusion-Culling hinter anderen Objekten, weil sonst sichtbare Ecken verschwinden koennten.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Speed-aware Build-Scheduler
- Beobachtung: Beim schnellen Fahren ist jeder Build-Slice kritischer.
- Verbesserung: Build-Budget und Queue-Delay passen sich an die Fahrzeuggeschwindigkeit an; nahe/priorisierte Chunks bleiben bevorzugt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Coalesced Collision-Cache-Invalidierung
- Beobachtung: Mehrere Haus-/Overlay-Schritte invalidieren Weltkollisions-Caches mehrfach kurz hintereinander.
- Verbesserung: Invalidierungen werden fuer Haus-Updates gesammelt und zeitlich entkoppelt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Batch-Key-Cache
- Beobachtung: Beim Mesh-Batching wird fuer jedes Mesh wieder ein Material-Key als String gebaut.
- Verbesserung: Material-Batch-Key wird am Material gecacht und nur neu berechnet, wenn sich relevante Werte aendern.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Overlay-Bounds wiederverwenden
- Beobachtung: Culling, Queue-Sortierung und Debug brauchen immer wieder Zentrum/Radius eines Overlays.
- Verbesserung: Bounds werden nach dem Build einmal gespeichert und danach wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.
