# Performance-Runden 22

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Distanzrechnung, Overlay-Geometriekeys, Airport-/Overlay-Scans und Footprint-Hilfsfunktionen.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.40`.

## Runde 1: Distanzrechnung mit sqrt-Fastpath
- Beobachtung: `getDistance2D` und `townDistance2D` nutzten `Math.hypot`, obwohl nur X/Z-Distanzen gebraucht werden.
- Verbesserung: Der Fastpath berechnet `sqrt(dx*dx + dz*dz)` direkt.
- Developer-Schalter: `perfDistanceSqrtFastPath`.

## Runde 2: Overlay-Box-Key ohne Hilfsarray
- Beobachtung: Box-Geometriekeys wurden ueber ein temporaeres Wertearray gebaut.
- Verbesserung: Der Fastpath setzt den Cache-Key direkt aus gerundeten X/Y/Z-Werten zusammen.
- Developer-Schalter: `perfOverlayGeometryKeyDirect`.

## Runde 3: Overlay-Cylinder-Key ohne Hilfsarray
- Beobachtung: Cylinder-Geometriekeys erzeugten fuer Radius/Hoehe ein Array.
- Verbesserung: Der Fastpath baut den Key direkt.
- Developer-Schalter: `perfOverlayGeometryKeyDirect`.

## Runde 4: Airport-Duplicate-Check ohne some-Closure
- Beobachtung: Airport-Overlays prueften vorhandene Items per `.some`.
- Verbesserung: Der Fastpath scannt die Overlay-Liste direkt und bricht beim ersten Treffer ab.
- Developer-Schalter: `perfAirportOverlayDuplicateScan`.

## Runde 5: Overlay-Sichtweite ohne Distanzfunktion
- Beobachtung: Overlay-Culling fragte pro Item `getDistanceSq2D` ab.
- Verbesserung: Der Fastpath rechnet X/Z-Distanz direkt in der Schleife.
- Developer-Schalter: `perfOverlayVisibilityDistanceMath`.

## Runde 6: Footprint-Center indexbasiert
- Beobachtung: Footprint-Mittelpunkte liefen ueber `for...of`.
- Verbesserung: Der Fastpath nutzt eine indexbasierte Schleife.
- Developer-Schalter: `perfFootprintCenterLoop`.

## Runde 7: Footprint-Area mit direktem Next-Index
- Beobachtung: Flaechenberechnung nutzte pro Punkt Modulo fuer den naechsten Punkt.
- Verbesserung: Der Fastpath fuehrt den Next-Index direkt.
- Developer-Schalter: `perfFootprintAreaLoop`.

## Runde 8: Footprint-Samples indexbasiert
- Beobachtung: Die Sample-Punkt-Erzeugung nutzte `for...of`.
- Verbesserung: Der Fastpath baut die Punktkopien indexbasiert.
- Developer-Schalter: `perfFootprintSampleLoop`.

## Runde 9: Door-Item-Removal in-place
- Beobachtung: Beim Entfernen von Tueritems wurde eine neue Liste erzeugt.
- Verbesserung: Der Fastpath kompaktiert die bestehende Liste in-place.
- Developer-Schalter: `perfDoorItemRemovalInPlace`.

## Runde 10: Optimize-Queue-Removal in-place
- Beobachtung: Beim Entfernen von Overlay-Optimierungsjobs wurde eine neue Liste gebaut.
- Verbesserung: Der Fastpath kompaktiert die Queue in-place.
- Developer-Schalter: `perfOptimizeQueueRemovalInPlace`.
