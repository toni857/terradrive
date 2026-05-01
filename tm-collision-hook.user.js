// ==UserScript==
// @name         Texture Override (Universal Safe)
// @match        https://terradrive.eu/*
// @grant        none
// @run-at       document-start
// @description  nothing
// @version      2.2.7.37
// @downloadURL  https://toni857.github.io/terradrive/tm-collision-hook.user.js
// @updateURL    https://toni857.github.io/terradrive/tm-collision-hook.user.js
// ==/UserScript==

(function tmCollisionEarlyLoadGuard() {
    "use strict";

    const RELOAD_KEY = "__tmCollisionHookLateReloadAt";
    const RELOAD_PARAM = "__tm_hook_reload";
    const BUNDLE_FILE_RE = /(?:^|\/)index\.js(?:$|[?#])/i;

    function isTargetBundleScript(script) {
        const source = script && (script.src || script.getAttribute && script.getAttribute("src"));
        if (!source)
            return !1;
        try {
            const url = new URL(source, location.href);
            return BUNDLE_FILE_RE.test(url.pathname) || BUNDLE_FILE_RE.test(url.href);
        } catch (urlError) {
            return BUNDLE_FILE_RE.test(String(source));
        }
    }

    function clearRuntimeCaches() {
        try {
            if (globalThis.caches && "function" == typeof caches.keys)
                caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).catch((cacheError => console.warn("[TM Collision Hook] Cache-Clear fehlgeschlagen:", cacheError)));
        } catch (cacheError) {}
        try {
            if (navigator.serviceWorker && "function" == typeof navigator.serviceWorker.getRegistrations)
                navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister()))).catch((swError => console.warn("[TM Collision Hook] ServiceWorker-Clear fehlgeschlagen:", swError)));
        } catch (swError) {}
    }

    function removeReloadParamFromAddressBar() {
        try {
            const url = new URL(location.href);
            if (!url.searchParams.has(RELOAD_PARAM))
                return;
            url.searchParams.delete(RELOAD_PARAM);
            history.replaceState(history.state, document.title, url.href);
        } catch (urlError) {}
    }

    function reloadOnceIfLate() {
        if (window.top !== window.self)
            return;
        const targetBundleAlreadyInDom = Array.from(document.scripts || []).some(isTargetBundleScript);
        const lateStart = "loading" !== document.readyState || targetBundleAlreadyInDom;
        if (!lateStart || globalThis.__tmCollisionHookRequire)
            return;
        const previousReloadAt = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
        if (Date.now() - previousReloadAt < 15000)
            return;
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        clearRuntimeCaches();
        const url = new URL(location.href);
        url.searchParams.set(RELOAD_PARAM, String(Date.now()));
        console.warn("[TM Collision Hook] Userscript war zu spaet. Fuehre einmaligen Fruehstart-Reload aus.");
        location.replace(url.href);
    }

    clearRuntimeCaches();
    removeReloadParamFromAddressBar();
    reloadOnceIfLate();
})();

(function() {
    "use strict";
    const DEBUG_TEXTURE_HOOK = !1;
    const textureLog = (...args) => DEBUG_TEXTURE_HOOK && console.log(...args);
    function readStoredFeatures() {
        try {
            const cookie = document.cookie.split(";").map((part => part.trim())).find((part => part.startsWith("tmFeatures=")));
            return cookie ? JSON.parse(decodeURIComponent(cookie.split("=").slice(1).join("="))) : {};
        } catch (featureError) {
            return {};
        }
    }
    const storedFeatures = readStoredFeatures();
    const buildingTexturesEnabled = !0 === storedFeatures.buildingTextures;
    console.info("[Texture Hook] gestartet", {
        buildingTextures: buildingTexturesEnabled
    });
    if (!buildingTexturesEnabled) {
        console.info("[Texture Hook] per Einstellung deaktiviert");
        return;
    }

    const BASE = "https://toni857.github.io/my-textures/";
    const cache = {
        fallback: BASE + "type1me.png",
        checks: new Map
    };

    function resolveUrl(id) {
        return BASE + `type${id}me.png`;
    }

    function testImage(url, cb) {
        const cached = cache.checks.get(url);
        if (cached) {
            if ("boolean" == typeof cached.ok)
                return cb(cached.ok);
            cached.callbacks.push(cb);
            return;
        }
        cache.checks.set(url, {
            callbacks: [cb]
        });
        const img = new Image;
        const finish = ok => {
            const entry = cache.checks.get(url) || {
                callbacks: [cb]
            };
            entry.ok = ok;
            const callbacks = entry.callbacks || [];
            entry.callbacks = [];
            cache.checks.set(url, entry);
            for (const callback of callbacks)
                callback(ok);
        };
        img.onload = () => finish(!0);
        img.onerror = () => finish(!1);
        img.src = url;
    }

    const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    if (!desc || "function" != typeof desc.set) {
        console.warn("[Texture Hook] HTMLImageElement.src konnte nicht gehookt werden.");
        return;
    }

    try {
        Object.defineProperty(HTMLImageElement.prototype, "src", {
            configurable: !1 !== desc.configurable,
            enumerable: !!desc.enumerable,
            set(value) {
                if ("string" != typeof value || !value.includes("textures/building/type"))
                    return desc.set.call(this, value);

                const match = value.match(/type(\d+)\.png/);
                const id = match ? match[1] : "1";
                const targetUrl = resolveUrl(id);
                textureLog("[Texture Hook] pruefe:", targetUrl);
                testImage(targetUrl, ok => {
                    let finalUrl = targetUrl;
                    if (!ok) {
                        textureLog("[Texture Hook] fehlt:", targetUrl, "-> fallback type1me");
                        finalUrl = cache.fallback;
                    }
                    textureLog("[Texture Hook] final:", finalUrl);
                    desc.set.call(this, finalUrl);
                }
                );
            },
            get: desc.get
        });
    } catch (hookError) {
        console.error("[Texture Hook] IMG-Hook konnte nicht installiert werden:", hookError);
        return;
    }

    textureLog("[Texture Hook] IMG-Hook aktiv");
})();





(function bootstrapTampermonkeyBridge() {
    function pageMain() {
        "use strict";

        const PREFIX = "[TM Collision Hook]";
        const REQUIRED_MODULES = {
            THREE: 7186,
            GAME_WORLD: 3669,
            AI_CAR: 3803,
            TRAFFIC_RESOLVER: 4258,
            CONTROLLABLE_CAR: 7818,
            CONTROL_MANAGER: 6385,
            ROAD_FACTORY: 5263,
            CHUNK: 4763,
            TERRAIN: 5367,
            TREE_LIBRARY: 419,
            BIOM: 6081,
            MISSION_MANAGER: 5769,
            GAME_MENU: 9479,
            BUFFER_GEOMETRY_UTILS: 1566,
            WATER: 9963,
            GEO: 1521
        };
        const BUNDLE_FILE_RE = /(?:^|\/)index\.js(?:$|[?#])/i;
        const globalState = globalThis.__tmCollisionHookState || (globalThis.__tmCollisionHookState = {
            version: "2.2.7.37",
            require: null,
            patched: !1,
            patchStarted: !1,
            bundleHookInstalled: !1,
            nodeHookInstalled: !1,
            mutationHookInstalled: !1,
            bundlePatchedInDom: !1,
            observedBundleUrl: null,
            THREE: null
        });
        const TOWN_SIGN_CONFIG = {
            placeClusterDistance: 1150,
            destinationClusterDistance: 800,
            buildingSearchRadius: 520,
            minBuildingCount: 4,
            maxPlaceRadius: 900,
            minPlaceRadius: 220,
            edgeEntryOffset: 165,
            signSideOffset: 1.5,
            signDedupDistance: 9,
            signNearbyDedupDistance: 18
        };
        const STARTING_MONEY = 500;
        const BUILDING_FIT_CONFIG = {
            foundationMinHeight: .32,
            groundClearance: .08,
            regularRoadClearance: 7,
            addressRoadClearance: 16,
            regularOverlapPadding: 1.8,
            addressOverlapPadding: 5,
            minimumRegularScale: .4
        };
        const CUSTOM_BUILDING_PERF = {
            sliceBudgetMs: 5.2,
            prioritySliceBudgetMs: 9,
            queueDelayMs: 35,
            maxBuildsPerSlice: 3,
            maxOptimizeMeshes: 260,
            minBatchMeshes: 24,
            optimizeQueueLimit: 36,
            debugRefreshMs: 900,
            cullIntervalMs: 180,
            cullChunksPerTick: 10,
            cullDistance: 3400,
            cullDistanceHysteresis: 260,
            staticCacheTtlMs: 1800,
            signatureCacheMs: 260,
            collisionBucketSize: 96,
            bridgeCacheTtlMs: 7000,
            wildlifeSpawnDistance: 2400,
            wildlifeBeeSpawnDistance: 1200,
            wildlifeMaxNewPerTick: 6,
            overlayCleanupIntervalMs: 3200,
            overlayMaterialCacheSize: 360,
            overlayGeometryCacheSize: 260,
            terrainCacheSize: 5000,
            materialCacheSize: 900,
            geometryCacheSize: 1200,
            layoutCacheSize: 900,
            collisionQueryCacheMs: 80,
            collisionQueryCacheSize: 180,
            doorNearDistance: 12,
            doorFarUpdateMs: 180,
            damageSmokeUpdateMs: 45,
            damagePanelUpdateMs: 220,
            trainCollisionCacheMs: 45,
            navigationPanelStaticUpdateMs: 650
        };
        const TM_DEVELOPER_MENU_ENABLED = !0;
        // Developer toggles deliberately expose internal/performance gates that are too risky for the normal ESC menu.
        const DEVELOPER_PERFORMANCE_TOGGLE_ITEMS = [{
            key: "perfRuntimeTaskThrottle",
            label: "Runtime task throttles",
            defaultValue: !0
        }, {
            key: "perfSharedGeometryCaches",
            label: "Shared geometry caches",
            defaultValue: !0
        }, {
            key: "perfMaterialCaches",
            label: "Material caches",
            defaultValue: !0
        }, {
            key: "perfWindowLayoutCache",
            label: "Window layout cache",
            defaultValue: !0
        }, {
            key: "perfTerrainYCache",
            label: "Terrain-height cache",
            defaultValue: !0
        }, {
            key: "perfAuto3dEntryCache",
            label: "Auto-3D entry cache",
            defaultValue: !0
        }, {
            key: "perfSideSpecFastPath",
            label: "Side-spec fast path",
            defaultValue: !0
        }, {
            key: "perfWallCutoutFastPath",
            label: "Wall-cutout fast path",
            defaultValue: !0
        }, {
            key: "perfCollisionQueryCache",
            label: "Collision query cache",
            defaultValue: !0
        }, {
            key: "perfCollisionSignatureCache",
            label: "Collision signature cache",
            defaultValue: !0
        }, {
            key: "perfStaticCollisionCache",
            label: "Static collision cache",
            defaultValue: !0
        }, {
            key: "perfCollisionSpatialIndex",
            label: "Collision spatial index",
            defaultValue: !0
        }, {
            key: "perfCustomBuildingCulling",
            label: "Custom-building culling",
            defaultValue: !0
        }, {
            key: "perfPriorityQueueSort",
            label: "Build-queue priority sort",
            defaultValue: !0
        }, {
            key: "perfLoadedChunkEnumeration",
            label: "Loaded-chunk enumeration",
            defaultValue: !0
        }, {
            key: "perfWallOpeningIndex",
            label: "Wall-opening index",
            defaultValue: !0
        }, {
            key: "perfTerrainSampleLoops",
            label: "Terrain sample loops",
            defaultValue: !0
        }, {
            key: "perfOverlaySignatureCache",
            label: "Overlay signature cache",
            defaultValue: !0
        }, {
            key: "perfBuildJobMatchReuse",
            label: "Build-job match reuse",
            defaultValue: !0
        }, {
            key: "perfCacheEvictionFastPath",
            label: "Cache eviction fast path",
            defaultValue: !0
        }, {
            key: "perfTownLabelCache",
            label: "Town-label cache",
            defaultValue: !0
        }, {
            key: "perfRoadWorldPointCache",
            label: "Road world-point cache",
            defaultValue: !0
        }, {
            key: "perfRoadSegmentPointReuse",
            label: "Road segment point reuse",
            defaultValue: !0
        }, {
            key: "perfNaviTargetSelection",
            label: "Navi target selection",
            defaultValue: !0
        }, {
            key: "perfMissionTargetSelection",
            label: "Mission target selection",
            defaultValue: !0
        }, {
            key: "perfMissionTargetCollection",
            label: "Mission target collection",
            defaultValue: !0
        }, {
            key: "perfMissionSpacingSelection",
            label: "Mission spacing selection",
            defaultValue: !0
        }, {
            key: "perfAirportEntryBuild",
            label: "Airport entry build",
            defaultValue: !0
        }, {
            key: "perfPoiOverlaySignature",
            label: "POI overlay signature",
            defaultValue: !0
        }, {
            key: "perfDeepMergeLoop",
            label: "Deep-merge loop",
            defaultValue: !0
        }, {
            key: "perfDetailTypeLookup",
            label: "Detail type lookup",
            defaultValue: !0
        }, {
            key: "perfWorldQueryKey",
            label: "World query key",
            defaultValue: !0
        }, {
            key: "perfBatchMaterialKey",
            label: "Batch material key",
            defaultValue: !0
        }, {
            key: "perfTownSplitLabels",
            label: "Town split-label loop",
            defaultValue: !0
        }, {
            key: "perfTownAreaLookup",
            label: "Town-area lookup",
            defaultValue: !0
        }, {
            key: "perfPoliceVehicleText",
            label: "Police vehicle text scan",
            defaultValue: !0
        }, {
            key: "perfWallOpeningCollisionSignature",
            label: "Wall-opening collision signature",
            defaultValue: !0
        }, {
            key: "perfTemplateKeyLoop",
            label: "Template key loop",
            defaultValue: !0
        }, {
            key: "perfCollisionCandidateFastPath",
            label: "Collision candidate fast path",
            defaultValue: !0
        }, {
            key: "perfTrafficMapIteration",
            label: "Traffic map iteration",
            defaultValue: !0
        }, {
            key: "perfRoadEdgeDistanceCache",
            label: "Road edge distance cache",
            defaultValue: !0
        }, {
            key: "perfRoadEligibilityCheck",
            label: "Road eligibility check",
            defaultValue: !0
        }, {
            key: "perfRoadSegmentScoreMath",
            label: "Road segment score math",
            defaultValue: !0
        }, {
            key: "perfAutopilotCruiseScan",
            label: "Autopilot cruise scan",
            defaultValue: !0
        }, {
            key: "perfSingleChunkSignature",
            label: "Single-chunk signature",
            defaultValue: !0
        }, {
            key: "perfNaviAirportTargetsLoop",
            label: "Navi airport target loop",
            defaultValue: !0
        }, {
            key: "perfPoiNaviTargetsLoop",
            label: "POI navi target loop",
            defaultValue: !0
        }, {
            key: "perfAddressPartsCache",
            label: "Address parts cache",
            defaultValue: !0
        }, {
            key: "perfAddressHaystackBuild",
            label: "Address haystack build",
            defaultValue: !0
        }, {
            key: "perfAddressBestSelection",
            label: "Address best selection",
            defaultValue: !0
        }, {
            key: "perfNaviPresetChecks",
            label: "Navi preset checks",
            defaultValue: !0
        }, {
            key: "perfAutopilotEdgeEligibleCache",
            label: "Autopilot edge eligible cache",
            defaultValue: !0
        }, {
            key: "perfAutopilotEdgeListCache",
            label: "Autopilot edge list cache",
            defaultValue: !0
        }, {
            key: "perfRoadSegmentMatchMath",
            label: "Road segment match math",
            defaultValue: !0
        }, {
            key: "perfPrepareSignatureLoop",
            label: "Prepare signature loop",
            defaultValue: !0
        }, {
            key: "perfOverlaySignatureLoop",
            label: "Overlay signature loop",
            defaultValue: !0
        }, {
            key: "perfMapTargetSignatureCache",
            label: "Map target signature cache",
            defaultValue: !0
        }, {
            key: "perfAddressRequestBuild",
            label: "Address request build",
            defaultValue: !0
        }, {
            key: "perfRoadDistanceFastPath",
            label: "Road distance fast path",
            defaultValue: !0
        }, {
            key: "perfGasStationMissionCache",
            label: "Gas-station mission cache",
            defaultValue: !0
        }, {
            key: "perfMainRoadMissionCache",
            label: "Main-road mission cache",
            defaultValue: !0
        }, {
            key: "perfPoiOverlaySignatureDirect",
            label: "POI signature direct",
            defaultValue: !0
        }, {
            key: "perfNearestPoiScan",
            label: "Nearest POI scan",
            defaultValue: !0
        }, {
            key: "perfAirportDirectionMath",
            label: "Airport direction math",
            defaultValue: !0
        }, {
            key: "perfBatchableMeshCountCache",
            label: "Batchable mesh-count cache",
            defaultValue: !0
        }, {
            key: "perfNeedsChunkWorkFastPath",
            label: "Chunk work fast path",
            defaultValue: !0
        }, {
            key: "perfPrepareNearChunkCache",
            label: "Prepare-near chunk cache",
            defaultValue: !0
        }, {
            key: "perfStaticCacheEarlyBypass",
            label: "Static-cache early bypass",
            defaultValue: !0
        }, {
            key: "perfBuildQueueScoreReuse",
            label: "Build-queue score reuse",
            defaultValue: !0
        }, {
            key: "perfGeometryMergeFilter",
            label: "Geometry merge filter",
            defaultValue: !0
        }, {
            key: "perfNormalizeGeometryAttributes",
            label: "Normalize geometry attributes",
            defaultValue: !0
        }, {
            key: "perfBasicMaterialKey",
            label: "Basic material key",
            defaultValue: !0
        }, {
            key: "perfRouteStepLookupMap",
            label: "Route-step lookup map",
            defaultValue: !0
        }, {
            key: "perfAutopilotOpenMinScan",
            label: "Autopilot open min-scan",
            defaultValue: !0
        }, {
            key: "perfAutopilotOutgoingLoops",
            label: "Autopilot outgoing loops",
            defaultValue: !0
        }, {
            key: "perfChunkPoiKeyCache",
            label: "Chunk POI key cache",
            defaultValue: !0
        }, {
            key: "perfStartMenuTargetCache",
            label: "Start-menu target cache",
            defaultValue: !0
        }, {
            key: "perfCullingDistanceMath",
            label: "Culling distance math",
            defaultValue: !0
        }, {
            key: "perfOptimizeQueuePrune",
            label: "Optimize queue prune",
            defaultValue: !0
        }, {
            key: "perfDeveloperModuleCache",
            label: "Developer module cache",
            defaultValue: !0
        }, {
            key: "perfSameEdgeDirectionSelect",
            label: "Same-edge direction select",
            defaultValue: !0
        }];
        const DEVELOPER_PERFORMANCE_ITEM_BY_KEY = Object.create(null);
        for (const item of DEVELOPER_PERFORMANCE_TOGGLE_ITEMS)
            DEVELOPER_PERFORMANCE_ITEM_BY_KEY[item.key] = item;
        const DETAIL_FURNITURE_TYPES = new Set(["chair", "table", "sofa", "bed", "cabinet", "counter", "shelf", "stove", "chimney"]);
        const townSignsState = globalState.townSigns || (globalState.townSigns = {
            roadModule: null,
            game: null,
            scene: null,
            chunkManager: null,
            overlayGroup: null,
            overlayAttachedTo: null,
            rebuildQueued: !1,
            signAssetCache: new Map,
            debugPlaces: [],
            debugSigns: [],
            signCount: 0,
            poleGeometry: null,
            poleMaterial: null,
            placeCache: new Map,
            placeRequestQueue: new Set,
            placeFetchBackoffUntil: 0,
            placeFetchWarnedAt: 0,
            placeFetchFailures: 0
        });
        townSignsState.placeCache = townSignsState.placeCache instanceof Map ? townSignsState.placeCache : new Map;
        townSignsState.placeRequestQueue = townSignsState.placeRequestQueue instanceof Set ? townSignsState.placeRequestQueue : new Set;
        townSignsState.placeFetchBackoffUntil = Number(townSignsState.placeFetchBackoffUntil) || 0;
        townSignsState.placeFetchWarnedAt = Number(townSignsState.placeFetchWarnedAt) || 0;
        townSignsState.placeFetchFailures = Number(townSignsState.placeFetchFailures) || 0;
        const BUILDING_CONFIG_URL = "https://toni857.github.io/terradrive/buildings.js";
        const CUSTOM_BUILDING_TEXTURE_BASE = "https://toni857.github.io/my-textures/";
        const CUSTOM_BUILDING_FALLBACK_TEXTURE_URL = CUSTOM_BUILDING_TEXTURE_BASE + "type1me.png";
        const CUSTOM_TASK_OPTIONS = [{
            value: "tmTownHop",
            label: "Town Hop"
        }, {
            value: "tmFindNearbyEasy",
            label: "Find Place Easy"
        }, {
            value: "tmFindNearbyMedium",
            label: "Find Place Medium"
        }, {
            value: "tmFindNearbyHard",
            label: "Find Place Hard"
        }, {
            value: "tmPassengerFlight",
            label: "Passenger Flight"
        }, {
            value: "tmResidentialDash",
            label: "Residential Dash"
        }, {
            value: "tmFuelRun",
            label: "Fuel Run"
        }, {
            value: "tmForestPatrol",
            label: "Forest Patrol"
        }, {
            value: "tmRingRoadRun",
            label: "Ring Road Run"
        }];
        // User-facing feature switches. Only these entries belong in the ESC/start feature menu.
        const FEATURE_MENU_ITEMS = [{
            feature: "buildingTextures",
            label: "Building textures"
        }, {
            feature: "enhancedTerrain",
            label: "Enhanced terrain"
        }, {
            feature: "enhancedRoads",
            label: "Enhanced roads"
        }, {
            feature: "enhancedTrees",
            label: "Enhanced trees"
        }, {
            feature: "enhancedVehicles",
            label: "Enhanced vehicles"
        }, {
            feature: "townSigns",
            label: "Town signs"
        }, {
            feature: "auto3dBuildings",
            label: "3D standard houses"
        }, {
            feature: "customBuildings",
            label: "3D custom houses"
        }, {
            feature: "navigation",
            label: "Navi panel"
        }, {
            feature: "autopilot",
            label: "Autopilot"
        }, {
            feature: "collisionHook",
            label: "Collision hook"
        }, {
            feature: "customMissions",
            label: "Custom missions"
        }, {
            feature: "vehicleTuning",
            label: "Vehicle tuning"
        }, {
            feature: "survival",
            label: "Survival + Shops"
        }, {
            feature: "police",
            label: "Police"
        }, {
            feature: "vehicleDamage",
            label: "Vehicle damage"
        }, {
            feature: "hardStart",
            label: "Hard start"
        }, {
            feature: "overlays",
            label: "Far-object culling"
        }, {
            feature: "aircraft",
            label: "Aircraft + airports"
        }, {
            feature: "birds",
            label: "Birds"
        }, {
            feature: "bees",
            label: "Bees"
        }, {
            feature: "shops",
            label: "Shops + Navi POIs"
        }];
        // Dependency rules: if a base feature fails or is switched off, dependent features are disabled too.
        const FEATURE_DEPENDENCIES = {
            hardStart: ["survival", "police", "vehicleDamage"],
            bees: ["shops"]
        };
        const NAV_PRESETS = [{
            type: "fuel",
            label: "Tankstelle"
        }, {
            type: "airport",
            label: "Flughafen"
        }, {
            type: "supermarket",
            label: "Supermarkt"
        }, {
            type: "autoshop",
            label: "Autohaus"
        }, {
            type: "apiary",
            label: "Imker"
        }, {
            type: "town",
            label: "Ort"
        }];
        // Runtime state is kept on globalThis so Tampermonkey reloads do not lose panels, caches, or debug data.
        const runtimeState = globalState.runtime || (globalState.runtime = {
            game: null,
            terrainModule: null,
            treeModule: null,
            biomModule: null,
            missionModule: null,
            gameMenuModule: null,
            geoModule: null,
            bufferGeometryUtils: null,
            buildingConfigPromise: null,
            buildingConfig: null,
            asphaltTexture: null,
            waterTexture: null,
            roadMaterialCache: new WeakMap,
            terrainMaterialCache: new WeakMap,
            customMissionRegistry: new Map,
            missionPanelsPatched: new WeakSet,
            visualRefreshTimers: new WeakMap,
            overlayMaterialCache: new Map,
            overlayGeometryCache: new Map,
            overlaySphereGeometry: null,
            projectileTempVector: null,
            aircraftForwardVector: null,
            trainCollisionBoxesCache: null,
            normalizedLabelCache: new Map,
            menuPatched: !1,
            controlsPatched: !1,
            lastRuntimeUpdateAt: 0,
            trafficResolver: null,
            overlayGroup: null,
            overlayAttachedTo: null,
            overlayItems: [],
            overlayDispose: [],
            overlayTick: 0,
            poiCache: new Map,
            poiRequestQueue: new Set,
            airports: [],
            activeAircraft: null,
            aircraftControlState: null,
            aircraftModels: [],
            projectileModels: [],
            policeCars: [],
            policeState: null,
            survivalState: null,
            damagePanel: null,
            gameMenu: null,
            autopilot: null,
            navPanel: null,
            navVisible: !1,
            navSearching: !1,
            navMode: "drive",
            navGuidance: null,
            navGuidanceUiState: null,
            moduleDisables: {},
            moduleFaults: {},
            startMenuFeatureWatcherInstalled: !1,
            developerMenuHotkeyInstalled: !1,
            developerMenuVisible: !1,
            startMoneyGranted: !1,
            playerMoney: STARTING_MONEY,
            input: {
                slowLeft: !1,
                slowRight: !1,
                fastLeft: !1,
                fastRight: !1,
                fullBrake: !1,
                fire: !1
            },
            chunkCustomOverlayGroups: new WeakMap,
            buildingDebugEntries: [],
            customBuildingEntriesByChunk: new WeakMap,
            customBuildingTextureCache: new Map,
            customBuildingAddressCache: new Map,
            customBuildingAutoEntryCache: new Map,
            customBuildingMaterialCache: new Map,
            customBuildingBoxGeometryCache: new Map,
            customBuildingWindowLayoutCache: new Map,
            customBuildingTerrainYCache: new Map,
            customBuildingPrepareSignatures: new WeakMap,
            customBuildingBuildQueue: [],
            customBuildingQueuedChunks: new WeakSet,
            customBuildingBuildTimer: null,
            customBuildingOptimizeQueue: [],
            customBuildingOptimizeQueued: new WeakSet,
            customBuildingOptimizeTimer: null,
            customBuildingCollisionInvalidationQueue: [],
            customBuildingCollisionInvalidationSet: new WeakSet,
            customBuildingCollisionInvalidationTimer: null,
            customBuildingCullCursor: 0,
            customBuildingCullTemp: null,
            customBuildingCollisionQueryCache: new Map,
            customBuildingLastQueueSortAt: 0,
            customBuildingDoorItems: [],
            customBuildingProgress: null,
            customBuildingPriorityTargets: [],
            worldCollisionState: null
        });
        const vehicleTuningState = globalThis.__tmVehicleTuningState || (globalThis.__tmVehicleTuningState = {
            installed: !1,
            visible: !1,
            active: !1,
            panel: null,
            maxSpeedKmh: 999,
            accelerationPerSecond: 50
        });
        // Persistent feature state. Cookie loading below overwrites these defaults when the user changed settings.
        const featureState = globalThis.__tmFeatureState || (globalThis.__tmFeatureState = {
            survival: !1,
            police: !1,
            vehicleDamage: !1,
            hardStart: !1,
            overlays: !1,
            birds: !1,
            bees: !1,
            aircraft: !1,
            shops: !1,
            auto3dBuildings: !1,
            customBuildings: !1,
            buildingTextures: !1,
            enhancedTerrain: !1,
            enhancedRoads: !1,
            enhancedTrees: !1,
            enhancedVehicles: !1,
            townSigns: !1,
            customMissions: !1,
            vehicleTuning: !1,
            navigation: !1,
            autopilot: !1,
            collisionHook: !1
        });
        const featureFaultState = globalThis.__tmFeatureFaultState || (globalThis.__tmFeatureFaultState = {
            faults: {}
        });
        const developerState = globalThis.__tmDeveloperState || (globalThis.__tmDeveloperState = {
            toggles: {},
            modules: {}
        });
        developerState.toggles && "object" == typeof developerState.toggles || (developerState.toggles = {});
        developerState.modules && "object" == typeof developerState.modules || (developerState.modules = {});

        function readCookieValue(name) {
            const prefix = `${name}=`;
            const cookie = document.cookie.split(";").map((part => part.trim())).find((part => part.startsWith(prefix)));
            return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : "";
        }

        function getFeatureStateSnapshot() {
            const snapshot = {};
            for (const key of Object.keys(featureState))
                snapshot[key] = !!featureState[key];
            return snapshot;
        }

        function loadFeatureStateFromCookies() {
            try {
                const cookieValue = readCookieValue("tmFeatures");
                if (!cookieValue)
                    return;
                const features = JSON.parse(cookieValue);
                if (!features || "object" != typeof features || Array.isArray(features))
                    return;
                for (const key of Object.keys(featureState))
                    key in features && (featureState[key] = !!features[key]);
            } catch (e) {
                console.warn('[TM] Failed to load feature state from cookies:', e);
            }
        }

        function saveFeatureStateToCookies() {
            try {
                const expires = new Date();
                expires.setFullYear(expires.getFullYear() + 1);
                document.cookie = `tmFeatures=${encodeURIComponent(JSON.stringify(getFeatureStateSnapshot()))}; expires=${expires.toUTCString()}; path=/`;
            } catch (e) {
                console.warn('[TM] Failed to save feature state to cookies:', e);
            }
        }

        function loadFeatureFaultStateFromCookies() {
            try {
                const cookieValue = readCookieValue("tmFeatureFaults");
                if (!cookieValue)
                    return;
                const faults = JSON.parse(cookieValue);
                featureFaultState.faults = faults && "object" == typeof faults && !Array.isArray(faults) ? faults : {};
            } catch (e) {
                console.warn('[TM] Failed to load feature fault state from cookies:', e);
            }
        }

        function saveFeatureFaultStateToCookies() {
            try {
                const expires = new Date();
                expires.setFullYear(expires.getFullYear() + 1);
                document.cookie = `tmFeatureFaults=${encodeURIComponent(JSON.stringify(featureFaultState.faults || {}))}; expires=${expires.toUTCString()}; path=/`;
            } catch (e) {
                console.warn('[TM] Failed to save feature fault state to cookies:', e);
            }
        }

        function loadDeveloperStateFromCookies() {
            try {
                const cookieValue = readCookieValue("tmDeveloperToggles");
                if (!cookieValue)
                    return;
                const parsed = JSON.parse(cookieValue);
                if (!parsed || "object" != typeof parsed || Array.isArray(parsed))
                    return;
                developerState.toggles = parsed.toggles && "object" == typeof parsed.toggles && !Array.isArray(parsed.toggles) ? parsed.toggles : {};
                developerState.modules = parsed.modules && "object" == typeof parsed.modules && !Array.isArray(parsed.modules) ? parsed.modules : {};
            } catch (e) {
                console.warn("[TM] Failed to load developer toggles from cookies:", e);
            }
        }

        function saveDeveloperStateToCookies() {
            if (!TM_DEVELOPER_MENU_ENABLED)
                return;
            try {
                const expires = new Date();
                expires.setFullYear(expires.getFullYear() + 1);
                const snapshot = {
                    toggles: developerState.toggles || {},
                    modules: developerState.modules || {}
                };
                document.cookie = `tmDeveloperToggles=${encodeURIComponent(JSON.stringify(snapshot))}; expires=${expires.toUTCString()}; path=/`;
            } catch (e) {
                console.warn("[TM] Failed to save developer toggles to cookies:", e);
            }
        }

        loadFeatureStateFromCookies();
        loadFeatureFaultStateFromCookies();
        loadDeveloperStateFromCookies();
        Object.assign(runtimeState, {
            overlayItems: Array.isArray(runtimeState.overlayItems) ? runtimeState.overlayItems : [],
            overlayDispose: Array.isArray(runtimeState.overlayDispose) ? runtimeState.overlayDispose : [],
            poiCache: runtimeState.poiCache instanceof Map ? runtimeState.poiCache : new Map,
            poiRequestQueue: runtimeState.poiRequestQueue instanceof Set ? runtimeState.poiRequestQueue : new Set,
            airports: Array.isArray(runtimeState.airports) ? runtimeState.airports : [],
            aircraftControlState: runtimeState.aircraftControlState || null,
            aircraftModels: Array.isArray(runtimeState.aircraftModels) ? runtimeState.aircraftModels : [],
            projectileModels: Array.isArray(runtimeState.projectileModels) ? runtimeState.projectileModels : [],
            policeCars: Array.isArray(runtimeState.policeCars) ? runtimeState.policeCars : [],
            damagePanel: runtimeState.damagePanel || null,
            navPanel: runtimeState.navPanel || null,
            navVisible: !!runtimeState.navVisible,
            navSearching: !!runtimeState.navSearching,
            navMode: "guide" === runtimeState.navMode ? "guide" : "drive",
            navGuidance: runtimeState.navGuidance || null,
            navGuidanceUiState: runtimeState.navGuidanceUiState || null,
            startMenuFeatureWatcherInstalled: !!runtimeState.startMenuFeatureWatcherInstalled,
            overlayMaterialCache: runtimeState.overlayMaterialCache instanceof Map ? runtimeState.overlayMaterialCache : new Map,
            overlayGeometryCache: runtimeState.overlayGeometryCache instanceof Map ? runtimeState.overlayGeometryCache : new Map,
            overlaySphereGeometry: runtimeState.overlaySphereGeometry || null,
            projectileTempVector: runtimeState.projectileTempVector || null,
            aircraftForwardVector: runtimeState.aircraftForwardVector || null,
            trainCollisionBoxesCache: runtimeState.trainCollisionBoxesCache || null,
            normalizedLabelCache: runtimeState.normalizedLabelCache instanceof Map ? runtimeState.normalizedLabelCache : new Map,
            customBuildingTextureCache: runtimeState.customBuildingTextureCache instanceof Map ? runtimeState.customBuildingTextureCache : new Map,
            customBuildingAddressCache: runtimeState.customBuildingAddressCache instanceof Map ? runtimeState.customBuildingAddressCache : new Map,
            customBuildingAutoEntryCache: runtimeState.customBuildingAutoEntryCache instanceof Map ? runtimeState.customBuildingAutoEntryCache : new Map,
            customBuildingMaterialCache: runtimeState.customBuildingMaterialCache instanceof Map ? runtimeState.customBuildingMaterialCache : new Map,
            customBuildingBoxGeometryCache: runtimeState.customBuildingBoxGeometryCache instanceof Map ? runtimeState.customBuildingBoxGeometryCache : new Map,
            customBuildingWindowLayoutCache: runtimeState.customBuildingWindowLayoutCache instanceof Map ? runtimeState.customBuildingWindowLayoutCache : new Map,
            customBuildingTerrainYCache: runtimeState.customBuildingTerrainYCache instanceof Map ? runtimeState.customBuildingTerrainYCache : new Map,
            customBuildingPrepareSignatures: runtimeState.customBuildingPrepareSignatures instanceof WeakMap ? runtimeState.customBuildingPrepareSignatures : new WeakMap,
            customBuildingBuildQueue: Array.isArray(runtimeState.customBuildingBuildQueue) ? runtimeState.customBuildingBuildQueue : [],
            customBuildingQueuedChunks: runtimeState.customBuildingQueuedChunks instanceof WeakSet ? runtimeState.customBuildingQueuedChunks : new WeakSet,
            customBuildingBuildTimer: null,
            customBuildingOptimizeQueue: Array.isArray(runtimeState.customBuildingOptimizeQueue) ? runtimeState.customBuildingOptimizeQueue : [],
            customBuildingOptimizeQueued: runtimeState.customBuildingOptimizeQueued instanceof WeakSet ? runtimeState.customBuildingOptimizeQueued : new WeakSet,
            customBuildingOptimizeTimer: null,
            customBuildingCollisionInvalidationQueue: Array.isArray(runtimeState.customBuildingCollisionInvalidationQueue) ? runtimeState.customBuildingCollisionInvalidationQueue : [],
            customBuildingCollisionInvalidationSet: runtimeState.customBuildingCollisionInvalidationSet instanceof WeakSet ? runtimeState.customBuildingCollisionInvalidationSet : new WeakSet,
            customBuildingCollisionInvalidationTimer: null,
            customBuildingCullCursor: Number(runtimeState.customBuildingCullCursor) || 0,
            customBuildingCullTemp: runtimeState.customBuildingCullTemp || null,
            customBuildingCollisionQueryCache: runtimeState.customBuildingCollisionQueryCache instanceof Map ? runtimeState.customBuildingCollisionQueryCache : new Map,
            customBuildingLastQueueSortAt: Number(runtimeState.customBuildingLastQueueSortAt) || 0,
            customBuildingDoorItems: Array.isArray(runtimeState.customBuildingDoorItems) ? runtimeState.customBuildingDoorItems : [],
            customBuildingProgress: runtimeState.customBuildingProgress || null,
            customBuildingPriorityTargets: Array.isArray(runtimeState.customBuildingPriorityTargets) ? runtimeState.customBuildingPriorityTargets : [],
            worldCollisionState: Object.assign({
                loadedChunks: [],
                loadedChunksAt: 0,
                staticCache: null,
                staticCacheSignature: "",
                staticCacheAt: 0,
                queryCache: new Map,
                lastHumanCollisionAt: 0,
                chunkIdCounter: 0,
                chunkIds: new WeakMap,
                chunkStaticCaches: new WeakMap
            }, runtimeState.worldCollisionState && "object" == typeof runtimeState.worldCollisionState ? runtimeState.worldCollisionState : {}),
            moduleDisables: runtimeState.moduleDisables && "object" == typeof runtimeState.moduleDisables ? runtimeState.moduleDisables : {},
            moduleFaults: runtimeState.moduleFaults && "object" == typeof runtimeState.moduleFaults ? runtimeState.moduleFaults : {},
            developerMenuHotkeyInstalled: !!runtimeState.developerMenuHotkeyInstalled,
            developerMenuVisible: !!runtimeState.developerMenuVisible,
            autopilot: Object.assign({
                enabled: !1,
                pendingMapSelection: !1,
                targetPosition: null,
                targetRoadPosition: null,
                targetSignature: "",
                startSignature: "",
                route: [],
                routeIndex: 0,
                targetRoadMatch: null,
                edge: null,
                segmentIndex: 0,
                segmentT: 0,
                direction: 1,
                snapped: !1,
                linking: !1,
                lastNoticeAt: 0,
                lastLinkNoticeAt: 0
            }, runtimeState.autopilot || {}),
            startMoneyGranted: !!runtimeState.startMoneyGranted,
            playerMoney: Number.isFinite(Number(runtimeState.playerMoney)) ? Number(runtimeState.playerMoney) : STARTING_MONEY,
            input: runtimeState.input || {
                slowLeft: !1,
                slowRight: !1,
                fastLeft: !1,
                fastRight: !1,
                fullBrake: !1,
                fire: !1
            }
        });
        for (const [moduleName, enabled] of Object.entries(developerState.modules || {}))
            enabled ? delete runtimeState.moduleDisables[moduleName] : runtimeState.moduleDisables[moduleName] = !0;
        runtimeState.input.slowLeft = !!runtimeState.input.slowLeft;
        runtimeState.input.slowRight = !!runtimeState.input.slowRight;
        runtimeState.input.fastLeft = !!runtimeState.input.fastLeft;
        runtimeState.input.fastRight = !!runtimeState.input.fastRight;
        runtimeState.input.fullBrake = !!runtimeState.input.fullBrake;
        runtimeState.input.fire = !!runtimeState.input.fire;
        runtimeState.autopilot.edge = null;
        runtimeState.autopilot.targetPosition = runtimeState.autopilot.targetPosition && runtimeState.autopilot.targetPosition.clone ? runtimeState.autopilot.targetPosition.clone() : null;
        runtimeState.autopilot.targetRoadPosition = runtimeState.autopilot.targetRoadPosition && runtimeState.autopilot.targetRoadPosition.clone ? runtimeState.autopilot.targetRoadPosition.clone() : null;
        for (const [key, value] of Object.entries({
            survival: !1,
            police: !1,
            vehicleDamage: !1,
            hardStart: !1,
            overlays: !1,
            birds: !1,
            bees: !1,
            aircraft: !1,
            shops: !1,
            auto3dBuildings: !1,
            customBuildings: !1,
            buildingTextures: !1,
            enhancedTerrain: !1,
            enhancedRoads: !1,
            enhancedTrees: !1,
            enhancedVehicles: !1,
            townSigns: !1,
            customMissions: !1,
            vehicleTuning: !1,
            navigation: !1,
            autopilot: !1,
            collisionHook: !1
        }))
            "boolean" == typeof featureState[key] || (featureState[key] = value);
        vehicleTuningState.active = !!featureState.vehicleTuning && !!vehicleTuningState.active;
        const VISUAL_CONFIG = {
            roadColor: 0x5e5750,
            roadEdgeColor: 0x6d665f,
            terrainColor: 0xffffff,
            terrainSaturationBoost: .06,
            treeLeafLightnessTop: .08,
            treeLeafLightnessBottom: -.09,
            treeLeafSaturationBoost: .1,
            treeTrunkDarken: .38,
            windowGlassColor: 0xa5d7ff,
            windowFrameColor: 0xf4eee6
        };
        const INTERNAL_MODULES = {
            featureMenuUi: {
                label: "Feature menu UI",
                feature: null
            },
            customMissionRuntime: {
                label: "Custom missions runtime",
                feature: "customMissions"
            },
            customBuildingProgress: {
                label: "Address-house progress",
                feature: "customBuildings"
            },
            customBuildingDoors: {
                label: "Custom building doors",
                feature: "customBuildings"
            },
            customBuildingOverlayCulling: {
                label: "Custom building culling",
                feature: null
            },
            overlayRuntime: {
                label: "Overlay runtime",
                feature: "overlays"
            },
            wildlifeRuntime: {
                label: "Wildlife runtime",
                feature: null
            },
            hardStartFlow: {
                label: "Hard start flow",
                feature: "hardStart"
            },
            vehicleReplacementTheft: {
                label: "Vehicle replacement theft",
                feature: "vehicleDamage"
            },
            vehicleTuningHandling: {
                label: "Vehicle tuning handling",
                feature: "vehicleTuning"
            },
            worldCollision: {
                label: "World hitboxes",
                feature: "collisionHook"
            },
            autopilotRouting: {
                label: "Autopilot routing",
                feature: "autopilot"
            },
            navigationUi: {
                label: "Navigation UI",
                feature: "navigation"
            }
        };
        const VEHICLE_DAMAGE_TUNING = {
            intakeMultiplier: .55,
            breakdownThreshold: 100,
            towCost: 180
        };

        function log(...args) {
            const first = String(args[0] || "");
            if (globalThis.__tmCollisionHookVerbose || /Bootstrap|Hook erfolgreich|Debug-Objekt|Tuning-Objekt|GameSessionOpenWorld|AiTrafficResolver|Bundle|Node-Insert|Mutation|Require-Callback|Versteckter|3D-Haeuser|Custom-Building|Feature/i.test(first))
                console.info(PREFIX, ...args);
        }

        function warn(...args) {
            console.warn(PREFIX, ...args);
        }

        function error(...args) {
            console.error(PREFIX, ...args);
        }

        function getDeveloperPerformanceItem(key) {
            return DEVELOPER_PERFORMANCE_ITEM_BY_KEY[key] || null;
        }

        function isDeveloperToggleEnabled(key) {
            if (!TM_DEVELOPER_MENU_ENABLED)
                return !0;
            const item = getDeveloperPerformanceItem(key);
            const fallback = item ? !1 !== item.defaultValue : !0;
            return key in (developerState.toggles || {}) ? !!developerState.toggles[key] : fallback;
        }

        function setDeveloperToggle(key, value) {
            if (!TM_DEVELOPER_MENU_ENABLED || !getDeveloperPerformanceItem(key))
                return;
            developerState.toggles[key] = !!value;
            if (/Collision|Culling|Terrain|Auto3d|Window|Geometry|Material|Wall|Overlay|Build|Chunk|Town|Cache|Mission|Airport|Poi|Merge|Detail|Query|Navi|Address|Road|Autopilot|Signature|Traffic|Route|Start|Optimize|Queue/i.test(key)) {
                invalidateWorldCollisionCache();
                clearCustomBuildingTransientPerfCaches(!0);
            }
            saveDeveloperStateToCookies();
            syncDeveloperMenu();
        }

        function getDeveloperModuleItems() {
            if (isDeveloperToggleEnabled("perfDeveloperModuleCache") && runtimeState.developerModuleItems && runtimeState.developerModuleItemsKey) {
                const key = `${Object.keys(runtimeState.moduleDisables || {}).length}:${Object.keys(runtimeState.moduleFaults || {}).length}:${Object.keys(INTERNAL_MODULES).length}`;
                if (runtimeState.developerModuleItemsKey === key)
                    return runtimeState.developerModuleItems;
            }
            const names = new Set(Object.keys(INTERNAL_MODULES));
            for (const name of Object.keys(runtimeState.moduleDisables || {}))
                names.add(name);
            for (const name of Object.keys(runtimeState.moduleFaults || {}))
                names.add(name);
            const items = [];
            for (const name of names) {
                const meta = getInternalModuleMeta(name);
                items.push({
                    name,
                    label: meta.label || name,
                    feature: meta.feature || ""
                });
            }
            items.sort((a, b) => a.label.localeCompare(b.label));
            if (isDeveloperToggleEnabled("perfDeveloperModuleCache")) {
                runtimeState.developerModuleItems = items;
                runtimeState.developerModuleItemsKey = `${Object.keys(runtimeState.moduleDisables || {}).length}:${Object.keys(runtimeState.moduleFaults || {}).length}:${Object.keys(INTERNAL_MODULES).length}`;
            }
            return items;
        }

        function setDeveloperModuleEnabled(name, value) {
            if (!TM_DEVELOPER_MENU_ENABLED)
                return;
            developerState.modules[name] = !!value;
            if (value)
                clearInternalModuleFault(name);
            else
                runtimeState.moduleDisables[name] = !0;
            runtimeState.developerModuleItemsKey = "";
            saveDeveloperStateToCookies();
            syncDeveloperMenu();
        }

        // Central health output: one compact console.table is much easier to read than hundreds of scattered startup logs.
        function getFeatureDiagnosticRows() {
            return FEATURE_MENU_ITEMS.map(item => {
                const fault = getFeatureFault(item.feature);
                const moduleFault = getInternalModuleFaultForFeature(item.feature);
                const dependencies = toSafeArray(FEATURE_DEPENDENCIES[item.feature]);
                const missingDependencies = dependencies.filter(dependency => !featureState[dependency]);
                const active = !!featureState[item.feature];
                const ok = active && !fault && !moduleFault && !missingDependencies.length;
                return {
                    typ: "feature",
                    name: item.feature,
                    label: item.label,
                    aktiv: active,
                    funktioniert: ok,
                    abhaengigkeiten: dependencies.join(", ") || "-",
                    fehler: fault && fault.message || moduleFault && moduleFault.message || missingDependencies.length && `Dependency aus: ${missingDependencies.join(", ")}` || ""
                };
            });
        }

        function getInternalDiagnosticRows() {
            return Object.entries(INTERNAL_MODULES).map(([name, meta]) => {
                const fault = getInternalModuleFault(name);
                const featureActive = meta.feature ? !!featureState[meta.feature] : !0;
                const enabled = isInternalModuleEnabled(name);
                return {
                    typ: "internal",
                    name,
                    label: meta.label,
                    aktiv: enabled && featureActive,
                    funktioniert: enabled && featureActive && !fault,
                    abhaengigkeiten: meta.feature || "-",
                    fehler: fault && fault.message || ""
                };
            });
        }

        function printFunctionHealthTable(reason="manual") {
            const rows = getFeatureDiagnosticRows().concat(getInternalDiagnosticRows());
            console.groupCollapsed(`${PREFIX} Funktionsstatus (${reason})`);
            console.table(rows);
            console.groupEnd();
            return rows;
        }

        function getInternalModuleMeta(name) {
            return INTERNAL_MODULES[name] || {
                label: name,
                feature: null
            };
        }

        function getInternalModuleFault(name) {
            return runtimeState.moduleFaults && runtimeState.moduleFaults[name] || null;
        }

        function getInternalModuleFaultForFeature(featureName) {
            if (!featureName || !runtimeState.moduleFaults)
                return null;
            for (const [moduleName, fault] of Object.entries(runtimeState.moduleFaults))
                if (fault && getInternalModuleMeta(moduleName).feature === featureName)
                    return Object.assign({
                        moduleName
                    }, fault);
            return null;
        }

        function isInternalModuleEnabled(name) {
            return !(runtimeState.moduleDisables && runtimeState.moduleDisables[name]);
        }

        function clearInternalModuleFault(name) {
            runtimeState.moduleDisables && delete runtimeState.moduleDisables[name];
            runtimeState.moduleFaults && delete runtimeState.moduleFaults[name];
            runtimeState.developerModuleItemsKey = "";
        }

        function clearInternalModuleFaultsForFeature(featureName) {
            for (const moduleName of Object.keys(INTERNAL_MODULES))
                getInternalModuleMeta(moduleName).feature === featureName && clearInternalModuleFault(moduleName);
        }

        function markInternalModuleFault(name, failure, context) {
            const meta = getInternalModuleMeta(name);
            const message = failure && (failure.message || String(failure)) || "Unknown error";
            runtimeState.moduleDisables || (runtimeState.moduleDisables = {});
            runtimeState.moduleFaults || (runtimeState.moduleFaults = {});
            runtimeState.moduleDisables[name] = !0;
            runtimeState.moduleFaults[name] = {
                message,
                context: context || meta.label,
                at: Date.now()
            };
            runtimeState.developerModuleItemsKey = "";
            warn(`Teilfunktion automatisch deaktiviert: ${meta.label}${context ? ` (${context})` : ""}:`, failure);
            printFunctionHealthTable(`module_fault:${name}`);
            notifyRuntime(`${meta.label} wurde wegen einem Fehler deaktiviert.`, "error");
            syncFeatureMenu();
        }

        function runInternalModule(name, callback, fallback, context) {
            if (!isInternalModuleEnabled(name))
                return fallback;
            try {
                globalThis.__tmCollisionHookVerbose && console.log(PREFIX, "Internal module start", name, context || "");
                return callback();
            } catch (moduleError) {
                markInternalModuleFault(name, moduleError, context);
                return fallback;
            }
        }

        function runFeatureModule(featureName, callback, fallback, context) {
            if (featureName && !featureState[featureName])
                return fallback;
            try {
                globalThis.__tmCollisionHookVerbose && console.log(PREFIX, "Feature module start", featureName || "(internal)", context || "");
                return callback();
            } catch (featureError) {
                featureName ? markFeatureFault(featureName, featureError, context) : error(`${context || "Feature step"} fehlgeschlagen:`, featureError);
                return fallback;
            }
        }

        function shouldRunRuntimeTask(name, intervalMs) {
            if (!isDeveloperToggleEnabled("perfRuntimeTaskThrottle"))
                return !0;
            runtimeState.runtimeTaskTimes && "object" == typeof runtimeState.runtimeTaskTimes || (runtimeState.runtimeTaskTimes = {});
            const interval = Math.max(0, Number(intervalMs) || 0);
            if (!interval)
                return !0;
            const now = performance.now();
            const last = Number(runtimeState.runtimeTaskTimes[name]) || 0;
            if (last && now - last < interval)
                return !1;
            runtimeState.runtimeTaskTimes[name] = now;
            return !0;
        }

        function scheduleIdleTask(callback, delayMs=0, timeoutMs=220) {
            return setTimeout((() => {
                if ("function" == typeof globalThis.requestIdleCallback)
                    globalThis.requestIdleCallback(callback, {
                        timeout: timeoutMs
                    });
                else
                    callback({
                        timeRemaining: () => 0,
                        didTimeout: !0
                    });
            }
            ), Math.max(0, Number(delayMs) || 0));
        }

        function getIdleTimeRemaining(deadline, fallbackMs) {
            if (deadline && "function" == typeof deadline.timeRemaining)
                return deadline.didTimeout ? 0 : Math.max(0, deadline.timeRemaining());
            return Math.max(0, Number(fallbackMs) || 0);
        }

        const IMPACT_TUNING = {
            collisionCooldown: .65,
            launchDiffThreshold: 6,
            maxEvaluatedDiff: 40,
            classify: {
                sideZoneFactor: .68,
                frontRearZoneFactor: .34,
                sideBias: .15
            },
            launch: {
                throwDistanceBase: 4,
                throwDistancePerDiff: 1.75,
                throwDistanceMax: 30,
                airTimeBase: .8,
                airTimePerDiff: .06,
                airTimeMax: 1.9,
                verticalVelocityBase: 4.5,
                verticalVelocityPerDiff: .85,
                verticalVelocityMax: 16,
                gravityBase: 11,
                gravityPerDiff: .55,
                gravityMax: 24,
                airDrag: .985,
                slowerCarHitFasterSlowFactor: .45,
                fasterCarSlowFactor: .55,
                angularPitchBase: 1.1,
                angularPitchPerDiff: .045,
                angularYawBase: 1.9,
                angularYawPerDiff: .07,
                angularRollBase: 1.25,
                angularRollPerDiff: .045
            },
            lowDiff: {
                bothStopFreeze: 30,
                rearRearStopFreeze: 26,
                rearEndBoostBase: .5,
                rearEndBoostPerDiff: .28,
                rearEndBoostMax: 3.25,
                rearVehicleSlowFactor: .42,
                rearPushBase: .95,
                rearPushPerDiff: .24,
                rearPushMax: 2.4,
                rearPushForwardBias: .35,
                rearPushYawBase: .04,
                rearPushYawPerSide: .18,
                rearPushYawMax: .35,
                sidePushBase: 1.3,
                sidePushPerDiff: .55,
                sidePushMax: 5.75,
                sideForwardBias: .25,
                sideVictimSpinBase: .22,
                sideVictimSpinPerDiff: .08,
                sideVictimSpinMax: 1.15,
                sideVictimPitchFactor: .08,
                sideVictimYawFactor: .4,
                sideVictimRollFactor: .16,
                sideVictimTargetSpeedFactor: .8,
                sideHitterSlowFactor: .55
            },
            rollover: {
                roofScoreThreshold: 12,
                speedDiffFactor: .55,
                launchBonus: 4.5,
                sideBonus: 3.25,
                airborneBonus: 1.75,
                angularFactor: .6
            },
            settle: {
                groundLinearDamping: .965,
                groundAngularDamping: .9,
                landingLinearRetention: .8,
                gravityTipStrength: 4.2,
                uprightAlignStrength: 7,
                roofAlignStrength: 5.5,
                settleMinTime: .8,
                settleLinearThreshold: .3,
                settleAngularThreshold: .35,
                roofUpDotThreshold: .12,
                recoverOffsetDamping: .82,
                recoverAngleDamping: .76,
                recoverCompletionOffset: .08,
                recoverCompletionAngle: .08,
                recoverCompletionAngular: .12,
                aiRecoverySpeed: 2.5,
                aiRecoveryFreeze: 12,
                roofRestLiftFactor: .32,
                upsideDownDespawnDelay: 10,
                playerResetOnUpsideDown: !0,
                aiRoadRecoverTurnRate: 3.2,
                aiRoadRecoverReverseTurnRate: 1.35,
                aiRoadRecoverReverseSpeed: 1.4,
                aiRoadRecoverReachDistance: 1.4,
                aiRoadRecoverReachYaw: .18,
                aiRoadRecoverBlockRadius: 4.2,
                aiRoadRecoverWaitBeforeBypass: 2.75,
                aiRoadRecoverBypassSideOffset: 5.5,
                aiRoadRecoverBypassForwardOffset: 4.5,
                aiRoadRecoverReverseDotThreshold: -.2
            }
        };
        globalThis.__tmCollisionHookConfig = IMPACT_TUNING;

        function clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        }

        function speedAbs(value) {
            return Math.abs(Number(value) || 0);
        }

        function toKmh(speed) {
            return (speedAbs(speed) * 3.6).toFixed(1);
        }

        function toMs(speed) {
            return (Number(speed) || 0).toFixed(2);
        }

        function normalizeAngleRad(angle) {
            let normalized = Number(angle) || 0;
            for (; normalized > Math.PI; )
                normalized -= 2 * Math.PI;
            for (; normalized < -Math.PI; )
                normalized += 2 * Math.PI;
            return normalized;
        }

        function shortestAngleDelta(from, to) {
            return normalizeAngleRad((Number(to) || 0) - (Number(from) || 0));
        }

        function getVehicleLength(vehicle) {
            return Math.max(2.5, Number(vehicle && (vehicle.length || vehicle.mcs && vehicle.mcs.length)) || 4.5);
        }

        function getVehicleWidth(vehicle) {
            return Math.max(1.4, Number(vehicle && (vehicle.width || vehicle.mcs && vehicle.mcs.width)) || 1.8);
        }

        function getVehicleHeight(vehicle) {
            return Math.max(1, Number(vehicle && (vehicle.mcs && (vehicle.mcs.height || vehicle.mcs.sideHeight))) || 1.5);
        }

        function getFlatForwardVector(vehicle) {
            const forward = vehicle.getForwardVector().clone();
            forward.y = 0;
            if (forward.lengthSq() < 1e-6)
                forward.set(1, 0, 0);
            return forward.normalize();
        }

        function getFlatLeftVector(vehicle) {
            const forward = getFlatForwardVector(vehicle);
            forward.set(forward.z, 0, -forward.x);
            if (forward.lengthSq() < 1e-6)
                forward.set(0, 0, -1);
            return forward.normalize();
        }

        function getControllerLabel(controller, aiId) {
            return "player" === controller ? "Spielerauto" : `AI#${aiId}`;
        }

        function getVehicleContactZone(vehicle, otherVehicle) {
            const delta = otherVehicle.getPosition().sub(vehicle.getPosition());
            delta.y = 0;
            const forward = getFlatForwardVector(vehicle);
            const left = getFlatLeftVector(vehicle);
            const longRatio = delta.dot(forward) / Math.max(getVehicleLength(vehicle) / 2, .01);
            const sideRatio = delta.dot(left) / Math.max(getVehicleWidth(vehicle) / 2, .01);
            let zone;
            if (Math.abs(sideRatio) > IMPACT_TUNING.classify.sideZoneFactor && Math.abs(sideRatio) > Math.abs(longRatio) - IMPACT_TUNING.classify.sideBias)
                zone = sideRatio < 0 ? "right_side" : "left_side";
            else if (longRatio > IMPACT_TUNING.classify.frontRearZoneFactor)
                zone = "front";
            else if (longRatio < -IMPACT_TUNING.classify.frontRearZoneFactor)
                zone = "rear";
            else
                zone = Math.abs(sideRatio) > Math.abs(longRatio) ? sideRatio < 0 ? "right_side" : "left_side" : longRatio >= 0 ? "front" : "rear";
            return {
                zone,
                normalizedLong: longRatio,
                normalizedSide: sideRatio,
                isSide: "left_side" === zone || "right_side" === zone,
                distance: delta.length(),
                pushSign: "right_side" === zone ? 1 : -1
            };
        }

        function computeSidePushDirection(struckVehicle, struckZone, hitterVehicle) {
            const side = getFlatLeftVector(struckVehicle).multiplyScalar(struckZone.pushSign);
            side.addScaledVector(getFlatForwardVector(hitterVehicle), IMPACT_TUNING.lowDiff.sideForwardBias);
            side.y = 0;
            if (side.lengthSq() < 1e-6)
                side.copy(getFlatLeftVector(struckVehicle).multiplyScalar(struckZone.pushSign));
            return side.normalize();
        }

        function syncVehicleCrashState(vehicle, crashed) {
            const nextState = !!crashed;
            if (!!vehicle.crashed === nextState)
                return;
            nextState && (typeof vehicle.resetAcc === "function" && vehicle.resetAcc(),
            typeof vehicle.turnOffCruiseControl === "function" && vehicle.turnOffCruiseControl());
            vehicle.crashed = nextState;
        }

        function setPlayerSpeed(player, absSpeed) {
            const safeAbs = Math.max(0, Number(absSpeed) || 0);
            const sign = player && player.speed < 0 ? -1 : 1;
            player.speed = safeAbs < .05 ? 0 : sign * safeAbs;
        }

        function setAiSpeed(resolver, aiId, aiCar, speed) {
            const safe = Math.max(0, Number(speed) || 0);
            resolver.speeds[aiId] = safe;
            resolver.targetSpeeds[aiId] = safe;
            if (aiCar)
                aiCar.speed = safe;
        }

        function stopPlayer(player) {
            setPlayerSpeed(player, 0);
            if (typeof player.resetAcc === "function")
                player.resetAcc();
            if (typeof player.turnOffCruiseControl === "function")
                player.turnOffCruiseControl();
        }

        function stopAi(resolver, aiId, aiCar, freeze = 30, state = 5) {
            setAiSpeed(resolver, aiId, aiCar, 0);
            resolver.locStates[aiId] = state;
            resolver.states[aiId] = state;
            resolver.freezeStates[aiId] = Math.max(Number(resolver.freezeStates[aiId]) || 0, freeze);
        }

        function slowAi(resolver, aiId, aiCar, factor, freeze = 10) {
            const current = speedAbs((resolver.speeds && resolver.speeds[aiId]) ?? (aiCar && aiCar.speed));
            setAiSpeed(resolver, aiId, aiCar, current * factor);
            resolver.freezeStates[aiId] = Math.max(Number(resolver.freezeStates[aiId]) || 0, freeze);
        }

        function getResolverHookState(resolver) {
            if (!resolver.__tmCollisionHook)
                resolver.__tmCollisionHook = {
                    lastByAiId: new Map,
                    lastManagedCollisionLogAt: 0
                };
            return resolver.__tmCollisionHook;
        }

        function computeRestProfile(spec) {
            const speedDiff = clamp(speedAbs(spec.speedDiff), 0, IMPACT_TUNING.maxEvaluatedDiff);
            let score = speedDiff * IMPACT_TUNING.rollover.speedDiffFactor;
            "launch" === spec.kind && (score += IMPACT_TUNING.rollover.launchBonus);
            spec.sideHit && (score += IMPACT_TUNING.rollover.sideBonus);
            "airborne" === spec.phase && (score += IMPACT_TUNING.rollover.airborneBonus);
            score += (Math.abs(spec.angVX || 0) + Math.abs(spec.angVZ || 0)) * IMPACT_TUNING.rollover.angularFactor;

            const axis = spec.rollAxis || (spec.sideHit ? "roll" : "pitch");

            return {
                score,
                axis,
                roofEligible: !spec.forceUpright
            };
        }

        function getImpactUpDot(state) {
            return Math.cos(state.rotX) * Math.cos(state.rotZ);
        }

        function getYawFromQuaternion(quaternion) {
            if (!globalState.THREE)
                return 0;
            return new globalState.THREE.Euler().setFromQuaternion(quaternion, "YXZ").y;
        }

        function getYawFromVector(vector) {
            return Math.atan2(-(Number(vector && vector.z) || 0), Number(vector && vector.x) || 1);
        }

        function lockRestDecision(state, reason) {
            if (!state || state.restDecisionLocked)
                return;

            const upDot = getImpactUpDot(state);
            const landedOnRoof = !!state.roofEligible && upDot < -IMPACT_TUNING.settle.roofUpDotThreshold;
            state.restDecisionLocked = !0;
            state.upsideDown = landedOnRoof;
            state.targetPitch = landedOnRoof && "pitch" === state.rollAxis ? Math.PI * Math.sign(state.angVX || state.vx || 1) : 0;
            state.targetRoll = landedOnRoof && "roll" === state.rollAxis ? Math.PI * Math.sign(state.angVZ || state.vz || 1) : 0;
            log(`${state.label} Restentscheidung (${reason}): ${landedOnRoof ? "dach" : "normal"}, upDot=${upDot.toFixed(2)}, rotX=${state.rotX.toFixed(2)}, rotZ=${state.rotZ.toFixed(2)}`);
        }

        function distancePointToSegment2D(point, start, end) {
            const px = Number(point && point.x) || 0;
            const pz = Number(point && point.z) || 0;
            const ax = Number(start && start.x) || 0;
            const az = Number(start && start.z) || 0;
            const bx = Number(end && end.x) || 0;
            const bz = Number(end && end.z) || 0;
            const abx = bx - ax;
            const abz = bz - az;
            const abLenSq = abx * abx + abz * abz;
            if (abLenSq < 1e-6)
                return {
                    distance: Math.hypot(px - ax, pz - az),
                    progress: 0
                };
            const t = clamp(((px - ax) * abx + (pz - az) * abz) / abLenSq, 0, 1);
            const cx = ax + abx * t;
            const cz = az + abz * t;
            return {
                distance: Math.hypot(px - cx, pz - cz),
                progress: t
            };
        }

        function distancePointToSegmentSq2D(point, start, end) {
            const px = Number(point && point.x) || 0;
            const pz = Number(point && point.z) || 0;
            const ax = Number(start && start.x) || 0;
            const az = Number(start && start.z) || 0;
            const bx = Number(end && end.x) || 0;
            const bz = Number(end && end.z) || 0;
            const abx = bx - ax;
            const abz = bz - az;
            const abLenSq = abx * abx + abz * abz;
            if (abLenSq < 1e-6) {
                const dx = px - ax;
                const dz = pz - az;
                return dx * dx + dz * dz;
            }
            const t = clamp(((px - ax) * abx + (pz - az) * abz) / abLenSq, 0, 1);
            const cx = ax + abx * t;
            const cz = az + abz * t;
            const dx = px - cx;
            const dz = pz - cz;
            return dx * dx + dz * dz;
        }

        function beginImpactState(vehicle, spec) {
            if (!vehicle || !vehicle.cameraGroup)
                return null;
            if (vehicle.__tmImpactState) {
                warn(`${spec.label} hat bereits einen aktiven Impact-State (${vehicle.__tmImpactState.phase}), neuer Start wird ignoriert.`);
                return vehicle.__tmImpactState;
            }

            const rest = computeRestProfile(spec);
            const state = {
                label: spec.label,
                controller: spec.controller,
                resolver: spec.resolver || null,
                aiId: spec.aiId,
                kind: spec.kind,
                source: spec.source || spec.kind,
                speedDiff: clamp(speedAbs(spec.speedDiff), 0, IMPACT_TUNING.maxEvaluatedDiff),
                phase: spec.phase || ((spec.vy || 0) > .1 ? "airborne" : "ground"),
                phaseTime: 0,
                totalTime: 0,
                upsideDown: !1,
                targetPitch: 0,
                targetRoll: 0,
                restScore: rest.score,
                rollAxis: rest.axis,
                roofEligible: rest.roofEligible,
                restDecisionLocked: !1,
                offsetX: 0,
                offsetY: 0,
                offsetZ: 0,
                appliedX: 0,
                appliedY: 0,
                appliedZ: 0,
                rotX: 0,
                rotY: 0,
                rotZ: 0,
                appliedQuat: null,
                vx: Number(spec.vx) || 0,
                vy: Number(spec.vy) || 0,
                vz: Number(spec.vz) || 0,
                angVX: Number(spec.angVX) || 0,
                angVY: Number(spec.angVY) || 0,
                angVZ: Number(spec.angVZ) || 0,
                gravity: Number(spec.gravity) || IMPACT_TUNING.launch.gravityBase,
                airDrag: Number(spec.airDrag) || IMPACT_TUNING.launch.airDrag,
                recoverySpeed: Number(spec.recoverySpeed) || IMPACT_TUNING.settle.aiRecoverySpeed,
                despawnDelay: Number(spec.despawnDelay) || IMPACT_TUNING.settle.upsideDownDespawnDelay,
                sideHit: !!spec.sideHit
            };

            vehicle.__tmImpactState = state;
            syncVehicleCrashState(vehicle, !0);
            log(`Impact-Start ${state.label}: kind=${state.kind}, phase=${state.phase}, rest=${state.restDecisionLocked ? state.upsideDown ? "roof" : "upright" : "pending"}, roofEligible=${state.roofEligible}, score=${state.restScore.toFixed(2)}, diff=${toKmh(state.speedDiff)} km/h`);
            return state;
        }

        function clearImpactState(vehicle, reason) {
            const state = vehicle && vehicle.__tmImpactState;
            if (!state)
                return;
            vehicle.__tmImpactState = null;
            log(`Impact-Ende ${state.label}: reason=${reason}, total=${state.totalTime.toFixed(2)}s`);
        }

        function removeAppliedImpactTransform(vehicle) {
            const state = vehicle && vehicle.__tmImpactState;
            const group = vehicle && vehicle.cameraGroup;
            if (!state || !group)
                return !1;
            if (state.appliedQuat) {
                group.quaternion.premultiply(state.appliedQuat.clone().invert());
                state.appliedQuat = null;
            }
            group.position.x -= state.appliedX;
            group.position.y -= state.appliedY;
            group.position.z -= state.appliedZ;
            state.appliedX = 0;
            state.appliedY = 0;
            state.appliedZ = 0;
            return !0;
        }

        function applyImpactTransform(vehicle) {
            const state = vehicle && vehicle.__tmImpactState;
            const group = vehicle && vehicle.cameraGroup;
            if (!state || !group || !globalState.THREE)
                return !1;

            group.position.x += state.offsetX;
            group.position.y += state.offsetY;
            group.position.z += state.offsetZ;
            state.appliedX = state.offsetX;
            state.appliedY = state.offsetY;
            state.appliedZ = state.offsetZ;

            const quat = new globalState.THREE.Quaternion().setFromEuler(new globalState.THREE.Euler(state.rotX, state.rotY, state.rotZ, "YXZ"));
            group.quaternion.premultiply(quat);
            state.appliedQuat = quat;
            return !0;
        }

        function commitImpactPoseToBase(vehicle, state, options={}) {
            const group = vehicle && vehicle.cameraGroup;
            if (!state || !group || !globalState.THREE)
                return null;
            group.position.x += state.offsetX;
            group.position.y += state.offsetY;
            group.position.z += state.offsetZ;
            const impactQuat = new globalState.THREE.Quaternion().setFromEuler(new globalState.THREE.Euler(state.rotX, state.rotY, state.rotZ, "YXZ"));
            group.quaternion.premultiply(impactQuat);
            const currentYaw = getYawFromQuaternion(group.quaternion);
            group.rotation.set(0, null != options.yaw ? options.yaw : currentYaw, 0);
            vehicle.group && (vehicle.group.rotation.z = Number(options.bodyRoll) || 0);
            state.offsetX = 0;
            state.offsetY = 0;
            state.offsetZ = 0;
            state.appliedX = 0;
            state.appliedY = 0;
            state.appliedZ = 0;
            state.rotX = 0;
            state.rotY = 0;
            state.rotZ = 0;
            state.appliedQuat = null;
            return {
                position: group.position.clone(),
                yaw: group.rotation.y,
                bodyRoll: vehicle.group ? vehicle.group.rotation.z : 0
            };
        }

        function computeLaunchAngularSpeeds(direction, speedDiff, collisionInfo) {
            const diff = clamp(speedAbs(speedDiff), 0, IMPACT_TUNING.maxEvaluatedDiff);
            const pitchBase = IMPACT_TUNING.launch.angularPitchBase + IMPACT_TUNING.launch.angularPitchPerDiff * diff;
            const yawBase = IMPACT_TUNING.launch.angularYawBase + IMPACT_TUNING.launch.angularYawPerDiff * diff;
            const rollBase = IMPACT_TUNING.launch.angularRollBase + IMPACT_TUNING.launch.angularRollPerDiff * diff;
            const pitchSign = Math.sign(direction.dot(collisionInfo && collisionInfo.forwardReference ? collisionInfo.forwardReference : direction)) || 1;
            const yawSign = collisionInfo && "ai" === collisionInfo.hitter ? -1 : 1;
            const rollSign = collisionInfo && collisionInfo.sideSign ? collisionInfo.sideSign : Math.sign(direction.z || 1) || 1;
            return {
                angVX: pitchBase * pitchSign,
                angVY: yawBase * yawSign,
                angVZ: rollBase * rollSign
            };
        }

        function computeRearPushDirection(struckVehicle, hitterVehicle) {
            const direction = getFlatForwardVector(struckVehicle);
            direction.addScaledVector(getFlatForwardVector(hitterVehicle), IMPACT_TUNING.lowDiff.rearPushForwardBias);
            direction.y = 0;
            if (direction.lengthSq() < 1e-6)
                direction.copy(getFlatForwardVector(hitterVehicle));
            return direction.normalize();
        }

        function startLaunchImpact(vehicle, spec) {
            const diff = clamp(speedAbs(spec.speedDiff), 0, IMPACT_TUNING.maxEvaluatedDiff);
            const direction = spec.launchDirection.clone();
            direction.y = 0;
            if (direction.lengthSq() < 1e-6)
                direction.set(1, 0, 0);
            direction.normalize();

            const flightTime = clamp(IMPACT_TUNING.launch.airTimeBase + IMPACT_TUNING.launch.airTimePerDiff * diff, IMPACT_TUNING.launch.airTimeBase, IMPACT_TUNING.launch.airTimeMax);
            const throwDistance = clamp(IMPACT_TUNING.launch.throwDistanceBase + IMPACT_TUNING.launch.throwDistancePerDiff * diff, IMPACT_TUNING.launch.throwDistanceBase, IMPACT_TUNING.launch.throwDistanceMax);
            const horizontalVelocity = throwDistance / flightTime;
            const verticalVelocity = clamp(IMPACT_TUNING.launch.verticalVelocityBase + IMPACT_TUNING.launch.verticalVelocityPerDiff * diff, IMPACT_TUNING.launch.verticalVelocityBase, IMPACT_TUNING.launch.verticalVelocityMax);
            const angular = computeLaunchAngularSpeeds(direction, diff, spec.collisionInfo);
            const state = beginImpactState(vehicle, {
                label: spec.label,
                controller: spec.controller,
                resolver: spec.resolver,
                aiId: spec.aiId,
                kind: "launch",
                source: spec.source,
                speedDiff: diff,
                phase: "airborne",
                vx: direction.x * horizontalVelocity,
                vy: verticalVelocity,
                vz: direction.z * horizontalVelocity,
                gravity: clamp(IMPACT_TUNING.launch.gravityBase + IMPACT_TUNING.launch.gravityPerDiff * diff, IMPACT_TUNING.launch.gravityBase, IMPACT_TUNING.launch.gravityMax),
                airDrag: IMPACT_TUNING.launch.airDrag,
                angVX: angular.angVX,
                angVY: angular.angVY,
                angVZ: angular.angVZ,
                recoverySpeed: Number(spec.recoverySpeed) || IMPACT_TUNING.settle.aiRecoverySpeed,
                sideHit: !!(spec.collisionInfo && String(spec.collisionInfo.type).includes("side")),
                rollAxis: spec.collisionInfo && String(spec.collisionInfo.type).includes("side") ? "roll" : "pitch"
            });
            state && (state.throwDistance = throwDistance,
            log(`Launch vorbereitet fuer ${spec.label}: distanz~${throwDistance.toFixed(1)}m, airtime~${flightTime.toFixed(2)}s, v=(${toMs(state.vx)}, ${toMs(state.vy)}, ${toMs(state.vz)})`));
            return !!state;
        }

        function startSidePushImpact(vehicle, spec) {
            const diff = clamp(speedAbs(spec.speedDiff), 0, IMPACT_TUNING.launchDiffThreshold);
            const direction = spec.pushDirection.clone();
            direction.y = 0;
            if (direction.lengthSq() < 1e-6)
                direction.set(1, 0, 0);
            direction.normalize();

            const pushSpeed = clamp(IMPACT_TUNING.lowDiff.sidePushBase + IMPACT_TUNING.lowDiff.sidePushPerDiff * diff, IMPACT_TUNING.lowDiff.sidePushBase, IMPACT_TUNING.lowDiff.sidePushMax);
            const spin = clamp(IMPACT_TUNING.lowDiff.sideVictimSpinBase + IMPACT_TUNING.lowDiff.sideVictimSpinPerDiff * diff, IMPACT_TUNING.lowDiff.sideVictimSpinBase, IMPACT_TUNING.lowDiff.sideVictimSpinMax);
            const state = beginImpactState(vehicle, {
                label: spec.label,
                controller: spec.controller,
                resolver: spec.resolver,
                aiId: spec.aiId,
                kind: "side_push",
                source: spec.source,
                speedDiff: diff,
                phase: "ground",
                vx: direction.x * pushSpeed,
                vy: 0,
                vz: direction.z * pushSpeed,
                angVX: spin * IMPACT_TUNING.lowDiff.sideVictimPitchFactor,
                angVY: spin * IMPACT_TUNING.lowDiff.sideVictimYawFactor * (spec.yawSign || 1),
                angVZ: spin * IMPACT_TUNING.lowDiff.sideVictimRollFactor * (spec.rollSign || 1),
                recoverySpeed: Number(spec.recoverySpeed) || IMPACT_TUNING.settle.aiRecoverySpeed,
                sideHit: !0,
                rollAxis: "roll",
                forceUpright: !0
            });
            state && log(`Seitenschub fuer ${spec.label}: push=${toMs(pushSpeed)} m/s, dir=(${direction.x.toFixed(2)}, ${direction.z.toFixed(2)}), spin=${spin.toFixed(2)}`);
            return !!state;
        }

        function startRearPushImpact(vehicle, spec) {
            const diff = clamp(speedAbs(spec.speedDiff), 0, IMPACT_TUNING.launchDiffThreshold);
            const direction = spec.pushDirection.clone();
            direction.y = 0;
            if (direction.lengthSq() < 1e-6)
                direction.set(1, 0, 0);
            direction.normalize();

            const pushSpeed = clamp(IMPACT_TUNING.lowDiff.rearPushBase + IMPACT_TUNING.lowDiff.rearPushPerDiff * diff, IMPACT_TUNING.lowDiff.rearPushBase, IMPACT_TUNING.lowDiff.rearPushMax);
            const yaw = clamp(IMPACT_TUNING.lowDiff.rearPushYawBase + Math.abs(Number(spec.sideOffset) || 0) * IMPACT_TUNING.lowDiff.rearPushYawPerSide, IMPACT_TUNING.lowDiff.rearPushYawBase, IMPACT_TUNING.lowDiff.rearPushYawMax) * (Math.sign(Number(spec.sideOffset) || 0) || (spec.yawSign || 1));
            const state = beginImpactState(vehicle, {
                label: spec.label,
                controller: spec.controller,
                resolver: spec.resolver,
                aiId: spec.aiId,
                kind: "rear_push",
                source: spec.source,
                speedDiff: diff,
                phase: "ground",
                vx: direction.x * pushSpeed,
                vy: 0,
                vz: direction.z * pushSpeed,
                angVX: 0,
                angVY: yaw,
                angVZ: 0,
                recoverySpeed: Number(spec.recoverySpeed) || IMPACT_TUNING.settle.aiRecoverySpeed,
                sideHit: !1,
                rollAxis: "pitch",
                forceUpright: !0
            });
            state && log(`Vorwaertsschub fuer ${spec.label}: push=${toMs(pushSpeed)} m/s, yaw=${yaw.toFixed(2)}, dir=(${direction.x.toFixed(2)}, ${direction.z.toFixed(2)})`);
            return !!state;
        }

        function getAiPathTargetPose(resolver, aiId, aiCar) {
            const path = resolver && resolver.carPaths && resolver.carPaths[aiId];
            if (!path || "function" != typeof path.getPositionRotation)
                return null;
            const [position,yaw,bodyRoll] = path.getPositionRotation();
            if (!position)
                return null;
            return {
                position: position.clone(),
                yaw: Number(yaw) || 0,
                bodyRoll: Number(bodyRoll) || 0
            };
        }

        function buildRecoveryBypassPoint(fromPos, targetPos, playerPos) {
            if (!globalState.THREE)
                return null;
            const dir = targetPos.clone().sub(fromPos);
            dir.y = 0;
            if (dir.lengthSq() < 1e-6)
                dir.set(1, 0, 0);
            dir.normalize();
            const side = new globalState.THREE.Vector3(-dir.z, 0, dir.x);
            const playerSide = playerPos.clone().sub(fromPos);
            playerSide.y = 0;
            const sign = side.dot(playerSide) >= 0 ? -1 : 1;
            return playerPos.clone().addScaledVector(side, sign * IMPACT_TUNING.settle.aiRoadRecoverBypassSideOffset).addScaledVector(dir, IMPACT_TUNING.settle.aiRoadRecoverBypassForwardOffset);
        }

        function isPlayerBlockingRecovery(vehiclePos, targetPos, player, aiCar) {
            if (!player)
                return !1;
            const playerPos = player.getPosition().clone();
            playerPos.y = 0;
            const start = vehiclePos.clone();
            start.y = 0;
            const end = targetPos.clone();
            end.y = 0;
            const segment = distancePointToSegment2D(playerPos, start, end);
            const blockRadius = IMPACT_TUNING.settle.aiRoadRecoverBlockRadius + .5 * Math.max(getVehicleWidth(player), getVehicleWidth(aiCar));
            return segment.progress > .08 && segment.progress < 1.05 && segment.distance <= blockRadius;
        }

        function startAiPathRecover(resolver, aiId, aiCar, recoverySpeed, pose) {
            const targetPose = getAiPathTargetPose(resolver, aiId, aiCar);
            if (!targetPose) {
                warn(`AI#${aiId} konnte keinen Rueckkehr-Pfad finden, bleibt an der Landeposition.`);
                syncVehicleCrashState(aiCar, !1);
                return !1;
            }
            const startPose = pose || {
                position: aiCar.getPosition().clone(),
                yaw: aiCar.cameraGroup.rotation.y,
                bodyRoll: aiCar.group ? aiCar.group.rotation.z : 0
            };
            aiCar.__tmPathRecoverState = {
                label: `AI#${aiId}`,
                targetPose,
                recoverySpeed: Math.max(.5, Number(recoverySpeed) || IMPACT_TUNING.settle.aiRecoverySpeed),
                blockedTime: 0,
                bypassPoint: null,
                reversing: !1,
                lastLogAt: 0,
                startPose
            };
            setAiSpeed(resolver, aiId, aiCar, 0);
            resolver.freezeStates[aiId] = Math.max(Number(resolver.freezeStates[aiId]) || 0, IMPACT_TUNING.settle.aiRecoveryFreeze);
            resolver.locStates[aiId] = 4;
            resolver.states[aiId] = 4;
            syncVehicleCrashState(aiCar, !1);
            log(`AI#${aiId} startet Rueckkehr zur Fahrbahn von (${startPose.position.x.toFixed(1)}, ${startPose.position.z.toFixed(1)}) zu (${targetPose.position.x.toFixed(1)}, ${targetPose.position.z.toFixed(1)}).`);
            return !0;
        }

        function updateAiPathRecover(resolver, aiId, aiCar, dtSeconds) {
            const state = aiCar && aiCar.__tmPathRecoverState;
            if (!state)
                return !1;
            const dt = clamp(Number(dtSeconds) || 0, 1 / 240, .08);
            const liveTargetPose = getAiPathTargetPose(resolver, aiId, aiCar);
            liveTargetPose && (state.targetPose = liveTargetPose);
            const player = resolver && resolver.controllManager && resolver.controllManager.controllableCar;
            const currentPos = aiCar.getPosition().clone();
            const destination = (state.bypassPoint || state.targetPose.position).clone();
            currentPos.y = 0;
            destination.y = 0;

            if (!state.bypassPoint && player && isPlayerBlockingRecovery(currentPos, destination, player, aiCar)) {
                state.blockedTime += dt;
                setAiSpeed(resolver, aiId, aiCar, 0);
                if (performance.now() - state.lastLogAt > 600) {
                    state.lastLogAt = performance.now();
                    log(`AI#${aiId} wartet auf freien Weg zur Fahrbahn. blocked=${state.blockedTime.toFixed(2)}s`);
                }
                if (state.blockedTime >= IMPACT_TUNING.settle.aiRoadRecoverWaitBeforeBypass) {
                    state.bypassPoint = buildRecoveryBypassPoint(currentPos, state.targetPose.position.clone().setY(0), player.getPosition().clone().setY(0));
                    state.blockedTime = 0;
                    log(`AI#${aiId} weicht aus und faehrt an dir vorbei. bypass=(${state.bypassPoint.x.toFixed(1)}, ${state.bypassPoint.z.toFixed(1)})`);
                } else
                    return !0;
            } else
                state.blockedTime = 0;

            const activeTarget = (state.bypassPoint || state.targetPose.position).clone();
            const toTarget = activeTarget.sub(aiCar.getPosition());
            toTarget.y = 0;
            const distance = toTarget.length();
            const yawError = Math.abs(shortestAngleDelta(aiCar.cameraGroup.rotation.y, state.targetPose.yaw));
            if (distance <= IMPACT_TUNING.settle.aiRoadRecoverReachDistance && (state.bypassPoint || yawError <= IMPACT_TUNING.settle.aiRoadRecoverReachYaw)) {
                if (state.bypassPoint) {
                    log(`AI#${aiId} hat den Ausweichpunkt erreicht und faehrt jetzt wieder zur Spur.`);
                    state.bypassPoint = null;
                    return !0;
                }
                aiCar.cameraGroup.position.copy(state.targetPose.position);
                aiCar.cameraGroup.rotation.set(0, state.targetPose.yaw, 0);
                aiCar.group && (aiCar.group.rotation.z = state.targetPose.bodyRoll);
                setAiSpeed(resolver, aiId, aiCar, state.recoverySpeed);
                resolver.freezeStates[aiId] = Math.max(Number(resolver.freezeStates[aiId]) || 0, IMPACT_TUNING.settle.aiRecoveryFreeze);
                resolver.locStates[aiId] = 1;
                resolver.states[aiId] = 1;
                aiCar.__tmPathRecoverState = null;
                log(`AI#${aiId} hat die Fahrbahn wieder erreicht und faehrt normal weiter.`);
                return !1;
            }

            const desiredDir = toTarget.clone().normalize();
            const currentForward = getFlatForwardVector(aiCar);
            const dot = currentForward.dot(desiredDir);
            const reversing = dot <= IMPACT_TUNING.settle.aiRoadRecoverReverseDotThreshold;
            state.reversing !== reversing && (state.reversing = reversing,
            log(`AI#${aiId} ${reversing ? "nutzt Rueckwaerts-Korrektur" : "faehrt wieder vorwaerts"} zur Fahrbahn.`));
            const desiredYaw = getYawFromVector(reversing ? desiredDir.clone().negate() : desiredDir);
            const currentYaw = aiCar.cameraGroup.rotation.y;
            const turnLerp = Math.min(1, (reversing ? IMPACT_TUNING.settle.aiRoadRecoverReverseTurnRate : IMPACT_TUNING.settle.aiRoadRecoverTurnRate) * dt);
            aiCar.cameraGroup.rotation.set(0, normalizeAngleRad(currentYaw + shortestAngleDelta(currentYaw, desiredYaw) * turnLerp), 0);
            aiCar.group && (aiCar.group.rotation.z *= Math.pow(IMPACT_TUNING.settle.recoverAngleDamping, 60 * dt));
            const moveDir = reversing ? getFlatForwardVector(aiCar).negate() : getFlatForwardVector(aiCar);
            const moveSpeed = reversing ? IMPACT_TUNING.settle.aiRoadRecoverReverseSpeed : state.recoverySpeed;
            const moveStep = Math.min(distance, moveSpeed * dt);
            aiCar.cameraGroup.position.addScaledVector(moveDir, moveStep);
            setAiSpeed(resolver, aiId, aiCar, 0);
            resolver.freezeStates[aiId] = Math.max(Number(resolver.freezeStates[aiId]) || 0, 2);
            return !0;
        }

        function enterRecoverPhase(vehicle, state) {
            const committedPose = commitImpactPoseToBase(vehicle, state, {
                bodyRoll: 0
            });
            syncVehicleCrashState(vehicle, !1);
            if ("ai" === state.controller && state.resolver && Number.isInteger(state.aiId)) {
                startAiPathRecover(state.resolver, state.aiId, vehicle, state.recoverySpeed, committedPose);
                clearImpactState(vehicle, "ai_recover_to_road");
            } else {
                stopPlayer(vehicle);
                clearImpactState(vehicle, "player_recovered_at_landing");
                log(`${state.label} ist normal gelandet und bleibt an der Landeposition fahrbereit.`);
            }
        }

        function enterUpsideDownRest(vehicle, state) {
            state.phase = "upside_down_rest";
            state.phaseTime = 0;
            state.vx = 0;
            state.vy = 0;
            state.vz = 0;
            state.angVX = 0;
            state.angVY = 0;
            state.angVZ = 0;
            state.offsetY = Math.max(state.offsetY, getVehicleHeight(vehicle) * IMPACT_TUNING.settle.roofRestLiftFactor);
            syncVehicleCrashState(vehicle, !0);
            log(`${state.label} liegt auf dem Ruecken. Timeout bis zur Entfernung: ${state.despawnDelay.toFixed(1)}s`);
        }

        function handleUpsideDownTimeout(vehicle, state) {
            if ("ai" === state.controller && state.resolver && Number.isInteger(state.aiId)) {
                log(`${state.label} liegt weiter auf dem Ruecken und wird jetzt despawnt.`);
                state.resolver.requestDelete(state.aiId);
                clearImpactState(vehicle, "ai_upside_down_despawn");
                return;
            }

            if (IMPACT_TUNING.settle.playerResetOnUpsideDown && "player" === state.controller) {
                log("Spielerauto liegt weiter auf dem Ruecken und wird jetzt per Reset wieder eingesetzt.");
                typeof vehicle.reset === "function" && vehicle.reset();
                stopPlayer(vehicle);
                syncVehicleCrashState(vehicle, !1);
                clearImpactState(vehicle, "player_upside_down_reset");
                return;
            }

            clearImpactState(vehicle, "upside_down_timeout_without_action");
        }

        function updateImpactState(vehicle, dtSeconds) {
            const state = vehicle && vehicle.__tmImpactState;
            if (!state)
                return !1;

            const dt = clamp(Number(dtSeconds) || 0, 1 / 240, .08);
            state.totalTime += dt;
            state.phaseTime += dt;

            if ("airborne" === state.phase) {
                state.offsetX += state.vx * dt;
                state.offsetY = Math.max(0, state.offsetY + state.vy * dt);
                state.offsetZ += state.vz * dt;
                state.rotX = normalizeAngleRad(state.rotX + state.angVX * dt);
                state.rotY = normalizeAngleRad(state.rotY + state.angVY * dt);
                state.rotZ = normalizeAngleRad(state.rotZ + state.angVZ * dt);
                state.vy -= state.gravity * dt;
                const airDrag = Math.pow(state.airDrag, 60 * dt);
                state.vx *= airDrag;
                state.vz *= airDrag;
                state.angVX *= airDrag;
                state.angVY *= airDrag;
                state.angVZ *= airDrag;

                if (state.offsetY <= .01 && state.vy <= 0) {
                    state.offsetY = 0;
                    state.vy = 0;
                    state.phase = "ground";
                    state.phaseTime = 0;
                    state.vx *= IMPACT_TUNING.settle.landingLinearRetention;
                    state.vz *= IMPACT_TUNING.settle.landingLinearRetention;
                    log(`${state.label} ist auf dem Boden aufgekommen und schlittert weiter.`);
                }
            } else if ("ground" === state.phase) {
                state.offsetX += state.vx * dt;
                state.offsetZ += state.vz * dt;
                state.offsetY = Math.max(0, state.offsetY + state.vy * dt);
                state.rotX = normalizeAngleRad(state.rotX + state.angVX * dt);
                state.rotY = normalizeAngleRad(state.rotY + state.angVY * dt);
                state.rotZ = normalizeAngleRad(state.rotZ + state.angVZ * dt);

                state.angVX += -Math.sin(2 * state.rotX) * IMPACT_TUNING.settle.gravityTipStrength * dt;
                state.angVZ += -Math.sin(2 * state.rotZ) * IMPACT_TUNING.settle.gravityTipStrength * dt;

                const groundLinearDamping = Math.pow(IMPACT_TUNING.settle.groundLinearDamping, 60 * dt);
                const groundAngularDamping = Math.pow(IMPACT_TUNING.settle.groundAngularDamping, 60 * dt);
                state.vx *= groundLinearDamping;
                state.vz *= groundLinearDamping;
                state.angVX *= groundAngularDamping;
                state.angVY *= groundAngularDamping;
                state.angVZ *= groundAngularDamping;

                const linearEnergy = Math.hypot(state.vx, state.vz, state.vy);
                const angularEnergy = Math.hypot(state.angVX, state.angVY, state.angVZ);
                if (state.phaseTime >= IMPACT_TUNING.settle.settleMinTime && linearEnergy <= IMPACT_TUNING.settle.settleLinearThreshold && angularEnergy <= IMPACT_TUNING.settle.settleAngularThreshold) {
                    lockRestDecision(state, "settle_stop");
                    if (state.upsideDown)
                        enterUpsideDownRest(vehicle, state);
                    else
                        enterRecoverPhase(vehicle, state);
                    return !1;
                }
            } else if ("recover" === state.phase) {
                const recoverOffsetDamping = Math.pow(IMPACT_TUNING.settle.recoverOffsetDamping, 60 * dt);
                const recoverAngleDamping = Math.pow(IMPACT_TUNING.settle.recoverAngleDamping, 60 * dt);
                state.offsetX *= recoverOffsetDamping;
                state.offsetY *= recoverOffsetDamping;
                state.offsetZ *= recoverOffsetDamping;
                state.rotX *= recoverAngleDamping;
                state.rotY *= recoverAngleDamping;
                state.rotZ *= recoverAngleDamping;
                state.angVX *= recoverAngleDamping;
                state.angVY *= recoverAngleDamping;
                state.angVZ *= recoverAngleDamping;

                if (Math.abs(state.offsetX) <= IMPACT_TUNING.settle.recoverCompletionOffset && Math.abs(state.offsetY) <= IMPACT_TUNING.settle.recoverCompletionOffset && Math.abs(state.offsetZ) <= IMPACT_TUNING.settle.recoverCompletionOffset && Math.abs(state.rotX) <= IMPACT_TUNING.settle.recoverCompletionAngle && Math.abs(state.rotY) <= IMPACT_TUNING.settle.recoverCompletionAngle && Math.abs(state.rotZ) <= IMPACT_TUNING.settle.recoverCompletionAngle && Math.hypot(state.angVX, state.angVY, state.angVZ) <= IMPACT_TUNING.settle.recoverCompletionAngular) {
                    clearImpactState(vehicle, "recovered_to_road");
                    return !1;
                }
            } else if ("upside_down_rest" === state.phase) {
                state.offsetY = Math.max(state.offsetY, getVehicleHeight(vehicle) * IMPACT_TUNING.settle.roofRestLiftFactor);
                state.rotX += shortestAngleDelta(state.rotX, state.targetPitch) * Math.min(1, IMPACT_TUNING.settle.roofAlignStrength * dt);
                state.rotZ += shortestAngleDelta(state.rotZ, state.targetRoll) * Math.min(1, IMPACT_TUNING.settle.roofAlignStrength * dt);
                state.rotY *= Math.pow(IMPACT_TUNING.settle.recoverAngleDamping, 60 * dt);
                if (state.phaseTime >= state.despawnDelay) {
                    handleUpsideDownTimeout(vehicle, state);
                    return !1;
                }
            }

            return applyImpactTransform(vehicle);
        }

        function computeLaunchDirection(fasterVehicle, slowerVehicle) {
            const fasterPos = fasterVehicle.getPosition();
            const slowerPos = slowerVehicle.getPosition();
            const away = slowerPos.clone().sub(fasterPos);
            away.y = 0;
            if (away.lengthSq() < 1e-6)
                away.copy(fasterVehicle.getForwardVector());
            away.y = 0;
            away.normalize();

            const forward = fasterVehicle.getForwardVector().clone();
            forward.y = 0;
            if (forward.lengthSq() > 1e-6)
                forward.normalize();

            away.addScaledVector(forward, .65);
            away.y = 0;
            if (away.lengthSq() < 1e-6)
                away.copy(forward.lengthSq() > 1e-6 ? forward : slowerVehicle.getForwardVector());
            away.y = 0;
            return away.normalize();
        }

        function classifyCollision(player, aiCar) {
            const playerForward = getFlatForwardVector(player);
            const aiForward = getFlatForwardVector(aiCar);
            const alignment = playerForward.dot(aiForward);
            const playerContact = getVehicleContactZone(player, aiCar);
            const aiContact = getVehicleContactZone(aiCar, player);

            let type = "angled_stop";
            let hitter = null;
            let struck = null;
            let pushDirection = null;
            let sideSign = 0;

            if ("rear" === playerContact.zone && "rear" === aiContact.zone)
                type = "rear_to_rear";
            else if ("front" === playerContact.zone && "rear" === aiContact.zone)
                type = "player_rear_ends_ai",
                hitter = "player",
                struck = "ai";
            else if ("rear" === playerContact.zone && "front" === aiContact.zone)
                type = "ai_rear_ends_player",
                hitter = "ai",
                struck = "player";
            else if ("front" === playerContact.zone && "front" === aiContact.zone)
                type = "front_to_front";
            else if (playerContact.isSide || aiContact.isSide)
                if (playerContact.isSide && !aiContact.isSide)
                    type = "ai_hits_player_side",
                    hitter = "ai",
                    struck = "player",
                    pushDirection = computeSidePushDirection(player, playerContact, aiCar),
                    sideSign = playerContact.pushSign;
                else if (aiContact.isSide && !playerContact.isSide)
                    type = "player_hits_ai_side",
                    hitter = "player",
                    struck = "ai",
                    pushDirection = computeSidePushDirection(aiCar, aiContact, player),
                    sideSign = aiContact.pushSign;
                else {
                    const playerSideScore = Math.abs(playerContact.normalizedSide);
                    const aiSideScore = Math.abs(aiContact.normalizedSide);
                    struck = playerSideScore >= aiSideScore ? "player" : "ai";
                    hitter = "player" === struck ? "ai" : "player";
                    if ("player" === struck)
                        type = "ai_hits_player_side",
                        pushDirection = computeSidePushDirection(player, playerContact, aiCar),
                        sideSign = playerContact.pushSign;
                    else
                        type = "player_hits_ai_side",
                        pushDirection = computeSidePushDirection(aiCar, aiContact, player),
                        sideSign = aiContact.pushSign;
                }
            else if (alignment < -.25)
                type = "front_to_front";
            else if (alignment > .5)
                if (playerContact.normalizedLong >= 0)
                    type = "player_rear_ends_ai",
                    hitter = "player",
                    struck = "ai";
                else
                    type = "ai_rear_ends_player",
                    hitter = "ai",
                    struck = "player";

            return {
                type,
                alignment,
                playerContact,
                aiContact,
                hitter,
                struck,
                pushDirection,
                sideSign,
                forwardReference: "player" === struck ? playerForward : aiForward
            };
        }

        function handlePlayerVsAiCollision(resolver, aiId, aiCar, player) {
            const hookState = getResolverHookState(resolver);
            const now = Number(resolver.currentTime) || performance.now() / 1e3;
            const lastAt = hookState.lastByAiId.get(aiId) ?? -1e9;
            if (now - lastAt < IMPACT_TUNING.collisionCooldown) {
                resolver.mainCarInCollision = !0;
                return "throttled";
            }
            hookState.lastByAiId.set(aiId, now);

            const playerSpeed = speedAbs(player.speed);
            const aiSpeed = speedAbs((resolver.speeds && resolver.speeds[aiId]) ?? aiCar.speed);
            const diff = Math.abs(playerSpeed - aiSpeed);
            const info = classifyCollision(player, aiCar);
            const highDiff = diff >= IMPACT_TUNING.launchDiffThreshold;

            resolver.mainCarInCollision = !0;
            log(`Kollision mit AI#${aiId}: typ=${info.type}, player=${toKmh(playerSpeed)} km/h, ai=${toKmh(aiSpeed)} km/h, diff=${toKmh(diff)} km/h, playerZone=${info.playerContact.zone}, aiZone=${info.aiContact.zone}`);

            if (highDiff) {
                const slowerIsPlayer = playerSpeed <= aiSpeed;
                const slowerVehicle = slowerIsPlayer ? player : aiCar;
                const fasterVehicle = slowerIsPlayer ? aiCar : player;
                const slowerController = slowerIsPlayer ? "player" : "ai";
                const slowerLabel = getControllerLabel(slowerController, aiId);
                const launched = startLaunchImpact(slowerVehicle, {
                    label: slowerLabel,
                    controller: slowerController,
                    resolver,
                    aiId: slowerIsPlayer ? null : aiId,
                    source: "high_diff_collision",
                    speedDiff: diff,
                    collisionInfo: info,
                    launchDirection: computeLaunchDirection(fasterVehicle, slowerVehicle)
                });

                if (slowerIsPlayer) {
                    applyVehicleDamage(32 + diff * 2.2, "high-speed collision");
                    stopPlayer(player);
                    slowAi(resolver, aiId, aiCar, IMPACT_TUNING.launch.slowerCarHitFasterSlowFactor, 35);
                } else {
                    applyVehicleDamage(10 + diff * .7, "hard hit");
                    stopAi(resolver, aiId, aiCar, 90, 5);
                    setPlayerSpeed(player, Math.max(1, playerSpeed * IMPACT_TUNING.launch.fasterCarSlowFactor));
                    if (typeof player.resetAcc === "function")
                        player.resetAcc();
                }

                if (launched) {
                    log(`High-diff Treffer: ${slowerLabel} wird weggeschleudert.`);
                    return slowerIsPlayer ? "launch_player" : "launch_ai";
                }

                warn("High-diff erkannt, aber Flugstart fehlgeschlagen. Fallback auf Stop.");
                stopPlayer(player);
                stopAi(resolver, aiId, aiCar, 40, 5);
                return "launch_fallback_stop";
            }

            if ("rear_to_rear" === info.type) {
                applyVehicleDamage(8 + diff * 1.7, "rear collision");
                stopPlayer(player);
                stopAi(resolver, aiId, aiCar, IMPACT_TUNING.lowDiff.rearRearStopFreeze, 5);
                log("Heck-gegen-Heck erkannt: beide Autos werden gestoppt.");
                return "rear_to_rear_stop";
            }

            if ("front_to_front" === info.type) {
                applyVehicleDamage(18 + diff * 2.8, "front collision");
                stopPlayer(player);
                stopAi(resolver, aiId, aiCar, IMPACT_TUNING.lowDiff.bothStopFreeze, 5);
                log("Front-gegen-Front erkannt: beide Fahrzeuge werden gestoppt.");
                return "front_to_front_stop";
            }

            if ("player_rear_ends_ai" === info.type) {
                applyVehicleDamage(7 + diff * 1.4, "rear-end impact");
                const boost = clamp(IMPACT_TUNING.lowDiff.rearEndBoostBase + IMPACT_TUNING.lowDiff.rearEndBoostPerDiff * diff, IMPACT_TUNING.lowDiff.rearEndBoostBase, IMPACT_TUNING.lowDiff.rearEndBoostMax);
                const newAiSpeed = Math.min(playerSpeed, aiSpeed + boost);
                const pushed = startRearPushImpact(aiCar, {
                    label: `AI#${aiId}`,
                    controller: "ai",
                    resolver,
                    aiId,
                    source: info.type,
                    speedDiff: diff,
                    pushDirection: computeRearPushDirection(aiCar, player),
                    recoverySpeed: newAiSpeed,
                    sideOffset: info.aiContact.normalizedSide
                });
                setAiSpeed(resolver, aiId, aiCar, newAiSpeed);
                resolver.freezeStates[aiId] = Math.max(Number(resolver.freezeStates[aiId]) || 0, 8);
                setPlayerSpeed(player, playerSpeed * IMPACT_TUNING.lowDiff.rearVehicleSlowFactor);
                if (typeof player.resetAcc === "function")
                    player.resetAcc();
                log(`Auffahrunfall: vorderes Auto (AI#${aiId}) wird leicht beschleunigt auf ${toMs(newAiSpeed)} m/s, aber nicht schneller als das hintere Auto.${pushed ? " Zusaetzlich wird es sichtbar nach vorne weggeschoben." : ""}`);
                return pushed ? "rear_push_player_hits_ai" : "rear_end_player_hits_ai";
            }

            if ("ai_rear_ends_player" === info.type) {
                applyVehicleDamage(12 + diff * 2.1, "rear-ended");
                const boost = clamp(IMPACT_TUNING.lowDiff.rearEndBoostBase + IMPACT_TUNING.lowDiff.rearEndBoostPerDiff * diff, IMPACT_TUNING.lowDiff.rearEndBoostBase, IMPACT_TUNING.lowDiff.rearEndBoostMax);
                setPlayerSpeed(player, Math.min(aiSpeed, playerSpeed + boost));
                slowAi(resolver, aiId, aiCar, IMPACT_TUNING.lowDiff.rearVehicleSlowFactor, 12);
                if (typeof player.turnOffCruiseControl === "function")
                    player.turnOffCruiseControl();
                log(`Auffahrunfall: Spielerauto vorne bekommt einen kleinen Boost und bleibt bei maximal ${toMs(aiSpeed)} m/s, AI#${aiId} wird langsamer.`);
                return "rear_end_ai_hits_player";
            }

            if ("player_hits_ai_side" === info.type || "ai_hits_player_side" === info.type) {
                const struckIsPlayer = "player" === info.struck;
                applyVehicleDamage(struckIsPlayer ? 14 + diff * 2.5 : 5 + diff * .9, struckIsPlayer ? "side impact" : "side swipe");
                const struckVehicle = struckIsPlayer ? player : aiCar;
                const struckLabel = struckIsPlayer ? "Spielerauto" : `AI#${aiId}`;
                const started = startSidePushImpact(struckVehicle, {
                    label: struckLabel,
                    controller: struckIsPlayer ? "player" : "ai",
                    resolver,
                    aiId: struckIsPlayer ? null : aiId,
                    source: info.type,
                    speedDiff: diff,
                    pushDirection: info.pushDirection,
                    recoverySpeed: struckIsPlayer ? 0 : Math.max(.5, aiSpeed * IMPACT_TUNING.lowDiff.sideVictimTargetSpeedFactor),
                    yawSign: "player_hits_ai_side" === info.type ? 1 : -1,
                    rollSign: info.sideSign
                });

                if (struckIsPlayer) {
                    stopPlayer(player);
                    slowAi(resolver, aiId, aiCar, IMPACT_TUNING.lowDiff.sideHitterSlowFactor, 10);
                } else {
                    setAiSpeed(resolver, aiId, aiCar, aiSpeed * IMPACT_TUNING.lowDiff.sideVictimTargetSpeedFactor);
                    resolver.freezeStates[aiId] = Math.max(Number(resolver.freezeStates[aiId]) || 0, 10);
                    setPlayerSpeed(player, playerSpeed * IMPACT_TUNING.lowDiff.sideHitterSlowFactor);
                    typeof player.resetAcc === "function" && player.resetAcc();
                }

                if (started) {
                    log(`Seitenkollision: ${struckLabel} wird seitlich weggedrueckt.`);
                    return struckIsPlayer ? "player_side_pushed" : "ai_side_pushed";
                }
            }

            setPlayerSpeed(player, playerSpeed * .3);
            slowAi(resolver, aiId, aiCar, .3, 20);
            log("Unklare Kollision mit kleinem Tempounterschied: beide werden stark abgebremst.");
            return "angled_slowdown";
        }

        function normalizeTownLabel(value) {
            const raw = String(value || "");
            if (!isDeveloperToggleEnabled("perfTownLabelCache"))
                return raw.replace(/\s+/g, " ").trim();
            const cache = runtimeState.normalizedLabelCache instanceof Map ? runtimeState.normalizedLabelCache : runtimeState.normalizedLabelCache = new Map;
            const cached = cache.get(raw);
            if (void 0 !== cached)
                return cached;
            const normalized = raw.replace(/\s+/g, " ").trim();
            return rememberLimitedCache(cache, raw, normalized, 2400);
        }

        function isLikelyTownLabel(value) {
            const text = normalizeTownLabel(value);
            return text.length >= 2 && text.length <= 48 && /[A-Za-z]/.test(text);
        }

        function extractTownBaseLabel(value, source) {
            const text = normalizeTownLabel(value);
            if (!text)
                return "";
            const separators = [",", ";", "|", " - ", " / ", " (", " ["];
            let cutIndex = -1;
            for (const separator of separators) {
                const index = text.indexOf(separator);
                if (index >= 0 && (-1 === cutIndex || index < cutIndex))
                    cutIndex = index;
            }
            let candidate = normalizeTownLabel(cutIndex >= 0 ? text.slice(0, cutIndex) : text);
            if ("bus" === source || "train" === source) {
                candidate = candidate.replace(/\b(?:bahnhof|busbahnhof|bus station|train station|zentrum|center|centre|mitte|ost|west|nord|sued|south|north|east|airport|flughafen|klinikum|klinik|hospital|schule|kirche|markt|rathaus|city hall|stadion|stadium|campus|gewerbegebiet|industrie|industrial park)\b/gi, " ");
                candidate = candidate.replace(/\b\d+[A-Za-z]?\b/g, " ");
                candidate = normalizeTownLabel(candidate);
            }
            if (candidate.length < 3)
                candidate = normalizeTownLabel(cutIndex >= 0 ? text.slice(0, cutIndex) : text);
            return candidate.length >= 3 ? candidate : text;
        }

        function splitTownDestinationLabels(value) {
            if (isDeveloperToggleEnabled("perfTownSplitLabels")) {
                const text = normalizeTownLabel(value);
                const result = [];
                let start = 0;
                for (let index = 0; index <= text.length; index++) {
                    if (index < text.length && ";" !== text[index] && "|" !== text[index])
                        continue;
                    const label = normalizeTownLabel(text.slice(start, index));
                    label && result.push(label);
                    start = index + 1;
                }
                return result;
            }
            return normalizeTownLabel(value).split(/[;|]/).map(normalizeTownLabel).filter(Boolean);
        }

        function toSafeArray(value) {
            return Array.isArray(value) ? value : [];
        }

        function townDistance2D(a, b) {
            return Math.hypot((Number(a.x) || 0) - (Number(b.x) || 0), (Number(a.z) || 0) - (Number(b.z) || 0));
        }

        function townDistance2DSq(a, b) {
            const dx = (Number(a.x) || 0) - (Number(b.x) || 0);
            const dz = (Number(a.z) || 0) - (Number(b.z) || 0);
            return dx * dx + dz * dz;
        }

        function averageTownVector3(points) {
            const out = new globalState.THREE.Vector3;
            if (!points.length)
                return out;
            for (const point of points)
                out.add(point);
            return out.multiplyScalar(1 / points.length);
        }

        let runtimeRoadEdgeId = 0;

        function getRoadEdgeId(edge) {
            if (!edge)
                return "edge:none";
            edge.__tmRoadEdgeId || (edge.__tmRoadEdgeId = `edge:${++runtimeRoadEdgeId}`);
            return edge.__tmRoadEdgeId;
        }

        function getEdgeLength2D(edge) {
            if (isDeveloperToggleEnabled("perfRoadEdgeDistanceCache"))
                return getRoadEdgeDistanceData(edge).total;
            const points = getEdgeWorldPoints(edge);
            let total = 0;
            for (let index = 0; index < points.length - 1; index++)
                total += getDistance2D(points[index], points[index + 1]);
            return total;
        }

        function getEdgeDistanceAtMatch(edge, segmentIndex, segmentProgress) {
            if (isDeveloperToggleEnabled("perfRoadEdgeDistanceCache")) {
                const data = getRoadEdgeDistanceData(edge);
                const segment = Math.floor(Number(segmentIndex));
                if (!Number.isFinite(segment) || segment < 0)
                    return 0;
                if (segment >= data.cumulative.length - 1)
                    return data.total;
                const segmentLength = data.cumulative[segment + 1] - data.cumulative[segment];
                return data.cumulative[segment] + segmentLength * clamp(segmentProgress, 0, 1);
            }
            const points = getEdgeWorldPoints(edge);
            let total = 0;
            for (let index = 0; index < points.length - 1; index++) {
                const segmentLength = getDistance2D(points[index], points[index + 1]);
                if (index < segmentIndex)
                    total += segmentLength;
                else if (index === segmentIndex) {
                    total += segmentLength * clamp(segmentProgress, 0, 1);
                    break;
                }
            }
            return total;
        }

        function getRemainingDistanceOnMatchedEdge(match, direction) {
            if (!match || !match.edge)
                return 0;
            if (isDeveloperToggleEnabled("perfRoadDistanceFastPath")) {
                const data = getRoadEdgeDistanceData(match.edge);
                const segment = Math.floor(Number(match.segmentIndex));
                if (!Number.isFinite(segment) || segment < 0)
                    return direction > 0 ? data.total : 0;
                if (segment >= data.cumulative.length - 1)
                    return direction > 0 ? 0 : data.total;
                const segmentLength = data.cumulative[segment + 1] - data.cumulative[segment];
                const progressDistance = data.cumulative[segment] + segmentLength * clamp(match.progress, 0, 1);
                return direction > 0 ? Math.max(0, data.total - progressDistance) : Math.max(0, progressDistance);
            }
            const progressDistance = getEdgeDistanceAtMatch(match.edge, match.segmentIndex, match.progress);
            const totalDistance = getEdgeLength2D(match.edge);
            return direction > 0 ? Math.max(0, totalDistance - progressDistance) : Math.max(0, progressDistance);
        }

        function getTargetDistanceFromEdgeStart(match, direction) {
            if (!match || !match.edge)
                return 0;
            if (isDeveloperToggleEnabled("perfRoadDistanceFastPath")) {
                const data = getRoadEdgeDistanceData(match.edge);
                const segment = Math.floor(Number(match.segmentIndex));
                if (!Number.isFinite(segment) || segment < 0)
                    return direction > 0 ? 0 : data.total;
                if (segment >= data.cumulative.length - 1)
                    return direction > 0 ? data.total : 0;
                const segmentLength = data.cumulative[segment + 1] - data.cumulative[segment];
                const progressDistance = data.cumulative[segment] + segmentLength * clamp(match.progress, 0, 1);
                return direction > 0 ? progressDistance : Math.max(0, data.total - progressDistance);
            }
            const progressDistance = getEdgeDistanceAtMatch(match.edge, match.segmentIndex, match.progress);
            const totalDistance = getEdgeLength2D(match.edge);
            return direction > 0 ? progressDistance : Math.max(0, totalDistance - progressDistance);
        }

        function makeRoadRouteKey(edge, direction) {
            return `${getRoadEdgeId(edge)}:${direction > 0 ? 1 : -1}`;
        }

        function getRoadEdgeDistanceData(edge) {
            const points = getEdgeWorldPoints(edge);
            const cached = edge && edge.__tmRoadEdgeDistanceData;
            if (cached && cached.points === points && cached.length === points.length)
                return cached;
            const cumulative = [0];
            let total = 0;
            for (let index = 0; index < points.length - 1; index++) {
                total += getDistance2D(points[index], points[index + 1]);
                cumulative.push(total);
            }
            const data = {
                points,
                length: points.length,
                cumulative,
                total
            };
            edge && (edge.__tmRoadEdgeDistanceData = data);
            return data;
        }

        function isRoadEligibleForTownSigns(edge) {
            const roadModule = townSignsState.roadModule;
            if (!edge || !roadModule)
                return !1;
            if (isDeveloperToggleEnabled("perfRoadEligibilityCheck")) {
                const type = edge.type;
                return type !== roadModule.ROAD_TYPE_VIRTUAL && type !== roadModule.ROAD_TYPE_MOTORWAY && type !== roadModule.ROAD_TYPE_MOTORWAY_NO_HARD_SHOULDER && type !== roadModule.ROAD_TYPE_MOTORWAY_OPEN && type !== roadModule.ROAD_TYPE_MOTORWAY_LINK && type !== roadModule.ROAD_TYPE_MERGING_LANE && type !== roadModule.ROAD_TYPE_SERVICE && type !== roadModule.ROAD_TYPE_PARKING_AISLE && type !== roadModule.ROAD_TYPE_DRIVEWAY && type !== roadModule.ROAD_TYPE_DRIVE_THROUGH && type !== roadModule.ROAD_TYPE_RACETRACK;
            }
            return ![
                roadModule.ROAD_TYPE_VIRTUAL,
                roadModule.ROAD_TYPE_MOTORWAY,
                roadModule.ROAD_TYPE_MOTORWAY_NO_HARD_SHOULDER,
                roadModule.ROAD_TYPE_MOTORWAY_OPEN,
                roadModule.ROAD_TYPE_MOTORWAY_LINK,
                roadModule.ROAD_TYPE_MERGING_LANE,
                roadModule.ROAD_TYPE_SERVICE,
                roadModule.ROAD_TYPE_PARKING_AISLE,
                roadModule.ROAD_TYPE_DRIVEWAY,
                roadModule.ROAD_TYPE_DRIVE_THROUGH,
                roadModule.ROAD_TYPE_RACETRACK
            ].includes(edge.type);
        }

        function isRoadEligibleForTownHints(edge) {
            const roadModule = townSignsState.roadModule;
            if (!edge || !roadModule)
                return !1;
            if (isDeveloperToggleEnabled("perfRoadEligibilityCheck")) {
                const type = edge.type;
                return type !== roadModule.ROAD_TYPE_VIRTUAL && type !== roadModule.ROAD_TYPE_MOTORWAY && type !== roadModule.ROAD_TYPE_MOTORWAY_NO_HARD_SHOULDER && type !== roadModule.ROAD_TYPE_MOTORWAY_OPEN && type !== roadModule.ROAD_TYPE_MOTORWAY_LINK && type !== roadModule.ROAD_TYPE_MERGING_LANE && type !== roadModule.ROAD_TYPE_RACETRACK;
            }
            return ![
                roadModule.ROAD_TYPE_VIRTUAL,
                roadModule.ROAD_TYPE_MOTORWAY,
                roadModule.ROAD_TYPE_MOTORWAY_NO_HARD_SHOULDER,
                roadModule.ROAD_TYPE_MOTORWAY_OPEN,
                roadModule.ROAD_TYPE_MOTORWAY_LINK,
                roadModule.ROAD_TYPE_MERGING_LANE,
                roadModule.ROAD_TYPE_RACETRACK
            ].includes(edge.type);
        }

        function getTownRoadLateralOffset(edge) {
            try {
                const left = typeof edge.getLeftSize === "function" ? Number(edge.getLeftSize()) || 0 : 0;
                const right = typeof edge.getRightSize === "function" ? Number(edge.getRightSize()) || 0 : 0;
                return Math.max(left, right) + TOWN_SIGN_CONFIG.signSideOffset;
            } catch (offsetError) {
                return 4;
            }
        }

        function chooseTownStopDisplayName(candidate, stopBaseCounts, destinationBaseCounts) {
            const raw = normalizeTownLabel(candidate.rawName);
            const base = extractTownBaseLabel(raw, candidate.source);
            if (!base)
                return raw;
            if ("bus" === candidate.source)
                return base;
            if (base !== raw && ("train" === candidate.source || (stopBaseCounts.get(base) || 0) > 1 || (destinationBaseCounts.get(base) || 0) > 0))
                return base;
            return raw;
        }

        function clusterTownCandidates(candidates, distanceLimit) {
            const clusters = [];
            for (const candidate of candidates) {
                let target = null;
                for (const cluster of clusters)
                    if (cluster.name === candidate.name && townDistance2D(cluster.center, candidate.position) <= distanceLimit) {
                        target = cluster;
                        break;
                    }
                if (!target) {
                    target = {
                        name: candidate.name,
                        center: candidate.position.clone(),
                        points: [],
                        sources: [],
                        strongCount: 0,
                        weakCount: 0
                    };
                    clusters.push(target);
                }
                target.points.push(candidate.position.clone());
                target.sources.push(candidate);
                "bus" === candidate.source ? target.weakCount += 1 : target.strongCount += 1;
                target.center = averageTownVector3(target.points);
            }
            return clusters;
        }

        function isOsmPlaceFetchEnabled() {
            return !globalThis.__tmDisableOsmPlaceFetch;
        }

        function queueTownPlaceFetch(chunk) {
            if (!featureState.townSigns)
                return;
            if (!chunk || !chunk.bbox || !runtimeState.geoModule)
                return;
            if (!isOsmPlaceFetchEnabled())
                return;
            const now = Date.now();
            if (townSignsState.placeFetchBackoffUntil && now < townSignsState.placeFetchBackoffUntil)
                return;
            if (townSignsState.placeRequestQueue.size >= 1)
                return;
            const key = chunkPoiKey(chunk);
            if (townSignsState.placeCache.has(key) || townSignsState.placeRequestQueue.has(key))
                return;
            townSignsState.placeRequestQueue.add(key);
            const south = Math.min(Number(chunk.bbox[0]) || 0, Number(chunk.bbox[2]) || 0);
            const north = Math.max(Number(chunk.bbox[0]) || 0, Number(chunk.bbox[2]) || 0);
            const west = Math.min(Number(chunk.bbox[1]) || 0, Number(chunk.bbox[3]) || 0);
            const east = Math.max(Number(chunk.bbox[1]) || 0, Number(chunk.bbox[3]) || 0);
            const placeFilter = '["place"~"^(city|town|village|hamlet|suburb|quarter|neighbourhood|locality)$"]';
            const query = `[out:json][timeout:8];(node${placeFilter}(${south},${west},${north},${east});way${placeFilter}(${south},${west},${north},${east});relation${placeFilter}(${south},${west},${north},${east}););out center tags;`;
            fetchOverpassJson(query).then(data => {
                townSignsState.placeFetchFailures = 0;
                townSignsState.placeFetchBackoffUntil = 0;
                const places = [];
                for (const element of toSafeArray(data && data.elements)) {
                    const tags = element.tags || {};
                    const rawName = normalizeTownLabel(tags.name || tags["name:de"] || tags["name:en"]);
                    if (!isLikelyTownLabel(rawName))
                        continue;
                    const lat = Number(element.lat || element.center && element.center.lat);
                    const lon = Number(element.lon || element.center && element.center.lon);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon))
                        continue;
                    let position = null;
                    try {
                        position = runtimeState.geoModule.convertProjLocalCoords([lat, lon]);
                    } catch (geoError) {}
                    if (!position)
                        continue;
                    places.push({
                        rawName,
                        name: extractTownBaseLabel(rawName, "place"),
                        source: "place",
                        position
                    });
                }
                townSignsState.placeCache.set(key, places);
                places.length && queueTownRebuild("osm_place_fetch");
            }).catch((placeError => {
                townSignsState.placeCache.set(key, []);
                const failedAt = Date.now();
                townSignsState.placeFetchFailures = Math.min(8, (Number(townSignsState.placeFetchFailures) || 0) + 1);
                townSignsState.placeFetchBackoffUntil = failedAt + Math.min(10 * 60 * 1000, 30 * 1000 * Math.pow(2, townSignsState.placeFetchFailures - 1));
                if (failedAt - (Number(townSignsState.placeFetchWarnedAt) || 0) > 60 * 1000) {
                    townSignsState.placeFetchWarnedAt = failedAt;
                    warn("OSM-Ortsnamen momentan nicht erreichbar; externe Overpass-Abfragen pausieren kurz.", placeError);
                }
            })).finally((() => townSignsState.placeRequestQueue.delete(key)));
        }

        function collectTownWorldData() {
            const chunkManager = townSignsState.chunkManager;
            const roadModule = townSignsState.roadModule;
            const chunks = Object.values(chunkManager && chunkManager.loadedChunks || {});
            const buildings = [];
            const stopCandidates = [];
            const busCandidates = [];
            const destinationCandidates = [];
            const placeCandidates = [];
            const roads = [];

            for (const chunk of chunks) {
                if (!chunk)
                    continue;
                queueTownPlaceFetch(chunk);
                const cachedPlaces = townSignsState.placeCache.get(chunkPoiKey(chunk));
                for (const place of toSafeArray(cachedPlaces))
                    place && place.position && placeCandidates.push({
                        rawName: place.rawName || place.name,
                        source: "place",
                        position: cloneVector3(place.position),
                        name: place.name || extractTownBaseLabel(place.rawName, "place")
                    });

                for (const building of toSafeArray(chunk.buildings))
                    building && building.houseCenter && buildings.push(building);

                for (const stop of toSafeArray(chunk.trainStops)) {
                    const rawName = normalizeTownLabel(stop && stop.name);
                    if (!isLikelyTownLabel(rawName) || !stop.pos || !chunk.centerVec)
                        continue;
                    stopCandidates.push({
                        rawName,
                        source: "train",
                        position: stop.pos.clone().add(chunk.centerVec)
                    });
                }

                for (const stop of toSafeArray(chunk.busStops)) {
                    const rawName = normalizeTownLabel(stop && stop.name);
                    if (!isLikelyTownLabel(rawName) || !stop.pos || !chunk.centerVec)
                        continue;
                    busCandidates.push({
                        rawName,
                        source: "bus",
                        position: stop.pos.clone().add(chunk.centerVec)
                    });
                }

                for (const edge of toSafeArray(chunk.newRoadGraph && chunk.newRoadGraph.edges)) {
                    if (!edge)
                        continue;
                    roads.push(edge);
                    if (!isRoadEligibleForTownHints(edge))
                        continue;

                    if (edge.destinationForward) {
                        const targetPosition = edge.points && edge.points.length ? edge.points[edge.points.length - 1].clone().add(edge.chunk.centerVec) : null;
                        for (const label of splitTownDestinationLabels(edge.destinationForward)) {
                            const name = extractTownBaseLabel(label);
                            if (targetPosition && isLikelyTownLabel(name))
                                destinationCandidates.push({
                                    name,
                                    position: targetPosition.clone(),
                                    source: "destination"
                                });
                        }
                    }

                    if (edge.destinationBackward && !edge.oneway) {
                        const targetPosition = edge.points && edge.points.length ? edge.points[0].clone().add(edge.chunk.centerVec) : null;
                        for (const label of splitTownDestinationLabels(edge.destinationBackward)) {
                            const name = extractTownBaseLabel(label);
                            if (targetPosition && isLikelyTownLabel(name))
                                destinationCandidates.push({
                                    name,
                                    position: targetPosition.clone(),
                                    source: "destination"
                                });
                        }
                    }
                }
            }

            const destinationNameByArea = [];
            for (const candidate of destinationCandidates) {
                let existing = destinationNameByArea.find(entry => entry.name === candidate.name && townDistance2D(entry.position, candidate.position) < 450);
                if (!existing) {
                    existing = {
                        name: candidate.name,
                        position: candidate.position.clone(),
                        count: 0
                    };
                    destinationNameByArea.push(existing);
                }
                existing.count += 1;
                existing.position.lerp(candidate.position, 1 / existing.count);
            }

            const stopBaseCounts = new Map;
            for (const candidate of stopCandidates) {
                const base = extractTownBaseLabel(candidate.rawName, candidate.source);
                stopBaseCounts.set(base, (stopBaseCounts.get(base) || 0) + 1);
            }

            const destinationBaseCounts = new Map;
            for (const candidate of destinationCandidates)
                destinationBaseCounts.set(candidate.name, (destinationBaseCounts.get(candidate.name) || 0) + 1);

            const busBaseCounts = new Map;
            for (const candidate of busCandidates) {
                const base = extractTownBaseLabel(candidate.rawName, "bus");
                base && busBaseCounts.set(base, (busBaseCounts.get(base) || 0) + 1);
            }

            const namedStops = stopCandidates.map(candidate => ({
                source: candidate.source,
                position: candidate.position,
                name: chooseTownStopDisplayName(candidate, stopBaseCounts, destinationBaseCounts),
                rawName: candidate.rawName
            })).filter(candidate => isLikelyTownLabel(candidate.name));
            for (const place of placeCandidates)
                if (place.position && isLikelyTownLabel(place.name))
                    namedStops.push({
                        source: "place",
                        position: place.position,
                        name: place.name,
                        rawName: place.rawName || place.name
                    });
            for (const destination of destinationNameByArea) {
                if (!isLikelyTownLabel(destination.name))
                    continue;
                namedStops.push({
                    source: "destination",
                    position: destination.position.clone(),
                    name: destination.name,
                    rawName: destination.name
                });
            }
            for (const candidate of busCandidates) {
                const base = extractTownBaseLabel(candidate.rawName, "bus");
                const hasDestinationSupport = (destinationBaseCounts.get(base) || 0) > 0;
                const hasRepeatedTownSupport = (busBaseCounts.get(base) || 0) >= 5;
                if (!base || !isLikelyTownLabel(base) || !hasDestinationSupport && !hasRepeatedTownSupport)
                    continue;
                namedStops.push({
                    source: candidate.source,
                    position: candidate.position,
                    name: base,
                    rawName: candidate.rawName
                });
            }

            return {
                buildings,
                namedStops,
                destinationCandidates,
                placeCandidates,
                roads
            };
        }

        function computeTownBuildingStats(center, buildings) {
            let count = 0;
            let maxDistance = 0;
            const centroid = new globalState.THREE.Vector3;
            for (const building of buildings) {
                if (!building || !building.houseCenter)
                    continue;
                const distance = townDistance2D(center, building.houseCenter);
                if (distance > TOWN_SIGN_CONFIG.buildingSearchRadius)
                    continue;
                count += 1;
                maxDistance = Math.max(maxDistance, distance);
                centroid.add(building.houseCenter);
            }
            if (count > 0)
                centroid.multiplyScalar(1 / count);
            return {
                count,
                maxDistance,
                centroid
            };
        }

        function mergeTownPlaces(places) {
            const merged = [];
            for (const place of places) {
                let target = null;
                for (const existing of merged)
                    if (existing.name === place.name && townDistance2D(existing.center, place.center) <= Math.max(existing.radius, place.radius) * .8) {
                        target = existing;
                        break;
                    }
                if (!target) {
                    merged.push({
                        name: place.name,
                        center: place.center.clone(),
                        radius: place.radius,
                        strongCount: place.strongCount,
                        weakCount: place.weakCount,
                        destinationSupport: place.destinationSupport,
                        buildingCount: place.buildingCount,
                        centers: [place.center.clone()],
                        sourceNames: place.sourceNames.slice()
                    });
                    continue;
                }
                target.centers.push(place.center.clone());
                target.center = averageTownVector3(target.centers);
                target.radius = clamp(Math.max(target.radius, place.radius, townDistance2D(target.center, place.center) + Math.min(target.radius, place.radius)), TOWN_SIGN_CONFIG.minPlaceRadius, TOWN_SIGN_CONFIG.maxPlaceRadius);
                target.strongCount += place.strongCount;
                target.weakCount += place.weakCount;
                target.destinationSupport += place.destinationSupport;
                target.buildingCount = Math.max(target.buildingCount, place.buildingCount);
                for (const sourceName of place.sourceNames)
                    target.sourceNames.includes(sourceName) || target.sourceNames.push(sourceName);
            }
            return merged;
        }

        function buildTownPlaces(worldData) {
            const stopClusters = clusterTownCandidates(worldData.namedStops, TOWN_SIGN_CONFIG.placeClusterDistance);
            const destinationClusters = clusterTownCandidates(worldData.destinationCandidates, TOWN_SIGN_CONFIG.destinationClusterDistance);
            const destinationSupportByName = new Map;
            for (const cluster of destinationClusters)
                destinationSupportByName.set(cluster.name, (destinationSupportByName.get(cluster.name) || 0) + cluster.points.length);

            const places = [];
            for (const cluster of stopClusters) {
                const pointSpread = cluster.points.reduce((maxDistance, point) => Math.max(maxDistance, townDistance2D(point, cluster.center)), 0);
                const buildingStats = computeTownBuildingStats(cluster.center, worldData.buildings);
                if (cluster.strongCount <= 0 && cluster.points.length < 2 && buildingStats.count < TOWN_SIGN_CONFIG.minBuildingCount)
                    continue;

                let center = cluster.center.clone();
                if (buildingStats.count >= TOWN_SIGN_CONFIG.minBuildingCount)
                    center.lerp(buildingStats.centroid, .35);

                const destinationSupport = destinationSupportByName.get(cluster.name) || 0;
                const radius = clamp(Math.max(
                    TOWN_SIGN_CONFIG.minPlaceRadius,
                    120 + pointSpread * 1.2,
                    110 + buildingStats.maxDistance,
                    125 + Math.sqrt(cluster.points.length + buildingStats.count) * 22
                ) + (cluster.strongCount > 0 ? 35 : 0) + Math.min(60, 10 * destinationSupport), TOWN_SIGN_CONFIG.minPlaceRadius, TOWN_SIGN_CONFIG.maxPlaceRadius);

                places.push({
                    name: cluster.name,
                    center,
                    radius,
                    strongCount: cluster.strongCount,
                    weakCount: cluster.weakCount,
                    destinationSupport,
                    buildingCount: buildingStats.count,
                    sourceNames: Array.from(new Set(cluster.sources.map(source => source.rawName || source.name)))
                });
            }

            for (const cluster of destinationClusters) {
                if (places.some(place => place.name === cluster.name && townDistance2D(place.center, cluster.center) <= Math.max(place.radius, 260)))
                    continue;
                const buildingStats = computeTownBuildingStats(cluster.center, worldData.buildings);
                if (cluster.points.length < 1 || buildingStats.count < 2 && cluster.points.length < 2)
                    continue;
                const pointSpread = cluster.points.reduce((maxDistance, point) => Math.max(maxDistance, townDistance2D(point, cluster.center)), 0);
                const center = cluster.center.clone();
                if (buildingStats.count > 0)
                    center.lerp(buildingStats.centroid, .4);
                const radius = clamp(Math.max(185, pointSpread + 160, buildingStats.maxDistance + 110, 90 + 35 * cluster.points.length), TOWN_SIGN_CONFIG.minPlaceRadius, TOWN_SIGN_CONFIG.maxPlaceRadius);
                places.push({
                    name: cluster.name,
                    center,
                    radius,
                    strongCount: 0,
                    weakCount: 0,
                    destinationSupport: cluster.points.length,
                    buildingCount: buildingStats.count,
                    sourceNames: [cluster.name]
                });
            }

            return mergeTownPlaces(places).sort(((a, b) => a.name.localeCompare(b.name)));
        }

        function findTownBoundaryEntry(points, place) {
            if (!points || points.length < 2)
                return null;
            let previous = points[0];
            let previousDelta = townDistance2D(previous, place.center) - place.radius;
            let hasOutside = previousDelta > 0;
            for (let index = 1; index < points.length; index++) {
                const current = points[index];
                const currentDelta = townDistance2D(current, place.center) - place.radius;
                hasOutside = hasOutside || currentDelta > 0;
                if (hasOutside && previousDelta > 0 && currentDelta <= 0) {
                    const direction = current.clone().sub(previous);
                    direction.y = 0;
                    if (direction.lengthSq() < 1e-6) {
                        previous = current;
                        previousDelta = currentDelta;
                        continue;
                    }
                    direction.normalize();
                    const denom = previousDelta - currentDelta;
                    const lerpFactor = denom <= 1e-6 ? 0 : clamp(previousDelta / denom, 0, 1);
                    const boundary = previous.clone().lerp(current, lerpFactor);
                    return {
                        boundary,
                        direction
                    };
                }
                previous = current;
                previousDelta = currentDelta;
            }
            return null;
        }

        function pushUniqueTownSign(signs, candidate) {
            for (const existing of signs)
                if (existing.placeName === candidate.placeName && townDistance2DSq(existing.position, candidate.position) <= TOWN_SIGN_CONFIG.signDedupDistance * TOWN_SIGN_CONFIG.signDedupDistance && existing.frontVec.dot(candidate.frontVec) > .85)
                    return;
            signs.push(candidate);
        }

        function getTownSignCountForPlace(signs, placeName) {
            return signs.reduce(((count, sign) => count + (sign.placeName === placeName ? 1 : 0)), 0);
        }

        function addTownRoadSignAt(signs, place, edge, anchor, direction) {
            if (!anchor || !direction || direction.lengthSq() < 1e-6)
                return !1;
            const travelDirection = direction.clone();
            travelDirection.y = 0;
            if (travelDirection.lengthSq() < 1e-6)
                return !1;
            travelDirection.normalize();
            const right = new globalState.THREE.Vector3(-travelDirection.z,0,travelDirection.x).normalize();
            const signAnchor = anchor.clone();
            const insideDistance = townDistance2D(signAnchor, place.center);
            if (insideDistance < place.radius)
                signAnchor.addScaledVector(travelDirection, -(place.radius - insideDistance + TOWN_SIGN_CONFIG.edgeEntryOffset * .45));
            const position = signAnchor.addScaledVector(right, getTownRoadLateralOffset(edge)).addScaledVector(travelDirection, -TOWN_SIGN_CONFIG.edgeEntryOffset);
            position.y = getTerrainYWorld(position, Number(position.y) || 0) + .08;
            const beforeCount = signs.length;
            pushUniqueTownSign(signs, {
                placeName: place.name,
                position,
                frontVec: travelDirection.clone().negate(),
                place
            });
            return signs.length > beforeCount;
        }

        function collectClosestRoadApproaches(place, roads) {
            const approaches = [];
            const maxDistance = Math.max(place.radius + 260, 560);
            for (const edge of roads) {
                if (!isRoadEligibleForTownSigns(edge))
                    continue;
                const worldPoints = getEdgeWorldPoints(edge);
                if (worldPoints.length < 2)
                    continue;
                for (let index = 0; index < worldPoints.length - 1; index++) {
                    const start = worldPoints[index];
                    const end = worldPoints[index + 1];
                    const direction = end.clone().sub(start);
                    direction.y = 0;
                    if (direction.lengthSq() < 1e-6)
                        continue;
                    const segment = distancePointToSegment2D(place.center, start, end);
                    if (segment.distance > maxDistance)
                        continue;
                    const anchor = start.clone().lerp(end, segment.progress);
                    const outwardPenalty = Math.max(0, place.radius - townDistance2D(anchor, place.center)) * .35;
                    approaches.push({
                        edge,
                        anchor,
                        direction: direction.normalize(),
                        score: segment.distance + outwardPenalty + Math.abs(segment.progress - .5) * 18
                    });
                }
            }
            approaches.sort(((a, b) => a.score - b.score));
            return approaches;
        }

        function addFallbackTownSigns(signs, places, roads) {
            for (const place of places) {
                let count = getTownSignCountForPlace(signs, place.name);
                if (count >= 2)
                    continue;
                const approaches = collectClosestRoadApproaches(place, roads);
                for (const approach of approaches) {
                    if (count >= 2)
                        break;
                    if (addTownRoadSignAt(signs, place, approach.edge, approach.anchor, approach.direction))
                        count += 1;
                    if (count >= 2)
                        break;
                    if (!approach.edge.oneway && Number(approach.edge.lanesBackward) !== 0 && addTownRoadSignAt(signs, place, approach.edge, approach.anchor, approach.direction.clone().negate()))
                        count += 1;
                }
            }
        }

        function computeTownSigns(places, roads) {
            const signs = [];
            for (const place of places)
                for (const edge of roads) {
                    if (!isRoadEligibleForTownSigns(edge))
                        continue;

                    const worldPoints = getEdgeWorldPoints(edge);
                    if (worldPoints.length < 2)
                        continue;

                    const forwardEntry = findTownBoundaryEntry(worldPoints, place);
                    if (forwardEntry) {
                        const right = new globalState.THREE.Vector3(-forwardEntry.direction.z,0,forwardEntry.direction.x).normalize();
                        const position = forwardEntry.boundary.clone().addScaledVector(right, getTownRoadLateralOffset(edge)).addScaledVector(forwardEntry.direction, -TOWN_SIGN_CONFIG.edgeEntryOffset);
                        const frontVec = forwardEntry.direction.clone().negate();
                        pushUniqueTownSign(signs, {
                            placeName: place.name,
                            position,
                            frontVec,
                            place
                        });
                    }

                    if (!edge.oneway && Number(edge.lanesBackward) !== 0) {
                        const backwardEntry = findTownBoundaryEntry(worldPoints.slice().reverse(), place);
                        if (backwardEntry) {
                            const right = new globalState.THREE.Vector3(-backwardEntry.direction.z,0,backwardEntry.direction.x).normalize();
                            const position = backwardEntry.boundary.clone().addScaledVector(right, getTownRoadLateralOffset(edge)).addScaledVector(backwardEntry.direction, -TOWN_SIGN_CONFIG.edgeEntryOffset);
                            const frontVec = backwardEntry.direction.clone().negate();
                            pushUniqueTownSign(signs, {
                                placeName: place.name,
                                position,
                                frontVec,
                                place
                            });
                        }
                    }
                }

            addFallbackTownSigns(signs, places, roads);

            const filtered = [];
            for (const sign of signs) {
                const duplicate = filtered.some(existing => existing.placeName === sign.placeName && townDistance2DSq(existing.position, sign.position) <= TOWN_SIGN_CONFIG.signNearbyDedupDistance * TOWN_SIGN_CONFIG.signNearbyDedupDistance && existing.frontVec.dot(sign.frontVec) > .4);
                duplicate || filtered.push(sign);
            }
            return filtered;
        }

        function clearTownOverlayChildren(group) {
            if (!group)
                return;
            while (group.children.length)
                group.remove(group.children[0]);
        }

        function createTownSignCanvas(name) {
            const safeName = normalizeTownLabel(name);
            const width = Math.max(640, Math.min(1600, 520 + 58 * safeName.length));
            const height = 256;
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx)
                return canvas;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.strokeStyle = "#1f4fbf";
            ctx.lineWidth = 22;
            ctx.strokeRect(20, 20, width - 40, height - 40);
            ctx.fillStyle = "#111111";
            ctx.font = "bold 106px Arial, Helvetica, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(safeName, width / 2, height / 2 + 2);
            return canvas;
        }

        function getTownSignAsset(name) {
            if (townSignsState.signAssetCache.has(name))
                return townSignsState.signAssetCache.get(name);

            const THREE = globalState.THREE;
            const canvas = createTownSignCanvas(name);
            const texture = new THREE.CanvasTexture(canvas);
            if ("SRGBColorSpace" in THREE)
                texture.colorSpace = THREE.SRGBColorSpace;
            else if ("sRGBEncoding" in THREE)
                texture.encoding = THREE.sRGBEncoding;
            texture.anisotropy = 4;
            texture.needsUpdate = !0;

            const plateWidth = clamp(2.6 + .14 * normalizeTownLabel(name).length, 2.9, 7.4);
            const plateHeight = 1.06;
            const plateDepth = .08;
            const geometry = new THREE.BoxGeometry(plateWidth, plateHeight, plateDepth);
            const edgeMaterial = new THREE.MeshBasicMaterial({
                color: 0x1f4fbf
            });
            const frontMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });
            const asset = {
                geometry,
                materials: [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, frontMaterial, frontMaterial],
                poleOffset: Math.max(.55, plateWidth * .28)
            };
            townSignsState.signAssetCache.set(name, asset);
            return asset;
        }

        function ensureTownPoleAssets() {
            const THREE = globalState.THREE;
            townSignsState.poleGeometry || (townSignsState.poleGeometry = new THREE.CylinderGeometry(.045, .045, 2.35, 10));
            townSignsState.poleMaterial || (townSignsState.poleMaterial = new THREE.MeshBasicMaterial({
                color: 0xb9bec7
            }));
        }

        function createTownSignObject(signSpec) {
            const THREE = globalState.THREE;
            const asset = getTownSignAsset(signSpec.placeName);
            ensureTownPoleAssets();
            const group = new THREE.Group;
            group.position.copy(signSpec.position);
            group.position.y = getTerrainYWorld(group.position, group.position.y || 0) + .02;
            group.rotation.y = Math.atan2(signSpec.frontVec.x, signSpec.frontVec.z);

            const plate = new THREE.Mesh(asset.geometry, asset.materials);
            plate.position.y = 2.45;
            group.add(plate);

            const leftPole = new THREE.Mesh(townSignsState.poleGeometry, townSignsState.poleMaterial);
            leftPole.position.set(-asset.poleOffset, 1.175, 0);
            group.add(leftPole);

            const rightPole = new THREE.Mesh(townSignsState.poleGeometry, townSignsState.poleMaterial);
            rightPole.position.set(asset.poleOffset, 1.175, 0);
            group.add(rightPole);

            return group;
        }

        function ensureTownOverlayGroup() {
            const scene = townSignsState.scene;
            if (!scene)
                return null;
            if (!townSignsState.overlayGroup) {
                townSignsState.overlayGroup = new globalState.THREE.Group;
                townSignsState.overlayGroup.name = "__tmTownSignsOverlay";
            }
            if (townSignsState.overlayAttachedTo !== scene) {
                townSignsState.overlayAttachedTo && townSignsState.overlayAttachedTo.remove(townSignsState.overlayGroup);
                scene.add(townSignsState.overlayGroup);
                townSignsState.overlayAttachedTo = scene;
            }
            return townSignsState.overlayGroup;
        }

        function rebuildTownSigns(reason) {
            void 0 === reason && (reason = "manual");
            townSignsState.rebuildQueued = !1;
            if (!featureState.townSigns) {
                clearTownSignsVisuals();
                return;
            }
            if (!townSignsState.chunkManager || !townSignsState.scene || !globalState.THREE || !townSignsState.roadModule)
                return;

            const overlay = ensureTownOverlayGroup();
            if (!overlay)
                return;

            try {
                const worldData = collectTownWorldData();
                const places = buildTownPlaces(worldData);
                const signs = computeTownSigns(places, worldData.roads);
                clearTownOverlayChildren(overlay);
                for (const sign of signs)
                    overlay.add(createTownSignObject(sign));

                townSignsState.signCount = signs.length;
                townSignsState.debugPlaces = places.map(place => ({
                    name: place.name,
                    center: {
                        x: Number(place.center.x.toFixed(2)),
                        y: Number(place.center.y.toFixed(2)),
                        z: Number(place.center.z.toFixed(2))
                    },
                    radius: Number(place.radius.toFixed(1)),
                    strongCount: place.strongCount,
                    weakCount: place.weakCount,
                    destinationSupport: place.destinationSupport,
                    buildingCount: place.buildingCount,
                    sourceNames: place.sourceNames
                }));
                townSignsState.debugSigns = signs.map(sign => ({
                    name: sign.placeName,
                    position: {
                        x: Number(sign.position.x.toFixed(2)),
                        y: Number(sign.position.y.toFixed(2)),
                        z: Number(sign.position.z.toFixed(2))
                    }
                }));
                townSignsState.debugWorldData = {
                    chunks: getLoadedChunks().length,
                    buildings: worldData.buildings.length,
                    namedStops: worldData.namedStops.length,
                    destinationCandidates: worldData.destinationCandidates.length,
                    placeCandidates: worldData.placeCandidates.length,
                    placeCacheChunks: townSignsState.placeCache.size,
                    placeRequests: townSignsState.placeRequestQueue.size,
                    roads: worldData.roads.length
                };

                globalThis.__tmTownSignsDebug = {
                    game: townSignsState.game,
                    chunkManager: townSignsState.chunkManager,
                    places: townSignsState.debugPlaces,
                    signs: townSignsState.debugSigns,
                    worldData: townSignsState.debugWorldData,
                    rebuild: rebuildTownSigns,
                    config: TOWN_SIGN_CONFIG
                };
                globalThis.__tmCollisionHookDebug && (globalThis.__tmCollisionHookDebug.townSigns = globalThis.__tmTownSignsDebug);
                log(`Ortsschilder neu aufgebaut (${reason}): ${signs.length} Schild(er), ${places.length} Ort(e).`);
            } catch (townError) {
                error("Fehler beim Neuaufbau der Ortsschilder:", townError);
            }
        }

        function queueTownRebuild(reason) {
            if (!featureState.townSigns) {
                clearTownSignsVisuals();
                return;
            }
            if (townSignsState.rebuildQueued)
                return;
            townSignsState.rebuildQueued = !0;
            setTimeout((() => rebuildTownSigns(reason)), 50);
        }

        function getLoadedChunks() {
            const state = getWorldCollisionState();
            const now = performance.now();
            if (Array.isArray(state.allLoadedChunks) && now - (Number(state.allLoadedChunksAt) || 0) < 240)
                return state.allLoadedChunks;
            const loaded = townSignsState.chunkManager && townSignsState.chunkManager.loadedChunks || {};
            if (isDeveloperToggleEnabled("perfLoadedChunkEnumeration")) {
                const chunks = [];
                for (const key in loaded)
                    Object.prototype.hasOwnProperty.call(loaded, key) && loaded[key] && chunks.push(loaded[key]);
                state.allLoadedChunks = chunks;
            } else
                state.allLoadedChunks = Object.values(loaded).filter(Boolean);
            state.allLoadedChunksAt = now;
            return state.allLoadedChunks;
        }

        function getWorldCollisionState() {
            runtimeState.worldCollisionState && "object" == typeof runtimeState.worldCollisionState || (runtimeState.worldCollisionState = {});
            runtimeState.worldCollisionState.chunkIds instanceof WeakMap || (runtimeState.worldCollisionState.chunkIds = new WeakMap);
            runtimeState.worldCollisionState.chunkStaticCaches instanceof WeakMap || (runtimeState.worldCollisionState.chunkStaticCaches = new WeakMap);
            runtimeState.worldCollisionState.queryCache instanceof Map || (runtimeState.worldCollisionState.queryCache = new Map);
            return runtimeState.worldCollisionState;
        }

        function invalidateWorldCollisionCache() {
            const state = getWorldCollisionState();
            state.loadedChunks = [];
            state.loadedChunksAt = 0;
            state.allLoadedChunks = [];
            state.allLoadedChunksAt = 0;
            state.staticCache = null;
            state.staticCacheSignature = "";
            state.staticCacheAt = 0;
            state.signatureChunks = null;
            state.signatureValue = "";
            state.signatureAt = 0;
            state.autopilotEdgeChunks = null;
            state.autopilotEdges = null;
            state.autopilotEdgesAt = 0;
            runtimeState.gasStationMissionTargets = null;
            runtimeState.gasStationMissionTargetsSignature = "";
            runtimeState.mainRoadMissionTargets = null;
            runtimeState.mainRoadMissionTargetsSignature = "";
            runtimeState.prepareNearChunkCache = null;
            state.queryCache instanceof Map && state.queryCache.clear();
            runtimeState.customBuildingCollisionQueryCache instanceof Map && runtimeState.customBuildingCollisionQueryCache.clear();
        }

        function invalidateWorldCollisionCacheForChunk(chunk) {
            const state = getWorldCollisionState();
            if (chunk && state.chunkStaticCaches instanceof WeakMap)
                state.chunkStaticCaches.delete(chunk);
            state.staticCache = null;
            state.staticCacheSignature = "";
            state.staticCacheAt = 0;
            state.signatureChunks = null;
            state.signatureValue = "";
            state.signatureAt = 0;
            state.autopilotEdgeChunks = null;
            state.autopilotEdges = null;
            state.autopilotEdgesAt = 0;
            runtimeState.gasStationMissionTargets = null;
            runtimeState.gasStationMissionTargetsSignature = "";
            runtimeState.mainRoadMissionTargets = null;
            runtimeState.mainRoadMissionTargetsSignature = "";
            runtimeState.prepareNearChunkCache = null;
            state.queryCache instanceof Map && state.queryCache.clear();
            runtimeState.customBuildingCollisionQueryCache instanceof Map && runtimeState.customBuildingCollisionQueryCache.clear();
        }

        function getWorldCollisionQueryCacheKey(kind, position, mode) {
            if (isDeveloperToggleEnabled("perfWorldQueryKey")) {
                const x = Math.round((Number(position && position.x) || 0) * 2) / 2;
                const z = Math.round((Number(position && position.z) || 0) * 2) / 2;
                return `${kind || "world"}:${mode || ""}:${x}:${z}`;
            }
            return [
                kind || "world",
                mode || "",
                Math.round((Number(position && position.x) || 0) * 2) / 2,
                Math.round((Number(position && position.z) || 0) * 2) / 2
            ].join(":");
        }

        function getCachedWorldCollisionQuery(kind, position, mode, producer) {
            if (!position || "function" != typeof producer)
                return producer ? producer() : null;
            if (!isDeveloperToggleEnabled("perfCollisionQueryCache"))
                return producer();
            const cache = runtimeState.customBuildingCollisionQueryCache instanceof Map ? runtimeState.customBuildingCollisionQueryCache : runtimeState.customBuildingCollisionQueryCache = new Map;
            const now = performance.now();
            const key = getWorldCollisionQueryCacheKey(kind, position, mode);
            const cached = cache.get(key);
            if (cached && now - cached.at < CUSTOM_BUILDING_PERF.collisionQueryCacheMs)
                return cached.value;
            const value = producer();
            return rememberLimitedCache(cache, key, {
                at: now,
                value
            }, CUSTOM_BUILDING_PERF.collisionQueryCacheSize).value;
        }

        function flushCustomBuildingCollisionInvalidations() {
            runtimeState.customBuildingCollisionInvalidationTimer = null;
            const queue = runtimeState.customBuildingCollisionInvalidationQueue.splice(0);
            runtimeState.customBuildingCollisionInvalidationSet = new WeakSet;
            for (const chunk of queue)
                chunk && invalidateWorldCollisionCacheForChunk(chunk);
        }

        function queueCustomBuildingCollisionInvalidation(chunk) {
            if (!chunk)
                return;
            if (!runtimeState.customBuildingCollisionInvalidationSet.has(chunk)) {
                runtimeState.customBuildingCollisionInvalidationSet.add(chunk);
                runtimeState.customBuildingCollisionInvalidationQueue.push(chunk);
            }
            if (!runtimeState.customBuildingCollisionInvalidationTimer)
                runtimeState.customBuildingCollisionInvalidationTimer = setTimeout(flushCustomBuildingCollisionInvalidations, 80);
        }

        function getWorldCollisionLoadedChunks() {
            const state = getWorldCollisionState();
            const now = performance.now();
            if (Array.isArray(state.loadedChunks) && now - (Number(state.loadedChunksAt) || 0) < 260)
                return state.loadedChunks;
            state.loadedChunks = getLoadedChunks();
            state.loadedChunksAt = now;
            return state.loadedChunks;
        }

        function seededUnit(seed, salt=0) {
            const base = Number(seed) || 0;
            const value = Math.sin(12.9898 * (base + 1) + 78.233 * (salt + 1)) * 43758.5453;
            return value - Math.floor(value);
        }

        function getDistance2D(a, b) {
            if (!a || !b)
                return 1 / 0;
            return Math.hypot((Number(a.x) || 0) - (Number(b.x) || 0), (Number(a.z) || 0) - (Number(b.z) || 0));
        }

        function getDistanceSq2D(a, b) {
            if (!a || !b)
                return 1 / 0;
            const dx = (Number(a.x) || 0) - (Number(b.x) || 0);
            const dz = (Number(a.z) || 0) - (Number(b.z) || 0);
            return dx * dx + dz * dz;
        }

        function cloneVector3(value) {
            if (!value)
                return null;
            return value.clone ? value.clone() : new globalState.THREE.Vector3(Number(value.x) || 0, Number(value.y) || 0, Number(value.z) || 0);
        }

        function chooseSpacedTargets(targets, count, minDistance, seed) {
            if (isDeveloperToggleEnabled("perfMissionSpacingSelection")) {
                const source = toSafeArray(targets);
                const chosen = [];
                const used = new Set;
                const wanted = Math.max(0, Number(count) || 0);
                for (let pick = 0; pick < wanted; pick++) {
                    let bestIndex = -1;
                    let bestScore = 1 / 0;
                    for (let index = 0; index < source.length; index++) {
                        if (used.has(index))
                            continue;
                        const candidate = source[index];
                        if (!candidate || !candidate.position)
                            continue;
                        let spaced = !0;
                        for (const existing of chosen)
                            if (getDistance2D(existing.position, candidate.position) < minDistance) {
                                spaced = !1;
                                break;
                            }
                        if (!spaced)
                            continue;
                        const score = seededUnit(seed, candidate.position.x + 17 * candidate.position.z);
                        if (score < bestScore) {
                            bestScore = score;
                            bestIndex = index;
                        }
                    }
                    if (bestIndex < 0)
                        break;
                    used.add(bestIndex);
                    chosen.push(source[bestIndex]);
                }
                if (chosen.length >= wanted)
                    return chosen;
                for (let pick = chosen.length; pick < wanted; pick++) {
                    let bestIndex = -1;
                    let bestScore = 1 / 0;
                    for (let index = 0; index < source.length; index++) {
                        if (used.has(index) || !source[index] || !source[index].position)
                            continue;
                        const score = seededUnit(seed, source[index].position.x + 17 * source[index].position.z);
                        if (score < bestScore) {
                            bestScore = score;
                            bestIndex = index;
                        }
                    }
                    if (bestIndex < 0)
                        break;
                    used.add(bestIndex);
                    chosen.push(source[bestIndex]);
                }
                return chosen;
            }
            const chosen = [];
            const pool = targets.slice().sort(((a, b) => seededUnit(seed, a.position.x + 17 * a.position.z) - seededUnit(seed, b.position.x + 17 * b.position.z)));
            for (const candidate of pool) {
                if (chosen.length >= count)
                    break;
                if (chosen.every(existing => getDistance2D(existing.position, candidate.position) >= minDistance))
                    chosen.push(candidate);
            }
            return chosen.length >= count ? chosen : pool.slice(0, count);
        }

        function formatMissionSeconds(seconds) {
            const safe = Math.max(0, Number(seconds) || 0);
            const mins = Math.floor(safe / 60);
            const secs = Math.floor(safe % 60);
            return `${mins}:${String(secs).padStart(2, "0")}`;
        }

        function collectTownMissionTargets() {
            if (isDeveloperToggleEnabled("perfMissionTargetCollection")) {
                const debugTargets = [];
                const debugPlaces = toSafeArray(townSignsState.debugPlaces);
                for (let index = 0; index < debugPlaces.length; index++) {
                    const place = debugPlaces[index];
                    if (!place || !place.name || !place.center)
                        continue;
                    debugTargets.push({
                        key: `town_${index}`,
                        label: place.name,
                        position: new globalState.THREE.Vector3(Number(place.center.x) || 0, Number(place.center.y) || 0, Number(place.center.z) || 0),
                        radius: clamp(Number(place.radius) || 55, 35, 90)
                    });
                }
                if (debugTargets.length)
                    return debugTargets;
                const cachedTargets = [];
                const seen = new Set;
                for (const places of townSignsState.placeCache instanceof Map ? townSignsState.placeCache.values() : [])
                    for (const place of toSafeArray(places)) {
                        if (!place || !place.position || !place.name)
                            continue;
                        const key = `${String(place.name).toLowerCase()}:${Math.round(place.position.x / 80)}:${Math.round(place.position.z / 80)}`;
                        if (seen.has(key))
                            continue;
                        seen.add(key);
                        cachedTargets.push({
                            key: `cached_${cachedTargets.length}`,
                            label: place.name,
                            position: cloneVector3(place.position),
                            radius: 70
                        });
                    }
                if (cachedTargets.length)
                    return cachedTargets;
                const clusters = [];
                for (const chunk of getLoadedChunks())
                    for (const building of toSafeArray(chunk && chunk.buildings)) {
                        const home = building && building.houseCenter;
                        if (!home)
                            continue;
                        let cluster = null;
                        for (const entry of clusters)
                            if (getDistance2D(entry.center, home) <= 420) {
                                cluster = entry;
                                break;
                            }
                        if (!cluster) {
                            cluster = {
                                center: home.clone(),
                                points: [],
                                sumX: 0,
                                sumY: 0,
                                sumZ: 0
                            };
                            clusters.push(cluster);
                        }
                        const point = home.clone();
                        cluster.points.push(point);
                        cluster.sumX += point.x;
                        cluster.sumY += point.y;
                        cluster.sumZ += point.z;
                        const count = cluster.points.length;
                        cluster.center.set(cluster.sumX / count, cluster.sumY / count, cluster.sumZ / count);
                    }
                const result = [];
                for (let index = 0; index < clusters.length; index++) {
                    const cluster = clusters[index];
                    let radius = 55;
                    for (const point of cluster.points)
                        radius = Math.max(radius, getDistance2D(cluster.center, point));
                    result.push({
                        key: `fallback_town_${index}`,
                        label: `Residential area ${index + 1}`,
                        position: cluster.center,
                        radius: clamp(radius + 40, 55, 120)
                    });
                }
                return result;
            }
            const debugTargets = toSafeArray(townSignsState.debugPlaces).map(((place, index) => ({
                key: `town_${index}`,
                label: place.name,
                position: new globalState.THREE.Vector3(Number(place.center.x) || 0, Number(place.center.y) || 0, Number(place.center.z) || 0),
                radius: clamp(Number(place.radius) || 55, 35, 90)
            }))).filter((target => target.label && target.position));
            if (debugTargets.length)
                return debugTargets;
            const cachedTargets = [];
            const seen = new Set;
            for (const places of townSignsState.placeCache instanceof Map ? townSignsState.placeCache.values() : [])
                for (const place of toSafeArray(places)) {
                    if (!place || !place.position || !place.name)
                        continue;
                    const key = `${String(place.name).toLowerCase()}:${Math.round(place.position.x / 80)}:${Math.round(place.position.z / 80)}`;
                    if (seen.has(key))
                        continue;
                    seen.add(key);
                    cachedTargets.push({
                        key: `cached_${cachedTargets.length}`,
                        label: place.name,
                        position: cloneVector3(place.position),
                        radius: 70
                    });
                }
            if (cachedTargets.length)
                return cachedTargets;
            const homes = [];
            for (const chunk of getLoadedChunks())
                for (const building of toSafeArray(chunk && chunk.buildings))
                    building && building.houseCenter && homes.push(building.houseCenter.clone());
            if (!homes.length)
                return [];
            const clusters = [];
            for (const home of homes) {
                let cluster = clusters.find(entry => getDistance2D(entry.center, home) <= 420);
                if (!cluster) {
                    cluster = {
                        center: home.clone(),
                        points: []
                    };
                    clusters.push(cluster);
                }
                cluster.points.push(home.clone());
                cluster.center = cluster.points.reduce(((acc, point) => acc.add(point)), new globalState.THREE.Vector3).multiplyScalar(1 / cluster.points.length);
            }
            return clusters.map(((cluster, index) => ({
                key: `fallback_town_${index}`,
                label: `Residential area ${index + 1}`,
                position: cluster.center,
                radius: clamp(cluster.points.reduce(((maxDistance, point) => Math.max(maxDistance, getDistance2D(cluster.center, point))), 55) + 40, 55, 120)
            })));
        }

        function collectResidentialMissionTargets(manager) {
            if (isDeveloperToggleEnabled("perfMissionTargetCollection")) {
                const targets = [];
                for (const building of toSafeArray(manager && manager.buildings))
                    building && building.houseCenter && targets.push({
                        key: `house_${building.index}`,
                        label: `House ${building.index}`,
                        position: building.houseCenter.clone(),
                        radius: 26,
                        building
                    });
                return targets;
            }
            return toSafeArray(manager && manager.buildings).filter((building => building && building.houseCenter)).map((building => ({
                key: `house_${building.index}`,
                label: `House ${building.index}`,
                position: building.houseCenter.clone(),
                radius: 26,
                building
            })));
        }

        function collectGasStationMissionTargets() {
            const chunks = getLoadedChunks();
            if (isDeveloperToggleEnabled("perfGasStationMissionCache")) {
                const signature = getWorldCollisionChunkSignature(chunks);
                if (Array.isArray(runtimeState.gasStationMissionTargets) && runtimeState.gasStationMissionTargetsSignature === signature)
                    return runtimeState.gasStationMissionTargets;
                const cachedTargets = [];
                for (const chunk of chunks)
                    for (const station of toSafeArray(chunk && chunk.gasStations)) {
                        const position = station && station.pumpPositions && station.pumpPositions[0] ? station.pumpPositions[0].clone() : station && station.origin ? station.origin.clone() : null;
                        position && cachedTargets.push({
                            key: `fuel_${cachedTargets.length}`,
                            label: "Fuel station",
                            position,
                            radius: 22
                        });
                    }
                runtimeState.gasStationMissionTargets = cachedTargets;
                runtimeState.gasStationMissionTargetsSignature = signature;
                return cachedTargets;
            }
            const targets = [];
            for (const chunk of chunks)
                for (const station of toSafeArray(chunk.gasStations)) {
                    const position = station && station.pumpPositions && station.pumpPositions[0] ? station.pumpPositions[0].clone() : station && station.origin ? station.origin.clone() : null;
                    position && targets.push({
                        key: `fuel_${targets.length}`,
                        label: "Fuel station",
                        position,
                        radius: 22
                    });
                }
            return targets;
        }

        function collectForestMissionTargets() {
            if (isDeveloperToggleEnabled("perfMissionTargetCollection")) {
                let best = null;
                for (const chunk of getLoadedChunks()) {
                    const coverage = chunk && chunk.terrain && typeof chunk.terrain.getForestCoverage === "function" ? Number(chunk.terrain.getForestCoverage()) || 0 : 0;
                    if (coverage < .22 || best && coverage <= best.coverage)
                        continue;
                    const position = chunk.centerVec ? chunk.centerVec.clone() : new globalState.THREE.Vector3(Number(chunk.cx) || 0, 0, Number(chunk.cz) || 0);
                    best = {
                        key: "forest_0",
                        label: "Forest 1",
                        position,
                        radius: 34,
                        coverage
                    };
                }
                return best ? [best] : [];
            }
            const targets = [];
            for (const chunk of getLoadedChunks()) {
                const coverage = chunk && chunk.terrain && typeof chunk.terrain.getForestCoverage === "function" ? Number(chunk.terrain.getForestCoverage()) || 0 : 0;
                if (coverage < .22)
                    continue;
                const position = chunk.centerVec ? chunk.centerVec.clone() : new globalState.THREE.Vector3(Number(chunk.cx) || 0, 0, Number(chunk.cz) || 0);
                targets.push({
                    key: `forest_${targets.length}`,
                    label: `Forest ${targets.length + 1}`,
                    position,
                    radius: 34,
                    coverage
                });
            }
            return targets.sort(((a, b) => b.coverage - a.coverage));
        }

        function collectMainRoadMissionTargets() {
            const points = [];
            if (!townSignsState.roadModule)
                return points;
            const chunks = getLoadedChunks();
            if (isDeveloperToggleEnabled("perfMainRoadMissionCache")) {
                const signature = `${getWorldCollisionChunkSignature(chunks)}:${townSignsState.roadModule.ROAD_TYPE_PRIMARY}:${townSignsState.roadModule.ROAD_TYPE_MOTORWAY}:${townSignsState.roadModule.ROAD_TYPE_MERGING_LANE}`;
                if (Array.isArray(runtimeState.mainRoadMissionTargets) && runtimeState.mainRoadMissionTargetsSignature === signature)
                    return runtimeState.mainRoadMissionTargets;
                for (const chunk of chunks)
                    for (const edge of toSafeArray(chunk && chunk.newRoadGraph && chunk.newRoadGraph.edges)) {
                        if (!edge || !isRoadEligibleForTownHints(edge))
                            continue;
                        if (edge.type !== townSignsState.roadModule.ROAD_TYPE_PRIMARY && edge.type !== townSignsState.roadModule.ROAD_TYPE_MOTORWAY && edge.type !== townSignsState.roadModule.ROAD_TYPE_MERGING_LANE)
                            continue;
                        const worldPoints = getEdgeWorldPoints(edge);
                        if (!worldPoints.length)
                            continue;
                        const midPoint = worldPoints[Math.floor(worldPoints.length / 2)].clone();
                        points.push({
                            key: `road_${points.length}`,
                            label: "Main road checkpoint",
                            position: midPoint,
                            radius: 28
                        });
                    }
                runtimeState.mainRoadMissionTargets = points;
                runtimeState.mainRoadMissionTargetsSignature = signature;
                return points;
            }
            for (const chunk of chunks)
                for (const edge of toSafeArray(chunk.newRoadGraph && chunk.newRoadGraph.edges)) {
                    if (!edge || !isRoadEligibleForTownHints(edge))
                        continue;
                    if (edge.type !== townSignsState.roadModule.ROAD_TYPE_PRIMARY && edge.type !== townSignsState.roadModule.ROAD_TYPE_MOTORWAY && edge.type !== townSignsState.roadModule.ROAD_TYPE_MERGING_LANE)
                        continue;
                    const worldPoints = getEdgeWorldPoints(edge);
                    if (!worldPoints.length)
                        continue;
                    const midPoint = worldPoints[Math.floor(worldPoints.length / 2)].clone();
                    points.push({
                        key: `road_${points.length}`,
                        label: "Main road checkpoint",
                        position: midPoint,
                        radius: 28
                    });
                }
            return points;
        }

        function chooseFindPlaceTarget(towns, playerPos, type) {
            const ranges = {
                tmFindNearbyEasy: [250, 1300],
                tmFindNearbyMedium: [1200, 3200],
                tmFindNearbyHard: [3000, 12000]
            };
            const [minDistance,maxDistance] = ranges[type] || ranges.tmFindNearbyEasy;
            if (isDeveloperToggleEnabled("perfMissionTargetSelection")) {
                const ranged = [];
                let fallback = null;
                let fallbackDistance = "tmFindNearbyHard" === type ? -1 : 1 / 0;
                for (const target of toSafeArray(towns)) {
                    if (!target || !target.position)
                        continue;
                    const distance = getDistance2D(playerPos, target.position);
                    if (distance >= minDistance && distance <= maxDistance)
                        ranged.push(Object.assign({}, target, {
                            distance
                        }));
                    if ("tmFindNearbyHard" === type ? distance > fallbackDistance : distance < fallbackDistance) {
                        fallbackDistance = distance;
                        fallback = Object.assign({}, target, {
                            distance
                        });
                    }
                }
                if (ranged.length) {
                    ranged.sort((a, b) => a.distance - b.distance);
                    return ranged[Math.floor(seededUnit(playerPos.x + playerPos.z, ranged.length) * ranged.length)] || ranged[0];
                }
                return fallback;
            }
            const scored = towns.map(target => Object.assign({}, target, {
                distance: getDistance2D(playerPos, target.position)
            })).filter(target => target.distance >= minDistance && target.distance <= maxDistance).sort(((a, b) => a.distance - b.distance));
            if (scored.length)
                return scored[Math.floor(seededUnit(playerPos.x + playerPos.z, scored.length) * scored.length)] || scored[0];
            return towns.map(target => Object.assign({}, target, {
                distance: getDistance2D(playerPos, target.position)
            })).sort(((a, b) => "tmFindNearbyHard" === type ? b.distance - a.distance : a.distance - b.distance))[0];
        }

        function buildCustomMissionStages(type, manager, player) {
            const playerPos = player && typeof player.getPosition === "function" ? player.getPosition().clone() : new globalState.THREE.Vector3;
            const towns = collectTownMissionTargets();
            const homes = collectResidentialMissionTargets(manager);
            const fuelStations = collectGasStationMissionTargets();
            const forests = collectForestMissionTargets();
            const mainRoads = collectMainRoadMissionTargets();
            if (type && type.startsWith("tmFindNearby")) {
                const target = chooseFindPlaceTarget(towns, playerPos, type);
                return target ? [{
                    label: target.label,
                    position: target.position,
                    radius: Math.max(65, target.radius),
                    noMap: !0,
                    markerColor: "#ffe26a",
                    status: `Find ${target.label}`,
                    description: `Map disabled. Navigate to ${target.label} without ESC/Shift map help.`
            }] : [];
            }
            if ("tmPassengerFlight" === type) {
                if (isDeveloperToggleEnabled("perfMissionTargetSelection")) {
                    let start = null;
                    let startDistance = 1 / 0;
                    const airportsRaw = getAirportEntries();
                    for (let index = 0; index < airportsRaw.length; index++) {
                        const airport = airportsRaw[index];
                        if (!airport || !airport.center)
                            continue;
                        const target = {
                            key: `airport_${index}`,
                            label: `Airport ${index + 1}`,
                            position: airport.center.clone(),
                            radius: Math.max(90, airport.width + 60),
                            airport
                        };
                        const distance = getDistance2D(playerPos, target.position);
                        if (distance < startDistance) {
                            startDistance = distance;
                            start = target;
                        }
                    }
                    let destination = null;
                    let destinationDistance = 1 / 0;
                    for (let index = 0; index < airportsRaw.length; index++) {
                        const airport = airportsRaw[index];
                        if (!airport || !airport.center || !start || getDistance2D(start.position, airport.center) <= 1200)
                            continue;
                        const distance = getDistance2D(playerPos, airport.center);
                        if (distance < destinationDistance) {
                            destinationDistance = distance;
                            destination = {
                                key: `airport_${index}`,
                                label: `Airport ${index + 1}`,
                                position: airport.center.clone(),
                                radius: Math.max(90, airport.width + 60),
                                airport
                            };
                        }
                    }
                    const stages = [];
                    start && stages.push({
                        label: "Passenger pickup",
                        position: start.position,
                        radius: start.radius,
                        markerColor: "#64d6ff",
                        status: "Board passengers at the airport",
                        description: "Use a passenger aircraft and depart from the runway."
                    });
                    destination && stages.push({
                        label: "Passenger destination",
                        position: destination.position,
                        radius: destination.radius,
                        markerColor: "#ffcb62",
                        status: "Land at the destination airport",
                        description: "Passenger jobs only count between airport runways."
                    });
                    return stages;
                }
                const airports = getAirportEntries().map((airport, index) => ({
                    key: `airport_${index}`,
                    label: `Airport ${index + 1}`,
                    position: airport.center.clone(),
                    radius: Math.max(90, airport.width + 60),
                    airport
                })).sort(((a, b) => getDistance2D(playerPos, a.position) - getDistance2D(playerPos, b.position)));
                const start = airports[0];
                const destination = airports.find(target => start && getDistance2D(start.position, target.position) > 1200);
                return [start && {
                    label: "Passenger pickup",
                    position: start.position,
                    radius: start.radius,
                    markerColor: "#64d6ff",
                    status: "Board passengers at the airport",
                    description: "Use a passenger aircraft and depart from the runway."
                }, destination && {
                    label: "Passenger destination",
                    position: destination.position,
                    radius: destination.radius,
                    markerColor: "#ffcb62",
                    status: "Land at the destination airport",
                    description: "Passenger jobs only count between airport runways."
                }].filter(Boolean);
            }
            if ("tmTownHop" === type) {
                const chosen = chooseSpacedTargets(towns, Math.min(3, towns.length), 500, playerPos.x + playerPos.z);
                return chosen.map(((target, index) => ({
                    label: target.label,
                    position: target.position,
                    radius: target.radius,
                    markerColor: 0 === index ? "#ffbf40" : "#f26f3d",
                    status: `Reach ${target.label}`,
                    description: `Drive through ${target.label} and continue to the next town.`
                })));
            }
            if ("tmResidentialDash" === type) {
                if (isDeveloperToggleEnabled("perfMissionTargetSelection")) {
                    let first = null;
                    let firstDistance = 1 / 0;
                    for (const target of homes) {
                        const distance = getDistance2D(playerPos, target.position);
                        if (distance < firstDistance) {
                            firstDistance = distance;
                            first = target;
                        }
                    }
                    let second = null;
                    let secondDistance = 1 / 0;
                    let third = null;
                    let thirdDistance = 1 / 0;
                    for (const target of homes) {
                        const playerDistance = getDistance2D(playerPos, target.position);
                        if (first && getDistance2D(first.position, target.position) > 500 && playerDistance < secondDistance) {
                            secondDistance = playerDistance;
                            second = target;
                        }
                    }
                    for (const target of homes)
                        if (second && target !== first && getDistance2D(second.position, target.position) > 350) {
                            const playerDistance = getDistance2D(playerPos, target.position);
                            if (playerDistance < thirdDistance) {
                                thirdDistance = playerDistance;
                                third = target;
                            }
                        }
                    return [first, second, third].filter(Boolean).map((target => ({
                        label: target.label,
                        position: target.position,
                        radius: target.radius,
                        markerColor: "#69d2ff",
                        status: `Residential stop: ${target.label}`,
                        description: "Sprint between residential stops without wrecking the car."
                    })));
                }
                const sorted = homes.sort(((a, b) => getDistance2D(playerPos, a.position) - getDistance2D(playerPos, b.position)));
                const first = sorted[0];
                const second = sorted.find((target => getDistance2D(first && first.position, target.position) > 500));
                const third = sorted.find((target => second && getDistance2D(second.position, target.position) > 350 && target !== first));
                return [first, second, third].filter(Boolean).map((target => ({
                    label: target.label,
                    position: target.position,
                    radius: target.radius,
                    markerColor: "#69d2ff",
                    status: `Residential stop: ${target.label}`,
                    description: "Sprint between residential stops without wrecking the car."
                })));
            }
            if ("tmFuelRun" === type) {
                if (isDeveloperToggleEnabled("perfMissionTargetSelection")) {
                    let nearestFuel = null;
                    let nearestFuelDistance = 1 / 0;
                    for (const target of fuelStations) {
                        const distance = getDistance2D(playerPos, target.position);
                        if (distance < nearestFuelDistance) {
                            nearestFuelDistance = distance;
                            nearestFuel = target;
                        }
                    }
                    let deliveryHome = null;
                    let deliveryDistance = 1 / 0;
                    for (const target of homes) {
                        if (nearestFuel && getDistance2D(nearestFuel.position, target.position) <= 250)
                            continue;
                        const distance = nearestFuel ? getDistance2D(nearestFuel.position, target.position) : 0;
                        if (distance < deliveryDistance) {
                            deliveryDistance = distance;
                            deliveryHome = target;
                        }
                    }
                    return [nearestFuel && {
                        label: nearestFuel.label,
                        position: nearestFuel.position,
                        radius: nearestFuel.radius,
                        markerColor: "#63f08d",
                        status: "Reach the fuel station",
                        description: "Drive to the station first, then bring the car back into town."
                    }, deliveryHome && {
                        label: deliveryHome.label,
                        position: deliveryHome.position,
                        radius: deliveryHome.radius,
                        markerColor: "#40b8ff",
                        status: `Return to ${deliveryHome.label}`,
                        description: "Finish the run at a residential destination."
                    }].filter(Boolean);
                }
                const nearestFuel = fuelStations.sort(((a, b) => getDistance2D(playerPos, a.position) - getDistance2D(playerPos, b.position)))[0];
                const deliveryHome = homes.sort(((a, b) => nearestFuel ? getDistance2D(nearestFuel.position, a.position) - getDistance2D(nearestFuel.position, b.position) : 0)).find((target => !nearestFuel || getDistance2D(nearestFuel.position, target.position) > 250));
                return [nearestFuel && {
                    label: nearestFuel.label,
                    position: nearestFuel.position,
                    radius: nearestFuel.radius,
                    markerColor: "#63f08d",
                    status: "Reach the fuel station",
                    description: "Drive to the station first, then bring the car back into town."
                }, deliveryHome && {
                    label: deliveryHome.label,
                    position: deliveryHome.position,
                    radius: deliveryHome.radius,
                    markerColor: "#40b8ff",
                    status: `Return to ${deliveryHome.label}`,
                    description: "Finish the run at a residential destination."
                }].filter(Boolean);
            }
            if ("tmForestPatrol" === type) {
                const forest = forests[0];
                if (isDeveloperToggleEnabled("perfMissionTargetSelection")) {
                    let town = null;
                    let townDistance = 1 / 0;
                    for (const target of towns) {
                        if (forest && getDistance2D(forest.position, target.position) <= 500)
                            continue;
                        const distance = forest ? getDistance2D(forest.position, target.position) : 0;
                        if (distance < townDistance) {
                            townDistance = distance;
                            town = target;
                        }
                    }
                    return [forest && {
                        label: forest.label,
                        position: forest.position,
                        radius: forest.radius,
                        markerColor: "#7ee35b",
                        status: "Reach the forest edge",
                        description: "Head out of town and reach the greener part of the map."
                    }, town && {
                        label: town.label,
                        position: town.position,
                        radius: town.radius,
                        markerColor: "#ffc46b",
                        status: `Return to ${town.label}`,
                        description: "Turn back and finish inside a nearby settlement."
                    }].filter(Boolean);
                }
                const town = towns.sort(((a, b) => forest ? getDistance2D(forest.position, a.position) - getDistance2D(forest.position, b.position) : 0)).find((target => !forest || getDistance2D(forest.position, target.position) > 500));
                return [forest && {
                    label: forest.label,
                    position: forest.position,
                    radius: forest.radius,
                    markerColor: "#7ee35b",
                    status: "Reach the forest edge",
                    description: "Head out of town and reach the greener part of the map."
                }, town && {
                    label: town.label,
                    position: town.position,
                    radius: town.radius,
                    markerColor: "#ffc46b",
                    status: `Return to ${town.label}`,
                    description: "Turn back and finish inside a nearby settlement."
                }].filter(Boolean);
            }
            if ("tmRingRoadRun" === type) {
                const chosen = chooseSpacedTargets(mainRoads, Math.min(2, mainRoads.length), 600, playerPos.x - playerPos.z);
                return chosen.map(((target, index) => ({
                    label: `${target.label} ${index + 1}`,
                    position: target.position,
                    radius: target.radius,
                    markerColor: 0 === index ? "#c389ff" : "#ff6fa7",
                    status: `Reach ${target.label.toLowerCase()} ${index + 1}`,
                    description: "Use the bigger roads and connect the checkpoints cleanly."
                })));
            }
            return [];
        }

        function syncCustomMissionOptions(panel) {
            if (!panel || !panel.missionTypes)
                return;
            for (const task of CUSTOM_TASK_OPTIONS) {
                const existingOption = panel.missionTypes.querySelector(`option[value="${task.value}"]`);
                if (featureState.customMissions && !existingOption) {
                    const newOption = document.createElement("option");
                    newOption.value = task.value;
                    newOption.textContent = task.label;
                    panel.missionTypes.appendChild(newOption);
                } else if (!featureState.customMissions && existingOption) {
                    if (panel.missionTypes.value === task.value)
                        panel.missionTypes.selectedIndex = 0;
                    existingOption.remove();
                }
            }
        }

        function ensureCustomMissionOptions(panel) {
            if (!panel || !panel.missionTypes)
                return;
            syncCustomMissionOptions(panel);
            runtimeState.missionPanelsPatched.add(panel);
        }

        function syncRuntimeCustomMissionOptions() {
            const panel = runtimeState.game && runtimeState.game.missionManager && runtimeState.game.missionManager.missionPanel;
            panel && ensureCustomMissionOptions(panel);
        }

        class RuntimeRouteMission {
            constructor(manager, type) {
                this.missionManager = manager;
                this.type = type;
                this.__tmNoMapMission = !!(type && type.startsWith("tmFindNearby"));
                this.markerIndex = -1;
                this.stageIndex = 0;
                this.stages = [];
                this.startedAt = 0;
                this.startDistance = 0;
                this.initialized = !1;
                this.failed = !1;
                this.completed = !1;
            }

            cancelMission() {
                this.removeMarker();
                this.__tmNoMapMission = !1;
                this.missionManager.missionPanel.turnOffCompass();
                this.missionManager.missionPanel.updateEntry1("");
                this.missionManager.missionPanel.updateEntry2("");
                this.missionManager.missionPanel.updateEntry3("");
                this.missionManager.missionPanel.updateEntry4("");
            }

            resetMission() {
                this.removeMarker();
                this.stageIndex = 0;
                this.stages = [];
                this.initialized = !1;
                this.failed = !1;
                this.completed = !1;
            }

            removeMarker() {
                if (this.markerIndex >= 0) {
                    this.missionManager.removeMarker(this.markerIndex);
                    this.markerIndex = -1;
                }
            }

            ensureInitialized(currentTime, player) {
                if (this.initialized || this.failed)
                    return;
                this.startedAt = Number(currentTime) || 0;
                this.startDistance = Number(player && player.millage) || 0;
                this.stages = buildCustomMissionStages(this.type, this.missionManager, player);
                if (!this.stages.length) {
                    this.failed = !0;
                    this.missionManager.missionPanel.showNavigation();
                    this.missionManager.missionPanel.updateStatus("No place targets loaded nearby");
                    this.missionManager.missionPanel.updateMissionDescriptiopn("Load more nearby roads or houses, then start the task again.");
                    this.missionManager.missionPanel.turnOffCompass();
                    return;
                }
                this.initialized = !0;
                this.setStage(0);
            }

            setStage(index) {
                const stage = this.stages[index];
                if (!stage)
                    return;
                this.stageIndex = index;
                this.removeMarker();
                if (!stage.noMap)
                    this.markerIndex = this.missionManager.addMarker(stage.markerColor || "#40ff90", stage.position, stage.label);
                this.missionManager.missionPanel.showNavigation();
                this.missionManager.missionPanel.updateStatus(stage.status || stage.label);
                this.missionManager.missionPanel.updateMissionDescriptiopn(stage.description || stage.label);
                stage.noMap && this.missionManager.missionPanel.turnOffCompass();
            }

            finish(currentTime, player) {
                this.completed = !0;
                this.__tmNoMapMission = !1;
                this.removeMarker();
                const elapsed = Math.max(0, (Number(currentTime) || 0) - this.startedAt);
                const distance = Math.max(0, (Number(player && player.millage) || this.startDistance) - this.startDistance);
                const reward = this.type && this.type.startsWith("tmFindNearby") ? 90 : "tmPassengerFlight" === this.type ? 260 : 120;
                receivePlayerMoney(reward);
                this.missionManager.missionPanel.updateStatus("Task complete");
                this.missionManager.missionPanel.updateMissionDescriptiopn(this.type && this.type.startsWith("tmFindNearby") ? "You found the selected place without map help." : "Open the T menu for another custom route or stop this one.");
                this.missionManager.missionPanel.turnOffCompass();
                this.missionManager.missionPanel.updateEntry1(`${this.stages.length}/${this.stages.length} checkpoints`);
                this.missionManager.missionPanel.updateEntry2(`Reward: +${reward} EUR`);
                this.missionManager.missionPanel.updateEntry3(`Dist: ${(distance / 1e3).toFixed(1)} km`);
                this.missionManager.missionPanel.updateEntry4(`Time: ${formatMissionSeconds(elapsed)}`);
                syncFeatureMenu();
            }

            update(dtSeconds, currentTime, inputState, player) {
                if (!player || this.completed || !isInternalModuleEnabled("customMissionRuntime"))
                    return;
                try {
                    this.ensureInitialized(currentTime, player);
                    if (!this.initialized)
                        return;
                    const stage = this.stages[this.stageIndex];
                    if (!stage)
                        return void this.finish(currentTime, player);
                    const playerPos = player.getPosition();
                    if (stage.noMap)
                        this.missionManager.missionPanel.turnOffCompass();
                    else
                        this.missionManager.missionPanel.updateCompass(playerPos, player.getHeadings(), stage.position);
                    this.missionManager.missionPanel.updateEntry1(`${this.stageIndex + 1}/${this.stages.length} checkpoints`);
                    this.missionManager.missionPanel.updateEntry2(stage.label);
                    this.missionManager.missionPanel.updateEntry3(stage.noMap ? "" : `ETA: ${Math.max(0, getDistance2D(playerPos, stage.position)).toFixed(0)} m`);
                    this.missionManager.missionPanel.updateEntry4(`Time: ${formatMissionSeconds((Number(currentTime) || 0) - this.startedAt)}`);
                    if (getDistance2D(playerPos, stage.position) <= (Number(stage.radius) || 24))
                        if (this.stageIndex >= this.stages.length - 1)
                            this.finish(currentTime, player);
                        else
                            this.setStage(this.stageIndex + 1);
                } catch (missionError) {
                    this.failed = !0;
                    this.cancelMission();
                    markInternalModuleFault("customMissionRuntime", missionError, "Custom mission update");
                }
            }
        }

        function patchMissionManagerRuntime(missionManager) {
            if (!missionManager || missionManager.__tmCustomMissionPatched)
                return;
            ensureCustomMissionOptions(missionManager.missionPanel);
            const originalCreateMission = missionManager.createMission;
            missionManager.createMission = function(type) {
                if (featureState.customMissions && CUSTOM_TASK_OPTIONS.some((task => task.value === type))) {
                    this.cancelCurrentMission();
                    this.currentMission = new RuntimeRouteMission(this, type);
                    return;
                }
                return originalCreateMission.apply(this, arguments);
            };
            missionManager.__tmCustomMissionPatched = !0;
        }

        function sanitizePositiveNumber(value, fallback, min, max) {
            const parsed = Number(value);
            if (!Number.isFinite(parsed))
                return fallback;
            return clamp(parsed, null != min ? min : 0, null != max ? max : parsed);
        }

        function getVehicleTuningMaxSpeedMs() {
            return sanitizePositiveNumber(vehicleTuningState.maxSpeedKmh, 999, .1) / 3.6;
        }

        function getVehicleTuningAccelerationLimit() {
            return sanitizePositiveNumber(vehicleTuningState.accelerationPerSecond, 50, .01);
        }

        function syncVehicleTuningPanel() {
            const panel = vehicleTuningState.panel;
            if (!panel)
                return;
            const maxSpeedInput = panel.querySelector('[data-role="maxSpeed"]');
            const accelerationInput = panel.querySelector('[data-role="acceleration"]');
            const status = panel.querySelector('[data-role="speedhackStatus"]');
            maxSpeedInput && (maxSpeedInput.value = String(sanitizePositiveNumber(vehicleTuningState.maxSpeedKmh, 999, .1)));
            accelerationInput && (accelerationInput.value = String(sanitizePositiveNumber(vehicleTuningState.accelerationPerSecond, 50, .01)));
            status && (status.textContent = featureState.vehicleTuning ? `Speedhack: ${vehicleTuningState.active ? "On" : "Off"}` : "Vehicle tuning: Off");
        }

        function commitVehicleTuningPanel() {
            const panel = vehicleTuningState.panel;
            if (!panel)
                return;
            const maxSpeedInput = panel.querySelector('[data-role="maxSpeed"]');
            const accelerationInput = panel.querySelector('[data-role="acceleration"]');
            vehicleTuningState.maxSpeedKmh = sanitizePositiveNumber(maxSpeedInput && maxSpeedInput.value, vehicleTuningState.maxSpeedKmh, .1);
            vehicleTuningState.accelerationPerSecond = sanitizePositiveNumber(accelerationInput && accelerationInput.value, vehicleTuningState.accelerationPerSecond, .01);
            syncVehicleTuningPanel();
        }

        function ensureVehicleTuningPanel() {
            if (vehicleTuningState.panel && vehicleTuningState.panel.isConnected)
                return vehicleTuningState.panel;
            if (!document.body)
                return null;
            const panel = document.createElement("div");
            panel.id = "__tmVehicleTuningPanel";
            panel.style.cssText = "position:fixed;top:72px;right:16px;z-index:999999;background:rgba(18,24,31,.92);color:#f1eee7;border:1px solid rgba(255,255,255,.16);border-radius:12px;box-shadow:0 14px 36px rgba(0,0,0,.32);padding:14px 14px 12px;width:264px;font:600 13px/1.35 Arial,Helvetica,sans-serif;backdrop-filter:blur(10px);display:none;";
            panel.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <div style="font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#d8d0c4;">Vehicle Tuning</div>
                    <button type="button" data-role="close" style="border:0;background:transparent;color:#d8d0c4;font:inherit;cursor:pointer;padding:0 2px;">x</button>
                </div>
                <div data-role="speedhackStatus" style="margin-bottom:10px;color:#8fd6ff;">Speedhack: Off</div>
                <label style="display:block;margin-bottom:10px;">
                    <div style="margin-bottom:4px;color:#d8d0c4;">Max speed (km/h)</div>
                    <input data-role="maxSpeed" type="number" min="0.1" step="1" style="width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:#fff8eb;border-radius:9px;padding:9px 10px;font:inherit;outline:none;">
                </label>
                <label style="display:block;margin-bottom:12px;">
                    <div style="margin-bottom:4px;color:#d8d0c4;">Acceleration (m/s²)</div>
                    <input data-role="acceleration" type="number" min="0.01" step="0.5" style="width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:#fff8eb;border-radius:9px;padding:9px 10px;font:inherit;outline:none;">
                </label>
                <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button type="button" data-role="reset" style="border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:#f1eee7;border-radius:9px;padding:8px 10px;font:inherit;cursor:pointer;">Reset</button>
                    <button type="button" data-role="apply" style="border:1px solid rgba(255,255,255,.08);background:#d7e2f2;color:#12202d;border-radius:9px;padding:8px 12px;font:inherit;cursor:pointer;">Apply</button>
                </div>
            `;
            panel.addEventListener("keydown", (event => event.stopPropagation()));
            panel.querySelector('[data-role="close"]').addEventListener("click", (() => toggleVehicleTuningPanel(!1)));
            panel.querySelector('[data-role="apply"]').addEventListener("click", commitVehicleTuningPanel);
            panel.querySelector('[data-role="reset"]').addEventListener("click", (() => {
                vehicleTuningState.maxSpeedKmh = 999;
                vehicleTuningState.accelerationPerSecond = 50;
                syncVehicleTuningPanel();
            }));
            for (const input of panel.querySelectorAll("input"))
                input.addEventListener("change", commitVehicleTuningPanel);
            document.body.appendChild(panel);
            vehicleTuningState.panel = panel;
            syncVehicleTuningPanel();
            return panel;
        }

        function toggleVehicleTuningPanel(forceVisible) {
            if (!featureState.vehicleTuning) {
                vehicleTuningState.active = !1;
                notifyRuntime("Vehicle tuning ist in den Extension-Einstellungen aus.", "error");
                return;
            }
            const panel = ensureVehicleTuningPanel();
            if (!panel)
                return;
            vehicleTuningState.visible = null == forceVisible ? !vehicleTuningState.visible : !!forceVisible;
            panel.style.display = vehicleTuningState.visible ? "block" : "none";
            if (vehicleTuningState.visible) {
                syncVehicleTuningPanel();
                const firstInput = panel.querySelector("input");
                firstInput && firstInput.focus();
            }
        }

        function toggleSpeedhack(forceActive) {
            if (!featureState.vehicleTuning) {
                vehicleTuningState.active = !1;
                syncVehicleTuningPanel();
                notifyRuntime("Vehicle tuning ist in den Extension-Einstellungen aus.", "error");
                return;
            }
            vehicleTuningState.active = null == forceActive ? !vehicleTuningState.active : !!forceActive;
            syncVehicleTuningPanel();
            notifyRuntime(`Speedhack ${vehicleTuningState.active ? "an" : "aus"}`);
        }

        function ensureVehicleTuningHotkey() {
            if (vehicleTuningState.installed)
                return;
            vehicleTuningState.installed = !0;
            document.addEventListener("keydown", (event => {
                if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey)
                    return;
                const target = event.target;
                if (target && ("INPUT" === target.tagName || "TEXTAREA" === target.tagName || "SELECT" === target.tagName || target.isContentEditable))
                    return;
                if ("k" === String(event.key || "").toLowerCase()) {
                    if (!featureState.vehicleTuning)
                        return;
                    event.preventDefault();
                    if (event.shiftKey)
                        toggleVehicleTuningPanel();
                    else
                        toggleSpeedhack();
                }
            }
            ));
        }

        function isTypingTarget(target) {
            return !!target && ("INPUT" === target.tagName || "TEXTAREA" === target.tagName || "SELECT" === target.tagName || target.isContentEditable);
        }

        function isNoMapMissionActive() {
            const mission = runtimeState.game && runtimeState.game.missionManager && runtimeState.game.missionManager.currentMission;
            return !!(mission && mission.__tmNoMapMission && !mission.completed && !mission.failed);
        }

        function ensureRuntimeInputHandlers() {
            if (runtimeState.controlsPatched)
                return;
            runtimeState.controlsPatched = !0;
            ensureDeveloperMenuHotkey();
            document.addEventListener("keydown", (event => {
                if (isTypingTarget(event.target))
                    return;
                const code = event.code || "";
                if (isNoMapMissionActive() && ("Escape" === code || "ShiftLeft" === code || "ShiftRight" === code || "Shift" === event.key)) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                if (event.repeat && "KeyE" !== code)
                    return;
                if ("KeyU" === code)
                    runtimeState.input.slowLeft = !0;
                else if ("KeyO" === code)
                    runtimeState.input.slowRight = !0;
                else if ("KeyJ" === code)
                    runtimeState.input.fastLeft = !0;
                else if ("KeyL" === code)
                    runtimeState.input.fastRight = !0;
                else if ("KeyP" === code) {
                    runtimeState.autopilot && runtimeState.autopilot.enabled && stopAutopilot("manuelle Bremse", !0);
                    runtimeState.input.fullBrake = !0;
                    event.preventDefault();
                    event.stopPropagation();
                }
                else if ("KeyE" === code) {
                    runtimeState.input.fire = !0;
                    interactRuntime();
                } else if ("KeyM" === code) {
                    event.preventDefault();
                    event.stopPropagation();
                    handleAutopilotMapHotkey();
                } else if ("KeyN" === code) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleNaviPanel();
                } else if ("ControlLeft" === code || "ControlRight" === code) {
                    if (tryToggleAircraft()) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }
            }
            ), !0);
            document.addEventListener("keyup", (event => {
                const code = event.code || "";
                if ("KeyU" === code)
                    runtimeState.input.slowLeft = !1;
                else if ("KeyO" === code)
                    runtimeState.input.slowRight = !1;
                else if ("KeyJ" === code)
                    runtimeState.input.fastLeft = !1;
                else if ("KeyL" === code)
                    runtimeState.input.fastRight = !1;
                else if ("KeyP" === code)
                    runtimeState.input.fullBrake = !1;
                else if ("KeyE" === code)
                    runtimeState.input.fire = !1;
                if (!runtimeState.input.slowLeft && !runtimeState.input.slowRight && !runtimeState.input.fastLeft && !runtimeState.input.fastRight) {
                    const car = runtimeState.game && runtimeState.game.controlManager && runtimeState.game.controlManager.controllableCar;
                    car && typeof car.resetSteeringSlow === "function" && car.resetSteeringSlow();
                }
            }
            ), !0);
        }

        function applyExtendedVehicleControls(car, dtSeconds) {
            if (!car)
                return;
            const tuningActive = featureState.vehicleTuning && vehicleTuningState.active;
            const handlingBoost = tuningActive ? 1.22 : 1;
            const leftStrength = ((runtimeState.input.slowLeft ? .65 : 0) + (runtimeState.input.fastLeft ? 2.15 : 0)) * handlingBoost;
            const rightStrength = ((runtimeState.input.slowRight ? .65 : 0) + (runtimeState.input.fastRight ? 2.15 : 0)) * handlingBoost;
            const steer = Math.sign(leftStrength - rightStrength);
            if (steer) {
                const maxAngle = Number(car.mcs && car.mcs.maxSteeringAngle) || .5;
                car.delayMode = Math.max(tuningActive ? .08 : .12, Math.min(tuningActive ? 1.35 : 2.2, Math.abs(leftStrength - rightStrength)));
                if (typeof car.setSteeringTarget === "function")
                    car.setSteeringTarget(steer * (tuningActive ? 1.25 : 1));
                else
                    car.steeringTarget = steer * maxAngle * (tuningActive ? 1.28 : 1);
                tuningActive && "number" == typeof car.steeringAngle && (car.steeringAngle = clamp(Number(car.steeringAngle) + steer * (Number(dtSeconds) || .016) * maxAngle * 1.65, -maxAngle * 1.22, maxAngle * 1.22));
            }
            if (runtimeState.input.fullBrake) {
                if (typeof car.toBreak === "function")
                    car.toBreak();
                const dt = Math.max(1e-3, Number(dtSeconds) || 0);
                const brakeDelta = 42 * dt;
                if (car.speed > 0)
                    car.speed = Math.max(0, car.speed - brakeDelta);
                else if (car.speed < 0)
                    car.speed = Math.min(0, car.speed + brakeDelta);
            }
        }

        function applyVehicleTuningHandlingAssist(car, dtSeconds) {
            if (!car || !featureState.vehicleTuning || !vehicleTuningState.active || !car.cameraGroup)
                return;
            const dt = Math.max(1e-3, Number(dtSeconds) || 0);
            const steeringValue = Number(car.steeringTarget) || Number(car.steeringAngle) || 0;
            const steerMagnitude = clamp(Math.abs(steeringValue) / Math.max(.2, Number(car.mcs && car.mcs.maxSteeringAngle) || .5), 0, 1.8);
            const speed = speedAbs(car.speed);
            if (steerMagnitude > .18 && speed > 18) {
                const gripDrag = clamp((speed - 18) / 90, 0, .18) * steerMagnitude;
                car.speed *= Math.max(.88, 1 - gripDrag * dt);
            }
            car.group && (car.group.rotation.z *= Math.pow(.012, dt));
        }

        function applyVehicleTuning(car, dtSeconds, previousSpeed) {
            if (!car || !featureState.vehicleTuning || !vehicleTuningState.active)
                return;
            const dt = Math.max(1e-3, Number(dtSeconds) || 0);
            const maxSpeedMs = getVehicleTuningMaxSpeedMs();
            const accelerationLimit = getVehicleTuningAccelerationLimit();
            const rawSpeed = Number(car.speed) || 0;
            if (car.speeding > 0 && previousSpeed >= -1)
                car.speed = Math.min(maxSpeedMs, Math.max(rawSpeed, previousSpeed + accelerationLimit * dt * Math.max(.2, Number(car.speeding) || 0)));
            if (car.speed > maxSpeedMs)
                car.speed = maxSpeedMs;
            if (car.speed < -maxSpeedMs / 3)
                car.speed = -maxSpeedMs / 3;
            const forwardDelta = car.speed - previousSpeed;
            const maxForwardDelta = accelerationLimit * dt;
            if (forwardDelta > maxForwardDelta)
                car.speed = previousSpeed + maxForwardDelta;
            if (car.cruiseControlOn)
                car.cruiseControlTargetSpeed = Math.min(car.cruiseControlTargetSpeed, maxSpeedMs);
            car.acc = clamp((car.speed - previousSpeed) / dt, -2 * accelerationLimit, accelerationLimit);
            applyVehicleTuningHandlingAssist(car, dt);
        }

        function getAutopilotState() {
            if (!runtimeState.autopilot)
                runtimeState.autopilot = {};
            return runtimeState.autopilot;
        }

        function isGameMenuVisible() {
            const menu = document.getElementById("game_menu");
            if (!menu)
                return !1;
            const style = window.getComputedStyle ? window.getComputedStyle(menu) : menu.style;
            return "none" !== style.display && "hidden" !== style.visibility && 0 !== menu.getClientRects().length;
        }

        function dispatchGameKey(key, code) {
            const event = new KeyboardEvent("keydown", {
                key,
                code,
                bubbles: !0,
                cancelable: !0
            });
            document.dispatchEvent(event);
        }

        function openGameMapForAutopilot() {
            if (!isGameMenuVisible()) {
                const menu = runtimeState.gameMenu;
                if (menu && "function" == typeof menu.toggleMenu)
                    menu.toggleMenu();
                else
                    dispatchGameKey("Escape", "Escape");
            }
            setTimeout((() => {
                const menu = runtimeState.gameMenu;
                menu && menu.map && "function" == typeof menu.map.invalidateSize && menu.map.invalidateSize();
                const mapContainer = document.getElementById("big_menu_map_con");
                mapContainer && mapContainer.dispatchEvent(new Event("resize"));
            }
            ), 120);
        }

        function getMapTargetSignature() {
            const navPoint = runtimeState.game && runtimeState.game.realMap && runtimeState.game.realMap.navPoint;
            if (!navPoint)
                return "";
            const lat = Number(navPoint.lat);
            const lng = Number(navPoint.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng))
                return "";
            if (isDeveloperToggleEnabled("perfMapTargetSignatureCache") && runtimeState.mapTargetSignatureLat === lat && runtimeState.mapTargetSignatureLng === lng && runtimeState.mapTargetSignature)
                return runtimeState.mapTargetSignature;
            const signature = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            if (isDeveloperToggleEnabled("perfMapTargetSignatureCache")) {
                runtimeState.mapTargetSignatureLat = lat;
                runtimeState.mapTargetSignatureLng = lng;
                runtimeState.mapTargetSignature = signature;
            }
            return signature;
        }

        function getMapTargetWorldPosition() {
            const realMap = runtimeState.game && runtimeState.game.realMap;
            if (!realMap || "function" != typeof realMap.getNavPoint)
                return null;
            try {
                const target = realMap.getNavPoint();
                return target ? cloneVector3(target) : null;
            } catch (mapError) {
                warn("Automatik-Ziel konnte nicht aus der Map gelesen werden:", mapError);
                return null;
            }
        }

        function clearAutopilotRoute(state) {
            if (!state)
                return;
            state.route = [];
            state.routeIndex = 0;
            state.targetRoadMatch = null;
            state.routeStepByEdge = null;
            state.routeIndexByKey = null;
        }

        function resetAutopilotRoadState(state) {
            state.edge = null;
            state.segmentIndex = 0;
            state.segmentT = 0;
            state.direction = 1;
            state.snapped = !1;
            state.linking = !1;
            clearAutopilotRoute(state);
        }

        function stopAutopilot(reason, shouldNotify=!0) {
            const state = getAutopilotState();
            if (!state.enabled && !state.pendingMapSelection)
                return;
            state.enabled = !1;
            state.pendingMapSelection = !1;
            resetAutopilotRoadState(state);
            const car = getPlayerCar();
            car && setPlayerSpeed(car, 0);
            shouldNotify && notifyRuntime(`Automatik aus: ${reason || "gestoppt"}`);
            syncAutopilotDebug();
        }

        function clearNaviGuidance(reason, shouldNotify=!1) {
            runtimeState.navGuidance = null;
            runtimeState.navGuidanceUiState = null;
            shouldNotify && notifyRuntime(`Navi aus: ${reason || "gestoppt"}`);
            setNaviPanelStatus("");
        }

        function findTargetRoadPosition(position) {
            const match = findBestRoadSegmentTowardTarget(position, 1800, position);
            return match && match.point ? match.point.clone() : cloneVector3(position);
        }

        function startAutopilotToMapTarget(source) {
            if (!featureState.autopilot) {
                notifyRuntime("Autopilot ist in den Extension-Einstellungen aus.", "error");
                return !1;
            }
            const target = getMapTargetWorldPosition();
            const signature = getMapTargetSignature();
            if (!target || !signature)
                return !1;
            const state = getAutopilotState();
            state.enabled = !0;
            state.pendingMapSelection = !1;
            state.targetPosition = target;
            state.targetRoadPosition = findTargetRoadPosition(target);
            state.targetSignature = signature;
            resetAutopilotRoadState(state);
            runInternalModule("autopilotRouting", (() => rebuildAutopilotRoute(state, getPlayerPosition() || getControlPosition())), !1, "Route zur Map");
            state.lastNoticeAt = performance.now();
            notifyRuntime(`Automatik aktiv: Ziel gesetzt (${source || "map"}).`);
            syncAutopilotDebug();
            return !0;
        }

        function startAutopilotToWorldPosition(position, label, source) {
            if (!featureState.autopilot) {
                notifyRuntime("Autopilot ist in den Extension-Einstellungen aus.", "error");
                return !1;
            }
            if (!position)
                return !1;
            const target = cloneVector3(position);
            if (!target)
                return !1;
            const state = getAutopilotState();
            state.enabled = !0;
            state.pendingMapSelection = !1;
            state.targetPosition = target;
            state.targetRoadPosition = findTargetRoadPosition(target);
            state.targetSignature = `${source || "navi"}:${target.x.toFixed(1)},${target.z.toFixed(1)}`;
            resetAutopilotRoadState(state);
            runInternalModule("autopilotRouting", (() => rebuildAutopilotRoute(state, getPlayerPosition() || getControlPosition())), !1, "Route zur Weltposition");
            state.lastNoticeAt = performance.now();
            notifyRuntime(`Navi aktiv: ${label || "Ziel gesetzt"}.`);
            syncAutopilotDebug();
            return !0;
        }

        function startNaviGuidanceToWorldPosition(position, label, source) {
            if (!position || !globalState.THREE)
                return !1;
            const target = cloneVector3(position);
            if (!target)
                return !1;
            runtimeState.navGuidance = {
                position: target,
                label: label || "Ziel",
                source: source || "navi",
                startedAt: performance.now()
            };
            runtimeState.navGuidanceUiState = null;
            stopAutopilot("Navi zeigt nur den Weg", !1);
            notifyRuntime(`Navi zeigt Weg: ${label || "Ziel gesetzt"}.`);
            setNaviPanelStatus(`Weg zeigen: ${label || "Ziel gesetzt"}`);
            return !0;
        }

        function startNaviToWorldPosition(position, label, source) {
            if ("guide" === runtimeState.navMode)
                return startNaviGuidanceToWorldPosition(position, label, source);
            clearNaviGuidance();
            if (!featureState.autopilot) {
                notifyRuntime("Autopilot ist aus. Navi-Modus auf Weg zeigen gewechselt.", "error");
                runtimeState.navMode = "guide";
                syncNaviPanelMode();
                return startNaviGuidanceToWorldPosition(position, label, source);
            }
            return startAutopilotToWorldPosition(position, label, source);
        }

        function collectPoiNaviTargets(type) {
            const targets = [];
            const seen = new Set;
            const addTarget = (poi, key) => {
                if (!poi || !poi.position || type && poi.type !== type)
                    return;
                const marker = key || `${poi.type}:${Math.round(poi.position.x)}:${Math.round(poi.position.z)}`;
                if (seen.has(marker))
                    return;
                seen.add(marker);
                targets.push({
                    key: marker,
                    label: poi.name || type || "POI",
                    position: poi.position
                });
            };
            for (const item of runtimeState.overlayItems)
                item.kind === "poi" && addTarget(item.data || item, item.key);
            for (const [chunkKey, pois] of runtimeState.poiCache) {
                const list = isDeveloperToggleEnabled("perfPoiNaviTargetsLoop") ? toSafeArray(pois) : null;
                if (list)
                    for (let index = 0; index < list.length; index++)
                        addTarget(list[index], `${chunkKey}:${index}`);
                else
                    for (let index = 0; index < toSafeArray(pois).length; index++)
                        addTarget(pois[index], `${chunkKey}:${index}`);
            }
            return targets;
        }

        function collectNaviTargets(type) {
            if ("fuel" === type)
                return collectGasStationMissionTargets();
            if ("airport" === type && isDeveloperToggleEnabled("perfNaviAirportTargetsLoop")) {
                const airports = getAirportEntries();
                const targets = [];
                for (let index = 0; index < airports.length; index++) {
                    const airport = airports[index];
                    targets.push({
                        key: `airport_${index}`,
                        label: `Airport ${index + 1}`,
                        position: airport.center,
                        airport
                    });
                }
                return targets;
            }
            if ("airport" === type)
                return getAirportEntries().map((airport, index) => ({
                    key: `airport_${index}`,
                    label: `Airport ${index + 1}`,
                    position: airport.center,
                    airport
                }));
            if ("supermarket" === type || "autoshop" === type || "apiary" === type)
                return collectPoiNaviTargets(type);
            if ("town" === type)
                return collectTownMissionTargets();
            return [];
        }

        function chooseNearestNaviTarget(targets) {
            const playerPos = getControlPosition() || getPlayerPosition();
            if (!playerPos)
                return null;
            if (isDeveloperToggleEnabled("perfNaviTargetSelection")) {
                let best = null;
                let bestDistance = 1 / 0;
                for (const target of toSafeArray(targets)) {
                    if (!target || !target.position)
                        continue;
                    const distance = getDistance2D(playerPos, target.position);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        best = target;
                    }
                }
                return best ? Object.assign({}, best, {
                    distance: bestDistance
                }) : null;
            }
            return targets.filter(target => target && target.position).map(target => Object.assign({}, target, {
                distance: getDistance2D(playerPos, target.position)
            })).sort(((a, b) => a.distance - b.distance))[0] || null;
        }

        function getAddressSearchParts(text) {
            const normalized = normalizeTownLabel(text).toLowerCase();
            if (isDeveloperToggleEnabled("perfAddressPartsCache")) {
                runtimeState.addressSearchPartsCache instanceof Map || (runtimeState.addressSearchPartsCache = new Map);
                const cached = runtimeState.addressSearchPartsCache.get(normalized);
                if (cached)
                    return cached;
                const postal = normalized.match(/\b\d{4,5}\b/);
                const house = normalized.match(/\b(\d+[a-z]?)\b(?!.*\b\d+[a-z]?\b)/);
                const words = normalized.replace(/\b\d+[a-z]?\b/g, " ").split(/\s+/).filter(word => word.length > 2);
                return rememberLimitedCache(runtimeState.addressSearchPartsCache, normalized, {
                    normalized,
                    postal: postal && postal[0] || "",
                    house: house && house[1] || "",
                    words
                }, 160);
            }
            const postal = normalized.match(/\b\d{4,5}\b/);
            const house = normalized.match(/\b(\d+[a-z]?)\b(?!.*\b\d+[a-z]?\b)/);
            const words = normalized.replace(/\b\d+[a-z]?\b/g, " ").split(/\s+/).filter(word => word.length > 2);
            return {
                normalized,
                postal: postal && postal[0] || "",
                house: house && house[1] || "",
                words
            };
        }

        function buildAddressSearchRequests(text) {
            const parts = getAddressSearchParts(text);
            if (isDeveloperToggleEnabled("perfAddressRequestBuild")) {
                const requests = [];
                const seen = new Set;
                const addRequest = (query, countrycodes="") => {
                    const key = `${query}|${countrycodes}`;
                    if (seen.has(key))
                        return;
                    seen.add(key);
                    requests.push({
                        query,
                        countrycodes
                    });
                };
                addRequest(text);
                if (/^\d{4}\b/.test(parts.normalized)) {
                    addRequest(`${text}, Oesterreich`, "at");
                    addRequest(`${text}, Austria`, "at");
                }
                if (!/\b(oesterreich|österreich|austria|deutschland|germany)\b/i.test(text))
                    addRequest(`${text}, Oesterreich`, "at");
                return requests;
            }
            const requests = [{
                query: text,
                countrycodes: ""
            }];
            if (/^\d{4}\b/.test(parts.normalized)) {
                requests.push({
                    query: `${text}, Oesterreich`,
                    countrycodes: "at"
                }, {
                    query: `${text}, Austria`,
                    countrycodes: "at"
                });
            }
            if (!/\b(oesterreich|österreich|austria|deutschland|germany)\b/i.test(text)) {
                requests.push({
                    query: `${text}, Oesterreich`,
                    countrycodes: "at"
                });
            }
            const seen = new Set;
            return requests.filter(request => {
                const key = `${request.query}|${request.countrycodes}`;
                if (seen.has(key))
                    return !1;
                seen.add(key);
                return !0;
            });
        }

        function scoreAddressSearchResult(result, text) {
            const parts = getAddressSearchParts(text);
            const address = result && result.address || {};
            let haystack;
            if (isDeveloperToggleEnabled("perfAddressHaystackBuild")) {
                let raw = "";
                const append = value => {
                    value && (raw += `${raw ? " " : ""}${value}`);
                };
                append(result && result.display_name);
                append(address.road);
                append(address.house_number);
                append(address.postcode);
                append(address.city);
                append(address.town);
                append(address.village);
                append(address.hamlet);
                append(address.suburb);
                append(address.country);
                haystack = normalizeTownLabel(raw).toLowerCase();
            } else
                haystack = normalizeTownLabel([result && result.display_name, address.road, address.house_number, address.postcode, address.city, address.town, address.village, address.hamlet, address.suburb, address.country].filter(Boolean).join(" ")).toLowerCase();
            let score = Number(result && result.importance) || 0;
            if (parts.postal && String(address.postcode || "").startsWith(parts.postal))
                score += 100;
            if (parts.house && String(address.house_number || "").toLowerCase() === parts.house)
                score += 55;
            for (const word of parts.words)
                haystack.includes(word) && (score += 18);
            if (/austria|oesterreich|österreich/i.test(haystack))
                score += /^\d{4}\b/.test(parts.normalized) ? 45 : 8;
            if (address.road || address.house_number)
                score += 18;
            return score;
        }

        async function resolveAddressToWorldPosition(text) {
            const queryText = normalizeTownLabel(text);
            if (!queryText || !runtimeState.geoModule || "function" != typeof runtimeState.geoModule.convertProjLocalCoords)
                return null;
            const key = `address:${queryText.toLowerCase()}`;
            if (runtimeState.customBuildingAddressCache.has(key)) {
                const cached = runtimeState.customBuildingAddressCache.get(key);
                return cached && "function" == typeof cached.then ? await cached : cached;
            }
            const promise = (async () => {
                const candidates = [];
                const fastAddressSelection = isDeveloperToggleEnabled("perfAddressBestSelection");
                for (const request of buildAddressSearchRequests(queryText)) {
                    const params = new URLSearchParams({
                        format: "json",
                        limit: "5",
                        addressdetails: "1",
                        q: request.query
                    });
                    request.countrycodes && params.set("countrycodes", request.countrycodes);
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
                        headers: {
                            Accept: "application/json"
                        }
                    });
                    if (!response.ok)
                        throw new Error(`HTTP ${response.status}`);
                    const results = await response.json();
                    let hasStrongCandidate = !1;
                    for (const result of toSafeArray(results)) {
                        candidates.push(result);
                        fastAddressSelection && scoreAddressSearchResult(result, queryText) >= 120 && (hasStrongCandidate = !0);
                    }
                    if (fastAddressSelection ? hasStrongCandidate : candidates.some(result => scoreAddressSearchResult(result, queryText) >= 120))
                        break;
                }
                let best;
                if (fastAddressSelection) {
                    let bestScore = -1 / 0;
                    for (const candidate of candidates) {
                        const score = scoreAddressSearchResult(candidate, queryText);
                        if (score > bestScore) {
                            bestScore = score;
                            best = candidate;
                        }
                    }
                } else
                    best = candidates.sort(((a, b) => scoreAddressSearchResult(b, queryText) - scoreAddressSearchResult(a, queryText)))[0];
                const lat = Number(best && best.lat);
                const lon = Number(best && best.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lon))
                    return null;
                const position = runtimeState.geoModule.convertProjLocalCoords([lat, lon]);
                if (!position)
                    return null;
                position.y = getTerrainYWorld(position, 0);
                return {
                    x: Number(position.x) || 0,
                    y: Number(position.y) || 0,
                    z: Number(position.z) || 0,
                    label: normalizeTownLabel(best.display_name || queryText),
                    lat,
                    lon
                };
            })().catch(addressError => {
                warn(`Adresse konnte nicht aufgeloest werden (${queryText}):`, addressError);
                return null;
            });
            runtimeState.customBuildingAddressCache.set(key, promise);
            const resolved = await promise;
            runtimeState.customBuildingAddressCache.set(key, resolved);
            return resolved;
        }

        function startNaviPreset(type) {
            if (!featureState.navigation) {
                notifyRuntime("Navi panel ist in den Extension-Einstellungen aus.", "error");
                return !1;
            }
            const isShopPreset = isDeveloperToggleEnabled("perfNaviPresetChecks") ? "supermarket" === type || "autoshop" === type || "apiary" === type : ["supermarket", "autoshop", "apiary"].includes(type);
            if (isShopPreset && !featureState.shops) {
                notifyRuntime("Shops + Navi POIs sind in den Extension-Einstellungen aus.", "error");
                return !1;
            }
            if ("airport" === type && !featureState.aircraft) {
                notifyRuntime("Aircraft + airports ist in den Extension-Einstellungen aus.", "error");
                return !1;
            }
            if ("town" === type && !featureState.townSigns) {
                notifyRuntime("Town signs ist in den Extension-Einstellungen aus.", "error");
                return !1;
            }
            if ("airport" !== type && "town" !== type)
                for (const chunk of getLoadedChunks())
                    queuePoiFetch(chunk);
            const target = chooseNearestNaviTarget(collectNaviTargets(type));
            if (!target) {
                notifyRuntime("Navi: kein passendes Ziel in geladenen Daten gefunden.", "error");
                return !1;
            }
            return startNaviToWorldPosition(target.position, target.label || type, `preset:${type}`);
        }

        function setNaviPanelStatus(message, kind) {
            const panel = runtimeState.navPanel;
            const status = panel && (panel.__tmNaviStatusNode || (panel.__tmNaviStatusNode = panel.querySelector('[data-role="status"]')));
            if (!status)
                return;
            const text = message || "";
            const color = "error" === kind ? "#ff9f9f" : "#9fd7ff";
            if (status.__tmLastText !== text) {
                status.textContent = text;
                status.__tmLastText = text;
            }
            if (status.__tmLastColor !== color) {
                status.style.color = color;
                status.__tmLastColor = color;
            }
        }

        function searchNaviAddress(query) {
            if (!featureState.navigation) {
                setNaviPanelStatus("Navi ist in den Extension-Einstellungen aus.", "error");
                return;
            }
            const text = normalizeTownLabel(query);
            if (!text)
                return setNaviPanelStatus("Bitte Adresse eingeben.", "error");
            if (!runtimeState.geoModule || "function" != typeof runtimeState.geoModule.convertProjLocalCoords) {
                setNaviPanelStatus("Navi wartet auf Geo-Modul.", "error");
                return;
            }
            runtimeState.navSearching = !0;
            setNaviPanelStatus("Suche Adresse...");
            resolveAddressToWorldPosition(text).then(result => {
                if (!result)
                    throw new Error("Adresse nicht gefunden");
                const position = new globalState.THREE.Vector3(result.x,result.y || 0,result.z);
                if (!position)
                    throw new Error("Koordinaten konnten nicht ins Spiel umgerechnet werden");
                const label = normalizeTownLabel(result.label).slice(0, 72) || text;
                addCustomBuildingPriorityTarget(position, label);
                prepareCustomBuildingsNearPosition(position, "address");
                startNaviToWorldPosition(position, label, "address");
                setNaviPanelStatus(`Ziel gesetzt: ${label}`);
            }).catch(searchError => {
                setNaviPanelStatus(`Adresse nicht gefunden: ${searchError.message || searchError}`, "error");
                notifyRuntime("Navi: Adresse nicht gefunden.", "error");
            }).finally((() => {
                runtimeState.navSearching = !1;
            }));
        }

        function ensureNaviPanel() {
            if (runtimeState.navPanel && runtimeState.navPanel.isConnected)
                return runtimeState.navPanel;
            if (!document.body)
                return null;
            const panel = document.createElement("div");
            panel.id = "__tmNaviPanel";
            panel.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:999999;width:min(360px,calc(100vw - 32px));box-sizing:border-box;background:rgba(17,24,31,.94);color:#f5f1e8;border:1px solid rgba(255,255,255,.16);border-radius:10px;box-shadow:0 16px 42px rgba(0,0,0,.35);padding:12px;font:600 13px/1.35 Arial,Helvetica,sans-serif;display:none;backdrop-filter:blur(10px);";
            panel.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
                    <div style="letter-spacing:.04em;text-transform:uppercase;color:#d8d0c4;">Navi</div>
                    <button type="button" data-role="close" style="border:0;background:transparent;color:#d8d0c4;font:inherit;cursor:pointer;padding:0 2px;">x</button>
                </div>
                <div data-role="mode" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
                    <button type="button" data-mode="drive" style="border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#f5f1e8;border-radius:8px;padding:7px 6px;font:inherit;cursor:pointer;">Automatisch</button>
                    <button type="button" data-mode="guide" style="border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#f5f1e8;border-radius:8px;padding:7px 6px;font:inherit;cursor:pointer;">Weg zeigen</button>
                </div>
                <div data-role="presets" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px;">
                    ${NAV_PRESETS.map(preset => `<button type="button" data-preset="${preset.type}" style="border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#f5f1e8;border-radius:8px;padding:7px 6px;font:inherit;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preset.label}</button>`).join("")}
                </div>
                <form data-role="addressForm" style="display:flex;gap:6px;margin-bottom:8px;">
                    <input data-role="address" type="search" placeholder="3970 Lauterbach 20" style="flex:1;min-width:0;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:#fff8eb;border-radius:8px;padding:8px 9px;font:inherit;outline:none;">
                    <button type="submit" style="border:1px solid rgba(255,255,255,.12);background:#d7e2f2;color:#12202d;border-radius:8px;padding:8px 10px;font:inherit;cursor:pointer;">Suchen</button>
                </form>
                <div data-role="status" style="min-height:18px;color:#9fd7ff;font-size:12px;"></div>
            `;
            panel.addEventListener("keydown", (event => event.stopPropagation()));
            panel.addEventListener("keyup", (event => event.stopPropagation()));
            panel.querySelector('[data-role="close"]').addEventListener("click", (() => toggleNaviPanel(!1)));
            for (const button of panel.querySelectorAll("button[data-mode]"))
                button.addEventListener("click", (() => {
                    runtimeState.navMode = "guide" === button.dataset.mode ? "guide" : "drive";
                    syncNaviPanelMode();
                    setNaviPanelStatus("guide" === runtimeState.navMode ? "Navi zeigt nur den Weg." : "Navi faehrt automatisch, wenn Autopilot an ist.");
                }));
            panel.querySelector('[data-role="addressForm"]').addEventListener("submit", (event => {
                event.preventDefault();
                const input = panel.querySelector('[data-role="address"]');
                searchNaviAddress(input && input.value);
            }));
            for (const button of panel.querySelectorAll("button[data-preset]"))
                button.addEventListener("click", (() => startNaviPreset(button.dataset.preset)));
            document.body.appendChild(panel);
            runtimeState.navPanel = panel;
            syncNaviPanelMode();
            return panel;
        }

        function syncNaviPanelMode() {
            const panel = runtimeState.navPanel;
            if (!panel)
                return;
            const buttons = panel.__tmNaviModeButtons || (panel.__tmNaviModeButtons = Array.from(panel.querySelectorAll("button[data-mode]")));
            for (const button of buttons) {
                const active = button.dataset.mode === runtimeState.navMode;
                if (button.__tmNaviModeActive === active)
                    continue;
                button.__tmNaviModeActive = active;
                button.style.background = active ? "#d7e2f2" : "rgba(255,255,255,.08)";
                button.style.color = active ? "#12202d" : "#f5f1e8";
                button.style.borderColor = active ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.14)";
            }
        }

        function toggleNaviPanel(forceVisible) {
            if (!featureState.navigation) {
                notifyRuntime("Navi panel ist in den Extension-Einstellungen aus.", "error");
                return;
            }
            const panel = ensureNaviPanel();
            if (!panel)
                return;
            runtimeState.navVisible = null == forceVisible ? !runtimeState.navVisible : !!forceVisible;
            panel.style.display = runtimeState.navVisible ? "block" : "none";
            if (runtimeState.navVisible) {
                setNaviPanelStatus("");
                syncNaviPanelMode();
                const input = panel.querySelector('[data-role="address"]');
                input && input.focus();
            }
        }

        function handleAutopilotMapHotkey() {
            if (!featureState.autopilot) {
                notifyRuntime("Autopilot ist in den Extension-Einstellungen aus.", "error");
                return;
            }
            const state = getAutopilotState();
            if (isNoMapMissionActive()) {
                notifyRuntime("Automatik kann diese Aufgabe nicht starten: Map ist fuer diese Mission gesperrt.", "error");
                return;
            }
            if (runtimeState.activeAircraft) {
                notifyRuntime("Automatik ist nur im Auto aktiv, nicht im Flugzeug.", "error");
                return;
            }
            state.pendingMapSelection = !0;
            state.startSignature = getMapTargetSignature();
            state.lastNoticeAt = performance.now();
            openGameMapForAutopilot();
            notifyRuntime("Automatik: Ziel auf der Map anklicken, dann mit ESC/Back ins Spiel.");
            syncAutopilotDebug();
        }

        function updateAutopilotMapSelection() {
            const state = getAutopilotState();
            const signature = getMapTargetSignature();
            if (state.enabled && !signature) {
                stopAutopilot("Map-Ziel entfernt", !0);
                return;
            }
            if (!state.pendingMapSelection)
                return;
            if (signature && signature !== state.targetSignature && (!isGameMenuVisible() || signature !== state.startSignature))
                startAutopilotToMapTarget("map");
            else if (!isGameMenuVisible() && signature)
                startAutopilotToMapTarget("bestehendes Map-Ziel");
        }

        function syncAutopilotDebug() {
            const state = getAutopilotState();
            const debug = {
                enabled: !!state.enabled,
                pendingMapSelection: !!state.pendingMapSelection,
                target: state.targetPosition ? {
                    x: Number(state.targetPosition.x.toFixed(2)),
                    y: Number(state.targetPosition.y.toFixed(2)),
                    z: Number(state.targetPosition.z.toFixed(2))
                } : null,
                targetRoad: state.targetRoadPosition ? {
                    x: Number(state.targetRoadPosition.x.toFixed(2)),
                    y: Number(state.targetRoadPosition.y.toFixed(2)),
                    z: Number(state.targetRoadPosition.z.toFixed(2))
                } : null,
                road: state.edge ? {
                    type: state.edge.type,
                    oneway: !!state.edge.oneway,
                    segmentIndex: state.segmentIndex,
                    segmentT: Number((state.segmentT || 0).toFixed(3)),
                    direction: state.direction
                } : null,
                start: startAutopilotToMapTarget,
                stop: stopAutopilot,
                rebuildTarget: () => startAutopilotToMapTarget("debug")
            };
            globalThis.__tmAutopilotDebug = debug;
            globalThis.__tmCollisionHookDebug && (globalThis.__tmCollisionHookDebug.autopilot = debug);
        }

        function isRoadEligibleForAutopilot(edge) {
            if (!edge || !edge.points || edge.points.length < 2)
                return !1;
            const cacheKey = isDeveloperToggleEnabled("perfAutopilotEdgeEligibleCache") ? `${edge.points.length}:${edge.type}:${edge.lanesForward}:${edge.lanesBackward}:${edge.oneway ? 1 : 0}` : "";
            if (cacheKey && edge.__tmAutopilotEligibleKey === cacheKey)
                return !!edge.__tmAutopilotEligible;
            const roadModule = townSignsState.roadModule;
            if (!roadModule) {
                cacheKey && (edge.__tmAutopilotEligibleKey = cacheKey,
                edge.__tmAutopilotEligible = !0);
                return !0;
            }
            const eligible = edge.type !== roadModule.ROAD_TYPE_VIRTUAL && edge.type !== roadModule.ROAD_TYPE_RACETRACK && ((Number(edge.lanesForward) || 0) > 0 || (Number(edge.lanesBackward) || 0) > 0 || !!edge.oneway);
            cacheKey && (edge.__tmAutopilotEligibleKey = cacheKey,
            edge.__tmAutopilotEligible = eligible);
            return eligible;
        }

        function canDriveEdgeDirection(edge, direction) {
            if (!edge)
                return !1;
            return direction > 0 ? (Number(edge.lanesForward) || 0) > 0 || !!edge.oneway : !edge.oneway && (Number(edge.lanesBackward) || 0) > 0;
        }

        function getLoadedAutopilotEdges() {
            if (!isDeveloperToggleEnabled("perfAutopilotEdgeListCache"))
                return null;
            const state = getWorldCollisionState();
            const chunks = getLoadedChunks();
            const now = performance.now();
            if (state.autopilotEdgeChunks === chunks && Array.isArray(state.autopilotEdges) && now - (Number(state.autopilotEdgesAt) || 0) < 240)
                return state.autopilotEdges;
            const edges = [];
            for (const chunk of chunks)
                for (const edge of toSafeArray(chunk && chunk.newRoadGraph && chunk.newRoadGraph.edges))
                    isRoadEligibleForAutopilot(edge) && edges.push(edge);
            state.autopilotEdgeChunks = chunks;
            state.autopilotEdges = edges;
            state.autopilotEdgesAt = now;
            return edges;
        }

        function getEdgeWorldPoints(edge) {
            const center = edge && edge.chunk && edge.chunk.centerVec;
            if (!edge || !edge.points || !center)
                return [];
            if (isDeveloperToggleEnabled("perfRoadWorldPointCache")) {
                const key = `${edge.points.length}:${roundNumberForCacheKey(center.x)}:${roundNumberForCacheKey(center.y)}:${roundNumberForCacheKey(center.z)}`;
                const cached = edge.__tmWorldPointsCache;
                if (cached && cached.key === key)
                    return cached.points;
                const points = [];
                for (const point of edge.points)
                    points.push(point.clone().add(center));
                edge.__tmWorldPointsCache = {
                    key,
                    points
                };
                return points;
            }
            const points = [];
            for (const point of edge.points)
                points.push(point.clone().add(center));
            return points;
        }

        function getRoadSegmentMatchFromPoints(edge, index, position, points) {
            const start = points[index];
            const end = points[index + 1];
            if (!start || !end)
                return null;
            if (isDeveloperToggleEnabled("perfRoadSegmentMatchMath")) {
                const px = Number(position && position.x) || 0;
                const pz = Number(position && position.z) || 0;
                const ax = Number(start.x) || 0;
                const ay = Number(start.y) || 0;
                const az = Number(start.z) || 0;
                const dx = (Number(end.x) || 0) - ax;
                const dy = (Number(end.y) || 0) - ay;
                const dz = (Number(end.z) || 0) - az;
                const lenSq = dx * dx + dz * dz;
                if (lenSq < 1e-6)
                    return null;
                const progress = clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
                const cx = ax + dx * progress;
                const cz = az + dz * progress;
                const distance = Math.hypot(px - cx, pz - cz);
                const direction = new globalState.THREE.Vector3(dx,0,dz);
                direction.normalize();
                return {
                    edge,
                    segmentIndex: index,
                    progress,
                    point: new globalState.THREE.Vector3(cx,ay + dy * progress,cz),
                    direction,
                    distance
                };
            }
            const segment = distancePointToSegment2D(position, start, end);
            const point = start.clone().lerp(end, segment.progress);
            const direction = end.clone().sub(start);
            direction.y = 0;
            if (direction.lengthSq() < 1e-6)
                return null;
            direction.normalize();
            return {
                edge,
                segmentIndex: index,
                progress: segment.progress,
                point,
                direction,
                distance: segment.distance
            };
        }

        function getRoadSegmentMatch(edge, index, position) {
            return getRoadSegmentMatchFromPoints(edge, index, position, getEdgeWorldPoints(edge));
        }

        function findNearestRoadSegment(position, maxDistance=1 / 0) {
            if (!position || !globalState.THREE)
                return null;
            let best = null;
            const cachedEdges = getLoadedAutopilotEdges();
            if (cachedEdges) {
                for (const edge of cachedEdges) {
                    const points = getEdgeWorldPoints(edge);
                    for (let index = 0; index < points.length - 1; index++) {
                        const match = isDeveloperToggleEnabled("perfRoadSegmentPointReuse") ? getRoadSegmentMatchFromPoints(edge, index, position, points) : getRoadSegmentMatch(edge, index, position);
                        if (!match || match.distance > maxDistance)
                            continue;
                        if (!best || match.distance < best.distance)
                            best = match;
                    }
                }
                return best;
            }
            for (const chunk of getLoadedChunks())
                for (const edge of toSafeArray(chunk.newRoadGraph && chunk.newRoadGraph.edges)) {
                    if (!isRoadEligibleForAutopilot(edge))
                        continue;
                    const points = getEdgeWorldPoints(edge);
                    for (let index = 0; index < points.length - 1; index++) {
                        const match = isDeveloperToggleEnabled("perfRoadSegmentPointReuse") ? getRoadSegmentMatchFromPoints(edge, index, position, points) : getRoadSegmentMatch(edge, index, position);
                        if (!match || match.distance > maxDistance)
                            continue;
                        if (!best || match.distance < best.distance)
                            best = match;
                    }
                }
            return best;
        }

        function scoreRoadSegmentTowardTarget(match, position, target) {
            if (!match)
                return 1 / 0;
            let score = Number(match.distance) || 0;
            if (!target)
                return score;
            if (isDeveloperToggleEnabled("perfRoadSegmentScoreMath")) {
                const targetDx = (Number(target.x) || 0) - (Number(match.point && match.point.x) || 0);
                const targetDz = (Number(target.z) || 0) - (Number(match.point && match.point.z) || 0);
                const targetLenSq = targetDx * targetDx + targetDz * targetDz;
                if (targetLenSq > 1e-6) {
                    const invLen = 1 / Math.sqrt(targetLenSq);
                    const dot = ((Number(match.direction && match.direction.x) || 0) * targetDx + (Number(match.direction && match.direction.z) || 0) * targetDz) * invLen;
                    score += (1 - Math.abs(clamp(dot, -1, 1))) * 180;
                }
                score += Math.sqrt(targetLenSq) * .025;
                if (position) {
                    const px = (Number(position.x) || 0) - (Number(match.point && match.point.x) || 0);
                    const pz = (Number(position.z) || 0) - (Number(match.point && match.point.z) || 0);
                    score += Math.hypot(px, pz) * .06;
                }
                return score;
            }
            const toTarget = target.clone ? target.clone().sub(match.point) : new globalState.THREE.Vector3((Number(target.x) || 0) - match.point.x,0,(Number(target.z) || 0) - match.point.z);
            toTarget.y = 0;
            if (toTarget.lengthSq() > 1e-6) {
                toTarget.normalize();
                const forwardDot = Math.max(clamp(match.direction.dot(toTarget), -1, 1), clamp(match.direction.clone().multiplyScalar(-1).dot(toTarget), -1, 1));
                score += (1 - forwardDot) * 180;
            }
            score += getDistance2D(match.point, target) * .025;
            if (position)
                score += getDistance2D(position, match.point) * .06;
            return score;
        }

        function findBestRoadSegmentTowardTarget(position, maxDistance=1 / 0, target=null) {
            if (!position || !globalState.THREE)
                return null;
            let best = null;
            let bestScore = 1 / 0;
            const cachedEdges = getLoadedAutopilotEdges();
            if (cachedEdges) {
                for (const edge of cachedEdges) {
                    const points = getEdgeWorldPoints(edge);
                    for (let index = 0; index < points.length - 1; index++) {
                        const match = isDeveloperToggleEnabled("perfRoadSegmentPointReuse") ? getRoadSegmentMatchFromPoints(edge, index, position, points) : getRoadSegmentMatch(edge, index, position);
                        if (!match || match.distance > maxDistance)
                            continue;
                        const score = scoreRoadSegmentTowardTarget(match, position, target);
                        if (score < bestScore) {
                            best = match;
                            bestScore = score;
                        }
                    }
                }
                return best;
            }
            for (const chunk of getLoadedChunks())
                for (const edge of toSafeArray(chunk.newRoadGraph && chunk.newRoadGraph.edges)) {
                    if (!isRoadEligibleForAutopilot(edge))
                        continue;
                    const points = getEdgeWorldPoints(edge);
                    for (let index = 0; index < points.length - 1; index++) {
                        const match = isDeveloperToggleEnabled("perfRoadSegmentPointReuse") ? getRoadSegmentMatchFromPoints(edge, index, position, points) : getRoadSegmentMatch(edge, index, position);
                        if (!match || match.distance > maxDistance)
                            continue;
                        const score = scoreRoadSegmentTowardTarget(match, position, target);
                        if (score < bestScore) {
                            best = match;
                            bestScore = score;
                        }
                    }
                }
            return best;
        }

        function chooseAutopilotDirection(match, target) {
            if (!match || !target)
                return 1;
            const points = getEdgeWorldPoints(match.edge);
            if (points.length < 2)
                return 1;
            const forwardDistance = getDistance2D(points[points.length - 1], target);
            const backwardDistance = getDistance2D(points[0], target);
            if (forwardDistance <= backwardDistance && canDriveEdgeDirection(match.edge, 1))
                return 1;
            if (canDriveEdgeDirection(match.edge, -1))
                return -1;
            return 1;
        }

        function cacheAutopilotRouteLookups(state) {
            if (!state || !isDeveloperToggleEnabled("perfRouteStepLookupMap") || !Array.isArray(state.route))
                return;
            const stepByEdge = new WeakMap;
            const indexByKey = new Map;
            for (let index = 0; index < state.route.length; index++) {
                const step = state.route[index];
                if (!step || !step.edge)
                    continue;
                stepByEdge.has(step.edge) || stepByEdge.set(step.edge, step);
                indexByKey.set(makeRoadRouteKey(step.edge, step.direction), index);
            }
            state.routeStepByEdge = stepByEdge;
            state.routeIndexByKey = indexByKey;
        }

        function getAutopilotRouteStepForEdge(state, edge) {
            if (!state || !edge || !Array.isArray(state.route))
                return null;
            if (isDeveloperToggleEnabled("perfRouteStepLookupMap") && state.routeStepByEdge)
                return state.routeStepByEdge.get(edge) || null;
            return state.route.find((step => step && step.edge === edge)) || null;
        }

        function setAutopilotRoadMatch(state, match) {
            if (!state || !match)
                return !1;
            state.edge = match.edge;
            state.segmentIndex = match.segmentIndex;
            state.segmentT = clamp(match.progress, 0, 1);
            const routeStep = getAutopilotRouteStepForEdge(state, match.edge);
            state.direction = routeStep ? routeStep.direction : chooseAutopilotDirection(match, state.targetRoadPosition || state.targetPosition);
            state.snapped = !0;
            state.linking = !1;
            syncAutopilotRouteIndex(state);
            return !0;
        }

        function collectAutopilotOutgoingRoads(node, previousEdge) {
            const candidates = [];
            const visitNode = roadNode => {
                if (!roadNode)
                    return;
                const edges = isDeveloperToggleEnabled("perfAutopilotOutgoingLoops") && Array.isArray(roadNode.edges) ? roadNode.edges : toSafeArray(roadNode.edges);
                for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
                    const edge = edges[edgeIndex];
                    if (!isRoadEligibleForAutopilot(edge) || edge === previousEdge)
                        continue;
                    if (edge.u === roadNode && canDriveEdgeDirection(edge, 1))
                        candidates.push({
                            edge,
                            direction: 1
                        });
                    if (edge.v === roadNode && canDriveEdgeDirection(edge, -1))
                        candidates.push({
                            edge,
                            direction: -1
                        });
                }
            };
            visitNode(node);
            const pairNodes = isDeveloperToggleEnabled("perfAutopilotOutgoingLoops") && Array.isArray(node && node.pairNodes) ? node.pairNodes : toSafeArray(node && node.pairNodes);
            for (let index = 0; index < pairNodes.length; index++)
                visitNode(pairNodes[index]);
            const connectNodes = isDeveloperToggleEnabled("perfAutopilotOutgoingLoops") && Array.isArray(node && node.connectNodes) ? node.connectNodes : toSafeArray(node && node.connectNodes);
            for (let index = 0; index < connectNodes.length; index++)
                visitNode(connectNodes[index]);
            return candidates;
        }

        function getEdgeStartPointForDirection(edge, direction) {
            const points = getEdgeWorldPoints(edge);
            return direction > 0 ? points[0] : points[points.length - 1];
        }

        function getEdgeEndPointForDirection(edge, direction) {
            const points = getEdgeWorldPoints(edge);
            return direction > 0 ? points[points.length - 1] : points[0];
        }

        function getEdgeInitialVector(edge, direction) {
            const points = getEdgeWorldPoints(edge);
            if (points.length < 2)
                return null;
            const startIndex = direction > 0 ? 0 : points.length - 1;
            const nextIndex = direction > 0 ? 1 : points.length - 2;
            const vector = points[nextIndex].clone().sub(points[startIndex]);
            vector.y = 0;
            return vector.lengthSq() > 1e-6 ? vector.normalize() : null;
        }

        function chooseNextAutopilotRoad(edge, direction, targetPosition, currentForward) {
            const node = direction > 0 ? edge && edge.v : edge && edge.u;
            const candidates = collectAutopilotOutgoingRoads(node, edge);
            if (!candidates.length && edge && canDriveEdgeDirection(edge, -direction))
                candidates.push({
                    edge,
                    direction: -direction
                });
            let best = null;
            for (const candidate of candidates) {
                const start = getEdgeStartPointForDirection(candidate.edge, candidate.direction);
                const end = getEdgeEndPointForDirection(candidate.edge, candidate.direction);
                const vector = getEdgeInitialVector(candidate.edge, candidate.direction);
                if (!start || !end || !vector)
                    continue;
                const targetVector = targetPosition.clone().sub(start);
                targetVector.y = 0;
                targetVector.lengthSq() > 1e-6 && targetVector.normalize();
                const headingPenalty = currentForward && currentForward.lengthSq() > 1e-6 ? (1 - clamp(vector.dot(currentForward), -1, 1)) * 55 : 0;
                const targetPenalty = targetVector.lengthSq() > 1e-6 ? (1 - clamp(vector.dot(targetVector), -1, 1)) * 85 : 0;
                const roadPenalty = candidate.edge.type === (townSignsState.roadModule && townSignsState.roadModule.ROAD_TYPE_DRIVEWAY) ? 45 : 0;
                const score = getDistance2D(end, targetPosition) + .18 * getDistance2D(start, targetPosition) + headingPenalty + targetPenalty + roadPenalty;
                if (!best || score < best.score)
                    best = Object.assign({
                        score
                    }, candidate);
            }
            return best;
        }

        function rebuildAutopilotRoute(state, startPosition) {
            if (!state || !state.targetRoadPosition)
                return !1;
            const startMatch = findBestRoadSegmentTowardTarget(startPosition || getPlayerPosition(), 1800, state.targetRoadPosition || state.targetPosition);
            const targetMatch = findBestRoadSegmentTowardTarget(state.targetRoadPosition, 2200, state.targetPosition || state.targetRoadPosition);
            if (!startMatch || !targetMatch)
                return clearAutopilotRoute(state),
                !1;
            const targetPoint = targetMatch.point || state.targetRoadPosition;
            const sameEdgeDirections = [1, -1].filter((direction => canDriveEdgeDirection(startMatch.edge, direction)));
            if (startMatch.edge === targetMatch.edge && sameEdgeDirections.length) {
                let direction;
                if (isDeveloperToggleEnabled("perfSameEdgeDirectionSelect")) {
                    const forwardOk = canDriveEdgeDirection(startMatch.edge, 1);
                    const backwardOk = canDriveEdgeDirection(startMatch.edge, -1);
                    direction = forwardOk && (!backwardOk || getTargetDistanceFromEdgeStart(targetMatch, 1) <= getTargetDistanceFromEdgeStart(targetMatch, -1)) ? 1 : -1;
                } else
                    direction = sameEdgeDirections.sort(((a, b) => getTargetDistanceFromEdgeStart(targetMatch, a) - getTargetDistanceFromEdgeStart(targetMatch, b)))[0];
                state.route = [{
                    edge: startMatch.edge,
                    direction
                }];
                state.routeIndex = 0;
                state.targetRoadMatch = targetMatch;
                cacheAutopilotRouteLookups(state);
                return !0;
            }
            const open = [];
            const openByKey = isDeveloperToggleEnabled("perfAutopilotOpenMinScan") ? new Map : null;
            const queueState = (entry => {
                if (openByKey) {
                    const existing = openByKey.get(entry.key);
                    existing ? Object.assign(existing, entry) : (openByKey.set(entry.key, entry),
                    open.push(entry));
                    return;
                }
                const existingIndex = open.findIndex((candidate => candidate.key === entry.key));
                existingIndex >= 0 ? open[existingIndex] = entry : open.push(entry);
            });
            const visited = new Map;
            const previous = new Map;
            const routeMeta = new Map;
            let bestGoal = null;
            for (const direction of [1, -1]) {
                if (!canDriveEdgeDirection(startMatch.edge, direction))
                    continue;
                const key = makeRoadRouteKey(startMatch.edge, direction);
                const g = getRemainingDistanceOnMatchedEdge(startMatch, direction);
                const h = getDistance2D(getEdgeEndPointForDirection(startMatch.edge, direction), targetPoint);
                const entry = {
                    key,
                    edge: startMatch.edge,
                    direction,
                    g,
                    f: g + h
                };
                queueState(entry);
                visited.set(key, g);
                routeMeta.set(key, {
                    edge: startMatch.edge,
                    direction
                });
            }
            for (let guard = 0; open.length && guard < 3200; guard++) {
                let current;
                if (isDeveloperToggleEnabled("perfAutopilotOpenMinScan")) {
                    let bestIndex = 0;
                    let bestF = Number(open[0] && open[0].f) || 0;
                    for (let index = 1; index < open.length; index++) {
                        const f = Number(open[index] && open[index].f) || 0;
                        if (f < bestF) {
                            bestF = f;
                            bestIndex = index;
                        }
                    }
                    current = open.splice(bestIndex, 1)[0];
                    current && openByKey && openByKey.delete(current.key);
                } else {
                    open.sort(((a, b) => a.f - b.f));
                    current = open.shift();
                }
                if (!current)
                    break;
                if (current.edge === targetMatch.edge) {
                    const totalCost = current.g + getTargetDistanceFromEdgeStart(targetMatch, current.direction);
                    if (!bestGoal || totalCost < bestGoal.cost)
                        bestGoal = {
                            key: current.key,
                            cost: totalCost
                        };
                }
                const node = current.direction > 0 ? current.edge && current.edge.v : current.edge && current.edge.u;
                for (const next of collectAutopilotOutgoingRoads(node, current.edge)) {
                    const key = makeRoadRouteKey(next.edge, next.direction);
                    const g = current.g + getEdgeLength2D(next.edge);
                    if (g >= (visited.get(key) ?? 1 / 0))
                        continue;
                    visited.set(key, g);
                    previous.set(key, current.key);
                    routeMeta.set(key, {
                        edge: next.edge,
                        direction: next.direction
                    });
                    queueState({
                        key,
                        edge: next.edge,
                        direction: next.direction,
                        g,
                        f: g + getDistance2D(getEdgeEndPointForDirection(next.edge, next.direction), targetPoint)
                    });
                }
            }
            if (!bestGoal)
                return clearAutopilotRoute(state),
                !1;
            const route = [];
            for (let key = bestGoal.key; key; key = previous.get(key)) {
                const step = routeMeta.get(key);
                step && route.push(step);
            }
            route.reverse();
            state.route = route;
            state.routeIndex = 0;
            state.targetRoadMatch = targetMatch;
            cacheAutopilotRouteLookups(state);
            return !!route.length;
        }

        function syncAutopilotRouteIndex(state) {
            if (!state || !Array.isArray(state.route) || !state.route.length || !state.edge)
                return;
            if (isDeveloperToggleEnabled("perfRouteStepLookupMap") && state.routeIndexByKey) {
                const routeIndex = state.routeIndexByKey.get(makeRoadRouteKey(state.edge, state.direction));
                Number.isFinite(routeIndex) && routeIndex >= 0 && (state.routeIndex = routeIndex);
                return;
            }
            const routeIndex = state.route.findIndex((step => step && step.edge === state.edge && step.direction === state.direction));
            routeIndex >= 0 && (state.routeIndex = routeIndex);
        }

        function getAutopilotCurrentPoint(state) {
            const points = getEdgeWorldPoints(state.edge);
            const index = clamp(Math.round(Number(state.segmentIndex) || 0), 0, Math.max(0, points.length - 2));
            const start = points[index];
            const end = points[index + 1];
            if (!start || !end)
                return null;
            return start.clone().lerp(end, clamp(Number(state.segmentT) || 0, 0, 1));
        }

        function advanceAutopilotAlongRoad(state, distance) {
            if (!state.edge || !state.targetPosition)
                return null;
            let remaining = Math.max(0, Number(distance) || 0);
            let position = getAutopilotCurrentPoint(state);
            let travelVector = null;
            const target = state.targetRoadPosition || state.targetPosition;
            syncAutopilotRouteIndex(state);
            for (let guard = 0; guard < 96 && remaining >= 0; guard++) {
                const points = getEdgeWorldPoints(state.edge);
                if (points.length < 2)
                    return null;
                state.segmentIndex = clamp(Math.round(Number(state.segmentIndex) || 0), 0, points.length - 2);
                state.segmentT = clamp(Number(state.segmentT) || 0, 0, 1);
                const start = points[state.segmentIndex];
                const end = points[state.segmentIndex + 1];
                const segmentVector = end.clone().sub(start);
                segmentVector.y = 0;
                const segmentLength = segmentVector.length();
                if (segmentLength < 1e-6) {
                    state.segmentIndex += state.direction > 0 ? 1 : -1;
                    state.segmentT = state.direction > 0 ? 0 : 1;
                    continue;
                }
                const forward = segmentVector.clone().normalize().multiplyScalar(state.direction > 0 ? 1 : -1);
                const available = state.direction > 0 ? segmentLength * (1 - state.segmentT) : segmentLength * state.segmentT;
                if (remaining <= available || guard === 95) {
                    const deltaT = remaining / segmentLength * (state.direction > 0 ? 1 : -1);
                    state.segmentT = clamp(state.segmentT + deltaT, 0, 1);
                    position = start.clone().lerp(end, state.segmentT);
                    travelVector = forward;
                    break;
                }
                remaining -= available;
                position = state.direction > 0 ? end.clone() : start.clone();
                travelVector = forward;
                if (state.direction > 0 && state.segmentIndex < points.length - 2) {
                    state.segmentIndex += 1;
                    state.segmentT = 0;
                    continue;
                }
                if (state.direction < 0 && state.segmentIndex > 0) {
                    state.segmentIndex -= 1;
                    state.segmentT = 1;
                    continue;
                }
                let next = null;
                if (Array.isArray(state.route) && state.route.length) {
                    const planned = state.route[state.routeIndex + 1];
                    if (planned && planned.edge)
                        next = {
                            edge: planned.edge,
                            direction: planned.direction
                        },
                        state.routeIndex += 1;
                }
                next || (next = chooseNextAutopilotRoad(state.edge, state.direction, target, travelVector));
                if (!next && Array.isArray(state.route) && state.route.length)
                    runInternalModule("autopilotRouting", (() => rebuildAutopilotRoute(state, position || getPlayerPosition() || getControlPosition())), !1, "Route neu berechnen"),
                    syncAutopilotRouteIndex(state),
                    next = state.route[state.routeIndex + 1] || chooseNextAutopilotRoad(state.edge, state.direction, target, travelVector);
                if (!next)
                    break;
                state.edge = next.edge;
                state.direction = next.direction;
                const nextPoints = getEdgeWorldPoints(state.edge);
                state.segmentIndex = state.direction > 0 ? 0 : Math.max(0, nextPoints.length - 2);
                state.segmentT = state.direction > 0 ? 0 : 1;
            }
            return position && travelVector ? {
                position,
                direction: travelVector
            } : null;
        }

        function moveCarTowardAutopilotRoad(car, match, speed, dt) {
            if (!car || !match || !match.point)
                return !1;
            const current = car.getPosition();
            const toRoad = match.point.clone().sub(current);
            toRoad.y = 0;
            const distance = toRoad.length();
            if (distance <= 7)
                return !1;
            toRoad.normalize();
            const step = Math.min(distance, Math.max(8, speed) * dt);
            const nextPosition = current.clone().addScaledVector(toRoad, step);
            nextPosition.y = getTerrainYWorld(nextPosition, current.y);
            car.cameraGroup.position.copy(nextPosition);
            car.cameraGroup.rotation.set(0, getYawFromVector(toRoad), 0);
            car.group && (car.group.rotation.z = 0);
            car.speed = Math.max(0, speed);
            car.acc = 0;
            return !0;
        }

        function applyAutopilotPose(car, pose, speed) {
            if (!car || !pose || !pose.position || !pose.direction)
                return;
            const position = pose.position.clone();
            if (globalState.THREE) {
                const right = new globalState.THREE.Vector3(pose.direction.z,0,-pose.direction.x);
                right.lengthSq() > 1e-6 && right.normalize().multiplyScalar(clamp(getVehicleWidth(car) * .32, .75, 1.35)),
                position.add(right);
            }
            const terrainY = getTerrainYWorld(position, Number(position.y) || 0);
            position.y = Math.max(Number(position.y) || terrainY, terrainY) + .08;
            car.cameraGroup.position.copy(position);
            car.cameraGroup.rotation.set(0, getYawFromVector(pose.direction), 0);
            car.group && (car.group.rotation.z = 0);
            car.speed = Math.max(0, Number(speed) || 0);
            car.speeding = 1;
            car.breaking = 0;
            car.acc = getVehicleTuningAccelerationLimit();
            car.crashed = !1;
        }

        function getAutopilotCruiseSpeedMs(car) {
            if (isDeveloperToggleEnabled("perfAutopilotCruiseScan")) {
                let best = 0;
                const scan = value => {
                    const speed = Number(value);
                    Number.isFinite(speed) && speed > 4 && speed > best && (best = speed);
                };
                scan(car && car.maxSpeed);
                scan(car && car.mcs && car.mcs.maxSpeed);
                scan(car && car.mcs && car.mcs.maxForwardSpeed);
                scan(car && car.mcs && car.mcs.maxVelocity);
                return best > 0 ? clamp(best, 12, 45) : 32;
            }
            const candidates = [car && car.maxSpeed, car && car.mcs && car.mcs.maxSpeed, car && car.mcs && car.mcs.maxForwardSpeed, car && car.mcs && car.mcs.maxVelocity].map(Number).filter(value => Number.isFinite(value) && value > 4);
            if (candidates.length)
                return clamp(Math.max(...candidates), 12, 45);
            return 32;
        }

        function applyAutopilotToCar(car, dtSeconds) {
            const state = getAutopilotState();
            if (!state.enabled || !car || !state.targetPosition || runtimeState.activeAircraft || car.__tmImpactState)
                return !1;
            const dt = clamp(Number(dtSeconds) || .016, 1 / 240, .08);
            const speed = Math.max(8, featureState.vehicleTuning && vehicleTuningState.active ? getVehicleTuningMaxSpeedMs() : getAutopilotCruiseSpeedMs(car));
            const carPosition = car.getPosition();
            if ((!Array.isArray(state.route) || !state.route.length) && !runInternalModule("autopilotRouting", (() => rebuildAutopilotRoute(state, carPosition)), !1, "Route waehrend Fahrt aufbauen")) {
                stopAutopilot("keine verbundene Strasse zum Ziel", !0);
                return !1;
            }
            const stopTarget = state.targetRoadPosition || state.targetPosition;
            if (getDistance2D(carPosition, state.targetPosition) <= 28 || stopTarget && getDistance2D(carPosition, stopTarget) <= 14) {
                stopAutopilot("Ziel erreicht", !0);
                return !0;
            }
            if (!state.edge || !state.snapped) {
                const match = findBestRoadSegmentTowardTarget(carPosition, 1800, state.targetRoadPosition || state.targetPosition) || findNearestRoadSegment(carPosition, 1 / 0);
                if (!match) {
                    const now = performance.now();
                    if (now - (state.lastNoticeAt || 0) > 2500) {
                        state.lastNoticeAt = now;
                        notifyRuntime("Automatik sucht eine geladene Strasse...", "error");
                    }
                    return !1;
                }
                if (match.distance > 7) {
                    state.linking = !0;
                    const now = performance.now();
                    if (now - (state.lastLinkNoticeAt || 0) > 2500) {
                        state.lastLinkNoticeAt = now;
                        notifyRuntime("Automatik linkt zur naechsten Strasse.");
                    }
                    return moveCarTowardAutopilotRoad(car, match, speed, dt);
                }
                setAutopilotRoadMatch(state, match);
            }
            let pose = advanceAutopilotAlongRoad(state, speed * dt);
            if (!pose) {
                if (runInternalModule("autopilotRouting", (() => rebuildAutopilotRoute(state, carPosition)), !1, "Route waehrend Fahrt neu berechnen"))
                    pose = advanceAutopilotAlongRoad(state, speed * dt);
                if (!pose) {
                    stopAutopilot("keine gueltige Route gefunden", !0);
                    return !1;
                }
            }
            applyAutopilotPose(car, pose, speed);
            syncAutopilotDebug();
            return !0;
        }

        function getControlManager() {
            return runtimeState.game && runtimeState.game.controlManager || null;
        }

        function getPlayerCar() {
            const manager = getControlManager();
            return manager && manager.controllableCar || null;
        }

        function getControlPosition() {
            const manager = getControlManager();
            try {
                if (manager && "function" == typeof manager.getPosition)
                    return manager.getPosition();
            } catch (positionError) {}
            if (manager && !manager.inCar && manager.controlableHuman && "function" == typeof manager.controlableHuman.getPosition)
                return manager.controlableHuman.getPosition();
            const car = getPlayerCar();
            return car && typeof car.getPosition === "function" ? car.getPosition() : null;
        }

        function getPlayerPosition() {
            const car = getPlayerCar();
            return car && typeof car.getPosition === "function" ? car.getPosition() : getControlPosition();
        }

        function setPlayerCarHidden(hidden) {
            const car = getPlayerCar();
            if (!car)
                return;
            for (const object of [car.group, car.trailer && car.trailer.group])
                object && (object.visible = !hidden);
        }

        function forcePlayerOutOfCar() {
            const manager = getControlManager();
            if (!manager || !manager.inCar || "function" != typeof manager.getOutCar)
                return !1;
            try {
                manager.inCar = !1;
                manager.getOutCar();
                return !0;
            } catch (leaveError) {
                manager.inCar = !0;
                return !1;
            }
        }

        function forcePlayerIntoCar() {
            const manager = getControlManager();
            if (!manager)
                return !1;
            if ("function" == typeof manager.getInCar)
                try {
                    manager.inCar = !0;
                    manager.getInCar();
                    return !0;
                } catch (enterError) {}
            manager.inCar = !0;
            return !0;
        }

        function notifyRuntime(message, kind) {
            const manager = runtimeState.game && runtimeState.game.snackBarManager;
            try {
                if (manager && "error" === kind && typeof manager.createErrorSnacbkar === "function")
                    return manager.createErrorSnacbkar(message);
                if (manager && typeof manager.createInfoSnacbkar === "function")
                    return manager.createInfoSnacbkar(message);
            } catch (notifyError) {}
            log(message);
        }

        function getGameWallet() {
            const wallet = runtimeState.game && runtimeState.game.wallet;
            return wallet && "object" == typeof wallet ? wallet : null;
        }

        function ensureStartingMoney(game=runtimeState.game) {
            if (runtimeState.startMoneyGranted || featureState.hardStart)
                return;
            const wallet = getGameWallet();
            const savedGame = game && game.gameEnvironment && game.gameEnvironment.savedGame;
            if (!wallet)
                return;
            if (savedGame) {
                runtimeState.startMoneyGranted = !0;
                return;
            }
            const current = Number(wallet.amount);
            if (!Number.isFinite(current))
                return;
            current < STARTING_MONEY && setPlayerMoney(STARTING_MONEY);
            runtimeState.startMoneyGranted = !0;
        }

        function getPlayerMoney() {
            const wallet = getGameWallet();
            return wallet && Number.isFinite(Number(wallet.amount)) ? Number(wallet.amount) : Number(runtimeState.playerMoney) || 0;
        }

        function setPlayerMoney(value) {
            const nextValue = Number(value) || 0;
            const wallet = getGameWallet();
            runtimeState.playerMoney = nextValue;
            if (wallet) {
                wallet.amount = nextValue;
                typeof wallet.updateValue === "function" && wallet.updateValue();
            }
            syncFeatureMenu();
        }

        function receivePlayerMoney(amount) {
            const value = Math.max(0, Number(amount) || 0);
            if (!value)
                return;
            const wallet = getGameWallet();
            if (wallet && typeof wallet.receive === "function")
                wallet.receive(value),
                runtimeState.playerMoney = Number(wallet.amount) || getPlayerMoney();
            else
                runtimeState.playerMoney += value,
                notifyRuntime(`+${value.toFixed(0)} EUR`);
            syncFeatureMenu();
        }

        function payPlayerMoney(amount) {
            const value = Math.max(0, Number(amount) || 0);
            if (!value)
                return;
            const wallet = getGameWallet();
            if (wallet && typeof wallet.pay === "function")
                wallet.pay(value),
                runtimeState.playerMoney = Number(wallet.amount) || getPlayerMoney();
            else
                runtimeState.playerMoney -= value,
                notifyRuntime(`-${value.toFixed(0)} EUR`, "error");
            syncFeatureMenu();
        }

        function clearTownSignsVisuals() {
            townSignsState.rebuildQueued = !1;
            townSignsState.signCount = 0;
            townSignsState.debugSigns = [];
            if (townSignsState.overlayGroup)
                clearTownOverlayChildren(townSignsState.overlayGroup);
        }

        function clearRuntimeOverlayItemsByKind(kinds) {
            const kindSet = new Set(toSafeArray(kinds));
            if (!kindSet.size)
                return;
            const kept = [];
            for (const item of runtimeState.overlayItems) {
                if (!item || !kindSet.has(item.kind)) {
                    item && kept.push(item);
                    continue;
                }
                item.group && item.group.parent && item.group.parent.remove(item.group);
                item.group && disposeObject3D(item.group);
            }
            runtimeState.overlayItems = kept;
        }

        function clearCustomBuildingTransientPerfCaches(clearCatalogCaches=!1) {
            runtimeState.customBuildingTerrainYCache instanceof Map && runtimeState.customBuildingTerrainYCache.clear();
            runtimeState.customBuildingCollisionQueryCache instanceof Map && runtimeState.customBuildingCollisionQueryCache.clear();
            runtimeState.customBuildingCullCursor = 0;
            if (clearCatalogCaches) {
                runtimeState.customBuildingAutoEntryCache instanceof Map && runtimeState.customBuildingAutoEntryCache.clear();
                runtimeState.customBuildingWindowLayoutCache instanceof Map && runtimeState.customBuildingWindowLayoutCache.clear();
            }
        }

        function clearAircraftFeatureVisuals() {
            runtimeState.activeAircraft && leaveAircraft();
            clearRuntimeOverlayItemsByKind(["airport", "aircraft"]);
            for (const bot of toSafeArray(runtimeState.botAircraft)) {
                bot && bot.group && bot.group.parent && bot.group.parent.remove(bot.group);
                bot && bot.group && disposeObject3D(bot.group);
            }
            runtimeState.botAircraft = [];
            runtimeState.nextBotAircraftAt = 0;
        }

        function clearCustomBuildingVisualsForLoadedChunks() {
            invalidateWorldCollisionCache();
            clearCustomBuildingTransientPerfCaches();
            const loadedChunks = getLoadedChunks();
            const loadedSet = new Set(loadedChunks);
            for (const chunk of loadedChunks) {
                const overlay = runtimeState.chunkCustomOverlayGroups.get(chunk);
                if (overlay) {
                    overlay.parent && overlay.parent.remove(overlay);
                    clearCustomBuildingOverlayChildren(overlay);
                    overlay.userData.tmBuildSignature = "";
                }
                resetCustomBuildingPreparationForChunk(chunk);
            }
            const remainingDoors = [];
            for (const item of runtimeState.customBuildingDoorItems)
                item && !loadedSet.has(item.chunk) && remainingDoors.push(item);
            runtimeState.customBuildingDoorItems = remainingDoors;
        }

        function getFeatureFault(name) {
            return featureFaultState.faults && featureFaultState.faults[name] || null;
        }

        function clearFeatureFault(name) {
            if (!featureFaultState.faults || !featureFaultState.faults[name])
                return;
            delete featureFaultState.faults[name];
            saveFeatureFaultStateToCookies();
        }

        function applyFeatureSideEffects(name) {
            if ("customBuildings" === name || "auto3dBuildings" === name) {
                invalidateWorldCollisionCache();
                clearCustomBuildingTransientPerfCaches(!0);
                for (const chunk of getLoadedChunks())
                    resetCustomBuildingPreparationForChunk(chunk);
                if (isAny3dBuildingFeatureEnabled())
                    prepareCustomBuildingsForChunks(getLoadedChunks(), "feature_toggle");
                else
                    clearCustomBuildingVisualsForLoadedChunks();
            } else if ("townSigns" === name) {
                featureState.townSigns ? queueTownRebuild("feature_toggle") : clearTownSignsVisuals();
            } else if ("shops" === name) {
                featureState.shops ? rebuildPoiOverlays() : clearRuntimeOverlayItemsByKind(["poi", "bees"]);
            } else if ("birds" === name && !featureState.birds) {
                clearRuntimeOverlayItemsByKind(["birds"]);
            } else if ("bees" === name && !featureState.bees) {
                clearRuntimeOverlayItemsByKind(["bees"]);
            } else if ("aircraft" === name && !featureState.aircraft) {
                clearAircraftFeatureVisuals();
            } else if ("customMissions" === name) {
                syncRuntimeCustomMissionOptions();
            } else if ("vehicleTuning" === name && !featureState.vehicleTuning) {
                vehicleTuningState.active = !1;
                vehicleTuningState.visible = !1;
                vehicleTuningState.panel && (vehicleTuningState.panel.style.display = "none");
                syncVehicleTuningPanel();
            } else if ("autopilot" === name && !featureState.autopilot) {
                stopAutopilot("Feature deaktiviert", !1);
            } else if ("navigation" === name && !featureState.navigation) {
                runtimeState.navPanel && (runtimeState.navPanel.style.display = "none");
                runtimeState.navVisible = !1;
                clearNaviGuidance();
            } else if ("buildingTextures" === name) {
                notifyRuntime("Building textures werden nach dem naechsten Reload voll wirksam.");
            } else if ("enhancedTrees" === name) {
                notifyRuntime("Enhanced trees gelten fuer neue Chunks oder nach Reload.");
            } else if ("enhancedTerrain" === name || "enhancedRoads" === name) {
                "enhancedRoads" === name && invalidateWorldCollisionCache();
                for (const chunk of getLoadedChunks())
                    queueChunkVisualRefresh(chunk, `feature_${name}`);
            } else if ("collisionHook" === name) {
                invalidateWorldCollisionCache();
            }
        }

        function getDependentFeatures(featureName) {
            const dependents = [];
            for (const [feature, dependencies] of Object.entries(FEATURE_DEPENDENCIES))
                toSafeArray(dependencies).includes(featureName) && dependents.push(feature);
            return dependents;
        }

        function disableDependentFeatures(featureName, reason) {
            for (const dependent of getDependentFeatures(featureName)) {
                if (!featureState[dependent])
                    continue;
                featureState[dependent] = !1;
                applyFeatureSideEffects(dependent);
                notifyRuntime(`${dependent} aus: benoetigt ${featureName}${reason ? ` (${reason})` : ""}.`, "error");
            }
        }

        function enableFeatureDependencies(featureName) {
            for (const dependency of toSafeArray(FEATURE_DEPENDENCIES[featureName])) {
                if (!(dependency in featureState))
                    continue;
                if (featureState[dependency])
                    continue;
                featureState[dependency] = !0;
                clearFeatureFault(dependency);
                clearInternalModuleFaultsForFeature(dependency);
                applyFeatureSideEffects(dependency);
            }
        }

        function markFeatureFault(name, failure, context) {
            if (!(name in featureState))
                return;
            const message = failure && (failure.message || String(failure)) || "Unbekannter Fehler";
            featureFaultState.faults || (featureFaultState.faults = {});
            featureFaultState.faults[name] = {
                message,
                context: context || "",
                at: Date.now()
            };
            const wasActive = !!featureState[name];
            featureState[name] = !1;
            disableDependentFeatures(name, "Basisfunktion fehlerhaft");
            saveFeatureStateToCookies();
            saveFeatureFaultStateToCookies();
            wasActive && applyFeatureSideEffects(name);
            warn(`Feature automatisch deaktiviert: ${name}${context ? ` (${context})` : ""}:`, failure);
            printFunctionHealthTable(`feature_fault:${name}`);
            notifyRuntime(`${name} wurde wegen einem Fehler deaktiviert.`, "error");
            syncFeatureMenu();
        }

        function setFeature(name, value) {
            if (!(name in featureState))
                return;
            const oldValue = featureState[name];
            featureState[name] = !!value;
            if (featureState[name]) {
                clearFeatureFault(name);
                clearInternalModuleFaultsForFeature(name);
                enableFeatureDependencies(name);
            } else {
                disableDependentFeatures(name, "Basisfunktion deaktiviert");
            }
            if ("hardStart" === name && featureState.hardStart) {
                setPlayerMoney(0);
                runtimeState.hardStartLocked = !0;
                runInternalModule("hardStartFlow", (() => {
                    forcePlayerOutOfCar();
                    notifyRuntime("Hard start aktiv: zu Fuss zum Autohaus gehen und dort E druecken.");
                }
                ), null, "Hard start aktivieren");
            }
            oldValue !== featureState[name] && applyFeatureSideEffects(name);
            saveFeatureStateToCookies();
            syncFeatureMenu();
        }

        function syncFeatureMenu() {
            const panels = [document.getElementById("__tmFeatureMenuSection"), document.getElementById("__tmFeatureStartMenuSection")];
            for (const panel of panels) {
                if (!panel)
                    continue;
                const inputs = panel.__tmFeatureInputs || (panel.__tmFeatureInputs = Array.from(panel.querySelectorAll("input[data-feature]")));
                for (const input of inputs) {
                    const feature = input.dataset.feature;
                    const fault = getFeatureFault(feature) || getInternalModuleFaultForFeature(feature);
                    const row = input.closest("label");
                    const checked = !!featureState[feature];
                    const title = fault ? `${fault.context || "Feature-Fehler"}: ${fault.message}` : "";
                    if (input.checked !== checked)
                        input.checked = checked;
                    if (input.title !== title)
                        input.title = title;
                    if (row) {
                        const faultKey = fault ? `${title}` : "";
                        if (row.__tmFeatureFaultKey !== faultKey) {
                            row.__tmFeatureFaultKey = faultKey;
                            row.title = title;
                            row.style.color = fault ? "#ff9f9f" : "";
                            row.style.background = fault ? "rgba(120,0,0,.28)" : "";
                            row.style.border = fault ? "1px solid rgba(255,95,95,.75)" : "1px solid transparent";
                            row.style.borderRadius = "6px";
                            row.style.padding = "3px 5px";
                        }
                    }
                }
            }
            syncDeveloperMenu();
        }

        function createFeatureMenuPanel(id, title) {
            let panel = document.getElementById(id);
            if (panel)
                return panel;
            panel = document.createElement("div");
            panel.id = id;
            panel.style.cssText = "box-sizing:border-box;width:min(760px,calc(100% - 24px));margin:12px auto 0;padding:10px 12px;border-top:1px solid rgba(255,255,255,.16);border-bottom:1px solid rgba(255,255,255,.08);color:inherit;font:600 12px/1.35 Arial,Helvetica,sans-serif;text-align:left;";
            panel.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
                    <div style="letter-spacing:.04em;text-transform:uppercase;opacity:.82;">${title}</div>
                    <button type="button" data-role="openNavi" style="border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:inherit;border-radius:8px;padding:5px 8px;font:inherit;cursor:pointer;">Navi</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:6px 12px;">
                    ${FEATURE_MENU_ITEMS.map(item => `<label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" data-feature="${item.feature}"> ${item.label}</label>`).join("")}
                </div>
            `;
            panel.addEventListener("change", (event => {
                const input = event.target;
                input && input.dataset && input.dataset.feature && setFeature(input.dataset.feature, input.checked);
            }));
            const naviButton = panel.querySelector('[data-role="openNavi"]');
            naviButton && naviButton.addEventListener("click", (event => {
                event.preventDefault();
                event.stopPropagation();
                toggleNaviPanel(!0);
            }));
            return panel;
        }

        function escapeDeveloperText(value) {
            return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]);
        }

        function getDeveloperLabelStyle() {
            return "display:flex;gap:6px;align-items:center;min-width:0;padding:3px 5px;border:1px solid transparent;border-radius:6px;";
        }

        function createDeveloperMenuPanel(id="__tmDeveloperMenuSection") {
            if (!TM_DEVELOPER_MENU_ENABLED)
                return null;
            let panel = document.getElementById(id);
            if (panel)
                return panel;
            if (!document.body)
                return null;
            panel = document.createElement("div");
            panel.id = id;
            panel.style.cssText = "position:fixed;z-index:2147483646;left:50%;top:48px;transform:translateX(-50%);box-sizing:border-box;width:min(920px,calc(100vw - 24px));max-height:calc(100vh - 96px);overflow:auto;padding:12px;border:1px solid rgba(255,190,80,.55);background:rgba(18,18,20,.96);box-shadow:0 18px 50px rgba(0,0,0,.45);color:#f8f3e8;font:600 12px/1.35 Arial,Helvetica,sans-serif;text-align:left;display:none;";
            const featureHtml = Object.keys(featureState).sort().map(feature => `<label style="${getDeveloperLabelStyle()}"><input type="checkbox" data-dev-feature="${escapeDeveloperText(feature)}"> <span>${escapeDeveloperText(feature)}</span></label>`).join("");
            const moduleHtml = getDeveloperModuleItems().map(item => `<label style="${getDeveloperLabelStyle()}"><input type="checkbox" data-dev-module="${escapeDeveloperText(item.name)}"> <span>${escapeDeveloperText(item.label)}${item.feature ? ` (${escapeDeveloperText(item.feature)})` : ""}</span></label>`).join("");
            const perfHtml = DEVELOPER_PERFORMANCE_TOGGLE_ITEMS.map(item => `<label style="${getDeveloperLabelStyle()}"><input type="checkbox" data-dev-toggle="${escapeDeveloperText(item.key)}"> <span>${escapeDeveloperText(item.label)}</span></label>`).join("");
            panel.innerHTML = `
                <details open>
                    <summary style="cursor:pointer;letter-spacing:.04em;text-transform:uppercase;color:#ffd79a;">Developer Menu (F8)</summary>
                    <div style="display:flex;justify-content:flex-end;margin:-20px 0 8px;">
                        <button type="button" data-role="closeDeveloperMenu" style="border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:inherit;border-radius:8px;padding:5px 8px;font:inherit;cursor:pointer;">Schliessen</button>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:9px;">
                        <section>
                            <div style="opacity:.82;margin-bottom:5px;">Features</div>
                            <div style="display:grid;gap:5px;">${featureHtml}</div>
                        </section>
                        <section>
                            <div style="opacity:.82;margin-bottom:5px;">Interne Module</div>
                            <div style="display:grid;gap:5px;">${moduleHtml}</div>
                        </section>
                        <section>
                            <div style="opacity:.82;margin-bottom:5px;">Performance</div>
                            <div style="display:grid;gap:5px;">${perfHtml}</div>
                        </section>
                    </div>
                </details>
            `;
            panel.addEventListener("change", event => {
                const input = event.target;
                if (!input || !input.dataset)
                    return;
                if (input.dataset.devFeature)
                    setFeature(input.dataset.devFeature, input.checked);
                else if (input.dataset.devModule)
                    setDeveloperModuleEnabled(input.dataset.devModule, input.checked);
                else if (input.dataset.devToggle)
                    setDeveloperToggle(input.dataset.devToggle, input.checked);
            });
            panel.addEventListener("keydown", event => event.stopPropagation(), !0);
            panel.addEventListener("keyup", event => event.stopPropagation(), !0);
            const closeButton = panel.querySelector('[data-role="closeDeveloperMenu"]');
            closeButton && closeButton.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                toggleDeveloperMenu(!1);
            });
            document.body.appendChild(panel);
            return panel;
        }

        function toggleDeveloperMenu(forceVisible) {
            if (!TM_DEVELOPER_MENU_ENABLED)
                return;
            const panel = createDeveloperMenuPanel();
            if (!panel)
                return;
            runtimeState.developerMenuVisible = null == forceVisible ? !runtimeState.developerMenuVisible : !!forceVisible;
            panel.style.display = runtimeState.developerMenuVisible ? "block" : "none";
            runtimeState.developerMenuVisible && syncDeveloperMenu();
        }

        function ensureDeveloperMenuHotkey() {
            if (!TM_DEVELOPER_MENU_ENABLED || runtimeState.developerMenuHotkeyInstalled)
                return;
            runtimeState.developerMenuHotkeyInstalled = !0;
            document.addEventListener("keydown", event => {
                if (event.repeat || event.altKey || event.ctrlKey || event.metaKey)
                    return;
                if ("F8" !== (event.code || "") && "F8" !== (event.key || ""))
                    return;
                event.preventDefault();
                event.stopPropagation();
                toggleDeveloperMenu();
            }, !0);
        }

        function markDeveloperRow(row, fault, disabled) {
            if (!row)
                return;
            const faultKey = fault ? `${fault.context || "Fehler"}: ${fault.message}` : disabled ? "Aus" : "";
            if (row.__tmDeveloperFaultKey === faultKey)
                return;
            row.__tmDeveloperFaultKey = faultKey;
            row.title = faultKey;
            row.style.color = fault ? "#ff9f9f" : disabled ? "#ffd79a" : "";
            row.style.background = fault ? "rgba(120,0,0,.28)" : "";
            row.style.border = fault ? "1px solid rgba(255,95,95,.75)" : "1px solid transparent";
        }

        function syncDeveloperMenu() {
            const panel = document.getElementById("__tmDeveloperMenuSection");
            if (!TM_DEVELOPER_MENU_ENABLED) {
                panel && panel.remove();
                return;
            }
            if (!panel)
                return;
            for (const input of panel.querySelectorAll("input[data-dev-feature]")) {
                const feature = input.dataset.devFeature;
                const checked = !!featureState[feature];
                input.checked !== checked && (input.checked = checked);
                markDeveloperRow(input.closest("label"), getFeatureFault(feature) || getInternalModuleFaultForFeature(feature), !checked);
            }
            for (const input of panel.querySelectorAll("input[data-dev-module]")) {
                const moduleName = input.dataset.devModule;
                const checked = isInternalModuleEnabled(moduleName);
                input.checked !== checked && (input.checked = checked);
                markDeveloperRow(input.closest("label"), getInternalModuleFault(moduleName), !checked);
            }
            for (const input of panel.querySelectorAll("input[data-dev-toggle]")) {
                const key = input.dataset.devToggle;
                const checked = isDeveloperToggleEnabled(key);
                input.checked !== checked && (input.checked = checked);
                markDeveloperRow(input.closest("label"), null, !checked);
            }
        }

        function getElementLabelText(element) {
            return normalizeTownLabel((element && (element.textContent || element.value || element.getAttribute && element.getAttribute("aria-label"))) || "");
        }

        function findStartMenuTarget() {
            if (isDeveloperToggleEnabled("perfStartMenuTargetCache")) {
                const cached = runtimeState.startMenuTargetCache;
                const now = performance.now();
                if (cached && cached.target && document.contains(cached.target) && now - (Number(cached.at) || 0) < 900)
                    return cached.target;
            }
            const explicitTarget = document.getElementById("start_menu") || document.getElementById("startMenu") || document.querySelector(".start-menu,.startMenu");
            if (explicitTarget) {
                isDeveloperToggleEnabled("perfStartMenuTargetCache") && (runtimeState.startMenuTargetCache = {
                    target: explicitTarget,
                    at: performance.now()
                });
                return explicitTarget;
            }
            const excludedSelector = "#game_menu,#content_menu,#missionContainer,#menu-container,#special-container,#__tmFeatureMenuSection,#__tmFeatureStartMenuSection,#__tmDeveloperMenuSection";
            const buttons = Array.from(document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]'));
            const openMapButton = buttons.find(element => !element.closest(excludedSelector) && /\b(open\s*map|open\s*world|play)\b/i.test(getElementLabelText(element)));
            if (openMapButton) {
                const target = openMapButton.closest(".main-buttons,.buttons,.start-menu,.startMenu,.menu,.modal,.dialog,.card,section,main") || openMapButton.parentElement;
                isDeveloperToggleEnabled("perfStartMenuTargetCache") && (runtimeState.startMenuTargetCache = {
                    target,
                    at: performance.now()
                });
                return target;
            }
            return null;
        }

        function ensureStartFeatureMenu() {
            if (!document.body)
                return;
            const existingPanel = document.getElementById("__tmFeatureStartMenuSection");
            const target = findStartMenuTarget();
            if (!target) {
                existingPanel && existingPanel.closest("#missionContainer,#game_menu,#content_menu") && existingPanel.remove();
                return;
            }
            const panel = createFeatureMenuPanel("__tmFeatureStartMenuSection", "TM Gameplay vor Start");
            if (target.matches && target.matches(".main-buttons,.buttons") && target.parentNode) {
                if (panel.previousElementSibling !== target)
                    target.insertAdjacentElement("afterend", panel);
            } else if (panel.parentNode !== target)
                target.appendChild(panel);
            runtimeState.startFeaturePanel = panel;
            syncFeatureMenu();
        }

        function ensureStartMenuFeatureWatcher() {
            if (runtimeState.startMenuFeatureWatcherInstalled) {
                ensureStartFeatureMenu();
                return;
            }
            runtimeState.startMenuFeatureWatcherInstalled = !0;
            const refresh = () => ensureStartFeatureMenu();
            refresh();
            document.addEventListener("DOMContentLoaded", refresh);
            setInterval(refresh, 1200);
            if (document.documentElement) {
                const observer = new MutationObserver(refresh);
                observer.observe(document.documentElement, {
                    childList: !0,
                    subtree: !0
                });
                runtimeState.startMenuFeatureObserver = observer;
            }
        }

        function ensureFeatureMenu(game) {
            ensureStartFeatureMenu();
            const oldFloatingPanel = document.getElementById("__tmFeaturePanel");
            oldFloatingPanel && oldFloatingPanel.remove();
            const target = document.getElementById("content_menu") || document.getElementById("game_menu");
            if (!target)
                return;
            const panel = createFeatureMenuPanel("__tmFeatureMenuSection", "TM Gameplay");
            const mainButtons = target.querySelector(".main-buttons");
            if (mainButtons && mainButtons.parentNode)
                mainButtons.insertAdjacentElement("afterend", panel);
            else if (panel.parentNode !== target)
                target.appendChild(panel);
            ensureDeveloperMenuHotkey();
            runtimeState.featurePanel = panel;
            syncFeatureMenu();
        }

        function ensureRuntimeOverlayGroup() {
            const scene = townSignsState.scene || runtimeState.game && runtimeState.game.scene;
            if (!scene || !globalState.THREE)
                return null;
            if (!runtimeState.overlayGroup) {
                runtimeState.overlayGroup = new globalState.THREE.Group;
                runtimeState.overlayGroup.name = "__tmRuntimeGameplayOverlay";
            }
            if (runtimeState.overlayAttachedTo !== scene) {
                runtimeState.overlayAttachedTo && runtimeState.overlayAttachedTo.remove(runtimeState.overlayGroup);
                scene.add(runtimeState.overlayGroup);
                runtimeState.overlayAttachedTo = scene;
            }
            return runtimeState.overlayGroup;
        }

        function getTerrainYWorld(position, fallback=0) {
            const game = runtimeState.game;
            if (!game || !game.chunkManager || !position)
                return fallback;
            try {
                const chunk = game.chunkManager.getCurrentChunk ? game.chunkManager.getCurrentChunk(position) : null;
                if (chunk && typeof chunk.getTerrainYLoc === "function") {
                    const localX = position.x - (chunk.cx || 0);
                    const localZ = position.z - (chunk.cz || 0);
                    const y = chunk.getTerrainYLoc(localX, localZ);
                    if (Number.isFinite(y) && y > -999)
                        return y;
                }
            } catch (terrainError) {}
            return fallback;
        }

        function getCachedCustomTerrainYWorld(position, fallback=0) {
            const game = runtimeState.game;
            if (!game || !game.chunkManager || !position)
                return fallback;
            try {
                const chunk = game.chunkManager.getCurrentChunk ? game.chunkManager.getCurrentChunk(position) : null;
                if (!chunk || "function" != typeof chunk.getTerrainYLoc)
                    return fallback;
                const localX = position.x - (chunk.cx || 0);
                const localZ = position.z - (chunk.cz || 0);
                if (!isDeveloperToggleEnabled("perfTerrainYCache")) {
                    const directY = chunk.getTerrainYLoc(localX, localZ);
                    return Number.isFinite(directY) && directY > -999 ? directY : fallback;
                }
                const key = [
                    Math.round(Number(chunk.cx) || 0),
                    Math.round(Number(chunk.cz) || 0),
                    Math.round(localX * 4) / 4,
                    Math.round(localZ * 4) / 4
                ].join(":");
                if (runtimeState.customBuildingTerrainYCache.has(key))
                    return runtimeState.customBuildingTerrainYCache.get(key);
                const y = chunk.getTerrainYLoc(localX, localZ);
                if (Number.isFinite(y) && y > -999)
                    return rememberLimitedCache(runtimeState.customBuildingTerrainYCache, key, y, CUSTOM_BUILDING_PERF.terrainCacheSize);
            } catch (terrainError) {}
            return fallback;
        }

        function getChunkWorldOffset(chunk) {
            if (!globalState.THREE)
                return null;
            return chunk && chunk.centerVec && chunk.centerVec.clone ? chunk.centerVec.clone() : new globalState.THREE.Vector3(Number(chunk && chunk.cx) || 0,0,Number(chunk && chunk.cz) || 0);
        }

        function offsetFootprintToWorld(points, offset) {
            const ox = Number(offset && offset.x) || 0;
            const oz = Number(offset && offset.z) || 0;
            const result = [];
            for (const point of toSafeArray(points)) {
                const x = (Number(point && point.x) || 0) + ox;
                const z = (Number(point && point.z) || 0) + oz;
                Number.isFinite(x) && Number.isFinite(z) && result.push({
                    x,
                    z
                });
            }
            return result;
        }

        function getBuildingWorldFootprint(building, spec, chunk) {
            const local = getBuildingFootprint(building, spec || {});
            if (!local.length)
                return [];
            const offset = building && building.chunkCenter || getChunkWorldOffset(chunk);
            return offsetFootprintToWorld(local, offset);
        }

        function getMatchCollisionLocalFootprint(match) {
            if (Array.isArray(match && match.__tmCollisionLocalFootprint) && match.__tmCollisionLocalFootprint.length >= 3)
                return match.__tmCollisionLocalFootprint;
            const building = match && match.building;
            const entry = match && match.entry;
            const raw = getBuildingFootprint(building, entry || {});
            if (!raw.length)
                return [];
            const fitted = fitBuildingFootprintToEnvironment(raw, match);
            const output = Array.isArray(fitted) && fitted.length >= 3 ? fitted : raw;
            match && (match.__tmCollisionLocalFootprint = output);
            return output;
        }

        function getMatchCollisionWorldFootprint(match, chunk) {
            const local = getMatchCollisionLocalFootprint(match);
            if (!local.length)
                return [];
            const building = match && match.building;
            const offset = building && building.chunkCenter || getChunkWorldOffset(chunk);
            return offsetFootprintToWorld(local, offset);
        }

        function getSegmentClosestPoint2D(point, start, end) {
            const px = Number(point && point.x) || 0;
            const pz = Number(point && point.z) || 0;
            const ax = Number(start && start.x) || 0;
            const az = Number(start && start.z) || 0;
            const bx = Number(end && end.x) || 0;
            const bz = Number(end && end.z) || 0;
            const abx = bx - ax;
            const abz = bz - az;
            const lengthSq = abx * abx + abz * abz || 1;
            const t = clamp(((px - ax) * abx + (pz - az) * abz) / lengthSq, 0, 1);
            return {
                x: ax + abx * t,
                z: az + abz * t,
                t
            };
        }

        function getCirclePolygonSeparation(point, polygon, radius) {
            if (!point || !Array.isArray(polygon) || polygon.length < 3)
                return null;
            const safeRadius = Math.max(.05, Number(radius) || .05);
            const inside = isPointInsideFootprint(point, polygon);
            let best = null;
            for (let index = 0; index < polygon.length; index++) {
                const a = polygon[index];
                const b = polygon[(index + 1) % polygon.length];
                const closest = getSegmentClosestPoint2D(point, a, b);
                const distance = Math.hypot((Number(point.x) || 0) - closest.x, (Number(point.z) || 0) - closest.z);
                if (!best || distance < best.distance)
                    best = {
                        distance,
                        closest,
                        a,
                        b
                    };
            }
            if (!best)
                return null;
            if (!inside && best.distance >= safeRadius)
                return null;
            let dx = inside ? best.closest.x - (Number(point.x) || 0) : (Number(point.x) || 0) - best.closest.x;
            let dz = inside ? best.closest.z - (Number(point.z) || 0) : (Number(point.z) || 0) - best.closest.z;
            let length = Math.hypot(dx, dz);
            if (length < 1e-5) {
                const center = getFootprintCenter(polygon);
                dx = (Number(point.x) || 0) - center.x;
                dz = (Number(point.z) || 0) - center.z;
                length = Math.hypot(dx, dz) || 1;
            }
            const amount = inside ? best.distance + safeRadius : safeRadius - best.distance;
            return amount > .001 ? {
                x: dx / length * amount,
                z: dz / length * amount,
                amount
            } : null;
        }

        function getCircleSegmentSeparation(point, start, end, radius) {
            const closest = getSegmentClosestPoint2D(point, start, end);
            let dx = (Number(point && point.x) || 0) - closest.x;
            let dz = (Number(point && point.z) || 0) - closest.z;
            let distance = Math.hypot(dx, dz);
            const safeRadius = Math.max(.05, Number(radius) || .05);
            if (distance >= safeRadius)
                return null;
            if (distance < 1e-5) {
                dx = -((Number(end && end.z) || 0) - (Number(start && start.z) || 0));
                dz = (Number(end && end.x) || 0) - (Number(start && start.x) || 0);
                distance = Math.hypot(dx, dz) || 1;
            }
            const amount = safeRadius - distance;
            return {
                x: dx / distance * amount,
                z: dz / distance * amount,
                amount
            };
        }

        function getCircleObbSeparation(point, center, halfX, halfZ, rotationY, radius) {
            if (!point || !center)
                return null;
            const cos = Math.cos(Number(rotationY) || 0);
            const sin = Math.sin(Number(rotationY) || 0);
            const axisX = {
                x: cos,
                z: -sin
            };
            const axisZ = {
                x: sin,
                z: cos
            };
            const dxWorld = (Number(point.x) || 0) - (Number(center.x) || 0);
            const dzWorld = (Number(point.z) || 0) - (Number(center.z) || 0);
            const localX = dxWorld * axisX.x + dzWorld * axisX.z;
            const localZ = dxWorld * axisZ.x + dzWorld * axisZ.z;
            const hx = Math.max(.05, Number(halfX) || .05);
            const hz = Math.max(.05, Number(halfZ) || .05);
            const clampedX = clamp(localX, -hx, hx);
            const clampedZ = clamp(localZ, -hz, hz);
            let sepX = localX - clampedX;
            let sepZ = localZ - clampedZ;
            let distance = Math.hypot(sepX, sepZ);
            const inside = Math.abs(localX) <= hx && Math.abs(localZ) <= hz;
            const safeRadius = Math.max(.05, Number(radius) || .05);
            if (!inside && distance >= safeRadius)
                return null;
            if (inside) {
                const sideX = hx - Math.abs(localX);
                const sideZ = hz - Math.abs(localZ);
                if (sideX < sideZ) {
                    sepX = Math.sign(localX || 1);
                    sepZ = 0;
                    distance = sideX;
                } else {
                    sepX = 0;
                    sepZ = Math.sign(localZ || 1);
                    distance = sideZ;
                }
            } else if (distance < 1e-5) {
                sepX = Math.sign(localX || 1);
                sepZ = 0;
                distance = 1;
            }
            const amount = inside ? distance + safeRadius : safeRadius - distance;
            if (amount <= .001)
                return null;
            const len = Math.hypot(sepX, sepZ) || 1;
            const localPushX = sepX / len * amount;
            const localPushZ = sepZ / len * amount;
            return {
                x: axisX.x * localPushX + axisZ.x * localPushZ,
                z: axisX.z * localPushX + axisZ.z * localPushZ,
                amount
            };
        }

        function applyCollisionSeparation(position, separation) {
            if (!position || !separation)
                return !1;
            position.x += separation.x;
            position.z += separation.z;
            return !0;
        }

        function getOverlayMaterialCache() {
            runtimeState.overlayMaterialCache instanceof Map || (runtimeState.overlayMaterialCache = new Map);
            return runtimeState.overlayMaterialCache;
        }

        function getOverlayGeometryCache() {
            runtimeState.overlayGeometryCache instanceof Map || (runtimeState.overlayGeometryCache = new Map);
            return runtimeState.overlayGeometryCache;
        }

        function getSharedOverlayBoxGeometry(size) {
            const THREE = globalState.THREE;
            const safeSize = [
                Math.max(.001, Number(size && size[0]) || .001),
                Math.max(.001, Number(size && size[1]) || .001),
                Math.max(.001, Number(size && size[2]) || .001)
            ];
            if (!isDeveloperToggleEnabled("perfSharedGeometryCaches"))
                return new THREE.BoxGeometry(safeSize[0], safeSize[1], safeSize[2]);
            const key = `box:${makeRoundedNumberKey(safeSize)}`;
            const cache = getOverlayGeometryCache();
            const cached = cache.get(key);
            if (cached)
                return cached;
            const geometry = new THREE.BoxGeometry(safeSize[0], safeSize[1], safeSize[2]);
            markSharedResource(geometry, "overlay-box-geometry");
            return rememberLimitedCache(cache, key, geometry, CUSTOM_BUILDING_PERF.overlayGeometryCacheSize);
        }

        function getSharedOverlayCylinderGeometry(radiusTop, radiusBottom, height, segments=16) {
            const THREE = globalState.THREE;
            const top = Math.max(0, Number(radiusTop) || 0);
            const bottom = Math.max(0, Number(radiusBottom) || 0);
            const safeHeight = Math.max(.001, Number(height) || .001);
            const safeSegments = Math.max(3, Math.min(32, Math.round(Number(segments) || 16)));
            if (!isDeveloperToggleEnabled("perfSharedGeometryCaches"))
                return new THREE.CylinderGeometry(top, bottom, safeHeight, safeSegments);
            const key = `cylinder:${makeRoundedNumberKey([top, bottom, safeHeight])}:${safeSegments}`;
            const cache = getOverlayGeometryCache();
            const cached = cache.get(key);
            if (cached)
                return cached;
            const geometry = new THREE.CylinderGeometry(top, bottom, safeHeight, safeSegments);
            markSharedResource(geometry, "overlay-cylinder-geometry");
            return rememberLimitedCache(cache, key, geometry, CUSTOM_BUILDING_PERF.overlayGeometryCacheSize);
        }

        function getSharedOverlayConeGeometry(radius, height, segments=16) {
            return getSharedOverlayCylinderGeometry(0, radius, height, segments);
        }

        function getSharedOverlaySphereGeometry() {
            if (!isDeveloperToggleEnabled("perfSharedGeometryCaches"))
                return new globalState.THREE.SphereGeometry(1, 24, 12);
            if (runtimeState.overlaySphereGeometry)
                return runtimeState.overlaySphereGeometry;
            const geometry = new globalState.THREE.SphereGeometry(1, 24, 12);
            markSharedResource(geometry, "overlay-sphere-geometry");
            runtimeState.overlaySphereGeometry = geometry;
            return geometry;
        }

        function getSharedOverlayLambertMaterial(colorValue) {
            const THREE = globalState.THREE;
            const color = toThreeColor(colorValue, 0xffffff);
            if (!isDeveloperToggleEnabled("perfMaterialCaches"))
                return new THREE.MeshLambertMaterial({
                    color
                });
            const colorKey = color && "function" == typeof color.getHexString ? color.getHexString() : String(colorValue);
            const key = `lambert:${colorKey}`;
            const cache = getOverlayMaterialCache();
            const cached = cache.get(key);
            if (cached)
                return cached;
            const material = new THREE.MeshLambertMaterial({
                color
            });
            markSharedResource(material, "overlay-material");
            return rememberLimitedCache(cache, key, material, CUSTOM_BUILDING_PERF.overlayMaterialCacheSize);
        }

        function getSharedOverlayBasicMaterial(colorValue, options={}) {
            const THREE = globalState.THREE;
            const color = toThreeColor(colorValue, 0xffffff);
            const opacity = null != options.opacity ? clamp(Number(options.opacity) || 0, .02, 1) : 1;
            const side = null != options.side ? options.side : THREE.DoubleSide;
            const depthWrite = "boolean" == typeof options.depthWrite ? options.depthWrite : !0;
            const baseOptions = {
                color,
                transparent: !!options.transparent,
                opacity,
                side,
                depthWrite
            };
            if (!isDeveloperToggleEnabled("perfMaterialCaches"))
                return THREE.MeshBasicMaterial ? new THREE.MeshBasicMaterial(baseOptions) : THREE.MeshLambertMaterial ? new THREE.MeshLambertMaterial(baseOptions) : new THREE.MeshStandardMaterial(Object.assign({
                    roughness: .6,
                    metalness: .1
                }, baseOptions));
            const colorKey = color && "function" == typeof color.getHexString ? color.getHexString() : String(colorValue);
            const materialKind = THREE.MeshBasicMaterial ? "basic" : THREE.MeshLambertMaterial ? "lambert" : "standard";
            const key = isDeveloperToggleEnabled("perfBasicMaterialKey") ? `basic|${colorKey}|${options.transparent ? 1 : 0}|${Math.round(opacity * 1e3) / 1e3}|${side}|${depthWrite ? 1 : 0}|${materialKind}` : [
                "basic",
                colorKey,
                options.transparent ? 1 : 0,
                Math.round(opacity * 1e3) / 1e3,
                side,
                depthWrite ? 1 : 0,
                materialKind
            ].join("|");
            const cache = getOverlayMaterialCache();
            const cached = cache.get(key);
            if (cached)
                return cached;
            const material = THREE.MeshBasicMaterial ? new THREE.MeshBasicMaterial(baseOptions) : THREE.MeshLambertMaterial ? new THREE.MeshLambertMaterial(baseOptions) : new THREE.MeshStandardMaterial(Object.assign({
                roughness: .6,
                metalness: .1
            }, baseOptions));
            markSharedResource(material, "overlay-basic-material");
            return rememberLimitedCache(cache, key, material, CUSTOM_BUILDING_PERF.overlayMaterialCacheSize);
        }

        function createBox(size, color, position) {
            const THREE = globalState.THREE;
            const mesh = new THREE.Mesh(getSharedOverlayBoxGeometry(size), getSharedOverlayLambertMaterial(color));
            position && mesh.position.set(position[0], position[1], position[2]);
            return mesh;
        }

        function getRoadEdgeHalfWidth(edge) {
            try {
                const left = "function" == typeof edge.getLeftSize ? Math.abs(Number(edge.getLeftSize()) || 0) : 0;
                const right = "function" == typeof edge.getRightSize ? Math.abs(Number(edge.getRightSize()) || 0) : 0;
                if (left + right > .1)
                    return Math.max(2.4, (left + right) / 2);
            } catch (roadWidthError) {}
            return Math.max(2.4, (Number(edge && edge.width) || 8) / 2);
        }

        function getSegmentBounds2D(start, end, padding=0) {
            const px = Math.max(0, Number(padding) || 0);
            return {
                minX: Math.min(Number(start && start.x) || 0, Number(end && end.x) || 0) - px,
                maxX: Math.max(Number(start && start.x) || 0, Number(end && end.x) || 0) + px,
                minZ: Math.min(Number(start && start.z) || 0, Number(end && end.z) || 0) - px,
                maxZ: Math.max(Number(start && start.z) || 0, Number(end && end.z) || 0) + px
            };
        }

        function isPositionInBounds2D(position, bounds, padding=0) {
            if (!position || !bounds)
                return !1;
            const px = Math.max(0, Number(padding) || 0);
            return position.x >= bounds.minX - px && position.x <= bounds.maxX + px && position.z >= bounds.minZ - px && position.z <= bounds.maxZ + px;
        }

        function getWorldCollisionChunkId(chunk, state) {
            let chunkId = chunk && state.chunkIds.get(chunk);
            if (chunk && !chunkId) {
                state.chunkIdCounter = (Number(state.chunkIdCounter) || 0) + 1;
                chunkId = state.chunkIdCounter;
                state.chunkIds.set(chunk, chunkId);
            }
            return chunkId || 0;
        }

        function getWorldCollisionChunkSignaturePart(chunk, state) {
            const chunkId = getWorldCollisionChunkId(chunk, state);
            const matches = chunk && (chunk.__tmMatchedCustomBuildings || runtimeState.customBuildingEntriesByChunk.get(chunk)) || [];
            const edges = chunk && chunk.newRoadGraph && chunk.newRoadGraph.edges || [];
            return `${chunkId}:${Math.round(Number(chunk && chunk.cx) || 0)}:${Math.round(Number(chunk && chunk.cz) || 0)}:${Array.isArray(matches) ? matches.length : 0}:${Array.isArray(edges) ? edges.length : 0}:${chunk && chunk.__tmCustomBuildingOverlayReady ? 1 : 0}`;
        }

        function getWorldCollisionSingleChunkSignature(chunk) {
            return getWorldCollisionChunkSignaturePart(chunk, getWorldCollisionState());
        }

        function getWorldCollisionChunkSignature(chunks) {
            const state = getWorldCollisionState();
            const safeChunks = toSafeArray(chunks);
            const now = performance.now();
            if (isDeveloperToggleEnabled("perfCollisionSignatureCache") && state.signatureChunks === chunks && state.signatureValue && now - (Number(state.signatureAt) || 0) < CUSTOM_BUILDING_PERF.signatureCacheMs)
                return state.signatureValue;
            const parts = [];
            const useFastChunkParts = isDeveloperToggleEnabled("perfSingleChunkSignature");
            for (const chunk of safeChunks) {
                if (useFastChunkParts)
                    parts.push(getWorldCollisionChunkSignaturePart(chunk, state));
                else {
                    const chunkId = getWorldCollisionChunkId(chunk, state);
                    const matches = chunk && (chunk.__tmMatchedCustomBuildings || runtimeState.customBuildingEntriesByChunk.get(chunk)) || [];
                    const edges = chunk && chunk.newRoadGraph && chunk.newRoadGraph.edges || [];
                    parts.push([
                        chunkId,
                        Math.round(Number(chunk && chunk.cx) || 0),
                        Math.round(Number(chunk && chunk.cz) || 0),
                        Array.isArray(matches) ? matches.length : 0,
                        Array.isArray(edges) ? edges.length : 0,
                        chunk && chunk.__tmCustomBuildingOverlayReady ? 1 : 0
                    ].join(":"));
                }
            }
            parts.length > 1 && parts.sort();
            const signature = parts.join("|");
            if (isDeveloperToggleEnabled("perfCollisionSignatureCache")) {
                state.signatureChunks = chunks;
                state.signatureValue = signature;
                state.signatureAt = now;
            }
            return signature;
        }

        function appendWorldCollisionStaticCache(target, source) {
            if (!target || !source)
                return;
            const append = (targetList, sourceList) => {
                if (!Array.isArray(targetList) || !Array.isArray(sourceList) || !sourceList.length)
                    return;
                for (let index = 0; index < sourceList.length; index++)
                    targetList.push(sourceList[index]);
            };
            append(target.buildingPolygons, source.buildingPolygons);
            append(target.customWallSegments, source.customWallSegments);
            append(target.customFallbackPolygons, source.customFallbackPolygons);
            append(target.tunnelWallSegments, source.tunnelWallSegments);
        }

        function createCollisionSpatialIndex() {
            return {
                buildingPolygons: new Map,
                customWallSegments: new Map,
                customFallbackPolygons: new Map,
                tunnelWallSegments: new Map,
                overflow: {
                    buildingPolygons: [],
                    customWallSegments: [],
                    customFallbackPolygons: [],
                    tunnelWallSegments: []
                }
            };
        }

        function getCollisionBucketCoord(value) {
            return Math.floor((Number(value) || 0) / CUSTOM_BUILDING_PERF.collisionBucketSize);
        }

        function getCollisionBucketKey(x, z) {
            return `${x}:${z}`;
        }

        function addCollisionSpatialItem(index, type, item, bounds) {
            if (!index || !index[type] || !item || !bounds) {
                index && index.overflow && index.overflow[type] && index.overflow[type].push(item);
                return;
            }
            const minX = getCollisionBucketCoord(bounds.minX);
            const maxX = getCollisionBucketCoord(bounds.maxX);
            const minZ = getCollisionBucketCoord(bounds.minZ);
            const maxZ = getCollisionBucketCoord(bounds.maxZ);
            const bucketCount = Math.max(1, maxX - minX + 1) * Math.max(1, maxZ - minZ + 1);
            if (bucketCount > 80) {
                index.overflow[type].push(item);
                return;
            }
            for (let x = minX; x <= maxX; x++)
                for (let z = minZ; z <= maxZ; z++) {
                    const key = getCollisionBucketKey(x, z);
                    let bucket = index[type].get(key);
                    if (!bucket) {
                        bucket = [];
                        index[type].set(key, bucket);
                    }
                    bucket.push(item);
                }
        }

        function buildCollisionSpatialIndex(cache) {
            if (!cache)
                return null;
            if (cache.spatialIndex)
                return cache.spatialIndex;
            const index = createCollisionSpatialIndex();
            for (const item of Array.isArray(cache.buildingPolygons) ? cache.buildingPolygons : [])
                addCollisionSpatialItem(index, "buildingPolygons", item, item && item.bounds);
            for (const item of Array.isArray(cache.customWallSegments) ? cache.customWallSegments : [])
                addCollisionSpatialItem(index, "customWallSegments", item, item && item.bounds);
            for (const item of Array.isArray(cache.customFallbackPolygons) ? cache.customFallbackPolygons : [])
                addCollisionSpatialItem(index, "customFallbackPolygons", item, item && item.bounds);
            for (const item of Array.isArray(cache.tunnelWallSegments) ? cache.tunnelWallSegments : [])
                addCollisionSpatialItem(index, "tunnelWallSegments", item, item && item.bounds);
            cache.spatialIndex = index;
            return index;
        }

        function getCollisionSpatialCandidates(cache, type, position, padding=0) {
            if (!isDeveloperToggleEnabled("perfCollisionSpatialIndex"))
                return Array.isArray(cache && cache[type]) ? cache[type] : [];
            const index = buildCollisionSpatialIndex(cache);
            if (!index || !index[type])
                return [];
            const size = CUSTOM_BUILDING_PERF.collisionBucketSize;
            const range = Math.max(0, Math.ceil((Number(padding) || 0) / size));
            const centerX = getCollisionBucketCoord(position && position.x);
            const centerZ = getCollisionBucketCoord(position && position.z);
            if (isDeveloperToggleEnabled("perfCollisionCandidateFastPath") && 0 === range) {
                const bucketItems = index[type].get(getCollisionBucketKey(centerX, centerZ)) || [];
                const overflowItems = index.overflow && index.overflow[type];
                if (!overflowItems || !overflowItems.length)
                    return bucketItems;
                if (!bucketItems.length)
                    return overflowItems;
                const merged = bucketItems.slice();
                const seen = new Set(bucketItems);
                for (const item of overflowItems)
                    item && !seen.has(item) && (seen.add(item),
                    merged.push(item));
                return merged;
            }
            const seen = new Set;
            const candidates = [];
            const addItem = item => {
                if (!item || seen.has(item))
                    return;
                seen.add(item);
                candidates.push(item);
            };
            for (let x = centerX - range; x <= centerX + range; x++)
                for (let z = centerZ - range; z <= centerZ + range; z++) {
                    const bucketItems = index[type].get(getCollisionBucketKey(x, z));
                    if (!bucketItems)
                        continue;
                    for (const item of bucketItems)
                        addItem(item);
                }
            const overflowItems = index.overflow && index.overflow[type];
            if (overflowItems)
                for (const item of overflowItems)
                    addItem(item);
            return candidates;
        }

        function getWallOpeningCollisionSignature(entry) {
            const openings = entry && entry.__tmWallOpenings;
            if (!openings || "object" != typeof openings)
                return "no-openings";
            if (isDeveloperToggleEnabled("perfWallOpeningCollisionSignature")) {
                if (entry.__tmWallOpeningCollisionSignatureSource === openings && entry.__tmWallOpeningCollisionSignature)
                    return entry.__tmWallOpeningCollisionSignature;
                const makeArrayTypeSignature = type => {
                    const byEdge = new Map;
                    const addOpening = (edge, opening) => {
                        const rect = opening && (opening.rect || opening);
                        if (!rect)
                            return;
                        let rectParts = byEdge.get(edge);
                        if (!rectParts) {
                            rectParts = [];
                            byEdge.set(edge, rectParts);
                        }
                        rectParts.push(`${Math.round(100 * (Number(rect.x1) || 0))}:${Math.round(100 * (Number(rect.x2) || 0))}:${Math.round(100 * (Number(rect.y1) || 0))}:${Math.round(100 * (Number(rect.y2) || 0))}`);
                    };
                    const source = openings[type];
                    if (Array.isArray(source)) {
                        for (const opening of source)
                            addOpening(null != opening && null != opening.edgeIndex ? opening.edgeIndex : "", opening);
                    } else if (source && "object" == typeof source) {
                        for (const edge in source) {
                            if (!Object.prototype.hasOwnProperty.call(source, edge))
                                continue;
                            for (const opening of toSafeArray(source[edge]))
                                addOpening(edge, opening);
                        }
                    }
                    const edgeParts = [];
                    for (const [edge, rectParts] of byEdge) {
                        rectParts.length > 1 && rectParts.sort();
                        edgeParts.push(`${edge}:${rectParts.join(";")}`);
                    }
                    edgeParts.length > 1 && edgeParts.sort();
                    return `${type}:${edgeParts.join(",")}`;
                };
                const signature = `${makeArrayTypeSignature("doors")}|${makeArrayTypeSignature("windows")}`;
                entry.__tmWallOpeningCollisionSignatureSource = openings;
                entry.__tmWallOpeningCollisionSignature = signature;
                return signature;
            }
            const makeRectSignature = list => {
                const rectParts = [];
                for (const opening of toSafeArray(list)) {
                    const rect = opening && (opening.rect || opening);
                    rect && rectParts.push([
                        Math.round(100 * (Number(rect.x1) || 0)),
                        Math.round(100 * (Number(rect.x2) || 0)),
                        Math.round(100 * (Number(rect.y1) || 0)),
                        Math.round(100 * (Number(rect.y2) || 0))
                    ].join(":"));
                }
                return rectParts.join(";");
            };
            const makeTypeSignature = type => {
                const edgeParts = [];
                const source = openings[type] || {};
                for (const edge of Object.keys(source))
                    edgeParts.push(`${edge}:${makeRectSignature(source[edge])}`);
                edgeParts.sort();
                return `${type}:${edgeParts.join(",")}`;
            };
            return `${makeTypeSignature("doors")}|${makeTypeSignature("windows")}`;
        }

        function getChunkStaticCollisionSignature(chunk) {
            const baseSignature = isDeveloperToggleEnabled("perfSingleChunkSignature") ? getWorldCollisionSingleChunkSignature(chunk) : getWorldCollisionChunkSignature([chunk]);
            const matches = chunk && (chunk.__tmMatchedCustomBuildings || runtimeState.customBuildingEntriesByChunk.get(chunk)) || [];
            const buildings = chunk && (chunk.__tmOriginalBuildings || chunk.buildings) || [];
            const matchParts = [];
            for (const match of toSafeArray(matches))
                matchParts.push(`${match && match.id || ""}:${getWallOpeningCollisionSignature(match && match.entry)}`);
            const matchSignature = matchParts.join("|");
            return [baseSignature, toSafeArray(buildings).length, matchSignature].join("::");
        }

        function buildWorldCollisionStaticCache(chunks) {
            const cache = {
                buildingPolygons: [],
                customWallSegments: [],
                customFallbackPolygons: [],
                tunnelWallSegments: []
            };
            const state = getWorldCollisionState();
            for (const chunk of toSafeArray(chunks)) {
                if (!chunk)
                    continue;
                const chunkSignature = getChunkStaticCollisionSignature(chunk);
                const cached = state.chunkStaticCaches.get(chunk);
                if (cached && cached.signature === chunkSignature && cached.cache) {
                    appendWorldCollisionStaticCache(cache, cached.cache);
                    continue;
                }
                const chunkCache = {
                    buildingPolygons: [],
                    customWallSegments: [],
                    customFallbackPolygons: [],
                    tunnelWallSegments: []
                };
                const tunnelEdges = toSafeArray(chunk && chunk.newRoadGraph && chunk.newRoadGraph.edges);
                for (const edge of tunnelEdges) {
                    if (!edge || Number(edge.layer) >= 0)
                        continue;
                    const worldPoints = getEdgeWorldPoints(edge);
                    const halfWidth = getRoadEdgeHalfWidth(edge) + 1.15;
                    for (let index = 0; index < worldPoints.length - 1; index++) {
                        const start = worldPoints[index];
                        const end = worldPoints[index + 1];
                        if (!start || !end)
                            continue;
                        const dx = end.x - start.x;
                        const dz = end.z - start.z;
                        const length = Math.hypot(dx, dz) || 1;
                        const nx = -dz / length;
                        const nz = dx / length;
                        for (const side of [-1, 1]) {
                            const segment = {
                                start: {
                                    x: start.x + nx * halfWidth * side,
                                    z: start.z + nz * halfWidth * side
                                },
                                end: {
                                    x: end.x + nx * halfWidth * side,
                                    z: end.z + nz * halfWidth * side
                                },
                                radius: 1.15
                            };
                            segment.bounds = getSegmentBounds2D(segment.start, segment.end, 170);
                            chunkCache.tunnelWallSegments.push(segment);
                        }
                    }
                }
                const matches = chunk && (chunk.__tmMatchedCustomBuildings || runtimeState.customBuildingEntriesByChunk.get(chunk)) || [];
                const customBuildings = new WeakSet;
                for (const match of toSafeArray(matches)) {
                    const entry = match && match.entry;
                    const building = match && match.building;
                    const localPoints = getMatchCollisionLocalFootprint(match);
                    const points = getMatchCollisionWorldFootprint(match, chunk);
                    if (points.length >= 3) {
                        building && customBuildings.add(building);
                        chunkCache.buildingPolygons.push({
                            points,
                            bounds: getFootprintBounds(points),
                            custom: !0,
                            entry,
                            building,
                            chunk
                        });
                    }
                    if (localPoints.length < 3)
                        continue;
                    const offset = building && building.chunkCenter || getChunkWorldOffset(chunk);
                    const worldPoints = offsetFootprintToWorld(localPoints, offset);
                    if (!entry || !entry.__tmWallOpenings) {
                        worldPoints.length >= 3 && chunkCache.customFallbackPolygons.push({
                            points: worldPoints,
                            bounds: getFootprintBounds(worldPoints)
                        });
                        continue;
                    }
                    for (let edgeIndex = 0; edgeIndex < localPoints.length; edgeIndex++) {
                        const start = localPoints[edgeIndex];
                        const end = localPoints[(edgeIndex + 1) % localPoints.length];
                        const dx = end.x - start.x;
                        const dz = end.z - start.z;
                        const length = Math.hypot(dx, dz);
                        if (length < .4)
                            continue;
                        const doors = [];
                        for (const opening of getWallOpenings(entry, "doors", edgeIndex)) {
                            const rect = opening && (opening.rect || opening);
                            rect && doors.push({
                                x1: clamp((Number(rect.x1) || 0) - .34, 0, length),
                                x2: clamp((Number(rect.x2) || 0) + .34, 0, length)
                            });
                        }
                        doors.length > 1 && doors.sort((a, b) => a.x1 - b.x1);
                        let cursor = 0;
                        const spans = [];
                        for (const door of doors) {
                            if (door.x1 - cursor > .22)
                                spans.push([cursor, door.x1]);
                            cursor = Math.max(cursor, door.x2);
                        }
                        if (length - cursor > .22)
                            spans.push([cursor, length]);
                        const ox = Number(offset && offset.x) || 0;
                        const oz = Number(offset && offset.z) || 0;
                        for (const span of spans) {
                            const aU = span[0] / length;
                            const bU = span[1] / length;
                            const segment = {
                                start: {
                                    x: ox + start.x + dx * aU,
                                    z: oz + start.z + dz * aU
                                },
                                end: {
                                    x: ox + start.x + dx * bU,
                                    z: oz + start.z + dz * bU
                                },
                                radius: .28
                            };
                            segment.bounds = getSegmentBounds2D(segment.start, segment.end, 4);
                            chunkCache.customWallSegments.push(segment);
                        }
                    }
                }
                for (const building of toSafeArray(chunk && (chunk.__tmOriginalBuildings || chunk.buildings))) {
                    if (!building || customBuildings.has(building))
                        continue;
                    const points = getBuildingWorldFootprint(building, null, chunk);
                    points.length >= 3 && chunkCache.buildingPolygons.push({
                        points,
                        bounds: getFootprintBounds(points),
                        custom: !1,
                        building,
                        chunk
                    });
                }
                state.chunkStaticCaches.set(chunk, {
                    signature: chunkSignature,
                    cache: chunkCache
                });
                appendWorldCollisionStaticCache(cache, chunkCache);
            }
            buildCollisionSpatialIndex(cache);
            return cache;
        }

        function getWorldCollisionStaticCache() {
            const state = getWorldCollisionState();
            const now = performance.now();
            const chunks = getWorldCollisionLoadedChunks();
            if (isDeveloperToggleEnabled("perfStaticCacheEarlyBypass") && !isDeveloperToggleEnabled("perfStaticCollisionCache"))
                return buildWorldCollisionStaticCache(chunks);
            const signature = getWorldCollisionChunkSignature(chunks);
            if (!isDeveloperToggleEnabled("perfStaticCollisionCache"))
                return buildWorldCollisionStaticCache(chunks);
            if (state.staticCache && state.staticCacheSignature === signature && now - (Number(state.staticCacheAt) || 0) < CUSTOM_BUILDING_PERF.staticCacheTtlMs)
                return state.staticCache;
            state.staticCache = buildWorldCollisionStaticCache(chunks);
            state.staticCacheSignature = signature;
            state.staticCacheAt = now;
            return state.staticCache;
        }

        function segmentIntersection2D(a, b, c, d) {
            const ax = Number(a && a.x) || 0;
            const az = Number(a && a.z) || 0;
            const bx = Number(b && b.x) || 0;
            const bz = Number(b && b.z) || 0;
            const cx = Number(c && c.x) || 0;
            const cz = Number(c && c.z) || 0;
            const dx = Number(d && d.x) || 0;
            const dz = Number(d && d.z) || 0;
            const rX = bx - ax;
            const rZ = bz - az;
            const sX = dx - cx;
            const sZ = dz - cz;
            const denom = rX * sZ - rZ * sX;
            if (Math.abs(denom) < 1e-5)
                return null;
            const qX = cx - ax;
            const qZ = cz - az;
            const t = (qX * sZ - qZ * sX) / denom;
            const u = (qX * rZ - qZ * rX) / denom;
            return t > .02 && t < .98 && u > .02 && u < .98 ? {
                x: ax + rX * t,
                z: az + rZ * t,
                t,
                u
            } : null;
        }

        function getSegmentYAt(segment, progress) {
            const startY = Number(segment && segment.start && segment.start.y) || 0;
            const endY = Number(segment && segment.end && segment.end.y) || startY;
            return startY + (endY - startY) * clamp(Number(progress) || 0, 0, 1);
        }

        function getChunkRoadGraphSignature(chunk) {
            const edges = toSafeArray(chunk && chunk.newRoadGraph && chunk.newRoadGraph.edges);
            const now = performance.now();
            if (chunk && chunk.__tmRoadGraphSignatureEdges === edges && chunk.__tmRoadGraphSignature && now - (Number(chunk.__tmRoadGraphSignatureAt) || 0) < CUSTOM_BUILDING_PERF.bridgeCacheTtlMs)
                return chunk.__tmRoadGraphSignature;
            const signatureParts = [];
            for (const edge of edges) {
                const points = toSafeArray(edge && edge.points);
                const first = points[0] || {};
                const last = points[points.length - 1] || {};
                signatureParts.push([
                    Number(edge && edge.layer) || 0,
                    points.length,
                    Math.round(Number(first.x) || 0),
                    Math.round(Number(first.z) || 0),
                    Math.round(Number(last.x) || 0),
                    Math.round(Number(last.z) || 0)
                ].join(":"));
            }
            const signature = signatureParts.join("|");
            if (chunk) {
                chunk.__tmRoadGraphSignatureEdges = edges;
                chunk.__tmRoadGraphSignature = signature;
                chunk.__tmRoadGraphSignatureAt = now;
            }
            return signature;
        }

        function getChunkRoadSegments(chunk) {
            const signature = getChunkRoadGraphSignature(chunk);
            if (chunk && chunk.__tmRoadSegmentsCache && chunk.__tmRoadSegmentsCache.signature === signature)
                return chunk.__tmRoadSegmentsCache.segments;
            const segments = [];
            for (const edge of toSafeArray(chunk && chunk.newRoadGraph && chunk.newRoadGraph.edges)) {
                if (!edge || !Array.isArray(edge.points) || edge.points.length < 2 || !isRoadEligibleForAutopilot(edge))
                    continue;
                for (let index = 0; index < edge.points.length - 1; index++) {
                    const start = edge.points[index];
                    const end = edge.points[index + 1];
                    if (!start || !end)
                        continue;
                    segments.push({
                        edge,
                        start,
                        end,
                        layer: Number(edge.layer) || 0
                    });
                }
            }
            chunk && (chunk.__tmRoadSegmentsCache = {
                signature,
                segments
            });
            return segments;
        }

        function getBridgeRoadClearanceZones(chunk) {
            const signature = getChunkRoadGraphSignature(chunk);
            const now = performance.now();
            const cached = chunk && chunk.__tmBridgeClearanceZonesCache;
            if (cached && cached.signature === signature && now - (Number(cached.at) || 0) < CUSTOM_BUILDING_PERF.bridgeCacheTtlMs)
                return cached.zones;
            const segments = getChunkRoadSegments(chunk);
            const zones = [];
            const zoneKeys = new Set;
            const maxSegments = Math.min(segments.length, 220);
            for (let aIndex = 0; aIndex < maxSegments; aIndex++) {
                const first = segments[aIndex];
                for (let bIndex = aIndex + 1; bIndex < maxSegments; bIndex++) {
                    const second = segments[bIndex];
                    if (!first || !second || first.edge === second.edge)
                        continue;
                    const hit = segmentIntersection2D(first.start, first.end, second.start, second.end);
                    if (!hit)
                        continue;
                    const firstY = getSegmentYAt(first, hit.t);
                    const secondY = getSegmentYAt(second, hit.u);
                    const layerDelta = first.layer - second.layer;
                    const heightDelta = firstY - secondY;
                    if (Math.abs(heightDelta) < 1.8 && 0 === layerDelta)
                        continue;
                    const lower = heightDelta > 0 || layerDelta > 0 ? second : first;
                    const lowerY = heightDelta > 0 || layerDelta > 0 ? secondY : firstY;
                    const key = `${Math.round(hit.x / 4)}:${Math.round(hit.z / 4)}`;
                    if (zoneKeys.has(key))
                        continue;
                    zoneKeys.add(key);
                    zones.push({
                        key,
                        x: hit.x,
                        z: hit.z,
                        y: lowerY,
                        radius: clamp(getRoadEdgeHalfWidth(lower.edge) + 2.8, 4.5, 11)
                    });
                    if (zones.length >= 80) {
                        chunk && (chunk.__tmBridgeClearanceZonesCache = {
                            signature,
                            zones,
                            at: now
                        });
                        return zones;
                    }
                }
            }
            chunk && (chunk.__tmBridgeClearanceZonesCache = {
                signature,
                zones,
                at: now
            });
            return zones;
        }

        function restoreWebsiteBridgePillarsForChunk(chunk) {
            if (!chunk || !chunk.group)
                return;
            chunk.group.traverse && chunk.group.traverse(object => {
                if (object && object.userData && object.userData.tmHiddenWebsiteBridgePillar) {
                    object.visible = !0;
                    delete object.userData.tmHiddenWebsiteBridgePillar;
                }
            });
            chunk.__tmHiddenWebsiteBridgePillars = 0;
            chunk.__tmBridgePillarSanitizeSignature = "";
        }

        function getObjectChunkLocalBounds(object, chunk) {
            if (!globalState.THREE || !globalState.THREE.Box3 || !object)
                return null;
            if (object.userData && object.userData.tmBridgeLocalBounds && object.userData.tmBridgeLocalBoundsChunk === chunk)
                return object.userData.tmBridgeLocalBounds;
            try {
                object.updateMatrixWorld && object.updateMatrixWorld(!0);
                const box = new globalState.THREE.Box3().setFromObject(object);
                if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x))
                    return null;
                const center = new globalState.THREE.Vector3;
                const size = new globalState.THREE.Vector3;
                box.getCenter(center);
                box.getSize(size);
                chunk && chunk.group && chunk.group.worldToLocal && chunk.group.worldToLocal(center);
                const bounds = {
                    center,
                    size
                };
                object.userData || (object.userData = {});
                object.userData.tmBridgeLocalBounds = bounds;
                object.userData.tmBridgeLocalBoundsChunk = chunk;
                return bounds;
            } catch (boundsError) {
                return null;
            }
        }

        function getObjectNameStack(object, stopParent) {
            const names = [];
            let cursor = object;
            while (cursor && cursor !== stopParent && names.length < 5) {
                cursor.name && names.push(cursor.name);
                cursor.userData && cursor.userData.name && names.push(cursor.userData.name);
                cursor = cursor.parent;
            }
            const material = object && object.material;
            material && material.name && names.push(material.name);
            return names.join(" ").toLowerCase();
        }

        function isBridgePillarCandidate(object, bounds, zone, roadMeshSet, chunk) {
            if (!object || !object.isMesh || !bounds || !zone || roadMeshSet && roadMeshSet.has(object))
                return !1;
            const center = bounds.center;
            const size = bounds.size;
            if (!center || !size)
                return !1;
            const dx = center.x - zone.x;
            const dz = center.z - zone.z;
            if (dx * dx + dz * dz > zone.radius * zone.radius)
                return !1;
            const horizontalMax = Math.max(Math.abs(size.x), Math.abs(size.z));
            const horizontalMin = Math.min(Math.abs(size.x), Math.abs(size.z));
            const tallNarrow = size.y > 1.6 && size.y > horizontalMax * 1.45 && horizontalMax <= Math.max(1.35, zone.radius * .72) && horizontalMin <= Math.max(.8, zone.radius * .42);
            if (!tallNarrow)
                return !1;
            const nameText = getObjectNameStack(object, chunk && chunk.group);
            const supportNamed = /(pillar|column|support|pier|pfeiler|stuetz|stütz)/i.test(nameText);
            const bridgeNamed = /(bridge|bruecke|brücke|overpass|viaduct)/i.test(nameText);
            const nearRoadHeight = center.y > zone.y - 2 && center.y < zone.y + 12;
            return nearRoadHeight && (supportNamed || bridgeNamed || horizontalMax < 2.4);
        }

        function sanitizeWebsiteBridgePillarsForChunk(chunk) {
            if (!chunk || !chunk.group || !globalState.THREE)
                return;
            if (!featureState.enhancedRoads) {
                if (chunk.__tmBridgePillarSanitizeSignature || chunk.__tmHiddenWebsiteBridgePillars)
                    restoreWebsiteBridgePillarsForChunk(chunk);
                chunk.__tmBridgePillarSanitizeSignature = "";
                return;
            }
            const signature = [
                getChunkRoadGraphSignature(chunk),
                chunk.group.children && chunk.group.children.length || 0,
                toSafeArray(chunk.roadMeshes).length
            ].join("::");
            if (chunk.__tmBridgePillarSanitizeSignature === signature)
                return;
            restoreWebsiteBridgePillarsForChunk(chunk);
            const zones = getBridgeRoadClearanceZones(chunk);
            if (!zones.length) {
                chunk.__tmBridgePillarSanitizeSignature = signature;
                return;
            }
            const roadMeshSet = new Set(toSafeArray(chunk.roadMeshes));
            let hidden = 0;
            chunk.group.traverse && chunk.group.traverse(object => {
                if (hidden >= 80 || !object || !object.isMesh || object.userData && object.userData.tmCollisionBridge)
                    return;
                const bounds = getObjectChunkLocalBounds(object, chunk);
                if (!bounds)
                    return;
                let candidate = !1;
                for (const zone of zones)
                    if (isBridgePillarCandidate(object, bounds, zone, roadMeshSet, chunk)) {
                        candidate = !0;
                        break;
                    }
                if (!candidate)
                    return;
                object.visible = !1;
                object.userData || (object.userData = {});
                object.userData.tmHiddenWebsiteBridgePillar = !0;
                hidden++;
            });
            chunk.__tmHiddenWebsiteBridgePillars = hidden;
            chunk.__tmBridgePillarSanitizeSignature = signature;
        }

        function createTunnelBridgeMesh(edge, start, end, intersection) {
            if (!globalState.THREE || !intersection)
                return null;
            const dx = (Number(end && end.x) || 0) - (Number(start && start.x) || 0);
            const dz = (Number(end && end.z) || 0) - (Number(start && start.z) || 0);
            const length = Math.hypot(dx, dz);
            if (length < 3)
                return null;
            const bridgeLength = clamp(Math.max(18, getRoadEdgeHalfWidth(edge) * 3.2), 18, Math.min(42, length + 8));
            const bridgeWidth = Math.max(8, getRoadEdgeHalfWidth(edge) * 2 + 2.2);
            const y = (Number(start && start.y) || 0) + ((Number(end && end.y) || 0) - (Number(start && start.y) || 0)) * clamp(intersection.t, 0, 1) + .38;
            const material = createDetailStandardMaterial({
                materialKind: "concrete",
                color: 0x7f837d
            }, {
                color: 0x7f837d,
                materialKind: "concrete"
            });
            const group = new globalState.THREE.Group;
            group.name = "__tmTunnelCrossingBridge";
            const slab = createRuntimeBox([bridgeLength, .45, bridgeWidth], material, [intersection.x, y, intersection.z]);
            slab.rotation.y = Math.atan2(-dz, dx);
            group.add(slab);
            const railMaterial = createDetailStandardMaterial({
                materialKind: "metal",
                color: 0x2f3436
            }, {
                color: 0x2f3436,
                materialKind: "metal"
            });
            const sideOffset = bridgeWidth / 2 + .18;
            for (const side of [-1, 1]) {
                const rail = createRuntimeBox([bridgeLength, .35, .22], railMaterial, [intersection.x + Math.sin(slab.rotation.y) * sideOffset * side, y + .4, intersection.z + Math.cos(slab.rotation.y) * sideOffset * side]);
                rail.rotation.y = slab.rotation.y;
                group.add(rail);
            }
            group.userData.tmCollisionBridge = !0;
            return group;
        }

        function rebuildTunnelBridgeOverlay(chunk) {
            if (!chunk || !chunk.group || !globalState.THREE)
                return;
            let overlay = chunk.__tmTunnelBridgeOverlay;
            if (!featureState.enhancedRoads) {
                restoreWebsiteBridgePillarsForChunk(chunk);
                overlay && overlay.parent && overlay.parent.remove(overlay);
                chunk.__tmTunnelBridgeOverlay = null;
                chunk.__tmTunnelBridgeSignature = "";
                return;
            }
            const signature = getChunkRoadGraphSignature(chunk);
            if (chunk.__tmTunnelBridgeSignature === signature) {
                sanitizeWebsiteBridgePillarsForChunk(chunk);
                return;
            }
            if (!overlay) {
                overlay = new globalState.THREE.Group;
                overlay.name = "__tmTunnelBridgeOverlay";
                chunk.__tmTunnelBridgeOverlay = overlay;
            }
            clearCustomBuildingOverlayChildren(overlay);
            const tunnelSegments = [];
            const surfaceSegments = [];
            for (const edge of toSafeArray(chunk.newRoadGraph && chunk.newRoadGraph.edges)) {
                if (!edge || !Array.isArray(edge.points) || edge.points.length < 2)
                    continue;
                const target = Number(edge.layer) < 0 ? tunnelSegments : 0 === Number(edge.layer || 0) && isRoadEligibleForAutopilot(edge) ? surfaceSegments : null;
                if (!target)
                    continue;
                for (let index = 0; index < edge.points.length - 1; index++)
                    target.push({
                        edge,
                        start: edge.points[index],
                        end: edge.points[index + 1]
                    });
            }
            const seen = new Set;
            for (const surface of surfaceSegments) {
                for (const tunnel of tunnelSegments) {
                    const hit = segmentIntersection2D(surface.start, surface.end, tunnel.start, tunnel.end);
                    if (!hit)
                        continue;
                    const key = `${Math.round(hit.x / 6)}:${Math.round(hit.z / 6)}`;
                    if (seen.has(key))
                        continue;
                    seen.add(key);
                    const bridge = createTunnelBridgeMesh(surface.edge, surface.start, surface.end, hit);
                    bridge && overlay.add(bridge);
                    if (overlay.children.length >= 28)
                        break;
                }
                if (overlay.children.length >= 28)
                    break;
            }
            overlay.children.length ? overlay.parent !== chunk.group && chunk.group.add(overlay) : overlay.parent && overlay.parent.remove(overlay);
            chunk.__tmTunnelBridgeSignature = signature;
            sanitizeWebsiteBridgePillarsForChunk(chunk);
        }

        function getTunnelWallCollisionSegments(position) {
            return getCachedWorldCollisionQuery("tunnelWalls", position, "", (() => {
                const cache = getWorldCollisionStaticCache();
                const result = [];
                for (const segment of getCollisionSpatialCandidates(cache, "tunnelWallSegments", position))
                    isPositionInBounds2D(position, segment.bounds) && distancePointToSegmentSq2D(position, segment.start, segment.end) <= 25600 && result.push(segment);
                return result;
            })) || [];
        }

        function collectBuildingCollisionPolygons(position, mode) {
            return getCachedWorldCollisionQuery("buildingPolygons", position, mode, (() => {
                const cache = getWorldCollisionStaticCache();
                const padding = "vehicle" === mode ? 5 : 1.6;
                const result = [];
                for (const item of getCollisionSpatialCandidates(cache, "buildingPolygons", position, padding))
                    isPositionInBounds2D(position, item.bounds, padding) && result.push(item);
                return result;
            })) || [];
        }

        function collectCustomWallCollisionSegments(position) {
            return getCachedWorldCollisionQuery("customWalls", position, "", (() => {
                const cache = getWorldCollisionStaticCache();
                const segments = [];
                for (const segment of getCollisionSpatialCandidates(cache, "customWallSegments", position))
                    isPositionInBounds2D(position, segment.bounds) && segments.push(segment);
                const fallbackPolygons = [];
                for (const item of getCollisionSpatialCandidates(cache, "customFallbackPolygons", position, 1.8))
                    isPositionInBounds2D(position, item.bounds, 1.8) && fallbackPolygons.push(item.points);
                return {
                    segments,
                    fallbackPolygons
                };
            })) || {
                segments: [],
                fallbackPolygons: []
            };
        }

        function getTrainCollisionBoxes(position) {
            const trains = toSafeArray(runtimeState.game && runtimeState.game.trainTraffic && runtimeState.game.trainTraffic.trains);
            let wagonCount = 0;
            for (const train of trains)
                wagonCount += toSafeArray(train && train.wagons).length;
            const now = performance.now();
            const key = `${Math.round((Number(position && position.x) || 0) / 20)}:${Math.round((Number(position && position.z) || 0) / 20)}:${trains.length}:${wagonCount}`;
            const cached = runtimeState.trainCollisionBoxesCache;
            if (cached && cached.key === key && now - (Number(cached.at) || 0) < CUSTOM_BUILDING_PERF.trainCollisionCacheMs)
                return cached.boxes || [];
            const boxes = [];
            for (const train of trains)
                for (const wagon of toSafeArray(train && train.wagons)) {
                    const center = wagon && wagon.position;
                    if (!center || getDistanceSq2D(position, center) > 28900)
                        continue;
                    const config = wagon.cs || {};
                    boxes.push({
                        center,
                        halfX: Math.max(2, Number(config.length) / 2 || 8),
                        halfZ: Math.max(1.2, Number(config.width) / 2 || 1.7),
                        rotationY: Number(wagon.rotation && wagon.rotation.y) || 0,
                        radius: .8
                    });
                }
            runtimeState.trainCollisionBoxesCache = {
                key,
                at: now,
                boxes
            };
            return boxes;
        }

        function resolveWorldCollisionPosition(position, radius, mode) {
            if (!position || !featureState.collisionHook)
                return !1;
            let collided = !1;
            const vehicleMode = "vehicle" === mode;
            const buildingRadius = vehicleMode ? clamp(radius * .64, 1.02, 1.95) : clamp(radius * .62, .34, .48);
            const wallRadius = vehicleMode ? radius + .18 : clamp(radius * .62, .34, .48);
            const trainBoxes = getTrainCollisionBoxes(position);
            for (let pass = 0; pass < 3; pass++) {
                let passCollided = !1;
                const applyPass = separation => {
                    if (separation) {
                        applyCollisionSeparation(position, separation);
                        collided = !0;
                        passCollided = !0;
                    }
                };
                for (const box of trainBoxes)
                    applyPass(getCircleObbSeparation(position, box.center, box.halfX + box.radius, box.halfZ + box.radius, box.rotationY, radius));
                for (const wall of getTunnelWallCollisionSegments(position))
                    applyPass(getCircleSegmentSeparation(position, wall.start, wall.end, radius + wall.radius));
                if (vehicleMode) {
                    for (const item of collectBuildingCollisionPolygons(position, mode))
                        applyPass(getCirclePolygonSeparation(position, item.points, buildingRadius));
                } else {
                    const wallData = collectCustomWallCollisionSegments(position);
                    for (const wall of wallData.segments)
                        applyPass(getCircleSegmentSeparation(position, wall.start, wall.end, wallRadius + wall.radius));
                    for (const polygon of wallData.fallbackPolygons)
                        applyPass(getCirclePolygonSeparation(position, polygon, buildingRadius));
                    for (const item of collectBuildingCollisionPolygons(position, mode))
                        !item.custom && applyPass(getCirclePolygonSeparation(position, item.points, buildingRadius));
                }
                if (!passCollided)
                    break;
            }
            return collided;
        }

        function resolveVehicleWorldHitboxes(car) {
            if (!car || !car.cameraGroup || !car.cameraGroup.position)
                return;
            const position = car.cameraGroup.position;
            const radius = clamp(Math.max(Number(car.mcs && car.mcs.width) || Number(car.width) || 2.2, (Number(car.mcs && car.mcs.length) || Number(car.length) || 4.8) * .46), 1.35, 4.6);
            const previousSafe = car.__tmLastWorldCollisionSafePosition || null;
            const collided = resolveWorldCollisionPosition(position, radius, "vehicle");
            if (collided) {
                if (previousSafe && speedAbs(car.speed) > 12 && getDistanceSq2D(previousSafe, position) < 5625)
                    position.copy(previousSafe);
                setPlayerSpeed(car, 0);
                "function" == typeof car.resetAcc && car.resetAcc();
                "function" == typeof car.turnOffCruiseControl && car.turnOffCruiseControl();
            } else {
                car.__tmLastWorldCollisionSafePosition || (car.__tmLastWorldCollisionSafePosition = new globalState.THREE.Vector3);
                car.__tmLastWorldCollisionSafePosition.copy(position);
            }
        }

        function resolveHumanWorldHitboxes(human) {
            if (!human)
                return;
            const state = getWorldCollisionState();
            const now = performance.now();
            if (now - (Number(state.lastHumanCollisionAt) || 0) < 35)
                return;
            state.lastHumanCollisionAt = now;
            const group = "function" == typeof human.getGroup ? human.getGroup() : human.cameraGroup || human.group;
            const position = group && group.position;
            if (!position)
                return;
            const collided = resolveWorldCollisionPosition(position, .48, "human");
            if (collided)
                "function" == typeof human.resetAcc && human.resetAcc();
        }

        function updateWorldHitboxCollisions() {
            if (!featureState.collisionHook || !globalState.THREE)
                return;
            const manager = getControlManager();
            if (!manager)
                return;
            manager.inCar ? resolveVehicleWorldHitboxes(manager.controllableCar) : resolveHumanWorldHitboxes(manager.controlableHuman);
        }


        function createEllipsoid(size, color, position, material) {
            const THREE = globalState.THREE;
            const mesh = new THREE.Mesh(getSharedOverlaySphereGeometry(), material || getSharedOverlayLambertMaterial(color));
            mesh.scale.set(size[0] / 2, size[1] / 2, size[2] / 2);
            position && mesh.position.set(position[0], position[1], position[2]);
            return mesh;
        }

        function disposeObject3D(object) {
            if (!object)
                return;
            object.traverse && object.traverse((node => {
                if (!node || !node.isMesh)
                    return;
                node.geometry && !isSharedResource(node.geometry) && typeof node.geometry.dispose === "function" && node.geometry.dispose();
                if (Array.isArray(node.material))
                    for (const material of node.material)
                        material && !isSharedResource(material) && typeof material.dispose === "function" && material.dispose();
                else
                    node.material && !isSharedResource(node.material) && typeof node.material.dispose === "function" && node.material.dispose();
            }
            ));
        }

        function enhanceVehicleAppearance(vehicle) {
            if (!vehicle || !vehicle.group)
                return;
            const now = performance.now();
            if (vehicle.__tmAppearanceCheckedAt && now - vehicle.__tmAppearanceCheckedAt < 900)
                return;
            vehicle.__tmAppearanceCheckedAt = now;
            if (!featureState.enhancedVehicles && vehicle.__tmAppearanceCleanupChecked)
                return;
            const oldOverlays = vehicle.group.children.filter(child => child && "__tmRoundedVehicleDetails" === child.name);
            vehicle.__tmAppearanceCleanupChecked = !featureState.enhancedVehicles && !oldOverlays.length;
            for (const overlay of oldOverlays) {
                vehicle.group.remove(overlay);
                disposeObject3D(overlay);
            }
            vehicle.__tmAppearanceEnhanced = !1;
            if (!featureState.enhancedVehicles)
                return;
            vehicle.__tmAppearanceCleanupChecked = !1;
        }

        function isInTownArea(position) {
            if (!position)
                return !1;
            const px = Number(position.x) || 0;
            const pz = Number(position.z) || 0;
            if (isDeveloperToggleEnabled("perfTownAreaLookup")) {
                const places = toSafeArray(townSignsState.debugPlaces);
                for (let index = 0; index < places.length; index++) {
                    const place = places[index];
                    const cx = Number(place && place.center && place.center.x) || 0;
                    const cz = Number(place && place.center && place.center.z) || 0;
                    if (Math.hypot(px - cx, pz - cz) <= Math.max(Number(place && place.radius) || 0, 180) + 80)
                        return !0;
                }
                return !1;
            }
            return toSafeArray(townSignsState.debugPlaces).some(place => {
                const cx = Number(place.center && place.center.x) || 0;
                const cz = Number(place.center && place.center.z) || 0;
                return Math.hypot(px - cx, pz - cz) <= Math.max(Number(place.radius) || 0, 180) + 80;
            });
        }

        function textLooksPoliceLike(value) {
            return /police|polizei|sheriff|patrol|cop|siren|lightbar|blaulicht/i.test(String(value || ""));
        }

        function materialLooksLikeEmergencyLight(material, type) {
            const color = material && material.color;
            if (!color)
                return !1;
            const r = Number(color.r) || 0;
            const g = Number(color.g) || 0;
            const b = Number(color.b) || 0;
            return "red" === type ? r > .75 && g < .35 && b < .35 : b > .68 && r < .45 && g < .65;
        }

        function isPoliceLikeVehicle(vehicle) {
            if (!vehicle)
                return !1;
            const now = performance.now();
            if ("boolean" == typeof vehicle.__tmPoliceLike && (vehicle.__tmPoliceLike || now - (Number(vehicle.__tmPoliceLikeScanAt) || 0) < 2500))
                return vehicle.__tmPoliceLike;
            vehicle.__tmPoliceLikeScanAt = now;
            const directText = isDeveloperToggleEnabled("perfPoliceVehicleText") ? `${vehicle.name || ""} ${vehicle.type || ""} ${vehicle.kind || ""} ${vehicle.vehicleType || ""} ${vehicle.carType || ""} ${vehicle.modelType || ""} ${vehicle.mcs && vehicle.mcs.name || ""} ${vehicle.group && vehicle.group.name || ""} ${vehicle.cameraGroup && vehicle.cameraGroup.name || ""}` : [vehicle.name, vehicle.type, vehicle.kind, vehicle.vehicleType, vehicle.carType, vehicle.modelType, vehicle.mcs && vehicle.mcs.name, vehicle.group && vehicle.group.name, vehicle.cameraGroup && vehicle.cameraGroup.name].filter(Boolean).join(" ");
            if (textLooksPoliceLike(directText))
                return vehicle.__tmPoliceLike = !0;
            let redLight = !1;
            let blueLight = !1;
            let namedMarker = !1;
            let scanned = 0;
            const root = vehicle.group || vehicle.cameraGroup;
            root && root.traverse && root.traverse(node => {
                if (scanned++ > 120 || namedMarker && redLight && blueLight)
                    return;
                namedMarker || (namedMarker = textLooksPoliceLike(node.name || node.userData && (node.userData.type || node.userData.kind)));
                if (!node || !node.material || Number(node.position && node.position.y) < .95)
                    return;
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                for (const material of materials) {
                    redLight || (redLight = materialLooksLikeEmergencyLight(material, "red"));
                    blueLight || (blueLight = materialLooksLikeEmergencyLight(material, "blue"));
                }
            });
            return vehicle.__tmPoliceLike = !!(namedMarker || redLight && blueLight);
        }

        function getVehicleFlatPosition(vehicle) {
            if (!vehicle)
                return null;
            try {
                if ("function" == typeof vehicle.getPosition) {
                    const position = vehicle.getPosition();
                    if (position)
                        return position;
                }
            } catch (positionError) {}
            return vehicle.cameraGroup && vehicle.cameraGroup.position || vehicle.group && vehicle.group.position || null;
        }

        function setVehicleFlatPosition(vehicle, position) {
            if (!vehicle || !position)
                return;
            const target = vehicle.cameraGroup && vehicle.cameraGroup.position || vehicle.group && vehicle.group.position;
            if (!target)
                return;
            target.x = Number(position.x) || 0;
            target.z = Number(position.z) || 0;
        }

        function applyPoliceVehicleHillHold(resolver, aiId, aiCar, previousPosition) {
            if (!resolver || !aiCar || !previousPosition || !isPoliceLikeVehicle(aiCar))
                return;
            const player = getPlayerCar();
            const playerPos = player && getVehicleFlatPosition(player);
            if (!playerPos || speedAbs(player.speed) > 1.4 || getDistanceSq2D(playerPos, previousPosition) > 8100)
                return;
            const currentPosition = getVehicleFlatPosition(aiCar);
            if (!currentPosition)
                return;
            const aiSpeed = speedAbs((resolver.speeds && resolver.speeds[aiId]) ?? aiCar.speed);
            const movedSq = getDistanceSq2D(previousPosition, currentPosition);
            if (aiSpeed > 1.8 || movedSq > 2.1025)
                return;
            setVehicleFlatPosition(aiCar, previousPosition);
            setAiSpeed(resolver, aiId, aiCar, 0);
            resolver.freezeStates && (resolver.freezeStates[aiId] = Math.max(Number(resolver.freezeStates[aiId]) || 0, 12));
            "function" == typeof aiCar.resetAcc && aiCar.resetAcc();
        }

        function applyTrafficEnvironmentPolicy(resolver, aiId, aiCar) {
            if (!resolver || !aiCar || !townSignsState.roadModule)
                return;
            const now = performance.now();
            if (aiCar.__tmTrafficPolicyAt && now - aiCar.__tmTrafficPolicyAt < 450)
                return;
            aiCar.__tmTrafficPolicyAt = now;
            const road = resolver.carPaths && resolver.carPaths[aiId] && resolver.carPaths[aiId].pathSegments && resolver.carPaths[aiId].pathSegments[0] && resolver.carPaths[aiId].pathSegments[0].road;
            const rm = townSignsState.roadModule;
            let maxKmh = 70;
            if (road) {
                if (road.type === rm.ROAD_TYPE_MOTORWAY || road.type === rm.ROAD_TYPE_MOTORWAY_NO_HARD_SHOULDER || road.type === rm.ROAD_TYPE_MOTORWAY_OPEN)
                    maxKmh = 115;
                else if (road.type === rm.ROAD_TYPE_TRUNK || road.type === rm.ROAD_TYPE_PRIMARY)
                    maxKmh = 85;
                else if (road.type === rm.ROAD_TYPE_SECONDARY)
                    maxKmh = 70;
                else if (road.type === rm.ROAD_TYPE_TERTIARY)
                    maxKmh = 55;
                else if (road.type === rm.ROAD_TYPE_RESIDENTIAL || road.type === rm.ROAD_TYPE_SERVICE)
                    maxKmh = 34;
            }
            if (isInTownArea(aiCar.getPosition && aiCar.getPosition()))
                maxKmh = Math.min(maxKmh, 48);
            const maxSpeed = maxKmh / 3.6;
            resolver.targetSpeeds[aiId] = Math.min(Number(resolver.targetSpeeds[aiId]) || maxSpeed, maxSpeed);
            resolver.speeds[aiId] = Math.min(Number(resolver.speeds[aiId]) || maxSpeed, maxSpeed + 2);
        }

        function createPoliceVisual() {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmPoliceCar";
            const makeMat = (color, extra={}) => createFlatMaterial(color, extra);
            const paintWhite = makeMat(0xf5f8fb);
            const paintBlue = makeMat(0x1d5fc8);
            const paintRed = makeMat(0xc63242);
            const trim = makeMat(0x1b1d22);
            const glass = makeMat(0x8ec6e8, {
                transparent: !0,
                opacity: .62
            });
            const lightRed = getSharedOverlayBasicMaterial(0xff2030);
            const lightBlue = getSharedOverlayBasicMaterial(0x2f77ff);
            group.add(createEllipsoid([6.35, .92, 2.34], 0xf5f8fb, [0, .82, 0], paintWhite));
            group.add(createEllipsoid([2.95, .72, 1.78], 0xf5f8fb, [-.08, 1.34, 0], paintWhite));
            group.add(createEllipsoid([2.15, .28, 1.56], 0x1d5fc8, [1.86, 1.04, 0], paintBlue));
            group.add(createEllipsoid([1.76, .24, 1.42], 0x1d5fc8, [-1.92, 1.03, 0], paintBlue));
            const frontLip = createBox([5.8, .18, 2.08], 0x1b1d22, [.18, .48, 0]);
            frontLip.material = trim;
            const rearValance = createBox([4.3, .16, 2.02], 0x1b1d22, [-1.85, .5, 0]);
            rearValance.material = trim;
            group.add(frontLip, rearValance);
            const sidePanelLeft = createBox([3.12, .58, .08], 0xf5f8fb, [-.1, 1.06, -1.04]);
            const sidePanelRight = createBox([3.12, .58, .08], 0xf5f8fb, [-.1, 1.06, 1.04]);
            sidePanelLeft.material = paintWhite;
            sidePanelRight.material = paintWhite;
            group.add(sidePanelLeft, sidePanelRight);
            const sideBlueLeft = createBox([3.5, .22, .05], 0x1d5fc8, [.06, .95, -1.16]);
            const sideBlueRight = createBox([3.5, .22, .05], 0x1d5fc8, [.06, .95, 1.16]);
            const sideRedLeft = createBox([1.18, .16, .05], 0xc63242, [-1.72, 1.05, -1.16]);
            const sideRedRight = createBox([1.18, .16, .05], 0xc63242, [-1.72, 1.05, 1.16]);
            sideBlueLeft.material = paintBlue;
            sideBlueRight.material = paintBlue;
            sideRedLeft.material = paintRed;
            sideRedRight.material = paintRed;
            group.add(sideBlueLeft, sideBlueRight, sideRedLeft, sideRedRight);
            const roofBlue = createBox([1.24, .08, 1.44], 0x1d5fc8, [-.18, 1.76, 0]);
            roofBlue.material = paintBlue;
            group.add(roofBlue);
            group.add(createBox([.08, .38, 1.48], 0xffffff, [.18, 1.42, 0]));
            group.add(createBox([.08, .36, 1.42], 0xffffff, [-1.02, 1.42, 0]));
            const windshield = createBox([.12, .56, 1.48], 0x8ec6e8, [1.1, 1.52, 0]);
            windshield.material = glass;
            group.add(windshield);
            const rearWindow = createBox([.12, .44, 1.28], 0x8ec6e8, [-1.5, 1.48, 0]);
            rearWindow.material = glass;
            group.add(rearWindow);
            const sideWindowL = createBox([1.92, .36, .06], 0x8ec6e8, [-.12, 1.48, -1.01]);
            const sideWindowR = createBox([1.92, .36, .06], 0x8ec6e8, [-.12, 1.48, 1.01]);
            sideWindowL.material = glass;
            sideWindowR.material = glass;
            group.add(sideWindowL, sideWindowR);
            const lightbar = new THREE.Group;
            lightbar.name = "__tmPoliceLightbar";
            const lightbarBase = createBox([1.34, .12, .54], 0x171a1f, [-.28, 1.92, 0]);
            lightbarBase.material = trim;
            const lightbarGlass = createBox([1.36, .22, .62], 0xb5d4ff, [-.28, 1.98, 0]);
            lightbarGlass.material = makeMat(0xb5d4ff, {
                transparent: !0,
                opacity: .34
            });
            const red = createBox([.56, .15, .24], 0xff2030, [-.6, 1.98, -.14]);
            red.material = lightRed;
            const blue = createBox([.56, .15, .24], 0x2f77ff, [.02, 1.98, .14]);
            blue.material = lightBlue;
            const siren = createBox([.3, .08, .18], 0xf4f4f4, [-.28, 1.92, 0]);
            lightbar.add(lightbarBase, lightbarGlass, red, blue, siren);
            group.add(lightbar);
            const pushBar = createBox([.16, .76, 1.36], 0x161b20, [3.02, .86, 0]);
            pushBar.material = trim;
            group.add(pushBar);
            const grille = createBox([.16, .42, 1.1], 0x111317, [2.92, .8, 0]);
            grille.material = trim;
            group.add(grille);
            const headLeft = createBox([.08, .22, .5], 0xfff2a8, [2.96, .86, -.58]);
            const headRight = createBox([.08, .22, .5], 0xfff2a8, [2.96, .86, .58]);
            headLeft.material = getSharedOverlayBasicMaterial(0xfff2a8);
            headRight.material = headLeft.material;
            group.add(headLeft, headRight);
            const tailLeft = createBox([.08, .2, .44], 0xb60e1b, [-3.04, .88, -.56]);
            const tailRight = createBox([.08, .2, .44], 0xb60e1b, [-3.04, .88, .56]);
            tailLeft.material = getSharedOverlayBasicMaterial(0xb60e1b);
            tailRight.material = tailLeft.material;
            group.add(tailLeft, tailRight);
            const spoiler = createBox([.9, .08, 1.12], 0x1b1d22, [-2.7, 1.28, 0]);
            spoiler.material = trim;
            group.add(spoiler);
            const wheels = [];
            const wheelMaterial = makeMat(0x111111);
            for (const x of [-1.72, 1.74])
                for (const z of [-1.1, 1.1]) {
                    const wheel = new THREE.Mesh(getSharedOverlayCylinderGeometry(.42, .42, .34, 20), wheelMaterial);
                    wheel.rotation.x = Math.PI / 2;
                    wheel.position.set(x, .42, z);
                    group.add(wheel);
                    wheels.push(wheel);
                }
            const antenna = createBox([.03, .62, .03], 0x1f252c, [-2.12, 2.18, .22]);
            antenna.material = trim;
            const mirrorLeft = createBox([.18, .12, .08], 0x1b1d22, [.74, 1.32, -1.12]);
            const mirrorRight = createBox([.18, .12, .08], 0x1b1d22, [.74, 1.32, 1.12]);
            mirrorLeft.material = trim;
            mirrorRight.material = trim;
            group.add(antenna, mirrorLeft, mirrorRight);
            group.userData.wheels = wheels;
            group.userData.wheelRadius = .42;
            group.userData.lightRed = red;
            group.userData.lightBlue = blue;
            return group;
        }

        function createNpcFigure(seed=0, palette={}) {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmNpcFigure";
            const skin = new THREE.MeshLambertMaterial({
                color: palette.skin || 0xd6b08f
            });
            const jacket = new THREE.MeshLambertMaterial({
                color: palette.jacket || 0x47515c
            });
            const pants = new THREE.MeshLambertMaterial({
                color: palette.pants || 0x24303a
            });
            const shoes = new THREE.MeshLambertMaterial({
                color: palette.shoes || 0x14181c
            });
            const head = createEllipsoid([.42, .5, .42], 0xd6b08f, [0, 1.74, 0], skin);
            const torso = createEllipsoid([.76, .98, .44], 0x47515c, [0, 1.08, 0], jacket);
            const pelvis = createEllipsoid([.52, .34, .32], 0x24303a, [0, .48, 0], pants);
            const armL = createEllipsoid([.18, .78, .18], 0xd6b08f, [-.42, 1.08, 0], jacket);
            const armR = createEllipsoid([.18, .78, .18], 0xd6b08f, [.42, 1.08, 0], jacket);
            const legL = createEllipsoid([.22, .9, .22], 0x24303a, [-.15, -.2, 0], pants);
            const legR = createEllipsoid([.22, .9, .22], 0x24303a, [.15, -.2, 0], pants);
            const shoeL = createBox([.24, .08, .34], 0x14181c, [-.15, -.7, .06]);
            const shoeR = createBox([.24, .08, .34], 0x14181c, [.15, -.7, .06]);
            shoeL.material = shoes;
            shoeR.material = shoes;
            group.add(head, torso, pelvis, armL, armR, legL, legR, shoeL, shoeR);
            group.userData.limbs = {
                armL,
                armR,
                legL,
                legR
            };
            group.userData.seed = seed;
            return group;
        }

        function createTowTruckVisual() {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmTowTruck";
            const yellow = THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial({
                color: 0xf0b73f,
                roughness: .48,
                metalness: .32
            }) : new THREE.MeshLambertMaterial({
                color: 0xf0b73f
            });
            const dark = new THREE.MeshLambertMaterial({
                color: 0x1a1e24
            });
            const steel = THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial({
                color: 0x9aa3ad,
                roughness: .34,
                metalness: .72
            }) : new THREE.MeshLambertMaterial({
                color: 0x9aa3ad
            });
            const glass = THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial({
                color: 0x89c2dc,
                transparent: !0,
                opacity: .68,
                roughness: .12,
                metalness: .08
            }) : new THREE.MeshLambertMaterial({
                color: 0x89c2dc
            });
            const amber = getSharedOverlayBasicMaterial(0xffb638);
            group.add(createEllipsoid([5.6, 1.18, 2.36], 0xf0b73f, [-.4, .98, 0], yellow));
            group.add(createEllipsoid([2.2, 1.08, 1.96], 0xf4f4f1, [1.25, 1.68, 0], yellow));
            const bed = createBox([4.6, .22, 2.34], 0x9aa3ad, [-1.55, 1.02, 0]);
            bed.material = steel;
            group.add(bed);
            const rearBoom = createBox([2.8, .18, .18], 0x9aa3ad, [-3.05, 1.8, 0]);
            rearBoom.material = steel;
            rearBoom.rotation.z = -.32;
            group.add(rearBoom);
            const hookArm = createBox([.18, .18, 1.08], 0x9aa3ad, [-4.06, 1.22, 0]);
            hookArm.material = steel;
            group.add(hookArm);
            const cabinGlass = createBox([1.18, .52, 1.68], 0x89c2dc, [1.56, 1.78, 0]);
            cabinGlass.material = glass;
            group.add(cabinGlass);
            const amberLeft = createBox([.34, .14, .18], 0xffb638, [1.14, 2.28, -.3]);
            const amberRight = createBox([.34, .14, .18], 0xffb638, [1.14, 2.28, .3]);
            amberLeft.material = amber;
            amberRight.material = amber;
            group.add(amberLeft, amberRight);
            const wheels = [];
            for (const x of [-2.7, -1.08, 1.42])
                for (const z of [-1.08, 1.08]) {
                    const wheel = new THREE.Mesh(getSharedOverlayCylinderGeometry(.42, .42, .32, 18), dark);
                    wheel.rotation.x = Math.PI / 2;
                    wheel.position.set(x, .42, z);
                    group.add(wheel);
                    wheels.push(wheel);
                }
            group.userData.wheels = wheels;
            group.userData.wheelRadius = .42;
            group.userData.lights = [amberLeft, amberRight];
            return group;
        }

        function createBrokenCarShell() {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmBrokenCarShell";
            const charred = THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial({
                color: 0x272a2f,
                roughness: .82,
                metalness: .18
            }) : new THREE.MeshLambertMaterial({
                color: 0x272a2f
            });
            const glass = THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial({
                color: 0x5b6875,
                transparent: !0,
                opacity: .42
            }) : new THREE.MeshLambertMaterial({
                color: 0x5b6875
            });
            group.add(createEllipsoid([5.2, .98, 2.1], 0x272a2f, [0, .82, 0], charred));
            group.add(createEllipsoid([2.7, .78, 1.58], 0x2f3338, [-.25, 1.36, 0], charred));
            const windshield = createBox([.1, .44, 1.28], 0x5b6875, [1.02, 1.45, 0]);
            windshield.material = glass;
            group.add(windshield);
            const scorch = createEllipsoid([1.6, .12, .9], 0x111111, [.95, 1.08, -.26], getSharedOverlayBasicMaterial(0x111111, {
                transparent: !0,
                opacity: .8
            }));
            group.add(scorch);
            return group;
        }

        function spawnRuntimeOverlayItem(kind, key, group, position, data={}) {
            const overlay = ensureRuntimeOverlayGroup();
            if (!overlay || !group || !position)
                return null;
            group.position.copy(position);
            overlay.add(group);
            const item = {
                kind,
                key,
                group,
                position: position.clone ? position.clone() : position,
                data
            };
            runtimeState.overlayItems.push(item);
            return item;
        }

        function spawnFleeingDriver(position, heading) {
            if (!position || !globalState.THREE)
                return;
            const group = createNpcFigure(position.x + position.z, {
                jacket: 0x59656f,
                pants: 0x2a333d
            });
            group.position.copy(position);
            group.position.y = getTerrainYWorld(position, position.y || 0) + .74;
            group.rotation.y = Number(heading) || 0;
            spawnRuntimeOverlayItem("aftermath", `driver_${Math.round(position.x)}_${Math.round(position.z)}_${Date.now()}`, group, group.position, {
                type: "driver",
                life: 16,
                speed: 2.3 + Math.abs(Math.sin(position.x)) * .6,
                heading: (Number(heading) || 0) + (Math.random() > .5 ? .9 : -.9)
            });
        }

        function spawnTowRecoveryScene(position, yaw) {
            if (!position || !globalState.THREE)
                return;
            const group = new globalState.THREE.Group;
            group.name = "__tmTowRecoveryScene";
            const truck = createTowTruckVisual();
            const shell = createBrokenCarShell();
            truck.position.set(0, 0, 0);
            shell.position.set(-4.8, .28, 0);
            shell.rotation.y = Math.PI;
            group.add(truck, shell);
            group.position.copy(position);
            group.position.y = getTerrainYWorld(position, position.y || 0);
            group.rotation.y = Number(yaw) || 0;
            spawnRuntimeOverlayItem("aftermath", `tow_${Math.round(position.x)}_${Math.round(position.z)}_${Date.now()}`, group, group.position, {
                type: "tow",
                life: 22,
                speed: 6.5,
                heading: Number(yaw) || 0
            });
        }

        function spawnPoliceCar(playerPos, index) {
            const overlay = ensureRuntimeOverlayGroup();
            if (!overlay || !playerPos)
                return null;
            const car = createPoliceVisual();
            const angle = (index * 2.17 + performance.now() * .001) % (Math.PI * 2);
            const distance = 70 + 22 * index;
            car.position.set(playerPos.x + Math.cos(angle) * distance, getTerrainYWorld(playerPos, 0), playerPos.z + Math.sin(angle) * distance);
            overlay.add(car);
            const state = {
                group: car,
                speed: 13 + 2.5 * index,
                index
            };
            runtimeState.policeCars.push(state);
            return state;
        }

        function startPoliceChase(reason, count=1, duration=60) {
            clearPoliceCars();
            runtimeState.policeState = null;
            const now = performance.now();
            if (!runtimeState.__tmExtensionPoliceDisabledLogAt || now - runtimeState.__tmExtensionPoliceDisabledLogAt > 5000) {
                runtimeState.__tmExtensionPoliceDisabledLogAt = now;
                log(`Extension-Polizeiautos deaktiviert; Website-Polizei bleibt aktiv (${reason || "no reason"}).`);
            }
        }

        function clearPoliceCars() {
            for (const car of runtimeState.policeCars)
                car.group && car.group.parent && car.group.parent.remove(car.group);
            runtimeState.policeCars = [];
        }

        function updatePolice(dtSeconds) {
            if (runtimeState.policeCars.length || runtimeState.policeState) {
                clearPoliceCars();
                runtimeState.policeState = null;
            }
        }

        function ensureVehicleDamagePanel() {
            if (runtimeState.damagePanel && runtimeState.damagePanel.isConnected)
                return runtimeState.damagePanel;
            if (!document.body)
                return null;
            const panel = document.createElement("div");
            panel.id = "__tmVehicleDamagePanel";
            panel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:999998;width:230px;box-sizing:border-box;background:rgba(19,23,28,.9);color:#f5f1e8;border:1px solid rgba(255,255,255,.16);border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.28);padding:10px 11px;font:700 12px/1.35 Arial,Helvetica,sans-serif;display:none;backdrop-filter:blur(10px);";
            panel.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
                    <span>Vehicle damage</span>
                    <span data-role="value">0%</span>
                </div>
                <div style="height:8px;background:rgba(255,255,255,.14);border-radius:99px;overflow:hidden;">
                    <div data-role="bar" style="height:100%;width:0%;background:#45d17a;border-radius:99px;"></div>
                </div>
                <div data-role="state" style="margin-top:6px;color:#9fd7ff;font-weight:600;">OK</div>
            `;
            document.body.appendChild(panel);
            runtimeState.damagePanel = panel;
            return panel;
        }

        function syncVehicleDamageDisplay(car=getPlayerCar()) {
            const panel = ensureVehicleDamagePanel();
            if (!panel)
                return;
            const damage = clamp(Number(car && car.__tmDamage) || 0, 0, 120);
            const visible = !!featureState.vehicleDamage || damage > 0;
            const percent = Math.min(120, Math.round(damage));
            const ratio = clamp(damage / 100, 0, 1);
            const stateText = car && car.__tmBrokenDown ? "BROKEN" : ratio < .35 ? "OK" : ratio < .7 ? "Damaged" : "Critical";
            const stateColor = ratio < .35 ? "#9fd7ff" : ratio < .7 ? "#ffd96a" : "#ff9f9f";
            const barColor = ratio < .35 ? "#45d17a" : ratio < .7 ? "#f4c542" : "#e64b4b";
            const last = panel.__tmDamageLast || {};
            if (last.visible !== visible)
                panel.style.display = visible ? "block" : "none";
            if (!visible) {
                panel.__tmDamageLast = Object.assign({}, last, {
                    visible
                });
                return;
            }
            const nodes = panel.__tmDamageNodes || (panel.__tmDamageNodes = {
                value: panel.querySelector('[data-role="value"]'),
                bar: panel.querySelector('[data-role="bar"]'),
                state: panel.querySelector('[data-role="state"]')
            });
            const value = nodes.value;
            const bar = nodes.bar;
            const state = nodes.state;
            value && last.percent !== percent && (value.textContent = `${percent}%`);
            if (bar) {
                last.percent !== percent && (bar.style.width = `${Math.min(100, percent)}%`);
                last.barColor !== barColor && (bar.style.background = barColor);
            }
            if (state) {
                last.stateText !== stateText && (state.textContent = stateText);
                last.stateColor !== stateColor && (state.style.color = stateColor);
            }
            panel.__tmDamageLast = {
                visible,
                percent,
                barColor,
                stateText,
                stateColor
            };
        }

        function getDamageSmokeTexture() {
            if (runtimeState.damageSmokeTexture)
                return runtimeState.damageSmokeTexture;
            if (!globalState.THREE || !globalState.THREE.CanvasTexture || !globalThis.document)
                return null;
            const canvas = document.createElement("canvas");
            canvas.width = 96;
            canvas.height = 96;
            const ctx = canvas.getContext("2d");
            if (!ctx)
                return null;
            const gradient = ctx.createRadialGradient(48, 48, 4, 48, 48, 46);
            gradient.addColorStop(0, "rgba(220,224,222,0.5)");
            gradient.addColorStop(.42, "rgba(160,168,166,0.22)");
            gradient.addColorStop(1, "rgba(80,86,88,0)");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 96, 96);
            const texture = new globalState.THREE.CanvasTexture(canvas);
            texture.needsUpdate = !0;
            runtimeState.damageSmokeTexture = texture;
            return texture;
        }

        function createDamageSmokeMote(material, size, position) {
            if (globalState.THREE && globalState.THREE.Sprite) {
                const sprite = new globalState.THREE.Sprite(material);
                sprite.scale.set(size, size, 1);
                position && sprite.position.set(position[0], position[1], position[2]);
                return sprite;
            }
            return createEllipsoid([size, size * .8, size], 0x9da4a3, position, material);
        }

        function ensureVehicleDamageVisuals(car) {
            if (!car || !car.cameraGroup || !globalState.THREE)
                return null;
            if (car.__tmDamageVisuals && car.__tmDamageVisuals.parent)
                return car.__tmDamageVisuals;
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmVehicleDamageVisuals";
            const scorchMaterial = getSharedOverlayBasicMaterial(0x181818, {
                transparent: !0,
                opacity: .78
            });
            const smokeMaterial = getSharedOverlayBasicMaterial(0xa9b1af, {
                transparent: !0,
                opacity: .16,
                depthWrite: !1
            });
            const smokeTexture = getDamageSmokeTexture();
            const sparkMaterial = getSharedOverlayBasicMaterial(0xffa331);
            const dents = [
                createEllipsoid([1.1, .08, .52], 0x181818, [2.05, 1.08, -.35], scorchMaterial),
                createEllipsoid([.85, .07, .42], 0x181818, [1.25, 1.12, .62], scorchMaterial),
                createEllipsoid([.72, .06, .38], 0x181818, [-1.55, 1.04, -.72], scorchMaterial)
            ];
            for (const dent of dents)
                group.add(dent);
            const smoke = new THREE.Group;
            smoke.name = "__tmDamageSmoke";
            for (let index = 0; index < 10; index++) {
                const puff = new THREE.Group;
                puff.userData.phase = seededUnit(index, 37);
                puff.userData.opacityMaterials = [];
                for (let part = 0; part < 2; part++) {
                    const spread = .06 + part * .045;
                    const material = smokeTexture && THREE.SpriteMaterial ? new THREE.SpriteMaterial({
                        map: smokeTexture,
                        color: 0xb6bcbb,
                        transparent: !0,
                        opacity: .1 + .025 * part,
                        depthWrite: !1
                    }) : smokeMaterial.clone();
                    if (material && material.userData && material.userData.tmSharedResource) {
                        delete material.userData.tmSharedResource;
                        delete material.userData.tmEvictedFromCache;
                    }
                    const waver = seededUnit(index, part + 11) * Math.PI * 2;
                    const motePosition = [Math.cos(waver) * spread, Math.sin(waver * 1.7) * spread, Math.sin(waver) * spread];
                    const mote = createDamageSmokeMote(material, .18 + .018 * index + .04 * part, motePosition);
                    puff.userData.opacityMaterials.push({
                        material,
                        offset: Math.hypot(motePosition[0], motePosition[1], motePosition[2])
                    });
                    puff.add(mote);
                }
                puff.position.set(1.25 + .06 * index, 1.38 + .13 * index, -.22 + Math.sin(index) * .16);
                smoke.add(puff);
            }
            group.add(smoke);
            const sparks = new THREE.Group;
            sparks.name = "__tmDamageSparks";
            for (let index = 0; index < 8; index++)
                sparks.add(createEllipsoid([.08, .08, .08], 0xffa331, [1.65, 1.22, -.35], sparkMaterial));
            group.add(sparks);
            group.userData.dents = dents;
            group.userData.smoke = smoke;
            group.userData.sparks = sparks;
            car.cameraGroup.add(group);
            car.__tmDamageVisuals = group;
            return group;
        }

        function updateVehicleDamageVisuals(dtSeconds) {
            const car = getPlayerCar();
            shouldRunRuntimeTask("vehicleDamageDisplay", CUSTOM_BUILDING_PERF.damagePanelUpdateMs) && syncVehicleDamageDisplay(car);
            if (!car)
                return;
            const damage = clamp(Number(car.__tmDamage) || 0, 0, 120);
            const ratio = clamp(damage / 100, 0, 1);
            const shouldShowVisuals = !!featureState.vehicleDamage && ratio > .03 && !runtimeState.activeAircraft;
            const existingVisuals = car.__tmDamageVisuals && car.__tmDamageVisuals.parent ? car.__tmDamageVisuals : null;
            const group = shouldShowVisuals || existingVisuals ? ensureVehicleDamageVisuals(car) : null;
            if (!group)
                return;
            group.visible = shouldShowVisuals;
            if (!shouldShowVisuals)
                return;
            const time = performance.now() / 1000;
            const dents = Array.isArray(group.userData && group.userData.dents) ? group.userData.dents : [];
            for (let index = 0; index < dents.length; index++)
                dents[index].visible = ratio > .12 + index * .18;
            const smoke = group.userData.smoke;
            if (smoke) {
                smoke.visible = ratio > .35;
                if (smoke.visible) {
                    group.userData.smokeAccumulator = (Number(group.userData.smokeAccumulator) || 0) + Math.max(.001, Number(dtSeconds) || .016);
                    if (group.userData.smokeAccumulator >= CUSTOM_BUILDING_PERF.damageSmokeUpdateMs / 1000) {
                        group.userData.smokeAccumulator = 0;
                        for (let index = 0; index < smoke.children.length; index++) {
                            const puff = smoke.children[index];
                            const wave = (time * (.8 + ratio) + index * .37 + (puff.userData.phase || 0)) % 1;
                            puff.position.y = 1.32 + index * .14 + wave * .42;
                            puff.position.x = 1.1 + Math.sin(time * 1.7 + index) * .13 + index * .055;
                            puff.position.z = -.18 + Math.cos(time * 1.35 + index) * .16;
                            puff.scale.setScalar(.2 + ratio * .28 + wave * .1);
                            const materials = puff.userData.opacityMaterials || [];
                            for (const item of materials)
                                item.material.opacity = clamp(.035 + ratio * .13 - wave * .06 + item.offset * .025, .015, .22);
                        }
                    }
                } else {
                    group.userData.smokeAccumulator = 0;
                }
            }
            const sparks = group.userData.sparks;
            if (sparks) {
                sparks.visible = ratio > .78;
                if (!sparks.visible)
                    return;
                for (let index = 0; index < sparks.children.length; index++) {
                    const spark = sparks.children[index];
                    const wave = (time * 8 + index * .41) % 1;
                    spark.position.set(1.75 + wave * .85, 1.12 + Math.sin(wave * Math.PI) * .55, -.35 + Math.cos(index * 2.3) * wave * .5);
                    spark.visible = wave < .72;
                }
            }
        }

        function applyVehicleDamage(amount, reason) {
            if (!featureState.vehicleDamage)
                return;
            const car = getPlayerCar();
            if (!car)
                return;
            const appliedAmount = Math.max(0, Number(amount) || 0) * VEHICLE_DAMAGE_TUNING.intakeMultiplier;
            car.__tmDamage = Math.min(120, (Number(car.__tmDamage) || 0) + appliedAmount);
            syncVehicleDamageDisplay(car);
            if (car.__tmDamage >= VEHICLE_DAMAGE_TUNING.breakdownThreshold && !car.__tmBrokenDown) {
                car.__tmBrokenDown = !0;
                car.engineRunning = !1;
                setPlayerSpeed(car, 0);
                notifyRuntime(`Car broken (${reason}). Press E near it to tow for ${VEHICLE_DAMAGE_TUNING.towCost} EUR or steal a replacement.`, "error");
            }
        }

        function resetPlayerWorld(reason) {
            const car = getPlayerCar();
            notifyRuntime(`${reason}. Reset.`, "error");
            setPlayerMoney(0);
            runtimeState.survivalState = null;
            clearPoliceCars();
            runtimeState.policeState = null;
            if (car) {
                if (typeof car.reset === "function")
                    car.reset();
                car.__tmDamage = 0;
                car.__tmBrokenDown = !1;
                car.engineRunning = !0;
                syncVehicleDamageDisplay(car);
            }
            syncFeatureMenu();
        }

        function ensureSurvivalState() {
            if (!runtimeState.survivalState)
                runtimeState.survivalState = {
                    hunger: featureState.hardStart ? 35 : 100,
                    thirst: featureState.hardStart ? 35 : 100,
                    lastBuyAt: 0
                };
            return runtimeState.survivalState;
        }

        function updateSurvival(dtSeconds) {
            if (!featureState.survival)
                return;
            const state = ensureSurvivalState();
            state.hunger -= dtSeconds * .18;
            state.thirst -= dtSeconds * .28;
            if (state.hunger <= 0 || state.thirst <= 0)
                resetPlayerWorld("You starved or dehydrated");
        }

        function chunkPoiKey(chunk) {
            const cx = Math.round(Number(chunk && chunk.cx) || 0);
            const cz = Math.round(Number(chunk && chunk.cz) || 0);
            if (isDeveloperToggleEnabled("perfChunkPoiKeyCache") && chunk) {
                const cached = chunk.__tmPoiKeyCache;
                if (cached && cached.cx === cx && cached.cz === cz)
                    return cached.key;
                const key = `${cx}:${cz}`;
                chunk.__tmPoiKeyCache = {
                    cx,
                    cz,
                    key
                };
                return key;
            }
            return `${cx}:${cz}`;
        }

        function fetchOverpassJson(query) {
            return fetch("https://overpass-api.de/api/interpreter", {
                method: "POST",
                body: query
            }).then((async response => {
                if (!response.ok) {
                    let text = "";
                    try {
                        text = await response.text();
                    } catch (textError) {}
                    throw new Error(`Overpass HTTP ${response.status}${text ? `: ${text.slice(0, 90)}` : ""}`);
                }
                const contentType = response.headers && response.headers.get("content-type") || "";
                if (contentType && !/json/i.test(contentType)) {
                    let text = "";
                    try {
                        text = await response.text();
                    } catch (textError) {}
                    throw new Error(`Overpass lieferte kein JSON${text ? `: ${text.slice(0, 90)}` : ""}`);
                }
                return response.json();
            }));
        }

        function queuePoiFetch(chunk) {
            if (!featureState.shops)
                return;
            if (!chunk || !chunk.bbox || !runtimeState.geoModule)
                return;
            const now = Date.now();
            if (runtimeState.poiFetchBackoffUntil && now < runtimeState.poiFetchBackoffUntil)
                return;
            if (runtimeState.poiRequestQueue.size >= 1)
                return;
            const key = chunkPoiKey(chunk);
            if (runtimeState.poiCache.has(key) || runtimeState.poiRequestQueue.has(key))
                return;
            runtimeState.poiRequestQueue.add(key);
            const south = Math.min(Number(chunk.bbox[0]) || 0, Number(chunk.bbox[2]) || 0);
            const north = Math.max(Number(chunk.bbox[0]) || 0, Number(chunk.bbox[2]) || 0);
            const west = Math.min(Number(chunk.bbox[1]) || 0, Number(chunk.bbox[3]) || 0);
            const east = Math.max(Number(chunk.bbox[1]) || 0, Number(chunk.bbox[3]) || 0);
            const query = `[out:json][timeout:8];(node["shop"="supermarket"](${south},${west},${north},${east});way["shop"="supermarket"](${south},${west},${north},${east});node["shop"="car"](${south},${west},${north},${east});way["shop"="car"](${south},${west},${north},${east});node["craft"="beekeeper"](${south},${west},${north},${east});node["man_made"="apiary"](${south},${west},${north},${east}););out center tags;`;
            fetchOverpassJson(query).then(data => {
                runtimeState.poiFetchFailures = 0;
                runtimeState.poiFetchBackoffUntil = 0;
                const pois = [];
                for (const element of toSafeArray(data && data.elements)) {
                    const lat = Number(element.lat || element.center && element.center.lat);
                    const lon = Number(element.lon || element.center && element.center.lon);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon))
                        continue;
                    let position = null;
                    try {
                        position = runtimeState.geoModule.convertProjLocalCoords([lat, lon]);
                    } catch (geoError) {}
                    if (!position)
                        continue;
                    const tags = element.tags || {};
                    const type = "supermarket" === tags.shop ? "supermarket" : "car" === tags.shop ? "autoshop" : "apiary";
                    position.y = getTerrainYWorld(position, 0);
                    pois.push({
                        type,
                        name: normalizeTownLabel(tags.name) || ("autoshop" === type ? "Auto shop" : "supermarket" === type ? "Supermarket" : "Apiary"),
                        position
                    });
                }
                runtimeState.poiCache.set(key, pois);
            }).catch((poiError => {
                runtimeState.poiCache.set(key, []);
                const failedAt = Date.now();
                runtimeState.poiFetchFailures = Math.min(8, (Number(runtimeState.poiFetchFailures) || 0) + 1);
                runtimeState.poiFetchBackoffUntil = failedAt + Math.min(10 * 60 * 1000, 30 * 1000 * Math.pow(2, runtimeState.poiFetchFailures - 1));
                if (failedAt - (Number(runtimeState.poiFetchWarnedAt) || 0) > 60 * 1000) {
                    runtimeState.poiFetchWarnedAt = failedAt;
                    warn("POI-Daten momentan nicht erreichbar; externe Overpass-Abfragen pausieren kurz.", poiError);
                }
            })).finally((() => runtimeState.poiRequestQueue.delete(key)));
        }

        function createPoiObject(poi) {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = `__tmPoi:${poi.type}`;
            const color = "supermarket" === poi.type ? 0x34a853 : "autoshop" === poi.type ? 0x3d77d4 : 0xffc928;
            group.add(createBox([7, 3.2, 5], color, [0, 1.6, 0]));
            group.add(createBox([5.8, .45, 4.2], 0xf4f4f4, [0, 3.45, 0]));
            if ("apiary" === poi.type) {
                for (let i = 0; i < 4; i++)
                    group.add(createBox([.8, .55, .7], 0xf0d060, [-1.5 + i, .35, 2.5]));
            }
            group.position.copy(poi.position);
            return group;
        }

        function rebuildPoiOverlays() {
            const overlay = ensureRuntimeOverlayGroup();
            if (!overlay || !featureState.shops)
                return;
            const chunks = getLoadedChunks();
            const chunkKeys = [];
            let chunkSignature = "";
            for (const chunk of chunks) {
                queuePoiFetch(chunk);
                const key = chunkPoiKey(chunk);
                if (isDeveloperToggleEnabled("perfPoiOverlaySignatureDirect") && isDeveloperToggleEnabled("perfPoiOverlaySignature"))
                    chunkSignature += `${chunkSignature ? "|" : ""}${key}`;
                else
                    chunkKeys.push(key);
            }
            const poiCounts = [];
            let poiSignature = "";
            let expectedPoiCount = 0;
            for (const [key, pois] of runtimeState.poiCache) {
                const count = toSafeArray(pois).length;
                expectedPoiCount += count;
                if (isDeveloperToggleEnabled("perfPoiOverlaySignatureDirect") && isDeveloperToggleEnabled("perfPoiOverlaySignature"))
                    poiSignature += `${poiSignature ? "|" : ""}${key}:${count}`;
                else
                    poiCounts.push(`${key}:${count}`);
            }
            const useDirectSignature = isDeveloperToggleEnabled("perfPoiOverlaySignatureDirect") && isDeveloperToggleEnabled("perfPoiOverlaySignature");
            if (!useDirectSignature && !isDeveloperToggleEnabled("perfPoiOverlaySignature")) {
                chunkKeys.sort();
                poiCounts.sort();
            }
            const signature = useDirectSignature ? `${chunkSignature}::${poiSignature}` : `${chunkKeys.join("|")}::${poiCounts.join("|")}`;
            const existing = new Set;
            let existingPoiCount = 0;
            for (const item of runtimeState.overlayItems)
                if (item && "poi" === item.kind) {
                    existingPoiCount++;
                    item.key && existing.add(item.key);
                }
            if (runtimeState.poiOverlaySignature === signature && existingPoiCount >= expectedPoiCount)
                return;
            runtimeState.poiOverlaySignature = signature;
            for (const [chunkKey, pois] of runtimeState.poiCache)
                for (let index = 0, list = toSafeArray(pois); index < list.length; index++) {
                    const key = `${chunkKey}:${index}`;
                    if (existing.has(key))
                        continue;
                    const poi = list[index];
                    const object = createPoiObject(poi);
                    overlay.add(object);
                    runtimeState.overlayItems.push({
                        kind: "poi",
                        key,
                        type: poi.type,
                        group: object,
                        position: poi.position,
                        data: poi
                    });
                }
        }

        function getNearestPoi(type, maxDistance=28) {
            const playerPos = getPlayerPosition();
            if (!playerPos)
                return null;
            let best = null;
            let bestDistanceSq = Math.max(0, Number(maxDistance) || 28) ** 2;
            if (isDeveloperToggleEnabled("perfNearestPoiScan")) {
                const px = Number(playerPos.x) || 0;
                const pz = Number(playerPos.z) || 0;
                for (const item of runtimeState.overlayItems) {
                    if (!item || item.kind !== "poi" || type && item.type !== type || !item.position)
                        continue;
                    const dx = px - (Number(item.position.x) || 0);
                    const dz = pz - (Number(item.position.z) || 0);
                    const distanceSq = dx * dx + dz * dz;
                    if (distanceSq < bestDistanceSq) {
                        best = item;
                        bestDistanceSq = distanceSq;
                    }
                }
                return best;
            }
            for (const item of runtimeState.overlayItems) {
                if (item.kind !== "poi" || type && item.type !== type)
                    continue;
                const distanceSq = getDistanceSq2D(playerPos, item.position);
                if (distanceSq < bestDistanceSq) {
                    best = item;
                    bestDistanceSq = distanceSq;
                }
            }
            return best;
        }

        function buyFoodAndDrink() {
            const survival = ensureSurvivalState();
            if (getPlayerMoney() < 25)
                return notifyRuntime("Not enough money for food and drink.", "error");
            payPlayerMoney(25);
            survival.hunger = Math.min(100, survival.hunger + 70);
            survival.thirst = Math.min(100, survival.thirst + 80);
            survival.lastBuyAt = performance.now();
            notifyRuntime("Bought food and drink: -25 EUR");
            syncFeatureMenu();
        }

        function getTrafficResolver() {
            return runtimeState.trafficResolver || globalThis.__tmCollisionHookDebug && globalThis.__tmCollisionHookDebug.resolver || null;
        }

        function getTrafficResolverEntries(resolver) {
            const entries = [];
            if (!resolver)
                return entries;
            const carMaps = resolver.carMaps;
            if (carMaps && "function" == typeof carMaps.entries)
                for (const entry of carMaps.entries())
                    entries.push(entry);
            else if (Array.isArray(carMaps))
                for (let index = 0; index < carMaps.length; index++)
                    entries.push([index, carMaps[index]]);
            else if (carMaps && "object" == typeof carMaps) {
                if (isDeveloperToggleEnabled("perfTrafficMapIteration"))
                    for (const key in carMaps) {
                        if (Object.prototype.hasOwnProperty.call(carMaps, key))
                            entries.push([key, carMaps[key]]);
                    }
                else
                    for (const [key, value] of Object.entries(carMaps))
                        entries.push([key, value]);
            }
            return entries;
        }

        function getNearestStealableAiCar(maxDistance=12, maxSpeed=11) {
            const resolver = getTrafficResolver();
            const playerPos = getControlPosition() || getPlayerPosition();
            if (!resolver || !playerPos)
                return null;
            let best = null;
            let bestDistanceSq = Math.max(2, Number(maxDistance) || 12) ** 2;
            const visitAiCar = (aiId, aiCar) => {
                if (!aiCar)
                    return;
                if (resolver.actives && null != resolver.actives[aiId] && !resolver.actives[aiId])
                    return;
                const position = aiCar.getPosition && aiCar.getPosition();
                if (!position)
                    return;
                const distanceSq = getDistanceSq2D(playerPos, position);
                const aiSpeed = speedAbs((resolver.speeds && resolver.speeds[aiId]) ?? aiCar.speed);
                if (distanceSq > bestDistanceSq || aiSpeed > maxSpeed)
                    return;
                best = {
                    resolver,
                    aiId,
                    aiCar,
                    distanceSq,
                    aiSpeed
                };
                bestDistanceSq = distanceSq;
            };
            const carMaps = resolver.carMaps;
            if (carMaps && "function" == typeof carMaps.entries) {
                for (const [aiId, aiCar] of carMaps.entries())
                    visitAiCar(aiId, aiCar);
            } else if (Array.isArray(carMaps)) {
                for (let index = 0; index < carMaps.length; index++)
                    visitAiCar(index, carMaps[index]);
            } else if (carMaps && "object" == typeof carMaps) {
                if (isDeveloperToggleEnabled("perfTrafficMapIteration"))
                    for (const key in carMaps) {
                        if (Object.prototype.hasOwnProperty.call(carMaps, key))
                            visitAiCar(key, carMaps[key]);
                    }
                else
                    for (const key of Object.keys(carMaps))
                        visitAiCar(key, carMaps[key]);
            }
            return best;
        }

        function stealReplacementCar() {
            const car = getPlayerCar();
            const candidate = getNearestStealableAiCar();
            if (!car || !car.__tmBrokenDown)
                return !1;
            if (!candidate) {
                notifyRuntime("Kein Geld: Geh zu einem langsamen Botauto und druecke E direkt daneben.", "error");
                return !1;
            }
            return !!runInternalModule("vehicleReplacementTheft", (() => {
                const position = candidate.aiCar.getPosition && candidate.aiCar.getPosition();
                if (!position)
                    return !1;
                const oldPosition = car.getPosition && car.getPosition();
                const oldYaw = car.cameraGroup && car.cameraGroup.rotation ? car.cameraGroup.rotation.y : 0;
                const aiYaw = candidate.aiCar.cameraGroup && candidate.aiCar.cameraGroup.rotation ? candidate.aiCar.cameraGroup.rotation.y : oldYaw;
                const targetPosition = cloneVector3(position) || position.clone && position.clone() || position;
                targetPosition && (targetPosition.y = getTerrainYWorld(targetPosition, targetPosition.y || 0));
                stopAi(candidate.resolver, candidate.aiId, candidate.aiCar, 120, 5);
                if ("function" == typeof candidate.resolver.requestDelete)
                    candidate.resolver.requestDelete(candidate.aiId);
                spawnFleeingDriver(position.clone ? position.clone() : position, aiYaw);
                oldPosition && spawnTowRecoveryScene(oldPosition.clone ? oldPosition.clone() : oldPosition, oldYaw);
                "function" == typeof car.setPosition ? car.setPosition(targetPosition.clone ? targetPosition.clone() : targetPosition) : car.cameraGroup.position.copy(targetPosition);
                car.group && car.group.position && car.group.position.copy(targetPosition);
                car.cameraGroup.position.copy(targetPosition);
                car.cameraGroup.rotation.set(0, aiYaw, 0);
                car.group && (car.group.rotation.y = aiYaw,
                car.group.rotation.z = 0);
                car.steeringTarget = 0;
                "number" == typeof car.steeringAngle && (car.steeringAngle = 0);
                car.__tmDamage = 0;
                car.__tmBrokenDown = !1;
                car.engineRunning = !0;
                forcePlayerIntoCar();
                syncVehicleDamageDisplay(car);
                startPoliceChase("stolen replacement car", 10, 180);
                notifyRuntime("Ersatzauto gestohlen. Die Polizei wurde alarmiert.", "error");
                return !0;
            }
            ), !1, "Ersatzauto stehlen");
        }

        function interactRuntime() {
            const now = performance.now();
            if (runtimeState.lastInteractionAt && now - runtimeState.lastInteractionAt < 450)
                return;
            runtimeState.lastInteractionAt = now;
            const car = getPlayerCar();
            if (car && car.__tmBrokenDown) {
                if (getPlayerMoney() >= VEHICLE_DAMAGE_TUNING.towCost) {
                    payPlayerMoney(VEHICLE_DAMAGE_TUNING.towCost);
                    car.__tmDamage = 0;
                    car.__tmBrokenDown = !1;
                    car.engineRunning = !0;
                    syncVehicleDamageDisplay(car);
                    notifyRuntime(`Tow truck repaired your car: -${VEHICLE_DAMAGE_TUNING.towCost} EUR`);
                    return syncFeatureMenu();
                }
                return void stealReplacementCar();
            }
            if (featureState.survival && getNearestPoi("supermarket", 35))
                return buyFoodAndDrink();
            if (featureState.hardStart && runtimeState.hardStartLocked && getNearestPoi("autoshop", 45)) {
                if (getPlayerMoney() < 500) {
                    runtimeState.hardStartLocked = !1;
                    car && (car.engineRunning = !0);
                    startPoliceChase("stolen starter car", 10, 180);
                    notifyRuntime("No money: you stole a starter car. Police response incoming.", "error");
                    return;
                }
                payPlayerMoney(500);
                runtimeState.hardStartLocked = !1;
                car && (car.engineRunning = !0);
                notifyRuntime("Starter car bought.");
                return syncFeatureMenu();
            }
        }

        function suppressRunwayBuildings(chunk) {
            if (!featureState.aircraft)
                return;
            if (!chunk || chunk.__tmRunwayBuildingsSuppressed || !chunk.aerowayGraph || !Array.isArray(chunk.buildings))
                return;
            const runways = [];
            for (const edge of toSafeArray(chunk.aerowayGraph.edges))
                edge && typeof edge.getLength === "function" && edge.getLength() >= 330 && runways.push(edge);
            if (!runways.length)
                return;
            chunk.__tmRunwayBuildingsSuppressed = !0;
            const remainingBuildings = [];
            for (const building of chunk.buildings) {
                const center = building && building.houseCenterLocal;
                let keep = !0;
                for (const runway of runways) {
                    if (!center)
                        break;
                    const points = runway.points || [];
                    const clearance = Math.max(45, Number(runway.width) / 2 + 35);
                    const clearanceSq = clearance * clearance;
                    for (let index = 0; index < points.length - 1; index++) {
                        const a = points[index];
                        const b = points[index + 1];
                        const ax = a.x;
                        const az = a.z;
                        const bx = b.x;
                        const bz = b.z;
                        const dx = bx - ax;
                        const dz = bz - az;
                        const lenSq = dx * dx + dz * dz || 1;
                        const t = clamp(((center.x - ax) * dx + (center.z - az) * dz) / lenSq, 0, 1);
                        const px = ax + dx * t;
                        const pz = az + dz * t;
                        const distX = center.x - px;
                        const distZ = center.z - pz;
                        if (distX * distX + distZ * distZ < clearanceSq) {
                            keep = !1;
                            break;
                        }
                    }
                    if (!keep)
                        break;
                }
                keep && remainingBuildings.push(building);
            }
            chunk.buildings = remainingBuildings;
        }

        function getAirportEntries() {
            const chunks = getLoadedChunks();
            const signature = getWorldCollisionChunkSignature(chunks);
            const now = performance.now();
            if (Array.isArray(runtimeState.airportEntryCache) && runtimeState.airportEntrySignature === signature && now - (Number(runtimeState.airportEntryCacheAt) || 0) < 1800)
                return runtimeState.airportEntryCache;
            const airports = [];
            for (const chunk of chunks) {
                if (!chunk || !chunk.aerowayGraph || !chunk.centerVec)
                    continue;
                const edges = toSafeArray(chunk.aerowayGraph.edges);
                for (let index = 0; index < edges.length; index++) {
                    const edge = edges[index];
                    const length = edge && typeof edge.getLength === "function" ? edge.getLength() : 0;
                    if (!edge || length < 330)
                        continue;
                    let points = null;
                    let start = null;
                    let end = null;
                    if (isDeveloperToggleEnabled("perfAirportEntryBuild")) {
                        const rawPoints = toSafeArray(edge.points);
                        if (rawPoints.length < 2)
                            continue;
                        start = rawPoints[0].clone().add(chunk.centerVec);
                        end = rawPoints[rawPoints.length - 1].clone().add(chunk.centerVec);
                        points = [start, end];
                    } else {
                        points = [];
                        for (const point of toSafeArray(edge.points))
                            points.push(point.clone().add(chunk.centerVec));
                        if (points.length < 2)
                            continue;
                        start = points[0];
                        end = points[points.length - 1];
                    }
                    let direction;
                    let center;
                    if (isDeveloperToggleEnabled("perfAirportDirectionMath")) {
                        const dx = end.x - start.x;
                        const dz = end.z - start.z;
                        const len = Math.hypot(dx, dz);
                        if (len < 1e-3)
                            continue;
                        direction = new globalState.THREE.Vector3(dx / len,0,dz / len);
                        center = new globalState.THREE.Vector3((start.x + end.x) * .5,(start.y + end.y) * .5,(start.z + end.z) * .5);
                    } else {
                        direction = end.clone().sub(start);
                        direction.y = 0;
                        if (direction.lengthSq() < 1e-6)
                            continue;
                        direction.normalize();
                        center = start.clone().lerp(end, .5);
                    }
                    airports.push({
                        key: `${chunkPoiKey(chunk)}:runway:${index}`,
                        chunk,
                        edge,
                        points,
                        center,
                        direction,
                        side: new globalState.THREE.Vector3(-direction.z,0,direction.x),
                        length,
                        width: Number(edge.width) || 30
                    });
                }
            }
            runtimeState.airports = airports;
            runtimeState.airportEntryCache = airports;
            runtimeState.airportEntrySignature = signature;
            runtimeState.airportEntryCacheAt = now;
            return airports;
        }

        function createAircraftModel(type) {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = `__tmAircraft:${type}`;
            const makeMat = (color, extra={}) => createFlatMaterial(color, extra);
            const white = makeMat("helicopter" === type ? 0xe7efe7 : 0xf0f4fa, {
                transparent: !1
            });
            const dark = makeMat(0x1f2833);
            const glass = makeMat(0x89c2dc, {
                transparent: !0,
                opacity: .7
            });
            const accentColor = "helicopter" === type ? 0x2c855c : "jet" === type ? 0xd84545 : "passenger" === type ? 0x2e6fc6 : 0xf0b73f;
            const accent = makeMat(accentColor);
            const lightRed = getSharedOverlayBasicMaterial(0xff2935);
            const lightGreen = getSharedOverlayBasicMaterial(0x2ff072);
            const lightWhite = getSharedOverlayBasicMaterial(0xffffff);
            const length = "passenger" === type ? 86 : "jet" === type ? 24 : "helicopter" === type ? 15 : 18;
            const bodyRadius = "passenger" === type ? 3.6 : "jet" === type ? 1.4 : "helicopter" === type ? 1.1 : 1.25;
            const fuselage = new THREE.Mesh(getSharedOverlayCylinderGeometry(bodyRadius, bodyRadius * .75, length, 18), white);
            fuselage.rotation.z = Math.PI / 2;
            group.add(fuselage);
            group.add(createEllipsoid([length * .58, bodyRadius * .55, bodyRadius * 1.62], accentColor, [-length * .04, -bodyRadius * .18, 0], accent));
            const nose = new THREE.Mesh(getSharedOverlayConeGeometry(bodyRadius, bodyRadius * 2.2, 18), white);
            nose.rotation.z = -Math.PI / 2;
            nose.position.x = length / 2 + bodyRadius;
            group.add(nose);
            const tail = new THREE.Mesh(getSharedOverlayConeGeometry(bodyRadius * .75, bodyRadius * 1.8, 18), accent);
            tail.rotation.z = Math.PI / 2;
            tail.position.x = -length / 2 - bodyRadius * .6;
            group.add(tail);
            const cockpit = createBox([bodyRadius * 2.2, bodyRadius * .62, bodyRadius * 1.25], 0x89c2dc, [length * .34, bodyRadius * .35, 0]);
            cockpit.material = glass;
            group.add(cockpit);
            const stripe = createBox([length * .78, bodyRadius * .18, bodyRadius * 2.05], accentColor, [-length * .04, -bodyRadius * .18, 0]);
            stripe.material = accent;
            group.add(stripe);
            const rotors = [];
            const wheels = [];
            const lights = [];
            if ("helicopter" === type) {
                const noseBubble = createEllipsoid([2.2, 1.14, 1.54], 0x89c2dc, [length * .36, .4, 0], glass);
                group.add(noseBubble);
                const mainRotor = new THREE.Group;
                mainRotor.name = "__tmRotorMain";
                mainRotor.add(createBox([9.8, .16, .28], 0x202326, [0, 0, 0]));
                mainRotor.add(createBox([.28, .16, 9.8], 0x202326, [0, 0, 0]));
                mainRotor.position.set(0, bodyRadius + 1.22, 0);
                group.add(mainRotor);
                const rotorMast = createBox([.34, 1.1, .34], 0x202326, [0, bodyRadius + .7, 0]);
                rotorMast.material = dark;
                group.add(rotorMast);
                rotors.push({
                    group: mainRotor,
                    axis: "y",
                    speed: 24
                });
                const tailBoom = createBox([6.8, .28, .34], accentColor, [-length / 2 - 3.2, .55, 0]);
                group.add(tailBoom);
                const tailRotor = new THREE.Group;
                tailRotor.name = "__tmRotorTail";
                tailRotor.add(createBox([.14, 2.6, .18], 0x202326, [0, 0, 0]));
                tailRotor.add(createBox([.14, .18, 2.6], 0x202326, [0, 0, 0]));
                tailRotor.position.set(-length / 2 - 6.7, .72, 0);
                group.add(tailRotor);
                rotors.push({
                    group: tailRotor,
                    axis: "x",
                    speed: 38
                });
                group.add(createBox([5.8, .12, .18], 0x1c1f22, [0, -bodyRadius - .2, -1.25]));
                group.add(createBox([5.8, .12, .18], 0x1c1f22, [0, -bodyRadius - .2, 1.25]));
                group.add(createBox([.18, .95, .18], 0x1c1f22, [-1.8, -bodyRadius * .7, -1.25]));
                group.add(createBox([.18, .95, .18], 0x1c1f22, [1.8, -bodyRadius * .7, -1.25]));
                group.add(createBox([.18, .95, .18], 0x1c1f22, [-1.8, -bodyRadius * .7, 1.25]));
                group.add(createBox([.18, .95, .18], 0x1c1f22, [1.8, -bodyRadius * .7, 1.25]));
                group.add(createBox([1.2, .2, 2.8], 0x202326, [-length / 2 - 5.9, .92, 0]));
            } else {
                const wingSpan = "passenger" === type ? 78 : "jet" === type ? 20 : 16;
                const wing = createBox([length * .26, .28, wingSpan], 0xd7dde8, [length * .02, 0, 0]);
                wing.material = makeMat(0xd7dde8);
                wing.rotation.x = .04;
                group.add(wing);
                const tailWing = createBox([length * .12, .2, wingSpan * .28], 0xd7dde8, [-length * .46, bodyRadius * .45, 0]);
                tailWing.material = wing.material;
                group.add(tailWing);
                const fin = createBox([length * .08, bodyRadius * 2.2, .28], accentColor, [-length * .48, bodyRadius * 1.2, 0]);
                fin.material = accent;
                group.add(fin);
                const belly = createEllipsoid([length * .3, bodyRadius * .34, bodyRadius * 1.12], 0xcfd7e2, [length * .04, -bodyRadius * .36, 0], wing.material);
                group.add(belly);
                const windowCount = "passenger" === type ? 12 : "jet" === type ? 4 : 3;
                for (let index = 0; index < windowCount; index++) {
                    const x = length * .26 - index * (length * .52 / Math.max(1, windowCount - 1));
                    for (const side of [-1, 1]) {
                        const window = createBox(["passenger" === type ? 1.25 : .55, .42, .07], 0x89c2dc, [x, bodyRadius * .38, side * (bodyRadius + .03)]);
                        window.material = glass;
                        group.add(window);
                    }
                }
                if ("passenger" === type)
                    for (const z of [-wingSpan * .23, wingSpan * .23]) {
                        const engine = new THREE.Mesh(getSharedOverlayCylinderGeometry(1.2, 1.2, 3.2, 16), dark);
                        engine.rotation.z = Math.PI / 2;
                        engine.position.set(length * .02, -1.2, z);
                        group.add(engine);
                        group.add(createEllipsoid([1.6, 1.22, 1.28], 0x303943, [length * .72, -1.08, z], dark));
                    }
                if ("jet" === type)
                    for (const z of [-wingSpan * .22, wingSpan * .22]) {
                        const engine = new THREE.Mesh(getSharedOverlayCylinderGeometry(.62, .72, 2.8, 14), dark);
                        engine.rotation.z = Math.PI / 2;
                        engine.position.set(length * .06, -.62, z);
                        group.add(engine);
                    }
                if ("prop" === type) {
                    const propeller = new THREE.Group;
                    propeller.name = "__tmPropeller";
                    propeller.add(createBox([.16, 3.8, .22], 0x202326, [0, 0, 0]));
                    propeller.add(createBox([.16, .22, 3.8], 0x202326, [0, 0, 0]));
                    propeller.position.set(length / 2 + bodyRadius * 2.3, 0, 0);
                    group.add(propeller);
                    rotors.push({
                        group: propeller,
                        axis: "x",
                        speed: 34
                    });
                    const propNose = createEllipsoid([1.2, .9, .9], accentColor, [length / 2 + bodyRadius * 1.1, 0, 0], accent);
                    group.add(propNose);
                }
                const gearXs = "passenger" === type ? [-length * .22, length * .22] : [-length * .22, length * .18];
                for (const x of gearXs)
                    for (const z of [-bodyRadius * 1.05, bodyRadius * 1.05]) {
                        const wheel = new THREE.Mesh(getSharedOverlayCylinderGeometry(bodyRadius * .18, bodyRadius * .18, bodyRadius * .16, 12), dark);
                        wheel.rotation.x = Math.PI / 2;
                        wheel.position.set(x, -bodyRadius - .25, z);
                        group.add(wheel);
                        wheels.push(wheel);
                        const strut = createBox([.08, bodyRadius * .82, .08], 0xb8c2ce, [x, -bodyRadius * .58, z]);
                        strut.material = makeMat(0xb8c2ce);
                        group.add(strut);
                    }
                const noseGear = new THREE.Mesh(getSharedOverlayCylinderGeometry(bodyRadius * .16, bodyRadius * .16, bodyRadius * .14, 12), dark);
                noseGear.rotation.x = Math.PI / 2;
                noseGear.position.set(length * .38, -bodyRadius - .2, 0);
                group.add(noseGear);
                wheels.push(noseGear);
                const noseStrut = createBox([.07, bodyRadius * .72, .07], 0xb8c2ce, [length * .38, -bodyRadius * .56, 0]);
                noseStrut.material = makeMat(0xb8c2ce);
                group.add(noseStrut);
                const leftLight = createBox([.22, .18, .22], 0xff2935, [length * .02, .08, -wingSpan / 2]);
                leftLight.material = lightRed;
                const rightLight = createBox([.22, .18, .22], 0x2ff072, [length * .02, .08, wingSpan / 2]);
                rightLight.material = lightGreen;
                group.add(leftLight, rightLight);
                lights.push(leftLight, rightLight);
                const wingletL = createBox([.18, bodyRadius * .92, .18], accentColor, [length * .03, .44, -wingSpan / 2]);
                const wingletR = createBox([.18, bodyRadius * .92, .18], accentColor, [length * .03, .44, wingSpan / 2]);
                wingletL.material = accent;
                wingletR.material = accent;
                group.add(wingletL, wingletR);
            }
            const beacon = createBox([.32, .2, .32], 0xffffff, [-length * .05, bodyRadius + .18, 0]);
            beacon.material = lightWhite;
            group.add(beacon);
            lights.push(beacon);
            group.userData.rotors = rotors;
            group.userData.wheels = wheels;
            group.userData.lights = lights;
            group.userData.wheelRadius = Math.max(.22, bodyRadius * .18);
            group.userData.tmAircraftType = type;
            return group;
        }

        function animateAircraftVisual(group, speed, dtSeconds) {
            if (!group)
                return;
            const dt = clamp(Number(dtSeconds) || .016, 1 / 240, .08);
            const motion = Math.max(2, Math.abs(Number(speed) || 0));
            const userData = group.userData || {};
            const rotors = Array.isArray(userData.rotors) ? userData.rotors : [];
            for (const rotor of rotors) {
                if (!rotor || !rotor.group)
                    continue;
                const delta = dt * motion * (Number(rotor.speed) || 24) / 12;
                if ("x" === rotor.axis)
                    rotor.group.rotation.x += delta;
                else if ("z" === rotor.axis)
                    rotor.group.rotation.z += delta;
                else
                    rotor.group.rotation.y += delta;
            }
            const radius = Number(userData.wheelRadius) || .28;
            const wheels = Array.isArray(userData.wheels) ? userData.wheels : [];
            for (const wheel of wheels)
                wheel.rotation.z -= motion * dt / radius;
            const flash = Math.floor(performance.now() / 160) % 2;
            const lights = Array.isArray(userData.lights) ? userData.lights : [];
            const lastLightIndex = lights.length - 1;
            for (let index = 0; index < lights.length; index++) {
                const visible = index === lastLightIndex || flash === index % 2;
                lights[index].visible !== visible && (lights[index].visible = visible);
            }
        }

        function createAirportOverlay(airport, existingKeys) {
            const overlay = ensureRuntimeOverlayGroup();
            if (!overlay || existingKeys && existingKeys.has(airport.key) || !existingKeys && runtimeState.overlayItems.some(item => item.kind === "airport" && item.key === airport.key))
                return;
            const group = new globalState.THREE.Group;
            group.name = `__tmAirport:${airport.key}`;
            const base = airport.center.clone().addScaledVector(airport.side, airport.width / 2 + 58);
            base.y = getTerrainYWorld(base, 0);
            const terminal = createBox([42, 8, 24], 0xbfc7d1, [0, 4, 0]);
            const apron = createBox([120, .18, 70], 0x555b61, [0, .09, 0]);
            const hangar = createBox([34, 9, 30], 0x788694, [-58, 4.5, 0]);
            group.add(apron, terminal, hangar);
            group.position.copy(base);
            group.rotation.y = Math.atan2(airport.direction.x, airport.direction.z) - Math.PI / 2;
            overlay.add(group);
            runtimeState.overlayItems.push({
                kind: "airport",
                key: airport.key,
                group,
                position: base,
                data: airport
            });
            existingKeys && existingKeys.add(airport.key);
            const types = ["passenger", "jet", "prop", "helicopter"];
            for (let index = 0; index < types.length; index++) {
                const aircraft = createAircraftModel(types[index]);
                const pos = base.clone().addScaledVector(airport.direction, -42 + 28 * index).addScaledVector(airport.side, 34);
                pos.y += "helicopter" === types[index] ? .8 : 1.6;
                aircraft.position.copy(pos);
                aircraft.rotation.y = getYawFromVector(airport.direction);
                overlay.add(aircraft);
                runtimeState.overlayItems.push({
                    kind: "aircraft",
                    key: `${airport.key}:parked:${index}`,
                    group: aircraft,
                    position: pos,
                    data: {
                        type: types[index],
                        airport,
                        parked: !0,
                        speed: 0,
                        heading: aircraft.rotation.y,
                        airborne: !1
                    }
                });
                existingKeys && existingKeys.add(`${airport.key}:parked:${index}`);
            }
        }

        function ensureAirportSystems() {
            if (!featureState.aircraft)
                return;
            const airports = getAirportEntries();
            const signatureKeys = [];
            for (const airport of airports)
                airport && signatureKeys.push(airport.key);
            signatureKeys.sort();
            const signature = signatureKeys.join("|");
            const existingKeys = new Set;
            for (const item of runtimeState.overlayItems)
                item && ("airport" === item.kind || "aircraft" === item.kind) && item.key && existingKeys.add(item.key);
            if (runtimeState.airportOverlaySignature === signature && existingKeys.size >= airports.length * 5)
                return;
            for (const airport of airports)
                createAirportOverlay(airport, existingKeys);
            runtimeState.airportOverlaySignature = signature;
        }

        function maybeSpawnBotAircraft() {
            if (!featureState.aircraft || runtimeState.botAircraft && runtimeState.botAircraft.length >= 3)
                return;
            const now = performance.now() / 1e3;
            if (runtimeState.nextBotAircraftAt && now < runtimeState.nextBotAircraftAt)
                return;
            runtimeState.nextBotAircraftAt = now + 28 + 24 * Math.random();
            const airports = runtimeState.airports && runtimeState.airports.length ? runtimeState.airports : getAirportEntries();
            if (!airports.length)
                return;
            const airport = airports[Math.floor(Math.random() * airports.length)];
            const overlay = ensureRuntimeOverlayGroup();
            if (!overlay)
                return;
            const type = Math.random() < .45 ? "passenger" : Math.random() < .7 ? "jet" : "prop";
            const group = createAircraftModel(type);
            const start = airport.points[0].clone().addScaledVector(airport.direction, -160);
            start.y = getTerrainYWorld(start, 0) + 1.6;
            group.position.copy(start);
            group.rotation.y = getYawFromVector(airport.direction);
            overlay.add(group);
            runtimeState.botAircraft || (runtimeState.botAircraft = []);
            runtimeState.botAircraft.push({
                group,
                airport,
                type,
                speed: 22,
                age: 0,
                phase: "takeoff",
                heading: group.rotation.y
            });
        }

        function updateBotAircraft(dtSeconds) {
            maybeSpawnBotAircraft();
            const bots = toSafeArray(runtimeState.botAircraft);
            let writeIndex = 0;
            for (let index = 0; index < bots.length; index++) {
                const bot = bots[index];
                bot.age += dtSeconds;
                const dir = bot.airport.direction;
                bot.speed = Math.min("jet" === bot.type ? 110 : 86, bot.speed + dtSeconds * ("jet" === bot.type ? 18 : 12));
                bot.group.position.addScaledVector(dir, bot.speed * dtSeconds);
                const botPos = bot.group.position;
                const runwayProgress = (botPos.x - bot.airport.center.x) * dir.x + (botPos.y - bot.airport.center.y) * dir.y + (botPos.z - bot.airport.center.z) * dir.z;
                const groundY = getTerrainYWorld(bot.group.position, 0) + 1.6;
                const climb = clamp((runwayProgress + bot.airport.length * .35) / Math.max(120, bot.airport.length * .8), 0, 1);
                bot.group.position.y = groundY + climb * ("jet" === bot.type ? 420 : 280);
                bot.group.rotation.y = bot.heading;
                bot.group.rotation.z = Math.sin(bot.age * .8) * .05;
                animateAircraftVisual(bot.group, bot.speed, dtSeconds);
                if (bot.age < 95 && bot.group.parent)
                    bots[writeIndex++] = bot;
                else
                    bot.group.parent && bot.group.parent.remove(bot.group);
            }
            bots.length = writeIndex;
            runtimeState.botAircraft = bots;
        }

        function leaveAircraft() {
            const aircraft = runtimeState.activeAircraft;
            if (aircraft)
                aircraft.active = !1;
            const state = runtimeState.aircraftControlState || {};
            const manager = getControlManager();
            const car = state.car || getPlayerCar();
            if (car && car.group && "boolean" == typeof state.carGroupVisible)
                car.group.visible = state.carGroupVisible;
            else
                setPlayerCarHidden(!1);
            if (car)
                setPlayerSpeed(car, 0);
            if (manager) {
                if (!state.wasInCar && "function" == typeof manager.getOutCar) {
                    manager.inCar = !1;
                    try {
                        manager.getOutCar();
                    } catch (leaveError) {
                        manager.inCar = !!state.wasInCar;
                    }
                } else
                    manager.inCar = !!state.wasInCar;
            }
            runtimeState.aircraftControlState = null;
            runtimeState.activeAircraft = null;
            notifyRuntime("Flugzeug verlassen");
            return !0;
        }

        function enterAircraft(item) {
            const manager = getControlManager();
            const car = getPlayerCar();
            if (!item || !item.data || !item.group || !car)
                return !1;
            runtimeState.aircraftControlState = {
                car,
                wasInCar: manager ? !!manager.inCar : !0,
                carGroupVisible: car.group ? car.group.visible : !0
            };
            if (manager && !manager.inCar && "function" == typeof manager.getInCar)
                try {
                    manager.inCar = !0;
                    manager.getInCar();
                } catch (enterError) {}
            else if (manager)
                manager.inCar = !0;
            setPlayerCarHidden(!0);
            stopAutopilot("Flugzeugsteuerung", !1);
            item.data.active = !0;
            item.data.speed = Math.max(item.data.speed || 0, 0);
            item.data.heading = item.group.rotation.y;
            item.data.group = item.group;
            runtimeState.activeAircraft = item.data;
            notifyRuntime(`Sitze im ${item.data.type}`);
            return !0;
        }

        function tryToggleAircraft() {
            if (!featureState.aircraft)
                return !1;
            if (runtimeState.activeAircraft)
                return leaveAircraft();
            const playerPos = getControlPosition() || getPlayerPosition();
            if (!playerPos)
                return !1;
            let best = null;
            let bestDistanceSq = 4900;
            for (const item of runtimeState.overlayItems) {
                if (item.kind !== "aircraft")
                    continue;
                const distanceSq = getDistanceSq2D(playerPos, item.group.position);
                if (distanceSq < bestDistanceSq) {
                    best = item;
                    bestDistanceSq = distanceSq;
                }
            }
            return !!best && enterAircraft(best);
        }

        function updateActiveAircraft(dtSeconds) {
            const aircraft = runtimeState.activeAircraft;
            const player = getPlayerCar();
            if (!aircraft || !aircraft.group || !player)
                return;
            const manager = getControlManager();
            setPlayerCarHidden(!0);
            const group = aircraft.group;
            const type = aircraft.type;
            const throttle = (manager && manager.moveForward ? 1 : 0) || Number(player.speeding) || 0;
            const braking = runtimeState.input.fullBrake || manager && manager.moveBackward ? 1 : Number(player.breaking) || 0;
            aircraft.speed = clamp((Number(aircraft.speed) || 0) + throttle * ("passenger" === type ? 13 : "jet" === type ? 22 : "helicopter" === type ? 9 : 11) * dtSeconds - braking * 28 * dtSeconds, 0, "jet" === type ? 135 : "passenger" === type ? 105 : "helicopter" === type ? 48 : 72);
            const steerInput = runtimeState.input.fastLeft || runtimeState.input.slowLeft || manager && manager.moveLeft ? 1 : runtimeState.input.fastRight || runtimeState.input.slowRight || manager && manager.moveRight ? -1 : Math.sign(Number(player.steeringTarget) || Number(player.steeringAngle) || 0);
            aircraft.heading += steerInput * ("helicopter" === type ? .9 : .35) * dtSeconds;
            const forward = runtimeState.aircraftForwardVector || (runtimeState.aircraftForwardVector = new globalState.THREE.Vector3);
            forward.set(Math.cos(aircraft.heading), 0, -Math.sin(aircraft.heading));
            group.position.addScaledVector(forward, aircraft.speed * dtSeconds);
            const groundY = getTerrainYWorld(group.position, 0) + ("helicopter" === type ? 2.5 : 1.4);
            if ("helicopter" === type) {
                const targetY = groundY + (throttle > .1 ? 42 : 12);
                group.position.y += (targetY - group.position.y) * Math.min(1, dtSeconds * .8);
            } else {
                const lift = clamp((aircraft.speed - 48) / 26, 0, 1);
                const targetY = groundY + lift * ("passenger" === type ? 260 : "jet" === type ? 380 : 140);
                group.position.y += (targetY - group.position.y) * Math.min(1, dtSeconds * .45);
                if (aircraft.speed < 36)
                    group.position.y += (groundY - group.position.y) * Math.min(1, dtSeconds * 1.2);
            }
            group.rotation.y = aircraft.heading;
            group.rotation.z = -steerInput * .18;
            animateAircraftVisual(group, aircraft.speed, dtSeconds);
            player.cameraGroup.position.copy(group.position);
            player.cameraGroup.position.y += "helicopter" === type ? 1.2 : 2.2;
            player.cameraGroup.rotation.y = aircraft.heading;
            setPlayerSpeed(player, 0);
            if ("helicopter" === type && runtimeState.input.fire)
                fireHelicopterRocket(group, forward);
        }

        function fireHelicopterRocket(group, forward) {
            const now = performance.now();
            if (runtimeState.lastRocketAt && now - runtimeState.lastRocketAt < 700)
                return;
            runtimeState.lastRocketAt = now;
            const overlay = ensureRuntimeOverlayGroup();
            if (!overlay)
                return;
            const rocket = createBox([1.6, .22, .22], 0xdedede, [0, 0, 0]);
            rocket.position.copy(group.position).addScaledVector(forward, 7);
            rocket.userData.velocity = new globalState.THREE.Vector3(forward.x * 120,forward.y * 120,forward.z * 120);
            rocket.userData.life = 4;
            overlay.add(rocket);
            runtimeState.projectileModels.push(rocket);
        }

        function updateProjectiles(dtSeconds) {
            const projectiles = runtimeState.projectileModels;
            let writeIndex = 0;
            for (let index = 0; index < projectiles.length; index++) {
                const projectile = projectiles[index];
                projectile.userData.life -= dtSeconds;
                let target = null;
                let targetDistanceSq = 1 / 0;
                for (const police of runtimeState.policeCars) {
                    const distanceSq = police.group ? police.group.position.distanceToSquared(projectile.position) : 1 / 0;
                    if (distanceSq < targetDistanceSq) {
                        target = police.group;
                        targetDistanceSq = distanceSq;
                    }
                }
                if (target && targetDistanceSq < 48400) {
                    const desired = runtimeState.projectileTempVector || (runtimeState.projectileTempVector = new globalState.THREE.Vector3);
                    desired.copy(target.position).sub(projectile.position).normalize().multiplyScalar(120);
                    projectile.userData.velocity.lerp(desired, Math.min(1, dtSeconds * 1.8));
                }
                projectile.position.addScaledVector(projectile.userData.velocity, dtSeconds);
                if (target && targetDistanceSq < 25) {
                    target.parent && target.parent.remove(target);
                    for (let policeIndex = runtimeState.policeCars.length - 1; policeIndex >= 0; policeIndex--)
                        runtimeState.policeCars[policeIndex] && runtimeState.policeCars[policeIndex].group === target && runtimeState.policeCars.splice(policeIndex, 1);
                    projectile.userData.life = 0;
                }
                if (projectile.userData.life > 0)
                    projectiles[writeIndex++] = projectile;
                else
                    projectile.parent && projectile.parent.remove(projectile);
            }
            projectiles.length = writeIndex;
        }

        function createBirdFlock(center, seed) {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmBirdFlock";
            const bodyMat = createFlatMaterial(0x3d454d);
            const wingMat = createFlatMaterial(0x222a31);
            const beakMat = createFlatMaterial(0xd39d4b);
            for (let i = 0; i < 9; i++) {
                const bird = new THREE.Group;
                bird.position.set(Math.sin(i) * 8, Math.cos(i * 1.7) * 2, Math.cos(i) * 7);
                bird.rotation.y = seededUnit(seed + i, 17) * Math.PI * 2;
                const body = createEllipsoid([.62, .24, .2], 0x3d454d, [0, 0, 0], bodyMat);
                const head = createEllipsoid([.2, .18, .16], 0x3d454d, [.28, .04, 0], bodyMat);
                const beak = new THREE.Mesh(getSharedOverlayConeGeometry(.05, .16, 6), beakMat);
                beak.rotation.z = -Math.PI / 2;
                beak.position.set(.42, .03, 0);
                const wingL = createEllipsoid([.42, .05, .22], 0x222a31, [-.05, .02, -.12], wingMat);
                const wingR = createEllipsoid([.42, .05, .22], 0x222a31, [-.05, .02, .12], wingMat);
                const tail = createEllipsoid([.18, .05, .16], 0x222a31, [-.32, .01, 0], wingMat);
                bird.add(body, head, beak, wingL, wingR, tail);
                bird.userData.wings = [wingL, wingR];
                bird.userData.seed = seed + i * 13;
                group.add(bird);
            }
            group.position.copy(center);
            group.position.y += 45 + 20 * seededUnit(seed, 3);
            group.userData.seed = seed;
            return group;
        }

        function createBeeSwarm(center, seed) {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmBeeSwarm";
            const yellow = createFlatMaterial(0xf4c42c);
            const black = createFlatMaterial(0x181b1f);
            const wingMat = createFlatMaterial(0xd8efff, {
                transparent: !0,
                opacity: .42
            });
            for (let i = 0; i < 16; i++) {
                const bee = new THREE.Group;
                const body = createEllipsoid([.2, .12, .12], 0xf4c42c, [0, 0, 0], yellow);
                const stripe1 = createBox([.03, .1, .12], 0x181b1f, [-.03, 0, 0]);
                const stripe2 = createBox([.03, .1, .12], 0x181b1f, [.04, 0, 0]);
                stripe1.material = black;
                stripe2.material = black;
                const wingL = createEllipsoid([.16, .03, .1], 0xd8efff, [-.01, .08, -.06], wingMat);
                const wingR = createEllipsoid([.16, .03, .1], 0xd8efff, [-.01, .08, .06], wingMat);
                const head = createEllipsoid([.08, .08, .08], 0x181b1f, [.11, .01, 0], black);
                bee.add(body, stripe1, stripe2, wingL, wingR, head);
                bee.position.set(Math.sin(i * 2.1) * 2, 1 + Math.cos(i) * .7, Math.cos(i * 1.4) * 2);
                bee.userData.wings = [wingL, wingR];
                bee.userData.seed = seed + i * 19;
                group.add(bee);
            }
            group.position.copy(center);
            return group;
        }

        function ensureWildlife() {
            if (!featureState.birds && !featureState.bees)
                return;
            const overlay = ensureRuntimeOverlayGroup();
            const playerPos = getPlayerPosition();
            if (!overlay || !playerPos)
                return;
            const existingKeys = new Set;
            for (const item of runtimeState.overlayItems)
                item && item.key && existingKeys.add(item.key);
            let createdThisTick = 0;
            const birdSpawnDistanceSq = CUSTOM_BUILDING_PERF.wildlifeSpawnDistance * CUSTOM_BUILDING_PERF.wildlifeSpawnDistance;
            const beeSpawnDistanceSq = CUSTOM_BUILDING_PERF.wildlifeBeeSpawnDistance * CUSTOM_BUILDING_PERF.wildlifeBeeSpawnDistance;
            if (featureState.birds) {
                for (const chunk of getLoadedChunks()) {
                    if (createdThisTick >= CUSTOM_BUILDING_PERF.wildlifeMaxNewPerTick)
                        break;
                    const key = `birds:${chunkPoiKey(chunk)}`;
                    if (existingKeys.has(key))
                        continue;
                    if (seededUnit(chunk.cx + chunk.cz, 21) < .42)
                        continue;
                    const center = chunk.centerVec || getChunkApproxCenter(chunk);
                    if (!center || getDistanceSq2D(playerPos, center) > birdSpawnDistanceSq)
                        continue;
                    const flock = createBirdFlock(center, chunk.cx + chunk.cz);
                    overlay.add(flock);
                    runtimeState.overlayItems.push({
                        kind: "birds",
                        key,
                        group: flock,
                        position: center
                    });
                    existingKeys.add(key);
                    createdThisTick++;
                }
            }
            if (featureState.bees) {
                for (const item of runtimeState.overlayItems) {
                    if (createdThisTick >= CUSTOM_BUILDING_PERF.wildlifeMaxNewPerTick)
                        break;
                    if (!item || item.kind !== "poi" || item.type !== "apiary")
                        continue;
                    const key = `bees:${item.key}`;
                    if (existingKeys.has(key))
                        continue;
                    if (!item.position || getDistanceSq2D(playerPos, item.position) > beeSpawnDistanceSq)
                        continue;
                    const bees = createBeeSwarm(item.position, item.position.x + item.position.z);
                    bees.position.copy(item.position);
                    overlay.add(bees);
                    runtimeState.overlayItems.push({
                        kind: "bees",
                        key,
                        group: bees,
                        position: item.position
                    });
                    existingKeys.add(key);
                    createdThisTick++;
                }
            }
        }

        function updateOverlayCullingAndAnimation(dtSeconds) {
            if (!runtimeState.overlayItems.length)
                return;
            const playerPos = getPlayerPosition();
            if (!playerPos)
                return;
            runtimeState.overlayTick += dtSeconds;
            const now = performance.now();
            if (now - (Number(runtimeState.overlayCleanupAt) || 0) > CUSTOM_BUILDING_PERF.overlayCleanupIntervalMs) {
                runtimeState.overlayCleanupAt = now;
                let writeIndex = 0;
                for (let index = 0; index < runtimeState.overlayItems.length; index++) {
                    const item = runtimeState.overlayItems[index];
                    if (item && item.group && (item.group.parent || item.data && item.data.active))
                        runtimeState.overlayItems[writeIndex++] = item;
                }
                runtimeState.overlayItems.length = writeIndex;
            }
            runtimeState.overlayVisibilityAccumulator = (Number(runtimeState.overlayVisibilityAccumulator) || 0) + Math.max(.001, Number(dtSeconds) || .016);
            const refreshVisibility = runtimeState.overlayVisibilityAccumulator >= .22;
            refreshVisibility && (runtimeState.overlayVisibilityAccumulator = 0);
            const overlayTick = runtimeState.overlayTick;
            const towFlash = Math.floor(now / 180) % 2;
            for (const item of runtimeState.overlayItems) {
                if (!item.group || !item.position)
                    continue;
                if (refreshVisibility || "boolean" != typeof item.__tmVisibleByDistance) {
                    const limit = item.kind === "airport" || item.kind === "aircraft" ? 6500 : item.kind === "birds" ? 1800 : 900;
                    item.__tmVisibleByDistance = !featureState.overlays || item.data && item.data.active || getDistanceSq2D(playerPos, item.group.position || item.position) <= limit * limit;
                }
                item.group.visible !== item.__tmVisibleByDistance && (item.group.visible = item.__tmVisibleByDistance);
                if (!item.group.visible)
                    continue;
                if (item.kind === "birds") {
                    item.group.position.x += Math.sin(overlayTick * .2 + item.group.userData.seed) * dtSeconds * 5;
                    item.group.position.z += Math.cos(overlayTick * .23 + item.group.userData.seed) * dtSeconds * 5;
                    item.group.rotation.y += dtSeconds * .12;
                    for (const child of item.group.children) {
                        child.rotation.z = Math.sin(overlayTick * 8 + child.position.x) * .18;
                        const flap = Math.sin(overlayTick * 14 + (child.userData.seed || 0)) * .82;
                        const wings = Array.isArray(child.userData && child.userData.wings) ? child.userData.wings : [];
                        for (const wing of wings)
                            wing.rotation.x = flap;
                    }
                } else if (item.kind === "bees") {
                    for (let index = 0; index < item.group.children.length; index++) {
                        const bee = item.group.children[index];
                        bee.position.x = Math.sin(overlayTick * 4 + index) * 2.2;
                        bee.position.z = Math.cos(overlayTick * 3.3 + index * 1.7) * 2.2;
                        bee.position.y = 1 + Math.sin(overlayTick * 6 + index * 1.2) * .55;
                        bee.rotation.y += dtSeconds * 7;
                        const flutter = Math.sin(overlayTick * 48 + (bee.userData.seed || 0)) * .95;
                        const wings = Array.isArray(bee.userData && bee.userData.wings) ? bee.userData.wings : [];
                        for (const wing of wings)
                            wing.rotation.z = flutter;
                    }
                } else if (item.kind === "aftermath" && item.data) {
                    item.data.life = Math.max(0, Number(item.data.life) - dtSeconds);
                    if (item.data.life <= 0) {
                        item.group.visible = !1;
                        continue;
                    }
                    if ("driver" === item.data.type) {
                        item.group.position.x += Math.cos(Number(item.data.heading) || 0) * Number(item.data.speed || 2) * dtSeconds;
                        item.group.position.z -= Math.sin(Number(item.data.heading) || 0) * Number(item.data.speed || 2) * dtSeconds;
                        item.group.position.y = getTerrainYWorld(item.group.position, item.group.position.y) + .74;
                        const limbs = item.group.userData.limbs || {};
                        const gait = Math.sin(overlayTick * 8 + (item.group.userData.seed || 0)) * .7;
                        limbs.armL && (limbs.armL.rotation.z = gait);
                        limbs.armR && (limbs.armR.rotation.z = -gait);
                        limbs.legL && (limbs.legL.rotation.z = -gait);
                        limbs.legR && (limbs.legR.rotation.z = gait);
                    } else if ("tow" === item.data.type) {
                        const heading = Number(item.data.heading) || 0;
                        const travel = Number(item.data.speed || 6) * dtSeconds;
                        item.group.position.x += Math.cos(heading) * travel;
                        item.group.position.z -= Math.sin(heading) * travel;
                        item.group.position.y = getTerrainYWorld(item.group.position, item.group.position.y);
                        const vehicleData = item.group.children[0] && item.group.children[0].userData || {};
                        const lights = Array.isArray(vehicleData.lights) ? vehicleData.lights : [];
                        for (const light of lights)
                            light.visible = 0 === towFlash;
                        const wheels = Array.isArray(vehicleData.wheels) ? vehicleData.wheels : [];
                        for (const wheel of wheels)
                            wheel.rotation.z -= dtSeconds * 12;
                    }
                } else if (item.kind === "aircraft" && !(item.data && item.data.active)) {
                    animateAircraftVisual(item.group, item.data && item.data.speed || 0, dtSeconds);
                }
            }
        }

        function updateCustomBuildingDoors(dtSeconds) {
            if (!isAny3dBuildingFeatureEnabled()) {
                if (runtimeState.customBuildingDoorItems.length || runtimeState.customBuildingDoorAccumulator) {
                    runtimeState.customBuildingDoorItems = [];
                    runtimeState.customBuildingDoorAccumulator = 0;
                }
                return;
            }
            if (!runtimeState.customBuildingDoorItems.length)
                return;
            runtimeState.customBuildingDoorAccumulator = (Number(runtimeState.customBuildingDoorAccumulator) || 0) + Math.max(.001, Number(dtSeconds) || .016);
            if (runtimeState.customBuildingDoorAccumulator < .05)
                return;
            const doorDt = Math.min(.12, runtimeState.customBuildingDoorAccumulator);
            runtimeState.customBuildingDoorAccumulator = 0;
            if (!globalState.THREE)
                return;
            const manager = getControlManager();
            const playerIsOnFoot = !!(manager && !manager.inCar);
            const playerPos = playerIsOnFoot ? getControlPosition() : null;
            const now = performance.now();
            for (let index = runtimeState.customBuildingDoorItems.length - 1; index >= 0; index--) {
                const item = runtimeState.customBuildingDoorItems[index];
                const group = item && item.group;
                const state = group && group.userData && group.userData.tmDoor;
                if (!group || !group.parent || !state) {
                    runtimeState.customBuildingDoorItems.splice(index, 1);
                    continue;
                }
                if (!playerIsOnFoot && (!state.current || state.current < .003))
                    continue;
                const worldPosition = item.worldPosition || (group.getWorldPosition ? group.getWorldPosition(item.__tmWorldPosition || (item.__tmWorldPosition = new globalState.THREE.Vector3)) : null);
                if (!worldPosition)
                    continue;
                const radius = Math.max(0, Number(state.radius) || 0);
                const farRadius = CUSTOM_BUILDING_PERF.doorNearDistance + radius;
                const distanceSq = playerPos ? getDistanceSq2D(playerPos, worldPosition) : 1 / 0;
                if (distanceSq > farRadius * farRadius && (!state.current || state.current < .003)) {
                    if (now - (Number(item.lastDoorUpdateAt) || 0) < CUSTOM_BUILDING_PERF.doorFarUpdateMs)
                        continue;
                    item.lastDoorUpdateAt = now;
                }
                const target = distanceSq <= radius * radius ? 1 : 0;
                if (target && playerPos && Number.isFinite(state.baseOpenY) && Number.isFinite(state.normalX) && Number.isFinite(state.normalZ)) {
                    const side = ((Number(playerPos.x) || 0) - worldPosition.x) * state.normalX + ((Number(playerPos.z) || 0) - worldPosition.z) * state.normalZ;
                    state.openY = state.closedY + state.baseOpenY * (side >= 0 ? 1 : -1);
                }
                const delta = doorDt * state.speed;
                state.current += (target - state.current) * Math.min(1, delta);
                const eased = state.current * state.current * (3 - 2 * state.current);
                group.rotation.y = state.closedY + (state.openY - state.closedY) * eased;
            }
        }

        function updateHardStartLock() {
            if (!featureState.hardStart || !runtimeState.hardStartLocked)
                return;
            const car = getPlayerCar();
            if (!car)
                return;
            car.engineRunning = !1;
            setPlayerSpeed(car, 0);
        }

        function updateNaviGuidance() {
            const guidance = runtimeState.navGuidance;
            if (!featureState.navigation || !guidance || !guidance.position)
                return;
            const game = runtimeState.game;
            const panel = game && game.missionManager && game.missionManager.missionPanel;
            const player = getPlayerCar();
            const playerPos = getControlPosition() || getPlayerPosition();
            if (!panel || !playerPos)
                return;
            const distance = getDistance2D(playerPos, guidance.position);
            if (distance <= 22) {
                panel.updateStatus && panel.updateStatus("Navi-Ziel erreicht");
                panel.turnOffCompass && panel.turnOffCompass();
                clearNaviGuidance("Ziel erreicht", !0);
                return;
            }
            const now = performance.now();
            const label = guidance.label || "Ziel";
            const distanceText = distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance.toFixed(0)} m`;
            const state = runtimeState.navGuidanceUiState || (runtimeState.navGuidanceUiState = {});
            const staticKey = `${label}|${guidance.source || ""}`;
            if (state.guidance !== guidance || state.staticKey !== staticKey || now - (Number(state.staticAt) || 0) > CUSTOM_BUILDING_PERF.navigationPanelStaticUpdateMs) {
                panel.showNavigation && panel.showNavigation();
                panel.updateStatus && panel.updateStatus(`Navi: ${label}`);
                panel.updateMissionDescriptiopn && panel.updateMissionDescriptiopn("Folge der Kompassrichtung zum gesetzten Navi-Ziel.");
                panel.updateEntry1 && panel.updateEntry1("Weg zeigen");
                panel.updateEntry2 && panel.updateEntry2(label);
                panel.updateEntry4 && panel.updateEntry4("");
                state.guidance = guidance;
                state.staticKey = staticKey;
                state.staticAt = now;
            }
            if (panel.updateCompass && player && "function" == typeof player.getHeadings)
                panel.updateCompass(playerPos, player.getHeadings(), guidance.position);
            if (state.distanceText !== distanceText) {
                panel.updateEntry3 && panel.updateEntry3(distanceText);
                state.distanceText = distanceText;
            }
        }

        function updateRuntimeSystems(game, dtSeconds) {
            runtimeState.game = game || runtimeState.game;
            shouldRunRuntimeTask("featureMenuUi", 700) && runInternalModule("featureMenuUi", (() => ensureFeatureMenu(game)), null, "Feature-Menue");
            shouldRunRuntimeTask("vehicleTuningHotkey", 1200) && runFeatureModule("vehicleTuning", ensureVehicleTuningHotkey, null, "Vehicle tuning hotkey");
            runtimeState.controlsPatched || runInternalModule("featureMenuUi", ensureRuntimeInputHandlers, null, "Input-Handler");
            const dt = Math.min(.08, Math.max(.001, Number(dtSeconds) || .016));
            const autopilotState = getAutopilotState();
            (autopilotState.enabled || autopilotState.pendingMapSelection) && runInternalModule("autopilotRouting", updateAutopilotMapSelection, null, "Autopilot-Map");
            shouldRunRuntimeTask("poiOverlays", 900) && runFeatureModule("shops", rebuildPoiOverlays, null, "POI overlays");
            shouldRunRuntimeTask("airportSystems", 1400) && runFeatureModule("aircraft", ensureAirportSystems, null, "Airport systems");
            (runtimeState.botAircraft && runtimeState.botAircraft.length || shouldRunRuntimeTask("botAircraftSpawn", 950)) && runFeatureModule("aircraft", (() => updateBotAircraft(dt)), null, "Bot aircraft");
            shouldRunRuntimeTask("wildlifeRuntime", 1200) && runInternalModule("wildlifeRuntime", ensureWildlife, null, "Wildlife runtime");
            shouldRunRuntimeTask("navigationGuidance", 120) && runFeatureModule("navigation", updateNaviGuidance, null, "Navi guidance");
            runtimeState.activeAircraft && runFeatureModule("aircraft", (() => updateActiveAircraft(dt)), null, "Active aircraft");
            runtimeState.projectileModels.length && runFeatureModule("aircraft", (() => updateProjectiles(dt)), null, "Aircraft projectiles");
            runtimeState.overlayItems.length && runInternalModule("overlayRuntime", (() => updateOverlayCullingAndAnimation(dt)), null, "Overlay runtime");
            runtimeState.customBuildingDoorItems.length && runInternalModule("customBuildingDoors", (() => updateCustomBuildingDoors(dt)), null, "Custom-building doors");
            shouldRunRuntimeTask("customBuildingOverlayCulling", CUSTOM_BUILDING_PERF.cullIntervalMs) && runInternalModule("customBuildingOverlayCulling", updateCustomBuildingOverlayCulling, null, "Custom-building culling");
            featureState.collisionHook && runInternalModule("worldCollision", updateWorldHitboxCollisions, null, "World hitboxes");
            (runtimeState.policeCars.length || runtimeState.policeState) && updatePolice(dt);
            if (featureState.survival) {
                runtimeState.survivalUpdateAccumulator = (Number(runtimeState.survivalUpdateAccumulator) || 0) + dt;
                if (runtimeState.survivalUpdateAccumulator >= .25) {
                    const survivalDt = Math.min(1.5, runtimeState.survivalUpdateAccumulator);
                    runtimeState.survivalUpdateAccumulator = 0;
                    runFeatureModule("survival", (() => updateSurvival(survivalDt)), null, "Survival update");
                }
            }
            runtimeState.hardStartLocked && runInternalModule("hardStartFlow", updateHardStartLock, null, "Hard start lock");
            featureState.vehicleDamage && runFeatureModule("vehicleDamage", (() => updateVehicleDamageVisuals(dt)), null, "Vehicle damage visuals");
            runtimeState.input.fire = !1;
        }

        function toThreeColor(value, fallback) {
            if (!globalState.THREE)
                return null;
            const color = new globalState.THREE.Color(null != fallback ? fallback : 16777215);
            try {
                null != value && color.set(value);
            } catch (colorError) {}
            return color;
        }

        function createFlatMaterial(colorValue, options={}) {
            const THREE = globalState.THREE;
            if (!THREE)
                return null;
            const color = toThreeColor(colorValue, 0xffffff);
            const opacity = null != options.opacity ? clamp(Number(options.opacity) || 0, .02, 1) : 1;
            const side = null != options.side ? options.side : THREE.DoubleSide;
            const key = [
                "flat",
                color && "function" == typeof color.getHexString ? color.getHexString() : String(colorValue),
                options.transparent ? 1 : 0,
                Math.round(opacity * 1e3) / 1e3,
                side,
                THREE.MeshBasicMaterial ? "basic" : THREE.MeshLambertMaterial ? "lambert" : "standard"
            ].join("|");
            const cache = getOverlayMaterialCache();
            const cached = cache.get(key);
            if (cached)
                return cached;
            const baseOptions = {
                color,
                transparent: !!options.transparent,
                opacity,
                side
            };
            const material = THREE.MeshBasicMaterial ? new THREE.MeshBasicMaterial(baseOptions) : THREE.MeshLambertMaterial ? new THREE.MeshLambertMaterial(baseOptions) : new THREE.MeshStandardMaterial(Object.assign({
                roughness: .6,
                metalness: .1
            }, baseOptions));
            markSharedResource(material, "overlay-material");
            return rememberLimitedCache(cache, key, material, CUSTOM_BUILDING_PERF.overlayMaterialCacheSize);
        }

        function setTextureQuality(texture) {
            if (!texture || !globalState.THREE)
                return;
            texture.wrapS = globalState.THREE.RepeatWrapping;
            texture.wrapT = globalState.THREE.RepeatWrapping;
            texture.minFilter = globalState.THREE.LinearMipmapLinearFilter;
            texture.magFilter = globalState.THREE.LinearFilter;
            texture.anisotropy = 8;
            texture.needsUpdate = !0;
        }

        function getAsphaltTexture() {
            if (runtimeState.asphaltTexture || !globalState.THREE)
                return runtimeState.asphaltTexture;
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext("2d");
            if (!ctx)
                return null;
            const image = ctx.createImageData(canvas.width, canvas.height);
            for (let index = 0; index < image.data.length; index += 4) {
                const pixel = index / 4;
                const x = pixel % canvas.width;
                const y = Math.floor(pixel / canvas.width);
                const grain = 54 + Math.floor(22 * seededUnit(x, y));
                const tire = Math.floor(8 * Math.sin(.09 * x) * Math.sin(.04 * y));
                const lineWear = Math.abs(y - canvas.height / 2) < 6 ? 18 : 0;
                const tone = clamp(grain + tire + lineWear, 25, 110);
                image.data[index] = tone;
                image.data[index + 1] = tone - 2;
                image.data[index + 2] = tone - 4;
                image.data[index + 3] = 255;
            }
            ctx.putImageData(image, 0, 0);
            const texture = new globalState.THREE.CanvasTexture(canvas);
            texture.repeat.set(.18, .18);
            setTextureQuality(texture);
            runtimeState.asphaltTexture = texture;
            return texture;
        }

        function getEnhancedWaterTexture() {
            if (runtimeState.waterTexture || !globalState.THREE)
                return runtimeState.waterTexture;
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext("2d");
            if (!ctx)
                return null;
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, "#2d92ca");
            gradient.addColorStop(.48, "#49b5dd");
            gradient.addColorStop(1, "#1d6f9e");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = .2;
            ctx.strokeStyle = "#e6fbff";
            ctx.lineWidth = 2;
            for (let row = -24; row < canvas.height + 24; row += 24) {
                ctx.beginPath();
                for (let x = -8; x <= canvas.width + 8; x += 8) {
                    const y = row + Math.sin(x * .06 + row * .15) * 5;
                    0 === x + 8 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = .12;
            ctx.strokeStyle = "#062944";
            ctx.lineWidth = 1;
            for (let row = 4; row < canvas.height; row += 19) {
                ctx.beginPath();
                for (let x = -8; x <= canvas.width + 8; x += 8) {
                    const y = row + Math.sin(x * .08 + row * .11) * 3;
                    0 === x + 8 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            const texture = new globalState.THREE.CanvasTexture(canvas);
            texture.repeat.set(.08, .08);
            setTextureQuality(texture);
            runtimeState.waterTexture = texture;
            return texture;
        }

        function createEnhancedWaterMaterial(baseMaterial) {
            const THREE = globalState.THREE;
            if (!THREE)
                return baseMaterial;
            const material = THREE.MeshBasicMaterial ? new THREE.MeshBasicMaterial({
                color: 0x4bb9df,
                transparent: !0,
                opacity: .72,
                side: THREE.DoubleSide,
                depthWrite: !1,
                map: getEnhancedWaterTexture()
            }) : baseMaterial && baseMaterial.clone ? baseMaterial.clone() : baseMaterial;
            if (material) {
                material.color && material.color.set(0x4bb9df);
                material.transparent = !0;
                material.opacity = .72;
                material.depthWrite = !1;
                material.side = THREE.DoubleSide;
                material.map || (material.map = getEnhancedWaterTexture());
                material.needsUpdate = !0;
            }
            return material || baseMaterial;
        }

        function waterPointToVector2(point) {
            return new globalState.THREE.Vector2(-(Number(point && point[0]) || 0), Number(point && point[1]) || 0);
        }

        function waterVectorToPoint(vector) {
            return {
                x: Number(vector && vector.x) || 0,
                z: Number(vector && vector.y) || 0
            };
        }

        function buildingPointsForWater(building) {
            const result = [];
            for (const point of toSafeArray(building && building.points)) {
                const x = Number(Array.isArray(point) ? point[0] : point.x) || 0;
                const z = Number(Array.isArray(point) ? point[1] : point.z) || 0;
                Number.isFinite(x) && Number.isFinite(z) && result.push({
                    x,
                    z
                });
            }
            return result;
        }

        function createWaterHoleFromFootprint(points, padding=.8) {
            if (!globalState.THREE || !Array.isArray(points) || points.length < 3)
                return null;
            const center = getFootprintCenter(points);
            const bounds = getFootprintBounds(points);
            const span = Math.max(.001, Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ));
            const scale = 1 + padding / span;
            const inflated = scaleFootprint(points, scale, center).reverse();
            const path = new globalState.THREE.Path;
            path.moveTo(inflated[0].x, inflated[0].z);
            for (let index = 1; index < inflated.length; index++)
                path.lineTo(inflated[index].x, inflated[index].z);
            path.lineTo(inflated[0].x, inflated[0].z);
            return path;
        }

        function addBuildingWaterHoles(shape, waterPoints, chunk) {
            if (!shape || !Array.isArray(waterPoints) || waterPoints.length < 3 || !chunk)
                return;
            const waterBounds = getFootprintBounds(waterPoints);
            for (const building of toSafeArray(chunk.__tmOriginalBuildings || chunk.buildings)) {
                const points = buildingPointsForWater(building);
                if (points.length < 3)
                    continue;
                const bounds = getFootprintBounds(points);
                if (!boundsOverlap(waterBounds, bounds))
                    continue;
                const center = getFootprintCenter(points);
                if (!isPointInsideFootprint(center, waterPoints))
                    continue;
                const hole = createWaterHoleFromFootprint(points, .9);
                hole && shape.holes.push(hole);
            }
        }

        function getEnhancedWaterSurfaceY(water, points, chunk) {
            const samples = [];
            for (const point of points) {
                for (const offset of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]]) {
                    const y = chunk && "function" == typeof chunk.getTerrainYLoc ? chunk.getTerrainYLoc(point.x + offset[0], point.z + offset[1]) : null;
                    null != y && Number.isFinite(Number(y)) && samples.push(Number(y));
                }
            }
            samples.sort(((a, b) => a - b));
            const lowBank = samples.length ? samples[Math.floor(samples.length * .22)] : 0;
            const dataY = Number(water && water.y);
            const baseY = Number.isFinite(dataY) ? dataY : lowBank;
            return Math.min(baseY, lowBank + .12) + .04;
        }

        async function createEnhancedWaterMesh(waterData, material, chunk, fallback, context) {
            // Replaces the original high water-wall mesh with a flatter surface and building cutouts.
            if (!globalState.THREE || !Array.isArray(waterData))
                return "function" == typeof fallback ? fallback.call(context, waterData, material, chunk) : null;
            const THREE = globalState.THREE;
            const geometries = [];
            for (const water of waterData) {
                const outline = toSafeArray(water && water.p).map(waterPointToVector2);
                if (outline.length < 3)
                    continue;
                const shape = new THREE.Shape(outline);
                for (const rawHole of toSafeArray(water && water.h)) {
                    const hole = toSafeArray(rawHole).map(waterPointToVector2);
                    hole.length >= 3 && shape.holes.push(new THREE.Path(hole));
                }
                const waterPoints = outline.map(waterVectorToPoint);
                addBuildingWaterHoles(shape, waterPoints, chunk);
                const geometry = new THREE.ShapeGeometry(shape);
                const y = getEnhancedWaterSurfaceY(water, waterPoints, chunk);
                geometry.rotateX(Math.PI / 2);
                geometry.translate(0, y, 0);
                geometries.push(geometry);
            }
            if (!geometries.length)
                return null;
            const merged = mergeGeometriesSafe(geometries);
            if (!merged)
                return "function" == typeof fallback ? fallback.call(context, waterData, material, chunk) : null;
            const waterMaterial = createEnhancedWaterMaterial(material);
            const waterMesh = new THREE.Mesh(merged, waterMaterial);
            waterMesh.__tmEnhancedWater = !0;
            const bankMesh = new THREE.Mesh(new THREE.BufferGeometry, waterMaterial);
            bankMesh.__tmEnhancedWaterBank = !0;
            return [waterMesh, bankMesh];
        }

        function enhanceTerrainMesh(chunk) {
            if (!featureState.enhancedTerrain || !chunk || !chunk.group)
                return;
            if (chunk.__tmTerrainEnhanceComplete)
                return;
            let foundTerrain = !1;
            chunk.group.traverse((node => {
                if (!node || !node.isMesh || !node.__tmTerrainMesh)
                    return;
                if (node.__tmTerrainTextureEnhanced)
                    return;
                const material = node.material;
                if (!material)
                    return;
                foundTerrain = !0;
                material.map && setTextureQuality(material.map);
                material.needsUpdate = !0;
                node.__tmTerrainTextureEnhanced = !0;
            }
            ));
            foundTerrain && (chunk.__tmTerrainEnhanceComplete = !0);
        }

        function createRoadMaterial(baseMaterial) {
            if (!globalState.THREE)
                return baseMaterial;
            if (baseMaterial && runtimeState.roadMaterialCache instanceof WeakMap) {
                const cached = runtimeState.roadMaterialCache.get(baseMaterial);
                if (cached)
                    return cached;
            }
            const material = baseMaterial && baseMaterial.clone ? baseMaterial.clone() : baseMaterial;
            if (material) {
                material.side = globalState.THREE.DoubleSide;
                material.map && setTextureQuality(material.map);
                material.userData = Object.assign({}, material.userData, {
                    tmOriginalWebsiteRoad: !0,
                    tmEnhancedRoad: !0
                });
                material.needsUpdate = !0;
            }
            baseMaterial && runtimeState.roadMaterialCache instanceof WeakMap && runtimeState.roadMaterialCache.set(baseMaterial, material || baseMaterial);
            return material || baseMaterial;
        }

        function createFallbackRoadMaterial(baseMaterial) {
            if (!globalState.THREE)
                return baseMaterial;
            const material = new globalState.THREE.MeshLambertMaterial({
                color: VISUAL_CONFIG.roadColor,
                side: globalState.THREE.DoubleSide
            });
            material.userData = Object.assign({}, baseMaterial && baseMaterial.userData, {
                tmEnhancedRoad: !0
            });
            return material;
        }

        function enhanceRoadMeshes(chunk) {
            if (!featureState.enhancedRoads || !chunk || !chunk.roadMeshes || !globalState.THREE)
                return;
            for (const mesh of chunk.roadMeshes) {
                if (!mesh || !mesh.isMesh || mesh.__tmEnhancedRoad)
                    continue;
                mesh.material = createRoadMaterial(mesh.material);
                mesh.__tmEnhancedRoad = !0;
            }
        }

        function queueChunkVisualRefresh(chunk, reason) {
            if (!chunk)
                return;
            const previousTimer = runtimeState.visualRefreshTimers.get(chunk);
            previousTimer && clearTimeout(previousTimer);
            const timer = setTimeout((() => {
                runtimeState.visualRefreshTimers.delete(chunk);
                try {
                    invalidateWorldCollisionCacheForChunk(chunk);
                    enhanceTerrainMesh(chunk);
                    enhanceRoadMeshes(chunk);
                    rebuildTunnelBridgeOverlay(chunk);
                    isAny3dBuildingFeatureEnabled() ? rebuildCustomBuildingsForChunk(chunk, reason) : cleanupChunkCustomVisuals(chunk);
                } catch (visualError) {
                    error(`Fehler beim Visual-Refresh fuer Chunk ${chunk.cx}/${chunk.cz}:`, visualError);
                }
            }
            ), 30);
            runtimeState.visualRefreshTimers.set(chunk, timer);
        }

        function mergeGeometriesSafe(geometries) {
            let usable;
            if (isDeveloperToggleEnabled("perfGeometryMergeFilter")) {
                usable = [];
                for (const geometry of toSafeArray(geometries))
                    geometry && usable.push(geometry);
            } else
                usable = geometries.filter(Boolean);
            if (!usable.length)
                return null;
            const merger = runtimeState.bufferGeometryUtils && (runtimeState.bufferGeometryUtils.mergeBufferGeometries || runtimeState.bufferGeometryUtils.mergeGeometries);
            if (1 === usable.length || "function" != typeof merger)
                return usable[0];
            try {
                return merger(usable, !1) || usable[0];
            } catch (mergeError) {
                warn("Geometrie-Merge fehlgeschlagen:", mergeError);
                return usable[0];
            }
        }

        function getGeometryMerger() {
            return runtimeState.bufferGeometryUtils && (runtimeState.bufferGeometryUtils.mergeBufferGeometries || runtimeState.bufferGeometryUtils.mergeGeometries) || null;
        }

        function normalizeGeometryForBatch(geometry, material) {
            if (!geometry || !geometry.attributes || !geometry.attributes.position)
                return null;
            let normalized = geometry;
            if (normalized.index && "function" == typeof normalized.toNonIndexed) {
                const nonIndexed = normalized.toNonIndexed();
                normalized.dispose && normalized.dispose();
                normalized = nonIndexed;
            }
            let attributeNames = null;
            if (!(material && material.map) && normalized.attributes.normal && !normalized.index) {
                if (isDeveloperToggleEnabled("perfNormalizeGeometryAttributes")) {
                    let simpleAttributes = !0;
                    for (const name in normalized.attributes)
                        if (Object.prototype.hasOwnProperty.call(normalized.attributes, name) && "position" !== name && "normal" !== name) {
                            simpleAttributes = !1;
                            break;
                        }
                    if (simpleAttributes)
                        return normalized;
                } else {
                    attributeNames = Object.keys(normalized.attributes);
                    if (attributeNames.every(name => "position" === name || "normal" === name))
                        return normalized;
                }
            }
            if (material && material.map) {
                if (!normalized.attributes.uv)
                    normalized.setAttribute("uv", new globalState.THREE.Float32BufferAttribute(new Float32Array(2 * normalized.attributes.position.count),2));
            } else {
                attributeNames || (attributeNames = Object.keys(normalized.attributes));
                for (const attributeName of attributeNames)
                    if ("position" !== attributeName && "normal" !== attributeName)
                        normalized.deleteAttribute(attributeName);
            }
            normalized.attributes.normal || normalized.computeVertexNormals();
            return normalized;
        }

        function getMaterialBatchKey(material) {
            if (!material)
                return "default";
            const color = material.color && "function" == typeof material.color.getHexString ? material.color.getHexString() : "none";
            const map = material.map ? material.map.uuid || material.map.id || "map" : "none";
            const opacity = null != material.opacity ? Math.round(1e3 * material.opacity) / 1e3 : 1;
            const signature = isDeveloperToggleEnabled("perfBatchMaterialKey") ? `${material.type || "Material"}|${color}|${map}|${material.transparent || opacity < 1 ? 1 : 0}|${opacity}|${null != material.side ? material.side : "side"}|${material.depthWrite === !1 ? 0 : 1}|${material.vertexColors ? 1 : 0}` : [
                material.type || "Material",
                color,
                map,
                material.transparent || opacity < 1 ? 1 : 0,
                opacity,
                null != material.side ? material.side : "side",
                material.depthWrite === !1 ? 0 : 1,
                material.vertexColors ? 1 : 0
            ].join("|");
            material.userData || (material.userData = {});
            if (material.userData.tmBatchSignature === signature && material.userData.tmBatchKey)
                return material.userData.tmBatchKey;
            material.userData.tmBatchSignature = signature;
            material.userData.tmBatchKey = signature;
            return signature;
        }

        function cloneMaterialForBatch(material) {
            const THREE = globalState.THREE;
            const clone = material && "function" == typeof material.clone ? material.clone() : new THREE.MeshLambertMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide
            });
            if (clone.userData && clone.userData.tmSharedResource) {
                clone.userData = Object.assign({}, clone.userData);
                delete clone.userData.tmSharedResource;
            }
            if (clone.transparent || Number(clone.opacity) < 1) {
                clone.transparent = !0;
                clone.depthWrite = !1;
            }
            clone.needsUpdate = !0;
            return clone;
        }

        function getLocalMatrixToAncestor(object, ancestor) {
            const THREE = globalState.THREE;
            const stack = [];
            for (let node = object; node && node !== ancestor; node = node.parent)
                stack.push(node);
            const matrix = new THREE.Matrix4;
            for (let index = stack.length - 1; index >= 0; index--) {
                stack[index].updateMatrix();
                matrix.multiply(stack[index].matrix);
            }
            return matrix;
        }

        function disposeMeshOnly(mesh) {
            if (!mesh || !mesh.isMesh)
                return;
            mesh.geometry && !isSharedResource(mesh.geometry) && "function" == typeof mesh.geometry.dispose && mesh.geometry.dispose();
            if (Array.isArray(mesh.material))
                for (const material of mesh.material)
                    material && !isSharedResource(material) && "function" == typeof material.dispose && material.dispose();
            else
                mesh.material && !isSharedResource(mesh.material) && "function" == typeof mesh.material.dispose && mesh.material.dispose();
        }

        function pruneEmptyGroups(group, root) {
            if (!group || !group.children)
                return;
            for (let index = group.children.length - 1; index >= 0; index--) {
                const child = group.children[index];
                if (!child || child.isMesh)
                    continue;
                pruneEmptyGroups(child, root || group);
                child !== (root || group) && child.children && !child.children.length && group.remove(child);
            }
        }

        function clearCustomBuildingOverlayChildren(overlay) {
            if (!overlay)
                return;
            for (let index = overlay.children.length - 1; index >= 0; index--) {
                const child = overlay.children[index];
                overlay.remove(child);
                disposeObject3D(child);
            }
            overlay.userData && (overlay.userData.tmBatchableMeshCount = 0,
            overlay.userData.tmBatchableMeshCountValid = !1,
            overlay.userData.tmBatchableMeshCountLimit = 0);
        }

        function optimizeCustomBuildingOverlay(overlay) {
            if (!overlay || !globalState.THREE)
                return;
            const THREE = globalState.THREE;
            const batches = new Map;
            const staticMeshes = [];
            overlay.updateMatrixWorld && overlay.updateMatrixWorld(!0);
            overlay.traverse((node => {
                if (!node || !node.isMesh || node.userData && (node.userData.tmDynamicDoor || node.userData.tmNoBatch) || Array.isArray(node.material) || !node.geometry)
                    return;
                const sourceGeometry = node.geometry.clone();
                sourceGeometry.applyMatrix4(getLocalMatrixToAncestor(node, overlay));
                const geometry = normalizeGeometryForBatch(sourceGeometry, node.material);
                if (!geometry) {
                    sourceGeometry.dispose && sourceGeometry.dispose();
                    return;
                }
                const key = getMaterialBatchKey(node.material);
                let batch = batches.get(key);
                if (!batch) {
                    batch = {
                        material: cloneMaterialForBatch(node.material),
                        geometries: [],
                        transparent: !!(node.material && (node.material.transparent || Number(node.material.opacity) < 1))
                    };
                    batches.set(key, batch);
                }
                batch.geometries.push(geometry);
                staticMeshes.push(node);
            }
            ));
            if (!staticMeshes.length)
                return;
            for (const mesh of staticMeshes) {
                mesh.parent && mesh.parent.remove(mesh);
                disposeMeshOnly(mesh);
            }
            pruneEmptyGroups(overlay, overlay);
            const merger = getGeometryMerger();
            for (const batch of batches.values()) {
                const outputGeometries = [];
                if (batch.geometries.length > 1 && "function" == typeof merger) {
                    try {
                        const merged = merger(batch.geometries, !1);
                        if (merged) {
                            outputGeometries.push(merged);
                            for (const geometry of batch.geometries)
                                geometry !== merged && geometry.dispose && geometry.dispose();
                        }
                    } catch (batchMergeError) {
                        warn("Custom-Building-Batch konnte nicht gemerged werden:", batchMergeError);
                    }
                }
                outputGeometries.length || outputGeometries.push(...batch.geometries);
                const canCloneBatchMaterial = !!(batch.material && batch.material.clone);
                for (const geometry of outputGeometries) {
                    geometry.computeBoundingSphere && geometry.computeBoundingSphere();
                    geometry.computeBoundingBox && geometry.computeBoundingBox();
                    const material = 1 === outputGeometries.length || !canCloneBatchMaterial ? batch.material : batch.material.clone();
                    const mesh = new THREE.Mesh(geometry,material);
                    mesh.name = batch.transparent ? "__tmCustomBuildingGlassBatch" : "__tmCustomBuildingStaticBatch";
                    mesh.userData.tmNoBatch = !0;
                    if (batch.transparent) {
                        mesh.renderOrder = 20;
                        mesh.material.transparent = !0;
                        mesh.material.depthWrite = !1;
                    }
                    overlay.add(mesh);
                }
                outputGeometries.length > 1 && canCloneBatchMaterial && batch.material && "function" == typeof batch.material.dispose && batch.material.dispose();
            }
            overlay.userData && (overlay.userData.tmBatchableMeshCount = 0,
            overlay.userData.tmBatchableMeshCountValid = !0,
            overlay.userData.tmBatchableMeshCountLimit = 1 / 0);
        }

        function transformGeometry(geometry, options) {
            if (!geometry)
                return null;
            const scaleX = options && null != options.scaleX ? options.scaleX : 1;
            const scaleY = options && null != options.scaleY ? options.scaleY : 1;
            const scaleZ = options && null != options.scaleZ ? options.scaleZ : 1;
            const rotateY = options && Number(options.rotateY) || 0;
            const translateX = options && Number(options.x) || 0;
            const translateY = options && Number(options.y) || 0;
            const translateZ = options && Number(options.z) || 0;
            geometry.scale(scaleX, scaleY, scaleZ);
            rotateY && geometry.rotateY(rotateY);
            geometry.translate(translateX, translateY, translateZ);
            return geometry;
        }

        function applyGradientVertexColors(geometry, baseValue, seed, mode) {
            if (!globalState.THREE || !geometry || !geometry.attributes || !geometry.attributes.position)
                return geometry;
            const position = geometry.attributes.position;
            const colors = new Float32Array(3 * position.count);
            const base = toThreeColor(baseValue, "trunk" === mode ? 5263684 : 6781251);
            let minY = 1 / 0;
            let maxY = -1 / 0;
            for (let index = 0; index < position.count; index++) {
                const y = position.getY(index);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
            const range = Math.max(1e-3, maxY - minY);
            for (let index = 0; index < position.count; index++) {
                const x = position.getX(index);
                const y = position.getY(index);
                const z = position.getZ(index);
                const heightFactor = (y - minY) / range;
                const noise = seededUnit(seed + 11 * x + 7 * z, index + y);
                const color = base.clone();
                if ("trunk" === mode)
                    color.offsetHSL(0, -.05, -VISUAL_CONFIG.treeTrunkDarken + .08 * heightFactor + .05 * (noise - .5));
                else
                    color.offsetHSL(.01 * (noise - .5), VISUAL_CONFIG.treeLeafSaturationBoost * (noise - .5), VISUAL_CONFIG.treeLeafLightnessBottom + (VISUAL_CONFIG.treeLeafLightnessTop - VISUAL_CONFIG.treeLeafLightnessBottom) * heightFactor + .05 * (noise - .5));
                colors[3 * index] = color.r;
                colors[3 * index + 1] = color.g;
                colors[3 * index + 2] = color.b;
            }
            geometry.setAttribute("color", new globalState.THREE.Float32BufferAttribute(colors,3));
            return geometry;
        }

        function createEnhancedTreeGeometries(x, y, z, seed, type) {
            if (!globalState.THREE)
                return [null, null];
            const THREE = globalState.THREE;
            const randomA = seededUnit(seed, 1);
            const randomB = seededUnit(seed, 2);
            const randomC = seededUnit(seed, 3);
            const variant = Math.floor(seededUnit(seed, 21) * 3);
            const leafGeometries = [];
            const trunkGeometries = [];
            const createSphere = (radius, centerX, centerY, centerZ, scaleY=1, scaleX=1.05, scaleZ=1.05) => transformGeometry(new THREE.SphereGeometry(radius, 9, 7), {
                scaleX,
                scaleY,
                scaleZ,
                x: centerX,
                y: centerY,
                z: centerZ
            });
            const createCone = (radiusTop, radiusBottom, height, centerX, centerY, centerZ, segments=8) => transformGeometry(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1), {
                x: centerX,
                y: centerY,
                z: centerZ
            });
            if (type === runtimeState.treeModule.TREE_BUSH) {
                const bushRadius = 1.65 + .5 * randomA;
                leafGeometries.push(createSphere(bushRadius, x - .7, y + 1.15, z, .92));
                leafGeometries.push(createSphere(.95 * bushRadius, x + .65, y + 1.05, z + .35, .9));
                leafGeometries.push(createSphere(.82 * bushRadius, x + .1, y + 1.6, z - .55, .8));
                return [mergeGeometriesSafe(leafGeometries), null];
            }
            const baseHeight = type === runtimeState.treeModule.TREE_CITY ? 7.5 + 2.2 * randomA : type === runtimeState.treeModule.TREE_FRUIT ? 6.2 + 1.2 * randomA : type === runtimeState.treeModule.TREE_CONIFER ? 16 + 7 * randomA : type === runtimeState.treeModule.TREE_ALEPPO_PINE ? 13.5 + 5.5 * randomA : type === runtimeState.treeModule.TREE_HOLLY_OAK ? 13 + 4 * randomA : 13 + 6 * randomA;
            const trunkHeight = type === runtimeState.treeModule.TREE_CONIFER ? .18 * baseHeight : type === runtimeState.treeModule.TREE_ALEPPO_PINE ? .54 * baseHeight : type === runtimeState.treeModule.TREE_HOLLY_OAK ? .34 * baseHeight : type === runtimeState.treeModule.TREE_CITY ? .48 * baseHeight : type === runtimeState.treeModule.TREE_FRUIT ? .42 * baseHeight : .38 * baseHeight;
            const trunkRadius = type === runtimeState.treeModule.TREE_CITY ? .22 : type === runtimeState.treeModule.TREE_FRUIT ? .18 : type === runtimeState.treeModule.TREE_HOLLY_OAK ? .34 : type === runtimeState.treeModule.TREE_ALEPPO_PINE ? .28 : type === runtimeState.treeModule.TREE_CONIFER ? .24 : .3;
            trunkGeometries.push(createCone(.68 * trunkRadius, trunkRadius, trunkHeight + .8, x, y + trunkHeight / 2 + .4, z, 7));
            if (type === runtimeState.treeModule.TREE_CONIFER || type === runtimeState.treeModule.TREE_ALEPPO_PINE) {
                const levels = type === runtimeState.treeModule.TREE_ALEPPO_PINE ? 3 : 4;
                for (let index = 0; index < levels; index++) {
                    const levelProgress = index / Math.max(1, levels - 1);
                    const coneHeight = (baseHeight - trunkHeight) * (.55 - .08 * levelProgress);
                    const baseRadius = (type === runtimeState.treeModule.TREE_ALEPPO_PINE ? 3.9 : 3.1) * (1 - .16 * index) + .6 * randomB;
                    const canopyY = y + trunkHeight + coneHeight / 2 + (baseHeight - trunkHeight) * (.15 * index);
                    leafGeometries.push(createCone(.12 * baseRadius, baseRadius, coneHeight, x, canopyY, z, 8));
                }
                if (type === runtimeState.treeModule.TREE_ALEPPO_PINE && variant > 0)
                    leafGeometries.push(createSphere(2.4 + .6 * randomC, x, y + baseHeight - 1.7, z, .55, 1.35, 1.35));
            } else if (type === runtimeState.treeModule.TREE_CITY) {
                leafGeometries.push(createSphere(2.1 + .3 * randomA, x, y + trunkHeight + 1.6, z, .7, 1.35, 1.35));
                leafGeometries.push(createSphere(1.65 + .18 * randomB, x - .65, y + trunkHeight + 1.35, z + .45, .82));
                leafGeometries.push(createSphere(1.55 + .18 * randomC, x + .8, y + trunkHeight + 1.2, z - .4, .78));
            } else if (type === runtimeState.treeModule.TREE_FRUIT) {
                leafGeometries.push(createSphere(2.55, x, y + trunkHeight + 1.85, z, .95));
                leafGeometries.push(createSphere(1.8, x - .75, y + trunkHeight + 1.45, z + .35, .88));
                leafGeometries.push(createSphere(1.5, x + .8, y + trunkHeight + 1.55, z - .25, .84));
            } else if (type === runtimeState.treeModule.TREE_HOLLY_OAK) {
                leafGeometries.push(createSphere(4.6 + .4 * randomA, x, y + trunkHeight + 2.9, z, .62, 1.3, 1.3));
                leafGeometries.push(createSphere(3.2 + .25 * randomB, x - 1.6, y + trunkHeight + 2.35, z + .7, .7));
                leafGeometries.push(createSphere(3.1 + .25 * randomC, x + 1.45, y + trunkHeight + 2.15, z - .55, .68));
            } else {
                leafGeometries.push(createSphere(3.6 + .6 * randomA, x, y + trunkHeight + 3.1, z, .92 + .12 * randomB, 1.08, 1.08));
                leafGeometries.push(createSphere(2.5 + .3 * randomB, x - 1.7, y + trunkHeight + 2.25, z + .65, .86));
                leafGeometries.push(createSphere(2.35 + .3 * randomC, x + 1.45, y + trunkHeight + 2.1, z - .7, .82));
                if (variant > 0)
                    leafGeometries.push(createSphere(1.9 + .2 * randomA, x + .2, y + trunkHeight + 4.7, z + .15, .76));
            }
            return [mergeGeometriesSafe(leafGeometries), mergeGeometriesSafe(trunkGeometries)];
        }

        function deepMergeConfig(base, extra) {
            if (Array.isArray(base) || Array.isArray(extra))
                return Array.isArray(extra) ? extra.slice() : Array.isArray(base) ? base.slice() : extra;
            const output = Object.assign({}, base || {});
            if (!extra || "object" != typeof extra)
                return output;
            if (isDeveloperToggleEnabled("perfDeepMergeLoop")) {
                for (const key in extra) {
                    if (!Object.prototype.hasOwnProperty.call(extra, key))
                        continue;
                    const value = extra[key];
                    output[key] = value && "object" == typeof value && !Array.isArray(value) ? deepMergeConfig(output[key], value) : Array.isArray(value) ? value.slice() : value;
                }
                return output;
            }
            for (const [key, value] of Object.entries(extra))
                output[key] = value && "object" == typeof value && !Array.isArray(value) ? deepMergeConfig(output[key], value) : Array.isArray(value) ? value.slice() : value;
            return output;
        }

        function cloneJson(value, fallback) {
            try {
                return JSON.parse(JSON.stringify(value));
            } catch (cloneError) {
                return null != fallback ? fallback : value;
            }
        }

        function rememberLimitedCache(cache, key, value, maxSize) {
            if (!cache || !key)
                return value;
            cache.set(key, value);
            const limit = Math.max(20, Number(maxSize) || 200);
            if (isDeveloperToggleEnabled("perfCacheEvictionFastPath") && cache.size <= limit)
                return value;
            while (cache.size > limit) {
                const oldest = cache.keys().next().value;
                if (void 0 === oldest)
                    break;
                const oldValue = cache.get(oldest);
                if (oldValue && oldValue.userData && oldValue.userData.tmSharedResource)
                    oldValue.userData.tmEvictedFromCache = !0;
                cache.delete(oldest);
            }
            return value;
        }

        function markSharedResource(resource, kind) {
            if (resource) {
                resource.userData || (resource.userData = {});
                resource.userData.tmSharedResource = kind || !0;
            }
            return resource;
        }

        function isSharedResource(resource) {
            return !!(resource && resource.userData && resource.userData.tmSharedResource);
        }

        function getBuildingDebugId(chunk, building) {
            return `${Math.round(Number(chunk && chunk.cx) || 0)}:${Math.round(Number(chunk && chunk.cz) || 0)}/${Number(building && building.index) || 0}`;
        }

        function refreshCustomBuildingDebug(force=!1) {
            const now = performance.now();
            const last = Number(runtimeState.customBuildingDebugAt) || 0;
            if (!force && last && now - last < CUSTOM_BUILDING_PERF.debugRefreshMs) {
                if (!runtimeState.customBuildingDebugTimer)
                    runtimeState.customBuildingDebugTimer = setTimeout((() => {
                        runtimeState.customBuildingDebugTimer = null;
                        refreshCustomBuildingDebug(!0);
                    }
                    ), CUSTOM_BUILDING_PERF.debugRefreshMs);
                return;
            }
            runtimeState.customBuildingDebugAt = now;
            const entries = [];
            for (const chunk of getLoadedChunks())
                for (const building of toSafeArray(chunk.buildings))
                    if (building && building.houseCenter)
                        entries.push({
                            id: getBuildingDebugId(chunk, building),
                            match: {
                                chunk: [Math.round(Number(chunk.cx) || 0), Math.round(Number(chunk.cz) || 0)],
                                index: Number(building.index) || 0
                            },
                            center: {
                                x: Number(building.houseCenter.x.toFixed(2)),
                                y: Number(building.houseCenter.y.toFixed(2)),
                                z: Number(building.houseCenter.z.toFixed(2))
                            },
                            level: Number(building.level) || 0,
                            type: Number(building.type) || 0
                        });
            runtimeState.buildingDebugEntries = entries;
            globalThis.__tmCustomBuildingsDebug = {
                url: BUILDING_CONFIG_URL,
                candidates: entries,
                catalog: runtimeState.buildingConfig,
                reload: reloadCustomBuildingCatalog
            };
            globalThis.__tmCollisionHookDebug && (globalThis.__tmCollisionHookDebug.customBuildings = globalThis.__tmCustomBuildingsDebug);
        }

        function findJavascriptExpressionEnd(source, startIndex) {
            let depth = 0;
            let quote = "";
            let escaped = !1;
            for (let index = startIndex; index < source.length; index++) {
                const char = source[index];
                if (quote) {
                    if (escaped) {
                        escaped = !1;
                        continue;
                    }
                    if ("\\" === char) {
                        escaped = !0;
                        continue;
                    }
                    if (char === quote)
                        quote = "";
                    continue;
                }
                if ('"' === char || "'" === char || "`" === char) {
                    quote = char;
                    continue;
                }
                if ("{" === char || "[" === char || "(" === char) {
                    depth++;
                    continue;
                }
                if ("}" === char || "]" === char || ")" === char) {
                    depth = Math.max(0, depth - 1);
                    continue;
                }
                if (";" === char && depth <= 0)
                    return index;
            }
            return source.length;
        }

        function evaluateBuildingConfigExpression(expression) {
            return (new Function(`"use strict";return (${expression});`))();
        }

        function extractAssignedBuildingConfigs(source, globalKeys) {
            const keyPattern = globalKeys.join("|");
            const assignmentRe = new RegExp(`(?:^|[;\\n])\\s*(?:(?:const|let|var)\\s+)?(?:globalThis\\.|window\\.)?(${keyPattern})\\s*=`, "g");
            const configs = [];
            let match;
            while ((match = assignmentRe.exec(source))) {
                const expressionStart = assignmentRe.lastIndex;
                const expressionEnd = findJavascriptExpressionEnd(source, expressionStart);
                const expression = source.slice(expressionStart, expressionEnd).trim();
                assignmentRe.lastIndex = Math.max(expressionEnd, expressionStart + 1);
                if (!expression)
                    continue;
                configs.push(evaluateBuildingConfigExpression(expression));
            }
            return configs;
        }

        function mergeBuildingConfigCatalogs(configs) {
            if (1 === configs.length)
                return configs[0];
            const merged = {
                templates: {},
                buildings: []
            };
            for (const config of configs) {
                const catalog = normalizeBuildingCatalog(config);
                merged.templates = deepMergeConfig(merged.templates, catalog.templates);
                merged.buildings.push(...toSafeArray(catalog.buildings));
            }
            return merged;
        }

        function parseBuildingConfigText(text) {
            const source = String(text || "").trim();
            if (!source)
                return {
                    templates: {},
                    buildings: []
                };
            try {
                return JSON.parse(source);
            } catch (jsonError) {}
            const globalKeys = ["__tmBuildingsConfig", "tmBuildingsConfig", "BUILDINGS", "buildingsConfig", "TM_BUILDINGS"];
            const assignedConfigs = extractAssignedBuildingConfigs(source, globalKeys);
            if (assignedConfigs.length)
                return mergeBuildingConfigCatalogs(assignedConfigs);
            try {
                const getter = new Function(`${source}\n;return ${globalKeys.map((key => `typeof ${key} !== "undefined" ? ${key} : void 0`)).join(" || ")};`);
                return getter();
            } catch (scriptError) {}
            return (new Function(`return (${source});`))();
        }

        function normalizeBuildingCatalogId(value, index) {
            const text = String(null == value ? "" : value).trim();
            return text || `entry_${index}`;
        }

        function assignUniqueBuildingCatalogIds(buildings) {
            const seen = new Map;
            const source = toSafeArray(buildings);
            const result = [];
            for (let index = 0; index < source.length; index++) {
                const entry = source[index];
                const baseId = normalizeBuildingCatalogId(entry && entry.id, index);
                const count = Number(seen.get(baseId)) || 0;
                seen.set(baseId, count + 1);
                const id = count ? `${baseId}_${count + 1}` : baseId;
                result.push(entry && entry.id === id ? entry : Object.assign({}, entry || {}, {
                    id
                }));
            }
            return result;
        }

        function normalizeBuildingCatalog(rawCatalog) {
            if (!rawCatalog || "object" != typeof rawCatalog)
                return {
                    templates: {},
                    buildings: []
            };
            const templates = rawCatalog.templates && "object" == typeof rawCatalog.templates ? cloneJson(rawCatalog.templates, {}) : {};
            const rawBuildings = rawCatalog.buildings && "object" == typeof rawCatalog.buildings ? rawCatalog.buildings : rawCatalog;
            const buildings = [];
            if (Array.isArray(rawBuildings)) {
                for (let index = 0; index < rawBuildings.length; index++)
                    buildings.push(Object.assign({
                        id: `entry_${index}`
                    }, rawBuildings[index]));
            } else {
                for (const key of Object.keys(rawBuildings || {})) {
                    if ("templates" === key)
                        continue;
                    buildings.push(Object.assign({
                        id: key
                    }, rawBuildings[key]));
                }
            }
            return {
                templates,
                buildings: assignUniqueBuildingCatalogIds(buildings)
            };
        }

        function ensureCustomBuildingProgressPanel() {
            if (runtimeState.customBuildingProgress && runtimeState.customBuildingProgress.panel && runtimeState.customBuildingProgress.panel.isConnected)
                return runtimeState.customBuildingProgress.panel;
            if (!document.body)
                return null;
            const panel = document.createElement("div");
            panel.id = "__tmCustomBuildingProgress";
            panel.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:999999;min-width:280px;max-width:min(420px,calc(100vw - 28px));box-sizing:border-box;background:rgba(18,22,27,.92);color:#fff7e8;border:1px solid rgba(255,255,255,.18);border-radius:10px;box-shadow:0 14px 36px rgba(0,0,0,.3);padding:10px 12px;font:700 12px/1.35 Arial,Helvetica,sans-serif;display:none;backdrop-filter:blur(10px);";
            panel.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:8px;">
                    <span data-role="label">Haeuser optimieren</span>
                    <span data-role="value">0%</span>
                </div>
                <div style="height:7px;background:rgba(255,255,255,.15);border-radius:999px;overflow:hidden;">
                    <div data-role="bar" style="height:100%;width:0%;background:#7dd3fc;border-radius:999px;"></div>
                </div>
            `;
            document.body.appendChild(panel);
            panel.__tmProgressNodes = {
                label: panel.querySelector('[data-role="label"]'),
                value: panel.querySelector('[data-role="value"]'),
                bar: panel.querySelector('[data-role="bar"]')
            };
            runtimeState.customBuildingProgress = {
                panel,
                hideTimer: 0
            };
            return panel;
        }

        function setCustomBuildingProgress(done, total, label) {
            runInternalModule("customBuildingProgress", (() => {
                const panel = ensureCustomBuildingProgressPanel();
                if (!panel)
                    return;
                const state = runtimeState.customBuildingProgress || (runtimeState.customBuildingProgress = {
                    panel
                });
                state.hideTimer && clearTimeout(state.hideTimer);
                const percent = total > 0 ? clamp(Math.round(done / total * 100), 0, 100) : 0;
                const nodes = panel.__tmProgressNodes || (panel.__tmProgressNodes = {
                    label: panel.querySelector('[data-role="label"]'),
                    value: panel.querySelector('[data-role="value"]'),
                    bar: panel.querySelector('[data-role="bar"]')
                });
                const safeLabel = label || "Haeuser optimieren";
                const percentText = `${percent}%`;
                nodes.label && state.lastLabel !== safeLabel && (nodes.label.textContent = safeLabel);
                nodes.value && state.lastPercentText !== percentText && (nodes.value.textContent = percentText);
                nodes.bar && state.lastPercentText !== percentText && (nodes.bar.style.width = percentText);
                state.lastLabel = safeLabel;
                state.lastPercentText = percentText;
                panel.style.display !== "block" && (panel.style.display = "block");
                percent >= 100 && finishCustomBuildingProgress();
            }
            ), null, "Fortschrittspanel");
        }

        function finishCustomBuildingProgress() {
            runInternalModule("customBuildingProgress", (() => {
                const panel = runtimeState.customBuildingProgress && runtimeState.customBuildingProgress.panel;
                if (!panel)
                    return;
                runtimeState.customBuildingProgress.hideTimer && clearTimeout(runtimeState.customBuildingProgress.hideTimer);
                runtimeState.customBuildingProgress.hideTimer = setTimeout((() => {
                    panel.style.display = "none";
                    const nodes = panel.__tmProgressNodes || (panel.__tmProgressNodes = {
                        value: panel.querySelector('[data-role="value"]'),
                        bar: panel.querySelector('[data-role="bar"]')
                    });
                    nodes.value && (nodes.value.textContent = "0%");
                    nodes.bar && (nodes.bar.style.width = "0%");
                    runtimeState.customBuildingProgress.lastPercentText = "0%";
                }
                ), 900);
            }
            ), null, "Fortschrittspanel ausblenden");
        }

        function getCustomBuildingAddressText(match) {
            const raw = match && (match.address || match.adresse || match.query || match.addressQuery);
            if (!raw)
                return "";
            return "object" == typeof raw ? raw.text || raw.label || raw.q || raw.query || "" : String(raw);
        }

        async function fetchCustomBuildingAddressPosition(address) {
            const text = normalizeTownLabel(address);
            if (!text || !runtimeState.geoModule || "function" != typeof runtimeState.geoModule.convertProjLocalCoords)
                return null;
            return resolveAddressToWorldPosition(text);
        }

        async function hydrateCustomBuildingAddressMatches(catalog) {
            if (!catalog || !runtimeState.geoModule)
                return catalog;
            for (const rawEntry of toSafeArray(catalog.buildings)) {
                const resolved = resolveBuildingTemplate(rawEntry, catalog.templates);
                const match = resolved && resolved.match;
                if (!match || Array.isArray(match.near))
                    continue;
                const addressText = getCustomBuildingAddressText(match);
                if (!addressText)
                    continue;
                const position = await fetchCustomBuildingAddressPosition(addressText);
                if (!position) {
                    featureState.customBuildings && markFeatureFault("customBuildings", new Error(`Adresse nicht gefunden: ${addressText}`), "Adress-Haus");
                    continue;
                }
                rawEntry.match = deepMergeConfig(match, {
                    near: [position.x, position.z],
                    radius: Math.max(12, Number(match.radius || match.addressRadius) || 45),
                    __addressResolved: position.label || addressText
                });
                addCustomBuildingPriorityTarget(position, position.label || addressText);
            }
            return catalog;
        }

        function ensureBuildingCatalogLoaded() {
            if (runtimeState.buildingConfigPromise)
                return runtimeState.buildingConfigPromise;
            runtimeState.buildingConfigPromise = fetch(BUILDING_CONFIG_URL, {
                cache: "no-store"
            }).then((response => response.text())).then((text => normalizeBuildingCatalog(parseBuildingConfigText(text)))).then((catalog => hydrateCustomBuildingAddressMatches(catalog))).catch((catalogError => {
                warn("Externe buildings.js konnte nicht geladen werden:", catalogError);
                featureState.customBuildings && markFeatureFault("customBuildings", catalogError, "buildings.js laden");
                return {
                    templates: {},
                    buildings: []
                };
            })).then((catalog => {
                runtimeState.buildingConfig = catalog;
                refreshCustomBuildingDebug();
                return catalog;
            }));
            return runtimeState.buildingConfigPromise;
        }

        function reloadCustomBuildingCatalog() {
            runtimeState.buildingConfigPromise = null;
            runtimeState.buildingConfig = null;
            clearCustomBuildingTransientPerfCaches(!0);
            invalidateWorldCollisionCache();
            for (const chunk of getLoadedChunks()) {
                resetCustomBuildingPreparationForChunk(chunk);
                queueChunkVisualRefresh(chunk, "custom_building_reload");
            }
            return ensureBuildingCatalogLoaded();
        }

        function isAny3dBuildingFeatureEnabled() {
            return !!(featureState.auto3dBuildings || featureState.customBuildings);
        }

        function getOriginalBuildingMeshesForChunk(chunk) {
            const factory = chunk && chunk.buildingFactory;
            return Array.isArray(factory && factory.__tmOriginalBuildingMeshes) ? factory.__tmOriginalBuildingMeshes : [];
        }

        function shouldHideOriginalBuildingMeshesForChunk(chunk) {
            return !!(isAny3dBuildingFeatureEnabled() && chunk && chunk.__tmCustomBuildingOverlayReady);
        }

        function applyOriginalBuildingMeshVisibilityForChunk(chunk) {
            const visible = !shouldHideOriginalBuildingMeshesForChunk(chunk);
            if (chunk && chunk.__tmOriginalBuildingMeshesVisible === visible)
                return;
            for (const mesh of getOriginalBuildingMeshesForChunk(chunk)) {
                if (!mesh)
                    continue;
                mesh.visible = visible;
                mesh.traverse && mesh.traverse((child => {
                    child.visible = visible;
                }));
            }
            chunk && (chunk.__tmOriginalBuildingMeshesVisible = visible);
        }

        function markOriginalBuildingMesh(factory, object) {
            if (!factory || !object)
                return;
            const list = Array.isArray(factory.__tmOriginalBuildingMeshes) ? factory.__tmOriginalBuildingMeshes : factory.__tmOriginalBuildingMeshes = [];
            object.userData || (object.userData = {});
            object.userData.tmOriginalBuildingMesh = !0;
            object.__tmOriginalBuildingMesh = !0;
            object.traverse && object.traverse((child => {
                child.userData || (child.userData = {});
                child.userData.tmOriginalBuildingMesh = !0;
                child.__tmOriginalBuildingMesh = !0;
            }));
            list.includes(object) || list.push(object);
        }

        function patchBuildingFactoryForChunk(chunk) {
            const factory = chunk && chunk.buildingFactory;
            const proto = factory && Object.getPrototypeOf(factory);
            factory && (factory.__tmOwnerChunk = chunk);
            if (!factory || !proto || proto.__tmOriginalBuildingMeshPatched)
                return;
            const originalCreateNormalBuilding = proto.createNormalBuilding;
            if ("function" != typeof originalCreateNormalBuilding)
                return;
            proto.createNormalBuilding = function(...args) {
                const group = this.group;
                const originalAdd = group && group.add;
                if (!group || "function" != typeof originalAdd)
                    return originalCreateNormalBuilding.apply(this, args);
                const captured = [];
                group.add = function(...objects) {
                    for (const object of objects)
                        object && captured.push(object);
                    return originalAdd.apply(this, objects);
                };
                try {
                    return originalCreateNormalBuilding.apply(this, args);
                } finally {
                    group.add = originalAdd;
                    for (const object of captured)
                        markOriginalBuildingMesh(this, object);
                    this.__tmOwnerChunk && (this.__tmOwnerChunk.__tmOriginalBuildingMeshesVisible = null);
                    this.__tmOwnerChunk && applyOriginalBuildingMeshVisibilityForChunk(this.__tmOwnerChunk);
                }
            };
            proto.__tmOriginalBuildingMeshPatched = !0;
        }

        function resetCustomBuildingPreparationForChunk(chunk) {
            if (!chunk)
                return;
            invalidateWorldCollisionCacheForChunk(chunk);
            if (chunk.__tmOriginalCustomBuildings)
                chunk.custome_buildings = cloneJson(chunk.__tmOriginalCustomBuildings, []);
            if (Array.isArray(chunk.__tmOriginalBuildings))
                chunk.buildings = chunk.__tmOriginalBuildings.slice();
            syncBuildingFactoryBuildingSources(chunk, !0);
            chunk.__tmCustomBuildingsPrepared = !1;
            chunk.__tmCustomBuildingsPreparePromise = null;
            chunk.__tmMatchedCustomBuildings = [];
            chunk.__tmCustomBuildingOverlayReady = !1;
            chunk.__tmCustomBuildingOverlayBounds = null;
            runtimeState.customBuildingPrepareSignatures.delete(chunk);
            runtimeState.customBuildingEntriesByChunk.delete(chunk);
            chunk.__tmOriginalBuildingMeshesVisible = null;
            applyOriginalBuildingMeshVisibilityForChunk(chunk);
        }

        function syncBuildingFactoryBuildingSources(chunk, resetPartialBuild) {
            const factory = chunk && chunk.buildingFactory;
            if (!factory || factory.loaded)
                return;
            patchBuildingFactoryForChunk(chunk);
            Array.isArray(chunk.buildings) && (factory.buildings = chunk.buildings);
            Array.isArray(chunk.custome_buildings) && (factory.custome_buildings = chunk.custome_buildings);
            if (!resetPartialBuild || !factory.loadedStarted)
                return;
            factory.lastIndex = 0;
            factory.loadedStarted = !1;
            if (Array.isArray(factory.allHouses))
                for (let index = 0; index < factory.allHouses.length; index++)
                    factory.allHouses[index] = [];
            Array.isArray(factory.allRoofs) && (factory.allRoofs = []);
            Array.isArray(factory.allBuildingWithouTex) && (factory.allBuildingWithouTex = []);
            Array.isArray(factory.allBasements) && (factory.allBasements = []);
            Array.isArray(factory.wallsLine) && (factory.wallsLine = []);
            Array.isArray(factory.custome_building_meshes) && (factory.custome_building_meshes = []);
        }

        function resolveBuildingTemplate(entry, templates, chain) {
            const seen = chain || new Set;
            const templateNames = Array.isArray(entry && entry.template) ? entry.template : entry && entry.template ? [entry.template] : [];
            let merged = {};
            for (const templateName of templateNames) {
                if (!templateName || seen.has(templateName) || !templates || !templates[templateName])
                    continue;
                seen.add(templateName);
                merged = deepMergeConfig(merged, resolveBuildingTemplate(templates[templateName], templates, seen));
            }
            return deepMergeConfig(merged, entry || {});
        }

        function matchBuildingEntry(entry, chunk, building) {
            if (!entry || !entry.match)
                return !1;
            const match = entry.match;
            if (getCustomBuildingAddressText(match) && !Array.isArray(match.near))
                return !1;
            if (match.id && match.id !== getBuildingDebugId(chunk, building))
                return !1;
            if (Array.isArray(match.chunk) && 2 === match.chunk.length)
                if (Math.round(Number(chunk.cx) || 0) !== Math.round(Number(match.chunk[0]) || 0) || Math.round(Number(chunk.cz) || 0) !== Math.round(Number(match.chunk[1]) || 0))
                    return !1;
            if (null != match.index && Number(building.index) !== Number(match.index))
                return !1;
            if (Array.isArray(match.near) && 2 <= match.near.length && building.houseCenter) {
                const distance = Math.hypot((Number(building.houseCenter.x) || 0) - (Number(match.near[0]) || 0), (Number(building.houseCenter.z) || 0) - (Number(match.near[1]) || 0));
                if (distance > Math.max(8, Number(match.radius) || 25))
                    return !1;
            }
            return !0;
        }

        function getAddressMatchPosition(entry) {
            const match = entry && entry.match;
            if (!match || !Array.isArray(match.near) || match.near.length < 2)
                return null;
            const x = Number(match.near[0]);
            const z = Number(match.near[1]);
            return Number.isFinite(x) && Number.isFinite(z) ? {
                x,
                z
            } : null;
        }

        function isWorldPositionInsideChunk(position, chunk, padding=0) {
            if (!position || !chunk)
                return !1;
            const cx = Number(chunk.cx) || 0;
            const cz = Number(chunk.cz) || 0;
            const halfWidth = (Number(chunk.width) || 512) / 2 + Math.max(0, Number(padding) || 0);
            const halfHeight = (Number(chunk.height) || 512) / 2 + Math.max(0, Number(padding) || 0);
            return Math.abs(position.x - cx) <= halfWidth && Math.abs(position.z - cz) <= halfHeight;
        }

        function getStandaloneBuildingHalfSize(entry) {
            let halfX = 4;
            let halfZ = 4;
            for (const part of toSafeArray(entry && entry.parts)) {
                const size = getDetailSize(part, [1, 1, 1]);
                const position = part && part.position || [0, 0, 0];
                halfX = Math.max(halfX, Math.abs(Number(position[0]) || 0) + size[0] / 2);
                halfZ = Math.max(halfZ, Math.abs(Number(position[2]) || 0) + size[2] / 2);
            }
            const match = entry && entry.match || {};
            return {
                x: Math.max(3, Number(match.width) / 2 || Number(entry && entry.width) / 2 || halfX + .5),
                z: Math.max(3, Number(match.depth) / 2 || Number(entry && entry.depth) / 2 || halfZ + .5)
            };
        }

        function getFootprintCenter(points) {
            if (!Array.isArray(points) || !points.length)
                return {
                    x: 0,
                    z: 0
                };
            const center = {
                x: 0,
                z: 0
            };
            for (const point of points) {
                center.x += Number(point.x) || 0;
                center.z += Number(point.z) || 0;
            }
            center.x /= points.length;
            center.z /= points.length;
            return center;
        }

        function moveFootprint(points, offsetX, offsetZ) {
            const source = toSafeArray(points);
            const result = [];
            const safeOffsetX = Number(offsetX) || 0;
            const safeOffsetZ = Number(offsetZ) || 0;
            for (const point of source)
                result.push({
                    x: (Number(point.x) || 0) + safeOffsetX,
                    z: (Number(point.z) || 0) + safeOffsetZ
                });
            return result;
        }

        function scaleFootprint(points, scale, centerPoint) {
            const center = centerPoint || getFootprintCenter(points);
            const factor = Math.max(.1, Number(scale) || 1);
            const source = toSafeArray(points);
            const result = [];
            for (const point of source)
                result.push({
                    x: center.x + ((Number(point.x) || 0) - center.x) * factor,
                    z: center.z + ((Number(point.z) || 0) - center.z) * factor
                });
            return result;
        }

        function getFootprintBounds(points) {
            const bounds = {
                minX: 1 / 0,
                maxX: -1 / 0,
                minZ: 1 / 0,
                maxZ: -1 / 0
            };
            for (const point of toSafeArray(points)) {
                const x = Number(point.x) || 0;
                const z = Number(point.z) || 0;
                bounds.minX = Math.min(bounds.minX, x);
                bounds.maxX = Math.max(bounds.maxX, x);
                bounds.minZ = Math.min(bounds.minZ, z);
                bounds.maxZ = Math.max(bounds.maxZ, z);
            }
            return Number.isFinite(bounds.minX) ? bounds : {
                minX: 0,
                maxX: 0,
                minZ: 0,
                maxZ: 0
            };
        }

        function boundsOverlap(a, b) {
            return !!a && !!b && a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
        }

        function isPointInsideFootprint(point, points) {
            if (!point || !Array.isArray(points) || points.length < 3)
                return !1;
            let inside = !1;
            for (let index = 0, prev = points.length - 1; index < points.length; prev = index++) {
                const xi = Number(points[index].x) || 0;
                const zi = Number(points[index].z) || 0;
                const xj = Number(points[prev].x) || 0;
                const zj = Number(points[prev].z) || 0;
                const intersects = zi > point.z != zj > point.z && point.x < (xj - xi) * (point.z - zi) / ((zj - zi) || 1e-6) + xi;
                intersects && (inside = !inside);
            }
            return inside;
        }

        function getFootprintSamplePoints(points) {
            const samples = [];
            const source = toSafeArray(points);
            const center = getFootprintCenter(source);
            for (const point of source)
                samples.push({
                    x: Number(point.x) || 0,
                    z: Number(point.z) || 0
                });
            for (let index = 0; index < source.length; index++) {
                const current = source[index];
                const next = source[(index + 1) % source.length];
                samples.push({
                    x: ((Number(current.x) || 0) + (Number(next.x) || 0)) / 2,
                    z: ((Number(current.z) || 0) + (Number(next.z) || 0)) / 2
                });
            }
            samples.push(center);
            const bounds = getFootprintBounds(source);
            const stepX = Math.max(.1, (bounds.maxX - bounds.minX) / 2);
            const stepZ = Math.max(.1, (bounds.maxZ - bounds.minZ) / 2);
            for (let gx = 0; gx < 3; gx++)
                for (let gz = 0; gz < 3; gz++) {
                    const probe = {
                        x: bounds.minX + stepX * gx,
                        z: bounds.minZ + stepZ * gz
                    };
                    isPointInsideFootprint(probe, source) && samples.push(probe);
                }
            return samples;
        }

        function closestPointOnSegment2D(point, a, b) {
            if (!point || !a || !b)
                return null;
            const dx = (Number(b.x) || 0) - (Number(a.x) || 0);
            const dz = (Number(b.z) || 0) - (Number(a.z) || 0);
            const lenSq = dx * dx + dz * dz;
            if (lenSq < 1e-6)
                return {
                    x: Number(a.x) || 0,
                    z: Number(a.z) || 0
                };
            const t = clamp((((Number(point.x) || 0) - (Number(a.x) || 0)) * dx + ((Number(point.z) || 0) - (Number(a.z) || 0)) * dz) / lenSq, 0, 1);
            return {
                x: (Number(a.x) || 0) + dx * t,
                z: (Number(a.z) || 0) + dz * t
            };
        }

        function iterateChunkRoadSegments(chunk, visitor) {
            if (!chunk || "function" != typeof visitor)
                return;
            for (const edge of toSafeArray(chunk.newRoadGraph && chunk.newRoadGraph.edges)) {
                const points = toSafeArray(edge && edge.points);
                for (let index = 0; index < points.length - 1; index++)
                    visitor(edge, points[index], points[index + 1]);
            }
        }

        function getNearestRoadConflict(points, chunk, extraClearance=0) {
            if (!chunk || !Array.isArray(points) || points.length < 3)
                return null;
            const samples = getFootprintSamplePoints(points);
            const center = getFootprintCenter(points);
            let best = null;
            iterateChunkRoadSegments(chunk, ((edge, start, end) => {
                const required = Math.max(3.2, Number(edge && edge.width) || 8) / 2 + Math.max(0, Number(extraClearance) || 0);
                for (const sample of samples) {
                    const closest = closestPointOnSegment2D(sample, start, end);
                    if (!closest)
                        continue;
                    const distance = Math.hypot(sample.x - closest.x, sample.z - closest.z);
                    if (best && distance >= best.distance)
                        continue;
                    let pushX = center.x - closest.x;
                    let pushZ = center.z - closest.z;
                    let pushLength = Math.hypot(pushX, pushZ);
                    if (pushLength < 1e-4) {
                        pushX = -((Number(end.z) || 0) - (Number(start.z) || 0));
                        pushZ = (Number(end.x) || 0) - (Number(start.x) || 0);
                        pushLength = Math.hypot(pushX, pushZ) || 1;
                    }
                    best = {
                        distance,
                        required,
                        penetration: required - distance,
                        pushX: pushX / pushLength,
                        pushZ: pushZ / pushLength
                    };
                }
            }
            ));
            return best;
        }

        function getFootprintOverlap(points, chunk, excludeBuilding, padding=0) {
            if (!chunk || !Array.isArray(points) || points.length < 3)
                return null;
            const center = getFootprintCenter(points);
            const bounds = getFootprintBounds(points);
            const expanded = {
                minX: bounds.minX - padding,
                maxX: bounds.maxX + padding,
                minZ: bounds.minZ - padding,
                maxZ: bounds.maxZ + padding
            };
            let count = 0;
            let pushX = 0;
            let pushZ = 0;
            for (const building of toSafeArray(chunk.__tmOriginalBuildings || chunk.buildings)) {
                if (!building || building === excludeBuilding || !Array.isArray(building.points) || building.points.length < 3)
                    continue;
                const otherBounds = {
                    minX: 1 / 0,
                    maxX: -1 / 0,
                    minZ: 1 / 0,
                    maxZ: -1 / 0
                };
                let otherSumX = 0;
                let otherSumZ = 0;
                let otherCount = 0;
                for (const point of building.points) {
                    const x = Number(Array.isArray(point) ? point[0] : point.x) || 0;
                    const z = Number(Array.isArray(point) ? point[1] : point.z) || 0;
                    otherBounds.minX = Math.min(otherBounds.minX, x);
                    otherBounds.maxX = Math.max(otherBounds.maxX, x);
                    otherBounds.minZ = Math.min(otherBounds.minZ, z);
                    otherBounds.maxZ = Math.max(otherBounds.maxZ, z);
                    otherSumX += x;
                    otherSumZ += z;
                    otherCount++;
                }
                if (!otherCount || !Number.isFinite(otherBounds.minX))
                    continue;
                const otherExpanded = {
                    minX: otherBounds.minX - padding,
                    maxX: otherBounds.maxX + padding,
                    minZ: otherBounds.minZ - padding,
                    maxZ: otherBounds.maxZ + padding
                };
                if (!boundsOverlap(expanded, otherExpanded))
                    continue;
                count += 1;
                const otherCenter = {
                    x: otherSumX / otherCount,
                    z: otherSumZ / otherCount
                };
                const dx = center.x - otherCenter.x;
                const dz = center.z - otherCenter.z;
                const distance = Math.hypot(dx, dz) || 1;
                pushX += dx / distance;
                pushZ += dz / distance;
            }
            if (!count)
                return null;
            const pushLength = Math.hypot(pushX, pushZ) || 1;
            return {
                count,
                pushX: pushX / pushLength,
                pushZ: pushZ / pushLength
            };
        }

        function evaluateFootprintPlacement(points, chunk, excludeBuilding, options={}) {
            const roadConflict = getNearestRoadConflict(points, chunk, Number(options.roadClearance) || 0);
            const overlap = getFootprintOverlap(points, chunk, excludeBuilding, Math.max(0, Number(options.overlapPadding) || 0));
            let penalty = 0;
            roadConflict && roadConflict.penetration > 0 && (penalty += 5e3 + 320 * roadConflict.penetration);
            overlap && (penalty += 7e3 * overlap.count);
            if (options.keepInsideChunk && chunk) {
                const bounds = getFootprintBounds(points);
                const halfWidth = (Number(chunk.width) || 512) / 2 - 4;
                const halfHeight = (Number(chunk.height) || 512) / 2 - 4;
                const outsideX = Math.max(0, bounds.maxX - halfWidth, -halfWidth - bounds.minX);
                const outsideZ = Math.max(0, bounds.maxZ - halfHeight, -halfHeight - bounds.minZ);
                penalty += 9e3 * (outsideX + outsideZ);
            }
            return {
                penalty,
                roadConflict,
                overlap
            };
        }

        function rotateVector2D(x, z, angleRad) {
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);
            return {
                x: x * cos - z * sin,
                z: x * sin + z * cos
            };
        }

        function fitAddressHouseFootprint(points, chunk, excludeBuilding) {
            if (!chunk || !Array.isArray(points) || points.length < 3)
                return points;
            const baseEval = evaluateFootprintPlacement(points, chunk, excludeBuilding, {
                roadClearance: BUILDING_FIT_CONFIG.addressRoadClearance,
                overlapPadding: BUILDING_FIT_CONFIG.addressOverlapPadding,
                keepInsideChunk: !0
            });
            if (baseEval.penalty <= 0)
                return points;
            let bestPoints = points;
            let bestScore = baseEval.penalty;
            const directions = [];
            baseEval.roadConflict && directions.push({
                x: baseEval.roadConflict.pushX,
                z: baseEval.roadConflict.pushZ
            });
            baseEval.overlap && directions.push({
                x: baseEval.overlap.pushX,
                z: baseEval.overlap.pushZ
            });
            if (!directions.length)
                directions.push({
                    x: 1,
                    z: 0
                });
            const expanded = [];
            for (const direction of directions) {
                const length = Math.hypot(direction.x, direction.z) || 1;
                const normalized = {
                    x: direction.x / length,
                    z: direction.z / length
                };
                expanded.push(normalized, rotateVector2D(normalized.x, normalized.z, Math.PI / 4), rotateVector2D(normalized.x, normalized.z, -Math.PI / 4));
            }
            expanded.push({
                x: 1,
                z: 0
            }, {
                x: -1,
                z: 0
            }, {
                x: 0,
                z: 1
            }, {
                x: 0,
                z: -1
            });
            for (const direction of expanded) {
                const length = Math.hypot(direction.x, direction.z) || 1;
                const dir = {
                    x: direction.x / length,
                    z: direction.z / length
                };
                for (const distance of [6, 12, 18, 24, 32, 40, 50]) {
                    const candidate = moveFootprint(points, dir.x * distance, dir.z * distance);
                    const evaluation = evaluateFootprintPlacement(candidate, chunk, excludeBuilding, {
                        roadClearance: BUILDING_FIT_CONFIG.addressRoadClearance,
                        overlapPadding: BUILDING_FIT_CONFIG.addressOverlapPadding,
                        keepInsideChunk: !0
                    });
                    const score = evaluation.penalty + distance * 4;
                    if (score >= bestScore)
                        continue;
                    bestScore = score;
                    bestPoints = candidate;
                    if (evaluation.penalty <= 0)
                        return bestPoints;
                }
            }
            return bestPoints;
        }

        function fitRegularBuildingFootprint(points, chunk, excludeBuilding) {
            if (!chunk || !Array.isArray(points) || points.length < 3)
                return points;
            const center = getFootprintCenter(points);
            const baseEval = evaluateFootprintPlacement(points, chunk, excludeBuilding, {
                roadClearance: BUILDING_FIT_CONFIG.regularRoadClearance,
                overlapPadding: BUILDING_FIT_CONFIG.regularOverlapPadding
            });
            if (baseEval.penalty <= 0)
                return points;
            let bestPoints = points;
            let bestScore = baseEval.penalty;
            for (const scale of [1, .97, .94, .91, .88, .85, .82, .79, .73, .67, .6, .54, .48, .44, BUILDING_FIT_CONFIG.minimumRegularScale]) {
                const scaled = 1 === scale ? points : scaleFootprint(points, scale, center);
                const evaluation = evaluateFootprintPlacement(scaled, chunk, excludeBuilding, {
                    roadClearance: BUILDING_FIT_CONFIG.regularRoadClearance,
                    overlapPadding: BUILDING_FIT_CONFIG.regularOverlapPadding
                });
                const score = evaluation.penalty + (1 - scale) * 1800;
                if (score >= bestScore)
                    continue;
                bestScore = score;
                bestPoints = scaled;
                if (evaluation.penalty <= 0)
                    return bestPoints;
            }
            return bestPoints;
        }

        function fitBuildingFootprintToEnvironment(points, match) {
            const chunk = match && match.chunk;
            const building = match && match.building;
            if (!chunk || !building)
                return points;
            return building.__tmStandaloneAddressBuilding ? fitAddressHouseFootprint(points, chunk, building) : fitRegularBuildingFootprint(points, chunk, building);
        }

        function getFootprintTerrainExtents(points, baseY, spec) {
            if (!globalState.THREE || !Array.isArray(points) || !points.length)
                return {
                    minY: Number(baseY) || 0,
                    maxY: Number(baseY) || 0
                };
            const worldOffset = getCustomBuildingWorldOffset(spec);
            let minY = Number(baseY) || 0;
            let maxY = Number(baseY) || 0;
            for (const sample of getFootprintSamplePoints(points)) {
                const worldX = worldOffset.x + (Number(sample.x) || 0);
                const worldZ = worldOffset.z + (Number(sample.z) || 0);
                const terrainY = getCachedCustomTerrainYWorld(new globalState.THREE.Vector3(worldX, baseY, worldZ), baseY);
                minY = Math.min(minY, terrainY);
                maxY = Math.max(maxY, terrainY);
            }
            return {
                minY,
                maxY
            };
        }

        function getRaisedCustomBuildingBaseY(points, baseY, spec) {
            const terrain = getFootprintTerrainExtents(points, baseY, spec);
            const clearance = Math.max(BUILDING_FIT_CONFIG.groundClearance, Number(spec && spec.base && spec.base.groundClearance) || 0);
            return Math.max(Number(baseY) || 0, terrain.maxY + clearance);
        }

        function createStandaloneAddressBuilding(entry, chunk, index) {
            const position = getAddressMatchPosition(entry);
            if (!position || !isWorldPositionInsideChunk(position, chunk, Number(entry && entry.match && entry.match.radius) || 45))
                return null;
            const cx = Number(chunk && chunk.cx) || 0;
            const cz = Number(chunk && chunk.cz) || 0;
            const localX = position.x - cx;
            const localZ = position.z - cz;
            let y = 0;
            try {
                if (chunk && "function" == typeof chunk.getTerrainYLoc) {
                    const terrainY = chunk.getTerrainYLoc(localX, localZ);
                    Number.isFinite(terrainY) && terrainY > -999 && (y = terrainY);
                } else
                    y = getCachedCustomTerrainYWorld(position, 0);
            } catch (terrainError) {}
            const half = getStandaloneBuildingHalfSize(entry);
            const initialPoints = [{
                x: localX - half.x,
                z: localZ - half.z
            }, {
                x: localX + half.x,
                z: localZ - half.z
            }, {
                x: localX + half.x,
                z: localZ + half.z
            }, {
                x: localX - half.x,
                z: localZ + half.z
            }];
            const points = fitAddressHouseFootprint(initialPoints, chunk, null);
            const center = getFootprintCenter(points);
            try {
                if (chunk && "function" == typeof chunk.getTerrainYLoc) {
                    const shiftedTerrainY = chunk.getTerrainYLoc(center.x, center.z);
                    Number.isFinite(shiftedTerrainY) && shiftedTerrainY > -999 && (y = shiftedTerrainY);
                }
            } catch (shiftedTerrainError) {}
            const THREE = globalState.THREE;
            const packedPoints = [];
            for (const point of points)
                packedPoints.push([point.x, point.z]);
            return {
                __tmStandaloneAddressBuilding: !0,
                index: -1 - (Number(index) || 0),
                level: Math.max(1, Number(entry && entry.base && entry.base.floors) || 1),
                type: 9,
                y,
                chunkCenter: new THREE.Vector3(cx,0,cz),
                houseCenterLocal: new THREE.Vector3(center.x,y,center.z),
                houseCenter: new THREE.Vector3(cx + center.x,y,cz + center.z),
                points: packedPoints
            };
        }

        function isAuto3dCatalogEnabled(catalog) {
            if (!featureState.auto3dBuildings)
                return !1;
            if (!catalog)
                return !0;
            if (!1 === catalog.auto3d || !1 === catalog.auto3D || catalog.settings && (!1 === catalog.settings.auto3d || !1 === catalog.settings.auto3D))
                return !1;
            return !0;
        }

        function getFootprintArea(points) {
            if (!Array.isArray(points) || points.length < 3)
                return 0;
            let area = 0;
            for (let index = 0; index < points.length; index++) {
                const current = points[index];
                const next = points[(index + 1) % points.length];
                area += (Number(current.x) || 0) * (Number(next.z) || 0) - (Number(next.x) || 0) * (Number(current.z) || 0);
            }
            return Math.abs(area) / 2;
        }

        function pickExistingTemplate(templateNames, templates) {
            for (const templateName of templateNames)
                if (templates && templates[templateName])
                    return templateName;
            if (templates) {
                if (isDeveloperToggleEnabled("perfTemplateKeyLoop")) {
                    for (const templateName in templates)
                        if (Object.prototype.hasOwnProperty.call(templates, templateName) && templateName && "modeler_house_demo" !== templateName)
                            return templateName;
                } else {
                    for (const templateName of Object.keys(templates))
                        if (templateName && "modeler_house_demo" !== templateName)
                            return templateName;
                }
            }
            return null;
        }

        function pickAutoBuildingTemplate(building, chunk, templates) {
            const level = Math.max(1, Math.round(Number(building && building.level) || 2));
            const points = getBuildingFootprint(building, {
                base: {
                    inset: 0
                }
            });
            const area = getFootprintArea(points);
            const seed = Math.abs(Math.round((Number(chunk && chunk.cx) || 0) * .13 + (Number(chunk && chunk.cz) || 0) * .17 + (Number(building && building.index) || 0) * 31));
            if (level >= 6)
                return pickExistingTemplate(seed % 2 ? ["glass_office", "city_apartment"] : ["city_apartment", "glass_office"], templates);
            if (level >= 4)
                return pickExistingTemplate(seed % 3 ? ["city_apartment", "alpine_hotel", "school_building"] : ["alpine_hotel", "city_apartment"], templates);
            if (area > 520)
                return pickExistingTemplate(seed % 2 ? ["logistics_warehouse", "school_building", "supermarket_block"] : ["school_building", "logistics_warehouse"], templates);
            if (area > 260 && level <= 2)
                return pickExistingTemplate(seed % 3 ? ["supermarket_block", "modern_villa", "corner_shop"] : ["modern_villa", "supermarket_block"], templates);
            if (level <= 1)
                return pickExistingTemplate(seed % 3 ? ["lakeside_cottage", "farm_barn", "chalet_house"] : ["farm_barn", "lakeside_cottage"], templates);
            return pickExistingTemplate([
                ["chalet_house", "row_house", "modern_villa"][seed % 3],
                "corner_shop",
                "alpine_hotel",
                "modern_villa",
                "chalet_house"
            ], templates);
        }

        function createGeneratedAuto3dBuildingEntry(building, chunk, id) {
            const level = Math.max(1, Math.round(Number(building && building.level) || 2));
            const points = getBuildingFootprint(building, {
                base: {
                    inset: 0
                }
            });
            const area = getFootprintArea(points);
            const seed = Math.abs(Math.round((Number(chunk && chunk.cx) || 0) * .13 + (Number(chunk && chunk.cz) || 0) * .17 + (Number(building && building.index) || 0) * 31));
            const highRise = level >= 5;
            const largeFootprint = area > 520;
            const shopLike = area > 260 && level <= 2;
            const styles = [{
                wall: 0xd7c2a2,
                roof: 0x7f3128,
                frame: 0xf6efe4,
                glass: 0x8bc7df,
                roofType: "gable",
                inset: .08
            }, {
                wall: 0xe9ece8,
                roof: 0x535a60,
                frame: 0x20252a,
                glass: 0x91bed2,
                roofType: "flat",
                inset: .02
            }, {
                wall: 0xcfc1aa,
                roof: 0x69645d,
                frame: 0xf4eee6,
                glass: 0xa5d7ff,
                roofType: "flat",
                inset: 0
            }, {
                wall: 0xc89072,
                roof: 0x6b2f2a,
                frame: 0xf3eadc,
                glass: 0x8ebbd0,
                roofType: "gable",
                inset: 0
            }, {
                wall: 0xaeb7bd,
                roof: 0x59636b,
                frame: 0xe7eef2,
                glass: 0x8fbdd0,
                roofType: "flat",
                inset: 0
            }];
            const style = styles[seed % styles.length];
            const floors = highRise ? Math.max(5, level) : largeFootprint ? Math.max(1, Math.min(level, 2)) : Math.max(1, Math.min(level, 4));
            const floorHeight = highRise ? 2.9 : largeFootprint ? 4.2 : 2.9;
            const flatRoof = highRise || largeFootprint || shopLike || "flat" === style.roofType;
            const rows = highRise ? floors : largeFootprint ? 1 : Math.max(1, floors);
            const windowsEnabled = !largeFootprint || shopLike;
            const parts = [{
                type: "door",
                size: [1.15, 2.15, .14],
                position: [0, 1.1, -4.25],
                rotation: [0, 0, 0],
                color: highRise ? 0x2e3438 : 0x6d3f24,
                materialKind: "wood",
                frameColor: 0xece0cb,
                hingeSide: seed % 2 ? "right" : "left",
                openAngle: 0,
                isOpen: !1,
            }];
            if (highRise)
                parts.push({
                    type: "box",
                    size: [2.5, 1.2, 2.5],
                    position: [2.9, floors * floorHeight + .8, 2.2],
                    rotation: [0, 0, 0],
                    color: 0x3b4650,
                    materialKind: "metal"
                });
            if (largeFootprint && !shopLike)
                parts.push({
                    type: "box",
                    size: [3.6, 3.6, .16],
                    position: [-2.5, 2.05, -4.45],
                    rotation: [0, 0, 0],
                    color: 0x3f4850,
                    materialKind: "metal"
                }, {
                    type: "box",
                    size: [3.6, 3.6, .16],
                    position: [2.5, 2.05, -4.45],
                    rotation: [0, 0, 0],
                    color: 0x3f4850,
                    materialKind: "metal"
                });
            return {
                id,
                match: {
                    id: getBuildingDebugId(chunk, building)
                },
                __tmAuto3d: !0,
                base: {
                    enabled: !0,
                    floors,
                    floorHeight,
                    color: style.wall,
                    inset: style.inset
                },
                roof: {
                    enabled: !0,
                    type: flatRoof ? "flat" : "gable",
                    color: style.roof,
                    height: flatRoof ? .25 : 2.3 + .25 * Math.min(4, floors),
                    overhang: flatRoof ? 0 : .45,
                    ridgeDirection: "longest"
                },
                windows: {
                    enabled: windowsEnabled,
                    width: highRise ? 1 : shopLike ? 1.55 : .9,
                    height: highRise ? 1.25 : shopLike ? 1.5 : 1.1,
                    rows,
                    gap: highRise ? .38 : shopLike ? .2 : .65,
                    margin: highRise ? .45 : .65,
                    sill: 1.1,
                    frameColor: style.frame,
                    glassColor: style.glass,
                    opacity: .55,
                    cutHoles: !0
                },
                parts
            };
        }

        function createAuto3dBuildingEntry(building, chunk, catalog) {
            if (!building || !building.houseCenter || !Array.isArray(building.points) || building.points.length < 3)
                return null;
            const templateName = pickAutoBuildingTemplate(building, chunk, catalog && catalog.templates);
            const id = `auto3d_${getBuildingDebugId(chunk, building)}`;
            const cacheKey = `${id}|${templateName || "generated"}`;
            const useAutoEntryCache = isDeveloperToggleEnabled("perfAuto3dEntryCache");
            const cached = useAutoEntryCache && runtimeState.customBuildingAutoEntryCache.get(cacheKey);
            if (cached)
                return cloneJson(cached, cached);
            const entry = templateName ? {
                id,
                template: templateName,
                match: {
                    id: getBuildingDebugId(chunk, building)
                },
                __tmAuto3d: !0
            } : createGeneratedAuto3dBuildingEntry(building, chunk, id);
            const resolved = resolveBuildingTemplate(entry, catalog && catalog.templates);
            const merged = deepMergeConfig(resolved, {
                __tmAuto3d: !0,
                windows: {
                    cutHoles: !0
                }
            });
            if (useAutoEntryCache) {
                runtimeState.customBuildingAutoEntryCache.set(cacheKey, cloneJson(merged, merged));
                if (runtimeState.customBuildingAutoEntryCache.size > 1200) {
                    const oldest = runtimeState.customBuildingAutoEntryCache.keys().next().value;
                    oldest && runtimeState.customBuildingAutoEntryCache.delete(oldest);
                }
            }
            return cloneJson(merged, merged);
        }

        function getBuildingFootprint(building, spec) {
            const rawPoints = Array.isArray(spec && spec.footprint) && spec.footprint.length >= 3 ? spec.footprint : toSafeArray(building && building.points);
            if (!rawPoints.length)
                return [];
            const points = [];
            let sumX = 0;
            let sumZ = 0;
            for (const point of rawPoints) {
                const x = Number(Array.isArray(point) ? point[0] : point.x) || 0;
                const z = Number(Array.isArray(point) ? point[1] : point.z) || 0;
                points.push({
                    x,
                    z
                });
                sumX += x;
                sumZ += z;
            }
            const inset = Number(spec && spec.base && spec.base.inset) || 0;
            if (Math.abs(inset) < 1e-6)
                return points;
            const centroidX = sumX / points.length;
            const centroidZ = sumZ / points.length;
            for (let index = 0; index < points.length; index++) {
                const point = points[index];
                const directionX = centroidX - point.x;
                const directionZ = centroidZ - point.z;
                const length = Math.hypot(directionX, directionZ) || 1;
                points[index] = {
                    x: point.x + directionX / length * inset,
                    z: point.z + directionZ / length * inset
                };
            }
            return points;
        }

        function createShapeFromFootprint(points) {
            if (!globalState.THREE || points.length < 3)
                return null;
            const shape = new globalState.THREE.Shape;
            shape.moveTo(points[0].x, -points[0].z);
            for (let index = 1; index < points.length; index++)
                shape.lineTo(points[index].x, -points[index].z);
            shape.lineTo(points[0].x, -points[0].z);
            return shape;
        }

        function resolveCustomBuildingTextureUrl(value) {
            const raw = value && "object" == typeof value ? value.url || value.src || value.href || value.path || value.id : value;
            if (null == raw || "" === String(raw).trim())
                return CUSTOM_BUILDING_FALLBACK_TEXTURE_URL;
            const text = String(raw).trim();
            if (/^\d+$/.test(text))
                return `${CUSTOM_BUILDING_TEXTURE_BASE}type${text}me.png`;
            if (/^type\d+me\.png$/i.test(text))
                return CUSTOM_BUILDING_TEXTURE_BASE + text;
            try {
                return new URL(text, BUILDING_CONFIG_URL).href;
            } catch (urlError) {
                return CUSTOM_BUILDING_FALLBACK_TEXTURE_URL;
            }
        }

        function getCustomBuildingTextureValue(spec) {
            if (!spec)
                return null;
            return spec.textureUrl || spec.texture || spec.imageUrl || spec.image || spec.material && (spec.material.textureUrl || spec.material.texture || spec.material.imageUrl || spec.material.image) || spec.base && (spec.base.textureUrl || spec.base.texture || spec.base.imageUrl || spec.base.image) || spec.textureId || spec.base && spec.base.textureId || null;
        }

        function applyCustomBuildingTexture(material, textureValue, repeatValue) {
            if (!material || !textureValue || !globalState.THREE)
                return material;
            const url = resolveCustomBuildingTextureUrl(textureValue);
            const repeat = Array.isArray(repeatValue) ? repeatValue : null;
            const repeatX = repeat ? Math.max(.01, Number(repeat[0]) || 1) : 1;
            const repeatY = repeat ? Math.max(.01, Number(repeat[1]) || repeatX) : 1;
            const cacheKey = `${url}|${repeatX}:${repeatY}`;
            const cached = runtimeState.customBuildingTextureCache.get(cacheKey);
            if (cached && cached.texture) {
                material.map = cached.texture;
                material.needsUpdate = !0;
                return material;
            }
            const loader = new globalState.THREE.TextureLoader;
            if ("function" == typeof loader.setCrossOrigin)
                loader.setCrossOrigin("anonymous");
            const texture = loader.load(url, loadedTexture => {
                setTextureQuality(loadedTexture);
                loadedTexture.repeat.set(repeatX, repeatY);
                material.map = loadedTexture;
                material.needsUpdate = !0;
            }, void 0, () => {
                material.map = null;
                material.needsUpdate = !0;
            });
            setTextureQuality(texture);
            texture.repeat.set(repeatX, repeatY);
            runtimeState.customBuildingTextureCache.set(cacheKey, {
                texture
            });
            material.map = texture;
            material.needsUpdate = !0;
            return material;
        }

        function createCustomBuildingMaterial(colorValue, spec) {
            const color = toThreeColor(colorValue, 0xffffff);
            const textureValue = getCustomBuildingTextureValue(spec);
            const repeatValue = spec && (spec.textureRepeat || spec.repeat || spec.base && (spec.base.textureRepeat || spec.base.repeat));
            const repeatKey = Array.isArray(repeatValue) ? `${roundNumberForCacheKey(Number(repeatValue[0]) || 1, 100)}:${roundNumberForCacheKey(Number(repeatValue[1]) || 1, 100)}` : "1:1";
            const materialKey = ["customBase", color, textureValue ? resolveCustomBuildingTextureUrl(textureValue) : "none", repeatKey].join("|");
            const useMaterialCache = isDeveloperToggleEnabled("perfMaterialCaches");
            if (useMaterialCache) {
                const cached = runtimeState.customBuildingMaterialCache.get(materialKey);
                if (cached)
                    return cached;
            }
            const material = new globalState.THREE.MeshBasicMaterial({
                color,
                side: globalState.THREE.DoubleSide
            });
            textureValue && applyCustomBuildingTexture(material, textureValue, repeatValue);
            useMaterialCache && markSharedResource(material, "custom-building-material");
            return useMaterialCache ? rememberLimitedCache(runtimeState.customBuildingMaterialCache, materialKey, material, CUSTOM_BUILDING_PERF.materialCacheSize) : material;
        }

        function computeWindowLayout(edgeLength, bodyHeight, sideSpec) {
            if (!sideSpec || !1 === sideSpec.enabled)
                return {
                    rects: []
                };
            const margin = Math.max(.55, Number(sideSpec.margin) || .8);
            const width = Math.max(.3, Number(sideSpec.width) || 1.05);
            const height = Math.max(.35, Number(sideSpec.height) || 1.35);
            const gap = Math.max(.15, Number(sideSpec.gap) || .65);
            const rows = Math.max(1, Math.round(Number(sideSpec.rows) || Math.max(1, Math.round((bodyHeight - 1.8) / 2.4))));
            const layoutKey = makeRoundedNumberKey([edgeLength, bodyHeight, margin, width, height, gap, rows, sideSpec.cols, sideSpec.sill, sideSpec.topPadding], 100, "|");
            const useLayoutCache = isDeveloperToggleEnabled("perfWindowLayoutCache");
            const cachedLayout = useLayoutCache && runtimeState.customBuildingWindowLayoutCache.get(layoutKey);
            if (cachedLayout)
                return cachedLayout;
            const availableLength = Math.max(0, edgeLength - 2 * margin);
            if (availableLength < width) {
                const emptyLayout = {
                    rects: [],
                    width,
                    height,
                    gap,
                    rows: 0,
                    cols: 0,
                    bottom: 0,
                    rowSpacing: 0
                };
                return useLayoutCache ? rememberLimitedCache(runtimeState.customBuildingWindowLayoutCache, layoutKey, emptyLayout, CUSTOM_BUILDING_PERF.layoutCacheSize) : emptyLayout;
            }
            const cols = Math.max(1, Math.floor(Number(sideSpec.cols) || Math.max(1, Math.floor((availableLength + gap) / (width + gap)))));
            const runLength = cols * width + Math.max(0, cols - 1) * gap;
            const startOffset = (edgeLength - runLength) / 2 + width / 2;
            const bottom = Math.max(.7, Number(sideSpec.sill) || 1.1);
            const topPadding = Math.max(.55, Number(sideSpec.topPadding) || .85);
            const usableHeight = Math.max(height, bodyHeight - bottom - topPadding);
            const rowSpacing = rows > 1 ? (usableHeight - height) / (rows - 1) : 0;
            const rects = [];
            for (let row = 0; row < rows; row++)
                for (let col = 0; col < cols; col++) {
                    const centerU = startOffset + col * (width + gap);
                    const centerY = bottom + row * rowSpacing;
                    const x1 = clamp(centerU - width / 2, .03, Math.max(.03, edgeLength - .03));
                    const x2 = clamp(centerU + width / 2, .03, Math.max(.03, edgeLength - .03));
                    const y1 = clamp(centerY - height / 2, .03, Math.max(.03, bodyHeight - .03));
                    const y2 = clamp(centerY + height / 2, .03, Math.max(.03, bodyHeight - .03));
                    if (x1 < margin - .02 || x2 > edgeLength - margin + .02)
                        continue;
                    if (x2 - x1 > width * .78 && y2 - y1 > height * .78)
                        rects.push({
                            col,
                            row,
                            centerU,
                            centerY,
                            x1,
                            x2,
                            y1,
                            y2,
                            width,
                            height
                        });
                }
            const layout = {
                rects,
                width,
                height,
                gap,
                rows,
                cols,
                bottom,
                rowSpacing
            };
            return useLayoutCache ? rememberLimitedCache(runtimeState.customBuildingWindowLayoutCache, layoutKey, layout, CUSTOM_BUILDING_PERF.layoutCacheSize) : layout;
        }

        function getSideSpecForIndex(baseSpec, index) {
            const sides = baseSpec && baseSpec.sides;
            const override = sides && (sides[index] || sides[String(index)]);
            if (!isDeveloperToggleEnabled("perfSideSpecFastPath"))
                return deepMergeConfig(baseSpec, override || {});
            return override ? deepMergeConfig(baseSpec, override) : baseSpec;
        }

        function getCustomBuildingWorldOffset(spec) {
            return {
                x: Number(spec && spec.__tmWorldOffset && spec.__tmWorldOffset.x) || 0,
                z: Number(spec && spec.__tmWorldOffset && spec.__tmWorldOffset.z) || 0
            };
        }

        function isWindowRectClearOfTerrain(rect, edgeFrame, baseY, spec) {
            if (!rect || !edgeFrame || !globalState.THREE)
                return !0;
            const worldOffset = getCustomBuildingWorldOffset(spec);
            const terrainMargin = .35;
            if (isDeveloperToggleEnabled("perfTerrainSampleLoops")) {
                for (let index = 0; index < 3; index++) {
                    const alongOffset = 0 === index ? 0 : 1 === index ? -rect.width * .22 : rect.width * .22;
                    const along = rect.centerU - edgeFrame.length / 2 + alongOffset;
                    const worldX = worldOffset.x + edgeFrame.midX + edgeFrame.alongX * along;
                    const worldZ = worldOffset.z + edgeFrame.midZ + edgeFrame.alongZ * along;
                    const terrainY = getCachedCustomTerrainYWorld(new globalState.THREE.Vector3(worldX, baseY + rect.y1, worldZ), baseY);
                    if (baseY + rect.y1 <= terrainY + terrainMargin)
                        return !1;
                }
                return !0;
            }
            const sampleOffsets = [0, -rect.width * .22, rect.width * .22];
            for (const alongOffset of sampleOffsets) {
                const along = rect.centerU - edgeFrame.length / 2 + alongOffset;
                const worldX = worldOffset.x + edgeFrame.midX + edgeFrame.alongX * along;
                const worldZ = worldOffset.z + edgeFrame.midZ + edgeFrame.alongZ * along;
                const terrainY = getCachedCustomTerrainYWorld(new globalState.THREE.Vector3(worldX, baseY + rect.y1, worldZ), baseY);
                if (baseY + rect.y1 <= terrainY + terrainMargin)
                    return !1;
            }
            return !0;
        }

        // Door/window placement pipeline:
        // 1. Snap custom details to the closest real wall edge.
        // 2. Store the same rectangles for wall cutouts and layout-window avoidance.
        // 3. Render the visible door/window meshes at that snapped position.
        function rectsOverlap2D(a, b, padding=0) {
            if (!a || !b)
                return !1;
            return a.x1 < b.x2 + padding && a.x2 > b.x1 - padding && a.y1 < b.y2 + padding && a.y2 > b.y1 - padding;
        }

        function roundNumberForCacheKey(value, scale=1e3) {
            return Math.round((Number(value) || 0) * scale) / scale;
        }

        function makeRoundedNumberKey(values, scale=1e3, separator=":") {
            let key = "";
            for (let index = 0; index < values.length; index++)
                key += (index ? separator : "") + roundNumberForCacheKey(values[index], scale);
            return key;
        }

        function getUniqueRoundedSortedCuts(values) {
            const seen = new Set;
            const result = [];
            for (const value of toSafeArray(values)) {
                const rounded = roundNumberForCacheKey(value);
                if (seen.has(rounded))
                    continue;
                seen.add(rounded);
                result.push(rounded);
            }
            result.length > 1 && result.sort((a, b) => a - b);
            return result;
        }

        function rectOverlapsAnyCutout(rect, cutouts, padding=-.012) {
            if (!rect || !Array.isArray(cutouts) || !cutouts.length)
                return !1;
            for (let index = 0; index < cutouts.length; index++)
                if (rectsOverlap2D(rect, cutouts[index], padding))
                    return !0;
            return !1;
        }

        function getWallOpenings(spec, kind, edgeIndex) {
            const store = spec && spec.__tmWallOpenings || {};
            if (spec && isDeveloperToggleEnabled("perfWallOpeningIndex")) {
                let index = spec.__tmWallOpeningIndex;
                if (!index || index.store !== store) {
                    index = {
                        store,
                        doors: new Map,
                        windows: new Map
                    };
                    for (const opening of toSafeArray(store.doors)) {
                        if (!opening)
                            continue;
                        const list = index.doors.get(opening.edgeIndex) || [];
                        list.push(opening);
                        index.doors.set(opening.edgeIndex, list);
                    }
                    for (const opening of toSafeArray(store.windows)) {
                        if (!opening)
                            continue;
                        const list = index.windows.get(opening.edgeIndex) || [];
                        list.push(opening);
                        index.windows.set(opening.edgeIndex, list);
                    }
                    spec.__tmWallOpeningIndex = index;
                }
                return ("doors" === kind ? index.doors : index.windows).get(edgeIndex) || [];
            }
            const source = toSafeArray(store[kind]);
            const result = [];
            for (const opening of source)
                opening && opening.edgeIndex === edgeIndex && result.push(opening);
            return result;
        }

        function isRectClearOfWallOpenings(rect, openings, padding=.08) {
            for (const opening of toSafeArray(openings))
                if (rectsOverlap2D(rect, opening && (opening.rect || opening), padding))
                    return !1;
            return !0;
        }

        function getWallFrames(points) {
            if (!Array.isArray(points) || points.length < 3)
                return [];
            const center = getFootprintCenter(points);
            const frames = [];
            for (let index = 0; index < points.length; index++) {
                const start = points[index];
                const end = points[(index + 1) % points.length];
                const frame = getWallEdgeFrame(start, end, center);
                frame && frames.push(Object.assign({
                    index,
                    start,
                    end
                }, frame));
            }
            return frames;
        }

        function getWallFramesForSpec(points, spec) {
            // Reuse the expensive wall frame calculation across openings, visible details and fallback doors.
            if (spec && spec.__tmWallFramesSource === points && Array.isArray(spec.__tmWallFrames))
                return spec.__tmWallFrames;
            const frames = getWallFrames(points);
            if (spec) {
                spec.__tmWallFramesSource = points;
                spec.__tmWallFrames = frames;
            }
            return frames;
        }

        function projectPointToWallFrame(point, frame) {
            const dx = (Number(frame.end.x) || 0) - (Number(frame.start.x) || 0);
            const dz = (Number(frame.end.z) || 0) - (Number(frame.start.z) || 0);
            const lengthSq = dx * dx + dz * dz || 1;
            return clamp((((Number(point.x) || 0) - (Number(frame.start.x) || 0)) * dx + ((Number(point.z) || 0) - (Number(frame.start.z) || 0)) * dz) / lengthSq, 0, 1);
        }

        function findWallFrameForDetail(points, desiredPoint, detail, spec) {
            const frames = getWallFramesForSpec(points, spec);
            if (!frames.length)
                return null;
            const requestedIndex = Number(detail && (detail.wallIndex ?? detail.edgeIndex ?? detail.sideIndex));
            if (Number.isInteger(requestedIndex)) {
                for (const frame of frames)
                    if (frame && frame.index === requestedIndex)
                        return frame;
            }
            let best = null;
            for (const frame of frames) {
                const t = projectPointToWallFrame(desiredPoint, frame);
                const closest = {
                    x: (Number(frame.start.x) || 0) + ((Number(frame.end.x) || 0) - (Number(frame.start.x) || 0)) * t,
                    z: (Number(frame.start.z) || 0) + ((Number(frame.end.z) || 0) - (Number(frame.start.z) || 0)) * t
                };
                const distance = Math.hypot((Number(desiredPoint.x) || 0) - closest.x, (Number(desiredPoint.z) || 0) - closest.z);
                if (!best || distance < best.distance)
                    best = {
                        frame,
                        distance
                    };
            }
            return best && best.frame;
        }

        function getDoorGroundYForWallFrame(frame, centerU, width, baseY, spec) {
            // Doors must start at terrain height, even when the house floor was raised and a foundation exists.
            if (!frame || !globalState.THREE)
                return Number(baseY) || 0;
            const worldOffset = getCustomBuildingWorldOffset(spec);
            const sampleRange = Math.max(.08, Number(width) * .44 || .44);
            if (isDeveloperToggleEnabled("perfTerrainSampleLoops")) {
                let bestY = Number(baseY) || 0;
                for (let index = 0; index < 3; index++) {
                    const sample = 0 === index ? 0 : 1 === index ? -sampleRange : sampleRange;
                    const sampleU = clamp((Number(centerU) || 0) + sample, 0, Number(frame.length) || 0);
                    const worldX = worldOffset.x + (Number(frame.start.x) || 0) + frame.alongX * sampleU;
                    const worldZ = worldOffset.z + (Number(frame.start.z) || 0) + frame.alongZ * sampleU;
                    const terrainY = getCachedCustomTerrainYWorld(new globalState.THREE.Vector3(worldX,bestY,worldZ), bestY);
                    if (Number.isFinite(terrainY))
                        bestY = Math.min(bestY, terrainY);
                }
                return bestY;
            }
            const samples = [0, -sampleRange, sampleRange];
            let bestY = Number(baseY) || 0;
            for (const sample of samples) {
                const sampleU = clamp((Number(centerU) || 0) + sample, 0, Number(frame.length) || 0);
                const worldX = worldOffset.x + (Number(frame.start.x) || 0) + frame.alongX * sampleU;
                const worldZ = worldOffset.z + (Number(frame.start.z) || 0) + frame.alongZ * sampleU;
                const terrainY = getCachedCustomTerrainYWorld(new globalState.THREE.Vector3(worldX,bestY,worldZ), bestY);
                if (Number.isFinite(terrainY))
                    bestY = Math.min(bestY, terrainY);
            }
            return bestY;
        }

        function computeWallDetailPlacement(points, baseY, bodyHeight, spec, anchorPoint, detail, size, kind) {
            // Most exported parts are relative to the house center; this converts them to an actual wall-local opening.
            if (!Array.isArray(points) || points.length < 3 || !anchorPoint || detail && detail.absolute)
                return null;
            const position = detail && detail.position || [0, 0, 0];
            const anchorX = Number(anchorPoint.x) || 0;
            const anchorZ = Number(anchorPoint.z) || 0;
            const desired = {
                x: anchorX + (Number(position[0]) || 0),
                z: anchorZ + (Number(position[2]) || 0)
            };
            const frame = findWallFrameForDetail(points, desired, detail, spec);
            if (!frame)
                return null;
            const width = Math.max(.2, Number(size && size[0]) || 1);
            const height = Math.max(.2, Number(size && size[1]) || 1);
            const wallDepth = Math.max(.42, Number(spec && spec.base && (spec.base.wallDepth || spec.base.depth)) || .42);
            const margin = Math.min(frame.length / 2, width / 2 + .18);
            const projected = projectPointToWallFrame(desired, frame);
            const centerU = clamp(projected * frame.length, margin, Math.max(margin, frame.length - margin));
            const localX = (Number(frame.start.x) || 0) + frame.alongX * centerU + frame.normalX * wallDepth / 2;
            const localZ = (Number(frame.start.z) || 0) + frame.alongZ * centerU + frame.normalZ * wallDepth / 2;
            const rawCenterY = (Number(anchorPoint.y) || 0) + (Number(position[1]) || 0);
            const grounded = "door" === kind;
            const doorGroundY = grounded ? getDoorGroundYForWallFrame(frame, centerU, width, baseY, spec) : baseY;
            const minCenterY = doorGroundY + height / 2;
            const maxCenterY = baseY + Math.max(height / 2 + .02, bodyHeight - height / 2 - .08);
            const centerY = grounded ? minCenterY : clamp(rawCenterY || baseY + 1.25 + height / 2, minCenterY + .45, maxCenterY);
            const openingPad = grounded ? .018 : .018;
            const yPad = grounded ? .075 : openingPad;
            const y1 = grounded ? doorGroundY - baseY - yPad : Math.max(.025, centerY - baseY - height / 2 - yPad);
            const y2 = Math.min(bodyHeight - .025, centerY - baseY + height / 2 + openingPad);
            return {
                edgeIndex: frame.index,
                position: [localX, centerY, localZ],
                rotationY: frame.rotationY,
                normalX: frame.normalX,
                normalZ: frame.normalZ,
                wallDepth,
                doorGroundY,
                kind,
                rect: {
                    x1: Math.max(.025, centerU - width / 2 - openingPad),
                    x2: Math.min(frame.length - .025, centerU + width / 2 + openingPad),
                    y1,
                    y2
                }
            };
        }

        function createFallbackDoorDetailForFootprint(points, baseY, bodyHeight, spec, anchorPoint) {
            if (!Array.isArray(points) || points.length < 3 || !anchorPoint || bodyHeight < 2.05)
                return null;
            let bestFrame = null;
            for (const frame of getWallFramesForSpec(points, spec))
                if (frame && frame.length >= 1.4 && (!bestFrame || frame.length > bestFrame.length))
                    bestFrame = frame;
            if (!bestFrame)
                return null;
            const wallDepth = Math.max(.42, Number(spec && spec.base && (spec.base.wallDepth || spec.base.depth)) || .42);
            return {
                type: "door",
                wallIndex: bestFrame.index,
                size: [1.08, Math.min(2.25, Math.max(1.95, bodyHeight - .35)), Math.max(.08, wallDepth * .72)],
                position: [bestFrame.midX - (Number(anchorPoint.x) || 0), 1.1, bestFrame.midZ - (Number(anchorPoint.z) || 0)],
                rotation: [0, bestFrame.rotationY, 0],
                rotationUnit: "rad",
                color: 0x6f4327,
                frameColor: 0xe9dbc4,
                materialKind: "wood",
                hingeSide: "left",
                openAngle: 88,
                openRadius: 2.15
            };
        }

        function prepareWallOpeningsForSpec(points, baseY, bodyHeight, spec, anchorPoint) {
            // This is the shared source of truth for wall holes and visible door/window meshes.
            if (!spec || !Array.isArray(points) || points.length < 3)
                return;
            spec.__tmWallPoints = points;
            spec.__tmWallFrames = getWallFramesForSpec(points, spec);
            spec.__tmBaseY = baseY;
            spec.__tmBodyHeight = bodyHeight;
            const openings = {
                doors: [],
                windows: []
            };
            const doorsByEdge = new Map;
            const addDoorOpening = placement => {
                const opening = {
                    edgeIndex: placement.edgeIndex,
                    rect: placement.rect,
                    kind: "door"
                };
                openings.doors.push(opening);
                const list = doorsByEdge.get(placement.edgeIndex) || [];
                list.push(opening);
                doorsByEdge.set(placement.edgeIndex, list);
            };
            const parts = toSafeArray(spec.parts);
            const placePart = (part, kind) => {
                const size = getDetailSize(part, "door" === kind ? [1.05, 2.25, .1] : [1.2, 1.4, .16]);
                const placement = computeWallDetailPlacement(points, baseY, bodyHeight, spec, anchorPoint, part, size, kind);
                if (!placement)
                    return null;
                part.__tmWallPlacement = placement;
                return placement;
            };
            let hasDoor = !1;
            for (const part of parts) {
                if (!isDoorDetail(part))
                    continue;
                const placement = placePart(part, "door");
                if (!placement)
                    continue;
                addDoorOpening(placement);
                hasDoor = !0;
            }
            if (!hasDoor) {
                const fallback = createFallbackDoorDetailForFootprint(points, baseY, bodyHeight, spec, anchorPoint);
                if (fallback) {
                    const placement = placePart(fallback, "door");
                    if (placement) {
                        fallback.__tmWallPlacement = placement;
                        spec.__tmFallbackDoorDetail = fallback;
                        addDoorOpening(placement);
                        hasDoor = !0;
                    }
                }
            }
            for (const part of parts) {
                const type = String(part && part.type || "").toLowerCase();
                if ("window" !== type)
                    continue;
                part.__tmSkipRender = !1;
                const placement = placePart(part, "window");
                if (!placement)
                    continue;
                if (!isRectClearOfWallOpenings(placement.rect, doorsByEdge.get(placement.edgeIndex), .72)) {
                    part.__tmWallPlacement = null;
                    part.__tmSkipRender = !0;
                    continue;
                }
                openings.windows.push({
                    edgeIndex: placement.edgeIndex,
                    rect: placement.rect,
                    kind: "window"
                });
            }
            spec.__tmWallOpenings = openings;
        }

        function getFootprintMinTerrainY(points, baseY, spec) {
            return getFootprintTerrainExtents(points, baseY, spec).minY;
        }

        function createFoundationDoorOpenings(spec, baseY, foundationY, foundationHeight) {
            // Foundation meshes use their own Y-space, so door cutouts are shifted down from the wall body.
            const height = Math.max(0, Number(foundationHeight) || 0);
            if (height <= .06)
                return null;
            const doors = [];
            for (const opening of toSafeArray(spec && spec.__tmWallOpenings && spec.__tmWallOpenings.doors)) {
                const rect = opening && (opening.rect || opening);
                if (!rect)
                    continue;
                const y1 = 0;
                const y2 = height;
                if ((Number(rect.x2) || 0) - (Number(rect.x1) || 0) <= .06 || y2 - y1 <= .06)
                    continue;
                doors.push({
                    edgeIndex: opening.edgeIndex,
                    kind: "door",
                    rect: {
                        x1: Number(rect.x1) || 0,
                        x2: Number(rect.x2) || 0,
                        y1,
                        y2
                    }
                });
            }
            return doors.length ? {
                doors,
                windows: []
            } : null;
        }

        function createCustomBuildingFoundation(points, baseY, foundationY, colorValue, spec) {
            const height = Math.max(0, Number(baseY) - Number(foundationY));
            if (height < BUILDING_FIT_CONFIG.foundationMinHeight)
                return null;
            const foundationOpenings = createFoundationDoorOpenings(spec, baseY, foundationY, height);
            const foundationSpec = deepMergeConfig(spec || {}, {
                windows: {
                    enabled: !1,
                    cutHoles: !1
                },
                roof: {
                    enabled: !1
                },
                base: {
                    solid: !foundationOpenings
                }
            });
            if (foundationOpenings)
                foundationSpec.__tmWallOpenings = foundationOpenings;
            return createCustomBuildingBody(points, foundationY, height, null != colorValue ? colorValue : 14540253, foundationSpec);
        }

        function createCustomBuildingSlab(points, baseY, thickness, colorValue, spec, name) {
            const safeThickness = Math.max(.06, Number(thickness) || .12);
            const slab = createCustomBuildingBody(points, Number(baseY) || 0, safeThickness, null != colorValue ? colorValue : 0xb88f61, deepMergeConfig(spec || {}, {
                windows: {
                    enabled: !1,
                    cutHoles: !1
                },
                roof: {
                    enabled: !1
                },
                base: {
                    solid: !0
                }
            }));
            slab && (slab.name = name || "__tmCustomBuildingSlab");
            return slab;
        }

        function hasExplicitFloorPart(spec) {
            for (const part of toSafeArray(spec && spec.parts))
                if ("floor" === String(part && part.type || "").toLowerCase())
                    return !0;
            return !1;
        }

        function clampWallCutoutRect(rect, edgeLength, bodyHeight) {
            if (!rect)
                return null;
            const x1 = clamp(Number(rect.x1) || 0, 0, edgeLength);
            const x2 = clamp(Number(rect.x2) || 0, 0, edgeLength);
            const y1 = clamp(Number(rect.y1) || 0, 0, bodyHeight);
            const y2 = clamp(Number(rect.y2) || 0, 0, bodyHeight);
            return x2 - x1 > .06 && y2 - y1 > .06 ? {
                x1,
                x2,
                y1,
                y2
            } : null;
        }

        function collectWallCutoutsForEdge(index, edgeFrame, baseY, bodyHeight, sideSpec, layout, spec) {
            const edgeLength = edgeFrame && edgeFrame.length || 0;
            const cutouts = [];
            const doorOpenings = getWallOpenings(spec, "doors", index);
            const windowOpenings = getWallOpenings(spec, "windows", index);
            const useFastCutouts = isDeveloperToggleEnabled("perfWallCutoutFastPath");
            const addOpeningCutout = opening => {
                if (!opening)
                    return;
                const rect = clampWallCutoutRect(opening.rect || opening, edgeLength, bodyHeight);
                rect && cutouts.push(rect);
            };
            if (useFastCutouts) {
                for (const opening of doorOpenings)
                    addOpeningCutout(opening);
                for (const opening of windowOpenings)
                    addOpeningCutout(opening);
            } else {
                for (const opening of doorOpenings.concat(windowOpenings))
                    addOpeningCutout(opening);
            }
            if (!1 === sideSpec.enabled || !1 === sideSpec.cutHoles)
                return cutouts;
            for (const rect of toSafeArray(layout && layout.rects)) {
                if (!isWindowRectClearOfTerrain(rect, edgeFrame, baseY, spec))
                    continue;
                if (!isRectClearOfWallOpenings(rect, doorOpenings, .72))
                    continue;
                if (!isRectClearOfWallOpenings(rect, useFastCutouts ? windowOpenings : doorOpenings.concat(windowOpenings), .28))
                    continue;
                const cutout = clampWallCutoutRect(rect, edgeLength, bodyHeight);
                cutout && cutouts.push(cutout);
            }
            return cutouts;
        }

        function addWallSegmentBox(group, material, frame, baseY, wallDepth, x1, x2, y1, y2) {
            const width = x2 - x1;
            const height = y2 - y1;
            if (!group || width <= .045 || height <= .045)
                return;
            const overlapX = .24;
            const overlapY = .13;
            const overlapZ = .18;
            const centerU = (x1 + x2) / 2 - frame.length / 2;
            const centerY = baseY + (y1 + y2) / 2;
            const mesh = createRuntimeBox([width + overlapX, height + overlapY, wallDepth + overlapZ], material, [0, 0, 0]);
            mesh.position.set(frame.midX + frame.alongX * centerU + frame.normalX * wallDepth / 2, centerY, frame.midZ + frame.alongZ * centerU + frame.normalZ * wallDepth / 2);
            mesh.rotation.y = frame.rotationY;
            group.add(mesh);
        }

        function addThickWallSegments(group, material, frame, baseY, bodyHeight, wallDepth, cutouts) {
            const edgeLength = frame && frame.length || 0;
            if (edgeLength < .4 || bodyHeight < .1)
                return;
            const useFastCutouts = isDeveloperToggleEnabled("perfWallCutoutFastPath");
            const safeCutouts = toSafeArray(cutouts);
            const xCuts = [0, edgeLength];
            const yCuts = [0, bodyHeight];
            for (const rect of safeCutouts) {
                xCuts.push(clamp(rect.x1, 0, edgeLength), clamp(rect.x2, 0, edgeLength));
                yCuts.push(clamp(rect.y1, 0, bodyHeight), clamp(rect.y2, 0, bodyHeight));
            }
            const uniqueCuts = values => Array.from(new Set(values.map(value => Math.round(value * 1e3) / 1e3))).sort((a, b) => a - b);
            const xs = useFastCutouts ? getUniqueRoundedSortedCuts(xCuts) : uniqueCuts(xCuts);
            const ys = useFastCutouts ? getUniqueRoundedSortedCuts(yCuts) : uniqueCuts(yCuts);
            for (let xi = 0; xi < xs.length - 1; xi++)
                for (let yi = 0; yi < ys.length - 1; yi++) {
                    const x1 = xs[xi];
                    const x2 = xs[xi + 1];
                    const y1 = ys[yi];
                    const y2 = ys[yi + 1];
                    if (x2 - x1 < .045 || y2 - y1 < .045)
                        continue;
                    const center = {
                        x1: (x1 + x2) / 2,
                        x2: (x1 + x2) / 2,
                        y1: (y1 + y2) / 2,
                        y2: (y1 + y2) / 2
                    };
                    if (useFastCutouts ? rectOverlapsAnyCutout(center, safeCutouts, -.012) : safeCutouts.some(rect => rectsOverlap2D(center, rect, -.012)))
                        continue;
                    addWallSegmentBox(group, material, frame, baseY, wallDepth, x1, x2, y1, y2);
                }
        }

        function createCustomBuildingWallBody(points, baseY, bodyHeight, colorValue, spec) {
            if (!globalState.THREE || points.length < 3)
                return null;
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmCustomBuildingWindowCutBody";
            const material = createCustomBuildingMaterial(colorValue, spec);
            const center = {
                x: 0,
                z: 0
            };
            for (const point of points) {
                center.x += point.x;
                center.z += point.z;
            }
            center.x /= points.length;
            center.z /= points.length;
            const windowsSpec = deepMergeConfig(spec && spec.windows || {}, {
                sides: spec && spec.sides || {}
            });
            const wallDepth = Math.max(.42, Number(spec && spec.base && (spec.base.wallDepth || spec.base.depth)) || .42);
            for (let index = 0; index < points.length; index++) {
                const current = points[index];
                const next = points[(index + 1) % points.length];
                const edgeFrame = getWallEdgeFrame(current, next, center);
                if (!edgeFrame || edgeFrame.length < .4)
                    continue;
                const sideSpec = getSideSpecForIndex(windowsSpec, index);
                const layout = computeWindowLayout(edgeFrame.length, bodyHeight, sideSpec);
                const cutouts = collectWallCutoutsForEdge(index, edgeFrame, baseY, bodyHeight, sideSpec, layout, spec);
                addThickWallSegments(group, material, edgeFrame, baseY, bodyHeight, wallDepth, cutouts);
            }
            return group.children.length ? group : null;
        }

        function createCustomBuildingBody(points, baseY, bodyHeight, colorValue, spec) {
            if (!globalState.THREE || points.length < 3)
                return null;
            const hasWallOpenings = !!(spec && spec.__tmWallOpenings && (toSafeArray(spec.__tmWallOpenings.doors).length || toSafeArray(spec.__tmWallOpenings.windows).length));
            const shouldCutWindows = spec && !(spec.base && !0 === spec.base.solid) && (hasWallOpenings || spec.windows && !1 !== spec.windows.enabled && !1 !== spec.windows.cutHoles);
            if (shouldCutWindows) {
                const windowBody = createCustomBuildingWallBody(points, baseY, bodyHeight, colorValue, spec);
                if (windowBody)
                    return windowBody;
            }
            const shape = createShapeFromFootprint(points);
            if (!shape)
                return null;
            const geometry = new globalState.THREE.ExtrudeGeometry(shape, {
                depth: bodyHeight,
                bevelEnabled: !1,
                steps: 1
            });
            geometry.rotateX(-Math.PI / 2);
            geometry.translate(0, baseY, 0);
            return new globalState.THREE.Mesh(geometry, createCustomBuildingMaterial(colorValue, spec));
        }

        function computeFootprintFrame(points, ridgeMode) {
            let longestLength = 0;
            let direction = {
                x: 1,
                z: 0
            };
            for (let index = 0; index < points.length; index++) {
                const current = points[index];
                const next = points[(index + 1) % points.length];
                const dx = next.x - current.x;
                const dz = next.z - current.z;
                const length = Math.hypot(dx, dz);
                if (length > longestLength) {
                    longestLength = length;
                    direction = {
                        x: dx / length,
                        z: dz / length
                    };
                }
            }
            const side = {
                x: -direction.z,
                z: direction.x
            };
            const centroid = {
                x: 0,
                z: 0
            };
            for (const point of points) {
                centroid.x += point.x;
                centroid.z += point.z;
            }
            centroid.x /= points.length;
            centroid.z /= points.length;
            let minU = 1 / 0;
            let maxU = -1 / 0;
            let minV = 1 / 0;
            let maxV = -1 / 0;
            const axis = "shortest" === ridgeMode ? side : direction;
            const ortho = "shortest" === ridgeMode ? direction : side;
            for (const point of points) {
                const offsetX = point.x - centroid.x;
                const offsetZ = point.z - centroid.z;
                const u = offsetX * axis.x + offsetZ * axis.z;
                const v = offsetX * ortho.x + offsetZ * ortho.z;
                minU = Math.min(minU, u);
                maxU = Math.max(maxU, u);
                minV = Math.min(minV, v);
                maxV = Math.max(maxV, v);
            }
            return {
                center: centroid,
                axis,
                ortho,
                minU,
                maxU,
                minV,
                maxV
            };
        }

        function localFramePoint(frame, u, v, y) {
            return new globalState.THREE.Vector3(frame.center.x + frame.axis.x * u + frame.ortho.x * v, y, frame.center.z + frame.axis.z * u + frame.ortho.z * v);
        }

        function createFlatCustomRoof(points, baseY, bodyHeight, colorValue) {
            const slab = createCustomBuildingSlab(points, baseY + bodyHeight - .06, .18, colorValue, {
                base: {
                    solid: !0
                },
                windows: {
                    enabled: !1,
                    cutHoles: !1
                },
                roof: {
                    enabled: !1
                }
            }, "__tmCustomBuildingFlatRoof");
            if (slab)
                return slab;
            // Irregular footprints use an exact footprint roof so L-shaped houses do not get a floating rectangle.
            const shape = createShapeFromFootprint(points);
            if (!shape)
                return null;
            const geometry = new globalState.THREE.ShapeGeometry(shape);
            geometry.rotateX(-Math.PI / 2);
            geometry.translate(0, baseY + bodyHeight + .03, 0);
            return new globalState.THREE.Mesh(geometry, new globalState.THREE.MeshBasicMaterial({
                color: toThreeColor(colorValue, 0x834734),
                side: globalState.THREE.DoubleSide
            }));
        }

        function shouldUseFootprintRoof(points) {
            // Bounding-box roofs only look safe on simple rectangles; complex shapes need footprint roofs.
            if (!Array.isArray(points) || points.length > 4)
                return !0;
            const bounds = getFootprintBounds(points);
            const boundsArea = Math.max(.001, (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ));
            return getFootprintArea(points) / boundsArea < .82;
        }

        function createCustomRoof(points, baseY, bodyHeight, roofSpec) {
            if (!globalState.THREE || points.length < 3 || !roofSpec || !1 === roofSpec.enabled)
                return null;
            const roofType = roofSpec.type || "gable";
            const overhang = Math.max(.18, Number(roofSpec.overhang) || 0);
            const colorValue = null != roofSpec.color ? roofSpec.color : 8606516;
            if ("flat" === roofType || shouldUseFootprintRoof(points))
                return createFlatCustomRoof(points, baseY, bodyHeight, colorValue);
            const frame = computeFootprintFrame(points, roofSpec.ridgeDirection || "longest");
            frame.minU -= overhang;
            frame.maxU += overhang;
            frame.minV -= overhang;
            frame.maxV += overhang;
            const roofHeight = Math.max(.25, Number(roofSpec.height) || 2.2);
            const y0 = baseY + bodyHeight;
            const leftA = localFramePoint(frame, frame.minU, frame.minV, y0);
            const leftB = localFramePoint(frame, frame.maxU, frame.minV, y0);
            const rightA = localFramePoint(frame, frame.minU, frame.maxV, y0);
            const rightB = localFramePoint(frame, frame.maxU, frame.maxV, y0);
            const ridgeA = localFramePoint(frame, frame.minU, 0, y0 + roofHeight);
            const ridgeB = localFramePoint(frame, frame.maxU, 0, y0 + roofHeight);
            const positions = [
                leftA, ridgeA, leftB,
                leftB, ridgeA, ridgeB,
                rightA, rightB, ridgeA,
                rightB, ridgeB, ridgeA,
                leftA, rightA, ridgeA,
                leftB, ridgeB, rightB
            ];
            const flat = [];
            for (const point of positions)
                flat.push(point.x, point.y, point.z);
            const geometry = new globalState.THREE.BufferGeometry;
            geometry.setAttribute("position", new globalState.THREE.Float32BufferAttribute(flat,3));
            geometry.computeVertexNormals();
            return new globalState.THREE.Mesh(geometry, new globalState.THREE.MeshBasicMaterial({
                color: toThreeColor(colorValue, 0x834734),
                side: globalState.THREE.DoubleSide
            }));
        }

        function getWallEdgeFrame(start, end, center) {
            const rawDx = end.x - start.x;
            const rawDz = end.z - start.z;
            const length = Math.hypot(rawDx, rawDz);
            if (length < .001)
                return null;
            const alongX = rawDx / length;
            const alongZ = rawDz / length;
            const midX = (start.x + end.x) / 2;
            const midZ = (start.z + end.z) / 2;
            const outwardX = midX - center.x;
            const outwardZ = midZ - center.z;
            let normalX = -alongZ;
            let normalZ = alongX;
            let rotationEdgeX = alongX;
            let rotationEdgeZ = alongZ;
            if (normalX * outwardX + normalZ * outwardZ < 0) {
                normalX = -normalX;
                normalZ = -normalZ;
                rotationEdgeX = -rotationEdgeX;
                rotationEdgeZ = -rotationEdgeZ;
            }
            return {
                length,
                alongX,
                alongZ,
                normalX,
                normalZ,
                rotationY: Math.atan2(-rotationEdgeZ, rotationEdgeX),
                midX,
                midZ
            };
        }

        function createWallPanel(start, end, center, baseY, height, colorValue, depth) {
            if (!globalState.THREE)
                return null;
            const frame = getWallEdgeFrame(start, end, center);
            if (!frame || frame.length < .4)
                return null;
            const thickness = Math.max(.03, Number(depth) || .08);
            const mesh = createRuntimeBox([frame.length, height, thickness], new globalState.THREE.MeshBasicMaterial({
                color: toThreeColor(colorValue, 0xffffff)
            }));
            mesh.position.set(frame.midX + frame.normalX * thickness / 2, baseY + height / 2, frame.midZ + frame.normalZ * thickness / 2);
            mesh.rotation.y = frame.rotationY;
            return mesh;
        }

        // Window pieces are tiny but numerous; route them through the shared box
        // cache so chunk streaming does not allocate fresh geometries for each pane.
        function addWindowBoxPart(group, size, basePointX, basePointZ, centerY, frame, alongOffset, yOffset, material, normalOffset) {
            const mesh = createRuntimeBox(size, material, [
                basePointX + frame.alongX * alongOffset + frame.normalX * normalOffset,
                centerY + yOffset,
                basePointZ + frame.alongZ * alongOffset + frame.normalZ * normalOffset
            ]);
            mesh.rotation.y = frame.rotationY;
            group.add(mesh);
        }

        function createWindowsForFootprint(group, points, baseY, bodyHeight, spec) {
            if (!globalState.THREE || !group || !points.length || !spec || !1 === spec.enabled)
                return;
            const center = {
                x: 0,
                z: 0
            };
            for (const point of points) {
                center.x += point.x;
                center.z += point.z;
            }
            center.x /= points.length;
            center.z /= points.length;
            for (let index = 0; index < points.length; index++) {
                const current = points[index];
                const next = points[(index + 1) % points.length];
                const sideSpec = getSideSpecForIndex(spec, index);
                if (!1 === sideSpec.enabled)
                    continue;
                const frame = getWallEdgeFrame(current, next, center);
                const edgeLength = frame && frame.length || 0;
                if (edgeLength < .4)
                    continue;
                const dx = frame.alongX;
                const dz = frame.alongZ;
                const midX = frame.midX;
                const midZ = frame.midZ;
                const layout = computeWindowLayout(edgeLength, bodyHeight, sideSpec);
                if (sideSpec.color) {
                    const panel = createWallPanel(current, next, center, baseY + .1, Math.max(.3, bodyHeight - .2), sideSpec.color, Number(sideSpec.claddingDepth) || .05);
                    panel && group.add(panel);
                }
                const frameColor = null != sideSpec.frameColor ? sideSpec.frameColor : VISUAL_CONFIG.windowFrameColor;
                const glassColor = null != sideSpec.glassColor ? sideSpec.glassColor : VISUAL_CONFIG.windowGlassColor;
                const frameMaterial = createDetailStandardMaterial({
                    materialKind: "metal"
                }, {
                    color: frameColor,
                    materialKind: "metal",
                    transparent: !1,
                    opacity: 1
                });
                const glassMaterial = createDetailStandardMaterial({
                    materialKind: "glass"
                }, {
                    color: glassColor,
                    materialKind: "glass",
                    transparent: !0,
                    opacity: null != sideSpec.opacity ? clamp(Number(sideSpec.opacity) || .55, .08, .95) : .55,
                    roughness: .08,
                    metalness: .05
                });
                const wallDepth = Math.max(.42, Number(spec && spec.base && (spec.base.wallDepth || spec.base.depth)) || .42);
                const frameDepth = Math.max(wallDepth + .08, Number(sideSpec.frameDepth) || 0);
                const frameNormalOffset = wallDepth / 2;
                const glassNormalOffset = wallDepth / 2;
                const doorOpenings = getWallOpenings(spec, "doors", index);
                const windowOpenings = getWallOpenings(spec, "windows", index);
                for (const rect of layout.rects) {
                    if (!isWindowRectClearOfTerrain(rect, frame, baseY, spec))
                        continue;
                    if (!isRectClearOfWallOpenings(rect, doorOpenings, .72))
                        continue;
                    if (!isRectClearOfWallOpenings(rect, windowOpenings, .28))
                        continue;
                    const width = rect.width;
                    const height = rect.height;
                    const frameThickness = null != sideSpec.frameThickness ? Math.max(.04, Number(sideSpec.frameThickness) || .04) : Math.max(.04, Math.min(width, height) * .09);
                    if (width <= frameThickness * 2 + .08 || height <= frameThickness * 2 + .08)
                        continue;
                    const along = rect.centerU - edgeLength / 2;
                    const basePointX = midX + dx * along;
                    const basePointZ = midZ + dz * along;
                    const centerY = baseY + rect.centerY;
                    addWindowBoxPart(group, [width, frameThickness, frameDepth], basePointX, basePointZ, centerY, frame, 0, height / 2 - frameThickness / 2, frameMaterial, frameNormalOffset);
                    addWindowBoxPart(group, [width, frameThickness, frameDepth], basePointX, basePointZ, centerY, frame, 0, -height / 2 + frameThickness / 2, frameMaterial, frameNormalOffset);
                    addWindowBoxPart(group, [frameThickness, Math.max(.08, height - 2 * frameThickness), frameDepth], basePointX, basePointZ, centerY, frame, -width / 2 + frameThickness / 2, 0, frameMaterial, frameNormalOffset);
                    addWindowBoxPart(group, [frameThickness, Math.max(.08, height - 2 * frameThickness), frameDepth], basePointX, basePointZ, centerY, frame, width / 2 - frameThickness / 2, 0, frameMaterial, frameNormalOffset);
                    addWindowBoxPart(group, [Math.max(.1, width - 2 * frameThickness), Math.max(.1, height - 2 * frameThickness), Math.max(.03, Math.min(frameDepth * .45, wallDepth * .4))], basePointX, basePointZ, centerY, frame, 0, 0, glassMaterial, glassNormalOffset);
                }
            }
        }

        function getDetailSize(detail, fallback=[1, 1, 1]) {
            const raw = Array.isArray(detail && detail.size) ? detail.size : [detail && detail.a, detail && detail.b, detail && detail.c];
            return [
                Math.max(.05, Number(raw[0]) || fallback[0]),
                Math.max(.05, Number(raw[1]) || fallback[1]),
                Math.max(.05, Number(raw[2]) || fallback[2])
            ];
        }

        function getDetailMaterialPreset(kind) {
            const presets = {
                plaster: {
                    roughness: .94,
                    metalness: .02
                },
                brick: {
                    roughness: .9,
                    metalness: .03
                },
                concrete: {
                    roughness: .98,
                    metalness: .04
                },
                naturalStone: {
                    roughness: .97,
                    metalness: .03
                },
                wood: {
                    roughness: .83,
                    metalness: .08
                },
                glass: {
                    roughness: .08,
                    metalness: .05
                },
                metal: {
                    roughness: .45,
                    metalness: .75
                },
                roofTiles: {
                    roughness: .92,
                    metalness: .02
                },
                ribbedMetal: {
                    roughness: .5,
                    metalness: .72
                },
                shingles: {
                    roughness: .93,
                    metalness: .02
                },
                tile: {
                    roughness: .72,
                    metalness: .08
                },
                smallTile: {
                    roughness: .72,
                    metalness: .08
                },
                checkerTile: {
                    roughness: .7,
                    metalness: .08
                },
                laminate: {
                    roughness: .68,
                    metalness: .06
                },
                castFloor: {
                    roughness: .52,
                    metalness: .16
                }
            };
            return presets[kind] || presets.plaster;
        }

        function createDetailStandardMaterial(detail, overrides={}) {
            const THREE = globalState.THREE;
            const preset = getDetailMaterialPreset(overrides.materialKind || detail && detail.materialKind);
            const transparent = null != overrides.transparent ? overrides.transparent : !!(detail && detail.transparent) || null != (detail && detail.opacity) && Number(detail.opacity) < 1 || detail && "glass" === detail.materialKind && "window" !== String(detail.type || "").toLowerCase();
            const opacity = null != overrides.opacity ? overrides.opacity : null != (detail && detail.opacity) ? clamp(Number(detail.opacity) || 0, .05, 1) : 1;
            const color = toThreeColor(null != overrides.color ? overrides.color : null != (detail && detail.color) ? detail.color : 12632256, 12632256);
            const materialKey = [
                "detail",
                overrides.materialKind || detail && detail.materialKind || "default",
                color,
                Math.round(1e3 * opacity) / 1e3,
                transparent ? 1 : 0,
                null != overrides.roughness ? overrides.roughness : preset.roughness,
                null != overrides.metalness ? overrides.metalness : preset.metalness,
                THREE.MeshBasicMaterial ? "basic" : THREE.MeshStandardMaterial ? "standard" : "lambert"
            ].join("|");
            const useMaterialCache = isDeveloperToggleEnabled("perfMaterialCaches");
            if (useMaterialCache) {
                const cached = runtimeState.customBuildingMaterialCache.get(materialKey);
                if (cached)
                    return cached;
            }
            const materialOptions = {
                color,
                roughness: null != overrides.roughness ? overrides.roughness : preset.roughness,
                metalness: null != overrides.metalness ? overrides.metalness : preset.metalness,
                transparent,
                opacity,
                depthWrite: !(transparent || opacity < 1),
                side: THREE.DoubleSide
            };
            const material = THREE.MeshBasicMaterial ? new THREE.MeshBasicMaterial({
                    color: materialOptions.color,
                    transparent: materialOptions.transparent,
                    opacity: materialOptions.opacity,
                    depthWrite: materialOptions.depthWrite,
                    side: materialOptions.side
                }) : THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial(materialOptions) : new THREE.MeshLambertMaterial(materialOptions);
            useMaterialCache && markSharedResource(material, "custom-building-material");
            return useMaterialCache ? rememberLimitedCache(runtimeState.customBuildingMaterialCache, materialKey, material, CUSTOM_BUILDING_PERF.materialCacheSize) : material;
        }

        function createDetailMaterial(detail) {
            return createDetailStandardMaterial(detail);
        }

        function getSharedBoxGeometry(size) {
            const safeSize = [
                Math.max(.001, Number(size && size[0]) || .001),
                Math.max(.001, Number(size && size[1]) || .001),
                Math.max(.001, Number(size && size[2]) || .001)
            ];
            if (!isDeveloperToggleEnabled("perfSharedGeometryCaches"))
                return new globalState.THREE.BoxGeometry(safeSize[0], safeSize[1], safeSize[2]);
            const key = makeRoundedNumberKey(safeSize);
            const cached = runtimeState.customBuildingBoxGeometryCache.get(key);
            if (cached)
                return cached;
            const geometry = new globalState.THREE.BoxGeometry(safeSize[0], safeSize[1], safeSize[2]);
            markSharedResource(geometry, "custom-building-box-geometry");
            return rememberLimitedCache(runtimeState.customBuildingBoxGeometryCache, key, geometry, CUSTOM_BUILDING_PERF.geometryCacheSize);
        }

        function createRuntimeBox(size, material, position=[0, 0, 0]) {
            const mesh = new globalState.THREE.Mesh(getSharedBoxGeometry(size),material);
            mesh.position.set(position[0], position[1], position[2]);
            mesh.castShadow = !0;
            mesh.receiveShadow = !0;
            return mesh;
        }

        function shadeDetailColor(colorValue, amount) {
            if (!globalState.THREE)
                return colorValue || 0xffffff;
            const color = toThreeColor(colorValue, 0xffffff);
            const target = new globalState.THREE.Color(amount >= 0 ? 0xffffff : 0x000000);
            color.lerp(target, Math.abs(Number(amount) || 0));
            return color.getHex();
        }

        function getDetailPattern(detail) {
            const pattern = detail && detail.pattern && "object" == typeof detail.pattern ? detail.pattern : null;
            const type = String(pattern && pattern.type || detail && detail.patternType || "none");
            if (!type || "none" === type)
                return null;
            return {
                type,
                scale: Math.max(.2, Number(pattern && pattern.scale || detail && detail.patternScale) || 1),
                depth: Math.max(.008, Number(pattern && pattern.depth || detail && detail.patternDepth) || .03)
            };
        }

        function addDetailBoxPattern(group, detail, size, mode="wall") {
            const pattern = getDetailPattern(detail);
            if (!globalState.THREE || !group || !pattern)
                return;
            const width = Math.max(.1, Number(size[0]) || 1);
            const height = Math.max(.1, Number(size[1]) || 1);
            const depth = Math.max(.04, Number(size[2]) || .2);
            const patternType = pattern.type;
            const scale = pattern.scale;
            const bump = pattern.depth;
            const baseColor = null != detail.color ? detail.color : 0xffffff;
            const color = shadeDetailColor(baseColor, .12);
            const patternMaterial = createDetailStandardMaterial(detail, {
                color,
                materialKind: detail.materialKind || "plaster",
                transparent: !1,
                opacity: 1,
                roughness: .88,
                metalness: .08
            });

            const addFrontBackBox = (sx, sy, px, py, pz, material=patternMaterial, boxColor=color) => {
                group.add(createRuntimeBox([sx, sy, bump], material, [px, py, pz]));
            };
            const addTopBox = (sx, sz, px, py, pz, material=patternMaterial, boxColor=color) => {
                group.add(createRuntimeBox([sx, bump, sz], material, [px, py, pz]));
            };

            if ("floor" === mode || "tile" === patternType || "smallTile" === patternType || "checkerTile" === patternType || "laminate" === patternType || "castFloor" === patternType) {
                if ("castFloor" === patternType) {
                    const bands = Math.max(4, Math.round(width / (.9 * scale)));
                    for (let band = 0; band < bands; band++) {
                        const localX = -width / 2 + width * (band + .5) / bands;
                        addTopBox(width / bands * .18, depth * .96, localX, height / 2 + bump / 2, 0);
                    }
                    return;
                }
                if ("laminate" === patternType) {
                    const plankWidth = Math.max(.18, .28 * scale);
                    const planks = Math.max(4, Math.round(width / plankWidth));
                    for (let plank = 0; plank < planks; plank++) {
                        const localX = -width / 2 + width * (plank + .5) / planks;
                        const shade = plank % 2 ? shadeDetailColor(baseColor, .08) : color;
                        const plankMaterial = createDetailStandardMaterial(detail, {
                            color: shade,
                            materialKind: detail.materialKind || "laminate",
                            transparent: !1,
                            opacity: 1,
                            roughness: .7,
                            metalness: .05
                        });
                        addTopBox(width / planks * .86, depth * .96, localX, height / 2 + bump / 2, 0, plankMaterial, shade);
                    }
                    return;
                }
                const tileBase = "smallTile" === patternType ? .34 : .72;
                const tileSize = Math.max(.14, tileBase * scale);
                const cols = Math.max(2, Math.round(width / tileSize));
                const rows = Math.max(2, Math.round(depth / tileSize));
                const tileWidth = width / cols;
                const tileDepth = depth / rows;
                for (let row = 0; row < rows; row++)
                    for (let col = 0; col < cols; col++) {
                        const localX = -width / 2 + tileWidth / 2 + col * tileWidth;
                        const localZ = -depth / 2 + tileDepth / 2 + row * tileDepth;
                        const shade = "checkerTile" === patternType && (row + col) % 2 ? shadeDetailColor(baseColor, -.28) : color;
                        const tileMaterial = shade === color ? patternMaterial : createDetailStandardMaterial(detail, {
                            color: shade,
                            materialKind: detail.materialKind || "tile",
                            transparent: !1,
                            opacity: 1,
                            roughness: .72,
                            metalness: .08
                        });
                        addTopBox(tileWidth * .88, tileDepth * .88, localX, height / 2 + bump / 2, localZ, tileMaterial, shade);
                    }
                return;
            }

            if ("roof" === mode || "roofTiles" === patternType || "shingles" === patternType || "ribbedMetal" === patternType) {
                const rows = Math.max(3, Math.round(depth / (.42 * scale)));
                const cols = Math.max(2, Math.round(width / (.8 * scale)));
                const tileWidth = width / cols;
                const tileDepth = depth / rows;
                for (let row = 0; row < rows; row++) {
                    const localZ = -depth / 2 + tileDepth / 2 + row * tileDepth;
                    if ("ribbedMetal" === patternType) {
                        for (let rib = 0; rib < cols; rib++) {
                            const localX = -width / 2 + tileWidth / 2 + rib * tileWidth;
                            addTopBox(tileWidth * .16, tileDepth * .96, localX, height / 2 + bump / 2, localZ);
                        }
                        continue;
                    }
                    for (let col = 0; col < cols; col++) {
                        const shift = row % 2 ? tileWidth * .18 : 0;
                        const localX = clamp(-width / 2 + tileWidth / 2 + col * tileWidth + shift, -width / 2 + tileWidth / 2, width / 2 - tileWidth / 2);
                        addTopBox(tileWidth * .88, tileDepth * ("shingles" === patternType ? .56 : .72), localX, height / 2 + bump / 2, localZ);
                    }
                }
                return;
            }

            const rows = Math.max(2, Math.round(height / (.45 * scale)));
            const cols = Math.max(2, Math.round(width / (.8 * scale)));
            const cellWidth = width / cols;
            const cellHeight = height / rows;
            for (const face of [-1, 1]) {
                if ("wood" === patternType) {
                    const boardWidth = width / Math.max(3, Math.round(width / (.28 * scale)));
                    const boards = Math.max(3, Math.round(width / boardWidth));
                    for (let board = 0; board < boards; board++) {
                        const localX = -width / 2 + boardWidth / 2 + board * boardWidth;
                        addFrontBackBox(boardWidth * .82, height * .96, localX, 0, face * (depth / 2 + bump / 2));
                    }
                    continue;
                }
                for (let row = 0; row < rows; row++)
                    for (let col = 0; col < cols; col++) {
                        const offset = "brick" === patternType && row % 2 ? cellWidth / 2 : 0;
                        const localX = clamp(-width / 2 + cellWidth / 2 + col * cellWidth + offset, -width / 2 + cellWidth / 2, width / 2 - cellWidth / 2);
                        const localY = -height / 2 + cellHeight / 2 + row * cellHeight;
                        const sx = "naturalStone" === patternType ? cellWidth * (.55 + col % 3 * .12) : cellWidth * .88;
                        const sy = "naturalStone" === patternType ? cellHeight * (.62 + row % 2 * .14) : cellHeight * .72;
                        addFrontBackBox(sx, sy, localX, localY, face * (depth / 2 + bump / 2));
                    }
            }
        }

        function createDetailPatternBoxGroup(detail, size, mode="wall") {
            const group = new globalState.THREE.Group;
            group.add(createRuntimeBox(size, createDetailMaterial(detail), [0, 0, 0]));
            addDetailBoxPattern(group, detail, size, mode);
            return group;
        }

        function pushFace(indices, a, b, c, d) {
            indices.push(a, b, c);
            null != d && indices.push(b, d, c);
        }

        function createCylinderWallGeometry(detail) {
            const THREE = globalState.THREE;
            const height = Math.max(.1, Number(detail.height) || Number(detail.b) || 3);
            const radius = Math.max(.1, Number(detail.radius) || Number(detail.a) || 2);
            const radiusX = Math.max(.1, Number(detail.radiusX) || radius);
            const radiusZ = Math.max(.1, Number(detail.radiusZ) || Number(detail.c) || radius);
            const thickness = Math.min(Math.max(.02, Number(detail.thickness) || .16), Math.min(radiusX, radiusZ) - .01);
            const segments = Math.max(3, Math.round(Number(detail.segments) || 24));
            const thetaStart = (Number(detail.thetaStart) || Number(detail.startAngle) || 0) * Math.PI / 180;
            const thetaLength = clamp(Math.abs(Number(detail.thetaLength) || Number(detail.angle) || 90), 1, 360) * Math.PI / 180;
            const fullCircle = thetaLength >= Math.PI * 2 - .001;
            const positions = [];
            const indices = [];
            for (let index = 0; index <= segments; index++) {
                const t = index / segments;
                const angle = thetaStart + thetaLength * t;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const outerX = cos * radiusX;
                const outerZ = sin * radiusZ;
                const innerX = cos * Math.max(.02, radiusX - thickness);
                const innerZ = sin * Math.max(.02, radiusZ - thickness);
                positions.push(outerX, -height / 2, outerZ, outerX, height / 2, outerZ, innerX, -height / 2, innerZ, innerX, height / 2, innerZ);
            }
            for (let index = 0; index < segments; index++) {
                const base = 4 * index;
                const next = 4 * (index + 1);
                pushFace(indices, base, next, base + 1, next + 1);
                pushFace(indices, next + 2, base + 2, next + 3, base + 3);
                pushFace(indices, base + 1, next + 1, base + 3, next + 3);
                pushFace(indices, next, base, next + 2, base + 2);
            }
            if (!fullCircle) {
                const first = 0;
                const last = 4 * segments;
                pushFace(indices, first, first + 1, first + 2, first + 3);
                pushFace(indices, last + 2, last + 3, last, last + 1);
            }
            const geometry = new THREE.BufferGeometry;
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions,3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            return geometry;
        }

        function createFillCylinderGeometry(detail) {
            const THREE = globalState.THREE;
            const size = getDetailSize(detail, [1, 3, 1]);
            const radiusX = Math.max(.05, Number(detail.radiusX) || Number(detail.radius) || size[0]);
            const radiusZ = Math.max(.05, Number(detail.radiusZ) || Number(detail.radius) || size[2] || radiusX);
            const height = Math.max(.05, Number(detail.height) || size[1]);
            const radius = Math.max(radiusX, radiusZ);
            const geometry = new THREE.CylinderGeometry(radius, radius, height, Math.max(3, Math.round(Number(detail.segments) || 24)));
            geometry.scale(radiusX / radius, 1, radiusZ / radius);
            return geometry;
        }

        function createTriangleWallGeometry(detail) {
            const THREE = globalState.THREE;
            const size = getDetailSize(detail, [2, 2, .15]);
            const width = Math.max(.05, size[0]);
            const height = Math.max(.05, size[1]);
            const depth = Math.max(.02, size[2]);
            const leftHigh = String(detail.slopeDirection || "left").toLowerCase() !== "right";
            const topX = leftHigh ? -width / 2 : width / 2;
            const flatX = leftHigh ? width / 2 : -width / 2;
            const front = [[topX, height / 2, depth / 2], [flatX, -height / 2, depth / 2], [topX, -height / 2, depth / 2]];
            const back = front.map((point => [point[0], point[1], -depth / 2]));
            const geometry = new THREE.BufferGeometry;
            geometry.setAttribute("position", new THREE.Float32BufferAttribute([...front, ...back].flat(),3));
            geometry.setIndex([0, 1, 2, 5, 4, 3, 0, 3, 1, 1, 3, 4, 0, 2, 3, 2, 5, 3, 2, 1, 5, 1, 4, 5]);
            geometry.computeVertexNormals();
            return geometry;
        }

        function createWedgeFillGeometry(detail) {
            const THREE = globalState.THREE;
            const size = getDetailSize(detail, [2, 1, .5]);
            const width = Math.max(.05, size[0]);
            const height = Math.max(.05, size[1]);
            const depth = Math.max(.05, size[2]);
            const leftHigh = String(detail.slopeDirection || "left").toLowerCase() !== "right";
            const highX = leftHigh ? -width / 2 : width / 2;
            const lowX = leftHigh ? width / 2 : -width / 2;
            const vertices = [
                [highX, height / 2, -depth / 2],
                [lowX, -height / 2, -depth / 2],
                [highX, -height / 2, -depth / 2],
                [highX, height / 2, depth / 2],
                [lowX, -height / 2, depth / 2],
                [highX, -height / 2, depth / 2]
            ];
            const geometry = new THREE.BufferGeometry;
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(),3));
            geometry.setIndex([0, 1, 2, 5, 4, 3, 0, 3, 1, 1, 3, 4, 0, 2, 3, 2, 5, 3, 2, 1, 5, 1, 4, 5]);
            geometry.computeVertexNormals();
            return geometry;
        }

        function createModelerRidgeGeometry(width, height, depth, ridgeDirection="x", ridgeLength=null) {
            const THREE = globalState.THREE;
            const maxLength = "z" === ridgeDirection ? depth : width;
            const actualRidgeLength = Math.max(.1, Math.min(maxLength, null == ridgeLength ? maxLength : Number(ridgeLength) || maxLength));
            const y0 = -height / 2;
            const y1 = height / 2;
            const vertices = "x" === ridgeDirection ? [
                [-width / 2, y0, -depth / 2],
                [width / 2, y0, -depth / 2],
                [width / 2, y0, depth / 2],
                [-width / 2, y0, depth / 2],
                [-actualRidgeLength / 2, y1, 0],
                [actualRidgeLength / 2, y1, 0]
            ] : [
                [-width / 2, y0, -depth / 2],
                [width / 2, y0, -depth / 2],
                [width / 2, y0, depth / 2],
                [-width / 2, y0, depth / 2],
                [0, y1, -actualRidgeLength / 2],
                [0, y1, actualRidgeLength / 2]
            ];
            const indices = "x" === ridgeDirection ? [0, 1, 4, 1, 5, 4, 3, 4, 2, 2, 4, 5, 0, 4, 3, 1, 2, 5] : [0, 4, 1, 1, 4, 5, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2];
            const geometry = new THREE.BufferGeometry;
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(),3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            return geometry;
        }

        function createFrustumRoofGeometry(width, height, depth, topScale) {
            const THREE = globalState.THREE;
            const topWidth = Math.max(.2, width * Math.max(.05, Number(topScale) || .3));
            const topDepth = Math.max(.2, depth * Math.max(.05, Number(topScale) || .3));
            const bottom = [[-width / 2, -height / 2, -depth / 2], [width / 2, -height / 2, -depth / 2], [width / 2, -height / 2, depth / 2], [-width / 2, -height / 2, depth / 2]];
            const top = [[-topWidth / 2, height / 2, -topDepth / 2], [topWidth / 2, height / 2, -topDepth / 2], [topWidth / 2, height / 2, topDepth / 2], [-topWidth / 2, height / 2, topDepth / 2]];
            const geometry = new THREE.BufferGeometry;
            geometry.setAttribute("position", new THREE.Float32BufferAttribute([...bottom, ...top].flat(),3));
            geometry.setIndex([0, 1, 4, 1, 5, 4, 1, 2, 5, 2, 6, 5, 2, 3, 6, 3, 7, 6, 3, 0, 7, 0, 4, 7, 4, 5, 6, 4, 6, 7]);
            geometry.computeVertexNormals();
            return geometry;
        }

        function createShedRoofGeometry(detail) {
            const THREE = globalState.THREE;
            const size = getDetailSize(detail, [4, 2, 4]);
            const width = Math.max(.05, size[0]);
            const height = Math.max(.05, size[1]);
            const depth = Math.max(.05, size[2]);
            const leftHigh = String(detail.slopeDirection || "left").toLowerCase() !== "right";
            const topLeft = leftHigh ? height / 2 : -height / 2;
            const topRight = leftHigh ? -height / 2 : height / 2;
            const vertices = [
                [-width / 2, topLeft, -depth / 2],
                [width / 2, topRight, -depth / 2],
                [width / 2, -height / 2, -depth / 2],
                [-width / 2, -height / 2, -depth / 2],
                [-width / 2, topLeft, depth / 2],
                [width / 2, topRight, depth / 2],
                [width / 2, -height / 2, depth / 2],
                [-width / 2, -height / 2, depth / 2]
            ];
            const geometry = new THREE.BufferGeometry;
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(),3));
            geometry.setIndex([0, 1, 3, 1, 2, 3, 4, 7, 5, 5, 7, 6, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 6, 2, 6, 3, 3, 6, 7, 0, 3, 4, 3, 7, 4]);
            geometry.computeVertexNormals();
            return geometry;
        }

        function createRoundRoofGeometry(detail) {
            const THREE = globalState.THREE;
            const size = getDetailSize(detail, [4, 2, 4]);
            const width = Math.max(.1, size[0]);
            const height = Math.max(.1, size[1]);
            const depth = Math.max(.1, size[2]);
            const geometry = new THREE.CylinderGeometry(1, 1, width, 20, 1, !1, 0, Math.PI);
            geometry.rotateZ(Math.PI / 2);
            geometry.scale(1, height, depth / 2);
            return geometry;
        }

        function createPolygonPoints(width, depth, sides, sideScales) {
            if (4 === sides)
                return [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]].map(((point, index) => {
                    const scale = Math.max(.05, Number(sideScales && sideScales[index]) || 1);
                    return [point[0] * scale, point[1] * scale];
                }));
            const points = [];
            for (let index = 0; index < sides; index++) {
                const angle = -Math.PI / 2 + index / sides * Math.PI * 2;
                const scale = Math.max(.05, Number(sideScales && sideScales[index]) || 1);
                points.push([Math.cos(angle) * width / 2 * scale, Math.sin(angle) * depth / 2 * scale]);
            }
            return points;
        }

        function createRidgeRoofGeometry(detail, width, height, depth, sideScales) {
            const THREE = globalState.THREE;
            const ridgeDirection = "z" === detail.ridgeDirection ? "z" : "x";
            const corners = createPolygonPoints(width, depth, 4, sideScales);
            const ridgeMaxLength = "x" === ridgeDirection ? width : depth;
            const ridgeLength = Math.max(.1, Math.min(ridgeMaxLength, Number(detail.ridgeLength) || ridgeMaxLength));
            const y0 = -height / 2;
            const y1 = height / 2;
            const vertices = "x" === ridgeDirection ? [
                [corners[0][0], y0, corners[0][1]], [corners[1][0], y0, corners[1][1]], [corners[2][0], y0, corners[2][1]], [corners[3][0], y0, corners[3][1]],
                [-ridgeLength / 2, y1, 0], [ridgeLength / 2, y1, 0]
            ] : [
                [corners[0][0], y0, corners[0][1]], [corners[1][0], y0, corners[1][1]], [corners[2][0], y0, corners[2][1]], [corners[3][0], y0, corners[3][1]],
                [0, y1, -ridgeLength / 2], [0, y1, ridgeLength / 2]
            ];
            const indices = "x" === ridgeDirection ? [0, 1, 4, 1, 5, 4, 3, 4, 2, 2, 4, 5, 0, 4, 3, 1, 2, 5] : [0, 4, 1, 1, 4, 5, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2];
            const geometry = new THREE.BufferGeometry;
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(),3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            return geometry;
        }

        function createPyramidGeometry(detail) {
            const THREE = globalState.THREE;
            const size = getDetailSize(detail, [4, 2, 4]);
            const width = size[0];
            const height = size[1];
            const depth = size[2];
            const sides = Math.max(3, Math.round(Number(detail.sides) || 4));
            const sideScales = Array.isArray(detail.sideScales) ? detail.sideScales : [];
            const topMode = String(detail.topMode || detail.mode || "point").toLowerCase();
            if ("ridge" === topMode)
                return createRidgeRoofGeometry(detail, width, height, depth, sideScales);
            const bottom = createPolygonPoints(width, depth, sides, sideScales);
            const positions = [];
            const indices = [];
            for (const point of bottom)
                positions.push(point[0], -height / 2, point[1]);
            if ("flat" === topMode) {
                const topSize = Array.isArray(detail.topSize) ? detail.topSize : null;
                const topScale = Math.max(.02, Number(detail.topScale) || .35);
                const topWidth = Math.max(.02, Number(topSize && topSize[0]) || width * topScale);
                const topDepth = Math.max(.02, Number(topSize && topSize[1]) || depth * topScale);
                const top = createPolygonPoints(topWidth, topDepth, sides, []);
                for (const point of top)
                    positions.push(point[0], height / 2, point[1]);
                for (let index = 0; index < sides; index++) {
                    const next = (index + 1) % sides;
                    pushFace(indices, index, next, sides + index, sides + next);
                }
                for (let index = 1; index < sides - 1; index++)
                    indices.push(sides, sides + index, sides + index + 1);
            } else {
                const apexIndex = positions.length / 3;
                positions.push(0, height / 2, 0);
                for (let index = 0; index < sides; index++)
                    indices.push(index, (index + 1) % sides, apexIndex);
            }
            for (let index = 1; index < sides - 1; index++)
                indices.push(0, index + 1, index);
            const geometry = new THREE.BufferGeometry;
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions,3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            return geometry;
        }

        function getDetailRotationRadians(detail) {
            const raw = Array.isArray(detail && detail.rotation) ? detail.rotation : [0, 0, 0];
            const values = [
                Number(raw[0]) || 0,
                Number(raw[1]) || 0,
                Number(raw[2]) || 0
            ];
            const unit = String(detail && (detail.rotationUnit || detail.rotationUnits || detail.rotationMode || "") || "").toLowerCase();
            const maxAbs = Math.max(Math.abs(values[0]), Math.abs(values[1]), Math.abs(values[2]));
            const explicitlyRadians = unit.includes("rad");
            const explicitlyDegrees = unit.includes("deg") || unit.includes("grad");
            const probablyRadians = !explicitlyDegrees && maxAbs <= Math.PI * 2 + .001 && values.some(value => {
                const abs = Math.abs(value);
                if (abs < .001)
                    return !1;
                const quarterTurns = abs / (Math.PI / 2);
                return Math.abs(quarterTurns - Math.round(quarterTurns)) < .02;
            });
            if (explicitlyRadians || probablyRadians)
                return values;
            return values.map(value => value * Math.PI / 180);
        }

        function positionDetailObject(object, detail, anchorPoint) {
            if (!object || !detail)
                return object;
            const position = detail.position || [0, 0, 0];
            const rotation = getDetailRotationRadians(detail);
            const offsetX = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.x) || 0;
            const offsetY = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.y) || 0;
            const offsetZ = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.z) || 0;
            object.position.set(offsetX + (Number(position[0]) || 0), offsetY + (Number(position[1]) || 0), offsetZ + (Number(position[2]) || 0));
            object.rotation.set(rotation[0], rotation[1], rotation[2]);
            return object;
        }

        function createWindowDetailObject(detail, anchorPoint) {
            const THREE = globalState.THREE;
            const size = getDetailSize(detail, [1.2, 1.4, .16]);
            const width = Math.max(.2, size[0]);
            const height = Math.max(.2, size[1]);
            const placementWallDepth = detail.__tmWallPlacement && Number(detail.__tmWallPlacement.wallDepth);
            const depth = placementWallDepth ? Math.max(.08, size[2], placementWallDepth + .08) : Math.max(.05, size[2]);
            const frameThickness = Math.max(.04, Math.min(width, height) * .09);
            const group = new THREE.Group;
            group.name = "__tmCustomBuildingWindow";
            const frameMaterial = createDetailStandardMaterial(detail, {
                color: null != detail.frameColor ? detail.frameColor : null != detail.color ? detail.color : 0xf1eadf,
                materialKind: "metal",
                transparent: !1,
                opacity: 1
            });
            const glassMaterial = createDetailStandardMaterial(detail, {
                color: null != detail.glassColor ? detail.glassColor : 0x9dd5ff,
                materialKind: "glass",
                transparent: !0,
                opacity: clamp(Number(detail.opacity) || .55, .08, .95),
                roughness: .08,
                metalness: .05
            });
            group.add(createRuntimeBox([width, frameThickness, depth], frameMaterial, [0, height / 2 - frameThickness / 2, 0]));
            group.add(createRuntimeBox([width, frameThickness, depth], frameMaterial, [0, -height / 2 + frameThickness / 2, 0]));
            group.add(createRuntimeBox([frameThickness, Math.max(.05, height - frameThickness * 2), depth], frameMaterial, [-width / 2 + frameThickness / 2, 0, 0]));
            group.add(createRuntimeBox([frameThickness, Math.max(.05, height - frameThickness * 2), depth], frameMaterial, [width / 2 - frameThickness / 2, 0, 0]));
            const glass = createRuntimeBox([Math.max(.1, width - frameThickness * 2), Math.max(.1, height - frameThickness * 2), Math.max(.03, depth * .45)], glassMaterial, [0, 0, 0]);
            glass.renderOrder = 20;
            group.add(glass);
            if (detail.__tmWallPlacement) {
                const placement = detail.__tmWallPlacement;
                group.position.set(placement.position[0], placement.position[1], placement.position[2]);
                group.rotation.set(0, placement.rotationY, 0);
                return group;
            }
            return positionDetailObject(group, detail, anchorPoint);
        }

        function isDoorDetail(detail) {
            if (!detail)
                return !1;
            const type = String(detail.type || "").toLowerCase();
            if (detail.noDoor || detail.noAutoDoor)
                return !1;
            if (detail.door || detail.openable || detail.hinged || type.includes("door") || type.includes("tuer") || type.includes("tur"))
                return !0;
            if (!("box" === type || "wall" === type || "panel" === type))
                return !1;
            if (!(detail.hinge || detail.hingeSide || null != detail.openAngle || null != detail.openRadius || null != detail.openSpeed))
                return !1;
            const size = getDetailSize(detail);
            const position = detail.position || [0, 0, 0];
            const width = Math.max(size[0], size[2]);
            const thickness = Math.min(size[0], size[2]);
            const bottom = (Number(position[1]) || 0) - size[1] / 2;
            return thickness <= .25 && width >= .65 && width <= 4.2 && size[1] >= 1.55 && size[1] <= 4.25 && bottom >= -.18 && bottom <= .48;
        }

        function specHasDoorPart(spec) {
            for (const part of toSafeArray(spec && spec.parts))
                if (isDoorDetail(part))
                    return !0;
            return !1;
        }

        function createDoorDetailObject(detail, anchorPoint) {
            if (!globalState.THREE || !detail)
                return null;
            const THREE = globalState.THREE;
            const explicitDoor = "door" === String(detail.type || "").toLowerCase();
            const size = getDetailSize(detail, [1.05, 2.25, .1]);
            if (explicitDoor) {
                const width = Math.max(.25, size[0]);
                const height = Math.max(.25, size[1]);
                const placementWallDepth = detail.__tmWallPlacement && Number(detail.__tmWallPlacement.wallDepth);
                const depth = placementWallDepth ? Math.max(.08, size[2], placementWallDepth + .08) : Math.max(.04, size[2]);
                const frameThickness = Math.max(.05, Math.min(width, height) * .08);
                const group = new THREE.Group;
                group.name = "__tmCustomBuildingDoorFrame";
                const frameMaterial = createDetailStandardMaterial(detail, {
                    color: null != detail.frameColor ? detail.frameColor : 0xece0cb,
                    materialKind: "wood",
                    transparent: !1,
                    opacity: 1
                });
                const leafMaterial = createDetailStandardMaterial(detail, {
                    materialKind: detail.materialKind || "wood"
                });
                // Door frames stay wall-deep, but the moving leaf must stay thin so it does not block the passage.
                group.add(createRuntimeBox([width, frameThickness, depth], frameMaterial, [0, height / 2 - frameThickness / 2, 0]));
                const sideFrameHeight = Math.max(.05, height - frameThickness);
                const sideFrameCenterY = -frameThickness / 2;
                group.add(createRuntimeBox([frameThickness, sideFrameHeight, depth], frameMaterial, [-width / 2 + frameThickness / 2, sideFrameCenterY, 0]));
                group.add(createRuntimeBox([frameThickness, sideFrameHeight, depth], frameMaterial, [width / 2 - frameThickness / 2, sideFrameCenterY, 0]));
                const hingeLeft = String(detail.hingeSide || detail.hinge || "left").toLowerCase() !== "right";
                const pivot = new THREE.Group;
                pivot.name = "__tmCustomBuildingDoor";
                pivot.position.set(hingeLeft ? -width / 2 + frameThickness / 2 : width / 2 - frameThickness / 2, 0, 0);
                const leafWidth = Math.max(.08, width - frameThickness * 1.5);
                const leafFloorClearance = clamp(Number(detail.leafFloorClearance) || .035, 0, .09);
                const leafHeight = Math.max(.08, height - frameThickness - leafFloorClearance);
                const leafDepth = clamp(Number(detail.leafDepth) || Number(detail.doorDepth) || Math.min(size[2] || .07, .075), .025, Math.min(.12, Math.max(.035, depth * .35)));
                const leaf = createRuntimeBox([leafWidth, leafHeight, leafDepth], leafMaterial, [hingeLeft ? leafWidth / 2 : -leafWidth / 2, -frameThickness / 2 + leafFloorClearance / 2, 0]);
                detail.staticDoor || (leaf.userData.tmDynamicDoor = !0);
                pivot.add(leaf);
                const modelerOpen = detail.isOpen ? clamp(Number(detail.openAngle) || 90, 0, 180) : 0;
                const interactiveOpen = clamp(Number(detail.openAngle) || 90, 0, 180) * Math.PI / 180 * (hingeLeft ? -1 : 1);
                pivot.rotation.y = modelerOpen * Math.PI / 180 * (hingeLeft ? -1 : 1);
                if (!detail.staticDoor) {
                    pivot.userData.tmDoor = {
                        closedY: 0,
                        openY: interactiveOpen,
                        baseOpenY: interactiveOpen,
                        current: detail.isOpen ? 1 : 0,
                        radius: clamp(Number(detail.openRadius) || 2.15, 1.35, 3.2),
                        speed: Math.max(.8, Number(detail.openSpeed) || 4.5)
                    };
                    if (detail.__tmWallPlacement) {
                        pivot.userData.tmDoor.normalX = Number(detail.__tmWallPlacement.normalX) || 0;
                        pivot.userData.tmDoor.normalZ = Number(detail.__tmWallPlacement.normalZ) || 0;
                    }
                    pivot.userData.tmDynamicDoor = !0;
                }
                group.add(pivot);
                if (detail.__tmWallPlacement) {
                    const placement = detail.__tmWallPlacement;
                    group.position.set(placement.position[0], placement.position[1], placement.position[2]);
                    group.rotation.set(0, placement.rotationY, 0);
                    return group;
                }
                return positionDetailObject(group, detail, anchorPoint);
            }
            const position = detail.position || [0, 0, 0];
            const offsetX = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.x) || 0;
            const offsetY = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.y) || 0;
            const offsetZ = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.z) || 0;
            const center = new THREE.Vector3(offsetX + (Number(position[0]) || 0), offsetY + (Number(position[1]) || 0), offsetZ + (Number(position[2]) || 0));
            const [rx, ry, rz] = getDetailRotationRadians(detail);
            const hingeRight = "right" === String(detail.hinge || detail.hingeSide || "").toLowerCase();
            const openOut = !1 !== detail.openOut;
            const sideSign = hingeRight ? -1 : 1;
            const localPivotOffset = new THREE.Vector3(-sideSign * size[0] / 2,0,0).applyEuler(new THREE.Euler(rx,ry,rz));
            const pivot = center.clone().add(localPivotOffset);
            const group = new THREE.Group;
            group.name = "__tmCustomBuildingDoor";
            group.position.copy(pivot);
            group.rotation.set(rx, ry, rz);
            const leafDepth = clamp(Number(detail.leafDepth) || Number(detail.doorDepth) || Math.min(size[2] || .07, .075), .025, Math.min(.12, Math.max(.035, size[2] * .5)));
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], leafDepth), createDetailMaterial(Object.assign({
                color: 0x3a2a1f
            }, detail)));
            mesh.position.set(sideSign * size[0] / 2, 0, 0);
            mesh.userData.tmDynamicDoor = !0;
            group.add(mesh);
            const openAngle = (Number(detail.openAngle) || 82) * Math.PI / 180 * (openOut ? 1 : -1) * sideSign;
            group.userData.tmDoor = {
                closedY: ry,
                openY: ry + openAngle,
                baseOpenY: openAngle,
                current: 0,
                radius: clamp(Number(detail.openRadius) || 2.15, 1.35, 3.2),
                speed: Math.max(.8, Number(detail.openSpeed) || 4.5)
            };
            group.userData.tmDynamicDoor = !0;
            return group;
        }

        function createFallbackDoorForFootprint(points, baseY, bodyHeight, spec, anchorPoint) {
            const detail = spec && spec.__tmFallbackDoorDetail || createFallbackDoorDetailForFootprint(points, baseY, bodyHeight, spec, anchorPoint);
            return createDoorDetailObject(detail, anchorPoint);
        }

        function createFurnitureDetailObject(detail, anchorPoint) {
            if (!globalState.THREE || !detail)
                return null;
            const THREE = globalState.THREE;
            const type = String(detail.type || "").toLowerCase();
            const size = getDetailSize(detail, [1, 1, 1]);
            const width = Math.max(.2, size[0]);
            const height = Math.max(.2, size[1]);
            const depth = Math.max(.2, size[2]);
            const group = new THREE.Group;
            group.name = `__tmCustomBuildingFurniture:${type}`;
            const material = createDetailMaterial(detail);
            const metalMaterial = createDetailStandardMaterial(Object.assign({}, detail, {
                materialKind: "metal",
                opacity: 1
            }), {
                color: shadeDetailColor(null != detail.color ? detail.color : 0x8b634a, -.18),
                materialKind: "metal",
                transparent: !1,
                opacity: 1
            });
            const addLegs = (topY, legHeight, inset=.08, legWidth=.08) => {
                const x = width / 2 - inset - legWidth / 2;
                const z = depth / 2 - inset - legWidth / 2;
                for (const sx of [-1, 1])
                    for (const sz of [-1, 1])
                        group.add(createRuntimeBox([legWidth, legHeight, legWidth], metalMaterial, [sx * x, topY - legHeight / 2, sz * z]));
            };

            if ("chair" === type) {
                group.add(createRuntimeBox([width, height * .18, depth], material, [0, -.1, 0]));
                group.add(createRuntimeBox([width, height * .5, depth * .18], material, [0, height * .25, -depth / 2 + depth * .09]));
                addLegs(-.1, height * .55, .08, Math.max(.05, width * .08));
            } else if ("table" === type) {
                group.add(createRuntimeBox([width, height * .14, depth], material, [0, height * .42, 0]));
                addLegs(height * .35, height * .82, .1, Math.max(.05, width * .06));
            } else if ("sofa" === type) {
                group.add(createRuntimeBox([width, height * .28, depth * .75], material, [0, -.08, depth * .06]));
                group.add(createRuntimeBox([width, height * .46, depth * .2], material, [0, height * .2, -depth / 2 + depth * .1]));
                group.add(createRuntimeBox([width * .13, height * .34, depth * .72], material, [-width / 2 + width * .065, .02, depth * .03]));
                group.add(createRuntimeBox([width * .13, height * .34, depth * .72], material, [width / 2 - width * .065, .02, depth * .03]));
            } else if ("bed" === type) {
                group.add(createRuntimeBox([width, height * .28, depth], material, [0, -.1, 0]));
                group.add(createRuntimeBox([width * .94, height * .2, depth * .92], createDetailStandardMaterial(Object.assign({}, detail, {
                    color: 0xddd5c8,
                    materialKind: "plaster"
                }), {
                    color: 0xddd5c8
                }), [0, height * .08, 0]));
                group.add(createRuntimeBox([width, height * .52, depth * .08], material, [0, height * .2, -depth / 2 + depth * .04]));
            } else if ("cabinet" === type) {
                group.add(createRuntimeBox([width, height, depth], material, [0, 0, 0]));
                group.add(createRuntimeBox([width * .02, height * .8, depth * .12], metalMaterial, [0, 0, depth / 2 + depth * .02]));
            } else if ("counter" === type) {
                group.add(createRuntimeBox([width, height * .86, depth], material, [0, -height * .05, 0]));
                group.add(createRuntimeBox([width * 1.02, height * .12, depth * 1.04], createDetailStandardMaterial(Object.assign({}, detail, {
                    color: 0xebe6de,
                    materialKind: "concrete"
                }), {
                    color: 0xebe6de
                }), [0, height * .42, 0]));
            } else if ("shelf" === type) {
                group.add(createRuntimeBox([width * .08, height, depth], material, [-width / 2 + width * .04, 0, 0]));
                group.add(createRuntimeBox([width * .08, height, depth], material, [width / 2 - width * .04, 0, 0]));
                for (let index = 0; index < 4; index++) {
                    const y = -height / 2 + height * .12 + index * (height * .26);
                    group.add(createRuntimeBox([width, height * .05, depth], material, [0, y, 0]));
                }
            } else if ("stove" === type) {
                group.add(createRuntimeBox([width, height, depth], material, [0, 0, 0]));
                group.add(createRuntimeBox([width * .92, height * .06, depth * .92], metalMaterial, [0, height / 2 + height * .03, 0]));
                group.add(createRuntimeBox([width * .56, height * .36, depth * .04], metalMaterial, [0, -.05, depth / 2 + depth * .03]));
            } else if ("chimney" === type) {
                group.add(createRuntimeBox([width, height, depth], material, [0, 0, 0]));
                group.add(createRuntimeBox([width * 1.25, height * .06, depth * 1.25], material, [0, height / 2 + height * .03, 0]));
            } else {
                group.add(createRuntimeBox([width, height, depth], material, [0, 0, 0]));
            }
            return positionDetailObject(group, detail, anchorPoint);
        }

        function getWallDetailFrameForPart(detail, anchorPoint, spec) {
            const points = spec && spec.__tmWallPoints;
            if (!Array.isArray(points) || points.length < 3 || !anchorPoint || detail && detail.absolute)
                return null;
            const position = detail.position || [0, 0, 0];
            const desired = {
                x: (Number(anchorPoint.x) || 0) + (Number(position[0]) || 0),
                z: (Number(anchorPoint.z) || 0) + (Number(position[2]) || 0)
            };
            return findWallFrameForDetail(points, desired, detail, spec);
        }

        function createWallDetailWithOpenings(detail, anchorPoint, spec, size) {
            const frame = getWallDetailFrameForPart(detail, anchorPoint, spec);
            if (!frame)
                return null;
            const baseY = Number(spec && spec.__tmBaseY) || Number(anchorPoint && anchorPoint.y) || 0;
            const position = detail.position || [0, 0, 0];
            const wallCenterY = (detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.y) || 0) + (Number(position[1]) || 0);
            const wallWidth = Math.max(.08, Number(size && size[0]) || 1);
            const wallHeight = Math.max(.08, Number(size && size[1]) || 1);
            const wallDepth = Math.max(.42, Number(size && size[2]) || Number(spec && spec.base && (spec.base.wallDepth || spec.base.depth)) || .42);
            const desired = {
                x: (Number(anchorPoint.x) || 0) + (Number(position[0]) || 0),
                z: (Number(anchorPoint.z) || 0) + (Number(position[2]) || 0)
            };
            const centerU = projectPointToWallFrame(desired, frame) * frame.length;
            const cutouts = [];
            const addOpeningCutout = opening => {
                const rect = opening && (opening.rect || opening);
                if (!rect)
                    return;
                const x1 = Math.max(-wallWidth / 2, (Number(rect.x1) || 0) - centerU);
                const x2 = Math.min(wallWidth / 2, (Number(rect.x2) || 0) - centerU);
                const y1 = Math.max(-wallHeight / 2, baseY + (Number(rect.y1) || 0) - wallCenterY);
                const y2 = Math.min(wallHeight / 2, baseY + (Number(rect.y2) || 0) - wallCenterY);
                if (x2 - x1 > .06 && y2 - y1 > .06)
                    cutouts.push({
                        x1,
                        x2,
                        y1,
                        y2
                    });
            };
            for (const opening of getWallOpenings(spec, "doors", frame.index))
                addOpeningCutout(opening);
            for (const opening of getWallOpenings(spec, "windows", frame.index))
                addOpeningCutout(opening);
            if (!cutouts.length)
                return null;
            const group = new globalState.THREE.Group;
            const material = createDetailMaterial(Object.assign({}, detail, {
                size: [wallWidth, wallHeight, wallDepth]
            }));
            const xCuts = [-wallWidth / 2, wallWidth / 2];
            const yCuts = [-wallHeight / 2, wallHeight / 2];
            for (const rect of cutouts) {
                xCuts.push(rect.x1, rect.x2);
                yCuts.push(rect.y1, rect.y2);
            }
            const xs = getUniqueRoundedSortedCuts(xCuts);
            const ys = getUniqueRoundedSortedCuts(yCuts);
            for (let xi = 0; xi < xs.length - 1; xi++)
                for (let yi = 0; yi < ys.length - 1; yi++) {
                    const x1 = xs[xi];
                    const x2 = xs[xi + 1];
                    const y1 = ys[yi];
                    const y2 = ys[yi + 1];
                    if (x2 - x1 < .045 || y2 - y1 < .045)
                        continue;
                    const pointRect = {
                        x1: (x1 + x2) / 2,
                        x2: (x1 + x2) / 2,
                        y1: (y1 + y2) / 2,
                        y2: (y1 + y2) / 2
                    };
                    if (rectOverlapsAnyCutout(pointRect, cutouts, -.012))
                        continue;
                    group.add(createRuntimeBox([x2 - x1 + .22, y2 - y1 + .12, wallDepth + .16], material, [(x1 + x2) / 2, (y1 + y2) / 2, 0]));
                }
            return group.children.length ? positionDetailObject(group, Object.assign({}, detail, {
                size: [wallWidth, wallHeight, wallDepth]
            }), anchorPoint) : null;
        }

        function createPrimitiveDetailMesh(detail, anchorPoint, spec) {
            if (!globalState.THREE || !detail || !detail.type)
                return null;
            if (detail.__tmSkipRender)
                return null;
            const type = String(detail.type || "").toLowerCase();
            const THREE = globalState.THREE;
            let geometry = null;
            if ("window" === type)
                return createWindowDetailObject(detail, anchorPoint);
            if (isDoorDetail(detail))
                return createDoorDetailObject(detail, anchorPoint);
            if (isDeveloperToggleEnabled("perfDetailTypeLookup") ? DETAIL_FURNITURE_TYPES.has(type) : ["chair", "table", "sofa", "bed", "cabinet", "counter", "shelf", "stove", "chimney"].includes(type))
                return createFurnitureDetailObject(detail, anchorPoint);
            if ("box" === type || "wall" === type || "floor" === type || "panel" === type || "roofpanel" === type) {
                const fallback = "panel" === type || "roofpanel" === type ? [1, 1, .04] : [1, 1, .1];
                const size = getDetailSize(detail, fallback);
                const renderSize = "wall" === type || "panel" === type ? [size[0] + .1, size[1] + .06, Math.max(.02, size[2] + .08)] : size;
                if ("wall" === type || "panel" === type || "box" === type) {
                    const cutWall = createWallDetailWithOpenings(detail, anchorPoint, spec, renderSize);
                    if (cutWall)
                        return cutWall;
                }
                const box = createDetailPatternBoxGroup(detail, [renderSize[0], renderSize[1], Math.max(.02, renderSize[2])], "floor" === type ? "floor" : "roofpanel" === type ? "roof" : "wall");
                return positionDetailObject(box, detail, anchorPoint);
            }
            if ("flatroof" === type) {
                const size = getDetailSize(detail, [4, .18, 3]);
                return positionDetailObject(createDetailPatternBoxGroup(detail, size, "roof"), detail, anchorPoint);
            }
            if ("trianglewall" === type || "trianglefill" === type)
                geometry = createTriangleWallGeometry(detail);
            else if ("wedgefill" === type)
                geometry = createWedgeFillGeometry(detail);
            else if ("cylinderwall" === type || "arcwall" === type)
                geometry = createCylinderWallGeometry(detail);
            else if ("fillcylinder" === type)
                geometry = createFillCylinderGeometry(detail);
            else if ("pyramid" === type || "pyramidroof" === type || "roofpyramid" === type || "frustumroof" === type)
                geometry = createPyramidGeometry(detail);
            else if ("gableroof" === type) {
                const size = getDetailSize(detail, [4, 2, 4]);
                geometry = createModelerRidgeGeometry(size[0], size[1], size[2], "z" === detail.ridgeDirection ? "z" : "x", Number(detail.ridgeLength) || size[0]);
            } else if ("hiproof" === type) {
                const size = getDetailSize(detail, [4, 2, 4]);
                geometry = createFrustumRoofGeometry(size[0], size[1], size[2], Number(detail.topScale) || .22);
            } else if ("shedroof" === type)
                geometry = createShedRoofGeometry(detail);
            else if ("mansardroof" === type) {
                const size = getDetailSize(detail, [4, 2, 4]);
                geometry = createFrustumRoofGeometry(size[0], size[1], size[2], Number(detail.topScale) || .55);
            } else if ("domeroof" === type) {
                const size = getDetailSize(detail, [4, 2, 4]);
                geometry = new THREE.SphereGeometry(1, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                geometry.scale(size[0] / 2, size[1], size[2] / 2);
            } else if ("roundroof" === type)
                geometry = createRoundRoofGeometry(detail);
            else if ("cone" === type) {
                const size = getDetailSize(detail, [1, 2, 1]);
                const radius = Math.max(.05, Number(detail.radius) || Number(detail.radiusBottom) || size[0]);
                geometry = new THREE.CylinderGeometry(0, radius, Math.max(.1, Number(detail.height) || size[1]), Math.max(3, Math.round(Number(detail.segments) || 16)));
                geometry.scale(1, 1, Math.max(.05, Number(detail.radiusZ) || size[2] || radius) / radius);
            } else if ("cylinder" === type) {
                const radius = Math.max(.05, Number(detail.radius) || Number(detail.a) || .25);
                const radiusTop = null != detail.radiusTop ? Math.max(0, Number(detail.radiusTop) || 0) : radius;
                const radiusBottom = null != detail.radiusBottom ? Math.max(.05, Number(detail.radiusBottom) || .05) : radius;
                geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, Math.max(.1, Number(detail.height) || Number(detail.b) || 1), Math.max(3, Number(detail.segments) || 16));
                if (detail.radiusX || detail.radiusZ || detail.c) {
                    const radiusX = Math.max(.05, Number(detail.radiusX) || radius);
                    const radiusZ = Math.max(.05, Number(detail.radiusZ) || Number(detail.c) || radius);
                    geometry.scale(radiusX / radius, 1, radiusZ / radius);
                }
            } else if ("sphere" === type)
                geometry = new THREE.SphereGeometry(Math.max(.05, Number(detail.radius) || .5), 12, 10);
            if (!geometry)
                return null;
            const mesh = new THREE.Mesh(geometry, createDetailMaterial(detail));
            mesh.castShadow = !0;
            mesh.receiveShadow = !0;
            return positionDetailObject(mesh, detail, anchorPoint);
        }

        function buildCustomBuildingObject(match) {
            if (!globalState.THREE || !match || !match.building)
                return null;
            const spec = deepMergeConfig({
                base: {
                    floors: Math.max(1, Number(match.building.level) || 2),
                    floorHeight: 3,
                    color: 14540253,
                    inset: 0
                },
                roof: {
                    enabled: !0,
                    type: "gable",
                    color: 8606516,
                    height: 2.2,
                    overhang: .3,
                    ridgeDirection: "longest"
                },
                windows: {
                    enabled: !0,
                    width: 1.05,
                    height: 1.35,
                    rows: 2,
                    gap: .65,
                    margin: .85,
                    sill: 1.1
                },
                parts: []
            }, match.entry || {});
            spec.windows = deepMergeConfig(spec.windows || {}, {
                cutHoles: !0
            });
            spec.__tmWorldOffset = match.building.chunkCenter || {
                x: 0,
                z: 0
            };
            const group = new globalState.THREE.Group;
            group.name = `tmCustomBuilding:${match.id}`;
            const points = getMatchCollisionLocalFootprint(match);
            if (!points.length)
                return null;
            match.__tmCollisionLocalFootprint = points;
            const originalBaseY = Number(spec.base && spec.base.y) || Number(match.building.y) || 0;
            const bodyHeight = Math.max(1.4, Number(spec.base && spec.base.height) || Math.max(1, Number(spec.base && spec.base.floors) || 2) * Math.max(2.4, Number(spec.base && spec.base.floorHeight) || 3));
            const baseY = getRaisedCustomBuildingBaseY(points, originalBaseY, spec);
            // Door/window openings must be prepared before the body mesh is built, otherwise the wall has no holes.
            const anchorPoint = Object.assign({
                y: baseY
            }, match.building.houseCenterLocal || {
                x: match.building.houseCenter ? match.building.houseCenter.x - (match.building.chunkCenter && match.building.chunkCenter.x || 0) : 0,
                z: match.building.houseCenter ? match.building.houseCenter.z - (match.building.chunkCenter && match.building.chunkCenter.z || 0) : 0
            });
            prepareWallOpeningsForSpec(points, baseY, bodyHeight, spec, anchorPoint);
            const baseEnabled = !(spec.base && !1 === spec.base.enabled);
            if (!hasExplicitFloorPart(spec)) {
                const floor = createCustomBuildingSlab(points, baseY - .12, .2, spec.floor && spec.floor.color || 0xb88f61, spec.floor || spec, "__tmCustomBuildingFloor");
                floor && group.add(floor);
            }
            if (baseEnabled) {
                const foundation = createCustomBuildingFoundation(points, baseY, getFootprintMinTerrainY(points, baseY, spec), spec.base && spec.base.color, spec);
                foundation && group.add(foundation);
                const body = createCustomBuildingBody(points, baseY, bodyHeight, spec.base && spec.base.color, spec);
                body && group.add(body);
                const ceiling = createCustomBuildingSlab(points, baseY + bodyHeight - .09, .18, spec.ceiling && spec.ceiling.color || spec.base && spec.base.color, spec.ceiling || spec, "__tmCustomBuildingCeiling");
                ceiling && group.add(ceiling);
                const roof = createCustomRoof(points, baseY, bodyHeight, spec.roof);
                roof && group.add(roof);
                createWindowsForFootprint(group, points, baseY, bodyHeight, deepMergeConfig(spec.windows, {
                    sides: spec.sides || {},
                    __tmWorldOffset: spec.__tmWorldOffset,
                    __tmWallOpenings: spec.__tmWallOpenings,
                    base: spec.base
                }));
            }
            for (const part of toSafeArray(spec.parts)) {
                const detailMesh = createPrimitiveDetailMesh(part, anchorPoint, spec);
                detailMesh && group.add(detailMesh);
            }
            if (!specHasDoorPart(spec)) {
                const fallbackDoor = createFallbackDoorForFootprint(points, baseY, bodyHeight, spec, anchorPoint);
                fallbackDoor && group.add(fallbackDoor);
            }
            return group;
        }

        function getCatalogTemplateCount(catalog) {
            if (!catalog || !catalog.templates)
                return 0;
            if (Number.isFinite(Number(catalog.__tmTemplateCount)))
                return Number(catalog.__tmTemplateCount);
            let count = 0;
            for (const key in catalog.templates)
                Object.prototype.hasOwnProperty.call(catalog.templates, key) && count++;
            catalog.__tmTemplateCount = count;
            return count;
        }

        function getCustomBuildingPrepareSignature(chunk, catalog) {
            const sourceBuildings = toSafeArray(chunk && (chunk.__tmOriginalBuildings || chunk.buildings));
            const catalogBuildings = toSafeArray(catalog && catalog.buildings);
            if (isDeveloperToggleEnabled("perfPrepareSignatureLoop")) {
                let sourceSignature = "";
                for (let index = 0, limit = Math.min(180, sourceBuildings.length); index < limit; index++) {
                    const building = sourceBuildings[index];
                    sourceSignature += `${sourceSignature ? "," : ""}${building && building.index}.${building && building.type}.${building && building.level}.${toSafeArray(building && building.points).length}`;
                }
                return `${featureState.customBuildings ? 1 : 0}|${featureState.auto3dBuildings ? 1 : 0}|${sourceBuildings.length}|${toSafeArray(chunk && (chunk.__tmOriginalCustomBuildings || chunk.custome_buildings)).length}|${catalogBuildings.length}|${getCatalogTemplateCount(catalog)}|${sourceSignature}`;
            }
            const sourceSignatureParts = [];
            for (let index = 0, limit = Math.min(180, sourceBuildings.length); index < limit; index++) {
                const building = sourceBuildings[index];
                sourceSignatureParts.push([building && building.index, building && building.type, building && building.level, toSafeArray(building && building.points).length].join("."));
            }
            return [
                featureState.customBuildings ? 1 : 0,
                featureState.auto3dBuildings ? 1 : 0,
                sourceBuildings.length,
                toSafeArray(chunk && (chunk.__tmOriginalCustomBuildings || chunk.custome_buildings)).length,
                catalogBuildings.length,
                getCatalogTemplateCount(catalog),
                sourceSignatureParts.join(",")
            ].join("|");
        }

        function prepareCustomBuildingMatchesForChunk(chunk, catalog) {
            if (!chunk)
                return [];
            chunk.__tmOriginalCustomBuildings || (chunk.__tmOriginalCustomBuildings = cloneJson(toSafeArray(chunk.custome_buildings), []));
            if (!Array.isArray(chunk.__tmOriginalBuildings))
                chunk.__tmOriginalBuildings = Array.isArray(chunk.buildings) ? chunk.buildings.slice() : [];
            const prepareSignature = getCustomBuildingPrepareSignature(chunk, catalog);
            if (chunk.__tmCustomBuildingsPrepared && runtimeState.customBuildingPrepareSignatures.get(chunk) === prepareSignature)
                return chunk.__tmMatchedCustomBuildings || runtimeState.customBuildingEntriesByChunk.get(chunk) || [];
            const sourceBuildings = toSafeArray(chunk.__tmOriginalBuildings);
            const originalCustomBuildings = toSafeArray(chunk.__tmOriginalCustomBuildings);
            const catalogBuildings = toSafeArray(catalog && catalog.buildings);
            const templates = catalog && catalog.templates;
            const matched = [];
            const suppressions = [];
            const matchedBuildings = new Set;
            if (!isAny3dBuildingFeatureEnabled()) {
                chunk.buildings = sourceBuildings.slice();
                chunk.custome_buildings = originalCustomBuildings;
                syncBuildingFactoryBuildingSources(chunk, !0);
                chunk.__tmMatchedCustomBuildings = matched;
                chunk.__tmCustomBuildingsPrepared = !0;
                chunk.__tmCustomBuildingOverlayReady = !1;
                runtimeState.customBuildingPrepareSignatures.set(chunk, prepareSignature);
                runtimeState.customBuildingEntriesByChunk.set(chunk, matched);
                applyOriginalBuildingMeshVisibilityForChunk(chunk);
                queueCustomBuildingCollisionInvalidation(chunk);
                return matched;
            }
            const addCustomBuildingMatch = (id, entry, building, options={}) => {
                if (!building || matchedBuildings.has(building))
                    return;
                options.standalone || matchedBuildings.add(building);
                matched.push({
                    id,
                    entry,
                    building,
                    chunk
                });
                options.standalone || suppressions.push({
                    id,
                    naa: cloneJson(building.points, []),
                    list: cloneJson(toSafeArray(entry && entry.bundleParts), [])
                });
            };
            if (featureState.customBuildings)
                for (let entryIndex = 0; entryIndex < catalogBuildings.length; entryIndex++) {
                    const rawEntry = catalogBuildings[entryIndex];
                    const resolved = resolveBuildingTemplate(rawEntry, templates);
                    let matchedExistingBuilding = !1;
                    for (const building of sourceBuildings)
                        if (building && building.houseCenter && matchBuildingEntry(resolved, chunk, building)) {
                            const id = resolved.id || getBuildingDebugId(chunk, building);
                            addCustomBuildingMatch(id, resolved, building);
                            matchedExistingBuilding = !0;
                        }
                    if (!matchedExistingBuilding && getCustomBuildingAddressText(resolved && resolved.match)) {
                        const standalone = createStandaloneAddressBuilding(resolved, chunk, entryIndex);
                        standalone && addCustomBuildingMatch(resolved.id || `address_${entryIndex}_${Math.round(standalone.houseCenter.x)}_${Math.round(standalone.houseCenter.z)}`, resolved, standalone, {
                            standalone: !0
                        });
                    }
                }
            if (isAuto3dCatalogEnabled(catalog))
                for (const building of sourceBuildings) {
                    if (!building || !building.houseCenter || matchedBuildings.has(building))
                        continue;
                    const autoEntry = createAuto3dBuildingEntry(building, chunk, catalog || {});
                    autoEntry && addCustomBuildingMatch(autoEntry.id || getBuildingDebugId(chunk, building), autoEntry, building);
                }
            const remainingBuildings = [];
            for (const building of sourceBuildings)
                matchedBuildings.has(building) || remainingBuildings.push(building);
            chunk.buildings = remainingBuildings;
            chunk.custome_buildings = originalCustomBuildings.concat(suppressions);
            syncBuildingFactoryBuildingSources(chunk, !0);
            chunk.__tmMatchedCustomBuildings = matched;
            chunk.__tmCustomBuildingsPrepared = !0;
            chunk.__tmCustomBuildingOverlayReady = !1;
            runtimeState.customBuildingPrepareSignatures.set(chunk, prepareSignature);
            runtimeState.customBuildingEntriesByChunk.set(chunk, matched);
            applyOriginalBuildingMeshVisibilityForChunk(chunk);
            queueCustomBuildingCollisionInvalidation(chunk);
            log(`3D-Haeuser vorbereitet fuer Chunk ${chunk.cx}/${chunk.cz}: ${matched.length} ersetzt, ${chunk.buildings.length} PNG-Haeuser bleiben.`);
            return matched;
        }

        async function ensureChunkCustomBuildingsPrepared(chunk) {
            if (!chunk)
                return [];
            if (!isAny3dBuildingFeatureEnabled())
                return [];
            if (chunk.__tmCustomBuildingsPrepared)
                return chunk.__tmMatchedCustomBuildings || [];
            if (chunk.__tmCustomBuildingsPreparePromise)
                return chunk.__tmCustomBuildingsPreparePromise;
            chunk.__tmCustomBuildingsPreparePromise = ensureBuildingCatalogLoaded().then((catalog => prepareCustomBuildingMatchesForChunk(chunk, catalog))).finally((() => {
                chunk.__tmCustomBuildingsPreparePromise = null;
            }));
            return chunk.__tmCustomBuildingsPreparePromise;
        }

        function getChunkApproxCenter(chunk) {
            if (!globalState.THREE || !chunk)
                return null;
            if (chunk.centerVec)
                return chunk.centerVec;
            if (!chunk.__tmApproxCenter)
                chunk.__tmApproxCenter = new globalState.THREE.Vector3(Number(chunk.cx) || 0,0,Number(chunk.cz) || 0);
            return chunk.__tmApproxCenter;
        }

        function addCustomBuildingPriorityTarget(position, label) {
            const target = cloneVector3(position);
            if (!target)
                return;
            const now = performance.now();
            runtimeState.customBuildingPriorityTargets.push({
                position: target,
                label: label || "Adresse",
                createdAt: now
            });
            let writeIndex = 0;
            for (let index = 0; index < runtimeState.customBuildingPriorityTargets.length; index++) {
                const entry = runtimeState.customBuildingPriorityTargets[index];
                entry && entry.position && now - (Number(entry.createdAt) || 0) < 10 * 60 * 1e3 && (runtimeState.customBuildingPriorityTargets[writeIndex++] = entry);
            }
            runtimeState.customBuildingPriorityTargets.length = writeIndex;
            while (runtimeState.customBuildingPriorityTargets.length > 8)
                runtimeState.customBuildingPriorityTargets.shift();
        }

        function isPriorityCustomBuildingChunk(chunk) {
            const center = getChunkApproxCenter(chunk);
            if (!center)
                return !1;
            return isPointNearCustomBuildingPriorityTarget(center);
        }

        function isPointNearCustomBuildingPriorityTarget(center) {
            if (!center)
                return !1;
            const targets = runtimeState.customBuildingPriorityTargets;
            for (let index = 0; index < targets.length; index++) {
                const entry = targets[index];
                if (entry && entry.position && getDistanceSq2D(center, entry.position) <= 3240000)
                    return !0;
            }
            return !1;
        }

        function needsCustomBuildingChunkWork(chunk) {
            if (!chunk || !isAny3dBuildingFeatureEnabled())
                return !1;
            if (!chunk.__tmCustomBuildingsPrepared)
                return !0;
            const matches = chunk.__tmMatchedCustomBuildings || runtimeState.customBuildingEntriesByChunk.get(chunk) || [];
            if (!Array.isArray(matches) || !matches.length)
                return !1;
            const overlay = runtimeState.chunkCustomOverlayGroups.get(chunk);
            if (isDeveloperToggleEnabled("perfNeedsChunkWorkFastPath") && !(overlay && overlay.parent === chunk.group && overlay.userData && chunk.__tmCustomBuildingOverlayReady))
                return !0;
            const signature = getCustomBuildingOverlaySignature(matches);
            return !(overlay && overlay.parent === chunk.group && overlay.userData && overlay.userData.tmBuildSignature === signature && chunk.__tmCustomBuildingOverlayReady);
        }

        async function prepareCustomBuildingsForChunks(chunks, reason) {
            if (!isAny3dBuildingFeatureEnabled()) {
                clearCustomBuildingVisualsForLoadedChunks();
                return;
            }
            const unique = [];
            const seenChunks = new Set;
            for (const chunk of toSafeArray(chunks)) {
                if (!chunk || seenChunks.has(chunk) || !needsCustomBuildingChunkWork(chunk))
                    continue;
                seenChunks.add(chunk);
                unique.push(chunk);
            }
            if (!unique.length)
                return;
            const showProgress = featureState.customBuildings || "address" === reason;
            for (let index = 0; index < unique.length; index++) {
                const chunk = unique[index];
                showProgress && setCustomBuildingProgress(index, unique.length, reason === "address" ? "Adress-Haeuser vorbereiten" : "3D-Haeuser optimieren");
                try {
                    await ensureChunkCustomBuildingsPrepared(chunk);
                    rebuildCustomBuildingsForChunk(chunk, reason);
                } catch (prepareError) {
                    warn(`Custom-Haeuser konnten fuer Chunk ${chunk && chunk.cx}/${chunk && chunk.cz} nicht vorbereitet werden:`, prepareError);
                }
                showProgress && setCustomBuildingProgress(index + 1, unique.length, reason === "address" ? "Adress-Haeuser vorbereiten" : "3D-Haeuser optimieren");
            }
            showProgress && finishCustomBuildingProgress();
        }

        function prepareCustomBuildingsNearPosition(position, reason) {
            if (!featureState.customBuildings || !position)
                return;
            const loadedChunks = getLoadedChunks();
            if (isDeveloperToggleEnabled("perfPrepareNearChunkCache")) {
                const key = `${Math.round((Number(position.x) || 0) / 80)}:${Math.round((Number(position.z) || 0) / 80)}:${reason || "near"}`;
                const cached = runtimeState.prepareNearChunkCache;
                if (cached && cached.key === key && cached.loadedChunks === loadedChunks) {
                    cached.chunks.length && prepareCustomBuildingsForChunks(cached.chunks, reason || "near");
                    return;
                }
                const chunks = [];
                for (const chunk of loadedChunks) {
                    const center = getChunkApproxCenter(chunk);
                    center && getDistanceSq2D(center, position) <= 4840000 && chunks.push(chunk);
                }
                runtimeState.prepareNearChunkCache = {
                    key,
                    loadedChunks,
                    chunks
                };
                chunks.length && prepareCustomBuildingsForChunks(chunks, reason || "near");
                return;
            }
            const chunks = [];
            for (const chunk of loadedChunks) {
                const center = getChunkApproxCenter(chunk);
                center && getDistanceSq2D(center, position) <= 4840000 && chunks.push(chunk);
            }
            chunks.length && prepareCustomBuildingsForChunks(chunks, reason || "near");
        }

        function removeCustomBuildingDoorItemsForChunk(chunk) {
            const kept = [];
            for (const item of runtimeState.customBuildingDoorItems)
                item && item.chunk !== chunk && kept.push(item);
            runtimeState.customBuildingDoorItems = kept;
        }

        function removeCustomBuildingBuildQueueChunk(chunk) {
            const queue = runtimeState.customBuildingBuildQueue;
            for (let index = queue.length - 1; index >= 0; index--)
                queue[index] === chunk && queue.splice(index, 1);
        }

        function removeCustomBuildingOptimizeQueueOverlay(overlay) {
            const kept = [];
            for (const item of runtimeState.customBuildingOptimizeQueue)
                item && item.overlay !== overlay && kept.push(item);
            runtimeState.customBuildingOptimizeQueue = kept;
        }

        function collectCustomBuildingDoorsForChunk(chunk, overlay) {
            const keptDoors = [];
            for (const item of runtimeState.customBuildingDoorItems)
                item && item.chunk !== chunk && item.group && item.group.parent && keptDoors.push(item);
            runtimeState.customBuildingDoorItems = keptDoors;
            const THREE = globalState.THREE;
            if (!overlay || !THREE)
                return;
            overlay.traverse((node => {
                if (node && node.userData && node.userData.tmDoor) {
                    const position = node.getWorldPosition ? node.getWorldPosition(new THREE.Vector3) : null;
                    runtimeState.customBuildingDoorItems.push({
                        chunk,
                        group: node,
                        worldPosition: position
                    });
                }
            }
            ));
        }

        function getCustomBuildingOverlaySignature(matches) {
            if (isDeveloperToggleEnabled("perfOverlaySignatureCache") && Array.isArray(matches) && matches.__tmOverlaySignature && matches.__tmOverlaySignatureLength === matches.length)
                return matches.__tmOverlaySignature;
            if (isDeveloperToggleEnabled("perfOverlaySignatureLoop")) {
                let signature = "";
                for (const match of toSafeArray(matches)) {
                    const building = match && match.building;
                    const entry = match && match.entry;
                    signature += `${signature ? "|" : ""}${match && match.id || ""}:${building && building.index}:${entry && entry.__tmAuto3d ? "a" : "e"}:${toSafeArray(entry && entry.parts).length}:${entry && entry.base && !1 === entry.base.enabled ? 0 : 1}:${entry && entry.windows && !1 === entry.windows.enabled ? 0 : 1}`;
                }
                if (isDeveloperToggleEnabled("perfOverlaySignatureCache") && Array.isArray(matches)) {
                    matches.__tmOverlaySignature = signature;
                    matches.__tmOverlaySignatureLength = matches.length;
                }
                return signature;
            }
            const parts = [];
            for (const match of toSafeArray(matches)) {
                const building = match && match.building;
                const entry = match && match.entry;
                parts.push([
                    match && match.id || "",
                    building && building.index,
                    entry && entry.__tmAuto3d ? "a" : "e",
                    toSafeArray(entry && entry.parts).length,
                    entry && entry.base && !1 === entry.base.enabled ? 0 : 1,
                    entry && entry.windows && !1 === entry.windows.enabled ? 0 : 1
                ].join(":"));
            }
            const signature = parts.join("|");
            if (isDeveloperToggleEnabled("perfOverlaySignatureCache") && Array.isArray(matches)) {
                matches.__tmOverlaySignature = signature;
                matches.__tmOverlaySignatureLength = matches.length;
            }
            return signature;
        }

        function getOrCreateCustomBuildingOverlay(chunk) {
            let overlay = chunk && runtimeState.chunkCustomOverlayGroups.get(chunk);
            if (!overlay && chunk && globalState.THREE) {
                overlay = new globalState.THREE.Group;
                overlay.name = "__tmCustomBuildingsOverlay";
                runtimeState.chunkCustomOverlayGroups.set(chunk, overlay);
            }
            return overlay;
        }

        function countBatchableOverlayMeshes(overlay, limit=1 / 0) {
            if (isDeveloperToggleEnabled("perfBatchableMeshCountCache") && overlay && overlay.userData && overlay.userData.tmBatchableMeshCountValid && Number(overlay.userData.tmBatchableMeshCountLimit) >= limit)
                return Number(overlay.userData.tmBatchableMeshCount) || 0;
            let count = 0;
            overlay && overlay.traverse && overlay.traverse(node => {
                if (count >= limit || !node || !node.isMesh || node.userData && (node.userData.tmDynamicDoor || node.userData.tmNoBatch) || Array.isArray(node.material) || !node.geometry)
                    return;
                count++;
            });
            isDeveloperToggleEnabled("perfBatchableMeshCountCache") && overlay && overlay.userData && (overlay.userData.tmBatchableMeshCount = count,
            overlay.userData.tmBatchableMeshCountValid = !0,
            overlay.userData.tmBatchableMeshCountLimit = limit);
            return count;
        }

        function getRuntimeCamera() {
            const game = runtimeState.game || townSignsState.game;
            const manager = getControlManager();
            return game && (game.camera || game.activeCamera || game.mainCamera || game.cm && game.cm.camera || game.cameraManager && game.cameraManager.camera) || manager && (manager.camera || manager.cm && manager.cm.camera) || null;
        }

        function getCustomBuildingOverlayBounds(chunk, matches) {
            const existing = chunk && chunk.__tmCustomBuildingOverlayBounds;
            if (existing)
                return existing;
            let pointCount = 0;
            let sumX = 0;
            let sumZ = 0;
            let minX = 1 / 0;
            let maxX = -1 / 0;
            let minZ = 1 / 0;
            let maxZ = -1 / 0;
            let maxHeight = 4;
            for (const match of toSafeArray(matches || chunk && (chunk.__tmMatchedCustomBuildings || runtimeState.customBuildingEntriesByChunk.get(chunk)))) {
                const points = getMatchCollisionWorldFootprint(match, chunk);
                for (const point of points) {
                    const x = Number(point && point.x) || 0;
                    const z = Number(point && point.z) || 0;
                    sumX += x;
                    sumZ += z;
                    pointCount++;
                    x < minX && (minX = x);
                    x > maxX && (maxX = x);
                    z < minZ && (minZ = z);
                    z > maxZ && (maxZ = z);
                }
                const entry = match && match.entry || {};
                const building = match && match.building || {};
                const base = entry.base || {};
                const bodyHeight = Number(base.height) || Math.max(1, Number(base.floors) || Number(building.level) || 2) * Math.max(2.4, Number(base.floorHeight) || 3);
                const roofHeight = Number(entry.roof && entry.roof.height) || 2;
                maxHeight = Math.max(maxHeight, bodyHeight + roofHeight);
            }
            if (!pointCount)
                return null;
            const centerX = sumX / pointCount;
            const centerZ = sumZ / pointCount;
            const radius = Math.hypot(Math.max(Math.abs(maxX - centerX), Math.abs(centerX - minX)), Math.max(Math.abs(maxZ - centerZ), Math.abs(centerZ - minZ)));
            const y = Number(chunk && chunk.centerVec && chunk.centerVec.y) || 0;
            const bounds = {
                center: new globalState.THREE.Vector3(centerX,y + maxHeight / 2,centerZ),
                radius: Math.max(12, radius + maxHeight + 18)
            };
            chunk && (chunk.__tmCustomBuildingOverlayBounds = bounds);
            return bounds;
        }

        function updateCustomBuildingOverlayCulling() {
            if (!isAny3dBuildingFeatureEnabled() || !globalState.THREE)
                return;
            const chunks = getLoadedChunks();
            if (!chunks.length) {
                runtimeState.customBuildingCullCursor = 0;
                return;
            }
            if (!isDeveloperToggleEnabled("perfCustomBuildingCulling")) {
                for (const chunk of chunks) {
                    const overlay = chunk && runtimeState.chunkCustomOverlayGroups.get(chunk);
                    overlay && (overlay.visible = !0);
                }
                runtimeState.customBuildingCullCursor = 0;
                return;
            }
            let temp = runtimeState.customBuildingCullTemp;
            if (!temp || !temp.matrix || !temp.frustum || !temp.sphere)
                temp = runtimeState.customBuildingCullTemp = {
                    matrix: new globalState.THREE.Matrix4,
                    frustum: new globalState.THREE.Frustum,
                    sphere: new globalState.THREE.Sphere
                };
            const playerPos = getPlayerPosition();
            const playerX = Number(playerPos && playerPos.x) || 0;
            const playerZ = Number(playerPos && playerPos.z) || 0;
            const camera = getRuntimeCamera();
            let frustum = null;
            if (camera && camera.projectionMatrix && camera.matrixWorldInverse) {
                camera.updateMatrixWorld && camera.updateMatrixWorld(!0);
                camera.updateProjectionMatrix && camera.updateProjectionMatrix();
                temp.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
                frustum = temp.frustum;
                frustum.setFromProjectionMatrix(temp.matrix);
            }
            const limit = Math.min(chunks.length, CUSTOM_BUILDING_PERF.cullChunksPerTick);
            let cursor = Math.max(0, Number(runtimeState.customBuildingCullCursor) || 0);
            for (let checked = 0; checked < limit; checked++) {
                const chunk = chunks[cursor % chunks.length];
                cursor++;
                const overlay = chunk && runtimeState.chunkCustomOverlayGroups.get(chunk);
                if (!overlay || !chunk.__tmCustomBuildingOverlayReady)
                    continue;
                const bounds = getCustomBuildingOverlayBounds(chunk);
                if (!bounds)
                    continue;
                let visible = !0;
                if (playerPos) {
                    const limit = CUSTOM_BUILDING_PERF.cullDistance + (overlay.visible ? CUSTOM_BUILDING_PERF.cullDistanceHysteresis : 0) + bounds.radius;
                    if (isDeveloperToggleEnabled("perfCullingDistanceMath")) {
                        const dx = playerX - (Number(bounds.center && bounds.center.x) || 0);
                        const dz = playerZ - (Number(bounds.center && bounds.center.z) || 0);
                        visible = dx * dx + dz * dz <= limit * limit || isPriorityCustomBuildingChunk(chunk);
                    } else
                        visible = getDistanceSq2D(playerPos, bounds.center) <= limit * limit || isPriorityCustomBuildingChunk(chunk);
                }
                if (visible && frustum) {
                    temp.sphere.set(bounds.center, bounds.radius + 60);
                    visible = frustum.intersectsSphere(temp.sphere);
                }
                overlay.visible !== visible && (overlay.visible = visible);
            }
            runtimeState.customBuildingCullCursor = cursor % chunks.length;
        }

        function scheduleCustomBuildingOptimizePump(delayMs=420) {
            if (runtimeState.customBuildingOptimizeTimer)
                return;
            runtimeState.customBuildingOptimizeTimer = scheduleIdleTask(processCustomBuildingOptimizeQueue, delayMs, 1800);
        }

        function queueCustomBuildingOverlayOptimization(chunk, overlay, signature, delayMs=420) {
            if (!chunk || !overlay || !signature || overlay.userData && overlay.userData.tmOptimizedSignature === signature)
                return;
            if (!(isDeveloperToggleEnabled("perfOptimizeQueuePrune") && !runtimeState.customBuildingOptimizeQueue.length)) {
                let writeIndex = 0;
                for (let index = 0; index < runtimeState.customBuildingOptimizeQueue.length; index++) {
                    const item = runtimeState.customBuildingOptimizeQueue[index];
                    const keep = item && item.overlay && item.overlay.parent && item.overlay.userData && item.overlay.userData.tmOptimizedSignature !== item.signature;
                    keep && (runtimeState.customBuildingOptimizeQueue[writeIndex++] = item);
                }
                runtimeState.customBuildingOptimizeQueue.length = writeIndex;
                runtimeState.customBuildingOptimizeQueued = new WeakSet;
                for (const item of runtimeState.customBuildingOptimizeQueue)
                    item && item.overlay && runtimeState.customBuildingOptimizeQueued.add(item.overlay);
            } else {
                runtimeState.customBuildingOptimizeQueued instanceof WeakSet || (runtimeState.customBuildingOptimizeQueued = new WeakSet);
            }
            if (runtimeState.customBuildingOptimizeQueued.has(overlay))
                return;
            const limit = Math.max(4, CUSTOM_BUILDING_PERF.optimizeQueueLimit);
            while (runtimeState.customBuildingOptimizeQueue.length >= limit) {
                const oldItem = runtimeState.customBuildingOptimizeQueue.shift();
                oldItem && oldItem.overlay && runtimeState.customBuildingOptimizeQueued.delete(oldItem.overlay);
            }
            runtimeState.customBuildingOptimizeQueued.add(overlay);
            runtimeState.customBuildingOptimizeQueue.push({
                chunk,
                overlay,
                signature
            });
            scheduleCustomBuildingOptimizePump(delayMs);
        }

        function processCustomBuildingOptimizeQueue(deadline) {
            runtimeState.customBuildingOptimizeTimer = null;
            if (!runtimeState.customBuildingOptimizeQueue.length)
                return;
            const item = runtimeState.customBuildingOptimizeQueue.shift();
            item && item.overlay && runtimeState.customBuildingOptimizeQueued.delete(item.overlay);
            if (item && item.chunk && item.overlay && item.overlay.parent === item.chunk.group && item.overlay.userData && item.overlay.userData.tmBuildSignature === item.signature) {
                const player = getPlayerCar();
                const playerMoving = player && speedAbs(player.speed) > 2.2;
                const cachedMeshCount = Number(item.overlay.userData.tmBatchableMeshCount);
                const meshCount = cachedMeshCount > 0 ? cachedMeshCount : countBatchableOverlayMeshes(item.overlay, CUSTOM_BUILDING_PERF.maxOptimizeMeshes + 1);
                if (meshCount < CUSTOM_BUILDING_PERF.minBatchMeshes) {
                    item.overlay.userData.tmOptimizedSignature = item.signature;
                    runtimeState.customBuildingOptimizeQueue.length && scheduleCustomBuildingOptimizePump(180);
                    return;
                }
                if (playerMoving && meshCount > CUSTOM_BUILDING_PERF.maxOptimizeMeshes) {
                    queueCustomBuildingOverlayOptimization(item.chunk, item.overlay, item.signature, 900);
                    return;
                }
                try {
                    optimizeCustomBuildingOverlay(item.overlay);
                    item.overlay.userData.tmOptimizedSignature = item.signature;
                } catch (optimizeError) {
                    warn("Custom-Building-Optimierung fehlgeschlagen, zeige unoptimierte Geometrie:", optimizeError);
                }
            }
            runtimeState.customBuildingOptimizeQueue.length && scheduleCustomBuildingOptimizePump(520);
        }

        function scheduleCustomBuildingBuildPump(delayMs=CUSTOM_BUILDING_PERF.queueDelayMs, forceSoon=!1) {
            if (runtimeState.customBuildingBuildTimer) {
                if (!forceSoon)
                    return;
                clearTimeout(runtimeState.customBuildingBuildTimer);
                runtimeState.customBuildingBuildTimer = null;
            }
            runtimeState.customBuildingBuildTimer = scheduleIdleTask(processCustomBuildingBuildQueue, delayMs, 450);
        }

        function getCustomBuildingStreamSpeedFactor() {
            const car = getPlayerCar();
            return car ? clamp(speedAbs(car.speed) / 30, 0, 1) : 0;
        }

        function getCustomBuildingQueueDelay(priority) {
            if (priority)
                return 0;
            const speedFactor = getCustomBuildingStreamSpeedFactor();
            return CUSTOM_BUILDING_PERF.queueDelayMs + Math.round(speedFactor * 80);
        }

        function getCustomBuildingSliceBudget(priority, idleBudget) {
            if (priority)
                return CUSTOM_BUILDING_PERF.prioritySliceBudgetMs;
            const speedFactor = getCustomBuildingStreamSpeedFactor();
            return Math.max(2.4, Math.min(Number(idleBudget) || CUSTOM_BUILDING_PERF.sliceBudgetMs, CUSTOM_BUILDING_PERF.sliceBudgetMs * (1 - speedFactor * .38)));
        }

        function sortCustomBuildingBuildQueue() {
            if (!isDeveloperToggleEnabled("perfPriorityQueueSort") || runtimeState.customBuildingBuildQueue.length < 2)
                return;
            const now = performance.now();
            if (now - (Number(runtimeState.customBuildingLastQueueSortAt) || 0) < 350)
                return;
            runtimeState.customBuildingLastQueueSortAt = now;
            const playerPos = getPlayerPosition();
            const scored = [];
            const useScoreReuse = isDeveloperToggleEnabled("perfBuildQueueScoreReuse");
            const priorityTargets = runtimeState.customBuildingPriorityTargets || [];
            const lastPriorityTarget = priorityTargets[priorityTargets.length - 1];
            const priorityKey = `${priorityTargets.length}:${Math.round(Number(lastPriorityTarget && lastPriorityTarget.createdAt) || 0)}`;
            const playerKey = playerPos ? `${Math.round((Number(playerPos.x) || 0) / 16)}:${Math.round((Number(playerPos.z) || 0) / 16)}` : "none";
            for (const chunk of runtimeState.customBuildingBuildQueue) {
                if (!chunk)
                    continue;
                const scoreKey = `${playerKey}:${priorityKey}`;
                let priorityRank;
                let distanceSq;
                if (useScoreReuse && chunk.__tmBuildQueueScoreKey === scoreKey) {
                    priorityRank = chunk.__tmBuildQueuePriorityRank;
                    distanceSq = chunk.__tmBuildQueueDistanceSq;
                } else {
                    const center = getChunkApproxCenter(chunk);
                    priorityRank = center && isPointNearCustomBuildingPriorityTarget(center) ? 0 : 1;
                    distanceSq = playerPos && center ? getDistanceSq2D(playerPos, center) : 0;
                    useScoreReuse && (chunk.__tmBuildQueueScoreKey = scoreKey,
                    chunk.__tmBuildQueuePriorityRank = priorityRank,
                    chunk.__tmBuildQueueDistanceSq = distanceSq);
                }
                scored.push({
                    chunk,
                    priorityRank,
                    distanceSq
                });
            }
            scored.sort((a, b) => a.priorityRank - b.priorityRank || a.distanceSq - b.distanceSq);
            runtimeState.customBuildingBuildQueue.length = scored.length;
            for (let index = 0; index < scored.length; index++)
                runtimeState.customBuildingBuildQueue[index] = scored[index].chunk;
        }

        function queueCustomBuildingRebuild(chunk, reason) {
            if (!chunk)
                return;
            if (!isAny3dBuildingFeatureEnabled()) {
                cleanupChunkCustomVisuals(chunk);
                return;
            }
            const priority = isPriorityCustomBuildingChunk(chunk) || "address" === reason;
            if (!runtimeState.customBuildingQueuedChunks.has(chunk)) {
                runtimeState.customBuildingQueuedChunks.add(chunk);
                priority ? runtimeState.customBuildingBuildQueue.unshift(chunk) : runtimeState.customBuildingBuildQueue.push(chunk);
            } else if (priority && runtimeState.customBuildingBuildQueue[0] !== chunk) {
                const queueIndex = runtimeState.customBuildingBuildQueue.indexOf(chunk);
                queueIndex > -1 && runtimeState.customBuildingBuildQueue.splice(queueIndex, 1);
                runtimeState.customBuildingBuildQueue.unshift(chunk);
            }
            scheduleCustomBuildingBuildPump(getCustomBuildingQueueDelay(priority), priority);
        }

        function finishCustomBuildingOverlayBuild(chunk, overlay, signature, builtCount) {
            overlay.userData.tmBuildJob = null;
            if (!builtCount) {
                overlay.parent && overlay.parent.remove(overlay);
                applyOriginalBuildingMeshVisibilityForChunk(chunk);
                queueCustomBuildingCollisionInvalidation(chunk);
                return !0;
            }
            overlay.userData.tmBuildSignature = signature;
            overlay.userData.tmOptimizedSignature = "";
            overlay.parent !== chunk.group && chunk.group.add(overlay);
            chunk.__tmCustomBuildingOverlayBounds = getCustomBuildingOverlayBounds(chunk);
            collectCustomBuildingDoorsForChunk(chunk, overlay);
            chunk.__tmCustomBuildingOverlayReady = !0;
            applyOriginalBuildingMeshVisibilityForChunk(chunk);
            queueCustomBuildingCollisionInvalidation(chunk);
            overlay.userData.tmBatchableMeshCount = countBatchableOverlayMeshes(overlay, CUSTOM_BUILDING_PERF.maxOptimizeMeshes + 1);
            overlay.userData.tmBatchableMeshCountValid = !0;
            overlay.userData.tmBatchableMeshCountLimit = CUSTOM_BUILDING_PERF.maxOptimizeMeshes + 1;
            queueCustomBuildingOverlayOptimization(chunk, overlay, signature);
            return !0;
        }

        function rebuildCustomBuildingsForChunkSlice(chunk, budgetMs, maxBuilds) {
            if (!chunk || !chunk.group || !globalState.THREE)
                return !0;
            const matches = chunk.__tmMatchedCustomBuildings || runtimeState.customBuildingEntriesByChunk.get(chunk) || [];
            const overlay = getOrCreateCustomBuildingOverlay(chunk);
            if (!overlay)
                return !0;
            const signature = getCustomBuildingOverlaySignature(matches);
            if (overlay.parent === chunk.group && overlay.userData && overlay.userData.tmBuildSignature === signature && chunk.__tmCustomBuildingOverlayReady)
                return !0;
            if (!matches.length || !isAny3dBuildingFeatureEnabled()) {
                removeCustomBuildingDoorItemsForChunk(chunk);
                clearCustomBuildingOverlayChildren(overlay);
                overlay.userData.tmBuildSignature = "";
                overlay.userData.tmBuildJob = null;
                chunk.__tmCustomBuildingOverlayReady = !1;
                overlay.parent && overlay.parent.remove(overlay);
                applyOriginalBuildingMeshVisibilityForChunk(chunk);
                queueCustomBuildingCollisionInvalidation(chunk);
                return !0;
            }
            let job = overlay.userData && overlay.userData.tmBuildJob;
            if (!job || job.signature !== signature) {
                removeCustomBuildingDoorItemsForChunk(chunk);
                overlay.parent && overlay.parent.remove(overlay);
                clearCustomBuildingOverlayChildren(overlay);
                overlay.userData.tmBuildSignature = "";
                chunk.__tmCustomBuildingOverlayReady = !1;
                job = {
                    signature,
                    matches: isDeveloperToggleEnabled("perfBuildJobMatchReuse") && Array.isArray(matches) ? matches : toSafeArray(matches).slice(),
                    index: 0,
                    builtCount: 0
                };
                overlay.userData.tmBuildJob = job;
            }
            const startedAt = performance.now();
            const budget = Math.max(2, Number(budgetMs) || CUSTOM_BUILDING_PERF.sliceBudgetMs);
            let builtThisSlice = 0;
            const sliceBuildLimit = Math.max(1, Number(maxBuilds) || CUSTOM_BUILDING_PERF.maxBuildsPerSlice);
            while (job.index < job.matches.length && builtThisSlice < sliceBuildLimit && (builtThisSlice < 1 || performance.now() - startedAt < budget)) {
                const match = job.matches[job.index++];
                try {
                    const object = buildCustomBuildingObject(match);
                    if (object) {
                        overlay.add(object);
                        job.builtCount++;
                    }
                } catch (buildError) {
                    markFeatureFault(match && match.entry && match.entry.__tmAuto3d ? "auto3dBuildings" : "customBuildings", buildError, `3D-Haus ${match && match.id || ""}`.trim());
                }
                builtThisSlice++;
            }
            return job.index >= job.matches.length ? finishCustomBuildingOverlayBuild(chunk, overlay, signature, job.builtCount) : !1;
        }

        function processCustomBuildingBuildQueue(deadline) {
            runtimeState.customBuildingBuildTimer = null;
            if (!isAny3dBuildingFeatureEnabled()) {
                runtimeState.customBuildingBuildQueue = [];
                runtimeState.customBuildingQueuedChunks = new WeakSet;
                clearCustomBuildingVisualsForLoadedChunks();
                return;
            }
            const startedAt = performance.now();
            const idleBudget = getIdleTimeRemaining(deadline, CUSTOM_BUILDING_PERF.sliceBudgetMs);
            const baseBudget = Math.max(CUSTOM_BUILDING_PERF.sliceBudgetMs, idleBudget);
            sortCustomBuildingBuildQueue();
            while (runtimeState.customBuildingBuildQueue.length) {
                const chunk = runtimeState.customBuildingBuildQueue[0];
                if (!chunk || !chunk.group) {
                    runtimeState.customBuildingBuildQueue.shift();
                    chunk && runtimeState.customBuildingQueuedChunks.delete(chunk);
                    continue;
                }
                if (!chunk.__tmCustomBuildingsPrepared) {
                    ensureChunkCustomBuildingsPrepared(chunk).catch(customBuildingError => warn(`Custom-Building-Vorbereitung fehlgeschlagen fuer Chunk ${chunk.cx}/${chunk.cz}:`, customBuildingError)).finally(() => scheduleCustomBuildingBuildPump(0));
                    break;
                }
                const priority = isPriorityCustomBuildingChunk(chunk);
                const speedFactor = getCustomBuildingStreamSpeedFactor();
                const maxBuilds = priority ? CUSTOM_BUILDING_PERF.maxBuildsPerSlice + 1 : Math.max(1, CUSTOM_BUILDING_PERF.maxBuildsPerSlice - Math.round(speedFactor * 2));
                const done = rebuildCustomBuildingsForChunkSlice(chunk, getCustomBuildingSliceBudget(priority, baseBudget), maxBuilds);
                if (done) {
                    runtimeState.customBuildingBuildQueue.shift();
                    runtimeState.customBuildingQueuedChunks.delete(chunk);
                    if (performance.now() - startedAt > baseBudget)
                        break;
                    continue;
                }
                break;
            }
            if (runtimeState.customBuildingBuildQueue.length)
                scheduleCustomBuildingBuildPump(performance.now() - startedAt > baseBudget ? 18 : getCustomBuildingQueueDelay(!1));
        }

        function rebuildCustomBuildingsForChunk(chunk, reason) {
            queueCustomBuildingRebuild(chunk, reason);
        }

        function cleanupChunkCustomVisuals(chunk) {
            invalidateWorldCollisionCacheForChunk(chunk);
            if (chunk) {
                runtimeState.customBuildingQueuedChunks.delete(chunk);
                removeCustomBuildingBuildQueueChunk(chunk);
            }
            const overlay = chunk && runtimeState.chunkCustomOverlayGroups.get(chunk);
            if (overlay) {
                runtimeState.customBuildingOptimizeQueued.delete(overlay);
                removeCustomBuildingOptimizeQueueOverlay(overlay);
                overlay.parent && overlay.parent.remove(overlay);
                clearCustomBuildingOverlayChildren(overlay);
            }
            chunk && (chunk.__tmCustomBuildingOverlayReady = !1);
            chunk && (chunk.__tmCustomBuildingOverlayBounds = null);
            runtimeState.chunkCustomOverlayGroups.delete(chunk);
            removeCustomBuildingDoorItemsForChunk(chunk);
            resetCustomBuildingPreparationForChunk(chunk);
        }

        function captureTownSignsGame(game) {
            if (!game)
                return;
            const previousGame = townSignsState.game;
            const previousScene = townSignsState.scene;
            const previousChunkManager = townSignsState.chunkManager;
            runtimeState.game = game;
            townSignsState.game = game;
            townSignsState.scene = game.scene || townSignsState.scene;
            townSignsState.chunkManager = game.chunkManager || townSignsState.chunkManager;
            patchMissionManagerRuntime(game.missionManager);
            ensureFeatureMenu(game);
            ensureStartingMoney(game);
            ensureVehicleTuningHotkey();
            ensureRuntimeInputHandlers();
            if (!game.__tmRuntimeInitialized) {
                game.__tmRuntimeInitialized = !0;
                refreshCustomBuildingDebug();
                isAny3dBuildingFeatureEnabled() && prepareCustomBuildingsForChunks(getLoadedChunks(), "game_capture");
            }
            ensureTownOverlayGroup();
            if (previousGame !== game || previousScene !== townSignsState.scene || previousChunkManager !== townSignsState.chunkManager)
                queueTownRebuild("game_capture");
            globalThis.__tmCollisionHookDebug && (globalThis.__tmCollisionHookDebug.townSigns = Object.assign(globalThis.__tmCollisionHookDebug.townSigns || {}, {
                game,
                chunkManager: townSignsState.chunkManager,
                rebuild: rebuildTownSigns,
                config: TOWN_SIGN_CONFIG
            }));
        }

        function patchBundle(requireFn) {
            if (!requireFn)
                return;
            if (globalState.patched)
                return;
            if (globalState.patchStarted && globalState.require === requireFn)
                return;

            globalState.patchStarted = !0;
            globalState.require = requireFn;

            try {
                const THREE = requireFn(REQUIRED_MODULES.THREE);
                const worldModule = requireFn(REQUIRED_MODULES.GAME_WORLD);
                const aiModule = requireFn(REQUIRED_MODULES.AI_CAR);
                const trafficModule = requireFn(REQUIRED_MODULES.TRAFFIC_RESOLVER);
                const controllableModule = requireFn(REQUIRED_MODULES.CONTROLLABLE_CAR);
                let controlManagerModule = null;
                try {
                    controlManagerModule = requireFn(REQUIRED_MODULES.CONTROL_MANAGER);
                } catch (controlManagerError) {}
                const roadModule = requireFn(REQUIRED_MODULES.ROAD_FACTORY);
                const chunkModule = requireFn(REQUIRED_MODULES.CHUNK);
                const terrainModule = requireFn(REQUIRED_MODULES.TERRAIN);
                const treeModule = requireFn(REQUIRED_MODULES.TREE_LIBRARY);
                const biomModule = requireFn(REQUIRED_MODULES.BIOM);
                const missionModule = requireFn(REQUIRED_MODULES.MISSION_MANAGER);
                const bufferGeometryUtils = requireFn(REQUIRED_MODULES.BUFFER_GEOMETRY_UTILS);
                const waterModule = requireFn(REQUIRED_MODULES.WATER);
                const geoModule = requireFn(REQUIRED_MODULES.GEO);

                const worldProto = worldModule && worldModule.GameSessionOpenWorld && worldModule.GameSessionOpenWorld.prototype;
                const aiProto = aiModule && aiModule.BetterAiCar && aiModule.BetterAiCar.prototype;
                const trafficProto = trafficModule && trafficModule.AiTrafficResolver && trafficModule.AiTrafficResolver.prototype;
                const controllableProto = controllableModule && controllableModule.ControllableCar && controllableModule.ControllableCar.prototype;
                const controlManagerProto = controlManagerModule && controlManagerModule.ControllManager && controlManagerModule.ControllManager.prototype;
                const chunkProto = chunkModule && chunkModule.Chunk && chunkModule.Chunk.prototype;
                const terrainProto = terrainModule && terrainModule.Terrain && terrainModule.Terrain.prototype;
                const biomProto = biomModule && biomModule.Biom && biomModule.Biom.prototype;
                const missionProto = missionModule && missionModule.MissionManager && missionModule.MissionManager.prototype;

                if (!trafficProto || !controllableProto || !aiProto || !chunkProto || !roadModule)
                    throw new Error("Benoetigte Prototypen konnten nicht aufgeloest werden.");
                globalState.THREE = THREE;
                townSignsState.roadModule = roadModule;
                runtimeState.game = townSignsState.game;
                runtimeState.terrainModule = terrainModule;
                runtimeState.treeModule = treeModule;
                runtimeState.biomModule = biomModule;
                runtimeState.missionModule = missionModule;
                runtimeState.geoModule = geoModule;
                runtimeState.bufferGeometryUtils = bufferGeometryUtils;

                globalThis.__tmCollisionHookDebug = {
                    require: requireFn,
                    tuning: IMPACT_TUNING,
                    modules: {
                        worldModule,
                        aiModule,
                        trafficModule,
                        controllableModule,
                        controlManagerModule,
                        roadModule,
                        chunkModule,
                        terrainModule,
                        treeModule,
                        biomModule,
                        missionModule,
                        geoModule,
                        waterModule,
                        bufferGeometryUtils,
                        THREE
                    }
                };
                isAny3dBuildingFeatureEnabled() && ensureBuildingCatalogLoaded().catch((catalogWarmupError => warn("Custom-Building-Katalog konnte beim Start nicht vorgeladen werden:", catalogWarmupError)));

                if (terrainProto && !terrainProto.__tmTerrainVisualPatched) {
                    const originalCreateTerrainMesh = terrainProto.createTerrainMesh;
                    terrainProto.createTerrainMesh = function(...args) {
                        const result = originalCreateTerrainMesh.apply(this, args);
                        const mesh = result && result[0];
                        if (mesh)
                            mesh.__tmTerrainMesh = !0;
                        return result;
                    };
                    terrainProto.__tmTerrainVisualPatched = !0;
                }

                if (waterModule && !waterModule.__tmEnhancedWaterPatched) {
                    const originalCreateWaterMesh = waterModule.createWaterMesh;
                    waterModule.createWaterMesh = function(waterData, material, chunk) {
                        if (!featureState.enhancedTerrain)
                            return "function" == typeof originalCreateWaterMesh ? originalCreateWaterMesh.apply(this, arguments) : null;
                        return createEnhancedWaterMesh(waterData, material, chunk, originalCreateWaterMesh, this);
                    };
                    waterModule.__tmEnhancedWaterPatched = !0;
                }

                if (treeModule && !treeModule.__tmEnhancedTreesPatched) {
                    const originalCreateTree = treeModule.createTree;
                    treeModule.createTree = function(x, y, z, seed, type) {
                        if (!featureState.enhancedTrees)
                            return "function" == typeof originalCreateTree ? originalCreateTree.apply(this, arguments) : [null, null];
                        const enhanced = createEnhancedTreeGeometries(x, y, z, seed, type);
                        if (enhanced[0] || enhanced[1])
                            return enhanced;
                        return "function" == typeof originalCreateTree ? originalCreateTree.apply(this, arguments) : enhanced;
                    };
                    treeModule.__tmEnhancedTreesPatched = !0;
                }

                if (biomProto && !biomProto.__tmEnhancedForestPatched) {
                    const originalCreateForest = biomProto.createForest;
                    biomProto.createForest = function(t, e, types, palette, trunkColor, density, isOrchard=!1) {
                        if (!featureState.enhancedTrees)
                            return "function" == typeof originalCreateForest ? originalCreateForest.apply(this, arguments) : {
                                leavesGeometries: [],
                                trunkGeometries: []
                            };
                        const leavesGeometries = [];
                        const trunkGeometries = [];
                        const biomIndex = this.calculateIndex(t, e);
                        const spawnCheck = seededUnit(biomIndex, 41);
                        const candidateTypes = Array.isArray(types) && types.length ? types : [treeModule.TREE_LEAF];
                        if (spawnCheck > 1 / Math.max(1, Number(density) || 1))
                            return {
                                leavesGeometries,
                                trunkGeometries
                            };
                        const {x1, y1, x2, y2} = this.createCoordPixel(t, e);
                        const centerX = (x1 + x2) / 2;
                        const centerZ = (y1 + y2) / 2;
                        const shiftX = isOrchard ? 0 : Math.sin(10 * biomIndex) * this.squareSize / 2;
                        const shiftZ = isOrchard ? 0 : Math.cos(3 * biomIndex) * this.squareSize / 2;
                        const placements = [[centerX + shiftX, centerZ + shiftZ]];
                        seededUnit(biomIndex, 73) > .72 && !isOrchard && placements.push([centerX - .35 * shiftX, centerZ - .35 * shiftZ]);
                        for (let placementIndex = 0; placementIndex < placements.length; placementIndex++) {
                            const [forestX, forestZ] = placements[placementIndex];
                            if (forestX > chunkModule.CHUNK_SIZE / 2 || forestZ > chunkModule.CHUNK_SIZE / 2 || forestX < -chunkModule.CHUNK_SIZE / 2 || forestZ < -chunkModule.CHUNK_SIZE / 2)
                                continue;
                            const terrainY = this.chunk.getTerrainYLoc(forestX, forestZ);
                            if (null == terrainY || terrainY < -999)
                                continue;
                            const treeSeed = biomIndex + 17 * placementIndex;
                            const typeIndex = Math.min(candidateTypes.length - 1, Math.floor(seededUnit(treeSeed, 11) * candidateTypes.length));
                            const selectedType = candidateTypes[typeIndex];
                            const [leavesGeometry,trunkGeometry] = treeModule.createTree(forestX, terrainY, forestZ, treeSeed, selectedType);
                            if (trunkGeometry) {
                                applyGradientVertexColors(trunkGeometry, trunkColor, treeSeed, "trunk");
                                trunkGeometries.push(trunkGeometry);
                            }
                            if (leavesGeometry) {
                                const paletteIndex = Math.min(Math.max(0, placementIndex % Math.max(1, palette.length)), Math.max(0, palette.length - 1));
                                applyGradientVertexColors(leavesGeometry, palette[paletteIndex], treeSeed, "leaf");
                                leavesGeometries.push(leavesGeometry);
                            }
                        }
                        return {
                            leavesGeometries,
                            trunkGeometries
                        };
                    };
                    biomProto.__tmEnhancedForestPatched = !0;
                }

                if (missionProto && !missionProto.__tmMissionOptionPatchFlag)
                    missionProto.__tmMissionOptionPatchFlag = !0;

                if (worldProto && !worldProto.__tmCollisionCapturePatched) {
                    const originalInitOpenWorld = worldProto.initOpenWorld;
                    worldProto.initOpenWorld = function(...args) {
                        globalThis.__tmCollisionHookDebug.game = this;
                        captureTownSignsGame(this);
                        log("GameSessionOpenWorld erfasst.");
                        return originalInitOpenWorld.apply(this, args);
                    };
                    worldProto.__tmCollisionCapturePatched = !0;
                }

                if (worldProto && !worldProto.__tmTownSignsMovePatched) {
                    const originalMove = worldProto.move;
                    worldProto.move = function(...args) {
                        captureTownSignsGame(this);
                        const before = performance.now();
                        const result = originalMove.apply(this, args);
                        const now = performance.now();
                        const previous = runtimeState.lastRuntimeUpdateAt || before;
                        runtimeState.lastRuntimeUpdateAt = now;
                        updateRuntimeSystems(this, Math.min(.08, Math.max(.001, (now - previous) / 1e3)));
                        return result;
                    };
                    worldProto.__tmTownSignsMovePatched = !0;
                }

                if (!chunkProto.__tmTownSignsBuildPatched) {
                    const originalBuild = chunkProto.build;
                    chunkProto.build = function(...args) {
                        patchBuildingFactoryForChunk(this);
                        suppressRunwayBuildings(this);
                        if (isAny3dBuildingFeatureEnabled() && !this.__tmCustomBuildingsPrepared && runtimeState.buildingConfig)
                            try {
                                prepareCustomBuildingMatchesForChunk(this, runtimeState.buildingConfig);
                            } catch (syncCustomBuildingError) {
                                warn(`Custom-Building-Vorbereitung vor Build fehlgeschlagen fuer Chunk ${this.cx}/${this.cz}:`, syncCustomBuildingError);
                            }
                        const result = originalBuild.apply(this, args);
                        rebuildTunnelBridgeOverlay(this);
                        refreshCustomBuildingDebug();
                        queueTownRebuild("chunk_build");
                        isAny3dBuildingFeatureEnabled() ? ensureChunkCustomBuildingsPrepared(this).catch((customBuildingError => warn(`Custom-Building-Vorbereitung fehlgeschlagen fuer Chunk ${this.cx}/${this.cz}:`, customBuildingError))).finally((() => rebuildCustomBuildingsForChunk(this, "chunk_build"))) : cleanupChunkCustomVisuals(this);
                        return result;
                    };
                    chunkProto.__tmTownSignsBuildPatched = !0;
                }

                if (!chunkProto.__tmTownSignsDisposePatched) {
                    const originalDispose = chunkProto.dispose;
                    chunkProto.dispose = function(...args) {
                        const result = originalDispose.apply(this, args);
                        cleanupChunkCustomVisuals(this);
                        refreshCustomBuildingDebug();
                        queueTownRebuild("chunk_dispose");
                        return result;
                    };
                    chunkProto.__tmTownSignsDisposePatched = !0;
                }

                if (!chunkProto.__tmCustomBuildingsCheckLoadedPatched) {
                    const originalCheckLoaded = chunkProto.checkLoaded;
                    chunkProto.checkLoaded = async function(...args) {
                        patchBuildingFactoryForChunk(this);
                        suppressRunwayBuildings(this);
                        const showProgress = featureState.customBuildings && (!this.__tmCustomBuildingsPrepared || isPriorityCustomBuildingChunk(this));
                        if (isAny3dBuildingFeatureEnabled()) {
                            showProgress && setCustomBuildingProgress(0, 2, isPriorityCustomBuildingChunk(this) ? "Adress-Haus vorbereiten" : "3D-Haeuser vorbereiten");
                            try {
                                await ensureChunkCustomBuildingsPrepared(this);
                                showProgress && setCustomBuildingProgress(1, 2, isPriorityCustomBuildingChunk(this) ? "Adress-Haus vorbereiten" : "3D-Haeuser vorbereiten");
                            } catch (customBuildingError) {
                                warn(`Custom-Building-Vorbereitung fehlgeschlagen fuer Chunk ${this.cx}/${this.cz}:`, customBuildingError);
                            }
                        }
                        try {
                            const result = await originalCheckLoaded.apply(this, args);
                            refreshCustomBuildingDebug();
                            queueTownRebuild("chunk_check_loaded");
                            rebuildTunnelBridgeOverlay(this);
                            isAny3dBuildingFeatureEnabled() ? rebuildCustomBuildingsForChunk(this, "chunk_check_loaded") : cleanupChunkCustomVisuals(this);
                            showProgress && setCustomBuildingProgress(2, 2, isPriorityCustomBuildingChunk(this) ? "Adress-Haus vorbereiten" : "3D-Haeuser vorbereiten");
                            showProgress && finishCustomBuildingProgress();
                            return result;
                        } catch (checkLoadedError) {
                            showProgress && finishCustomBuildingProgress();
                            throw checkLoadedError;
                        }
                    };
                    chunkProto.__tmCustomBuildingsCheckLoadedPatched = !0;
                }

                if (!trafficProto.__tmSetControlManagerPatched) {
                    const originalSetControlManager = trafficProto.setControlManager;
                    trafficProto.setControlManager = function(...args) {
                        globalThis.__tmCollisionHookDebug.resolver = this;
                        runtimeState.trafficResolver = this;
                        log("AiTrafficResolver verbunden.");
                        return originalSetControlManager.apply(this, args);
                    };
                    trafficProto.__tmSetControlManagerPatched = !0;
                }

                if (!trafficProto.__tmUpdateCarPatched) {
                    const originalUpdateCar = trafficProto.updateCar;
                    trafficProto.updateCar = function(dt, aiId) {
                        const aiCar = this.carMaps && this.carMaps.get(aiId);
                        const previousPolicePosition = aiCar && isPoliceLikeVehicle(aiCar) && getVehicleFlatPosition(aiCar);
                        const previousPolicePositionClone = previousPolicePosition && previousPolicePosition.clone ? previousPolicePosition.clone() : previousPolicePosition ? {
                            x: previousPolicePosition.x,
                            z: previousPolicePosition.z
                        } : null;
                        if (aiCar && aiCar.__tmPathRecoverState)
                            try {
                                return updateAiPathRecover(this, aiId, aiCar, dt);
                            } catch (recoverError) {
                                error(`Fehler waehrend AI-Road-Recover fuer AI#${aiId}:`, recoverError);
                                aiCar.__tmPathRecoverState = null;
                            }
                        const impactState = aiCar && aiCar.__tmImpactState;
                        impactState && removeAppliedImpactTransform(aiCar);
                        if (impactState && "recover" !== impactState.phase) {
                            setAiSpeed(this, aiId, aiCar, 0);
                            this.freezeStates[aiId] = Math.max(Number(this.freezeStates[aiId]) || 0, 45);
                        }
                        const result = originalUpdateCar.apply(this, arguments);
                        if (aiCar && !aiCar.__tmImpactState) {
                            enhanceVehicleAppearance(aiCar);
                            applyTrafficEnvironmentPolicy(this, aiId, aiCar);
                            applyPoliceVehicleHillHold(this, aiId, aiCar, previousPolicePositionClone);
                        }
                        if (aiCar && aiCar.__tmImpactState)
                            try {
                                const liveState = aiCar.__tmImpactState;
                                if (liveState && "recover" !== liveState.phase) {
                                    setAiSpeed(this, aiId, aiCar, 0);
                                    this.freezeStates[aiId] = Math.max(Number(this.freezeStates[aiId]) || 0, 45);
                                }
                                updateImpactState(aiCar, dt);
                            } catch (impactError) {
                                error(`Fehler waehrend Impact-Update fuer AI#${aiId}:`, impactError);
                                syncVehicleCrashState(aiCar, !1);
                                clearImpactState(aiCar, "ai_impact_update_error");
                            }
                        return result;
                    };
                    trafficProto.__tmUpdateCarPatched = !0;
                }

                if (controlManagerProto && !controlManagerProto.__tmSReverseDrivePatched) {
                    const originalControlUpdate = controlManagerProto.update;
                    controlManagerProto.update = function(...args) {
                        const car = this && this.controllableCar;
                        if (car && this.inCar && !this.__tmSReverseDriveActive) {
                            const speed = Number(car.speed) || 0;
                            const wantsReverse = this.moveBackward && !this.moveForward;
                            const wantsForward = this.moveForward && !this.moveBackward;
                            if (wantsReverse && speed <= .55) {
                                const oldBackward = this.moveBackward;
                                const oldForward = this.moveForward;
                                try {
                                    "function" == typeof car.turnOffCruiseControl && car.turnOffCruiseControl();
                                    "function" == typeof car.gearSet && car.gearSet(0);
                                    this.moveBackward = !1;
                                    this.moveForward = !0;
                                    this.__tmSReverseDriveActive = !0;
                                    return originalControlUpdate.apply(this, args);
                                } finally {
                                    this.__tmSReverseDriveActive = !1;
                                    this.moveBackward = oldBackward;
                                    this.moveForward = oldForward;
                                }
                            }
                            if (wantsForward && 0 === Number(car.gear)) {
                                if (speed < -.55) {
                                    const oldBackward = this.moveBackward;
                                    const oldForward = this.moveForward;
                                    try {
                                        this.moveForward = !1;
                                        this.moveBackward = !0;
                                        this.__tmSReverseDriveActive = !0;
                                        return originalControlUpdate.apply(this, args);
                                    } finally {
                                        this.__tmSReverseDriveActive = !1;
                                        this.moveBackward = oldBackward;
                                        this.moveForward = oldForward;
                                    }
                                }
                                "function" == typeof car.gearSet && car.gearSet(2);
                            }
                        }
                        return originalControlUpdate.apply(this, args);
                    };
                    controlManagerProto.__tmSReverseDrivePatched = !0;
                }

                if (!controllableProto.__tmMoveGroupPatched) {
                    const originalMoveGroup = controllableProto.moveGroup;
                    controllableProto.moveGroup = function(dtMs) {
                        const dtSeconds = (Number(dtMs) || 0) / 1e3;
                        if (this.__tmImpactState) {
                            removeAppliedImpactTransform(this);
                            stopPlayer(this);
                            const result = originalMoveGroup.apply(this, arguments);
                            try {
                                stopPlayer(this);
                                updateImpactState(this, dtSeconds);
                            } catch (impactError) {
                                error("Fehler waehrend Spieler-Impact-Update:", impactError);
                                syncVehicleCrashState(this, !1);
                                clearImpactState(this, "player_impact_update_error");
                            }
                            return result;
                        }
                        const previousSpeed = Number(this.speed) || 0;
                        runInternalModule("vehicleTuningHandling", (() => applyExtendedVehicleControls(this, dtSeconds)), null, "Erweiterte Fahrzeugsteuerung");
                        runFeatureModule("enhancedVehicles", (() => enhanceVehicleAppearance(this)), null, "Enhanced vehicle appearance");
                        const result = originalMoveGroup.apply(this, arguments);
                        runInternalModule("vehicleTuningHandling", (() => applyExtendedVehicleControls(this, dtSeconds)), null, "Erweiterte Fahrzeugsteuerung");
                        runInternalModule("vehicleTuningHandling", (() => applyVehicleTuning(this, dtSeconds, previousSpeed)), null, "Vehicle tuning handling");
                        runFeatureModule("autopilot", (() => applyAutopilotToCar(this, dtSeconds)), !1, "Autopilot drive");
                        return result;
                    };
                    controllableProto.__tmMoveGroupPatched = !0;
                }

                if (!trafficProto.__tmCollisionPatched) {
                    const originalCollision = trafficProto.collissionWithControllableCar;
                    trafficProto.collissionWithControllableCar = function() {
                        try {
                            let tmp;
                            this.mainCarInCollision = !1;
                            if (!this.controllManager || !this.controllManager.controllableCar)
                                return;

                            const player = this.controllManager.controllableCar;
                            const playerTail = Math.abs(player.getTotalEndFromCenter());
                            const playerPosition = player.getPosition();

                            for (const [aiId, aiCar] of this.carMaps) {
                                if (!this.actives[aiId] || !this.carReady[aiId] || null == aiCar)
                                    continue;
                                if (aiCar.getPosition().distanceToSquared(playerPosition) > 10000)
                                    continue;

                                const relative = aiCar.getPosition().sub(player.getPosition());
                                const sameDirection = Math.abs(aiCar.getForwardVector().angleTo(player.getForwardVector())) < Math.PI / 5;
                                const relAngle = Math.abs(relative.clone().normalize().angleTo(aiCar.getForwardVector()));
                                const aiAhead = relative.lengthSq() > aiCar.getPosition().add(aiCar.getForwardVector()).distanceToSquared(player.getPosition());
                                const nearlyStraight = relAngle < Math.PI / 10;
                                const collisionState = aiCar.isInCollision3D(player);
                                const combinedFront = this.frontSize[aiId] + playerTail + 5;

                                if (1 === collisionState) {
                                    handlePlayerVsAiCollision(this, aiId, aiCar, player);
                                    continue;
                                }

                                let [timeToImpact, impactDistance] = this.checkCollisionInTime(aiId, 0);
                                timeToImpact < 0 && ([timeToImpact, impactDistance] = this.checkCollisionInTime(aiId, .5));
                                if (timeToImpact >= 0 && timeToImpact < 4 || impactDistance >= 0 && impactDistance < 12) {
                                    this.carBefore[aiId] = Math.min(this.carBefore[aiId], impactDistance);
                                    this.locStates[aiId] = 4;
                                    this.targetSpeeds[aiId] = 0;
                                    this.freezeStates[aiId] = 10;
                                } else if ((2 === collisionState || relative.length() < combinedFront) && this.speeds[aiId] + 3 > player.speed && sameDirection && nearlyStraight && aiAhead) {
                                    this.locStates[aiId] = 4;
                                    if (relative.length() < this.frontSize[aiId] + playerTail) {
                                        this.freezeStates[aiId] = 60;
                                        this.targetSpeeds[aiId] = 0;
                                    } else {
                                        this.freezeStates[aiId] = 10;
                                        this.targetSpeeds[aiId] = Math.min(this.targetSpeeds[aiId], Math.max(0, player.speed / 2));
                                    }
                                }
                            }

                            const managedCollision = this.carManager && this.carManager.checkCollisionWithCar(player);
                            if (managedCollision) {
                                const hookState = getResolverHookState(this);
                                this.mainCarInCollision = !0;
                                setPlayerSpeed(player, speedAbs(player.speed) * .25);
                                if (typeof player.resetAcc === "function")
                                    player.resetAcc();
                                if (performance.now() - hookState.lastManagedCollisionLogAt > 500) {
                                    hookState.lastManagedCollisionLogAt = performance.now();
                                    log("Kollision mit verwaltetem Fahrzeug/Trailer erkannt. Spieler wird stark abgebremst.", managedCollision);
                                }
                            }

                            for (const [aiId, aiCar] of this.carMaps)
                                this.actives[aiId] && this.carReady[aiId] && null != aiCar && (null === (tmp = this.carManager) || void 0 === tmp ? void 0 : tmp.checkCollisionWithCar(aiCar)) && (this.carBefore[aiId] = Math.min(this.carBefore[aiId], 0),
                                this.targetSpeeds[aiId] = 0,
                                this.speeds[aiId] = 0,
                                this.locStates[aiId] = 4,
                                this.states[aiId] = 4,
                                this.freezeStates[aiId] = 10);
                        } catch (collisionError) {
                            error("Fehler im Kollisionshook, falle auf Originalfunktion zurueck:", collisionError);
                            return originalCollision.apply(this, arguments);
                        }
                    };
                    trafficProto.__tmCollisionPatched = !0;
                }

                globalState.patched = !0;
                globalThis.__tmCollisionHookDebug.townSigns = Object.assign(globalThis.__tmCollisionHookDebug.townSigns || {}, {
                    rebuild: rebuildTownSigns,
                    config: TOWN_SIGN_CONFIG
                });
                globalThis.__tmCollisionHookDebug.customTasks = CUSTOM_TASK_OPTIONS.slice();
                globalThis.__tmCollisionHookDebug.features = featureState;
                globalThis.__tmCollisionHookDebug.runtime = runtimeState;
                globalThis.__tmCollisionHookDebug.printHealthTable = printFunctionHealthTable;
                globalThis.__tmCollisionHookDebug.getHealthRows = () => getFeatureDiagnosticRows().concat(getInternalDiagnosticRows());
                globalThis.__tmTownSignsDebug = globalThis.__tmCollisionHookDebug.townSigns;
                refreshCustomBuildingDebug();
                globalThis.__tmCollisionHookDebug.game && captureTownSignsGame(globalThis.__tmCollisionHookDebug.game);
                isAny3dBuildingFeatureEnabled() && prepareCustomBuildingsForChunks(getLoadedChunks(), "bundle_patch");
                printFunctionHealthTable("bundle_patch");
                log("Hook erfolgreich installiert.");
                log("Debug-Objekt verfuegbar unter window.__tmCollisionHookDebug");
                log("Tuning-Objekt verfuegbar unter window.__tmCollisionHookConfig");
            } catch (patchError) {
                globalState.patchStarted = !1;
                error("Patchen des Bundles fehlgeschlagen:", patchError);
            }
        }

        function isTargetBundleUrl(rawUrl) {
            if (!rawUrl)
                return !1;
            try {
                const url = new URL(rawUrl, location.href);
                return BUNDLE_FILE_RE.test(url.pathname) || BUNDLE_FILE_RE.test(url.href);
            } catch (urlError) {
                return "string" == typeof rawUrl && BUNDLE_FILE_RE.test(rawUrl);
            }
        }

        function registerRequireCallback() {
            globalThis.__tmCollisionHookOnRequire = requireFn => {
                if (!requireFn)
                    return;
                log("Require-Callback aus gepatchtem Bundle erhalten.");
                patchBundle(requireFn);
            };
        }

        function patchBundleSource(source, bundleUrl) {
            if ("string" != typeof source || source.length < 1000)
                throw new Error("Bundle-Quelle war unerwartet kurz oder ungueltig.");
            if (source.includes("__tmCollisionHookOnRequire"))
                return source;

            const marker = "n(1434)";
            const markerIndex = source.lastIndexOf(marker);
            if (markerIndex < 0)
                throw new Error("Konnte den Main-Entry n(1434) im Bundle nicht finden.");

            const injection = `n.g.__tmCollisionHookRequire = n;\n    n.g.__tmCollisionHookBundleUrl = ${JSON.stringify(bundleUrl)};\n    n.g.__tmCollisionHookOnRequire && n.g.__tmCollisionHookOnRequire(n);\n    `;
            return source.slice(0, markerIndex) + injection + source.slice(markerIndex);
        }

        function cacheBustedBundleUrl(bundleUrl) {
            try {
                const url = new URL(bundleUrl, location.href);
                url.searchParams.set("__tm_hook_bundle_bust", `${Date.now()}_${Math.random().toString(36).slice(2)}`);
                return url.href;
            } catch (urlError) {
                return `${bundleUrl}${String(bundleUrl).includes("?") ? "&" : "?"}__tm_hook_bundle_bust=${Date.now()}`;
            }
        }

        function fetchBundleSourceSync(bundleUrl) {
            const requestUrl = cacheBustedBundleUrl(bundleUrl);
            const xhr = new XMLHttpRequest;
            xhr.open("GET", requestUrl, !1);
            xhr.overrideMimeType("text/plain; charset=utf-8");
            try {
                xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
                xhr.setRequestHeader("Pragma", "no-cache");
            } catch (headerError) {}
            xhr.send(null);
            if (xhr.status && (xhr.status < 200 || xhr.status >= 300))
                throw new Error(`HTTP ${xhr.status} beim Laden von ${requestUrl}`);
            return xhr.responseText;
        }

        function copyScriptAttributes(from, to) {
            for (const attr of Array.from(from.attributes || [])) {
                const attrName = attr.name.toLowerCase();
                if (["src", "async", "defer", "integrity", "crossorigin"].includes(attrName))
                    continue;
                to.setAttribute(attr.name, attr.value);
            }
        }

        function createReplacementScript(originalScript, bundleUrl) {
            const source = fetchBundleSourceSync(bundleUrl);
            const patchedSource = patchBundleSource(source, bundleUrl);
            const replacement = document.createElement("script");
            copyScriptAttributes(originalScript, replacement);
            replacement.dataset.tmCollisionHookBundle = "1";
            replacement.textContent = patchedSource;
            return replacement;
        }

        function replaceScriptInDom(scriptNode) {
            if (!(scriptNode instanceof HTMLScriptElement))
                return scriptNode;
            if (scriptNode.__tmCollisionHookHandled)
                return scriptNode;

            const bundleUrl = scriptNode.src || scriptNode.getAttribute("src");
            if (!isTargetBundleUrl(bundleUrl))
                return scriptNode;

            if (!scriptNode.parentNode)
                return scriptNode;

            if (globalState.require || globalState.patched) {
                warn("Target-Bundle scheint schon gelaufen zu sein, DOM-Ersatz wird abgebrochen:", bundleUrl);
                return scriptNode;
            }

            const replacement = createReplacementScript(scriptNode, bundleUrl);
            scriptNode.__tmCollisionHookHandled = !0;
            replacement.__tmCollisionHookHandled = !0;
            replacement.__tmCollisionHookOriginalUrl = bundleUrl;
            scriptNode.parentNode.replaceChild(replacement, scriptNode);
            globalState.bundlePatchedInDom = !0;
            globalState.observedBundleUrl = bundleUrl;
            log("Bundle-Script im DOM ersetzt:", bundleUrl);
            return replacement;
        }

        function maybeSwapDetachedScript(node) {
            if (!(node instanceof HTMLScriptElement))
                return node;
            if (node.__tmCollisionHookHandled)
                return node.__tmCollisionHookReplacement || node;

            const bundleUrl = node.src || node.getAttribute("src");
            if (!isTargetBundleUrl(bundleUrl))
                return node;

            if (globalState.require || globalState.patched) {
                warn("Target-Bundle scheint schon gelaufen zu sein, Detached-Swap wird abgebrochen:", bundleUrl);
                return node;
            }

            try {
                const replacement = createReplacementScript(node, bundleUrl);
                node.__tmCollisionHookHandled = !0;
                node.__tmCollisionHookReplacement = replacement;
                replacement.__tmCollisionHookHandled = !0;
                replacement.__tmCollisionHookOriginalUrl = bundleUrl;
                globalState.bundlePatchedInDom = !0;
                globalState.observedBundleUrl = bundleUrl;
                log("Bundle-Script vor dem Einfuegen ersetzt:", bundleUrl);
                return replacement;
            } catch (swapError) {
                error("Fehler beim Detached-Swap des Bundles:", swapError);
                return node;
            }
        }

        function installNodeInsertHook() {
            if (globalState.nodeHookInstalled)
                return;
            globalState.nodeHookInstalled = !0;

            const originalAppendChild = Node.prototype.appendChild;
            const originalInsertBefore = Node.prototype.insertBefore;
            const originalReplaceChild = Node.prototype.replaceChild;

            Node.prototype.appendChild = function(node) {
                return originalAppendChild.call(this, maybeSwapDetachedScript(node));
            };

            Node.prototype.insertBefore = function(node, referenceNode) {
                return originalInsertBefore.call(this, maybeSwapDetachedScript(node), referenceNode);
            };

            Node.prototype.replaceChild = function(newNode, oldNode) {
                return originalReplaceChild.call(this, maybeSwapDetachedScript(newNode), oldNode);
            };

            log("Node-Insert-Hook installiert.");
        }

        function installMutationScriptHook() {
            if (globalState.mutationHookInstalled)
                return;
            if ("loading" !== document.readyState)
                return;

            const observer = new MutationObserver(records => {
                if (globalState.require || globalState.patched)
                    return;
                for (const record of records)
                    for (const node of record.addedNodes)
                        if (node instanceof HTMLScriptElement) {
                            const bundleUrl = node.src || node.getAttribute("src");
                            if (isTargetBundleUrl(bundleUrl))
                                try {
                                    replaceScriptInDom(node);
                                } catch (mutationError) {
                                    error("Fehler beim Mutation-Hook fuer Script:", mutationError);
                                }
                        }
            }
            );

            observer.observe(document.documentElement || document, {
                childList: !0,
                subtree: !0
            });
            globalState.mutationHookInstalled = !0;
            globalState.bundleMutationObserver = observer;
            log("Mutation-Script-Hook installiert.");
        }

        function installBundleSourceHook() {
            if (globalState.bundleHookInstalled)
                return;
            globalState.bundleHookInstalled = !0;

            registerRequireCallback();

            if (globalThis.__tmCollisionHookRequire) {
                log("Expose-require bereits vorhanden, patche direkt.");
                patchBundle(globalThis.__tmCollisionHookRequire);
                return;
            }

            installNodeInsertHook();
            installMutationScriptHook();

            if ("loading" === document.readyState)
                log("Bundle-Source-Hook frueh installiert.");
            else
                warn(`Userscript startete erst bei readyState=${document.readyState}. Wenn das Bundle statisch frueher lief, ist nur noch ein Reload mit echter document-start-Injection zuverlaessig.`);
        }

        function installRequireSniffer() {
            if (globalState.patched || globalState.require)
                return;

            const originalCall = Function.prototype.call;
            let restored = !1;

            function restore() {
                if (restored)
                    return;
                restored = !0;
                Function.prototype.call = originalCall;
            }

            function isWebpackModuleCall(args) {
                if (!args || 3 !== args.length)
                    return !1;
                const maybeModule = args[0];
                const maybeExports = args[1];
                const maybeRequire = args[2];
                return !!maybeModule && "number" == typeof maybeModule.id && maybeModule.exports === maybeExports && "function" == typeof maybeRequire && "function" == typeof maybeRequire.amdD && "function" == typeof maybeRequire.o && "function" == typeof maybeRequire.r;
            }

            Function.prototype.call = function(thisArg, ...args) {
                if (!globalState.require)
                    try {
                        if (isWebpackModuleCall(args)) {
                            globalState.require = args[2];
                            restore();
                            queueMicrotask((() => {
                                log("Versteckter Webpack-require per Fallback-Sniffer abgegriffen.");
                                patchBundle(globalState.require);
                            }
                            ));
                        }
                    } catch (snifferError) {
                        restore();
                        error("Fehler beim Abgreifen des Webpack-require:", snifferError);
                    }
                return Reflect.apply(originalCall, this, [thisArg, ...args]);
            };

            setTimeout((() => {
                globalState.patched || globalState.require || warn("Webpack-require wurde nicht gefunden. Wenn die Konsole userscript.html zeigt, lief dein Code wahrscheinlich im Tampermonkey-Sandbox-Context oder zu spaet.");
            }
            ), 6e3);
        }

        ensureStartMenuFeatureWatcher();
        ensureDeveloperMenuHotkey();
        log("Bootstrap gestartet.", "readyState=", document.readyState, "realm=page", "href=", location.href);
        printFunctionHealthTable("bootstrap");
        installBundleSourceHook();
        installRequireSniffer();
    }

    function injectPageScript() {
        const target = document.documentElement || document.head || document.body;
        if (!target)
            return !1;
        const script = document.createElement("script");
        script.textContent = `(${pageMain.toString()})();\n//# sourceURL=tm-collision-hook.page.js`;
        target.appendChild(script);
        script.remove();
        return !0;
    }

    if (!injectPageScript()) {
        const observer = new MutationObserver((() => {
            if (injectPageScript())
                observer.disconnect();
        }
        ));
        observer.observe(document, {
            childList: !0,
            subtree: !0
        });
    }
})();
