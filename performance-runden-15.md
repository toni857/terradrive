# Performance-Runden 15

Ziel: Noch mehr Performance ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Mission-Zielsuche, POI-Signaturen, Airport-Aufbau, Batch-Keys und interne Developer-Toggle-Kosten.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.33`.

## Runde 1: Developer-Toggle-Lookup als Key-Map
- Beobachtung: Viele neue Performance-Gates wuerden sonst jedes Mal die Toggle-Liste durchsuchen.
- Verbesserung: Toggle-Metadaten werden einmal in `DEVELOPER_PERFORMANCE_ITEM_BY_KEY` indexiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Mission-Spacing ohne Vollsortierung
- Beobachtung: `chooseSpacedTargets` kopierte und sortierte alle Ziele.
- Verbesserung: Der Fastpath sucht die besten Seeds in wenigen direkten Durchlaeufen.
- Developer-Schalter: `perfMissionSpacingSelection`.

## Runde 3: Town-Mission-Ziele ohne map/filter
- Beobachtung: Debug- und Fallback-Ortsziele erzeugten mehrere Zwischenlisten.
- Verbesserung: Ziele werden direkt gesammelt und gefiltert.
- Developer-Schalter: `perfMissionTargetCollection`.

## Runde 4: Fallback-Ortscluster ohne reduce pro Haus
- Beobachtung: Jeder neue Hauspunkt berechnete den Clustermittelpunkt ueber alle Punkte neu.
- Verbesserung: Cluster halten Summenwerte und aktualisieren den Mittelpunkt direkt.
- Developer-Schalter: `perfMissionTargetCollection`.

## Runde 5: Residential-Mission-Ziele ohne filter/map
- Beobachtung: Wohnhausziele liefen ueber eine Array-Kette.
- Verbesserung: Eine direkte Schleife baut die Ziel-Liste.
- Developer-Schalter: `perfMissionTargetCollection`.

## Runde 6: Forest-Mission ohne Zielsortierung
- Beobachtung: Alle Waldchunks wurden sortiert, obwohl aktuell nur der beste Wald gebraucht wird.
- Verbesserung: Der beste Wald wird direkt waehrend der Sammlung bestimmt.
- Developer-Schalter: `perfMissionTargetCollection`.

## Runde 7: POI-Overlay-Signatur ohne Sortierung
- Beobachtung: POI-Refresh sortierte Chunk- und POI-Signaturen jedes Mal.
- Verbesserung: Der Fastpath nutzt die stabile Durchlaufreihenfolge der geladenen Daten.
- Developer-Schalter: `perfPoiOverlaySignature`.

## Runde 8: Airport-Eintraege ohne komplette Punktliste
- Beobachtung: Fuer Runways wurden alle Weltpunkte gebaut, obwohl nur Start/Ende benoetigt werden.
- Verbesserung: Der Fastpath erzeugt nur Start- und Endpunkt.
- Developer-Schalter: `perfAirportEntryBuild`.

## Runde 9: Deep-Merge ohne Object.entries
- Beobachtung: Konfigurations-Merges laufen sehr oft beim Hausbau.
- Verbesserung: Der Fastpath nutzt `for...in` mit Ownership-Check.
- Developer-Schalter: `perfDeepMergeLoop`.

## Runde 10: World-Query-Key ohne Array-Join
- Beobachtung: Collision-Query-Keys wurden ueber kleine Arrays gebaut.
- Verbesserung: Der Fastpath erstellt den Key direkt als String.
- Developer-Schalter: `perfWorldQueryKey`.

## Runde 11: Batch-Material-Key ohne Array-Join
- Beobachtung: Batch-Materialsignaturen entstehen fuer viele Meshes.
- Verbesserung: Der Fastpath baut die Signatur direkt per Template-String.
- Developer-Schalter: `perfBatchMaterialKey`.

## Runde 12: Detailtyp-Lookup per Set
- Beobachtung: Furniture-Details erzeugten pro Mesh ein Array fuer `.includes`.
- Verbesserung: Der Fastpath nutzt `DETAIL_FURNITURE_TYPES`.
- Developer-Schalter: `perfDetailTypeLookup`.
