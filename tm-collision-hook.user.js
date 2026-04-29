// ==UserScript==
// @name         Texture Override (Universal Safe)
// @match        https://terradrive.eu/*
// @grant        none
// @run-at       document-start
// @description  nothing
// @version      2.1.5.0
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
    textureLog("[Texture Hook] gestartet");

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
            ROAD_FACTORY: 5263,
            CHUNK: 4763,
            TERRAIN: 5367,
            TREE_LIBRARY: 419,
            BIOM: 495,
            MISSION_MANAGER: 5769,
            GAME_MENU: 9479,
            BUFFER_GEOMETRY_UTILS: 4754,
            GEO: 1521
        };
        const BUNDLE_FILE_RE = /(?:^|\/)index\.js(?:$|[?#])/i;
        const globalState = globalThis.__tmCollisionHookState || (globalThis.__tmCollisionHookState = {
            version: "2.1.5.0",
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
        const FEATURE_MENU_ITEMS = [{
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
        }, {
            feature: "customBuildings",
            label: "Custom buildings"
        }];
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
            roadMaterialCache: new WeakMap,
            terrainMaterialCache: new WeakMap,
            customMissionRegistry: new Map,
            missionPanelsPatched: new WeakSet,
            visualRefreshTimers: new WeakMap,
            menuPatched: !1,
            controlsPatched: !1,
            lastRuntimeUpdateAt: 0,
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
            startMenuFeatureWatcherInstalled: !1,
            playerMoney: 250,
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
            customBuildingDoorItems: [],
            customBuildingProgress: null,
            customBuildingPriorityTargets: []
        });
        const vehicleTuningState = globalThis.__tmVehicleTuningState || (globalThis.__tmVehicleTuningState = {
            installed: !1,
            visible: !1,
            active: !1,
            panel: null,
            maxSpeedKmh: 999,
            accelerationPerSecond: 50
        });
        const featureState = globalThis.__tmFeatureState || (globalThis.__tmFeatureState = {
            survival: !1,
            police: !1,
            vehicleDamage: !1,
            hardStart: !1,
            overlays: !0,
            birds: !0,
            bees: !0,
            aircraft: !0,
            shops: !0,
            customBuildings: !1
        });

        function loadFeatureStateFromCookies() {
            try {
                const cookieValue = document.cookie.split(';').find(c => c.trim().startsWith('tmFeatures='));
                if (cookieValue) {
                    const features = JSON.parse(decodeURIComponent(cookieValue.split('=')[1]));
                    Object.assign(featureState, features);
                }
            } catch (e) {
                console.warn('[TM] Failed to load feature state from cookies:', e);
            }
        }

        function saveFeatureStateToCookies() {
            try {
                const expires = new Date();
                expires.setFullYear(expires.getFullYear() + 1);
                document.cookie = `tmFeatures=${encodeURIComponent(JSON.stringify(featureState))}; expires=${expires.toUTCString()}; path=/`;
            } catch (e) {
                console.warn('[TM] Failed to save feature state to cookies:', e);
            }
        }

        loadFeatureStateFromCookies();
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
            startMenuFeatureWatcherInstalled: !!runtimeState.startMenuFeatureWatcherInstalled,
            customBuildingTextureCache: runtimeState.customBuildingTextureCache instanceof Map ? runtimeState.customBuildingTextureCache : new Map,
            customBuildingAddressCache: runtimeState.customBuildingAddressCache instanceof Map ? runtimeState.customBuildingAddressCache : new Map,
            customBuildingDoorItems: Array.isArray(runtimeState.customBuildingDoorItems) ? runtimeState.customBuildingDoorItems : [],
            customBuildingProgress: runtimeState.customBuildingProgress || null,
            customBuildingPriorityTargets: Array.isArray(runtimeState.customBuildingPriorityTargets) ? runtimeState.customBuildingPriorityTargets : [],
            autopilot: Object.assign({
                enabled: !1,
                pendingMapSelection: !1,
                targetPosition: null,
                targetRoadPosition: null,
                targetSignature: "",
                startSignature: "",
                edge: null,
                segmentIndex: 0,
                segmentT: 0,
                direction: 1,
                snapped: !1,
                linking: !1,
                lastNoticeAt: 0,
                lastLinkNoticeAt: 0
            }, runtimeState.autopilot || {}),
            playerMoney: Number.isFinite(Number(runtimeState.playerMoney)) ? Number(runtimeState.playerMoney) : 250,
            input: runtimeState.input || {
                slowLeft: !1,
                slowRight: !1,
                fastLeft: !1,
                fastRight: !1,
                fullBrake: !1,
                fire: !1
            }
        });
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
            overlays: !0,
            birds: !0,
            bees: !0,
            aircraft: !0,
            shops: !0
        }))
            "boolean" == typeof featureState[key] || (featureState[key] = value);
        vehicleTuningState.active = !!vehicleTuningState.active;
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

        function log(...args) {
            globalThis.__tmCollisionHookVerbose && console.log(PREFIX, ...args);
        }

        function warn(...args) {
            console.warn(PREFIX, ...args);
        }

        function error(...args) {
            console.error(PREFIX, ...args);
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
            return String(value || "").replace(/\s+/g, " ").trim();
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

        function getEdgeWorldPoints(edge) {
            const center = edge && edge.chunk && edge.chunk.centerVec;
            if (!edge || !edge.points || !center)
                return [];
            return edge.points.map(point => point.clone().add(center));
        }

        function isRoadEligibleForTownSigns(edge) {
            const roadModule = townSignsState.roadModule;
            if (!edge || !roadModule)
                return !1;
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
            return !!globalThis.__tmEnableOsmPlaceFetch;
        }

        function queueTownPlaceFetch(chunk) {
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
            const position = anchor.clone().addScaledVector(right, getTownRoadLateralOffset(edge)).addScaledVector(travelDirection, -TOWN_SIGN_CONFIG.edgeEntryOffset);
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
            if (townSignsState.rebuildQueued)
                return;
            townSignsState.rebuildQueued = !0;
            setTimeout((() => rebuildTownSigns(reason)), 50);
        }

        function getLoadedChunks() {
            return Object.values(townSignsState.chunkManager && townSignsState.chunkManager.loadedChunks || {}).filter(Boolean);
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

        function cloneVector3(value) {
            if (!value)
                return null;
            return value.clone ? value.clone() : new globalState.THREE.Vector3(Number(value.x) || 0, Number(value.y) || 0, Number(value.z) || 0);
        }

        function chooseSpacedTargets(targets, count, minDistance, seed) {
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
            return toSafeArray(townSignsState.debugPlaces).map(((place, index) => ({
                key: `town_${index}`,
                label: place.name,
                position: new globalState.THREE.Vector3(Number(place.center.x) || 0, Number(place.center.y) || 0, Number(place.center.z) || 0),
                radius: clamp(Number(place.radius) || 55, 35, 90)
            }))).filter((target => target.label && target.position));
        }

        function collectResidentialMissionTargets(manager) {
            return toSafeArray(manager && manager.buildings).filter((building => building && building.houseCenter)).map((building => ({
                key: `house_${building.index}`,
                label: `House ${building.index}`,
                position: building.houseCenter.clone(),
                radius: 26,
                building
            })));
        }

        function collectGasStationMissionTargets() {
            const targets = [];
            for (const chunk of getLoadedChunks())
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
            for (const chunk of getLoadedChunks())
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

        function ensureCustomMissionOptions(panel) {
            if (!panel || !panel.missionTypes || runtimeState.missionPanelsPatched.has(panel))
                return;
            for (const task of CUSTOM_TASK_OPTIONS)
                if (!panel.missionTypes.querySelector(`option[value="${task.value}"]`)) {
                    const option = document.createElement("option");
                    option.value = task.value;
                    option.textContent = task.label;
                    panel.missionTypes.appendChild(option);
                }
            runtimeState.missionPanelsPatched.add(panel);
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
                    this.missionManager.missionPanel.updateStatus("No suitable route found here");
                    this.missionManager.missionPanel.updateMissionDescriptiopn("Drive to another area or reload nearby chunks, then start the task again.");
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
                if (!player || this.completed)
                    return;
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
                this.missionManager.missionPanel.updateEntry3(stage.noMap ? `Distance: ${Math.max(0, getDistance2D(playerPos, stage.position)).toFixed(0)} m` : `ETA: ${Math.max(0, getDistance2D(playerPos, stage.position)).toFixed(0)} m`);
                this.missionManager.missionPanel.updateEntry4(`Time: ${formatMissionSeconds((Number(currentTime) || 0) - this.startedAt)}`);
                if (getDistance2D(playerPos, stage.position) <= (Number(stage.radius) || 24))
                    if (this.stageIndex >= this.stages.length - 1)
                        this.finish(currentTime, player);
                    else
                        this.setStage(this.stageIndex + 1);
            }
        }

        function patchMissionManagerRuntime(missionManager) {
            if (!missionManager || missionManager.__tmCustomMissionPatched)
                return;
            ensureCustomMissionOptions(missionManager.missionPanel);
            const originalCreateMission = missionManager.createMission;
            missionManager.createMission = function(type) {
                if (CUSTOM_TASK_OPTIONS.some((task => task.value === type))) {
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
            status && (status.textContent = `Speedhack: ${vehicleTuningState.active ? "On" : "Off"}`);
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
            const leftStrength = (runtimeState.input.slowLeft ? .45 : 0) + (runtimeState.input.fastLeft ? 1.8 : 0);
            const rightStrength = (runtimeState.input.slowRight ? .45 : 0) + (runtimeState.input.fastRight ? 1.8 : 0);
            const steer = Math.sign(leftStrength - rightStrength);
            if (steer) {
                car.delayMode = Math.max(.12, Math.min(2.2, Math.abs(leftStrength - rightStrength)));
                if (typeof car.setSteeringTarget === "function")
                    car.setSteeringTarget(steer);
                else
                    car.steeringTarget = steer * (car.mcs && car.mcs.maxSteeringAngle || .5);
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

        function applyVehicleTuning(car, dtSeconds, previousSpeed) {
            if (!car || !vehicleTuningState.active)
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
            return `${lat.toFixed(6)},${lng.toFixed(6)}`;
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

        function resetAutopilotRoadState(state) {
            state.edge = null;
            state.segmentIndex = 0;
            state.segmentT = 0;
            state.direction = 1;
            state.snapped = !1;
            state.linking = !1;
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

        function findTargetRoadPosition(position) {
            const match = findNearestRoadSegment(position, 1800);
            return match && match.point ? match.point.clone() : cloneVector3(position);
        }

        function startAutopilotToMapTarget(source) {
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
            state.lastNoticeAt = performance.now();
            notifyRuntime(`Automatik aktiv: Ziel gesetzt (${source || "map"}).`);
            syncAutopilotDebug();
            return !0;
        }

        function startAutopilotToWorldPosition(position, label, source) {
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
            state.lastNoticeAt = performance.now();
            notifyRuntime(`Navi aktiv: ${label || "Ziel gesetzt"}.`);
            syncAutopilotDebug();
            return !0;
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
            for (const [chunkKey, pois] of runtimeState.poiCache)
                for (let index = 0; index < toSafeArray(pois).length; index++)
                    addTarget(pois[index], `${chunkKey}:${index}`);
            return targets;
        }

        function collectNaviTargets(type) {
            if ("fuel" === type)
                return collectGasStationMissionTargets();
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
            return targets.filter(target => target && target.position).map(target => Object.assign({}, target, {
                distance: getDistance2D(playerPos, target.position)
            })).sort(((a, b) => a.distance - b.distance))[0] || null;
        }

        function startNaviPreset(type) {
            if ("airport" !== type && "town" !== type)
                for (const chunk of getLoadedChunks())
                    queuePoiFetch(chunk);
            const target = chooseNearestNaviTarget(collectNaviTargets(type));
            if (!target) {
                notifyRuntime("Navi: kein passendes Ziel in geladenen Daten gefunden.", "error");
                return !1;
            }
            return startAutopilotToWorldPosition(target.position, target.label || type, `preset:${type}`);
        }

        function setNaviPanelStatus(message, kind) {
            const panel = runtimeState.navPanel;
            const status = panel && panel.querySelector('[data-role="status"]');
            if (!status)
                return;
            status.textContent = message || "";
            status.style.color = "error" === kind ? "#ff9f9f" : "#9fd7ff";
        }

        function searchNaviAddress(query) {
            const text = normalizeTownLabel(query);
            if (!text)
                return setNaviPanelStatus("Bitte Adresse eingeben.", "error");
            if (!runtimeState.geoModule || "function" != typeof runtimeState.geoModule.convertProjLocalCoords) {
                setNaviPanelStatus("Navi wartet auf Geo-Modul.", "error");
                return;
            }
            runtimeState.navSearching = !0;
            setNaviPanelStatus("Suche Adresse...");
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(text)}`;
            fetch(url, {
                headers: {
                    Accept: "application/json"
                }
            }).then(response => response.json()).then(results => {
                const result = Array.isArray(results) ? results[0] : null;
                if (!result)
                    throw new Error("Adresse nicht gefunden");
                const lat = Number(result.lat);
                const lon = Number(result.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lon))
                    throw new Error("Adresse ohne Koordinaten");
                const position = runtimeState.geoModule.convertProjLocalCoords([lat, lon]);
                if (!position)
                    throw new Error("Koordinaten konnten nicht ins Spiel umgerechnet werden");
                position.y = getTerrainYWorld(position, 0);
                const label = normalizeTownLabel(result.display_name).slice(0, 72) || text;
                addCustomBuildingPriorityTarget(position, label);
                prepareCustomBuildingsNearPosition(position, "address");
                startAutopilotToWorldPosition(position, label, "address");
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
            panel.querySelector('[data-role="addressForm"]').addEventListener("submit", (event => {
                event.preventDefault();
                const input = panel.querySelector('[data-role="address"]');
                searchNaviAddress(input && input.value);
            }));
            for (const button of panel.querySelectorAll("button[data-preset]"))
                button.addEventListener("click", (() => startNaviPreset(button.dataset.preset)));
            document.body.appendChild(panel);
            runtimeState.navPanel = panel;
            return panel;
        }

        function toggleNaviPanel(forceVisible) {
            const panel = ensureNaviPanel();
            if (!panel)
                return;
            runtimeState.navVisible = null == forceVisible ? !runtimeState.navVisible : !!forceVisible;
            panel.style.display = runtimeState.navVisible ? "block" : "none";
            if (runtimeState.navVisible) {
                setNaviPanelStatus("");
                const input = panel.querySelector('[data-role="address"]');
                input && input.focus();
            }
        }

        function handleAutopilotMapHotkey() {
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
            const roadModule = townSignsState.roadModule;
            if (!roadModule)
                return !0;
            if (edge.type === roadModule.ROAD_TYPE_VIRTUAL || edge.type === roadModule.ROAD_TYPE_RACETRACK)
                return !1;
            return (Number(edge.lanesForward) || 0) > 0 || (Number(edge.lanesBackward) || 0) > 0 || !!edge.oneway;
        }

        function canDriveEdgeDirection(edge, direction) {
            if (!edge)
                return !1;
            return direction > 0 ? (Number(edge.lanesForward) || 0) > 0 || !!edge.oneway : !edge.oneway && (Number(edge.lanesBackward) || 0) > 0;
        }

        function getEdgeWorldPoints(edge) {
            const center = edge && edge.chunk && edge.chunk.centerVec;
            if (!edge || !edge.points || !center)
                return [];
            return edge.points.map(point => point.clone().add(center));
        }

        function getRoadSegmentMatch(edge, index, position) {
            const points = getEdgeWorldPoints(edge);
            const start = points[index];
            const end = points[index + 1];
            if (!start || !end)
                return null;
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

        function findNearestRoadSegment(position, maxDistance=1 / 0) {
            if (!position || !globalState.THREE)
                return null;
            let best = null;
            for (const chunk of getLoadedChunks())
                for (const edge of toSafeArray(chunk.newRoadGraph && chunk.newRoadGraph.edges)) {
                    if (!isRoadEligibleForAutopilot(edge))
                        continue;
                    const points = getEdgeWorldPoints(edge);
                    for (let index = 0; index < points.length - 1; index++) {
                        const match = getRoadSegmentMatch(edge, index, position);
                        if (!match || match.distance > maxDistance)
                            continue;
                        if (!best || match.distance < best.distance)
                            best = match;
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

        function setAutopilotRoadMatch(state, match) {
            if (!state || !match)
                return !1;
            state.edge = match.edge;
            state.segmentIndex = match.segmentIndex;
            state.segmentT = clamp(match.progress, 0, 1);
            state.direction = chooseAutopilotDirection(match, state.targetRoadPosition || state.targetPosition);
            state.snapped = !0;
            state.linking = !1;
            return !0;
        }

        function collectAutopilotOutgoingRoads(node, previousEdge) {
            const candidates = [];
            const visitNode = roadNode => {
                if (!roadNode)
                    return;
                for (const edge of toSafeArray(roadNode.edges)) {
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
            for (const pairedNode of toSafeArray(node && node.pairNodes))
                visitNode(pairedNode);
            for (const connectedNode of toSafeArray(node && node.connectNodes))
                visitNode(connectedNode);
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
                const next = chooseNextAutopilotRoad(state.edge, state.direction, target, travelVector);
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
            position.y = getTerrainYWorld(position, position.y || 0) + .04;
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
            const speed = Math.max(8, vehicleTuningState.active ? getVehicleTuningMaxSpeedMs() : getAutopilotCruiseSpeedMs(car));
            const carPosition = car.getPosition();
            const stopTarget = state.targetRoadPosition || state.targetPosition;
            if (getDistance2D(carPosition, state.targetPosition) <= 28 || stopTarget && getDistance2D(carPosition, stopTarget) <= 14) {
                stopAutopilot("Ziel erreicht", !0);
                return !0;
            }
            if (!state.edge || !state.snapped) {
                const match = findNearestRoadSegment(carPosition, 1 / 0);
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
            const pose = advanceAutopilotAlongRoad(state, speed * dt);
            if (!pose) {
                resetAutopilotRoadState(state);
                return !1;
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

        function setFeature(name, value) {
            const oldValue = featureState[name];
            featureState[name] = !!value;
            if ("hardStart" === name && featureState.hardStart) {
                featureState.survival = !0;
                featureState.police = !0;
                featureState.vehicleDamage = !0;
                setPlayerMoney(0);
                runtimeState.hardStartLocked = !0;
            }
            if ("customBuildings" === name && oldValue !== featureState.customBuildings) {
                // Toggle custom buildings visibility
                for (const [chunk, overlay] of runtimeState.chunkCustomOverlayGroups) {
                    if (featureState.customBuildings) {
                        rebuildCustomBuildingsForChunk(chunk);
                    } else {
                        overlay.parent && overlay.parent.remove(overlay);
                    }
                }
            }
            saveFeatureStateToCookies();
            syncFeatureMenu();
        }

        function syncFeatureMenu() {
            for (const panel of document.querySelectorAll("#__tmFeatureMenuSection,#__tmFeatureStartMenuSection"))
                for (const input of panel.querySelectorAll("input[data-feature]"))
                    input.checked = !!featureState[input.dataset.feature];
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

        function getElementLabelText(element) {
            return normalizeTownLabel((element && (element.textContent || element.value || element.getAttribute && element.getAttribute("aria-label"))) || "");
        }

        function findStartMenuTarget() {
            const excludedSelector = "#game_menu,#content_menu,#__tmFeatureMenuSection,#__tmFeatureStartMenuSection";
            const buttons = Array.from(document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]'));
            const openMapButton = buttons.find(element => !element.closest(excludedSelector) && /\b(open\s*map|open\s*world|start|play)\b/i.test(getElementLabelText(element)));
            if (openMapButton)
                return openMapButton.closest(".main-buttons,.buttons,.start-menu,.startMenu,.menu,.modal,.dialog,.card,section,main") || openMapButton.parentElement;
            return document.getElementById("start_menu") || document.getElementById("startMenu") || document.querySelector(".start-menu,.startMenu");
        }

        function ensureStartFeatureMenu() {
            if (!document.body)
                return;
            const target = findStartMenuTarget();
            if (!target)
                return;
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

        function createBox(size, color, position) {
            const THREE = globalState.THREE;
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), new THREE.MeshLambertMaterial({
                color
            }));
            position && mesh.position.set(position[0], position[1], position[2]);
            return mesh;
        }

        function createEllipsoid(size, color, position, material) {
            const THREE = globalState.THREE;
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), material || new THREE.MeshLambertMaterial({
                color
            }));
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
                node.geometry && typeof node.geometry.dispose === "function" && node.geometry.dispose();
                if (Array.isArray(node.material))
                    for (const material of node.material)
                        material && typeof material.dispose === "function" && material.dispose();
                else
                    node.material && typeof node.material.dispose === "function" && node.material.dispose();
            }
            ));
        }

        function enhanceVehicleAppearance(vehicle) {
            if (!vehicle || !vehicle.group)
                return;
            const oldOverlays = vehicle.group.children.filter(child => child && "__tmRoundedVehicleDetails" === child.name);
            for (const overlay of oldOverlays) {
                vehicle.group.remove(overlay);
                disposeObject3D(overlay);
            }
            vehicle.__tmAppearanceEnhanced = !1;
        }

        function isInTownArea(position) {
            if (!position)
                return !1;
            return toSafeArray(townSignsState.debugPlaces).some(place => {
                const center = new globalState.THREE.Vector3(Number(place.center && place.center.x) || 0, 0, Number(place.center && place.center.z) || 0);
                return getDistance2D(position, center) <= Math.max(Number(place.radius) || 0, 180) + 80;
            });
        }

        function applyTrafficEnvironmentPolicy(resolver, aiId, aiCar) {
            if (!resolver || !aiCar || !townSignsState.roadModule)
                return;
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
            const lightRed = new THREE.MeshBasicMaterial({
                color: 0xff2030
            });
            const lightBlue = new THREE.MeshBasicMaterial({
                color: 0x2f77ff
            });
            const glass = new THREE.MeshLambertMaterial({
                color: 0x83b8d8
            });
            group.add(createEllipsoid([5.7, 1.05, 2.2], 0x183b78, [0, .88, 0]));
            group.add(createEllipsoid([2.65, .92, 1.7], 0xf2f2ef, [-.25, 1.48, 0]));
            group.add(createEllipsoid([1.65, .5, 1.74], 0x17305e, [1.72, 1.12, 0]));
            group.add(createEllipsoid([1.3, .45, 1.62], 0x244f99, [-2.08, 1.08, 0]));
            group.add(createBox([.08, .42, 1.38], 0xffffff, [.15, 1.47, 0]));
            group.add(createBox([.08, .42, 1.38], 0xffffff, [-1.08, 1.47, 0]));
            const windshield = createBox([.12, .52, 1.42], 0x83b8d8, [1.12, 1.56, 0]);
            windshield.material = glass;
            group.add(windshield);
            const rearWindow = createBox([.12, .48, 1.36], 0x83b8d8, [-1.48, 1.54, 0]);
            rearWindow.material = glass;
            group.add(rearWindow);
            const lightbar = new THREE.Group;
            lightbar.name = "__tmPoliceLightbar";
            const red = createBox([.64, .2, .42], 0xff2030, [-.32, 1.96, -.24]);
            red.material = lightRed;
            const blue = createBox([.64, .2, .42], 0x2f77ff, [-.32, 1.96, .24]);
            blue.material = lightBlue;
            const center = createBox([.68, .12, .18], 0xf4f4f4, [-.32, 1.94, 0]);
            lightbar.add(red, blue, center);
            group.add(lightbar);
            const headLeft = createBox([.08, .22, .46], 0xfff2a8, [2.74, .86, -.55]);
            const headRight = createBox([.08, .22, .46], 0xfff2a8, [2.74, .86, .55]);
            headLeft.material = new THREE.MeshBasicMaterial({
                color: 0xfff2a8
            });
            headRight.material = headLeft.material;
            group.add(headLeft, headRight);
            const tailLeft = createBox([.08, .2, .42], 0xb60e1b, [-2.76, .86, -.55]);
            const tailRight = createBox([.08, .2, .42], 0xb60e1b, [-2.76, .86, .55]);
            tailLeft.material = new THREE.MeshBasicMaterial({
                color: 0xb60e1b
            });
            tailRight.material = tailLeft.material;
            group.add(tailLeft, tailRight);
            const wheels = [];
            for (const x of [-1.55, 1.55])
                for (const z of [-1.1, 1.1]) {
                    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .28, 16), new THREE.MeshLambertMaterial({
                        color: 0x111111
                    }));
                    wheel.rotation.x = Math.PI / 2;
                    wheel.position.set(x, .38, z);
                    group.add(wheel);
                    wheels.push(wheel);
                }
            group.userData.wheels = wheels;
            group.userData.wheelRadius = .38;
            group.userData.lightRed = red;
            group.userData.lightBlue = blue;
            return group;
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
            if (!featureState.police)
                return;
            const playerPos = getPlayerPosition();
            if (!playerPos)
                return;
            runtimeState.policeState = {
                startedAt: performance.now() / 1e3,
                lastTouchAt: performance.now() / 1e3,
                reinforcementAt: performance.now() / 1e3 + duration,
                reason,
                escapedOnce: runtimeState.policeState && runtimeState.policeState.escapedOnce || !1,
                duration
            };
            for (let index = runtimeState.policeCars.length; index < count; index++)
                spawnPoliceCar(playerPos, index);
            notifyRuntime(`Police chase started: ${reason}`);
        }

        function clearPoliceCars() {
            for (const car of runtimeState.policeCars)
                car.group && car.group.parent && car.group.parent.remove(car.group);
            runtimeState.policeCars = [];
        }

        function updatePolice(dtSeconds) {
            const player = getPlayerCar();
            const playerPos = player && player.getPosition && player.getPosition();
            if (!featureState.police || !player || !playerPos) {
                clearPoliceCars();
                runtimeState.policeState = null;
                return;
            }
            const playerSpeedKmh = speedAbs(player.speed) * 3.6;
            const inTown = isInTownArea(playerPos);
            if (!runtimeState.policeState && inTown && playerSpeedKmh > 60) {
                if (runtimeState.__tmEscapedPoliceOnce)
                    return resetPlayerWorld("Repeated speeding in town after escaping police");
                startPoliceChase("speeding in town", 1, 60);
            }
            const state = runtimeState.policeState;
            if (!state)
                return;
            if (!runtimeState.policeCars.length)
                spawnPoliceCar(playerPos, 0);
            const now = performance.now() / 1e3;
            for (const car of runtimeState.policeCars) {
                const group = car.group;
                if (!group)
                    continue;
                const dir = playerPos.clone().sub(group.position);
                dir.y = 0;
                const distance = dir.length();
                if (distance > 1e-3) {
                    dir.normalize();
                    const step = Math.min(distance, car.speed * dtSeconds);
                    group.position.addScaledVector(dir, step);
                    group.position.y = getTerrainYWorld(group.position, group.position.y);
                    group.rotation.y = getYawFromVector(dir);
                    const radius = Number(group.userData.wheelRadius) || .38;
                    for (const wheel of toSafeArray(group.userData.wheels))
                        wheel.rotation.z -= step / radius;
                }
                const flash = Math.floor(now * 9 + car.index) % 2;
                group.userData.lightRed && (group.userData.lightRed.visible = 0 === flash);
                group.userData.lightBlue && (group.userData.lightBlue.visible = 1 === flash);
                if (distance < 4.2) {
                    applyVehicleDamage(24, "police hit");
                    payPlayerMoney(100);
                    state.lastTouchAt = now;
                    notifyRuntime("Police hit you: -100 EUR", "error");
                    clearPoliceCars();
                    runtimeState.policeState = null;
                    syncFeatureMenu();
                    return;
                }
            }
            if (now >= state.reinforcementAt) {
                if (runtimeState.policeCars.length < 5) {
                    spawnPoliceCar(playerPos, runtimeState.policeCars.length);
                    state.reinforcementAt = now + state.duration;
                    notifyRuntime("Police reinforcement arrived");
                } else {
                    runtimeState.__tmEscapedPoliceOnce = !0;
                    notifyRuntime("You escaped the police.");
                    clearPoliceCars();
                    runtimeState.policeState = null;
                }
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
            panel.style.display = visible ? "block" : "none";
            const percent = Math.min(120, Math.round(damage));
            const ratio = clamp(damage / 100, 0, 1);
            const value = panel.querySelector('[data-role="value"]');
            const bar = panel.querySelector('[data-role="bar"]');
            const state = panel.querySelector('[data-role="state"]');
            value && (value.textContent = `${percent}%`);
            if (bar) {
                bar.style.width = `${Math.min(100, percent)}%`;
                bar.style.background = ratio < .35 ? "#45d17a" : ratio < .7 ? "#f4c542" : "#e64b4b";
            }
            if (state) {
                state.textContent = car && car.__tmBrokenDown ? "BROKEN" : ratio < .35 ? "OK" : ratio < .7 ? "Damaged" : "Critical";
                state.style.color = ratio < .35 ? "#9fd7ff" : ratio < .7 ? "#ffd96a" : "#ff9f9f";
            }
        }

        function ensureVehicleDamageVisuals(car) {
            if (!car || !car.cameraGroup || !globalState.THREE)
                return null;
            if (car.__tmDamageVisuals && car.__tmDamageVisuals.parent)
                return car.__tmDamageVisuals;
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmVehicleDamageVisuals";
            const scorchMaterial = new THREE.MeshBasicMaterial({
                color: 0x181818,
                transparent: !0,
                opacity: .78
            });
            const smokeMaterial = new THREE.MeshLambertMaterial({
                color: 0x5f6468,
                transparent: !0,
                opacity: .38
            });
            const sparkMaterial = new THREE.MeshBasicMaterial({
                color: 0xffa331
            });
            const dents = [
                createEllipsoid([1.1, .08, .52], 0x181818, [2.05, 1.08, -.35], scorchMaterial),
                createEllipsoid([.85, .07, .42], 0x181818, [1.25, 1.12, .62], scorchMaterial),
                createEllipsoid([.72, .06, .38], 0x181818, [-1.55, 1.04, -.72], scorchMaterial)
            ];
            for (const dent of dents)
                group.add(dent);
            const smoke = new THREE.Group;
            smoke.name = "__tmDamageSmoke";
            for (let index = 0; index < 7; index++) {
                const puff = createEllipsoid([.34 + .05 * index, .25 + .05 * index, .34 + .05 * index], 0x5f6468, [1.35 + .12 * index, 1.42 + .22 * index, -.25 + Math.sin(index) * .24], smokeMaterial.clone());
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
            syncVehicleDamageDisplay(car);
            if (!car)
                return;
            const group = ensureVehicleDamageVisuals(car);
            if (!group)
                return;
            const damage = clamp(Number(car.__tmDamage) || 0, 0, 120);
            const ratio = clamp(damage / 100, 0, 1);
            group.visible = !!featureState.vehicleDamage && ratio > .03 && !runtimeState.activeAircraft;
            if (!group.visible)
                return;
            const time = performance.now() / 1000;
            const dents = toSafeArray(group.userData.dents);
            for (let index = 0; index < dents.length; index++)
                dents[index].visible = ratio > .12 + index * .18;
            const smoke = group.userData.smoke;
            if (smoke) {
                smoke.visible = ratio > .35;
                for (let index = 0; index < smoke.children.length; index++) {
                    const puff = smoke.children[index];
                    const wave = (time * (.8 + ratio) + index * .37) % 1;
                    puff.position.y = 1.35 + index * .18 + wave * .55;
                    puff.position.x = 1.15 + Math.sin(time * 2 + index) * .18 + index * .08;
                    puff.position.z = -.2 + Math.cos(time * 1.7 + index) * .22;
                    puff.scale.setScalar(.25 + ratio * .45 + wave * .18);
                    puff.material && (puff.material.opacity = clamp(.16 + ratio * .35 - wave * .12, .08, .55));
                }
            }
            const sparks = group.userData.sparks;
            if (sparks) {
                sparks.visible = ratio > .78;
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
            car.__tmDamage = Math.min(120, (Number(car.__tmDamage) || 0) + Math.max(0, amount));
            syncVehicleDamageDisplay(car);
            if (car.__tmDamage >= 100 && !car.__tmBrokenDown) {
                car.__tmBrokenDown = !0;
                car.engineRunning = !1;
                setPlayerSpeed(car, 0);
                notifyRuntime(`Car broken (${reason}). Press E near it to tow for 180 EUR or steal a replacement.`, "error");
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
            return `${Math.round(Number(chunk && chunk.cx) || 0)}:${Math.round(Number(chunk && chunk.cz) || 0)}`;
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
            for (const chunk of getLoadedChunks())
                queuePoiFetch(chunk);
            const existing = new Set(runtimeState.overlayItems.filter(item => item.kind === "poi").map(item => item.key));
            for (const [chunkKey, pois] of runtimeState.poiCache)
                for (let index = 0; index < pois.length; index++) {
                    const key = `${chunkKey}:${index}`;
                    if (existing.has(key))
                        continue;
                    const object = createPoiObject(pois[index]);
                    overlay.add(object);
                    runtimeState.overlayItems.push({
                        kind: "poi",
                        key,
                        type: pois[index].type,
                        group: object,
                        position: pois[index].position,
                        data: pois[index]
                    });
                }
        }

        function getNearestPoi(type, maxDistance=28) {
            const playerPos = getPlayerPosition();
            if (!playerPos)
                return null;
            let best = null;
            let bestDistance = maxDistance;
            for (const item of runtimeState.overlayItems) {
                if (item.kind !== "poi" || type && item.type !== type)
                    continue;
                const distance = getDistance2D(playerPos, item.position);
                if (distance < bestDistance) {
                    best = item;
                    bestDistance = distance;
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

        function interactRuntime() {
            const now = performance.now();
            if (runtimeState.lastInteractionAt && now - runtimeState.lastInteractionAt < 450)
                return;
            runtimeState.lastInteractionAt = now;
            const car = getPlayerCar();
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
            if (car && car.__tmBrokenDown) {
                if (getPlayerMoney() >= 180) {
                    payPlayerMoney(180);
                    car.__tmDamage = 0;
                    car.__tmBrokenDown = !1;
                    car.engineRunning = !0;
                    syncVehicleDamageDisplay(car);
                    notifyRuntime("Tow truck repaired your car: -180 EUR");
                    return syncFeatureMenu();
                }
                car.__tmDamage = 0;
                car.__tmBrokenDown = !1;
                car.engineRunning = !0;
                syncVehicleDamageDisplay(car);
                startPoliceChase("stolen replacement car", 10, 180);
                notifyRuntime("You stole a replacement car. Police response incoming.", "error");
            }
        }

        function suppressRunwayBuildings(chunk) {
            if (!chunk || chunk.__tmRunwayBuildingsSuppressed || !chunk.aerowayGraph || !Array.isArray(chunk.buildings))
                return;
            const runways = toSafeArray(chunk.aerowayGraph.edges).filter(edge => edge && typeof edge.getLength === "function" && edge.getLength() >= 330);
            if (!runways.length)
                return;
            chunk.__tmRunwayBuildingsSuppressed = !0;
            chunk.buildings = chunk.buildings.filter(building => {
                const center = building && building.houseCenterLocal;
                if (!center)
                    return !0;
                for (const runway of runways) {
                    const points = runway.points || [];
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
                        if (Math.hypot(center.x - px, center.z - pz) < Math.max(45, Number(runway.width) / 2 + 35))
                            return !1;
                    }
                }
                return !0;
            });
        }

        function getAirportEntries() {
            const airports = [];
            for (const chunk of getLoadedChunks()) {
                if (!chunk || !chunk.aerowayGraph || !chunk.centerVec)
                    continue;
                const edges = toSafeArray(chunk.aerowayGraph.edges);
                for (let index = 0; index < edges.length; index++) {
                    const edge = edges[index];
                    if (!edge || typeof edge.getLength !== "function" || edge.getLength() < 330)
                        continue;
                    const points = edge.points.map(point => point.clone().add(chunk.centerVec));
                    const start = points[0];
                    const end = points[points.length - 1];
                    const direction = end.clone().sub(start);
                    direction.y = 0;
                    if (direction.lengthSq() < 1e-6)
                        continue;
                    direction.normalize();
                    const center = start.clone().lerp(end, .5);
                    airports.push({
                        key: `${chunkPoiKey(chunk)}:runway:${index}`,
                        chunk,
                        edge,
                        points,
                        center,
                        direction,
                        side: new globalState.THREE.Vector3(-direction.z,0,direction.x),
                        length: edge.getLength(),
                        width: Number(edge.width) || 30
                    });
                }
            }
            runtimeState.airports = airports;
            return airports;
        }

        function createAircraftModel(type) {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = `__tmAircraft:${type}`;
            const white = new THREE.MeshLambertMaterial({
                color: "helicopter" === type ? 0xe7efe7 : 0xf0f4fa
            });
            const dark = new THREE.MeshLambertMaterial({
                color: 0x1f2833
            });
            const glass = new THREE.MeshLambertMaterial({
                color: 0x89c2dc
            });
            const accentColor = "helicopter" === type ? 0x2c855c : "jet" === type ? 0xd84545 : "passenger" === type ? 0x2e6fc6 : 0xf0b73f;
            const accent = new THREE.MeshLambertMaterial({
                color: accentColor
            });
            const lightRed = new THREE.MeshBasicMaterial({
                color: 0xff2935
            });
            const lightGreen = new THREE.MeshBasicMaterial({
                color: 0x2ff072
            });
            const lightWhite = new THREE.MeshBasicMaterial({
                color: 0xffffff
            });
            const length = "passenger" === type ? 86 : "jet" === type ? 24 : "helicopter" === type ? 15 : 18;
            const bodyRadius = "passenger" === type ? 3.6 : "jet" === type ? 1.4 : "helicopter" === type ? 1.1 : 1.25;
            const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius, bodyRadius * .75, length, 18), white);
            fuselage.rotation.z = Math.PI / 2;
            group.add(fuselage);
            const nose = new THREE.Mesh(new THREE.ConeGeometry(bodyRadius, bodyRadius * 2.2, 18), white);
            nose.rotation.z = -Math.PI / 2;
            nose.position.x = length / 2 + bodyRadius;
            group.add(nose);
            const tail = new THREE.Mesh(new THREE.ConeGeometry(bodyRadius * .75, bodyRadius * 1.8, 18), accent);
            tail.rotation.z = Math.PI / 2;
            tail.position.x = -length / 2 - bodyRadius * .6;
            group.add(tail);
            const cockpit = createBox([bodyRadius * 2.2, bodyRadius * .62, bodyRadius * 1.25], 0x89c2dc, [length * .34, bodyRadius * .35, 0]);
            cockpit.material = glass;
            group.add(cockpit);
            const stripe = createBox([length * .78, bodyRadius * .18, bodyRadius * 2.05], accentColor, [-length * .04, -bodyRadius * .18, 0]);
            group.add(stripe);
            const rotors = [];
            const wheels = [];
            const lights = [];
            if ("helicopter" === type) {
                const mainRotor = new THREE.Group;
                mainRotor.name = "__tmRotorMain";
                mainRotor.add(createBox([9.8, .16, .28], 0x202326, [0, 0, 0]));
                mainRotor.add(createBox([.28, .16, 9.8], 0x202326, [0, 0, 0]));
                mainRotor.position.set(0, bodyRadius + 1.22, 0);
                group.add(mainRotor);
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
            } else {
                const wingSpan = "passenger" === type ? 78 : "jet" === type ? 20 : 16;
                const wing = createBox([length * .26, .28, wingSpan], 0xd7dde8, [length * .02, 0, 0]);
                group.add(wing);
                const tailWing = createBox([length * .12, .2, wingSpan * .28], 0xd7dde8, [-length * .46, bodyRadius * .45, 0]);
                group.add(tailWing);
                const fin = createBox([length * .08, bodyRadius * 2.2, .28], accentColor, [-length * .48, bodyRadius * 1.2, 0]);
                group.add(fin);
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
                        const engine = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.2, 16), dark);
                        engine.rotation.z = Math.PI / 2;
                        engine.position.set(length * .02, -1.2, z);
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
                }
                const gearXs = "passenger" === type ? [-length * .22, length * .22] : [-length * .22, length * .18];
                for (const x of gearXs)
                    for (const z of [-bodyRadius * 1.05, bodyRadius * 1.05]) {
                        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius * .18, bodyRadius * .18, bodyRadius * .16, 12), dark);
                        wheel.rotation.x = Math.PI / 2;
                        wheel.position.set(x, -bodyRadius - .25, z);
                        group.add(wheel);
                        wheels.push(wheel);
                    }
                const noseGear = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius * .16, bodyRadius * .16, bodyRadius * .14, 12), dark);
                noseGear.rotation.x = Math.PI / 2;
                noseGear.position.set(length * .38, -bodyRadius - .2, 0);
                group.add(noseGear);
                wheels.push(noseGear);
                const leftLight = createBox([.22, .18, .22], 0xff2935, [length * .02, .08, -wingSpan / 2]);
                leftLight.material = lightRed;
                const rightLight = createBox([.22, .18, .22], 0x2ff072, [length * .02, .08, wingSpan / 2]);
                rightLight.material = lightGreen;
                group.add(leftLight, rightLight);
                lights.push(leftLight, rightLight);
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
            for (const rotor of toSafeArray(group.userData.rotors)) {
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
            const radius = Number(group.userData.wheelRadius) || .28;
            for (const wheel of toSafeArray(group.userData.wheels))
                wheel.rotation.z -= motion * dt / radius;
            const flash = Math.floor(performance.now() / 160) % 2;
            for (let index = 0; index < toSafeArray(group.userData.lights).length; index++)
                group.userData.lights[index].visible = index === group.userData.lights.length - 1 || flash === index % 2;
        }

        function createAirportOverlay(airport) {
            const overlay = ensureRuntimeOverlayGroup();
            if (!overlay || runtimeState.overlayItems.some(item => item.kind === "airport" && item.key === airport.key))
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
            }
        }

        function ensureAirportSystems() {
            if (!featureState.aircraft)
                return;
            for (const airport of getAirportEntries())
                createAirportOverlay(airport);
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
            const keep = [];
            for (const bot of toSafeArray(runtimeState.botAircraft)) {
                bot.age += dtSeconds;
                const dir = bot.airport.direction;
                bot.speed = Math.min("jet" === bot.type ? 110 : 86, bot.speed + dtSeconds * ("jet" === bot.type ? 18 : 12));
                bot.group.position.addScaledVector(dir, bot.speed * dtSeconds);
                const runwayProgress = bot.group.position.clone().sub(bot.airport.center).dot(dir);
                const groundY = getTerrainYWorld(bot.group.position, 0) + 1.6;
                const climb = clamp((runwayProgress + bot.airport.length * .35) / Math.max(120, bot.airport.length * .8), 0, 1);
                bot.group.position.y = groundY + climb * ("jet" === bot.type ? 420 : 280);
                bot.group.rotation.y = bot.heading;
                bot.group.rotation.z = Math.sin(bot.age * .8) * .05;
                animateAircraftVisual(bot.group, bot.speed, dtSeconds);
                if (bot.age < 95 && bot.group.parent)
                    keep.push(bot);
                else
                    bot.group.parent && bot.group.parent.remove(bot.group);
            }
            runtimeState.botAircraft = keep;
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
            let bestDistance = 70;
            for (const item of runtimeState.overlayItems) {
                if (item.kind !== "aircraft")
                    continue;
                const distance = getDistance2D(playerPos, item.group.position);
                if (distance < bestDistance) {
                    best = item;
                    bestDistance = distance;
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
            const forward = new globalState.THREE.Vector3(Math.cos(aircraft.heading),0,-Math.sin(aircraft.heading));
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
            rocket.userData.velocity = forward.clone().multiplyScalar(120);
            rocket.userData.life = 4;
            overlay.add(rocket);
            runtimeState.projectileModels.push(rocket);
        }

        function updateProjectiles(dtSeconds) {
            const keep = [];
            for (const projectile of runtimeState.projectileModels) {
                projectile.userData.life -= dtSeconds;
                let target = null;
                let targetDistance = 1 / 0;
                for (const police of runtimeState.policeCars) {
                    const distance = police.group ? police.group.position.distanceTo(projectile.position) : 1 / 0;
                    if (distance < targetDistance) {
                        target = police.group;
                        targetDistance = distance;
                    }
                }
                if (target && targetDistance < 220) {
                    const desired = target.position.clone().sub(projectile.position).normalize().multiplyScalar(120);
                    projectile.userData.velocity.lerp(desired, Math.min(1, dtSeconds * 1.8));
                }
                projectile.position.addScaledVector(projectile.userData.velocity, dtSeconds);
                if (target && targetDistance < 5) {
                    target.parent && target.parent.remove(target);
                    runtimeState.policeCars = runtimeState.policeCars.filter(police => police.group !== target);
                    projectile.userData.life = 0;
                }
                if (projectile.userData.life > 0)
                    keep.push(projectile);
                else
                    projectile.parent && projectile.parent.remove(projectile);
            }
            runtimeState.projectileModels = keep;
        }

        function createBirdFlock(center, seed) {
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmBirdFlock";
            const mat = new THREE.MeshBasicMaterial({
                color: 0x1d2428
            });
            for (let i = 0; i < 9; i++) {
                const bird = createBox([.65, .08, .18], 0x1d2428, [Math.sin(i) * 8, Math.cos(i * 1.7) * 2, Math.cos(i) * 7]);
                bird.material = mat;
                group.add(bird);
            }
            group.position.copy(center);
            group.position.y += 45 + 20 * seededUnit(seed, 3);
            group.userData.seed = seed;
            return group;
        }

        function ensureWildlife() {
            const overlay = ensureRuntimeOverlayGroup();
            const playerPos = getPlayerPosition();
            if (!overlay || !playerPos)
                return;
            if (featureState.birds) {
                for (const chunk of getLoadedChunks()) {
                    const key = `birds:${chunkPoiKey(chunk)}`;
                    if (runtimeState.overlayItems.some(item => item.key === key))
                        continue;
                    if (seededUnit(chunk.cx + chunk.cz, 21) < .42)
                        continue;
                    const center = chunk.centerVec ? chunk.centerVec.clone() : new globalState.THREE.Vector3(chunk.cx,0,chunk.cz);
                    const flock = createBirdFlock(center, chunk.cx + chunk.cz);
                    overlay.add(flock);
                    runtimeState.overlayItems.push({
                        kind: "birds",
                        key,
                        group: flock,
                        position: center
                    });
                }
            }
            if (featureState.bees) {
                for (const item of runtimeState.overlayItems.filter(item => item.kind === "poi" && item.type === "apiary")) {
                    const key = `bees:${item.key}`;
                    if (runtimeState.overlayItems.some(existing => existing.key === key))
                        continue;
                    const bees = new globalState.THREE.Group;
                    bees.name = "__tmBeeSwarm";
                    for (let i = 0; i < 16; i++) {
                        const bee = createBox([.12, .08, .08], 0xffd21f, [Math.sin(i * 2.1) * 2, 1 + Math.cos(i) * .7, Math.cos(i * 1.4) * 2]);
                        bees.add(bee);
                    }
                    bees.position.copy(item.position);
                    overlay.add(bees);
                    runtimeState.overlayItems.push({
                        kind: "bees",
                        key,
                        group: bees,
                        position: item.position
                    });
                }
            }
        }

        function updateOverlayCullingAndAnimation(dtSeconds) {
            const playerPos = getPlayerPosition();
            if (!playerPos)
                return;
            runtimeState.overlayTick += dtSeconds;
            for (const item of runtimeState.overlayItems) {
                if (!item.group || !item.position)
                    continue;
                const distance = getDistance2D(playerPos, item.group.position || item.position);
                const limit = item.kind === "airport" || item.kind === "aircraft" ? 6500 : item.kind === "birds" ? 1800 : 900;
                item.group.visible = !featureState.overlays || distance <= limit || item.data && item.data.active;
                if (!item.group.visible)
                    continue;
                if (item.kind === "birds") {
                    item.group.position.x += Math.sin(runtimeState.overlayTick * .2 + item.group.userData.seed) * dtSeconds * 5;
                    item.group.position.z += Math.cos(runtimeState.overlayTick * .23 + item.group.userData.seed) * dtSeconds * 5;
                    item.group.rotation.y += dtSeconds * .12;
                    for (const child of item.group.children)
                        child.rotation.z = Math.sin(runtimeState.overlayTick * 8 + child.position.x) * .45;
                } else if (item.kind === "bees") {
                    for (let index = 0; index < item.group.children.length; index++) {
                        const bee = item.group.children[index];
                        bee.position.x = Math.sin(runtimeState.overlayTick * 4 + index) * 2.2;
                        bee.position.z = Math.cos(runtimeState.overlayTick * 3.3 + index * 1.7) * 2.2;
                    }
                } else if (item.kind === "aircraft" && !(item.data && item.data.active)) {
                    animateAircraftVisual(item.group, item.data && item.data.speed || 0, dtSeconds);
                }
            }
        }

        function updateCustomBuildingDoors(dtSeconds) {
            if (!runtimeState.customBuildingDoorItems.length)
                return;
            runtimeState.customBuildingDoorAccumulator = (Number(runtimeState.customBuildingDoorAccumulator) || 0) + Math.max(.001, Number(dtSeconds) || .016);
            if (runtimeState.customBuildingDoorAccumulator < .05)
                return;
            const doorDt = Math.min(.12, runtimeState.customBuildingDoorAccumulator);
            runtimeState.customBuildingDoorAccumulator = 0;
            const playerPos = getPlayerPosition();
            if (!playerPos || !globalState.THREE)
                return;
            const worldPosition = new globalState.THREE.Vector3;
            for (let index = runtimeState.customBuildingDoorItems.length - 1; index >= 0; index--) {
                const item = runtimeState.customBuildingDoorItems[index];
                const group = item && item.group;
                const state = group && group.userData && group.userData.tmDoor;
                if (!group || !group.parent || !state) {
                    runtimeState.customBuildingDoorItems.splice(index, 1);
                    continue;
                }
                group.getWorldPosition(worldPosition);
                const target = getDistance2D(playerPos, worldPosition) <= state.radius ? 1 : 0;
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

        function updateRuntimeSystems(game, dtSeconds) {
            runtimeState.game = game || runtimeState.game;
            ensureFeatureMenu(game);
            ensureVehicleTuningHotkey();
            ensureRuntimeInputHandlers();
            const dt = Math.min(.08, Math.max(.001, Number(dtSeconds) || .016));
            updateAutopilotMapSelection();
            rebuildPoiOverlays();
            ensureAirportSystems();
            updateBotAircraft(dt);
            ensureWildlife();
            updateActiveAircraft(dt);
            updateProjectiles(dt);
            updateOverlayCullingAndAnimation(dt);
            updateCustomBuildingDoors(dt);
            updatePolice(dt);
            updateSurvival(dt);
            updateHardStartLock();
            updateVehicleDamageVisuals(dt);
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

        function enhanceTerrainMesh(chunk) {
            if (!chunk || !chunk.group)
                return;
            chunk.group.traverse((node => {
                if (!node || !node.isMesh || !node.__tmTerrainMesh)
                    return;
                const material = node.material;
                if (!material)
                    return;
                material.map && setTextureQuality(material.map);
                material.needsUpdate = !0;
            }
            ));
        }

        function createRoadMaterial(baseMaterial) {
            if (!globalState.THREE)
                return baseMaterial;
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
            if (!chunk || !chunk.roadMeshes || !globalState.THREE)
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
                    enhanceTerrainMesh(chunk);
                    enhanceRoadMeshes(chunk);
                    rebuildCustomBuildingsForChunk(chunk);
                } catch (visualError) {
                    error(`Fehler beim Visual-Refresh fuer Chunk ${chunk.cx}/${chunk.cz}:`, visualError);
                }
            }
            ), 30);
            runtimeState.visualRefreshTimers.set(chunk, timer);
        }

        function mergeGeometriesSafe(geometries) {
            const usable = geometries.filter(Boolean);
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
            if (material && material.map) {
                if (!normalized.attributes.uv)
                    normalized.setAttribute("uv", new globalState.THREE.Float32BufferAttribute(new Float32Array(2 * normalized.attributes.position.count),2));
            } else {
                for (const attributeName of Object.keys(normalized.attributes))
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
            return [
                material.type || "Material",
                color,
                map,
                material.transparent || opacity < 1 ? 1 : 0,
                opacity,
                null != material.side ? material.side : "side",
                material.depthWrite === !1 ? 0 : 1,
                material.vertexColors ? 1 : 0
            ].join("|");
        }

        function cloneMaterialForBatch(material) {
            const THREE = globalState.THREE;
            const clone = material && "function" == typeof material.clone ? material.clone() : new THREE.MeshLambertMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide
            });
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
            mesh.geometry && "function" == typeof mesh.geometry.dispose && mesh.geometry.dispose();
            if (Array.isArray(mesh.material))
                for (const material of mesh.material)
                    material && "function" == typeof material.dispose && material.dispose();
            else
                mesh.material && "function" == typeof mesh.material.dispose && mesh.material.dispose();
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
            while (overlay.children.length) {
                const child = overlay.children[0];
                overlay.remove(child);
                disposeObject3D(child);
            }
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
                for (const geometry of outputGeometries) {
                    geometry.computeBoundingSphere && geometry.computeBoundingSphere();
                    geometry.computeBoundingBox && geometry.computeBoundingBox();
                    const mesh = new THREE.Mesh(geometry,batch.material.clone ? batch.material.clone() : batch.material);
                    mesh.name = batch.transparent ? "__tmCustomBuildingGlassBatch" : "__tmCustomBuildingStaticBatch";
                    mesh.userData.tmNoBatch = !0;
                    if (batch.transparent) {
                        mesh.renderOrder = 20;
                        mesh.material.transparent = !0;
                        mesh.material.depthWrite = !1;
                    }
                    overlay.add(mesh);
                }
                batch.material && "function" == typeof batch.material.dispose && batch.material.dispose();
            }
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

        function getBuildingDebugId(chunk, building) {
            return `${Math.round(Number(chunk && chunk.cx) || 0)}:${Math.round(Number(chunk && chunk.cz) || 0)}/${Number(building && building.index) || 0}`;
        }

        function refreshCustomBuildingDebug() {
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
            try {
                const getter = new Function(`${source}\n;return ${globalKeys.map((key => `typeof ${key} !== "undefined" ? ${key} : void 0`)).join(" || ")};`);
                return getter();
            } catch (scriptError) {}
            return (new Function(`return (${source});`))();
        }

        function normalizeBuildingCatalog(rawCatalog) {
            if (!rawCatalog || "object" != typeof rawCatalog)
                return {
                    templates: {},
                    buildings: []
                };
            const templates = rawCatalog.templates && "object" == typeof rawCatalog.templates ? cloneJson(rawCatalog.templates, {}) : {};
            const rawBuildings = rawCatalog.buildings && "object" == typeof rawCatalog.buildings ? rawCatalog.buildings : rawCatalog;
            const buildings = Array.isArray(rawBuildings) ? rawBuildings.map(((entry, index) => Object.assign({
                id: `entry_${index}`
            }, entry))) : Object.entries(rawBuildings).filter((([key]) => "templates" !== key)).map((([key, entry]) => Object.assign({
                id: key
            }, entry)));
            return {
                templates,
                buildings
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
            runtimeState.customBuildingProgress = {
                panel,
                hideTimer: 0
            };
            return panel;
        }

        function setCustomBuildingProgress(done, total, label) {
            const panel = ensureCustomBuildingProgressPanel();
            if (!panel)
                return;
            const state = runtimeState.customBuildingProgress || (runtimeState.customBuildingProgress = {
                panel
            });
            state.hideTimer && clearTimeout(state.hideTimer);
            const percent = total > 0 ? clamp(Math.round(done / total * 100), 0, 100) : 0;
            const labelNode = panel.querySelector('[data-role="label"]');
            const valueNode = panel.querySelector('[data-role="value"]');
            const barNode = panel.querySelector('[data-role="bar"]');
            labelNode && (labelNode.textContent = label || "Haeuser optimieren");
            valueNode && (valueNode.textContent = `${percent}%`);
            barNode && (barNode.style.width = `${percent}%`);
            panel.style.display = "block";
        }

        function finishCustomBuildingProgress() {
            const panel = runtimeState.customBuildingProgress && runtimeState.customBuildingProgress.panel;
            if (!panel)
                return;
            runtimeState.customBuildingProgress.hideTimer && clearTimeout(runtimeState.customBuildingProgress.hideTimer);
            runtimeState.customBuildingProgress.hideTimer = setTimeout((() => {
                panel.style.display = "none";
            }
            ), 900);
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
            const key = text.toLowerCase();
            if (runtimeState.customBuildingAddressCache.has(key)) {
                const cached = runtimeState.customBuildingAddressCache.get(key);
                return cached && "function" == typeof cached.then ? await cached : cached;
            }
            const promise = fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(text)}`, {
                headers: {
                    Accept: "application/json"
                }
            }).then((response => response.json())).then((results => {
                const result = Array.isArray(results) ? results[0] : null;
                const lat = Number(result && result.lat);
                const lon = Number(result && result.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lon))
                    return null;
                const position = runtimeState.geoModule.convertProjLocalCoords([lat, lon]);
                return position ? {
                    x: Number(position.x) || 0,
                    z: Number(position.z) || 0,
                    label: normalizeTownLabel(result.display_name || text)
                } : null;
            })).catch((addressError => {
                warn(`Adresse fuer Custom-Haus konnte nicht aufgeloest werden (${text}):`, addressError);
                return null;
            }));
            runtimeState.customBuildingAddressCache.set(key, promise);
            const resolved = await promise;
            runtimeState.customBuildingAddressCache.set(key, resolved);
            return resolved;
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
                if (!position)
                    continue;
                rawEntry.match = deepMergeConfig(match, {
                    near: [position.x, position.z],
                    radius: Math.max(12, Number(match.radius || match.addressRadius) || 45),
                    __addressResolved: position.label || addressText
                });
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
            for (const chunk of getLoadedChunks()) {
                chunk.__tmCustomBuildingsPrepared = !1;
                chunk.__tmCustomBuildingsPreparePromise = null;
                chunk.__tmMatchedCustomBuildings = [];
                queueChunkVisualRefresh(chunk, "custom_building_reload");
            }
            return ensureBuildingCatalogLoaded();
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

        function isAuto3dCatalogEnabled(catalog) {
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
            const fallback = templates && Object.keys(templates).find((templateName => templateName && "modeler_house_demo" !== templateName));
            return fallback || null;
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
                staticDoor: !0
            }];
            if (shopLike)
                parts.push({
                    type: "panel",
                    size: [5.5, .85, .08],
                    position: [0, 3.05, -4.1],
                    rotation: [0, 0, 0],
                    color: 0x2a8f55,
                    materialKind: "metal"
                });
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
                    cutHoles: !1
                },
                parts
            };
        }

        function createAuto3dBuildingEntry(building, chunk, catalog) {
            if (!building || !building.houseCenter || !Array.isArray(building.points) || building.points.length < 3)
                return null;
            const templateName = pickAutoBuildingTemplate(building, chunk, catalog && catalog.templates);
            const id = `auto3d_${getBuildingDebugId(chunk, building)}`;
            const entry = templateName ? {
                id,
                template: templateName,
                match: {
                    id: getBuildingDebugId(chunk, building)
                },
                __tmAuto3d: !0
            } : createGeneratedAuto3dBuildingEntry(building, chunk, id);
            const resolved = resolveBuildingTemplate(entry, catalog && catalog.templates);
            return deepMergeConfig(resolved, {
                __tmAuto3d: !0,
                windows: {
                    cutHoles: !1
                }
            });
        }

        function getBuildingFootprint(building, spec) {
            const rawPoints = Array.isArray(spec && spec.footprint) && spec.footprint.length >= 3 ? spec.footprint : toSafeArray(building && building.points);
            if (!rawPoints.length)
                return [];
            const points = rawPoints.map((point => ({
                x: Number(Array.isArray(point) ? point[0] : point.x) || 0,
                z: Number(Array.isArray(point) ? point[1] : point.z) || 0
            })));
            const inset = Number(spec && spec.base && spec.base.inset) || 0;
            if (Math.abs(inset) < 1e-6)
                return points;
            const centroid = points.reduce(((acc, point) => ({
                x: acc.x + point.x,
                z: acc.z + point.z
            })), {
                x: 0,
                z: 0
            });
            centroid.x /= points.length;
            centroid.z /= points.length;
            return points.map((point => {
                const directionX = centroid.x - point.x;
                const directionZ = centroid.z - point.z;
                const length = Math.hypot(directionX, directionZ) || 1;
                return {
                    x: point.x + directionX / length * inset,
                    z: point.z + directionZ / length * inset
                };
            }
            ));
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
                return CUSTOM_BUILDING_FALLBACK_TEXTURE_URL;
            return spec.textureUrl || spec.texture || spec.imageUrl || spec.image || spec.material && (spec.material.textureUrl || spec.material.texture || spec.material.imageUrl || spec.material.image) || spec.base && (spec.base.textureUrl || spec.base.texture || spec.base.imageUrl || spec.base.image) || spec.textureId || spec.base && spec.base.textureId || CUSTOM_BUILDING_FALLBACK_TEXTURE_URL;
        }

        function applyCustomBuildingTexture(material, textureValue, repeatValue) {
            if (!material || !globalState.THREE)
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
                if (url !== CUSTOM_BUILDING_FALLBACK_TEXTURE_URL)
                    applyCustomBuildingTexture(material, CUSTOM_BUILDING_FALLBACK_TEXTURE_URL, repeatValue);
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
            const material = new globalState.THREE.MeshBasicMaterial({
                color: null != colorValue ? colorValue : 0xffffff,
                side: globalState.THREE.DoubleSide
            });
            const textureValue = getCustomBuildingTextureValue(spec);
            return applyCustomBuildingTexture(material, textureValue, spec && (spec.textureRepeat || spec.repeat || spec.base && (spec.base.textureRepeat || spec.base.repeat)));
        }

        function computeWindowLayout(edgeLength, bodyHeight, sideSpec) {
            if (!sideSpec || !1 === sideSpec.enabled)
                return {
                    rects: []
                };
            const margin = Math.max(.35, Number(sideSpec.margin) || .8);
            const width = Math.max(.3, Number(sideSpec.width) || 1.05);
            const height = Math.max(.35, Number(sideSpec.height) || 1.35);
            const gap = Math.max(.15, Number(sideSpec.gap) || .65);
            const rows = Math.max(1, Math.round(Number(sideSpec.rows) || Math.max(1, Math.round((bodyHeight - 1.8) / 2.4))));
            const availableLength = Math.max(0, edgeLength - 2 * margin);
            const cols = Math.max(1, Math.round(Number(sideSpec.cols) || Math.max(1, Math.floor((availableLength + gap) / (width + gap)))));
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
                    if (x2 - x1 > .08 && y2 - y1 > .08)
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
            return {
                rects,
                width,
                height,
                gap,
                rows,
                cols,
                bottom,
                rowSpacing
            };
        }

        function createCustomBuildingWallBody(points, baseY, bodyHeight, colorValue, spec) {
            if (!globalState.THREE || points.length < 3)
                return null;
            const THREE = globalState.THREE;
            const group = new THREE.Group;
            group.name = "__tmCustomBuildingWindowCutBody";
            const material = createCustomBuildingMaterial(colorValue, spec);
            const center = points.reduce(((acc, point) => ({
                x: acc.x + point.x,
                z: acc.z + point.z
            })), {
                x: 0,
                z: 0
            });
            center.x /= points.length;
            center.z /= points.length;
            const windowsSpec = deepMergeConfig(spec && spec.windows || {}, {
                sides: spec && spec.sides || {}
            });
            const wallDepth = Math.max(.02, Number(spec && spec.base && (spec.base.wallDepth || spec.base.depth)) || .12);
            for (let index = 0; index < points.length; index++) {
                const current = points[index];
                const next = points[(index + 1) % points.length];
                const dxRaw = next.x - current.x;
                const dzRaw = next.z - current.z;
                const edgeLength = Math.hypot(dxRaw, dzRaw);
                if (edgeLength < .4)
                    continue;
                const dx = dxRaw / edgeLength;
                const dz = dzRaw / edgeLength;
                const midX = (current.x + next.x) / 2;
                const midZ = (current.z + next.z) / 2;
                const outwardX = midX - center.x;
                const outwardZ = midZ - center.z;
                const outwardLength = Math.hypot(outwardX, outwardZ) || 1;
                const normalX = outwardX / outwardLength;
                const normalZ = outwardZ / outwardLength;
                const sideSpec = deepMergeConfig(windowsSpec, windowsSpec.sides && (windowsSpec.sides[index] || windowsSpec.sides[String(index)]) || {});
                const layout = computeWindowLayout(edgeLength, bodyHeight, sideSpec);
                const shape = new THREE.Shape;
                shape.moveTo(0, 0);
                shape.lineTo(edgeLength, 0);
                shape.lineTo(edgeLength, bodyHeight);
                shape.lineTo(0, bodyHeight);
                shape.lineTo(0, 0);
                if (!1 !== sideSpec.enabled && !1 !== sideSpec.cutHoles)
                    for (const rect of layout.rects) {
                        const hole = new THREE.Path;
                        hole.moveTo(rect.x1, rect.y1);
                        hole.lineTo(rect.x1, rect.y2);
                        hole.lineTo(rect.x2, rect.y2);
                        hole.lineTo(rect.x2, rect.y1);
                        hole.lineTo(rect.x1, rect.y1);
                        shape.holes.push(hole);
                    }
                const geometry = new THREE.ShapeGeometry(shape);
                geometry.applyMatrix4((new THREE.Matrix4).makeBasis(new THREE.Vector3(dx,0,dz), new THREE.Vector3(0,1,0), new THREE.Vector3(normalX,0,normalZ)));
                geometry.translate(current.x + normalX * wallDepth / 2, baseY, current.z + normalZ * wallDepth / 2);
                geometry.computeVertexNormals();
                group.add(new THREE.Mesh(geometry, material));
            }
            return group.children.length ? group : null;
        }

        function createCustomBuildingBody(points, baseY, bodyHeight, colorValue, spec) {
            if (!globalState.THREE || points.length < 3)
                return null;
            const shouldCutWindows = spec && spec.windows && !1 !== spec.windows.enabled && !(spec.base && !0 === spec.base.solid) && !1 !== spec.windows.cutHoles;
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
            const centroid = points.reduce(((acc, point) => ({
                x: acc.x + point.x,
                z: acc.z + point.z
            })), {
                x: 0,
                z: 0
            });
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

        function createCustomRoof(points, baseY, bodyHeight, roofSpec) {
            if (!globalState.THREE || points.length < 3 || !roofSpec || !1 === roofSpec.enabled)
                return null;
            const roofType = roofSpec.type || "gable";
            const overhang = Number(roofSpec.overhang) || 0;
            const colorValue = null != roofSpec.color ? roofSpec.color : 8606516;
            if ("flat" === roofType) {
                const shape = createShapeFromFootprint(points);
                if (!shape)
                    return null;
                const geometry = new globalState.THREE.ShapeGeometry(shape);
                geometry.rotateX(-Math.PI / 2);
                geometry.translate(0, baseY + bodyHeight + .03, 0);
                return new globalState.THREE.Mesh(geometry, new globalState.THREE.MeshLambertMaterial({
                    color: colorValue,
                    side: globalState.THREE.DoubleSide
                }));
            }
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
            return new globalState.THREE.Mesh(geometry, new globalState.THREE.MeshLambertMaterial({
                color: colorValue,
                side: globalState.THREE.DoubleSide
            }));
        }

        function createWallPanel(start, end, center, baseY, height, colorValue, depth) {
            if (!globalState.THREE)
                return null;
            const dx = end.x - start.x;
            const dz = end.z - start.z;
            const length = Math.hypot(dx, dz);
            if (length < .4)
                return null;
            const directionX = dx / length;
            const directionZ = dz / length;
            const midX = (start.x + end.x) / 2;
            const midZ = (start.z + end.z) / 2;
            const outwardX = midX - center.x;
            const outwardZ = midZ - center.z;
            const outwardLength = Math.hypot(outwardX, outwardZ) || 1;
            const offsetX = outwardX / outwardLength;
            const offsetZ = outwardZ / outwardLength;
            const thickness = Math.max(.03, Number(depth) || .08);
            const mesh = new globalState.THREE.Mesh(new globalState.THREE.BoxGeometry(length, height, thickness), new globalState.THREE.MeshLambertMaterial({
                color: colorValue
            }));
            mesh.position.set(midX + offsetX * thickness / 2, baseY + height / 2, midZ + offsetZ * thickness / 2);
            mesh.rotation.y = Math.atan2(directionZ, directionX);
            return mesh;
        }

        function createWindowsForFootprint(group, points, baseY, bodyHeight, spec) {
            if (!globalState.THREE || !group || !points.length || !spec || !1 === spec.enabled)
                return;
            const center = points.reduce(((acc, point) => ({
                x: acc.x + point.x,
                z: acc.z + point.z
            })), {
                x: 0,
                z: 0
            });
            center.x /= points.length;
            center.z /= points.length;
            for (let index = 0; index < points.length; index++) {
                const current = points[index];
                const next = points[(index + 1) % points.length];
                const sideSpec = deepMergeConfig(spec, spec.sides && (spec.sides[index] || spec.sides[String(index)]) || {});
                if (!1 === sideSpec.enabled)
                    continue;
                const edgeLength = Math.hypot(next.x - current.x, next.z - current.z);
                if (edgeLength < .4)
                    continue;
                const dx = (next.x - current.x) / edgeLength;
                const dz = (next.z - current.z) / edgeLength;
                const midX = (current.x + next.x) / 2;
                const midZ = (current.z + next.z) / 2;
                const outwardX = midX - center.x;
                const outwardZ = midZ - center.z;
                const outwardLength = Math.hypot(outwardX, outwardZ) || 1;
                const normalX = outwardX / outwardLength;
                const normalZ = outwardZ / outwardLength;
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
                const frameDepth = Math.max(.035, Number(sideSpec.frameDepth) || .08);
                for (const rect of layout.rects) {
                    const width = rect.width;
                    const height = rect.height;
                    const frameThickness = null != sideSpec.frameThickness ? Math.max(.04, Number(sideSpec.frameThickness) || .04) : Math.max(.04, Math.min(width, height) * .09);
                    const along = rect.centerU - edgeLength / 2;
                    const basePointX = midX + dx * along;
                    const basePointZ = midZ + dz * along;
                    const centerY = baseY + rect.centerY;
                    const addWindowPart = (size, alongOffset, yOffset, material, normalOffset) => {
                        const mesh = new globalState.THREE.Mesh(new globalState.THREE.BoxGeometry(size[0], size[1], size[2]), material);
                        mesh.position.set(basePointX + dx * alongOffset + normalX * normalOffset, centerY + yOffset, basePointZ + dz * alongOffset + normalZ * normalOffset);
                        mesh.rotation.y = Math.atan2(dz, dx);
                        group.add(mesh);
                    };
                    addWindowPart([width, frameThickness, frameDepth], 0, height / 2 - frameThickness / 2, frameMaterial, .055);
                    addWindowPart([width, frameThickness, frameDepth], 0, -height / 2 + frameThickness / 2, frameMaterial, .055);
                    addWindowPart([frameThickness, Math.max(.08, height - 2 * frameThickness), frameDepth], -width / 2 + frameThickness / 2, 0, frameMaterial, .055);
                    addWindowPart([frameThickness, Math.max(.08, height - 2 * frameThickness), frameDepth], width / 2 - frameThickness / 2, 0, frameMaterial, .055);
                    addWindowPart([Math.max(.1, width - 2 * frameThickness), Math.max(.1, height - 2 * frameThickness), Math.max(.03, frameDepth * .45)], 0, 0, glassMaterial, .09);
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
            const materialOptions = {
                color: null != overrides.color ? overrides.color : null != (detail && detail.color) ? detail.color : 12632256,
                roughness: null != overrides.roughness ? overrides.roughness : preset.roughness,
                metalness: null != overrides.metalness ? overrides.metalness : preset.metalness,
                transparent,
                opacity,
                depthWrite: !(transparent || opacity < 1),
                side: THREE.DoubleSide
            };
            return THREE.MeshStandardMaterial ? new THREE.MeshStandardMaterial(materialOptions) : new THREE.MeshLambertMaterial(materialOptions);
        }

        function createDetailMaterial(detail) {
            return createDetailStandardMaterial(detail);
        }

        function createRuntimeBox(size, material, position=[0, 0, 0]) {
            const mesh = new globalState.THREE.Mesh(new globalState.THREE.BoxGeometry(size[0], size[1], size[2]),material);
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

        function positionDetailObject(object, detail, anchorPoint) {
            if (!object || !detail)
                return object;
            const position = detail.position || [0, 0, 0];
            const rotation = detail.rotation || [0, 0, 0];
            const offsetX = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.x) || 0;
            const offsetZ = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.z) || 0;
            object.position.set(offsetX + (Number(position[0]) || 0), Number(position[1]) || 0, offsetZ + (Number(position[2]) || 0));
            object.rotation.set((Number(rotation[0]) || 0) * Math.PI / 180, (Number(rotation[1]) || 0) * Math.PI / 180, (Number(rotation[2]) || 0) * Math.PI / 180);
            return object;
        }

        function createWindowDetailObject(detail, anchorPoint) {
            const THREE = globalState.THREE;
            const size = getDetailSize(detail, [1.2, 1.4, .16]);
            const width = Math.max(.2, size[0]);
            const height = Math.max(.2, size[1]);
            const depth = Math.max(.05, size[2]);
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
            const size = getDetailSize(detail);
            const position = detail.position || [0, 0, 0];
            const width = Math.max(size[0], size[2]);
            const thickness = Math.min(size[0], size[2]);
            const bottom = (Number(position[1]) || 0) - size[1] / 2;
            return thickness <= .25 && width >= .65 && width <= 4.2 && size[1] >= 1.55 && size[1] <= 4.25 && bottom >= -.18 && bottom <= .48;
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
                const depth = Math.max(.04, size[2]);
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
                group.add(createRuntimeBox([width, frameThickness, depth], frameMaterial, [0, height / 2 - frameThickness / 2, 0]));
                group.add(createRuntimeBox([frameThickness, height, depth], frameMaterial, [-width / 2 + frameThickness / 2, 0, 0]));
                group.add(createRuntimeBox([frameThickness, height, depth], frameMaterial, [width / 2 - frameThickness / 2, 0, 0]));
                const hingeLeft = String(detail.hingeSide || detail.hinge || "left").toLowerCase() !== "right";
                const pivot = new THREE.Group;
                pivot.name = "__tmCustomBuildingDoor";
                pivot.position.set(hingeLeft ? -width / 2 + frameThickness / 2 : width / 2 - frameThickness / 2, 0, 0);
                const leafWidth = Math.max(.08, width - frameThickness * 1.5);
                const leafHeight = Math.max(.08, height - frameThickness * 1.5);
                const leaf = createRuntimeBox([leafWidth, leafHeight, Math.max(.03, depth * .82)], leafMaterial, [hingeLeft ? leafWidth / 2 : -leafWidth / 2, 0, 0]);
                detail.staticDoor || (leaf.userData.tmDynamicDoor = !0);
                pivot.add(leaf);
                const modelerOpen = detail.isOpen ? clamp(Number(detail.openAngle) || 90, 0, 180) : 0;
                const interactiveOpen = clamp(Number(detail.openAngle) || 90, 0, 180) * Math.PI / 180 * (hingeLeft ? -1 : 1);
                pivot.rotation.y = modelerOpen * Math.PI / 180 * (hingeLeft ? -1 : 1);
                if (!detail.staticDoor) {
                    pivot.userData.tmDoor = {
                        closedY: 0,
                        openY: interactiveOpen,
                        current: detail.isOpen ? 1 : 0,
                        radius: Math.max(4, Number(detail.openRadius) || 9),
                        speed: Math.max(.8, Number(detail.openSpeed) || 4.5)
                    };
                    pivot.userData.tmDynamicDoor = !0;
                }
                group.add(pivot);
                return positionDetailObject(group, detail, anchorPoint);
            }
            const position = detail.position || [0, 0, 0];
            const rotation = detail.rotation || [0, 0, 0];
            const offsetX = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.x) || 0;
            const offsetZ = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.z) || 0;
            const center = new THREE.Vector3(offsetX + (Number(position[0]) || 0), Number(position[1]) || 0, offsetZ + (Number(position[2]) || 0));
            const rx = (Number(rotation[0]) || 0) * Math.PI / 180;
            const ry = (Number(rotation[1]) || 0) * Math.PI / 180;
            const rz = (Number(rotation[2]) || 0) * Math.PI / 180;
            const hingeRight = "right" === String(detail.hinge || detail.hingeSide || "").toLowerCase();
            const openOut = !1 !== detail.openOut;
            const sideSign = hingeRight ? -1 : 1;
            const localPivotOffset = new THREE.Vector3(-sideSign * size[0] / 2,0,0).applyEuler(new THREE.Euler(rx,ry,rz));
            const pivot = center.clone().add(localPivotOffset);
            const group = new THREE.Group;
            group.name = "__tmCustomBuildingDoor";
            group.position.copy(pivot);
            group.rotation.set(rx, ry, rz);
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), createDetailMaterial(Object.assign({
                color: 0x3a2a1f
            }, detail)));
            mesh.position.set(sideSign * size[0] / 2, 0, 0);
            mesh.userData.tmDynamicDoor = !0;
            group.add(mesh);
            const openAngle = (Number(detail.openAngle) || 82) * Math.PI / 180 * (openOut ? 1 : -1) * sideSign;
            group.userData.tmDoor = {
                closedY: ry,
                openY: ry + openAngle,
                current: 0,
                radius: Math.max(4, Number(detail.openRadius) || 9),
                speed: Math.max(.8, Number(detail.openSpeed) || 4.5)
            };
            group.userData.tmDynamicDoor = !0;
            return group;
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

        function createPrimitiveDetailMesh(detail, anchorPoint) {
            if (!globalState.THREE || !detail || !detail.type)
                return null;
            const type = String(detail.type || "").toLowerCase();
            const THREE = globalState.THREE;
            let geometry = null;
            if ("window" === type)
                return createWindowDetailObject(detail, anchorPoint);
            if (isDoorDetail(detail))
                return createDoorDetailObject(detail, anchorPoint);
            if (["chair", "table", "sofa", "bed", "cabinet", "counter", "shelf", "stove", "chimney"].includes(type))
                return createFurnitureDetailObject(detail, anchorPoint);
            if ("box" === type || "wall" === type || "floor" === type || "panel" === type || "roofpanel" === type) {
                const fallback = "panel" === type || "roofpanel" === type ? [1, 1, .04] : [1, 1, .1];
                const size = getDetailSize(detail, fallback);
                const box = createDetailPatternBoxGroup(detail, [size[0], size[1], Math.max(.02, size[2])], "floor" === type ? "floor" : "roofpanel" === type ? "roof" : "wall");
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
            const group = new globalState.THREE.Group;
            group.name = `tmCustomBuilding:${match.id}`;
            const points = getBuildingFootprint(match.building, spec);
            const baseY = Number(spec.base && spec.base.y) || Number(match.building.y) || 0;
            const bodyHeight = Math.max(1.4, Number(spec.base && spec.base.height) || Math.max(1, Number(spec.base && spec.base.floors) || 2) * Math.max(2.4, Number(spec.base && spec.base.floorHeight) || 3));
            const baseEnabled = !(spec.base && !1 === spec.base.enabled);
            if (baseEnabled) {
                const body = createCustomBuildingBody(points, baseY, bodyHeight, spec.base && spec.base.color, spec);
                body && group.add(body);
                const roof = createCustomRoof(points, baseY, bodyHeight, spec.roof);
                roof && group.add(roof);
                createWindowsForFootprint(group, points, baseY, bodyHeight, deepMergeConfig(spec.windows, {
                    sides: spec.sides || {}
                }));
            }
            const anchorPoint = match.building.houseCenterLocal || {
                x: match.building.houseCenter ? match.building.houseCenter.x - (match.building.chunkCenter && match.building.chunkCenter.x || 0) : 0,
                z: match.building.houseCenter ? match.building.houseCenter.z - (match.building.chunkCenter && match.building.chunkCenter.z || 0) : 0
            };
            for (const part of toSafeArray(spec.parts)) {
                const detailMesh = createPrimitiveDetailMesh(part, anchorPoint);
                detailMesh && group.add(detailMesh);
            }
            return group;
        }

        function prepareCustomBuildingMatchesForChunk(chunk, catalog) {
            if (!chunk)
                return [];
            chunk.__tmOriginalCustomBuildings || (chunk.__tmOriginalCustomBuildings = cloneJson(toSafeArray(chunk.custome_buildings), []));
            const matched = [];
            const suppressions = [];
            const matchedBuildings = new Set;
            const addCustomBuildingMatch = (id, entry, building) => {
                if (!building || matchedBuildings.has(building))
                    return;
                matchedBuildings.add(building);
                matched.push({
                    id,
                    entry,
                    building
                });
                suppressions.push({
                    id,
                    naa: cloneJson(building.points, []),
                    list: cloneJson(toSafeArray(entry && entry.bundleParts), [])
                });
            };
            for (const rawEntry of toSafeArray(catalog && catalog.buildings)) {
                const resolved = resolveBuildingTemplate(rawEntry, catalog && catalog.templates);
                for (const building of toSafeArray(chunk.buildings))
                    if (building && building.houseCenter && matchBuildingEntry(resolved, chunk, building)) {
                        const id = resolved.id || getBuildingDebugId(chunk, building);
                        addCustomBuildingMatch(id, resolved, building);
                    }
            }
            if (isAuto3dCatalogEnabled(catalog))
                for (const building of toSafeArray(chunk.buildings)) {
                    if (!building || !building.houseCenter || matchedBuildings.has(building))
                        continue;
                    const autoEntry = createAuto3dBuildingEntry(building, chunk, catalog || {});
                    autoEntry && addCustomBuildingMatch(autoEntry.id || getBuildingDebugId(chunk, building), autoEntry, building);
                }
            chunk.custome_buildings = toSafeArray(chunk.__tmOriginalCustomBuildings).concat(suppressions);
            chunk.__tmMatchedCustomBuildings = matched;
            chunk.__tmCustomBuildingsPrepared = !0;
            runtimeState.customBuildingEntriesByChunk.set(chunk, matched);
            return matched;
        }

        async function ensureChunkCustomBuildingsPrepared(chunk) {
            if (!chunk)
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
            return chunk.centerVec && chunk.centerVec.clone ? chunk.centerVec.clone() : new globalState.THREE.Vector3(Number(chunk.cx) || 0,0,Number(chunk.cz) || 0);
        }

        function addCustomBuildingPriorityTarget(position, label) {
            const target = cloneVector3(position);
            if (!target)
                return;
            runtimeState.customBuildingPriorityTargets.push({
                position: target,
                label: label || "Adresse",
                createdAt: performance.now()
            });
            runtimeState.customBuildingPriorityTargets = runtimeState.customBuildingPriorityTargets.filter((entry => entry && entry.position && performance.now() - (Number(entry.createdAt) || 0) < 10 * 60 * 1e3)).slice(-8);
        }

        function isPriorityCustomBuildingChunk(chunk) {
            const center = getChunkApproxCenter(chunk);
            if (!center)
                return !1;
            return runtimeState.customBuildingPriorityTargets.some((entry => entry && entry.position && getDistance2D(center, entry.position) <= 1800));
        }

        async function prepareCustomBuildingsForChunks(chunks, reason) {
            const unique = Array.from(new Set(toSafeArray(chunks).filter(Boolean)));
            if (!unique.length)
                return;
            for (let index = 0; index < unique.length; index++) {
                const chunk = unique[index];
                setCustomBuildingProgress(index, unique.length, reason === "address" ? "Adress-Haeuser vorbereiten" : "3D-Haeuser optimieren");
                try {
                    await ensureChunkCustomBuildingsPrepared(chunk);
                    rebuildCustomBuildingsForChunk(chunk);
                } catch (prepareError) {
                    warn(`Custom-Haeuser konnten fuer Chunk ${chunk && chunk.cx}/${chunk && chunk.cz} nicht vorbereitet werden:`, prepareError);
                }
                setCustomBuildingProgress(index + 1, unique.length, reason === "address" ? "Adress-Haeuser vorbereiten" : "3D-Haeuser optimieren");
            }
            finishCustomBuildingProgress();
        }

        function prepareCustomBuildingsNearPosition(position, reason) {
            if (!position)
                return;
            const chunks = getLoadedChunks().filter((chunk => {
                const center = getChunkApproxCenter(chunk);
                return center && getDistance2D(center, position) <= 2200;
            }));
            chunks.length && prepareCustomBuildingsForChunks(chunks, reason || "near");
        }

        function collectCustomBuildingDoorsForChunk(chunk, overlay) {
            runtimeState.customBuildingDoorItems = runtimeState.customBuildingDoorItems.filter((item => item && item.chunk !== chunk && item.group && item.group.parent));
            if (!overlay)
                return;
            overlay.traverse((node => {
                if (node && node.userData && node.userData.tmDoor)
                    runtimeState.customBuildingDoorItems.push({
                        chunk,
                        group: node
                    });
            }
            ));
        }

        function getCustomBuildingOverlaySignature(matches) {
            return toSafeArray(matches).map((match => {
                const building = match && match.building;
                const entry = match && match.entry;
                return [
                    match && match.id || "",
                    building && building.index,
                    entry && entry.__tmAuto3d ? "a" : "e",
                    toSafeArray(entry && entry.parts).length,
                    entry && entry.base && !1 === entry.base.enabled ? 0 : 1,
                    entry && entry.windows && !1 === entry.windows.enabled ? 0 : 1
                ].join(":");
            }
            )).join("|");
        }

        function rebuildCustomBuildingsForChunk(chunk) {
            if (!chunk || !chunk.group || !globalState.THREE)
                return;
            const matches = chunk.__tmMatchedCustomBuildings || runtimeState.customBuildingEntriesByChunk.get(chunk) || [];
            let overlay = runtimeState.chunkCustomOverlayGroups.get(chunk);
            if (!overlay) {
                overlay = new globalState.THREE.Group;
                overlay.name = "__tmCustomBuildingsOverlay";
                runtimeState.chunkCustomOverlayGroups.set(chunk, overlay);
            }
            const signature = getCustomBuildingOverlaySignature(matches);
            if (overlay.parent === chunk.group && overlay.userData && overlay.userData.tmBuildSignature === signature)
                return;
            runtimeState.customBuildingDoorItems = runtimeState.customBuildingDoorItems.filter((item => item && item.chunk !== chunk));
            clearCustomBuildingOverlayChildren(overlay);
            overlay.userData.tmBuildSignature = "";
            if (!matches.length || !featureState.customBuildings) {
                overlay.parent && overlay.parent.remove(overlay);
                return;
            }
            for (const match of matches) {
                const object = buildCustomBuildingObject(match);
                object && overlay.add(object);
            }
            optimizeCustomBuildingOverlay(overlay);
            overlay.userData.tmBuildSignature = signature;
            overlay.parent !== chunk.group && chunk.group.add(overlay);
            collectCustomBuildingDoorsForChunk(chunk, overlay);
        }

        function cleanupChunkCustomVisuals(chunk) {
            const overlay = chunk && runtimeState.chunkCustomOverlayGroups.get(chunk);
            if (overlay) {
                overlay.parent && overlay.parent.remove(overlay);
                clearCustomBuildingOverlayChildren(overlay);
            }
            runtimeState.chunkCustomOverlayGroups.delete(chunk);
            runtimeState.customBuildingEntriesByChunk.delete(chunk);
            runtimeState.customBuildingDoorItems = runtimeState.customBuildingDoorItems.filter((item => item && item.chunk !== chunk));
            chunk && (chunk.__tmMatchedCustomBuildings = []);
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
            ensureVehicleTuningHotkey();
            ensureRuntimeInputHandlers();
            if (!game.__tmRuntimeInitialized) {
                game.__tmRuntimeInitialized = !0;
                refreshCustomBuildingDebug();
                prepareCustomBuildingsForChunks(getLoadedChunks(), "game_capture");
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
                const roadModule = requireFn(REQUIRED_MODULES.ROAD_FACTORY);
                const chunkModule = requireFn(REQUIRED_MODULES.CHUNK);
                const terrainModule = requireFn(REQUIRED_MODULES.TERRAIN);
                const treeModule = requireFn(REQUIRED_MODULES.TREE_LIBRARY);
                const biomModule = requireFn(REQUIRED_MODULES.BIOM);
                const missionModule = requireFn(REQUIRED_MODULES.MISSION_MANAGER);
                const bufferGeometryUtils = requireFn(REQUIRED_MODULES.BUFFER_GEOMETRY_UTILS);
                const geoModule = requireFn(REQUIRED_MODULES.GEO);

                const worldProto = worldModule && worldModule.GameSessionOpenWorld && worldModule.GameSessionOpenWorld.prototype;
                const aiProto = aiModule && aiModule.BetterAiCar && aiModule.BetterAiCar.prototype;
                const trafficProto = trafficModule && trafficModule.AiTrafficResolver && trafficModule.AiTrafficResolver.prototype;
                const controllableProto = controllableModule && controllableModule.ControllableCar && controllableModule.ControllableCar.prototype;
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
                        roadModule,
                        chunkModule,
                        terrainModule,
                        treeModule,
                        biomModule,
                        missionModule,
                        geoModule,
                        bufferGeometryUtils,
                        THREE
                    }
                };
                ensureBuildingCatalogLoaded().catch((catalogWarmupError => warn("Custom-Building-Katalog konnte beim Start nicht vorgeladen werden:", catalogWarmupError)));

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

                if (treeModule && !treeModule.__tmEnhancedTreesPatched) {
                    const originalCreateTree = treeModule.createTree;
                    treeModule.createTree = function(x, y, z, seed, type) {
                        const enhanced = createEnhancedTreeGeometries(x, y, z, seed, type);
                        if (enhanced[0] || enhanced[1])
                            return enhanced;
                        return originalCreateTree.apply(this, arguments);
                    };
                    treeModule.__tmEnhancedTreesPatched = !0;
                }

                if (biomProto && !biomProto.__tmEnhancedForestPatched) {
                    biomProto.createForest = function(t, e, types, palette, trunkColor, density, isOrchard=!1) {
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
                        suppressRunwayBuildings(this);
                        if (!this.__tmCustomBuildingsPrepared && runtimeState.buildingConfig)
                            try {
                                prepareCustomBuildingMatchesForChunk(this, runtimeState.buildingConfig);
                            } catch (syncCustomBuildingError) {
                                warn(`Custom-Building-Vorbereitung vor Build fehlgeschlagen fuer Chunk ${this.cx}/${this.cz}:`, syncCustomBuildingError);
                            }
                        const result = originalBuild.apply(this, args);
                        refreshCustomBuildingDebug();
                        queueTownRebuild("chunk_build");
                        ensureChunkCustomBuildingsPrepared(this).catch((customBuildingError => warn(`Custom-Building-Vorbereitung fehlgeschlagen fuer Chunk ${this.cx}/${this.cz}:`, customBuildingError))).finally((() => rebuildCustomBuildingsForChunk(this)));
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
                        suppressRunwayBuildings(this);
                        const showProgress = !this.__tmCustomBuildingsPrepared || isPriorityCustomBuildingChunk(this);
                        showProgress && setCustomBuildingProgress(0, 2, isPriorityCustomBuildingChunk(this) ? "Adress-Haus vorbereiten" : "3D-Haeuser vorbereiten");
                        try {
                            await ensureChunkCustomBuildingsPrepared(this);
                            showProgress && setCustomBuildingProgress(1, 2, isPriorityCustomBuildingChunk(this) ? "Adress-Haus vorbereiten" : "3D-Haeuser vorbereiten");
                        } catch (customBuildingError) {
                            warn(`Custom-Building-Vorbereitung fehlgeschlagen fuer Chunk ${this.cx}/${this.cz}:`, customBuildingError);
                        }
                        try {
                            const result = await originalCheckLoaded.apply(this, args);
                            refreshCustomBuildingDebug();
                            queueTownRebuild("chunk_check_loaded");
                            rebuildCustomBuildingsForChunk(this);
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
                        log("AiTrafficResolver verbunden.");
                        return originalSetControlManager.apply(this, args);
                    };
                    trafficProto.__tmSetControlManagerPatched = !0;
                }

                if (!trafficProto.__tmUpdateCarPatched) {
                    const originalUpdateCar = trafficProto.updateCar;
                    trafficProto.updateCar = function(dt, aiId) {
                        const aiCar = this.carMaps && this.carMaps.get(aiId);
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
                        applyExtendedVehicleControls(this, dtSeconds);
                        enhanceVehicleAppearance(this);
                        const result = originalMoveGroup.apply(this, arguments);
                        applyExtendedVehicleControls(this, dtSeconds);
                        applyVehicleTuning(this, dtSeconds, previousSpeed);
                        applyAutopilotToCar(this, dtSeconds);
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
                                if (aiCar.getPosition().distanceTo(playerPosition) > 100)
                                    continue;

                                const relative = aiCar.getPosition().sub(player.getPosition());
                                const sameDirection = Math.abs(aiCar.getForwardVector().angleTo(player.getForwardVector())) < Math.PI / 5;
                                const relAngle = Math.abs(relative.clone().normalize().angleTo(aiCar.getForwardVector()));
                                const aiAhead = relative.length() > aiCar.getPosition().add(aiCar.getForwardVector()).distanceTo(player.getPosition());
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
                globalThis.__tmTownSignsDebug = globalThis.__tmCollisionHookDebug.townSigns;
                refreshCustomBuildingDebug();
                globalThis.__tmCollisionHookDebug.game && captureTownSignsGame(globalThis.__tmCollisionHookDebug.game);
                prepareCustomBuildingsForChunks(getLoadedChunks(), "bundle_patch");
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
        log("Bootstrap gestartet.", "readyState=", document.readyState, "realm=page", "href=", location.href);
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
