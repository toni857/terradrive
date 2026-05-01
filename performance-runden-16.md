# Performance-Runden 16

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Hot-Path-Schleifen, Kollisionskandidaten, Signaturen und kleinere Array-/String-Allokationen.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.34`.

## Runde 1: Town-Zielnamen ohne Regex-Split-Kette
- Beobachtung: Zielnamen fuer Ortsschilder wurden mit `split`, `map` und `filter` verarbeitet.
- Verbesserung: Der Fastpath laeuft direkt durch den Text und erzeugt nur die benoetigten Labels.
- Developer-Schalter: `perfTownSplitLabels`.

## Runde 2: Town-Area-Check ohne Closure
- Beobachtung: Stadtbereich-Pruefungen liefen ueber `.some`, wodurch bei haeufigen Checks extra Funktionsaufrufe entstehen.
- Verbesserung: Eine direkte Schleife bricht beim ersten Treffer ab.
- Developer-Schalter: `perfTownAreaLookup`.

## Runde 3: Polizeifahrzeug-Text ohne filter/join
- Beobachtung: Die Police-Erkennung baute fuer jedes Fahrzeug ein kleines Zwischenarray.
- Verbesserung: Der Fastpath erzeugt den Suchtext direkt.
- Developer-Schalter: `perfPoliceVehicleText`.

## Runde 4: Wall-Opening-Signatur mit Cache
- Beobachtung: Tuer- und Fenster-Oeffnungen wurden fuer Kollisionssignaturen wiederholt neu sortiert und zusammengesetzt.
- Verbesserung: Die Signatur wird pro Eintrag am aktuellen Opening-Objekt gecacht.
- Developer-Schalter: `perfWallOpeningCollisionSignature`.

## Runde 5: Wall-Opening-Signatur fuer Array- und Objektformen
- Beobachtung: Modeler-Daten koennen Oeffnungen als Arrays oder nach Kanten gruppiert liefern.
- Verbesserung: Der Fastpath verarbeitet beide Formen direkt und gruppiert Arrays nach `edgeIndex`.
- Developer-Schalter: `perfWallOpeningCollisionSignature`.

## Runde 6: Single-Bucket-Kollision ohne Set
- Beobachtung: Viele Kollisionsabfragen landen nur in einem Spatial-Bucket.
- Verbesserung: Wenn kein Nachbarbucket gebraucht wird, wird die Bucket-Liste direkt verwendet.
- Developer-Schalter: `perfCollisionCandidateFastPath`.

## Runde 7: Overflow-Kollision nur bei Bedarf mergen
- Beobachtung: Auch kleine Kollisionsabfragen zahlten bisher fuer Dedupe-Logik.
- Verbesserung: Overflow wird nur zusammengefuehrt, wenn wirklich Overflow-Objekte vorhanden sind.
- Developer-Schalter: `perfCollisionCandidateFastPath`.

## Runde 8: Traffic-Resolver ohne Object.entries
- Beobachtung: Objektbasierte Traffic-Maps erzeugten beim Sammeln der Eintraege ein neues Entries-Array.
- Verbesserung: Der Fastpath nutzt `for...in` mit Ownership-Check.
- Developer-Schalter: `perfTrafficMapIteration`.

## Runde 9: Stehlbares Botauto ohne Object.keys
- Beobachtung: Die Suche nach dem naechsten Botauto erzeugte bei Objekt-Maps eine Key-Liste.
- Verbesserung: Der Fastpath iteriert die Map direkt.
- Developer-Schalter: `perfTrafficMapIteration`.

## Runde 10: Template-Fallback ohne Object.keys
- Beobachtung: Beim Auto-3D-Haus-Fallback wurde die Template-Liste kopiert.
- Verbesserung: Der Fastpath sucht direkt im Template-Objekt.
- Developer-Schalter: `perfTemplateKeyLoop`.

## Runde 11: Road-Edge-Laengen cachen
- Beobachtung: Autopilot und Navigation berechnen Kantenlaengen mehrfach aus denselben Punkten.
- Verbesserung: Kumulative Distanzen werden pro Road-Edge gecacht.
- Developer-Schalter: `perfRoadEdgeDistanceCache`.

## Runde 12: Road-Eligibility ohne Array.includes
- Beobachtung: Ortsschild- und Hinweislogik erzeugten fuer Typpruefungen kleine Arrays.
- Verbesserung: Der Fastpath nutzt direkte Typvergleiche.
- Developer-Schalter: `perfRoadEligibilityCheck`.

## Runde 13: Road-Segment-Scoring ohne Vector-Klone
- Beobachtung: Beim Ziel-Routing wurden pro Segment mehrere temporaere Vektoren erzeugt.
- Verbesserung: Der Fastpath rechnet mit Zahlen direkt auf X/Z.
- Developer-Schalter: `perfRoadSegmentScoreMath`.

## Runde 14: Autopilot-Cruise-Speed ohne map/filter
- Beobachtung: Die Max-Speed-Suche erzeugte ein Zwischenarray.
- Verbesserung: Der Fastpath scannt die Werte direkt und behaelt nur den besten Speed.
- Developer-Schalter: `perfAutopilotCruiseScan`.

## Runde 15: Single-Chunk-Signatur ohne Kurzarray
- Beobachtung: Einzelne Chunk-Signaturen wurden ueber ein neu gebautes Array berechnet.
- Verbesserung: Der Fastpath baut die Signatur direkt fuer einen Chunk.
- Developer-Schalter: `perfSingleChunkSignature`.
