# Performance-Runden 21

Ziel: Weitere Performance-Verbesserungen ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Label-Normalisierung, Overlay-Cleanup, Navi-Panel, Chunk-/Footprint-Hilfsdaten und Debug-IDs.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.39`.

## Runde 1: Town-Label ohne Regex, wenn schon sauber
- Beobachtung: Viele Labels sind bereits normalisiert, laufen aber trotzdem durch `replace(/\s+/g, " ")`.
- Verbesserung: Der Fastpath scannt ASCII-Text und gibt unveraenderte Labels direkt zurueck.
- Developer-Schalter: `perfTownLabelWhitespaceFastPath`.

## Runde 2: Town-Label-Buchstaben ohne Regex
- Beobachtung: `isLikelyTownLabel` pruefte Buchstaben per Regex.
- Verbesserung: Der Fastpath scannt ASCII-Buchstaben direkt.
- Developer-Schalter: `perfTownLabelLetterScan`.

## Runde 3: Element-Label ohne Normalisierung, wenn schon sauber
- Beobachtung: Startmenue-Suche normalisiert Button-Texte auch dann, wenn sie unveraendert bleiben.
- Verbesserung: Der Fastpath gibt saubere ASCII-Labels direkt zurueck.
- Developer-Schalter: `perfElementLabelTextFastPath`.

## Runde 4: Overlay-Cleanup fuer einzelne Art ohne Set
- Beobachtung: Viele Cleanup-Aufrufe loeschen nur eine Overlay-Art, erzeugen aber trotzdem ein Set.
- Verbesserung: Der Fastpath vergleicht direkt gegen den einen Ziel-Kind.
- Developer-Schalter: `perfOverlayClearKindFastPath`.

## Runde 5: Navi-Preset-HTML ohne map/join
- Beobachtung: Das Navi-Panel baut Preset-Buttons ueber `map(...).join("")`.
- Verbesserung: Der Fastpath haengt die Button-HTMLs direkt an.
- Developer-Schalter: `perfNaviPresetHtmlLoop`.

## Runde 6: Building-Debug-ID cachen
- Beobachtung: Debug-IDs fuer Haeuser werden wiederholt aus Chunk-Koordinaten und Index zusammengesetzt.
- Verbesserung: Der Fastpath speichert die ID am Building, solange Chunk/Index gleich bleiben.
- Developer-Schalter: `perfBuildingDebugIdCache`.

## Runde 7: Chunk-Bounds fuer Positionscheck cachen
- Beobachtung: Adress- und Chunk-Matches berechnen Chunk-Mitte und Half-Size wiederholt.
- Verbesserung: Der Fastpath cached diese Werte pro Chunk und Padding.
- Developer-Schalter: `perfChunkBoundsCache`.

## Runde 8: Footprint-Bounds ohne Math.min/max pro Punkt
- Beobachtung: Footprint-Bounds nutzten fuer jede Koordinate `Math.min`/`Math.max`.
- Verbesserung: Der Fastpath nutzt direkte Vergleiche in einer indexbasierten Schleife.
- Developer-Schalter: `perfFootprintBoundsLoop`.

## Runde 9: Building-Footprint indexbasiert
- Beobachtung: Haus-Footprints liefen ueber `for...of`.
- Verbesserung: Der Fastpath iteriert indexbasiert und vermeidet Iterator-Overhead.
- Developer-Schalter: `perfBuildingFootprintLoop`.
