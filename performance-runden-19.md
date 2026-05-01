# Performance-Runden 19

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Autopilot-Routing, POI-Keys, Startmenue-Suche, Culling und Optimierungsqueue.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.37`.

## Runde 1: Route-Step-Lookup per Map
- Beobachtung: Der Autopilot suchte zur aktuellen Strasse den Route-Step mit `.find`.
- Verbesserung: Nach dem Route-Build wird eine WeakMap fuer Edge -> Step und eine Index-Map aufgebaut.
- Developer-Schalter: `perfRouteStepLookupMap`.

## Runde 2: Route-Index ohne findIndex
- Beobachtung: `syncAutopilotRouteIndex` lief ueber die ganze Route.
- Verbesserung: Der Fastpath nutzt den gecachten Route-Key direkt.
- Developer-Schalter: `perfRouteStepLookupMap`.

## Runde 3: Autopilot-Open-Set ohne Vollsortierung
- Beobachtung: Beim Route-Rebuild wurde die offene Liste in jeder Iteration komplett sortiert.
- Verbesserung: Der Fastpath sucht das kleinste `f` direkt und haelt zusaetzlich eine Key-Map fuer Updates.
- Developer-Schalter: `perfAutopilotOpenMinScan`.

## Runde 4: Outgoing-Road-Loops ohne Safe-Array-Kopien
- Beobachtung: Ausgehende Strassen und Node-Listen liefen immer ueber `toSafeArray`.
- Verbesserung: Der Fastpath verwendet vorhandene Arrays direkt und iteriert indexbasiert.
- Developer-Schalter: `perfAutopilotOutgoingLoops`.

## Runde 5: Same-Edge-Richtung ohne Sortierung
- Beobachtung: Wenn Start und Ziel auf derselben Road-Edge liegen, wurden zwei Richtungen sortiert.
- Verbesserung: Der Fastpath vergleicht direkt Forward/Backward.
- Developer-Schalter: `perfSameEdgeDirectionSelect`.

## Runde 6: Chunk-POI-Key cachen
- Beobachtung: POI-Keys fuer Chunks wurden mehrfach aus `cx/cz` gerundet und zusammengesetzt.
- Verbesserung: Der Fastpath speichert den Key direkt am Chunk, solange `cx/cz` gleich bleiben.
- Developer-Schalter: `perfChunkPoiKeyCache`.

## Runde 7: Startmenue-Ziel cachen
- Beobachtung: Die Startmenue-Integration durchsucht haeufig DOM-Buttons.
- Verbesserung: Der Fastpath cached den gefundenen Zielcontainer kurzzeitig und prueft `document.contains`.
- Developer-Schalter: `perfStartMenuTargetCache`.

## Runde 8: Culling-Distanz ohne Hilfsfunktion
- Beobachtung: Custom-Haus-Culling rief fuer jeden Chunk eine Distanzfunktion auf.
- Verbesserung: Der Fastpath berechnet X/Z-Distanz direkt.
- Developer-Schalter: `perfCullingDistanceMath`.

## Runde 9: Optimize-Queue ohne leeres Pruning
- Beobachtung: Beim Einreihen einer Overlay-Optimierung wurde auch bei leerer Queue ein Prune-Durchlauf vorbereitet.
- Verbesserung: Der Fastpath ueberspringt den Prune-Block bei leerer Queue.
- Developer-Schalter: `perfOptimizeQueuePrune`.

## Runde 10: Developer-Modulliste cachen
- Beobachtung: Das F8-Menue baute die interne Modulliste bei jedem Aufbau neu.
- Verbesserung: Die Liste wird gecacht und bei Modul-/Fault-Aenderungen invalidiert.
- Developer-Schalter: `perfDeveloperModuleCache`.
