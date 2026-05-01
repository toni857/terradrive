# Performance-Runden 6

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: weniger Objekt-Allokationen in Runtime-Loops, geteilte einfache Geometrien und sparsamere UI-/Partikel-Updates.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.23`.

## Runde 1: Shared Cylinder-Geometrien
- Beobachtung: Polizei, Abschlepper und Flugzeuge erzeugten identische Rad- und Triebwerks-Zylinder mehrfach.
- Verbesserung: Overlay-Zylinder werden per gerundetem Radius/Hoehe/Segment-Key gecacht und wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Shared Cone-Geometrien
- Beobachtung: Flugzeugnasen, Heckteile und Vogelschnabel nutzten neue Cone-Geometrien trotz gleicher Masse.
- Verbesserung: Kegel laufen ueber denselben Geometry-Cache wie Zylinder.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Shared Basic-Materialien
- Beobachtung: Lichter, Funken und einfache schwarze/gelbe Flachmaterialien wurden oft neu erzeugt.
- Verbesserung: Basic-Materialien werden inklusive Transparenz, Opacity und Depth-Write im Overlay-Cache gehalten.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Schadensanzeige schreibt DOM nur bei Aenderung
- Beobachtung: Prozentwert, Balkenfarbe und Status wurden auch bei gleichem Schaden immer wieder ins DOM geschrieben.
- Verbesserung: Die Anzeige merkt sich ihren letzten Zustand und aktualisiert nur veraenderte Felder.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Schadensvisuals werden erst bei Bedarf gebaut
- Beobachtung: Rauch/Dellen/Funken konnten schon erzeugt werden, obwohl das Feature aus oder das Auto fast unbeschaedigt war.
- Verbesserung: Das Visual entsteht erst, wenn es wirklich sichtbar sein soll; bestehende Visuals werden nur versteckt.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Rauchpartikel werden gedrosselt
- Beobachtung: Jeder Rauch-Puff wurde pro Frame animiert, obwohl Rauch optisch mit niedrigerer Rate gleich wirkt.
- Verbesserung: Rauch aktualisiert nur noch in kurzen Intervallen; vorberechnete Materiallisten verhindern Traversals pro Puff.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Flugzeuganimation ohne sichere Array-Wrapper
- Beobachtung: Rotoren, Raeder und Lichter wurden pro Frame ueber generische Safe-Array-Aufrufe gelesen.
- Verbesserung: Die Animation greift direkt auf echte Arrays zu und berechnet die Lichtliste nur einmal.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Projektile und Flugzeugsteuerung ohne Vector-Clones
- Beobachtung: Raketenlenkung und aktives Flugzeug erzeugten pro Update neue Vector3-Objekte und Raketen nutzten echte Distanzen, obwohl Vergleiche reichen.
- Verbesserung: Wiederverwendete Temp-Vektoren und Squared-Distance-Vergleiche reduzieren Garbage-Collector- und Wurzelberechnungen waehrend Bewegung und Kampf.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Zugkollisionen mit kurzem Kandidaten-Cache
- Beobachtung: Zug-Waggons wurden in jeder Kollisionspassage neu als Boxliste gesammelt.
- Verbesserung: Nahe Zugboxen werden kurz pro quantisierter Position gecacht und innerhalb der Kollisionspasses wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Overlay-Animationsloops ohne unnoetige Wrapper
- Beobachtung: Voegel, Bienen und Abschlepp-Overlays nutzten in engen Loops generische Array-Abfragen.
- Verbesserung: Wings, Wheels und Lights werden direkt aus den gespeicherten Arrays gelesen.
- Status: umgesetzt in `tm-collision-hook.user.js`.
