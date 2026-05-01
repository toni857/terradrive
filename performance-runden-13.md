# Performance-Runden 13

Ziel: Noch mehr Performance ohne sichtbare Qualitaetsreduktion. Fokus diesmal: Hotpaths beim Hausbau, Fenster-/Wand-Geometrie, Collision-Caches und ein Developer-Menue fuer interne Schalter.

Umsetzung: `tm-collision-hook.user.js` Version `2.2.7.31`.

## Runde 1: Footprint-Konvertierung ohne map/filter
- Beobachtung: Lokale und globale Footprints wurden haeufig ueber Array-Ketten gebaut.
- Verbesserung: Punkte werden direkt in einer Schleife normalisiert.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 2: Building-Katalog ohne Zwischenarrays
- Beobachtung: Der externe Katalog erzeugte beim Normalisieren mehrere temporaere Listen.
- Verbesserung: Katalog-Entries werden direkt in Ergebnislisten geschrieben.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 3: Cutout-Sortierung zentralisiert
- Beobachtung: Wand- und Detail-Oeffnungen hatten doppelte Sort-/Rundungslogik.
- Verbesserung: Gemeinsame Helper fuer gerundete Cuts und Cutout-Ueberlappung.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 4: Fallback-Tuer ohne filter/sort
- Beobachtung: Die beste Wand fuer eine automatische Tuer wurde ueber `filter().sort()[0]` gesucht.
- Verbesserung: Die laengste geeignete Wand wird in einem einzigen Durchlauf gefunden.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 5: Fenster-Geometrien wiederverwenden
- Beobachtung: Fensterrahmen und Glas erzeugten sehr viele kleine neue BoxGeometries.
- Verbesserung: Fensterteile laufen ueber den bestehenden Shared-Geometry-Cache.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 6: Side-Spec Fast Path
- Beobachtung: Jede Hausseite machte einen Deep-Merge, auch ohne Seitensonderregel.
- Verbesserung: Ohne Override wird die Basis-Spec direkt wiederverwendet.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 7: Auto-3D Entry Cache schaltbar
- Beobachtung: Standardhaus-Konfigurationen werden oft wiederholt erzeugt.
- Verbesserung: Der Cache bleibt aktiv, kann aber im Developer-Menue einzeln ausgeschaltet werden.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 8: Collision-Caches schaltbar
- Beobachtung: Query-, Signature-, Static- und Spatial-Caches sind starke Performance-Hebel.
- Verbesserung: Jeder dieser Bereiche hat jetzt einen eigenen Developer-Schalter.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 9: Haus-Culling schaltbar
- Beobachtung: Haus-Overlays werden ausserhalb von Distanz/Sichtfeld ausgeblendet.
- Verbesserung: Culling kann im Developer-Menue deaktiviert werden; dann bleiben alle Overlays sichtbar.
- Status: umgesetzt in `tm-collision-hook.user.js`.

## Runde 10: Developer-Menue per F8
- Beobachtung: Interne Module und Performance-Schichten waren nicht direkt testbar.
- Verbesserung: Ein Developer-Menue ist ueber F8 erreichbar, wenn `TM_DEVELOPER_MENU_ENABLED` true ist.
- Status: umgesetzt in `tm-collision-hook.user.js`.
