# Performance-Runden 5

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: geteilte Overlay-Ressourcen, weniger Bruecken-/Tunnel-Neuberechnung und weniger unsichtbare Runtime-Objekte.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.22`.

## Runde 1: Shared Overlay- und Road-Materialien
- Beobachtung: POIs, Tiere, kleine Runtime-Objekte und Road-Refreshes erzeugten viele identische oder wiederholte Materialien.
- Verbesserung: Farb-/Transparenzmaterialien werden gecacht und Road-Material-Clones werden pro Originalmaterial wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Shared Box-Geometrien fuer Runtime-Overlays
- Beobachtung: Viele kleine Boxen nutzen identische Masse.
- Verbesserung: `createBox` nutzt gerundete, wiederverwendete Box-Geometrien.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Shared Ellipsoid-Grundgeometrie
- Beobachtung: Voegel, Bienen und kleine Details erzeugten staendig dieselbe Kugelgeometrie.
- Verbesserung: Ellipsoide teilen sich eine SphereGeometry und skalieren nur den Mesh.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Road-Segment-Cache pro Chunk
- Beobachtung: Bruecken- und Tunnelpruefungen bauten Road-Segment-Listen mehrfach neu.
- Verbesserung: Road-Signaturen und Road-Segmente werden pro Chunk kurz wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Bridge-Clearance-Zonen cachen
- Beobachtung: Die Kreuzungspruefung fuer Bruecken ist quadratisch in der Segmentzahl.
- Verbesserung: Clearance-Zonen werden pro Road-Signatur wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Bridge-Pillar-Sanitizer ueberspringt gleiche Signaturen
- Beobachtung: Website-Brueckenpfeiler wurden bei unveraendertem Chunk erneut gesucht.
- Verbesserung: Wenn Road- und Gruppen-Signatur gleich bleiben, wird der teure Traversal ausgelassen.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Bridge-Pillar-Bounds cachen
- Beobachtung: Fuer jeden moeglichen Pfeiler wurde wieder eine Box3 berechnet.
- Verbesserung: Lokale Bounds werden am Objekt gespeichert und wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Tunnel-Bridge-Overlay nur bei Aenderung neu bauen
- Beobachtung: Tunnel-Bruecken wurden bei jedem Visual-Refresh geleert und neu erzeugt.
- Verbesserung: Ein Road-Signaturcheck verhindert identische Neubauten.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Wildlife nur nahe genug erzeugen
- Beobachtung: Unsichtbare Vogelschwaerme konnten fuer weiter entfernte geladene Chunks entstehen.
- Verbesserung: Wildlife wird nur ausserhalb der sichtbaren Grenze gepuffert erzeugt und pro Lauf begrenzt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Overlay-Liste periodisch bereinigen
- Beobachtung: Abgelaufene/entfernte Overlay-Eintraege konnten weiter in Runtime-Loops bleiben.
- Verbesserung: Die Overlay-Liste wird in groesseren Abstaenden kompakt bereinigt; Sichtbarkeit wird nur bei Aenderung geschrieben.
- Status: umgesetzt in `tm-collision-hook.user.js`.
