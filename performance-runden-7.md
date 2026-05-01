# Performance-Runden 7

Ziel: Noch mehr Performance ohne sichtbare Aenderung. Fokus diesmal: Reichweitenchecks ohne Wurzelberechnung, weniger Arbeit in Runtime-Loops und weniger kurzlebige Vektoren.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.24`.

## Runde 1: Quadratische 2D-Distanzen
- Beobachtung: Viele Checks wollten nur wissen, ob etwas innerhalb einer Reichweite liegt.
- Verbesserung: `getDistanceSq2D` vermeidet `Math.hypot`, wenn nur verglichen wird.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: POI-Naehe ohne Wurzel
- Beobachtung: Shops/POIs prueften naechste Objekte mit echter Distanz.
- Verbesserung: Die Suche vergleicht quadratische Distanzen.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Ersatzauto-Suche leichter
- Beobachtung: Beim Stehlen eines Ersatzautos wurde fuer jedes AI-Auto eine echte Distanz berechnet.
- Verbesserung: Der Reichweitencheck nutzt quadratische Distanzen und speichert keine unbenutzte Wurzeldistanz mehr.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Zugkandidaten schneller filtern
- Beobachtung: Zugkollisionen filterten Waggons mit echter Distanz.
- Verbesserung: Der 170m-Check laeuft nun ueber Distanzquadrat.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Fahrzeug-Kollisions-Safe-Position ohne Clone pro Frame
- Beobachtung: Die letzte sichere Fahrzeugposition wurde laufend geklont.
- Verbesserung: Ein gespeicherter Vector3 wird wiederverwendet und nur noch kopiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Police-Hill-Hold ohne Wurzel
- Beobachtung: Der Schutz gegen rutschende Polizeiautos pruefte Bewegung mit echten Distanzen.
- Verbesserung: Spielernaehe und Polizei-Bewegung vergleichen Distanzquadrate.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Wildlife-Spawn ohne Map/Filter-Array
- Beobachtung: Wildlife baute erst ein Array aller Overlay-Keys und filterte es danach.
- Verbesserung: Der Key-Set wird per direktem Loop erzeugt; Vogel- und Bienenreichweite nutzen Distanzquadrate.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Overlay-Culling ohne Wurzel und weniger Property-Lookups
- Beobachtung: Sichtbarkeitschecks und Animationen lasen Tick-/Zeitwerte mehrfach und nutzten echte Distanzen.
- Verbesserung: Tick, Blinkphase und Reichweiten werden einmal pro Lauf vorbereitet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Custom-Building-Tueren sparsamer
- Beobachtung: Tuerupdates konnten pro Tuer einen neuen World-Position-Vector und eine echte Distanz erzeugen.
- Verbesserung: Fallback-World-Positionen werden pro Tuer wiederverwendet; Oeffnungsradien laufen ueber Distanzquadrate.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: AI-Kollisionsvorpruefung ohne Distance-Wurzeln
- Beobachtung: Botauto-Kollisionschecks nutzten `distanceTo` und `length`, obwohl nur Groesser/Kleiner-Entscheidungen noetig waren.
- Verbesserung: Die Vorpruefung nutzt `distanceToSquared` und `lengthSq`.
- Status: umgesetzt in `tm-collision-hook.user.js`.
