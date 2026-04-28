# Arbeitsplan fuer ChatGPT 5.4

Dieser Plan ist fuer ChatGPT 5.4 gedacht. Arbeite ihn Schritt fuer Schritt ab, ohne selbst gross neu zu planen. Fuehre keine grossen Syntax-, Lint-, Build- oder Bundle-Checks aus. Die spaetere technische Pruefung macht Codex. Mache nur kleine Smoke-Checks im Browser, wenn sie direkt noetig sind.

## Arbeitsordner

Nur diesen Ordner verwenden:

`C:\Users\toni\Downloads\terradrive-main\terradrive-main\drive`

Nicht den Ordner `C:\Users\toni\Desktop\drive` verwenden, weil dort nur `.sixth` liegt.

## Relevante Dateien

- `tm-collision-hook.user.js`
- `building-modeler.html`
- `building-modeler.css`
- `building-modeler.js`
- `buildings.js`
- `index.js` ist das Website-/Bundle-Ziel: nur lesen und zur Orientierung verwenden, nicht direkt dauerhaft bearbeiten

## Grundregeln

1. Keine grossen Formatierungen an `index.js` oder `tm-collision-hook.user.js`.
2. Keine Minified-Bundle-Umbauten ausser dort, wo das Tampermonkey-Script bewusst Hooks setzt.
3. Jede neue Modellierer-Funktion muss auch im Website-/Tampermonkey-Renderer funktionieren.
4. Jeder neue exportierte `part.type` aus dem Modellierer muss in `tm-collision-hook.user.js` in `createPrimitiveDetailMesh` oder einer passenden Helper-Funktion gerendert werden.
5. Der Modellierer darf PNGs nicht mehr als Hauptsystem fuer neue Haeuser voraussetzen. Neue Haeuser sollen aus echten 3D-Teilen, transparenten Fenstern, Tueren, Waenden, Daechern, Mustern und Moebeln bestehen.

## Wichtige Architektur-Korrektur

`index.js` ist das Script der Website bzw. das gebundelte Spielscript. Es darf nicht als dauerhaft geaenderte Quelldatei behandelt werden.

Alle Spielaenderungen muessen ueber Tampermonkey passieren:

1. `index.js` nur lesen, um Klassennamen, Funktionen, Strings und Hook-Punkte zu finden.
2. Keine direkten Feature-Edits in `index.js` speichern.
3. Aenderungen an Spielverhalten als Runtime-Hooks, Prototype-Patches, DOM-Patches oder Bundle-Source-Patches ueber Tampermonkey umsetzen.
4. Wenn dieser Plan bei Spielverhalten `tm-collision-hook.user.js` nennt, bedeutet das: dort Tampermonkey-Logik anpassen, die `index.js` zur Laufzeit patcht.
5. Modellierer-Dateien (`building-modeler.*`, `buildings.js`) duerfen normal bearbeitet werden, weil sie lokale Hilfsdateien sind.

## Nacharbeit nach 5.4-Erstversuch

Bevor weiter implementiert wird, zuerst den aktuellen Stand kurz pruefen:

1. `building-modeler.html`, `building-modeler.css`, `building-modeler.js`, `buildings.js` und `tm-collision-hook.user.js` lesen.
2. Feststellen, welche Punkte bereits umgesetzt wurden und welche fehlen.
3. Offensichtliche Fehler aus dem Erstversuch reparieren, ohne funktionierende Teile wieder umzubauen.
4. Die Modellierer-Website muss wieder ordentlich und professionell aussehen. Wenn neue Tabs, Panels oder Buttons den alten Aufbau unruhig gemacht haben, CSS und HTML aufraeumen.
5. Der Modellierer soll wie ein kompaktes Werkzeug wirken: linke Elementliste, mittlere 3D-Ansicht, obere Toolbar, rechter Bereich mit Bauteilen/Inspector/Einstellungen. Keine wild versetzten Buttons, keine zu grossen Panels, keine ueberlappenden Texte.

## 1. Navi reparieren

Ziel: Im Navi-Panel muessen alle Zielarten funktionieren, nicht nur `Tankstelle` und `Flughafen`. Der Nutzer muss sowohl Preset-Ziele als auch genaue Orte ueber Postleitzahl und Adresse erreichen koennen, z. B. `3970 Lauterbach 20`.

Betroffene Stellen in `tm-collision-hook.user.js`:

- `NAV_PRESETS`
- `collectNaviTargets(type)`
- `chooseNearestNaviTarget(targets)`
- `startNaviPreset(type)`
- `searchNaviAddress(query)`
- `ensureNaviPanel()`
- `toggleNaviPanel(forceVisible)`

Schritte:

1. In `ensureNaviPanel()` Event-Handling fuer das Panel haerten:
   - Fuer `pointerdown`, `mousedown`, `mouseup`, `click`, `keydown`, `keyup` auf dem Panel `event.stopPropagation()` setzen.
   - Bei den Preset-Buttons im Click-Handler auch `event.preventDefault()` und `event.stopPropagation()` setzen.
   - Den Button-Handler nicht nur ueber einzelne Button-Closures loesen, sondern optional robust ueber Event Delegation auf `[data-role="presets"]`.

2. `startNaviPreset(type)` so umbauen, dass der Nutzer immer Feedback bekommt:
   - Direkt Status setzen: `Suche Ziel...`
   - Wenn kein Ziel gefunden wird: Status im Panel und Snackbar anzeigen.
   - Wenn ein Ziel gefunden wird: Status `Ziel gesetzt: ...` anzeigen.

3. Alle Preset-Ziele muessen funktionieren:
   - `fuel` / Tankstelle
   - `airport` / Flughafen
   - `supermarket` / Supermarkt
   - `autoshop` / Autohaus
   - `apiary` / Imker
   - `town` / Ort
   - Wenn spaeter weitere Presets in `NAV_PRESETS` stehen, muessen sie automatisch ueber `collectNaviTargets(type)` behandelbar sein.

4. Fuer `fuel`:
   - `collectNaviTargets("fuel")` nutzt aktuell `collectGasStationMissionTargets()`.
   - Sicherstellen, dass diese Funktion alle geladenen Chunks durchsucht und valide `position`-Vektoren liefert.
   - Wenn keine Tankstelle gefunden wird, nach kurzem Delay einmal erneut versuchen, weil Chunks/POIs eventuell noch laden.

5. Fuer `airport`:
   - Vor dem Sammeln `getAirportEntries()` ausfuehren und sicherstellen, dass `runtimeState.airports` aktualisiert ist.
   - Auch dann funktionieren lassen, wenn das Overlay noch nicht sichtbar gebaut wurde.
   - Wenn keine Airports geladen sind, klare Meldung ausgeben: `Navi: kein Flughafen in geladenen Chunks gefunden.`

6. Fuer `supermarket`, `autoshop` und `apiary`:
   - Vor dem Sammeln `queuePoiFetch(chunk)` fuer geladene Chunks ausfuehren.
   - Wenn noch keine POIs geladen sind, kurz warten und erneut sammeln.
   - Wenn danach nichts gefunden wird, klare Meldung mit dem jeweiligen Label anzeigen.

7. Fuer `town`:
   - `collectTownMissionTargets()` verwenden.
   - Wenn noch keine Town-Daten bereit sind, `queueTownRebuild(...)` bzw. vorhandene Town-Sign-Daten anstossen und nach kurzem Delay erneut versuchen.
   - Ziel soll der naechstgelegene sinnvolle Ort sein.

8. Genaue Orte/Adressen:
   - `searchNaviAddress(query)` muss Eingaben im Format `Postleitzahl Adresse` unterstuetzen, z. B. `3970 Lauterbach 20`.
   - Eingabe nicht kaputt normalisieren: Zahlen, Ortsname und Hausnummer muessen erhalten bleiben.
   - Nominatim-Suche darf weiter benutzt werden.
   - Nach erfolgreicher Suche Koordinaten mit `runtimeState.geoModule.convertProjLocalCoords([lat, lon])` ins Spiel umrechnen.
   - Danach `startAutopilotToWorldPosition(position, label, "address")` ausfuehren.
   - Wenn die Adresse nicht gefunden wird, klare Fehlermeldung im Navi-Panel anzeigen.

9. `startNaviPreset(type)` optional async machen:
   - Sofort Ziele sammeln.
   - Wenn leer: relevante Daten anstossen, `await new Promise(resolve => setTimeout(resolve, 600))`, nochmal sammeln.
   - Danach entweder `startAutopilotToWorldPosition(...)` starten oder Fehler melden.

10. Nicht die `NAV_PRESETS` entfernen. Bestehende Labels bleiben, aber alle Presets muessen klickbar und wirksam sein.

## 2. Hard Mode reparieren

Problem: Wenn `Hard start` aktiviert wird, kann das Auto nicht mehr gefahren werden.

Betroffene Stellen in `tm-collision-hook.user.js`:

- `setFeature(name, value)`
- `updateHardStartLock()`
- `interactRuntime()`
- `updateRuntimeSystems(...)`

Schritte:

1. In `setFeature("hardStart", true)` nicht mehr dauerhaft `runtimeState.hardStartLocked = true` setzen, oder diese Sperre direkt wieder fahrbar machen.
2. `Hard start` soll weiterhin Survival, Police, Vehicle Damage und Geldstart bei 0 aktivieren.
3. Das Auto darf aber nicht dauerhaft mit `engineRunning = false` und `setPlayerSpeed(car, 0)` eingefroren werden.
4. `updateHardStartLock()` entweder entfernen oder so aendern:
   - Wenn `hardStartLocked` nicht mehr benutzt wird, sofort `return`.
   - Niemals jede Frame das Auto stoppen, wenn der Spieler normal fahren soll.
5. Den Autoshop-Kauf in `interactRuntime()` optional behalten, aber nicht als Pflicht, um ueberhaupt fahren zu koennen.

Erwartetes Ergebnis:

- Hard Mode aktiv: Survival/Police/Damage/0 EUR funktionieren.
- Auto bleibt fahrbar.

## 3. Abschleppwagen reparieren

Problem: Wenn das Auto kaputt ist, kann kein Abschleppwagen gerufen werden.

Betroffene Stellen:

- `applyVehicleDamage(amount, reason)`
- `interactRuntime()`
- `ensureRuntimeInputHandlers()`

Schritte:

1. Eine Helper-Funktion anlegen, z. B. `towOrReplaceBrokenCar(car)`:
   - Wenn genug Geld vorhanden ist: 180 EUR abziehen, Schaden auf 0, `__tmBrokenDown = false`, `engineRunning = true`, Anzeige aktualisieren, Meldung anzeigen.
   - Wenn nicht genug Geld vorhanden ist: Ersatzauto/Diebstahl-Logik wie bisher ausfuehren, Police starten, Schaden reparieren.

2. In `interactRuntime()` die Broken-Car-Logik vor Survival/Autoshop-Shops setzen:
   - Kaputtes Auto hat hoechste Prioritaet.
   - Supermarkt oder HardStart-Autoshop darf den E-Key nicht blockieren, wenn das Auto kaputt ist.

3. In `ensureRuntimeInputHandlers()` bei `KeyE`:
   - Wenn ein kaputtes Auto existiert, `event.preventDefault()` und `event.stopPropagation()` setzen.
   - Dann `interactRuntime()` ausfuehren.

4. Die Meldung aus `applyVehicleDamage()` anpassen:
   - Nicht behaupten `Press E near it`, wenn keine Naehe geprueft wird.
   - Besser: `Car broken (...). Press E to call tow truck for 180 EUR or steal a replacement.`

Erwartetes Ergebnis:

- Auto kaputt -> E ruft Abschleppwagen oder Ersatzlogik.
- Andere Interaktionen blockieren das nicht.

## 4. Find-Place-Distanzhinweis entfernen

Problem: Bei `Find Place` sieht man unten die Distanz zum Ziel und kann daraus schliessen, wohin man muss.

Betroffene Stelle:

- `RuntimeRouteMission.update(...)`

Aktuell steht sinngemaess:

`updateEntry3(stage.noMap ? "Distance: ... m" : "ETA: ... m")`

Schritte:

1. Fuer `stage.noMap === true` keine echte Entfernung anzeigen.
2. Stattdessen z. B. setzen:
   - `updateEntry3("No distance hint")`
   - oder `updateEntry3("Map help disabled")`
   - oder leer lassen `updateEntry3("")`
3. Fuer normale Missionen bleibt `ETA: ... m` erhalten.
4. Die Completion-Anzeige darf die gefahrene Distanz weiter anzeigen, weil die Aufgabe dann vorbei ist.

Erwartetes Ergebnis:

- Waehrend Find-Place kein Meterwert zum Ziel.
- Compass bleibt aus.
- Map/ESC-Sperre fuer No-Map-Missionen bleibt.

## 5. Modellierer-Export gueltig machen

Problem: Der aktuelle `buildings.js`-Output ist ein einzelnes Objekt und ist beim direkten Reinkopieren fehleranfaellig.

Zusaetzliche Vorgabe: Wenn im Modellierer auf `Konvertieren` gedrueckt wird, soll der ausgegebene Script-Code nach Moeglichkeit in genau einer Zeile stehen, egal wie lang diese Zeile wird.

Betroffene Stellen:

- `building-modeler.js`: `exportEntry()`, `formatCode()`, `refreshCode()`, `copyCode()`
- `buildings.js`
- Parser in `tm-collision-hook.user.js`: `parseBuildingConfigText(...)`, `normalizeBuildingCatalog(...)`

Schritte:

1. Der Modellierer soll nicht nur ein Objekt exportieren, sondern eine komplette Config:

```js
const tmBuildingsConfig = {
    buildings: [
        {
            id: "...",
            match: { ... },
            base: { enabled: false },
            roof: { enabled: false },
            windows: { enabled: false },
            parts: [ ... ]
        }
    ]
};
```

2. `parseBuildingConfigText(...)` kann `tmBuildingsConfig` bereits lesen. Dieses Format deshalb bevorzugen.
3. `buildings.js` auf dieses Format bringen.
4. Im Modellierer einen optionalen Exportmodus vorsehen:
   - `Komplette buildings.js`
   - spaeter optional `Nur Eintrag`
5. Standard muss `Komplette buildings.js` sein.
6. `formatCode()` so anpassen, dass der Standardexport fuer den Konvertieren-Button nicht mehr mit `JSON.stringify(value, null, 4)` formatiert wird, sondern einzeilig ausgegeben wird.
7. Der einzeilige Export soll weiterhin unquoted Keys und Hex-Literale behalten, also z. B. `color:0xd8c6a6` statt `"color":"__HEX__0xd8c6a6"`.
8. Beispiel-Zielformat:

```js
const tmBuildingsConfig={buildings:[{id:"...",match:{...},base:{enabled:false},roof:{enabled:false},windows:{enabled:false},parts:[...]}]};
```

9. Keine automatischen Zeilenumbrueche einfuegen, auch nicht bei sehr langen `parts`-Arrays.

## 6. Modellierer: Kopieren zu Konvertieren umbenennen

Betroffene Stellen:

- `building-modeler.html`
- `building-modeler.js`

Schritte:

1. Button-Text von `Kopieren` auf `Konvertieren` aendern.
2. Statusmeldungen anpassen:
   - `Code kopiert` -> `Code konvertiert und kopiert`
   - `Code markiert` -> `Code konvertiert und markiert`
3. Die ID `copyCode` kann bleiben, damit weniger umgebaut werden muss. Nur Text und Funktionsnamen optional anpassen.

## 7. Modellierer: Einstellungen-Tab

Ziel: Es soll einen Einstellungen-Tab geben, in dem Zielhaus und Feineinstellungen gesetzt werden.

Betroffene Dateien:

- `building-modeler.html`
- `building-modeler.css`
- `building-modeler.js`
- `tm-collision-hook.user.js`

Schritte im Modellierer:

1. Rechte Sidebar in Tabs umbauen:
   - `Bauteile`
   - `Inspector`
   - `Einstellungen`
2. Im Einstellungen-Tab ein globales Objekt pflegen, z. B.:

```js
const modelSettings = {
    exportId: "modeler_house_replace_me",
    targetMode: "debugId",
    targetText: "REPLACE_WITH_DEBUG_ID",
    matchChunkX: "",
    matchChunkZ: "",
    matchIndex: "",
    matchNearX: "",
    matchNearZ: "",
    matchRadius: 25,
    applyChance: 1,
    baseEnabled: false,
    roofEnabled: false,
    windowsEnabled: false
};
```

3. Zielmodi:
   - `all`: wenn der Nutzer `all` schreibt, exportiere `match: { all: true }`.
   - `address`: wenn der Nutzer z. B. `3970 Lauterbach 20` schreibt, exportiere `match: { address: "3970 Lauterbach 20" }`.
   - `debugId`: exportiere `match: { id: "..." }`.
   - `chunkIndex`: exportiere `match: { chunk: [x, z], index: n }`.
   - `near`: exportiere `match: { near: [x, z], radius: n }`.
4. `exportEntry()` muss diese Settings verwenden.
5. In der UI klar machen: Eingabe `all` gilt fuer zufaellige/alle Haeuser.

Schritte im Tampermonkey-Script:

1. `matchBuildingEntry(entry, chunk, building)` erweitern:
   - Wenn `match.all === true`, passt das Gebaeude.
   - Wenn `match.chance` oder `entry.chance` gesetzt ist, deterministisch mit Chunk/Index entscheiden.
2. Adress-Matching vorbereiten:
   - Wenn `match.address` existiert, per Nominatim geocoden.
   - `runtimeState.geoModule.convertProjLocalCoords([lat, lon])` benutzen.
   - Daraus intern `match.__tmResolvedNear = [x, z]` und Radius setzen.
   - Danach wie `near` matchen.
3. Adressauflösung in `ensureBuildingCatalogLoaded()` oder vor `ensureChunkCustomBuildingsPrepared()` asynchron erledigen, damit `matchBuildingEntry` synchron bleiben kann.
4. Wenn Adresse nicht aufloesbar ist, Eintrag nicht crashen lassen, sondern warnen.

## 8. Modellierer: V-Kanten-Zusammenfuegen

Ziel: Wenn man `V` drueckt und zwei Kanten von zwei Objekten auswaehlt, wird das zweite Objekt an das erste geschoben. Das erste bleibt stehen. Nur Position wird geaendert.

Betroffene Stelle:

- `building-modeler.js`

Schritte:

1. Den alten `snapKeyDown`-Drag-Snap nicht einfach loeschen. Er kann bleiben.
2. Zusaetzlich einen echten Edge-Snap-Modus bauen:
   - `V` toggelt `edgeSnapMode`.
   - Status anzeigen: `Kante 1 auswaehlen`.
   - Erster Klick: Objekt und naechste Kante speichern.
   - Zweiter Klick: Objekt und Kante speichern.
   - Wenn beide Kanten aus unterschiedlichen Objekten kommen: zweites Objekt verschieben.
3. Kantenberechnung:
   - Fuer `wall`, `triangleWall`, `pyramidRoof`, `cylinderWall`, `cone` zuerst mit einer Footprint-/BoundingBox-Approximation arbeiten.
   - Weltpositionen ueber Mesh-Matrix berechnen.
   - Kante auswaehlen, deren Segment dem Raycast-Hitpunkt am naechsten ist.
4. Verschieben:
   - `delta = firstEdge.midpoint - secondEdge.midpoint`
   - Auf `x` und `z` anwenden.
   - `y`, Rotation und Groesse nicht veraendern.
5. Danach Meshes, Inspector und Export refreshen.

## 9. Modellierer: Spiegelmodus

Ziel: Rechts unten kann eingestellt werden, wie neue Objekte gespiegelt werden.

Betroffene Dateien:

- `building-modeler.html`
- `building-modeler.css`
- `building-modeler.js`

Schritte:

1. Unten rechts im Viewport ein kleines Mirror-Panel anlegen.
2. Modi:
   - `Aus`
   - `Alle 4 Quadranten`
   - `X gespiegelt`
   - `Z gespiegelt`
   - `Diagonal A`
   - `Diagonal B`
3. Beim Erstellen eines Objekts:
   - Original bekommt `mirrorRole: "source"` und `mirrorGroupId`.
   - Spiegelkopien bekommen `mirrorRole: "mirror"` und gleiche `mirrorGroupId`.
4. Beim Verschieben oder Editieren des Originals werden die Spiegelkopien aktualisiert.
5. Rotationen mitspiegeln:
   - X-Spiegel: `x = -x`, `ry = -ry`
   - Z-Spiegel: `z = -z`, `ry = 180 - ry`
   - Beide: `x = -x`, `z = -z`, `ry = ry + 180`
   - Diagonal: x/z tauschen und Rotation passend drehen.
6. Im Export alle sichtbaren Spiegelteile als normale `parts` ausgeben, damit die Website nichts ueber Mirror-Modus wissen muss.

## 10. Dreieckige Waende

Betroffene Dateien:

- `building-modeler.js`
- `building-modeler.html`
- `tm-collision-hook.user.js`

Schritte:

1. Neuen Typ `triangleWall` anlegen.
2. Palette: Button `Dreieckige Wand`.
3. `typeLabels.triangleWall = "Dreieckige Wand"`.
4. Default-Werte:
   - `a`: Breite
   - `b`: Hoehe
   - `c`: Dicke
   - optional `slopeDirection`
5. Im Modellierer eine dreieckige Prismengeometrie bauen.
6. `partForExport()` exportiert:

```js
{
    type: "triangleWall",
    position: [...],
    rotation: [...],
    color: 0x...,
    size: [width, height, depth],
    slopeDirection: "left"
}
```

7. In `tm-collision-hook.user.js` `createPrimitiveDetailMesh` um `trianglewall` erweitern.

## 11. Fuellwerkzeug

Ziel: Das Fuellwerkzeug ist nicht fuer Zylinderloecher gedacht. Es soll Luecken fuellen, die beim Bauen mit schraeg gestellten Teilen entstehen. Beispiel: Eine normale Wand steht senkrecht, eine zweite Wand wurde gedreht und als schiefe Decke benutzt. Zwischen Wand und schiefer Decke bleibt ein dreieckiger Spalt frei. Genau dieser Spalt soll automatisch mit einem passenden Dreieck-/Keilteil gefuellt werden.

Betroffene Dateien:

- `building-modeler.js`
- `building-modeler.html`
- `tm-collision-hook.user.js`

Schritte:

1. Toolbar-Button `Fuellen` hinzufuegen.
2. Nutzer klickt oder waehlt zwei angrenzende Flaechen/Kanten aus:
   - Erstes Objekt bleibt Referenz.
   - Zweites Objekt kann z. B. eine gedrehte Wand sein, die als Dach/Decke dient.
3. Aus beiden Objekten die naechstliegenden Kanten/Flaechen ermitteln:
   - Raycast-Hitpunkt verwenden.
   - Kante/Flaeche nehmen, die dem Hitpunkt am naechsten ist.
   - Weltkoordinaten berechnen, nicht nur lokale Werte.
4. Den offenen Spalt als Polygon bestimmen:
   - Bei typischem Wand-plus-schraege-Decke-Fall entsteht ein Dreieck.
   - Wenn vier Punkte noetig sind, darf ein Keil/Prisma mit vier Eckpunkten entstehen.
   - Kleine Toleranzen verwenden, damit minimaler Versatz nicht zu kaputten Mini-Teilen fuehrt.
5. Neues Element erzeugen:
   - bevorzugt `triangleFill`, wenn die Luecke dreieckig ist.
   - alternativ `wedgeFill`, wenn eine Keilform gebraucht wird.
   - Farbe und Material standardmaessig vom ersten Objekt uebernehmen.
   - Dicke aus der Wand-/Deckendicke ableiten, mindestens 0.04.
6. Exporttyp fuer dreieckige Luecken:

```js
{
    type: "triangleFill",
    position: [...],
    rotation: [...],
    color: 0x...,
    points: [
        [x1, y1, z1],
        [x2, y2, z2],
        [x3, y3, z3]
    ],
    thickness: ...
}
```

7. Exporttyp fuer Keile:

```js
{
    type: "wedgeFill",
    position: [...],
    rotation: [...],
    color: 0x...,
    points: [
        [x1, y1, z1],
        [x2, y2, z2],
        [x3, y3, z3],
        [x4, y4, z4]
    ],
    thickness: ...
}
```

8. Im Modellierer Geometrie fuer `triangleFill` und `wedgeFill` anzeigen.
9. In `tm-collision-hook.user.js` `createPrimitiveDetailMesh` um `trianglefill` und `wedgefill` erweitern.
10. Falls die Luecke nicht eindeutig berechnet werden kann:
   - Keine kaputte Geometrie erzeugen.
   - Status anzeigen: `Luecke nicht eindeutig erkannt`.
   - Nutzer kann dann manuell eine dreieckige Wand setzen.

## 12. PNG-System fuer neue Haeuser abschaffen

Ziel: Neue modellierte Haeuser sollen nicht mehr ueber PNG-Fassaden funktionieren, sondern ueber 3D-Geometrie.

Betroffene Stellen:

- Texture-Hook am Anfang von `tm-collision-hook.user.js`
- Custom-Building-Bereich ab `createCustomBuildingBody(...)`
- `createDetailMaterial(...)`
- `createPrimitiveDetailMesh(...)`
- Modellierer-Export

Schritte:

1. Fuer neue Modellierer-Exporte keine `texture`, `textureUrl`, `image`, `textureId` Felder mehr erzeugen.
2. Bestehenden Texture-Hook nicht als Hauptweg benutzen.
3. Optional den Texture-Hook deaktivierbar machen, z. B. `featureState.textureReplacement = false`.
4. Custom Buildings sollen aus `parts` bestehen.
5. Wenn ein custom building ein Originalhaus ersetzen soll:
   - Weiterhin `bundleParts`/Suppression nutzen, damit das alte Haus nicht durchscheint.
   - Dann 3D-Overlay aus Parts bauen.
6. Materialien nicht als PNG, sondern mit `materialKind`/`pattern` definieren:
   - `plaster`
   - `brick`
   - `concrete`
   - `naturalStone`
   - `wood`
   - `roofTiles`
   - `ribbedMetal`
   - `shingles`
7. Muster in 3D darstellen:
   - Ziegel: duenne leicht vorstehende Rechtecke/Reihen.
   - Holz: schmale Bretter.
   - Gerilltes Dach: parallele Rippen.
   - Naturstein: unregelmaessige kleine Steinplatten.

## 13. Fenster und Tueren

Betroffene Dateien:

- `building-modeler.html`
- `building-modeler.js`
- `tm-collision-hook.user.js`

Schritte Modellierer:

1. Neue Typen:
   - `window`
   - `door`
2. Palette-Buttons:
   - `Fenster`
   - `Tuer`
3. Fenster:
   - Rahmen als schmale Boxen.
   - Glas transparent mit `opacity` und blauer Glasfarbe.
4. Tuer:
   - Tuerblatt als Box.
   - Rahmen.
   - Properties: `hingeSide`, `openAngle`, `isOpen`.
5. Inspector-Felder fuer Fenster/Tueren:
   - Breite
   - Hoehe
   - Tiefe
   - Rahmenfarbe
   - Glasfarbe
   - Transparenz
   - Tuer-Oeffnungswinkel

Schritte Website:

1. `createPrimitiveDetailMesh` soll fuer `window` eine Gruppe bauen.
2. `door` soll eine Gruppe mit Pivot/Hinge bauen.
3. Tueren sollen aufgehen koennen:
   - Entweder statisch ueber `isOpen/openAngle`.
   - Oder interaktiv: Naechste Tuer mit `E` toggeln.
4. Wenn interaktiv:
   - Door-Gruppen in `runtimeState.overlayItems` als `kind: "door"` registrieren.
   - In `interactRuntime()` zuerst kaputtes Auto behandeln, danach naechste Tuer pruefen.
   - Animation in `updateRuntimeSystems(...)` oder eigener `updateDoors(dt)` Funktion.

## 14. Ausschneiden fuer Tueren und Fenster

Ziel: Man setzt zuerst eine Wand, platziert dann Tuer/Fenster darauf, verschiebt/skaliert es und drueckt `Ausschneiden`. Dann entsteht in Wand oder Dach ein passendes Loch.

Wichtig: Keine komplizierte CSG-Bibliothek einbauen. Einfacher und stabiler ist: Host-Element in mehrere Box-/Panel-Teile aufteilen.

Betroffene Datei:

- `building-modeler.js`

Schritte:

1. Toolbar-Button `Ausschneiden` hinzufuegen.
2. Nutzer waehlt zuerst Host-Wand/Dach und dann Fenster/Tuer.
3. Funktion `cutOpening(host, cutter)` bauen.
4. Fuer Host `wall`:
   - Wandkoordinaten in lokalen Raum bringen.
   - Cutter-Rechteck berechnen.
   - Originalwand entfernen oder deaktivieren.
   - Vier neue Wandteile erzeugen:
     - links
     - rechts
     - oben
     - unten
   - Nur Teile erzeugen, deren Groesse > 0.03 ist.
   - Rotation/Farbe/Material vom Host uebernehmen.
5. Fuer Dach:
   - Zuerst `roofPanel`-Typ einfuehren oder einfache flache Dachsegmente wie Waende behandeln.
   - Bei `pyramidRoof` nur die betroffene Dachseite als Panel schneiden, nicht echtes CSG versuchen.
6. Fenster/Tuer bleibt als eigenes Element bestehen.
7. Export enthaelt nur die geteilten Wand-/Dachteile plus Fenster/Tuer. Dadurch muss die Website keine Boolean-Operation koennen.

## 15. Mehr Daecher, Waende und Aussehen

Betroffene Dateien:

- `building-modeler.js`
- `building-modeler.html`
- `building-modeler.css`
- `tm-collision-hook.user.js`

Neue Dachtypen:

- `gableRoof`
- `hipRoof`
- `flatRoof`
- `shedRoof`
- `mansardRoof`
- `domeRoof`
- `roundRoof`
- bestehendes `pyramidRoof` behalten

Neue Wand-/Materialarten:

- Beton
- Naturstein
- Ziegel
- Holz
- Putz
- Glas
- Metall

Schritte:

1. Im Inspector nicht nur Farbe, sondern `Material/Aussehen` anbieten.
2. `materialKind` exportieren.
3. `pattern` exportieren, z. B.:

```js
materialKind: "brick",
pattern: {
    type: "brick",
    scale: 1,
    depth: 0.035
}
```

4. Modellierer soll Muster ungefaehr anzeigen.
5. Website soll Muster ebenfalls anzeigen.
6. Keine externen PNGs verwenden.

## 16. Moebel, Ofen und Kamin

Betroffene Dateien:

- `building-modeler.html`
- `building-modeler.js`
- `tm-collision-hook.user.js`

Neue Typen:

- `chair`
- `table`
- `sofa`
- `bed`
- `cabinet`
- `counter`
- `shelf`
- `stove`
- `chimney`

Schritte:

1. Palette um Kategorie `Moebel` erweitern.
2. Fuer jedes Moebel einfache 3D-Geometrie bauen.
3. Ofen:
   - Beim Platzieren eines `stove` automatisch einen verknuepften `chimney` erstellen.
   - `chimneyFor` oder `linkedTo` speichern.
   - Kaminhoehe separat im Inspector verstellbar machen.
4. Kamin:
   - Export als eigenes Part.
   - Hoehe, Breite, Tiefe, Material, Position einstellbar.
5. Ausschneiden:
   - Kamin kann wie Fenster/Tuer eine Decke oder ein Dach ausschneiden.
   - Dazu `cutOpening(host, chimney)` wiederverwenden.

## 17. Website-Kompatibilitaet fuer alle Modellierer-Typen

Nach jeder Modellierer-Erweiterung in `tm-collision-hook.user.js` nachziehen:

1. `createDetailMaterial(detail)` erweitert um:
   - Transparenz
   - Roughness/Metalness soweit Materialtyp es braucht
   - MaterialKind/Pattern
2. `createPrimitiveDetailMesh(detail, anchorPoint)` erweitert um:
   - `triangleWall`
   - `triangleFill`
   - `wedgeFill`
   - neue Dachtypen
   - `window`
   - `door`
   - Moebel
   - `stove`
   - `chimney`
3. Wenn ein Typ eine Gruppe braucht, darf `createPrimitiveDetailMesh` auch `THREE.Group` zurueckgeben.
4. Exportierte Rotation bleibt Grad im `buildings.js`, Runtime wandelt in Radiant um.
5. Exportierte Farben bleiben Hex-Literale wie `0xd8c6a6`.

## 18. Reihenfolge der Umsetzung

Arbeite in dieser Reihenfolge:

1. Navi komplett reparieren: alle Presets plus genaue PLZ-/Adresssuche.
2. Hard Mode fahrbar machen.
3. Abschleppwagen/E-Key reparieren.
4. Find-Place-Distanz ausblenden.
5. Exportformat des Modellierers reparieren.
6. `Kopieren` zu `Konvertieren` umbenennen.
7. Einstellungen-Tab bauen.
8. Matching im Tampermonkey-Script fuer `all` und `address` erweitern.
9. V-Kanten-Snap bauen.
10. Spiegelmodus bauen.
11. Dreieckige Waende bauen.
12. Fuellwerkzeug bauen.
13. Fenster/Tueren bauen.
14. Ausschneiden bauen.
15. Neue Dach-/Wand-/Materialarten bauen.
16. Moebel, Ofen, Kamin bauen.
17. Runtime-Kompatibilitaet fuer alle neuen Part-Typen fertigstellen.

## 19. Kleine manuelle Checks, keine grossen Syntaxchecks

Keine grossen Syntaxchecks ausfuehren.

Erlaubte kleine Checks:

1. `building-modeler.html` im Browser oeffnen.
2. Pruefen:
   - Button heisst `Konvertieren`.
   - Einstellungen-Tab sichtbar.
   - Modellierer-Layout ist wieder sauber: keine ueberlappenden Panels, keine kaputte rechte Sidebar, Toolbar bleibt kompakt.
   - Export sieht wie `const tmBuildingsConfig = { buildings: [...] };` aus.
   - Neue Parts erscheinen im Export.
3. Im Spiel nur kurz pruefen:
   - Navi-Panel oeffnet.
   - Alle Navi-Presets zeigen Status und setzen ein Ziel, soweit passende Daten geladen sind.
   - Genaue Adresse wie `3970 Lauterbach 20` kann gesucht werden und setzt ein Ziel, wenn Nominatim sie findet.
   - Hard Mode laesst Auto fahren.
   - Kaputtes Auto reagiert auf E.
   - Find-Place zeigt keine Zieldistanz.

Nicht ausfuehren:

- Kein Lint.
- Kein kompletter Build.
- Kein grosses automatisches Syntax-Checking.
- `index.js` nicht formatieren.

## 20. Wichtige Akzeptanzkriterien

Fertig ist die Aufgabe erst, wenn:

1. Alle Navi-Presets im Navi nicht still fehlschlagen und fuer geladene Ziele funktionieren.
2. Genaue Ort-/Adresssuche per Postleitzahl und Adresse funktioniert, z. B. `3970 Lauterbach 20`.
3. Hard Mode das Auto nicht mehr blockiert.
4. Abschleppwagen/E bei kaputtem Auto funktioniert.
5. Find-Place keine laufende Entfernung zum Ziel zeigt.
6. Modellierer-Export direkt als `buildings.js` nutzbar ist.
7. Der Button im Modellierer `Konvertieren` heisst.
8. Die Modellierer-Website wieder sauber, kompakt und angenehm aufgebaut ist.
9. Einstellungen-Tab Zielmodi `all`, Adresse, Debug-ID, Chunk/Index und Near exportieren kann.
10. Neue Modellierer-Typen auch in der Website gerendert werden.
11. Neue Haeuser nicht mehr von PNG-Fassaden abhaengen.
12. Fenster transparent sind und Tueren geoeffnet werden koennen.
13. Fuellwerkzeug kann dreieckige/keilfoermige Luecken zwischen Wand und schraegem Deckenteil fuellen.
14. Ausschneiden fuer Wand/Fenster/Tuer und Kamin/Dach als geteilte Geometrie funktioniert.
