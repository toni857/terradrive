# Performance-Runden 17

Ziel: Noch mehr Performance ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Navi, Adresssuche, Autopilot-Strassen, Road-Distanzen und Haus-Signaturen.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.35`.

## Runde 1: Navi-Airport-Ziele ohne map
- Beobachtung: Airport-Ziele wurden ueber `.map` erzeugt.
- Verbesserung: Der Fastpath baut die Liste direkt in einer Schleife.
- Developer-Schalter: `perfNaviAirportTargetsLoop`.

## Runde 2: POI-Navi-Ziele mit stabiler Listenreferenz
- Beobachtung: Beim POI-Cache wurde die Safe-Array-Konvertierung in der Schleifenbedingung wiederholt.
- Verbesserung: Der Fastpath legt die Liste einmal ab und iteriert sie dann.
- Developer-Schalter: `perfPoiNaviTargetsLoop`.

## Runde 3: Adressbestandteile cachen
- Beobachtung: Postleitzahl, Hausnummer und Suchwoerter wurden fuer dieselbe Adresse mehrfach geparst.
- Verbesserung: `getAddressSearchParts` speichert das Ergebnis in einem begrenzten Cache.
- Developer-Schalter: `perfAddressPartsCache`.

## Runde 4: Adress-Haystack ohne filter/join
- Beobachtung: Score-Berechnung fuer Suchtreffer erzeugte kleine Zwischenarrays.
- Verbesserung: Der Fastpath baut den Suchtext direkt.
- Developer-Schalter: `perfAddressHaystackBuild`.

## Runde 5: Bestes Adressresultat ohne Sortierung
- Beobachtung: Nominatim-Kandidaten wurden sortiert, obwohl nur der beste Treffer gebraucht wird.
- Verbesserung: Der Fastpath scannt die Treffer und behaelt den besten Score.
- Developer-Schalter: `perfAddressBestSelection`.

## Runde 6: Adress-Requests ohne filter-Closure
- Beobachtung: Request-Dedupe lief ueber `.filter`.
- Verbesserung: Der Fastpath fuegt eindeutige Requests direkt in Reihenfolge hinzu.
- Developer-Schalter: `perfAddressRequestBuild`.

## Runde 7: Navi-Preset-Pruefung ohne includes
- Beobachtung: Shop-Presets wurden ueber ein kleines Array geprueft.
- Verbesserung: Der Fastpath nutzt direkte Vergleiche.
- Developer-Schalter: `perfNaviPresetChecks`.

## Runde 8: Autopilot-Edge-Eligibility cachen
- Beobachtung: Dieselben Strassenkanten wurden immer wieder auf Autopilot-Tauglichkeit geprueft.
- Verbesserung: Das Ergebnis wird pro Edge mit einem Eigenschafts-Key gecacht.
- Developer-Schalter: `perfAutopilotEdgeEligibleCache`.

## Runde 9: Autopilot-Kantenliste cachen
- Beobachtung: Road-Suchen liefen wiederholt ueber alle geladenen Chunks und Kanten.
- Verbesserung: Der Fastpath speichert die tauglichen Kanten kurzzeitig fuer die geladene Chunk-Liste.
- Developer-Schalter: `perfAutopilotEdgeListCache`.

## Runde 10: Road-Segment-Match ohne Zwischenobjekt
- Beobachtung: Segment-Matching erzeugte ein Distanzobjekt und mehrere Vektor-Klone.
- Verbesserung: Der Fastpath rechnet Progress, Punkt, Richtung und Distanz direkt.
- Developer-Schalter: `perfRoadSegmentMatchMath`.

## Runde 11: Prepare-Signatur ohne Array-Join
- Beobachtung: Haus-Prepare-Signaturen bauten mehrere Zwischenarrays.
- Verbesserung: Der Fastpath setzt die Signatur direkt als String zusammen.
- Developer-Schalter: `perfPrepareSignatureLoop`.

## Runde 12: Overlay-Signatur ohne Array-Join
- Beobachtung: Custom-Haus-Overlay-Signaturen wurden ueber eine Parts-Liste gebaut.
- Verbesserung: Der Fastpath fuegt Signaturteile direkt an.
- Developer-Schalter: `perfOverlaySignatureLoop`.

## Runde 13: Map-Zielsignatur cachen
- Beobachtung: Die aktuelle Karten-Zielsignatur formatiert dieselben Koordinaten wiederholt.
- Verbesserung: Der Fastpath cached Lat/Lng und die formatierte Signatur.
- Developer-Schalter: `perfMapTargetSignatureCache`.

## Runde 14: Road-Distanz-Fastpath
- Beobachtung: Restdistanz und Zielposition auf einer Kante fragten Progress- und Gesamtlaenge getrennt ab.
- Verbesserung: Der Fastpath nutzt die kumulativen Edge-Distanzen einmal und berechnet beide Varianten direkt.
- Developer-Schalter: `perfRoadDistanceFastPath`.
