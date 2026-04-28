// ==UserScript==
// @name         Texture Override (Universal Safe)
// @match        https://terradrive.eu/*
// @grant        none
// @description  nothing
// @version      1.4.0
// @downloadURL  https://toni857.github.io/terradrive/Texture%20Override%20(Universal%20Safe)-1.1.1.1.user.js
// @updateURL    https://toni857.github.io/terradrive/Texture%20Override%20(Universal%20Safe)-1.1.1.1.user.js
// ==/UserScript==

(function() {
    "use strict";
    console.log("[Texture Hook] gestartet");

    const BASE = "https://toni857.github.io/my-textures/";
    const cache = {
        fallback: BASE + "type1me.png"
    };

    function resolveUrl(id) {
        return BASE + `type${id}me.png`;
    }

    function testImage(url, cb) {
        const img = new Image;
        img.onload = () => cb(!0);
        img.onerror = () => cb(!1);
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
                console.log("[Texture Hook] pruefe:", targetUrl);
                testImage(targetUrl, ok => {
                    let finalUrl = targetUrl;
                    if (!ok) {
                        console.warn("[Texture Hook] fehlt:", targetUrl, "-> fallback type1me");
                        finalUrl = cache.fallback;
                    }
                    console.log("[Texture Hook] final:", finalUrl);
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

    console.log("[Texture Hook] IMG-Hook aktiv");
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
            BUFFER_GEOMETRY_UTILS: 4754
        };
        const BUNDLE_FILE_RE = /(?:^|\/)index\.js(?:$|[?#])/i;
        const globalState = globalThis.__tmCollisionHookState || (globalThis.__tmCollisionHookState = {
            version: "1.4.0",
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
            placeClusterDistance: 1250,
            destinationClusterDistance: 900,
            buildingSearchRadius: 420,
            minBuildingCount: 4,
            maxPlaceRadius: 650,
            minPlaceRadius: 150,
            edgeEntryOffset: 6,
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
            poleMaterial: null
        });
        const BUILDING_CONFIG_URL = "https://toni857.github.io/terradrive/buildings.js";
        const CUSTOM_TASK_OPTIONS = [{
            value: "tmTownHop",
            label: "Town Hop"
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
        const runtimeState = globalState.runtime || (globalState.runtime = {
            game: null,
            terrainModule: null,
            treeModule: null,
            biomModule: null,
            missionModule: null,
            bufferGeometryUtils: null,
            buildingConfigPromise: null,
            buildingConfig: null,
            asphaltTexture: null,
            roadMaterialCache: new WeakMap,
            terrainMaterialCache: new WeakMap,
            customMissionRegistry: new Map,
            missionPanelsPatched: new WeakSet,
            visualRefreshTimers: new WeakMap,
            chunkCustomOverlayGroups: new WeakMap,
            buildingDebugEntries: [],
            customBuildingEntriesByChunk: new WeakMap
        });
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
            console.log(PREFIX, ...args);
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
                    stopPlayer(player);
                    slowAi(resolver, aiId, aiCar, IMPACT_TUNING.launch.slowerCarHitFasterSlowFactor, 35);
                } else {
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
                stopPlayer(player);
                stopAi(resolver, aiId, aiCar, IMPACT_TUNING.lowDiff.rearRearStopFreeze, 5);
                log("Heck-gegen-Heck erkannt: beide Autos werden gestoppt.");
                return "rear_to_rear_stop";
            }

            if ("front_to_front" === info.type) {
                stopPlayer(player);
                stopAi(resolver, aiId, aiCar, IMPACT_TUNING.lowDiff.bothStopFreeze, 5);
                log("Front-gegen-Front erkannt: beide Fahrzeuge werden gestoppt.");
                return "front_to_front_stop";
            }

            if ("player_rear_ends_ai" === info.type) {
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
            const separators = [",", ";", " - ", " / ", " (", " ["];
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
            return normalizeTownLabel(value).split(";").map(normalizeTownLabel).filter(Boolean);
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
                "train" === candidate.source ? target.strongCount += 1 : target.weakCount += 1;
                target.center = averageTownVector3(target.points);
            }
            return clusters;
        }

        function collectTownWorldData() {
            const chunkManager = townSignsState.chunkManager;
            const roadModule = townSignsState.roadModule;
            const chunks = Object.values(chunkManager && chunkManager.loadedChunks || {});
            const buildings = [];
            const stopCandidates = [];
            const busCandidates = [];
            const destinationCandidates = [];
            const roads = [];

            for (const chunk of chunks) {
                if (!chunk)
                    continue;

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
            for (const candidate of busCandidates) {
                const base = extractTownBaseLabel(candidate.rawName, "bus");
                const hasDestinationSupport = (destinationBaseCounts.get(base) || 0) > 0;
                const hasRepeatedTownSupport = (busBaseCounts.get(base) || 0) >= 3;
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
                if (cluster.points.length < 2 || buildingStats.count < 8)
                    continue;
                const pointSpread = cluster.points.reduce((maxDistance, point) => Math.max(maxDistance, townDistance2D(point, cluster.center)), 0);
                const center = cluster.center.clone().lerp(buildingStats.centroid, .4);
                const radius = clamp(Math.max(165, pointSpread + 140, buildingStats.maxDistance + 90), TOWN_SIGN_CONFIG.minPlaceRadius, TOWN_SIGN_CONFIG.maxPlaceRadius);
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
                map: texture
            });
            const backMaterial = new THREE.MeshBasicMaterial({
                color: 0xf7f9ff
            });
            const asset = {
                geometry,
                materials: [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, frontMaterial, backMaterial],
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
            group.position.y += .02;
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

                globalThis.__tmTownSignsDebug = {
                    game: townSignsState.game,
                    chunkManager: townSignsState.chunkManager,
                    places: townSignsState.debugPlaces,
                    signs: townSignsState.debugSigns,
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

        function buildCustomMissionStages(type, manager, player) {
            const playerPos = player && typeof player.getPosition === "function" ? player.getPosition().clone() : new globalState.THREE.Vector3;
            const towns = collectTownMissionTargets();
            const homes = collectResidentialMissionTargets(manager);
            const fuelStations = collectGasStationMissionTargets();
            const forests = collectForestMissionTargets();
            const mainRoads = collectMainRoadMissionTargets();
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
                this.markerIndex = this.missionManager.addMarker(stage.markerColor || "#40ff90", stage.position, stage.label);
                this.missionManager.missionPanel.showNavigation();
                this.missionManager.missionPanel.updateStatus(stage.status || stage.label);
                this.missionManager.missionPanel.updateMissionDescriptiopn(stage.description || stage.label);
            }

            finish(currentTime, player) {
                this.completed = !0;
                this.removeMarker();
                const elapsed = Math.max(0, (Number(currentTime) || 0) - this.startedAt);
                const distance = Math.max(0, (Number(player && player.millage) || this.startDistance) - this.startDistance);
                this.missionManager.missionPanel.updateStatus("Task complete");
                this.missionManager.missionPanel.updateMissionDescriptiopn("Open the T menu for another custom route or stop this one.");
                this.missionManager.missionPanel.turnOffCompass();
                this.missionManager.missionPanel.updateEntry1(`${this.stages.length}/${this.stages.length} checkpoints`);
                this.missionManager.missionPanel.updateEntry2(`Time: ${formatMissionSeconds(elapsed)}`);
                this.missionManager.missionPanel.updateEntry3(`Dist: ${(distance / 1e3).toFixed(1)} km`);
                this.missionManager.missionPanel.updateEntry4("");
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
                this.missionManager.missionPanel.updateCompass(playerPos, player.getHeadings(), stage.position);
                this.missionManager.missionPanel.updateEntry1(`${this.stageIndex + 1}/${this.stages.length} checkpoints`);
                this.missionManager.missionPanel.updateEntry2(stage.label);
                this.missionManager.missionPanel.updateEntry3(`ETA: ${Math.max(0, getDistance2D(playerPos, stage.position)).toFixed(0)} m`);
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
                material.color && material.color.setHex(VISUAL_CONFIG.terrainColor);
                material.vertexColors = !0;
                material.needsUpdate = !0;
                material.map && setTextureQuality(material.map);
            }
            ));
        }

        function createRoadMaterial(baseMaterial) {
            if (!globalState.THREE)
                return baseMaterial;
            const material = new globalState.THREE.MeshLambertMaterial({
                color: VISUAL_CONFIG.roadColor,
                side: globalState.THREE.DoubleSide,
                map: getAsphaltTexture()
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
            if (1 === usable.length || !runtimeState.bufferGeometryUtils || "function" != typeof runtimeState.bufferGeometryUtils.mergeBufferGeometries)
                return usable[0];
            return runtimeState.bufferGeometryUtils.mergeBufferGeometries(usable);
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

        function ensureBuildingCatalogLoaded() {
            if (runtimeState.buildingConfigPromise)
                return runtimeState.buildingConfigPromise;
            runtimeState.buildingConfigPromise = fetch(BUILDING_CONFIG_URL, {
                cache: "no-store"
            }).then((response => response.text())).then((text => normalizeBuildingCatalog(parseBuildingConfigText(text)))).catch((catalogError => {
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

        function createCustomBuildingBody(points, baseY, bodyHeight, colorValue) {
            if (!globalState.THREE || points.length < 3)
                return null;
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
            return new globalState.THREE.Mesh(geometry, new globalState.THREE.MeshLambertMaterial({
                color: null != colorValue ? colorValue : 14540253
            }));
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
                const margin = Math.max(.35, Number(sideSpec.margin) || .8);
                const width = Math.max(.3, Number(sideSpec.width) || 1.05);
                const height = Math.max(.35, Number(sideSpec.height) || 1.35);
                const gap = Math.max(.15, Number(sideSpec.gap) || .65);
                const rows = Math.max(1, Math.round(Number(sideSpec.rows) || Math.max(1, Math.round((bodyHeight - 1.8) / 2.4))));
                const availableLength = Math.max(0, edgeLength - 2 * margin);
                const cols = Math.max(1, Math.round(Number(sideSpec.cols) || Math.max(1, Math.floor((availableLength + gap) / (width + gap)))));
                const runLength = cols * width + Math.max(0, cols - 1) * gap;
                const startOffset = (edgeLength - runLength) / 2 + width / 2;
                const dx = (next.x - current.x) / edgeLength;
                const dz = (next.z - current.z) / edgeLength;
                const midX = (current.x + next.x) / 2;
                const midZ = (current.z + next.z) / 2;
                const outwardX = midX - center.x;
                const outwardZ = midZ - center.z;
                const outwardLength = Math.hypot(outwardX, outwardZ) || 1;
                const normalX = outwardX / outwardLength;
                const normalZ = outwardZ / outwardLength;
                const bottom = Math.max(.7, Number(sideSpec.sill) || 1.1);
                const topPadding = Math.max(.55, Number(sideSpec.topPadding) || .85);
                const usableHeight = Math.max(height, bodyHeight - bottom - topPadding);
                const rowSpacing = rows > 1 ? (usableHeight - height) / (rows - 1) : 0;
                if (sideSpec.color) {
                    const panel = createWallPanel(current, next, center, baseY + .1, Math.max(.3, bodyHeight - .2), sideSpec.color, Number(sideSpec.claddingDepth) || .05);
                    panel && group.add(panel);
                }
                for (let row = 0; row < rows; row++)
                    for (let col = 0; col < cols; col++) {
                        const along = startOffset + col * (width + gap) - edgeLength / 2;
                        const basePointX = midX + dx * along;
                        const basePointZ = midZ + dz * along;
                        const centerY = baseY + bottom + row * rowSpacing;
                        const frame = new globalState.THREE.Mesh(new globalState.THREE.BoxGeometry(width, height, .08), new globalState.THREE.MeshLambertMaterial({
                            color: null != sideSpec.frameColor ? sideSpec.frameColor : VISUAL_CONFIG.windowFrameColor
                        }));
                        frame.position.set(basePointX + normalX * .05, centerY, basePointZ + normalZ * .05);
                        frame.rotation.y = Math.atan2(dz, dx);
                        group.add(frame);
                        const glass = new globalState.THREE.Mesh(new globalState.THREE.BoxGeometry(Math.max(.15, width - .18), Math.max(.15, height - .18), .04), new globalState.THREE.MeshLambertMaterial({
                            color: null != sideSpec.glassColor ? sideSpec.glassColor : VISUAL_CONFIG.windowGlassColor,
                            transparent: !0,
                            opacity: .88
                        }));
                        glass.position.set(basePointX + normalX * .095, centerY, basePointZ + normalZ * .095);
                        glass.rotation.y = Math.atan2(dz, dx);
                        group.add(glass);
                    }
            }
        }

        function createPrimitiveDetailMesh(detail, anchorPoint) {
            if (!globalState.THREE || !detail || !detail.type)
                return null;
            let geometry = null;
            if ("box" === detail.type) {
                const size = detail.size || [1, 1, 1];
                geometry = new globalState.THREE.BoxGeometry(Math.max(.1, Number(size[0]) || 1), Math.max(.1, Number(size[1]) || 1), Math.max(.1, Number(size[2]) || 1));
            } else if ("cylinder" === detail.type) {
                geometry = new globalState.THREE.CylinderGeometry(Math.max(.05, Number(detail.radiusTop) || Number(detail.radius) || .25), Math.max(.05, Number(detail.radiusBottom) || Number(detail.radius) || .25), Math.max(.1, Number(detail.height) || 1), Math.max(6, Number(detail.segments) || 10));
            } else if ("sphere" === detail.type) {
                geometry = new globalState.THREE.SphereGeometry(Math.max(.05, Number(detail.radius) || .5), 12, 10);
            } else if ("panel" === detail.type) {
                const size = detail.size || [1, 1];
                geometry = new globalState.THREE.BoxGeometry(Math.max(.1, Number(size[0]) || 1), Math.max(.1, Number(size[1]) || 1), Math.max(.02, Number(size[2]) || .04));
            }
            if (!geometry)
                return null;
            const mesh = new globalState.THREE.Mesh(geometry, new globalState.THREE.MeshLambertMaterial({
                color: null != detail.color ? detail.color : 12632256,
                transparent: !!detail.transparent,
                opacity: null != detail.opacity ? clamp(Number(detail.opacity) || 0, 0, 1) : 1
            }));
            const position = detail.position || [0, 0, 0];
            const rotation = detail.rotation || [0, 0, 0];
            const offsetX = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.x) || 0;
            const offsetZ = detail.absolute || !anchorPoint ? 0 : Number(anchorPoint.z) || 0;
            mesh.position.set(offsetX + (Number(position[0]) || 0), Number(position[1]) || 0, offsetZ + (Number(position[2]) || 0));
            mesh.rotation.set((Number(rotation[0]) || 0) * Math.PI / 180, (Number(rotation[1]) || 0) * Math.PI / 180, (Number(rotation[2]) || 0) * Math.PI / 180);
            return mesh;
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
            const body = createCustomBuildingBody(points, baseY, bodyHeight, spec.base && spec.base.color);
            body && group.add(body);
            const roof = createCustomRoof(points, baseY, bodyHeight, spec.roof);
            roof && group.add(roof);
            createWindowsForFootprint(group, points, baseY, bodyHeight, deepMergeConfig(spec.windows, {
                sides: spec.sides || {}
            }));
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

        async function ensureChunkCustomBuildingsPrepared(chunk) {
            if (!chunk)
                return [];
            if (chunk.__tmCustomBuildingsPrepared)
                return chunk.__tmMatchedCustomBuildings || [];
            if (chunk.__tmCustomBuildingsPreparePromise)
                return chunk.__tmCustomBuildingsPreparePromise;
            chunk.__tmOriginalCustomBuildings || (chunk.__tmOriginalCustomBuildings = cloneJson(toSafeArray(chunk.custome_buildings), []));
            chunk.__tmCustomBuildingsPreparePromise = ensureBuildingCatalogLoaded().then((catalog => {
                const matched = [];
                const suppressions = [];
                for (const rawEntry of toSafeArray(catalog && catalog.buildings)) {
                    const resolved = resolveBuildingTemplate(rawEntry, catalog.templates);
                    for (const building of toSafeArray(chunk.buildings))
                        if (building && building.houseCenter && matchBuildingEntry(resolved, chunk, building)) {
                            const id = resolved.id || getBuildingDebugId(chunk, building);
                            matched.push({
                                id,
                                entry: resolved,
                                building
                            });
                            suppressions.push({
                                id,
                                naa: cloneJson(building.points, []),
                                list: cloneJson(toSafeArray(resolved.bundleParts), [])
                            });
                        }
                }
                chunk.custome_buildings = toSafeArray(chunk.__tmOriginalCustomBuildings).concat(suppressions);
                chunk.__tmMatchedCustomBuildings = matched;
                chunk.__tmCustomBuildingsPrepared = !0;
                runtimeState.customBuildingEntriesByChunk.set(chunk, matched);
                return matched;
            })).finally((() => {
                chunk.__tmCustomBuildingsPreparePromise = null;
            }));
            return chunk.__tmCustomBuildingsPreparePromise;
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
            clearTownOverlayChildren(overlay);
            if (!matches.length) {
                overlay.parent && overlay.parent.remove(overlay);
                return;
            }
            for (const match of matches) {
                const object = buildCustomBuildingObject(match);
                object && overlay.add(object);
            }
            overlay.parent !== chunk.group && chunk.group.add(overlay);
        }

        function cleanupChunkCustomVisuals(chunk) {
            const overlay = chunk && runtimeState.chunkCustomOverlayGroups.get(chunk);
            overlay && overlay.parent && overlay.parent.remove(overlay);
            runtimeState.chunkCustomOverlayGroups.delete(chunk);
            runtimeState.customBuildingEntriesByChunk.delete(chunk);
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
            if (!game.__tmRuntimeInitialized) {
                game.__tmRuntimeInitialized = !0;
                refreshCustomBuildingDebug();
                ensureBuildingCatalogLoaded().then((() => {
                    for (const chunk of getLoadedChunks())
                        ensureChunkCustomBuildingsPrepared(chunk).finally((() => queueChunkVisualRefresh(chunk, "game_capture")));
                }
                ));
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
                        bufferGeometryUtils,
                        THREE
                    }
                };

                if (terrainProto && !terrainProto.__tmTerrainVisualPatched) {
                    const originalCreateTerrainMesh = terrainProto.createTerrainMesh;
                    terrainProto.createTerrainMesh = function(...args) {
                        const result = originalCreateTerrainMesh.apply(this, args);
                        const mesh = result && result[0];
                        const material = result && result[1];
                        if (mesh)
                            mesh.__tmTerrainMesh = !0;
                        if (mesh && material && globalState.THREE && !material.__tmTerrainEnhanced) {
                            const enhanced = new globalState.THREE.MeshLambertMaterial({
                                color: VISUAL_CONFIG.terrainColor,
                                vertexColors: !0
                            });
                            material.map && (enhanced.map = material.map);
                            mesh.material = enhanced;
                            result[1] = enhanced;
                            enhanced.__tmTerrainEnhanced = !0;
                        }
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
                        return originalMove.apply(this, args);
                    };
                    worldProto.__tmTownSignsMovePatched = !0;
                }

                if (!chunkProto.__tmTownSignsBuildPatched) {
                    const originalBuild = chunkProto.build;
                    chunkProto.build = function(...args) {
                        const result = originalBuild.apply(this, args);
                        refreshCustomBuildingDebug();
                        queueTownRebuild("chunk_build");
                        queueChunkVisualRefresh(this, "chunk_build");
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
                        try {
                            await ensureChunkCustomBuildingsPrepared(this);
                        } catch (customBuildingError) {
                            warn(`Custom-Building-Vorbereitung fehlgeschlagen fuer Chunk ${this.cx}/${this.cz}:`, customBuildingError);
                        }
                        const result = await originalCheckLoaded.apply(this, args);
                        refreshCustomBuildingDebug();
                        queueChunkVisualRefresh(this, "chunk_check_loaded");
                        return result;
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
                        this.__tmImpactState && removeAppliedImpactTransform(this);
                        this.__tmImpactState && stopPlayer(this);
                        const result = originalMoveGroup.apply(this, arguments);
                        if (this.__tmImpactState)
                            try {
                                stopPlayer(this);
                                updateImpactState(this, (Number(dtMs) || 0) / 1e3);
                            } catch (impactError) {
                                error("Fehler waehrend Spieler-Impact-Update:", impactError);
                                syncVehicleCrashState(this, !1);
                                clearImpactState(this, "player_impact_update_error");
                            }
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
                globalThis.__tmTownSignsDebug = globalThis.__tmCollisionHookDebug.townSigns;
                refreshCustomBuildingDebug();
                globalThis.__tmCollisionHookDebug.game && captureTownSignsGame(globalThis.__tmCollisionHookDebug.game);
                for (const chunk of getLoadedChunks())
                    ensureChunkCustomBuildingsPrepared(chunk).finally((() => queueChunkVisualRefresh(chunk, "bundle_patch")));
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

        function fetchBundleSourceSync(bundleUrl) {
            const xhr = new XMLHttpRequest;
            xhr.open("GET", bundleUrl, !1);
            xhr.overrideMimeType("text/plain; charset=utf-8");
            xhr.send(null);
            if (xhr.status && (xhr.status < 200 || xhr.status >= 300))
                throw new Error(`HTTP ${xhr.status} beim Laden von ${bundleUrl}`);
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

        log("Bootstrap gestartet.", "readyState=", document.readyState, "realm=page", "href=", location.href);
        installBundleSourceHook();
        installRequireSniffer();
    }

    const script = document.createElement("script");
    script.textContent = `(${pageMain.toString()})();\n//# sourceURL=tm-collision-hook.page.js`;
    (document.documentElement || document.head || document.body).appendChild(script);
    script.remove();
})();
