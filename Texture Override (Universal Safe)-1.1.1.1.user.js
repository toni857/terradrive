// ==UserScript==
// @name         Texture Override (Universal Safe)
// @match        https://terradrive.eu/*
// @grant        none
// @description  nothing
// @version      1.1.2.2
// @downloadURL  https://toni857.github.io/terradrive/Texture%20Override%20(Universal%20Safe)-1.1.1.1.user.js
// @updateURL    https://toni857.github.io/terradrive/Texture%20Override%20(Universal%20Safe)-1.1.1.1.user.js
// ==/UserScript==


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
            CHUNK: 4763
        };
        const BUNDLE_FILE_RE = /(?:^|\/)index\.js(?:$|[?#])/i;
        const globalState = globalThis.__tmCollisionHookState ||= {
            version: "1.3.0",
            require: null,
            patched: !1,
            patchStarted: !1,
            bundleHookInstalled: !1,
            nodeHookInstalled: !1,
            mutationHookInstalled: !1,
            bundlePatchedInDom: !1,
            observedBundleUrl: null,
            THREE: null
        };
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
        const townSignsState = globalState.townSigns ||= {
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

        function extractTownBaseLabel(value) {
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
            const candidate = normalizeTownLabel(cutIndex >= 0 ? text.slice(0, cutIndex) : text);
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
            const base = extractTownBaseLabel(raw);
            if (!base)
                return raw;
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
                    stopCandidates.push({
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
                const base = extractTownBaseLabel(candidate.rawName);
                stopBaseCounts.set(base, (stopBaseCounts.get(base) || 0) + 1);
            }

            const destinationBaseCounts = new Map;
            for (const candidate of destinationCandidates)
                destinationBaseCounts.set(candidate.name, (destinationBaseCounts.get(candidate.name) || 0) + 1);

            const namedStops = stopCandidates.map(candidate => ({
                source: candidate.source,
                position: candidate.position,
                name: chooseTownStopDisplayName(candidate, stopBaseCounts, destinationBaseCounts),
                rawName: candidate.rawName
            })).filter(candidate => isLikelyTownLabel(candidate.name));

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
                        ...place,
                        centers: [place.center.clone()],
                        sourceNames: [...place.sourceNames]
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
                hasOutside ||= currentDelta > 0;
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

        function rebuildTownSigns(reason="manual") {
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

        function captureTownSignsGame(game) {
            if (!game)
                return;
            townSignsState.game = game;
            townSignsState.scene = game.scene || townSignsState.scene;
            townSignsState.chunkManager = game.chunkManager || townSignsState.chunkManager;
            ensureTownOverlayGroup();
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

                const worldProto = worldModule && worldModule.GameSessionOpenWorld && worldModule.GameSessionOpenWorld.prototype;
                const aiProto = aiModule && aiModule.BetterAiCar && aiModule.BetterAiCar.prototype;
                const trafficProto = trafficModule && trafficModule.AiTrafficResolver && trafficModule.AiTrafficResolver.prototype;
                const controllableProto = controllableModule && controllableModule.ControllableCar && controllableModule.ControllableCar.prototype;
                const chunkProto = chunkModule && chunkModule.Chunk && chunkModule.Chunk.prototype;

                if (!trafficProto || !controllableProto || !aiProto || !chunkProto || !roadModule)
                    throw new Error("Benoetigte Prototypen konnten nicht aufgeloest werden.");
                globalState.THREE = THREE;
                townSignsState.roadModule = roadModule;

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
                        THREE
                    }
                };

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
                        queueTownRebuild("chunk_build");
                        return result;
                    };
                    chunkProto.__tmTownSignsBuildPatched = !0;
                }

                if (!chunkProto.__tmTownSignsDisposePatched) {
                    const originalDispose = chunkProto.dispose;
                    chunkProto.dispose = function(...args) {
                        const result = originalDispose.apply(this, args);
                        queueTownRebuild("chunk_dispose");
                        return result;
                    };
                    chunkProto.__tmTownSignsDisposePatched = !0;
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
                globalThis.__tmTownSignsDebug = globalThis.__tmCollisionHookDebug.townSigns;
                globalThis.__tmCollisionHookDebug.game && captureTownSignsGame(globalThis.__tmCollisionHookDebug.game);
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


    console.log("🔥 IMG hook + fallback aktiv");
})();
