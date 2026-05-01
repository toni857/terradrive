# Performance-Runden 11

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Kollisions-Hotpaths, Wall-Opening-Signaturen und Bridge-Clearance.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.28`.

## Runde 1: Segmentdistanz ohne Wurzel
- Beobachtung: Tunnelwand-Kollisionschecks brauchten nur einen Reichweitenvergleich.
- Verbesserung: `distancePointToSegmentSq2D` vergleicht Distanzquadrate statt `Math.hypot`.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Collision-Bucket-Lookup ohne toSafeArray
- Beobachtung: Jeder Bucket-Zugriff lief durch `toSafeArray`, auch wenn kein Bucket existierte.
- Verbesserung: Buckets und Overflow-Listen werden direkt gelesen und nur bei Existenz iteriert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Tunnelwand-Kandidaten ohne filter
- Beobachtung: Tunnelwand-Abfragen erzeugten pro Query eine gefilterte Zwischenliste.
- Verbesserung: Gueltige Segmente werden direkt in eine Ergebnisliste geschrieben.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Building-Polygon-Kandidaten ohne filter
- Beobachtung: Hauskollisionen filterten Kandidaten mit Callback-Overhead.
- Verbesserung: Kandidaten werden direkt geprueft und gesammelt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Custom-Wall-Kandidaten ohne filter/map
- Beobachtung: Custom-Waende und Fallback-Polygone nutzten `filter(...).map(...)`.
- Verbesserung: Segmente und Fallback-Polygone werden in direkten Loops gesammelt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Wall-Opening-Signatur ohne map/filter-Ketten
- Beobachtung: Oeffnungssignaturen fuer Tueren/Fenster erzeugten mehrere kleine Arrays.
- Verbesserung: Rechteck- und Edge-Signaturen werden in direkten Loops aufgebaut.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Chunk-Collision-Signatur ohne map
- Beobachtung: Matched-Custom-Buildings wurden fuer die Signatur per `map` zusammengesetzt.
- Verbesserung: Die Signaturteile werden in einem Loop gesammelt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Door-Cut-Spans ohne map/filter/map
- Beobachtung: Beim Aufbau von Custom-Wall-Segmenten wurden Door-Spans ueber mehrere Array-Ketten erzeugt.
- Verbesserung: Door-Cuts werden direkt gesammelt und nur bei Bedarf sortiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Road-Graph-Signatur ohne map
- Beobachtung: Road-Graph-Signaturen wurden per `edges.map(...).join(...)` gebaut.
- Verbesserung: Signaturteile werden direkt gesammelt und verbunden.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Bridge-Clearance-Dedupe mit Set
- Beobachtung: Jede neue Bridge-Zone suchte per `zones.some`, ob der Key schon existiert.
- Verbesserung: Ein `Set` merkt belegte Zone-Keys.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 11: Bridge-Pillar-Checks ohne Math.hypot und some
- Beobachtung: Pfeilerpruefungen nutzten echte Distanzen und Callback-Suche ueber Zonen.
- Verbesserung: Der Abstand laeuft ueber Distanzquadrate; Zonen werden direkt geloopt.
- Status: umgesetzt in `tm-collision-hook.user.js`.
