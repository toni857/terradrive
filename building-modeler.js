import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/controls/OrbitControls.js";

/*
 * TM Building Modeler
 * This file is intentionally UI-heavy: it owns the DOM panels, the Three.js preview,
 * the editing tools, and the final buildings.js export format.
 */
const MODEL_DEBUG_PREFIX = "[TM Building Modeler]";
const MODEL_VERBOSE_LOGS = !!window.__tmBuildingModelerVerbose || /\btmModelerDebug=1\b/.test(window.location.search);

function modelLog(...args) {
    MODEL_VERBOSE_LOGS && console.log(MODEL_DEBUG_PREFIX, ...args);
}

function modelWarn(...args) {
    console.warn(MODEL_DEBUG_PREFIX, ...args);
}

function modelError(...args) {
    console.error(MODEL_DEBUG_PREFIX, ...args);
}

function escapeHtml(value) {
    return String(null == value ? "" : value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[char]));
}

// Catch browser/runtime errors early so modeler problems show up next to the startup health table.
window.addEventListener("error", event => {
    modelError("Window error", event.message, event.error || event);
});

window.addEventListener("unhandledrejection", event => {
    modelError("Unhandled promise rejection", event.reason || event);
});

// DOM handles: every tool below reads from these nodes instead of repeatedly querying the document.
const viewport = document.getElementById("viewport");
const elementList = document.getElementById("elementList");
const palette = document.getElementById("palette");
const inspector = document.getElementById("inspector");
const settingsPanel = document.getElementById("settingsPanel");
const moveToolButton = document.getElementById("moveTool");
const duplicateButton = document.getElementById("duplicateElement");
const deleteButton = document.getElementById("deleteElement");
const fillToolButton = document.getElementById("fillTool");
const cutToolButton = document.getElementById("cutTool");
const copyButton = document.getElementById("copyCode");
const mirrorModeSelect = document.getElementById("mirrorMode");
const statusText = document.getElementById("statusText");
const codeOutput = document.getElementById("codeOutput");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

// Three.js scene setup: preview-only, separate from the in-game Terradrive renderer.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101316);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(12, 8, 13);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2, 0);

scene.add(new THREE.HemisphereLight(0xe8f5ff, 0x36413d, 1.8));

const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(10, 16, 9);
sun.castShadow = true;
scene.add(sun);

scene.add(new THREE.GridHelper(32, 64, 0x415261, 0x26313a));
scene.add(new THREE.AxesHelper(2));

const elementGroup = new THREE.Group();
scene.add(elementGroup);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dragPoint = new THREE.Vector3();

const roofTypes = new Set(["pyramidRoof", "gableRoof", "hipRoof", "flatRoof", "shedRoof", "mansardRoof", "domeRoof", "roundRoof", "roofPanel"]);
const planarRoofTypes = new Set(["flatRoof", "shedRoof", "roofPanel", "panel"]);
const materialKinds = [{
    value: "plaster",
    label: "Putz"
}, {
    value: "brick",
    label: "Ziegel"
}, {
    value: "concrete",
    label: "Beton"
}, {
    value: "naturalStone",
    label: "Naturstein"
}, {
    value: "wood",
    label: "Holz"
}, {
    value: "glass",
    label: "Glas"
}, {
    value: "metal",
    label: "Metall"
}, {
    value: "roofTiles",
    label: "Dachziegel"
}, {
    value: "ribbedMetal",
    label: "Gerilltes Metall"
}, {
    value: "shingles",
    label: "Schindeln"
}, {
    value: "tile",
    label: "Fliesen"
}, {
    value: "smallTile",
    label: "Kleine Fliesen"
}, {
    value: "checkerTile",
    label: "Schachbrett-Fliesen"
}, {
    value: "laminate",
    label: "Laminat"
}, {
    value: "castFloor",
    label: "Gussboden"
}];
const patternOptions = [{
    value: "none",
    label: "Ohne"
}, {
    value: "brick",
    label: "Ziegel"
}, {
    value: "wood",
    label: "Holzbretter"
}, {
    value: "naturalStone",
    label: "Naturstein"
}, {
    value: "roofTiles",
    label: "Dachziegel"
}, {
    value: "ribbedMetal",
    label: "Rippen"
}, {
    value: "shingles",
    label: "Schindeln"
}, {
    value: "tile",
    label: "Fliesen"
}, {
    value: "smallTile",
    label: "Kleine Fliesen"
}, {
    value: "checkerTile",
    label: "Schachbrett"
}, {
    value: "laminate",
    label: "Laminat"
}, {
    value: "castFloor",
    label: "Guss"
}];
const paletteGroups = [{
    title: "Waende und Koerper",
    items: [{
        type: "wall",
        label: "Quadratische Wand"
    }, {
        type: "triangleWall",
        label: "Dreieckige Wand"
    }, {
        type: "cylinderWall",
        label: "Zylinderwand"
    }, {
        type: "floor",
        label: "Bodenplatte"
    }, {
        type: "triangleFill",
        label: "Dreieck-Fueller"
    }, {
        type: "wedgeFill",
        label: "Keil-Fueller"
    }, {
        type: "cone",
        label: "Kegel"
    }]
}, {
    title: "Daecher",
    items: [{
        type: "pyramidRoof",
        label: "Pyramidisches Dach"
    }, {
        type: "gableRoof",
        label: "Giebeldach"
    }, {
        type: "hipRoof",
        label: "Walmdach"
    }, {
        type: "flatRoof",
        label: "Flachdach"
    }, {
        type: "shedRoof",
        label: "Pultdach"
    }, {
        type: "mansardRoof",
        label: "Mansarddach"
    }, {
        type: "domeRoof",
        label: "Kuppeldach"
    }, {
        type: "roundRoof",
        label: "Runddach"
    }]
}, {
    title: "Fenster und Tueren",
    items: [{
        type: "window",
        label: "Fenster"
    }, {
        type: "door",
        label: "Tuer"
    }]
}, {
    title: "Moebel",
    items: [{
        type: "chair",
        label: "Stuhl"
    }, {
        type: "table",
        label: "Tisch"
    }, {
        type: "sofa",
        label: "Sofa"
    }, {
        type: "bed",
        label: "Bett"
    }, {
        type: "cabinet",
        label: "Schrank"
    }, {
        type: "counter",
        label: "Theke"
    }, {
        type: "shelf",
        label: "Regal"
    }, {
        type: "stove",
        label: "Ofen"
    }, {
        type: "chimney",
        label: "Kamin"
    }]
}];
const typeLabels = {
    wall: "Wand",
    triangleWall: "Dreieckige Wand",
    cylinderWall: "Zylinderwand",
    fillCylinder: "Fuell-Zylinder",
    floor: "Bodenplatte",
    triangleFill: "Dreieck-Fueller",
    wedgeFill: "Keil-Fueller",
    pyramidRoof: "Pyramidisches Dach",
    gableRoof: "Giebeldach",
    hipRoof: "Walmdach",
    flatRoof: "Flachdach",
    shedRoof: "Pultdach",
    mansardRoof: "Mansarddach",
    domeRoof: "Kuppeldach",
    roundRoof: "Runddach",
    cone: "Kegel",
    panel: "Panel",
    roofPanel: "Dachpanel",
    window: "Fenster",
    door: "Tuer",
    chair: "Stuhl",
    table: "Tisch",
    sofa: "Sofa",
    bed: "Bett",
    cabinet: "Schrank",
    counter: "Theke",
    shelf: "Regal",
    stove: "Ofen",
    chimney: "Kamin"
};
const numericSettingFields = new Set(["matchChunkX", "matchChunkZ", "matchIndex", "matchNearX", "matchNearZ", "matchRadius", "applyChance"]);

const meshById = new Map();
let elements = [];
let selectedId = null;
let idCounter = 1;
let mirrorCounter = 1;
let moveToolActive = false;
let snapKeyDown = false;
let dragging = null;
let selectionBox = null;
let activeTool = "";
let edgeSnapMode = false;
let edgeSnapSelection = null;
let toolSelection = [];

const modelSettings = {
    exportMode: "complete",
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

// Diagnostic map: printed at startup so a broken editor shows which editor functions are still available.
function getModelerFunctionMap() {
    return {
        setStatus,
        clamp,
        roundNumber,
        normalizeDegrees,
        degToRad,
        colorToNumber,
        hexLiteral,
        cloneData,
        validIdentifier,
        serializeJs,
        defaultPatternForMaterial,
        defaultMaterialKind,
        createMirrorGroupId,
        createId,
        createDefaultElement,
        getElement,
        getSelectedElement,
        getSourceElement,
        materialPreset,
        colorShade,
        createMaterial,
        createBox,
        createCylinderWallGeometry,
        createFillCylinderGeometry,
        createTriangleWallGeometry,
        createTriangleFillGeometry,
        createWedgeFillGeometry,
        createRidgeGeometry,
        createFrustumRoofGeometry,
        createShedGeometry,
        createRoundRoofGeometry,
        createPyramidGeometry,
        addBoxPattern,
        markElementObject,
        createPatternBoxGroup,
        createWindowObject,
        createDoorObject,
        createFurnitureObject,
        createElementObject,
        rebuildMeshes,
        updateSelectionBox,
        getListableElements,
        renderElementList,
        fieldHtml,
        selectHtml,
        checkboxHtml,
        getDimensionLabels,
        syncAllMirrors,
        syncAllLinkedElements,
        applyAllSync,
        commitScene,
        renderInspector,
        selectElement,
        setActiveTab,
        renderPalette,
        getMirrorVariants,
        mirrorHingeSide,
        mirrorSlopeDirection,
        applyMirrorVariant,
        createBundle,
        addBundleWithMirrors,
        duplicateSelected,
        deleteSelected,
        getElementExtent,
        getFootprint,
        rangesOverlap,
        snapPosition,
        pointerToGround,
        getElementIdFromObject,
        getRaycastHit,
        syncInspectorInputs,
        beginDrag,
        updateDrag,
        endDrag,
        composeMatrixForElement,
        getLocalBoxCorners,
        getCutterBoundsInHostLocal,
        cloneExportStyle,
        createPieceFromLocal,
        createBakedMirrors,
        cutOpening,
        runCutTool,
        edgeLength,
        midpointDistance2D,
        getElementWorldBounds,
        findClosestEdgePair,
        copyVisualSettings,
        runFillTool,
        getFootprintPoints,
        distancePointToSegment2D,
        getEdgesForElement,
        pickNearestEdge,
        toggleEdgeSnapMode,
        handleEdgeSnapHit,
        handleToolHit,
        onViewportPointerDown,
        exportCommonPart,
        partForExport,
        buildMatchConfig,
        exportEntry,
        formatCode,
        refreshCode,
        copyCode,
        renderSettings,
        resize,
        animate,
        setActiveTool
    };
}

function getModelerHealthRows() {
    const domRows = [
        ["DOM viewport", !!viewport],
        ["DOM elementList", !!elementList],
        ["DOM palette", !!palette],
        ["DOM inspector", !!inspector],
        ["DOM settingsPanel", !!settingsPanel],
        ["DOM codeOutput", !!codeOutput],
        ["Three scene", !!scene],
        ["Three camera", !!camera],
        ["Three renderer", !!renderer],
        ["Orbit controls", !!controls]
    ].map(([name, ok]) => ({
        typ: "system",
        name,
        funktioniert: !!ok
    }));
    const functionRows = Object.entries(getModelerFunctionMap()).map(([name, fn]) => ({
        typ: "function",
        name,
        funktioniert: typeof fn === "function"
    }));
    return domRows.concat(functionRows);
}

function printModelerHealthTable(reason = "manual") {
    const rows = getModelerHealthRows();
    console.groupCollapsed(`${MODEL_DEBUG_PREFIX} Funktionsstatus (${reason})`);
    console.table(rows);
    console.groupEnd();
    return rows;
}

window.__tmBuildingModelerDebug = {
    printHealthTable: printModelerHealthTable,
    getHealthRows: getModelerHealthRows,
    getElements: () => elements,
    getSettings: () => modelSettings
};

function setStatus(text) {
    statusText.textContent = text;
    modelLog("Status", text);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function roundNumber(value) {
    const rounded = Math.round((Number(value) || 0) * 1000) / 1000;
    return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeDegrees(value) {
    let output = roundNumber(Number(value) || 0) % 360;
    if (output < 0)
        output += 360;
    return output;
}

function degToRad(value) {
    return (Number(value) || 0) * Math.PI / 180;
}

function colorToNumber(color) {
    return Number.parseInt(String(color || "#cccccc").replace("#", "").slice(0, 6), 16) || 0xcccccc;
}

function hexLiteral(color) {
    return `__HEX__0x${String(color || "#cccccc").replace("#", "").padStart(6, "0").slice(0, 6)}`;
}

function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
}

function validIdentifier(key) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

function serializeJs(value) {
    if (Array.isArray(value))
        return `[${value.map(serializeJs).join(",")}]`;
    if (value && typeof value === "object")
        return `{${Object.entries(value).filter(([, current]) => current !== undefined).map(([key, current]) => `${validIdentifier(key) ? key : JSON.stringify(key)}:${serializeJs(current)}`).join(",")}}`;
    if (typeof value === "string")
        return value.startsWith("__HEX__") ? value.slice(7) : JSON.stringify(value);
    if (typeof value === "number")
        return Number.isFinite(value) ? String(Object.is(value, -0) ? 0 : value) : "0";
    if (typeof value === "boolean")
        return value ? "true" : "false";
    return "null";
}

function defaultPatternForMaterial(materialKind) {
    const map = {
        brick: "brick",
        naturalStone: "naturalStone",
        wood: "wood",
        roofTiles: "roofTiles",
        ribbedMetal: "ribbedMetal",
        shingles: "shingles",
        tile: "tile",
        smallTile: "smallTile",
        checkerTile: "checkerTile",
        laminate: "laminate",
        castFloor: "castFloor"
    };
    return map[materialKind] || "none";
}

function defaultMaterialKind(type) {
    if (roofTypes.has(type))
        return "roofTiles";
    if (type === "window")
        return "glass";
    if (type === "door" || type === "chair" || type === "table" || type === "sofa" || type === "bed" || type === "cabinet" || type === "shelf")
        return "wood";
    if (type === "counter")
        return "concrete";
    if (type === "stove")
        return "metal";
    if (type === "chimney")
        return "brick";
    if (type === "floor")
        return "laminate";
    return "plaster";
}

function createMirrorGroupId() {
    return `mirror_${mirrorCounter++}`;
}

function createId() {
    return `part_${idCounter++}`;
}

function createDefaultElement(type, position = {
    x: 0,
    z: 0
}) {
    const baseMaterial = defaultMaterialKind(type);
    const base = {
        id: createId(),
        type,
        name: typeLabels[type] || "Part",
        x: roundNumber(position.x),
        y: 1.5,
        z: roundNumber(position.z),
        rx: 0,
        ry: 0,
        rz: 0,
        a: 4,
        b: 3,
        c: .24,
        color: "#d8c6a6",
        opacity: 1,
        materialKind: baseMaterial,
        patternType: defaultPatternForMaterial(baseMaterial),
        patternScale: 1,
        patternDepth: .03,
        mirrorRole: "source",
        mirrorGroupId: "",
        mirrorSourceId: "",
        mirrorVariant: "",
        mirrorMode: "off",
        linkedTo: ""
    };
    switch (type) {
        case "triangleWall":
            return Object.assign(base, {
                a: 3.4,
                b: 2.7,
                c: .22,
                slopeDirection: "left"
            });
        case "cylinderWall":
            return Object.assign(base, {
                a: 2.6,
                b: 3,
                c: 2.6,
                thickness: .22,
                angle: 270,
                startAngle: 0,
                segments: 24,
                color: "#cdbb9b"
            });
        case "fillCylinder":
            return Object.assign(base, {
                a: 1.9,
                b: 3,
                c: 1.9,
                segments: 24,
                color: "#d4c5aa"
            });
        case "floor":
            return Object.assign(base, {
                y: .06,
                a: 5.8,
                b: .12,
                c: 5.8,
                color: "#b88f61",
                materialKind: "laminate",
                patternType: "laminate",
                patternScale: 1,
                patternDepth: .012
            });
        case "triangleFill":
            return Object.assign(base, {
                y: 2.4,
                a: 3,
                b: 1.2,
                c: .22,
                color: "#d8c6a6",
                slopeDirection: "left"
            });
        case "wedgeFill":
            return Object.assign(base, {
                y: 2.3,
                a: 3,
                b: 1.2,
                c: .55,
                color: "#d8c6a6",
                slopeDirection: "left"
            });
        case "pyramidRoof":
            return Object.assign(base, {
                y: 4.2,
                a: 6.2,
                b: 2.2,
                c: 6.2,
                sides: 4,
                topMode: "ridge",
                ridgeLength: 3.8,
                ridgeDirection: "x",
                topScale: .35,
                topWidth: 2,
                topDepth: 2,
                sideScale1: 1,
                sideScale2: 1,
                sideScale3: 1,
                sideScale4: 1,
                color: "#7f3d32"
            });
        case "gableRoof":
            return Object.assign(base, {
                y: 4.2,
                a: 6.5,
                b: 2.1,
                c: 6.2,
                ridgeDirection: "x",
                ridgeLength: 6.2,
                color: "#7a4338"
            });
        case "hipRoof":
            return Object.assign(base, {
                y: 4.2,
                a: 6.2,
                b: 2,
                c: 6.2,
                topScale: .24,
                color: "#744233"
            });
        case "flatRoof":
            return Object.assign(base, {
                y: 3.25,
                a: 6.3,
                b: .22,
                c: 6.3,
                color: "#676c71",
                materialKind: "ribbedMetal",
                patternType: "ribbedMetal"
            });
        case "shedRoof":
            return Object.assign(base, {
                y: 4,
                a: 6.4,
                b: 2.2,
                c: 6.2,
                slopeDirection: "left",
                color: "#7a4338"
            });
        case "mansardRoof":
            return Object.assign(base, {
                y: 4.2,
                a: 6.4,
                b: 2.5,
                c: 6.4,
                topScale: .55,
                color: "#6d3a31"
            });
        case "domeRoof":
            return Object.assign(base, {
                y: 4.2,
                a: 5,
                b: 2.6,
                c: 5,
                color: "#7d533d"
            });
        case "roundRoof":
            return Object.assign(base, {
                y: 4.1,
                a: 6.2,
                b: 2.1,
                c: 5.4,
                color: "#7a4338"
            });
        case "cone":
            return Object.assign(base, {
                y: 2,
                a: 1.4,
                b: 4,
                c: 1.4,
                segments: 24,
                color: "#8d4f3d"
            });
        case "panel":
        case "roofPanel":
            return Object.assign(base, {
                a: 4,
                b: .18,
                c: 3
            });
        case "window":
            return Object.assign(base, {
                y: 1.6,
                a: 1.2,
                b: 1.4,
                c: .16,
                color: "#f1eadf",
                frameColor: "#f1eadf",
                glassColor: "#9dd5ff",
                opacity: .55,
                materialKind: "glass",
                patternType: "none"
            });
        case "door":
            return Object.assign(base, {
                y: 1.1,
                a: 1.05,
                b: 2.2,
                c: .14,
                color: "#734737",
                frameColor: "#ece0cb",
                hingeSide: "left",
                openAngle: 90,
                isOpen: false,
                materialKind: "wood",
                patternType: "wood"
            });
        case "chair":
            return Object.assign(base, {
                y: .6,
                a: .8,
                b: 1.1,
                c: .8,
                color: "#8e654e",
                patternType: "wood"
            });
        case "table":
            return Object.assign(base, {
                y: .8,
                a: 1.6,
                b: 1,
                c: 1,
                color: "#8b634a",
                patternType: "wood"
            });
        case "sofa":
            return Object.assign(base, {
                y: .7,
                a: 2.2,
                b: 1,
                c: 1,
                color: "#8b6f55",
                materialKind: "wood",
                patternType: "wood"
            });
        case "bed":
            return Object.assign(base, {
                y: .45,
                a: 2.2,
                b: .85,
                c: 1.6,
                color: "#826149",
                patternType: "wood"
            });
        case "cabinet":
            return Object.assign(base, {
                y: 1.2,
                a: 1.3,
                b: 2.3,
                c: .55,
                color: "#805c47",
                patternType: "wood"
            });
        case "counter":
            return Object.assign(base, {
                y: .95,
                a: 2.4,
                b: 1,
                c: .85,
                color: "#d4ccbe",
                materialKind: "concrete",
                patternType: "none"
            });
        case "shelf":
            return Object.assign(base, {
                y: 1.2,
                a: 1.4,
                b: 2.2,
                c: .4,
                color: "#7f614b",
                patternType: "wood"
            });
        case "stove":
            return Object.assign(base, {
                y: .65,
                a: .9,
                b: 1.2,
                c: .7,
                color: "#53585d",
                materialKind: "metal",
                patternType: "ribbedMetal"
            });
        case "chimney":
            return Object.assign(base, {
                y: 3.4,
                a: .42,
                b: 4.5,
                c: .42,
                color: "#8a5445",
                materialKind: "brick",
                patternType: "brick"
            });
        default:
            return base;
    }
}

function getElement(id = selectedId) {
    return elements.find(element => element.id === id) || null;
}

function getSelectedElement() {
    return getElement(selectedId);
}

function getSourceElement(element) {
    if (!element)
        return null;
    if (element.mirrorRole !== "mirror")
        return element;
    return elements.find(candidate => candidate.id === element.mirrorSourceId) || element;
}

function materialPreset(kind) {
    const presets = {
        plaster: {
            roughness: .96,
            metalness: .02
        },
        brick: {
            roughness: .92,
            metalness: .05
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
            roughness: .18,
            metalness: .04
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

function colorShade(color, amount) {
    const input = new THREE.Color(colorToNumber(color));
    const target = amount >= 0 ? new THREE.Color(0xffffff) : new THREE.Color(0x000000);
    input.lerp(target, Math.abs(amount));
    return input.getHex();
}

function createMaterial(element, overrides = {}) {
    const preset = materialPreset(element.materialKind || defaultMaterialKind(element.type));
    const transparent = overrides.transparent != null ? overrides.transparent : Number(element.opacity) < 1 || element.materialKind === "glass" && element.type !== "window";
    const opacity = overrides.opacity != null ? overrides.opacity : clamp(Number(element.opacity) || 1, .05, 1);
    return new THREE.MeshStandardMaterial(Object.assign({
        color: overrides.color != null ? overrides.color : colorToNumber(element.color),
        roughness: preset.roughness,
        metalness: preset.metalness,
        transparent,
        opacity,
        side: THREE.DoubleSide
    }, overrides));
}

function createBox(size, color, position = [0, 0, 0], material = null) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material || new THREE.MeshStandardMaterial({
        color
    }));
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createCylinderWallGeometry(element) {
    const height = Math.max(.05, Number(element.b) || 3);
    const radiusX = Math.max(.05, Number(element.a) || 2);
    const radiusZ = Math.max(.05, Number(element.c) || radiusX);
    const thickness = Math.min(Math.max(.02, Number(element.thickness) || .2), Math.min(radiusX, radiusZ) - .01);
    const segments = Math.max(3, Math.round(Number(element.segments) || 24));
    const thetaStart = (Number(element.startAngle) || 0) * Math.PI / 180;
    const thetaLength = clamp(Math.abs(Number(element.angle) || 90), 1, 360) * Math.PI / 180;
    const fullCircle = thetaLength >= Math.PI * 2 - .001;
    const positions = [];
    const indices = [];

    const face = (a, b, c, d) => {
        indices.push(a, b, c);
        d != null && indices.push(b, d, c);
    };

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
        face(base, next, base + 1, next + 1);
        face(next + 2, base + 2, next + 3, base + 3);
        face(base + 1, next + 1, base + 3, next + 3);
        face(next, base, next + 2, base + 2);
    }

    if (!fullCircle) {
        const first = 0;
        const last = 4 * segments;
        face(first, first + 1, first + 2, first + 3);
        face(last + 2, last + 3, last, last + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function createFillCylinderGeometry(element) {
    const height = Math.max(.05, Number(element.b) || 3);
    const radiusX = Math.max(.05, Number(element.a) || 1);
    const radiusZ = Math.max(.05, Number(element.c) || radiusX);
    const segments = Math.max(3, Math.round(Number(element.segments) || 24));
    const geometry = new THREE.CylinderGeometry(1, 1, height, segments);
    geometry.scale(radiusX, 1, radiusZ);
    return geometry;
}

function createTriangleWallGeometry(element) {
    const width = Math.max(.05, Number(element.a) || 2);
    const height = Math.max(.05, Number(element.b) || 2);
    const depth = Math.max(.02, Number(element.c) || .15);
    const leftHigh = String(element.slopeDirection || "left").toLowerCase() !== "right";
    const topX = leftHigh ? -width / 2 : width / 2;
    const flatX = leftHigh ? width / 2 : -width / 2;
    const front = [
        [topX, height / 2, depth / 2],
        [flatX, -height / 2, depth / 2],
        [topX, -height / 2, depth / 2]
    ];
    const back = front.map(point => [point[0], point[1], -depth / 2]);
    const vertices = [...front, ...back];
    const indices = [
        0, 1, 2,
        5, 4, 3,
        0, 3, 1, 1, 3, 4,
        0, 2, 3, 2, 5, 3,
        2, 1, 5, 1, 4, 5
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function createTriangleFillGeometry(element) {
    return createTriangleWallGeometry(element);
}

function createWedgeFillGeometry(element) {
    const width = Math.max(.05, Number(element.a) || 2);
    const height = Math.max(.05, Number(element.b) || 1);
    const depth = Math.max(.05, Number(element.c) || .5);
    const leftHigh = String(element.slopeDirection || "left").toLowerCase() !== "right";
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
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex([
        0, 1, 2,
        5, 4, 3,
        0, 3, 1, 1, 3, 4,
        0, 2, 3, 2, 5, 3,
        2, 1, 5, 1, 4, 5
    ]);
    geometry.computeVertexNormals();
    return geometry;
}

function createRidgeGeometry(width, height, depth, ridgeDirection = "x", ridgeLength = null) {
    const maxLength = ridgeDirection === "x" ? width : depth;
    const actualRidgeLength = Math.max(.1, Math.min(maxLength, ridgeLength == null ? maxLength : ridgeLength));
    const y0 = -height / 2;
    const y1 = height / 2;
    const vertices = ridgeDirection === "x" ? [
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
    const indices = ridgeDirection === "x" ? [0, 1, 4, 1, 5, 4, 3, 4, 2, 2, 4, 5, 0, 4, 3, 1, 2, 5] : [0, 4, 1, 1, 4, 5, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function createFrustumRoofGeometry(width, height, depth, topScale) {
    const topWidth = Math.max(.2, width * Math.max(.05, Number(topScale) || .3));
    const topDepth = Math.max(.2, depth * Math.max(.05, Number(topScale) || .3));
    const bottom = [
        [-width / 2, -height / 2, -depth / 2],
        [width / 2, -height / 2, -depth / 2],
        [width / 2, -height / 2, depth / 2],
        [-width / 2, -height / 2, depth / 2]
    ];
    const top = [
        [-topWidth / 2, height / 2, -topDepth / 2],
        [topWidth / 2, height / 2, -topDepth / 2],
        [topWidth / 2, height / 2, topDepth / 2],
        [-topWidth / 2, height / 2, topDepth / 2]
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([...bottom, ...top].flat(), 3));
    geometry.setIndex([
        0, 1, 4, 1, 5, 4,
        1, 2, 5, 2, 6, 5,
        2, 3, 6, 3, 7, 6,
        3, 0, 7, 0, 4, 7,
        4, 5, 6, 4, 6, 7
    ]);
    geometry.computeVertexNormals();
    return geometry;
}

function createShedGeometry(element) {
    const width = Math.max(.05, Number(element.a) || 4);
    const height = Math.max(.05, Number(element.b) || 2);
    const depth = Math.max(.05, Number(element.c) || 4);
    const leftHigh = String(element.slopeDirection || "left").toLowerCase() !== "right";
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
    const indices = [
        0, 1, 3, 1, 2, 3,
        4, 7, 5, 5, 7, 6,
        0, 4, 1, 1, 4, 5,
        1, 5, 2, 2, 5, 6,
        2, 6, 3, 3, 6, 7,
        0, 3, 4, 3, 7, 4
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function createRoundRoofGeometry(element) {
    const width = Math.max(.1, Number(element.a) || 4);
    const height = Math.max(.1, Number(element.b) || 2);
    const depth = Math.max(.1, Number(element.c) || 4);
    const geometry = new THREE.CylinderGeometry(1, 1, width, 20, 1, false, 0, Math.PI);
    geometry.rotateZ(Math.PI / 2);
    geometry.scale(1, height, depth / 2);
    return geometry;
}

function createPyramidGeometry(element) {
    const width = Math.max(.05, Number(element.a) || 4);
    const height = Math.max(.05, Number(element.b) || 2);
    const depth = Math.max(.05, Number(element.c) || 4);
    const topMode = String(element.topMode || "point").toLowerCase();
    if (topMode === "ridge")
        return createRidgeGeometry(width, height, depth, element.ridgeDirection === "z" ? "z" : "x", Number(element.ridgeLength) || null);
    if (topMode === "flat")
        return createFrustumRoofGeometry(width, height, depth, Number(element.topScale) || .35);
    const geometry = new THREE.ConeGeometry(width / 2, height, Math.max(4, Math.round(Number(element.sides) || 4)));
    geometry.scale(1, 1, depth / width);
    geometry.rotateY(Math.PI / 4);
    return geometry;
}

function addBoxPattern(group, element, size, mode = "wall") {
    const patternType = String(element.patternType || "none");
    if (patternType === "none")
        return;
    const width = Math.max(.1, Number(size[0]) || 1);
    const height = Math.max(.1, Number(size[1]) || 1);
    const depth = Math.max(.04, Number(size[2]) || .2);
    const scale = Math.max(.2, Number(element.patternScale) || 1);
    const bump = Math.max(.008, Number(element.patternDepth) || .03);
    const color = colorShade(element.color, .12);
    const material = new THREE.MeshStandardMaterial({
        color,
        roughness: .88,
        metalness: .08
    });

    const addFrontBackBox = (sx, sy, px, py, pz) => {
        group.add(createBox([sx, sy, bump], color, [px, py, pz], material));
    };
    const addTopBox = (sx, sz, px, py, pz) => {
        group.add(createBox([sx, bump, sz], color, [px, py, pz], material));
    };

    if (mode === "floor" || patternType === "tile" || patternType === "smallTile" || patternType === "checkerTile" || patternType === "laminate" || patternType === "castFloor") {
        if (patternType === "castFloor") {
            const bands = Math.max(4, Math.round(width / (.9 * scale)));
            for (let band = 0; band < bands; band++) {
                const localX = -width / 2 + width * (band + .5) / bands;
                addTopBox(width / bands * .18, depth * .96, localX, height / 2 + bump / 2, 0);
            }
            return;
        }
        if (patternType === "laminate") {
            const plankWidth = Math.max(.18, .28 * scale);
            const planks = Math.max(4, Math.round(width / plankWidth));
            for (let plank = 0; plank < planks; plank++) {
                const localX = -width / 2 + width * (plank + .5) / planks;
                const shade = plank % 2 ? colorShade(element.color, .08) : color;
                const plankMaterial = new THREE.MeshStandardMaterial({
                    color: shade,
                    roughness: .7,
                    metalness: .05
                });
                group.add(createBox([width / planks * .86, bump, depth * .96], shade, [localX, height / 2 + bump / 2, 0], plankMaterial));
            }
            return;
        }
        const tileBase = patternType === "smallTile" ? .34 : .72;
        const tileSize = Math.max(.14, tileBase * scale);
        const cols = Math.max(2, Math.round(width / tileSize));
        const rows = Math.max(2, Math.round(depth / tileSize));
        const tileWidth = width / cols;
        const tileDepth = depth / rows;
        for (let row = 0; row < rows; row++)
            for (let col = 0; col < cols; col++) {
                const localX = -width / 2 + tileWidth / 2 + col * tileWidth;
                const localZ = -depth / 2 + tileDepth / 2 + row * tileDepth;
                const shade = patternType === "checkerTile" && (row + col) % 2 ? colorShade(element.color, -.28) : color;
                const tileMaterial = new THREE.MeshStandardMaterial({
                    color: shade,
                    roughness: .72,
                    metalness: .08
                });
                group.add(createBox([tileWidth * .88, bump, tileDepth * .88], shade, [localX, height / 2 + bump / 2, localZ], tileMaterial));
            }
        return;
    }

    if (mode === "roof" || patternType === "roofTiles" || patternType === "shingles" || patternType === "ribbedMetal") {
        const rows = Math.max(3, Math.round(depth / (.42 * scale)));
        const cols = Math.max(2, Math.round(width / (.8 * scale)));
        const tileWidth = width / cols;
        const tileDepth = depth / rows;
        for (let row = 0; row < rows; row++) {
            const localZ = -depth / 2 + tileDepth / 2 + row * tileDepth;
            if (patternType === "ribbedMetal") {
                for (let rib = 0; rib < cols; rib++) {
                    const localX = -width / 2 + tileWidth / 2 + rib * tileWidth;
                    addTopBox(tileWidth * .16, tileDepth * .96, localX, height / 2 + bump / 2, localZ);
                }
                continue;
            }
            for (let col = 0; col < cols; col++) {
                const shift = row % 2 ? tileWidth * .18 : 0;
                const localX = clamp(-width / 2 + tileWidth / 2 + col * tileWidth + shift, -width / 2 + tileWidth / 2, width / 2 - tileWidth / 2);
                addTopBox(tileWidth * .88, tileDepth * (patternType === "shingles" ? .56 : .72), localX, height / 2 + bump / 2, localZ);
            }
        }
        return;
    }

    const rows = Math.max(2, Math.round(height / (.45 * scale)));
    const cols = Math.max(2, Math.round(width / (.8 * scale)));
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    for (const face of [-1, 1]) {
        if (patternType === "wood") {
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
                const offset = patternType === "brick" && row % 2 ? cellWidth / 2 : 0;
                const localX = clamp(-width / 2 + cellWidth / 2 + col * cellWidth + offset, -width / 2 + cellWidth / 2, width / 2 - cellWidth / 2);
                const localY = -height / 2 + cellHeight / 2 + row * cellHeight;
                const sx = patternType === "naturalStone" ? cellWidth * (.55 + (col % 3) * .12) : cellWidth * .88;
                const sy = patternType === "naturalStone" ? cellHeight * (.62 + (row % 2) * .14) : cellHeight * .72;
                addFrontBackBox(sx, sy, localX, localY, face * (depth / 2 + bump / 2));
            }
    }
}

function markElementObject(object, elementId) {
    object.userData.elementId = elementId;
    object.traverse(child => {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.elementId = elementId;
    });
    return object;
}

function createPatternBoxGroup(element, size, mode = "wall") {
    const group = new THREE.Group();
    group.add(createBox(size, colorToNumber(element.color), [0, 0, 0], createMaterial(element)));
    addBoxPattern(group, element, size, mode);
    return group;
}

function createWindowObject(element) {
    const width = Math.max(.2, Number(element.a) || 1.2);
    const height = Math.max(.2, Number(element.b) || 1.2);
    const depth = Math.max(.05, Number(element.c) || .14);
    const frameThickness = Math.max(.04, Math.min(width, height) * .09);
    const group = new THREE.Group();
    const frameMaterial = createMaterial(Object.assign({}, element, {
        color: element.frameColor || element.color,
        materialKind: "metal",
        opacity: 1
    }), {
        color: colorToNumber(element.frameColor || element.color),
        transparent: false,
        opacity: 1
    });
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: colorToNumber(element.glassColor || "#9dd5ff"),
        roughness: .08,
        metalness: .05,
        transparent: true,
        opacity: clamp(Number(element.opacity) || .55, .08, .95)
    });
    group.add(createBox([width, frameThickness, depth], 0xffffff, [0, height / 2 - frameThickness / 2, 0], frameMaterial));
    group.add(createBox([width, frameThickness, depth], 0xffffff, [0, -height / 2 + frameThickness / 2, 0], frameMaterial));
    group.add(createBox([frameThickness, height - frameThickness * 2, depth], 0xffffff, [-width / 2 + frameThickness / 2, 0, 0], frameMaterial));
    group.add(createBox([frameThickness, height - frameThickness * 2, depth], 0xffffff, [width / 2 - frameThickness / 2, 0, 0], frameMaterial));
    group.add(createBox([Math.max(.1, width - frameThickness * 2), Math.max(.1, height - frameThickness * 2), Math.max(.03, depth * .45)], 0xffffff, [0, 0, 0], glassMaterial));
    return group;
}

function createDoorObject(element) {
    const width = Math.max(.25, Number(element.a) || 1);
    const height = Math.max(.25, Number(element.b) || 2);
    const depth = Math.max(.04, Number(element.c) || .1);
    const frameThickness = Math.max(.05, Math.min(width, height) * .08);
    const group = new THREE.Group();
    const frameMaterial = createMaterial(Object.assign({}, element, {
        color: element.frameColor || element.color,
        materialKind: "wood",
        opacity: 1
    }), {
        color: colorToNumber(element.frameColor || element.color),
        transparent: false,
        opacity: 1
    });
    const leafMaterial = createMaterial(element);
    group.add(createBox([width, frameThickness, depth], 0xffffff, [0, height / 2 - frameThickness / 2, 0], frameMaterial));
    group.add(createBox([frameThickness, height, depth], 0xffffff, [-width / 2 + frameThickness / 2, 0, 0], frameMaterial));
    group.add(createBox([frameThickness, height, depth], 0xffffff, [width / 2 - frameThickness / 2, 0, 0], frameMaterial));
    const hingeLeft = String(element.hingeSide || "left").toLowerCase() !== "right";
    const pivot = new THREE.Group();
    pivot.position.set(hingeLeft ? -width / 2 + frameThickness / 2 : width / 2 - frameThickness / 2, 0, 0);
    const leaf = createBox([width - frameThickness * 1.5, height - frameThickness * 1.5, Math.max(.03, depth * .82)], 0xffffff, [hingeLeft ? (width - frameThickness * 1.5) / 2 : -(width - frameThickness * 1.5) / 2, 0, 0], leafMaterial);
    pivot.add(leaf);
    const targetAngle = element.isOpen ? clamp(Number(element.openAngle) || 90, 0, 180) : 0;
    pivot.rotation.y = degToRad(hingeLeft ? -targetAngle : targetAngle);
    group.add(pivot);
    return group;
}

function createFurnitureObject(element) {
    const width = Math.max(.2, Number(element.a) || 1);
    const height = Math.max(.2, Number(element.b) || 1);
    const depth = Math.max(.2, Number(element.c) || 1);
    const group = new THREE.Group();
    const material = createMaterial(element);
    const metalMaterial = createMaterial(Object.assign({}, element, {
        materialKind: "metal",
        opacity: 1
    }), {
        color: colorShade(element.color, -.18),
        transparent: false,
        opacity: 1
    });
    const addLegs = (topY, legHeight, inset = .08, legWidth = .08) => {
        const x = width / 2 - inset - legWidth / 2;
        const z = depth / 2 - inset - legWidth / 2;
        for (const sx of [-1, 1])
            for (const sz of [-1, 1])
                group.add(createBox([legWidth, legHeight, legWidth], 0xffffff, [sx * x, topY - legHeight / 2, sz * z], metalMaterial));
    };

    if (element.type === "chair") {
        group.add(createBox([width, height * .18, depth], 0xffffff, [0, -.1, 0], material));
        group.add(createBox([width, height * .5, depth * .18], 0xffffff, [0, height * .25, -depth / 2 + depth * .09], material));
        addLegs(-.1, height * .55, .08, Math.max(.05, width * .08));
    } else if (element.type === "table") {
        group.add(createBox([width, height * .14, depth], 0xffffff, [0, height * .42, 0], material));
        addLegs(height * .35, height * .82, .1, Math.max(.05, width * .06));
    } else if (element.type === "sofa") {
        group.add(createBox([width, height * .28, depth * .75], 0xffffff, [0, -.08, depth * .06], material));
        group.add(createBox([width, height * .46, depth * .2], 0xffffff, [0, height * .2, -depth / 2 + depth * .1], material));
        group.add(createBox([width * .13, height * .34, depth * .72], 0xffffff, [-width / 2 + width * .065, .02, depth * .03], material));
        group.add(createBox([width * .13, height * .34, depth * .72], 0xffffff, [width / 2 - width * .065, .02, depth * .03], material));
    } else if (element.type === "bed") {
        group.add(createBox([width, height * .28, depth], 0xffffff, [0, -.1, 0], material));
        group.add(createBox([width * .94, height * .2, depth * .92], 0xffffff, [0, height * .08, 0], createMaterial(Object.assign({}, element, {
            color: "#ddd5c8",
            materialKind: "plaster"
        }), {
            color: colorToNumber("#ddd5c8")
        })));
        group.add(createBox([width, height * .52, depth * .08], 0xffffff, [0, height * .2, -depth / 2 + depth * .04], material));
    } else if (element.type === "cabinet") {
        group.add(createBox([width, height, depth], 0xffffff, [0, 0, 0], material));
        group.add(createBox([width * .02, height * .8, depth * .12], 0xffffff, [0, 0, depth / 2 + depth * .02], metalMaterial));
    } else if (element.type === "counter") {
        group.add(createBox([width, height * .86, depth], 0xffffff, [0, -height * .05, 0], material));
        group.add(createBox([width * 1.02, height * .12, depth * 1.04], 0xffffff, [0, height * .42, 0], createMaterial(Object.assign({}, element, {
            color: "#ebe6de",
            materialKind: "concrete"
        }), {
            color: colorToNumber("#ebe6de")
        })));
    } else if (element.type === "shelf") {
        group.add(createBox([width * .08, height, depth], 0xffffff, [-width / 2 + width * .04, 0, 0], material));
        group.add(createBox([width * .08, height, depth], 0xffffff, [width / 2 - width * .04, 0, 0], material));
        for (let index = 0; index < 4; index++) {
            const y = -height / 2 + height * .12 + index * (height * .26);
            group.add(createBox([width, height * .05, depth], 0xffffff, [0, y, 0], material));
        }
    } else if (element.type === "stove") {
        group.add(createBox([width, height, depth], 0xffffff, [0, 0, 0], material));
        group.add(createBox([width * .92, height * .06, depth * .92], 0xffffff, [0, height / 2 + height * .03, 0], metalMaterial));
        group.add(createBox([width * .56, height * .36, depth * .04], 0xffffff, [0, -.05, depth / 2 + depth * .03], metalMaterial));
    } else if (element.type === "chimney") {
        group.add(createBox([width, height, depth], 0xffffff, [0, 0, 0], material));
        group.add(createBox([width * 1.25, height * .06, depth * 1.25], 0xffffff, [0, height / 2 + height * .03, 0], material));
    }
    return group;
}

function createElementObject(element) {
    let object = null;
    const size = [Math.max(.05, Number(element.a) || 1), Math.max(.05, Number(element.b) || 1), Math.max(.02, Number(element.c) || .1)];
    if (element.type === "wall")
        object = createPatternBoxGroup(element, size, "wall");
    else if (element.type === "floor")
        object = createPatternBoxGroup(element, size, "floor");
    else if (element.type === "triangleWall")
        object = new THREE.Mesh(createTriangleWallGeometry(element), createMaterial(element));
    else if (element.type === "triangleFill")
        object = new THREE.Mesh(createTriangleFillGeometry(element), createMaterial(element));
    else if (element.type === "wedgeFill")
        object = new THREE.Mesh(createWedgeFillGeometry(element), createMaterial(element));
    else if (element.type === "cylinderWall")
        object = new THREE.Mesh(createCylinderWallGeometry(element), createMaterial(element));
    else if (element.type === "fillCylinder")
        object = new THREE.Mesh(createFillCylinderGeometry(element), createMaterial(element));
    else if (element.type === "pyramidRoof")
        object = new THREE.Mesh(createPyramidGeometry(element), createMaterial(element));
    else if (element.type === "gableRoof")
        object = new THREE.Mesh(createRidgeGeometry(size[0], size[1], size[2], element.ridgeDirection === "z" ? "z" : "x", Number(element.ridgeLength) || size[0]), createMaterial(element));
    else if (element.type === "hipRoof")
        object = new THREE.Mesh(createFrustumRoofGeometry(size[0], size[1], size[2], Number(element.topScale) || .22), createMaterial(element));
    else if (element.type === "flatRoof")
        object = createPatternBoxGroup(element, size, "roof");
    else if (element.type === "shedRoof")
        object = new THREE.Mesh(createShedGeometry(element), createMaterial(element));
    else if (element.type === "mansardRoof")
        object = new THREE.Mesh(createFrustumRoofGeometry(size[0], size[1], size[2], Number(element.topScale) || .55), createMaterial(element));
    else if (element.type === "domeRoof") {
        const geometry = new THREE.SphereGeometry(1, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        geometry.scale(size[0] / 2, size[1], size[2] / 2);
        object = new THREE.Mesh(geometry, createMaterial(element));
    } else if (element.type === "roundRoof")
        object = new THREE.Mesh(createRoundRoofGeometry(element), createMaterial(element));
    else if (element.type === "cone") {
        const geometry = new THREE.CylinderGeometry(0, Math.max(.05, Number(element.a) || 1), Math.max(.05, Number(element.b) || 2), Math.max(3, Math.round(Number(element.segments) || 16)));
        geometry.scale(1, 1, Math.max(.05, Number(element.c) || Number(element.a) || 1) / Math.max(.05, Number(element.a) || 1));
        object = new THREE.Mesh(geometry, createMaterial(element));
    } else if (element.type === "window")
        object = createWindowObject(element);
    else if (element.type === "door")
        object = createDoorObject(element);
    else if (["chair", "table", "sofa", "bed", "cabinet", "counter", "shelf", "stove", "chimney"].includes(element.type))
        object = createFurnitureObject(element);
    else
        object = createPatternBoxGroup(element, size, roofTypes.has(element.type) ? "roof" : "wall");
    object.position.set(Number(element.x) || 0, Number(element.y) || 0, Number(element.z) || 0);
    object.rotation.set(degToRad(element.rx), degToRad(element.ry), degToRad(element.rz));
    return markElementObject(object, element.id);
}

function rebuildMeshes() {
    modelLog("Rebuild meshes start", {
        elementCount: elements.length
    });
    for (const child of [...elementGroup.children]) {
        child.traverse(current => {
            current.geometry && current.geometry.dispose();
            if (Array.isArray(current.material))
                current.material.forEach(material => material.dispose());
            else
                current.material && current.material.dispose();
        });
        elementGroup.remove(child);
    }
    meshById.clear();
    for (const element of elements) {
        const mesh = createElementObject(element);
        meshById.set(element.id, mesh);
        elementGroup.add(mesh);
    }
    updateSelectionBox();
    modelLog("Rebuild meshes done", {
        meshCount: meshById.size
    });
}

function updateSelectionBox() {
    if (selectionBox) {
        scene.remove(selectionBox);
        selectionBox.geometry && selectionBox.geometry.dispose();
        selectionBox.material && selectionBox.material.dispose();
        selectionBox = null;
    }
    const element = getSourceElement(getSelectedElement());
    const mesh = element && meshById.get(element.id);
    if (!mesh)
        return;
    selectionBox = new THREE.BoxHelper(mesh, 0x77b7ff);
    scene.add(selectionBox);
}

function getListableElements() {
    return elements.filter(element => element.mirrorRole !== "mirror");
}

function renderElementList() {
    elementList.innerHTML = "";
    const visible = getListableElements();
    if (!visible.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "Keine Elemente";
        elementList.appendChild(empty);
        return;
    }
    for (const element of visible) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `element-item${getSourceElement(getSelectedElement()) && getSourceElement(getSelectedElement()).id === element.id ? " selected" : ""}`;
        button.dataset.id = element.id;
        button.innerHTML = `<span class="element-swatch" style="background:${escapeHtml(element.color)}"></span><span>${escapeHtml(element.name)}${element.mirrorGroupId ? " - Spiegel" : ""}</span>`;
        button.addEventListener("click", () => selectElement(element.id));
        elementList.appendChild(button);
    }
}

function fieldHtml(prop, label, value, type = "number", attrs = "") {
    return `<div class="field"><label>${escapeHtml(label)}</label><input data-prop="${escapeHtml(prop)}" type="${escapeHtml(type)}" value="${escapeHtml(value ?? "")}" ${attrs}></div>`;
}

function selectHtml(prop, label, value, options) {
    return `<div class="field"><label>${escapeHtml(label)}</label><select data-prop="${escapeHtml(prop)}">${options.map(option => `<option value="${escapeHtml(option.value)}"${String(option.value) === String(value) ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></div>`;
}

function checkboxHtml(prop, label, checked) {
    return `<div class="checkbox-row"><input data-prop="${escapeHtml(prop)}" type="checkbox"${checked ? " checked" : ""}><label>${escapeHtml(label)}</label></div>`;
}

function getDimensionLabels(type) {
    if (type === "cylinderWall" || type === "fillCylinder")
        return ["Radius X", "Hoehe", "Radius Z"];
    if (type === "window" || type === "door")
        return ["Breite", "Hoehe", "Tiefe"];
    return ["A", "B", "C"];
}

function syncAllMirrors() {
    for (const source of elements.filter(element => element.mirrorRole !== "mirror" && element.mirrorGroupId)) {
        const variants = new Set(getMirrorVariants(source.mirrorMode));
        const mirrors = elements.filter(element => element.mirrorSourceId === source.id);
        for (const mirror of mirrors) {
            if (!variants.has(mirror.mirrorVariant))
                continue;
            applyMirrorVariant(mirror, source, mirror.mirrorVariant);
        }
    }
}

function syncAllLinkedElements() {
    const byId = new Map(elements.map(element => [element.id, element]));
    for (const element of elements) {
        if (!element.linkedTo)
            continue;
        const parent = byId.get(element.linkedTo);
        if (!parent)
            continue;
        if (element.type === "chimney" && parent.type === "stove") {
            element.x = roundNumber(Number(parent.x) + (Number(element.offsetX) || 0));
            element.z = roundNumber(Number(parent.z) + (Number(element.offsetZ) || 0));
            if (!element.userAdjustedY)
                element.y = roundNumber(Number(parent.y) + Number(parent.b) / 2 + Number(element.b) / 2 + .2);
        }
    }
}

function applyAllSync() {
    syncAllMirrors();
    syncAllLinkedElements();
}

function commitScene(reason = "Aktualisiert") {
    modelLog("Commit scene", {
        reason,
        elementCount: elements.length,
        selectedId
    });
    applyAllSync();
    rebuildMeshes();
    renderElementList();
    renderInspector();
    refreshCode();
    setStatus(reason);
}

function renderInspector() {
    const selected = getSourceElement(getSelectedElement());
    if (!selected) {
        inspector.innerHTML = `<div class="empty-state">Links oder im Viewport ein Element auswaehlen.</div>`;
        return;
    }
    const [labelA,labelB,labelC] = getDimensionLabels(selected.type);
    let html = `
        ${selected.mirrorGroupId ? `<div class="info-chip">Spiegelquelle - ${escapeHtml(selected.mirrorMode || "off")}</div>` : ""}
        ${selected.linkedTo ? `<div class="info-chip">Verknuepft mit ${escapeHtml(selected.linkedTo)}</div>` : ""}
        <div class="field-wide"><label>Name</label><input data-prop="name" type="text" value="${escapeHtml(selected.name)}"></div>
        <div class="field-grid">
            <div class="field"><label>Farbe</label><input data-prop="color" type="color" value="${escapeHtml(selected.color)}"></div>
            ${fieldHtml("opacity", "Opacity", selected.opacity, "number", 'min="0.05" max="1" step="0.05"')}
            ${selectHtml("materialKind", "Material", selected.materialKind, materialKinds)}
            ${selectHtml("patternType", "Muster", selected.patternType || "none", patternOptions)}
            ${fieldHtml("patternScale", "Muster Scale", selected.patternScale || 1, "number", 'min="0.2" step="0.1"')}
            ${fieldHtml("patternDepth", "Muster Tiefe", selected.patternDepth || .03, "number", 'min="0" step="0.005"')}
            ${fieldHtml("a", labelA, selected.a, "number", 'step="0.1"')}
            ${fieldHtml("b", labelB, selected.b, "number", 'step="0.1"')}
            ${fieldHtml("c", labelC, selected.c, "number", 'step="0.1"')}
        </div>
        <div class="section field-grid">
            ${fieldHtml("x", "X", selected.x, "number", 'step="0.1"')}
            ${fieldHtml("y", "Y", selected.y, "number", 'step="0.1"')}
            ${fieldHtml("z", "Z", selected.z, "number", 'step="0.1"')}
            ${fieldHtml("rx", "Rot X", selected.rx, "number", 'step="1"')}
            ${fieldHtml("ry", "Rot Y", selected.ry, "number", 'step="1"')}
            ${fieldHtml("rz", "Rot Z", selected.rz, "number", 'step="1"')}
        </div>
    `;

    if (selected.type === "cylinderWall") {
        html += `
            <div class="section field-grid">
                ${fieldHtml("angle", "Winkel", selected.angle, "number", 'min="1" max="360" step="1"')}
                ${fieldHtml("startAngle", "Start", selected.startAngle, "number", 'step="1"')}
                ${fieldHtml("thickness", "Dicke", selected.thickness, "number", 'min="0.02" step="0.02"')}
                ${fieldHtml("segments", "Segmente", selected.segments, "number", 'min="3" max="96" step="1"')}
            </div>
        `;
    }

    if (selected.type === "fillCylinder")
        html += `
            <div class="section field-grid">
                ${fieldHtml("segments", "Segmente", selected.segments, "number", 'min="3" max="96" step="1"')}
            </div>
        `;

    if (selected.type === "triangleWall" || selected.type === "shedRoof")
        html += `
            <div class="section field-grid two">
                ${selectHtml("slopeDirection", "Steigung", selected.slopeDirection || "left", [{ value: "left", label: "Links hoch" }, { value: "right", label: "Rechts hoch" }])}
            </div>
        `;

    if (selected.type === "pyramidRoof")
        html += `
            <div class="section field-grid">
                ${fieldHtml("sides", "Seiten", selected.sides, "number", 'min="3" max="8" step="1"')}
                ${selectHtml("topMode", "Oben", selected.topMode || "point", [{ value: "point", label: "Spitze" }, { value: "ridge", label: "Kante" }, { value: "flat", label: "Flaeche" }])}
                ${selectHtml("ridgeDirection", "Kante", selected.ridgeDirection || "x", [{ value: "x", label: "X" }, { value: "z", label: "Z" }])}
                ${fieldHtml("ridgeLength", "Kantenlaenge", selected.ridgeLength, "number", 'step="0.1"')}
                ${fieldHtml("topScale", "Top Scale", selected.topScale, "number", 'step="0.05"')}
                ${fieldHtml("topWidth", "Top A", selected.topWidth, "number", 'step="0.1"')}
                ${fieldHtml("topDepth", "Top C", selected.topDepth, "number", 'step="0.1"')}
            </div>
        `;

    if (selected.type === "gableRoof")
        html += `
            <div class="section field-grid">
                ${selectHtml("ridgeDirection", "Kante", selected.ridgeDirection || "x", [{ value: "x", label: "X" }, { value: "z", label: "Z" }])}
                ${fieldHtml("ridgeLength", "Kantenlaenge", selected.ridgeLength, "number", 'step="0.1"')}
            </div>
        `;

    if (selected.type === "hipRoof" || selected.type === "mansardRoof")
        html += `
            <div class="section field-grid">
                ${fieldHtml("topScale", "Top Scale", selected.topScale, "number", 'min="0.05" max="0.9" step="0.05"')}
            </div>
        `;

    if (selected.type === "cone")
        html += `
            <div class="section field-grid">
                ${fieldHtml("segments", "Segmente", selected.segments, "number", 'min="3" max="96" step="1"')}
            </div>
        `;

    if (selected.type === "window")
        html += `
            <div class="section field-grid">
                <div class="field"><label>Rahmenfarbe</label><input data-prop="frameColor" type="color" value="${escapeHtml(selected.frameColor || selected.color)}"></div>
                <div class="field"><label>Glasfarbe</label><input data-prop="glassColor" type="color" value="${escapeHtml(selected.glassColor || "#9dd5ff")}"></div>
                ${fieldHtml("opacity", "Transparenz", selected.opacity, "number", 'min="0.05" max="1" step="0.05"')}
            </div>
        `;

    if (selected.type === "door")
        html += `
            <div class="section field-grid">
                <div class="field"><label>Rahmenfarbe</label><input data-prop="frameColor" type="color" value="${escapeHtml(selected.frameColor || "#ece0cb")}"></div>
                ${selectHtml("hingeSide", "Bandseite", selected.hingeSide || "left", [{ value: "left", label: "Links" }, { value: "right", label: "Rechts" }])}
                ${fieldHtml("openAngle", "Oeffnungswinkel", selected.openAngle, "number", 'min="0" max="180" step="1"')}
            </div>
            ${checkboxHtml("isOpen", "Tuer geoeffnet", !!selected.isOpen)}
        `;

    if (selected.type === "chimney")
        html += `<div class="settings-note warning">Der Kamin bleibt als eigenes Part im Export erhalten und kann mit Ausschneiden Daecher oeffnen.</div>`;

    inspector.innerHTML = html;
    for (const input of inspector.querySelectorAll("[data-prop]"))
        input.addEventListener("input", () => {
            const active = getSourceElement(getSelectedElement());
            if (!active)
                return;
            const key = input.dataset.prop;
            active[key] = input.type === "checkbox" ? input.checked : input.type === "number" ? roundNumber(input.value) : input.value;
            if (active.type === "chimney" && active.linkedTo) {
                const parent = getElement(active.linkedTo);
                parent && (active.offsetX = roundNumber((Number(active.x) || 0) - (Number(parent.x) || 0)), active.offsetZ = roundNumber((Number(active.z) || 0) - (Number(parent.z) || 0)));
                "y" === key && (active.userAdjustedY = true);
            }
            commitScene(`${active.name} aktualisiert`);
        });
}

function selectElement(id) {
    const resolved = getSourceElement(getElement(id));
    selectedId = resolved ? resolved.id : null;
    modelLog("Select element", {
        requested: id,
        selectedId
    });
    renderElementList();
    renderInspector();
    updateSelectionBox();
}

function setActiveTab(name) {
    for (const button of tabButtons)
        button.classList.toggle("active", button.dataset.tab === name);
    for (const panel of tabPanels)
        panel.classList.toggle("active", panel.id === `tab-${name}`);
}

function renderPalette() {
    palette.innerHTML = paletteGroups.map(group => `
        <div class="palette-group">
            <div class="palette-group-title">${escapeHtml(group.title)}</div>
            <div class="palette-group-grid">
                ${group.items.map(item => `<button type="button" draggable="true" data-type="${escapeHtml(item.type)}">${escapeHtml(item.label)}</button>`).join("")}
            </div>
        </div>
    `).join("");
}

function getMirrorVariants(mode) {
    if (mode === "quad")
        return ["x", "z", "xz"];
    if (mode === "x")
        return ["x"];
    if (mode === "z")
        return ["z"];
    if (mode === "diagA")
        return ["diagA"];
    if (mode === "diagB")
        return ["diagB"];
    return [];
}

function mirrorHingeSide(value, variant) {
    if (!value)
        return value;
    if (variant === "x" || variant === "z" || variant === "xz" || variant === "diagA" || variant === "diagB")
        return value === "left" ? "right" : "left";
    return value;
}

function mirrorSlopeDirection(value) {
    return value === "right" ? "left" : "right";
}

function applyMirrorVariant(target, source, variant) {
    const sourceData = cloneData(source);
    delete sourceData.id;
    delete sourceData.name;
    Object.assign(target, sourceData);
    target.name = source.name;
    target.mirrorRole = "mirror";
    target.mirrorSourceId = source.id;
    target.mirrorVariant = variant;
    target.mirrorGroupId = source.mirrorGroupId;
    target.mirrorMode = source.mirrorMode;
    let x = Number(source.x) || 0;
    let z = Number(source.z) || 0;
    let ry = Number(source.ry) || 0;
    if (variant === "x") {
        x = -x;
        ry = -ry;
    } else if (variant === "z") {
        z = -z;
        ry = 180 - ry;
    } else if (variant === "xz") {
        x = -x;
        z = -z;
        ry += 180;
    } else if (variant === "diagA") {
        const nextX = z;
        const nextZ = x;
        x = nextX;
        z = nextZ;
        ry = 90 - ry;
    } else if (variant === "diagB") {
        const nextX = -z;
        const nextZ = -x;
        x = nextX;
        z = nextZ;
        ry = -90 - ry;
    }
    target.x = roundNumber(x);
    target.z = roundNumber(z);
    target.ry = normalizeDegrees(ry);
    if (target.hingeSide)
        target.hingeSide = mirrorHingeSide(source.hingeSide, variant);
    if (target.slopeDirection)
        target.slopeDirection = mirrorSlopeDirection(source.slopeDirection);
}

function createBundle(type, position) {
    if (type !== "stove")
        return [createDefaultElement(type, position)];
    const stove = createDefaultElement("stove", position);
    const chimney = createDefaultElement("chimney", position);
    chimney.linkedTo = stove.id;
    chimney.offsetX = 0;
    chimney.offsetZ = 0;
    chimney.userAdjustedY = false;
    chimney.y = roundNumber(stove.y + stove.b / 2 + chimney.b / 2 + .2);
    return [stove, chimney];
}

function addBundleWithMirrors(type, position) {
    modelLog("Add bundle", {
        type,
        position,
        mirrorMode: mirrorModeSelect.value || "off"
    });
    const sources = createBundle(type, position);
    const mode = mirrorModeSelect.value || "off";
    const created = [...sources];
    if (mode !== "off") {
        for (const source of sources) {
            source.mirrorMode = mode;
            source.mirrorGroupId = createMirrorGroupId();
        }
        for (const variant of getMirrorVariants(mode)) {
            const mapping = new Map();
            const clones = sources.map(source => {
                const clone = cloneData(source);
                clone.id = createId();
                applyMirrorVariant(clone, source, variant);
                mapping.set(source.id, clone.id);
                return clone;
            });
            for (let index = 0; index < clones.length; index++) {
                const original = sources[index];
                if (original.linkedTo)
                    clones[index].linkedTo = mapping.get(original.linkedTo) || original.linkedTo;
            }
            created.push(...clones);
        }
    }
    elements.push(...created);
    selectedId = sources[0].id;
    commitScene(`${typeLabels[type] || type} erstellt`);
}

function duplicateSelected() {
    const selected = getSourceElement(getSelectedElement());
    if (!selected)
        return;
    modelLog("Duplicate selected", selected.id);
    const related = [selected];
    if (selected.type === "stove")
        for (const element of elements)
            element.linkedTo === selected.id && related.push(element);
    const clones = related.map(element => {
        const copy = cloneData(element);
        copy.id = createId();
        copy.name = `${element.name} Copy`;
        copy.x = roundNumber((Number(copy.x) || 0) + .75);
        copy.z = roundNumber((Number(copy.z) || 0) + .75);
        copy.mirrorGroupId = "";
        copy.mirrorSourceId = "";
        copy.mirrorVariant = "";
        copy.mirrorMode = "off";
        copy.mirrorRole = "source";
        return copy;
    });
    const mapping = new Map();
    for (let index = 0; index < related.length; index++)
        mapping.set(related[index].id, clones[index].id);
    for (const clone of clones)
        if (clone.linkedTo)
            clone.linkedTo = mapping.get(clone.linkedTo) || clone.linkedTo;
    elements.push(...clones);
    selectedId = clones[0].id;
    commitScene("Duplikat erstellt");
}

function deleteSelected() {
    const selected = getSourceElement(getSelectedElement());
    if (!selected)
        return;
    modelLog("Delete selected", selected.id);
    const removeIds = new Set([selected.id]);
    if (selected.mirrorGroupId)
        for (const element of elements)
            if (element.mirrorSourceId === selected.id)
                removeIds.add(element.id);
    if (selected.type === "stove")
        for (const element of elements)
            element.linkedTo === selected.id && removeIds.add(element.id);
    elements = elements.filter(element => !removeIds.has(element.id));
    selectedId = getListableElements()[0] ? getListableElements()[0].id : null;
    commitScene("Element entfernt");
}

function getElementExtent(element) {
    const width = Math.max(.05, Number(element.a) || 1);
    const height = Math.max(.05, Number(element.b) || 1);
    const depth = Math.max(.05, Number(element.c) || .1);
    if (element.type === "cylinderWall" || element.type === "fillCylinder" || element.type === "cone" || element.type === "domeRoof")
        return {
            width: width * 2,
            height,
            depth: depth * 2
        };
    return {
        width,
        height,
        depth
    };
}

function getFootprint(element, proposed = null) {
    const x = proposed ? proposed.x : Number(element.x) || 0;
    const z = proposed ? proposed.z : Number(element.z) || 0;
    const extent = getElementExtent(element);
    const angle = degToRad(element.ry);
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const rotatedWidth = extent.width * cos + extent.depth * sin;
    const rotatedDepth = extent.width * sin + extent.depth * cos;
    return {
        minX: x - rotatedWidth / 2,
        maxX: x + rotatedWidth / 2,
        minZ: z - rotatedDepth / 2,
        maxZ: z + rotatedDepth / 2,
        width: rotatedWidth,
        depth: rotatedDepth
    };
}

function rangesOverlap(aMin, aMax, bMin, bMax) {
    return aMin <= bMax && aMax >= bMin;
}

function snapPosition(element, proposed) {
    const threshold = .35;
    const result = {
        x: Math.round(proposed.x * 4) / 4,
        z: Math.round(proposed.z * 4) / 4
    };
    const current = getFootprint(element, result);
    let best = {
        distance: threshold
    };
    for (const other of elements) {
        if (other.id === element.id)
            continue;
        const target = getFootprint(other);
        if (rangesOverlap(current.minZ, current.maxZ, target.minZ, target.maxZ)) {
            const leftToRight = Math.abs(current.minX - target.maxX);
            const rightToLeft = Math.abs(current.maxX - target.minX);
            if (leftToRight < best.distance)
                best = {
                    axis: "x",
                    value: target.maxX + current.width / 2,
                    distance: leftToRight
                };
            if (rightToLeft < best.distance)
                best = {
                    axis: "x",
                    value: target.minX - current.width / 2,
                    distance: rightToLeft
                };
        }
        if (rangesOverlap(current.minX, current.maxX, target.minX, target.maxX)) {
            const backToFront = Math.abs(current.minZ - target.maxZ);
            const frontToBack = Math.abs(current.maxZ - target.minZ);
            if (backToFront < best.distance)
                best = {
                    axis: "z",
                    value: target.maxZ + current.depth / 2,
                    distance: backToFront
                };
            if (frontToBack < best.distance)
                best = {
                    axis: "z",
                    value: target.minZ - current.depth / 2,
                    distance: frontToBack
                };
        }
    }
    best.axis && (result[best.axis] = roundNumber(best.value));
    return result;
}

function pointerToGround(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(dragPlane, dragPoint) ? dragPoint.clone() : null;
}

function getElementIdFromObject(object) {
    let current = object;
    while (current) {
        if (current.userData && current.userData.elementId)
            return current.userData.elementId;
        current = current.parent;
    }
    return null;
}

function getRaycastHit(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...elementGroup.children], true);
    for (const hit of hits) {
        const id = getElementIdFromObject(hit.object);
        if (id)
            return {
                hit,
                id
            };
    }
    return null;
}

function syncInspectorInputs() {
    const element = getSourceElement(getSelectedElement());
    if (!element)
        return;
    for (const input of inspector.querySelectorAll("[data-prop]")) {
        const key = input.dataset.prop;
        if (!(key in element))
            continue;
        if (input.type === "checkbox")
            input.checked = !!element[key];
        else
            input.value = element[key];
    }
}

function beginDrag(event, elementId) {
    if (!moveToolActive)
        return;
    const element = getSourceElement(getElement(elementId));
    const hit = pointerToGround(event);
    if (!element || !hit)
        return;
    dragging = {
        id: element.id,
        offsetX: (Number(element.x) || 0) - hit.x,
        offsetZ: (Number(element.z) || 0) - hit.z
    };
    controls.enabled = false;
    renderer.domElement.setPointerCapture(event.pointerId);
}

function updateDrag(event) {
    if (!dragging)
        return;
    const element = getElement(dragging.id);
    const hit = pointerToGround(event);
    if (!element || !hit)
        return;
    let next = {
        x: hit.x + dragging.offsetX,
        z: hit.z + dragging.offsetZ
    };
    if (snapKeyDown)
        next = snapPosition(element, next);
    element.x = roundNumber(next.x);
    element.z = roundNumber(next.z);
    if (element.type === "chimney" && element.linkedTo) {
        const parent = getElement(element.linkedTo);
        parent && (element.offsetX = roundNumber((Number(element.x) || 0) - (Number(parent.x) || 0)), element.offsetZ = roundNumber((Number(element.z) || 0) - (Number(parent.z) || 0)));
    }
    applyAllSync();
    rebuildMeshes();
    syncInspectorInputs();
    refreshCode();
    updateSelectionBox();
    setStatus(snapKeyDown ? "Snap aktiv" : "Move");
}

function endDrag(event) {
    if (!dragging)
        return;
    dragging = null;
    controls.enabled = true;
    try {
        renderer.domElement.releasePointerCapture(event.pointerId);
    } catch (error) {}
    renderElementList();
    renderInspector();
}

function composeMatrixForElement(element) {
    const position = new THREE.Vector3(Number(element.x) || 0, Number(element.y) || 0, Number(element.z) || 0);
    const rotation = new THREE.Euler(degToRad(element.rx), degToRad(element.ry), degToRad(element.rz));
    const quaternion = new THREE.Quaternion().setFromEuler(rotation);
    return new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
}

function getLocalBoxCorners(element) {
    const extent = getElementExtent(element);
    const half = {
        x: extent.width / 2,
        y: extent.height / 2,
        z: extent.depth / 2
    };
    const corners = [];
    for (const x of [-half.x, half.x])
        for (const y of [-half.y, half.y])
            for (const z of [-half.z, half.z])
                corners.push(new THREE.Vector3(x, y, z));
    return corners;
}

function getCutterBoundsInHostLocal(host, cutter) {
    const hostInverse = composeMatrixForElement(host).clone().invert();
    const cutterMatrix = composeMatrixForElement(cutter);
    const bounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity
    };
    for (const corner of getLocalBoxCorners(cutter)) {
        const world = corner.clone().applyMatrix4(cutterMatrix);
        const local = world.applyMatrix4(hostInverse);
        bounds.minX = Math.min(bounds.minX, local.x);
        bounds.maxX = Math.max(bounds.maxX, local.x);
        bounds.minY = Math.min(bounds.minY, local.y);
        bounds.maxY = Math.max(bounds.maxY, local.y);
        bounds.minZ = Math.min(bounds.minZ, local.z);
        bounds.maxZ = Math.max(bounds.maxZ, local.z);
    }
    return bounds;
}

function cloneExportStyle(source, targetType) {
    const base = createDefaultElement(targetType, {
        x: 0,
        z: 0
    });
    return Object.assign(base, {
        name: typeLabels[targetType] || source.name,
        rx: source.rx,
        ry: source.ry,
        rz: source.rz,
        color: source.color,
        opacity: source.opacity,
        materialKind: source.materialKind,
        patternType: source.patternType,
        patternScale: source.patternScale,
        patternDepth: source.patternDepth
    });
}

function createPieceFromLocal(host, centerLocal, sizeLocal, targetType) {
    const world = centerLocal.clone().applyMatrix4(composeMatrixForElement(host));
    const piece = cloneExportStyle(host, targetType);
    piece.x = roundNumber(world.x);
    piece.y = roundNumber(world.y);
    piece.z = roundNumber(world.z);
    piece.a = roundNumber(sizeLocal.x);
    piece.b = roundNumber(sizeLocal.y);
    piece.c = roundNumber(sizeLocal.z);
    piece.mirrorGroupId = "";
    piece.mirrorSourceId = "";
    piece.mirrorVariant = "";
    piece.mirrorMode = "off";
    piece.mirrorRole = "source";
    return piece;
}

function createBakedMirrors(elementsToBake, mode) {
    const baked = [];
    for (const source of elementsToBake)
        for (const variant of getMirrorVariants(mode)) {
            const copy = cloneData(source);
            copy.id = createId();
            applyMirrorVariant(copy, source, variant);
            copy.mirrorGroupId = "";
            copy.mirrorSourceId = "";
            copy.mirrorVariant = "";
            copy.mirrorMode = "off";
            copy.mirrorRole = "source";
            baked.push(copy);
        }
    return baked;
}

function cutOpening(host, cutter) {
    const horizontal = planarRoofTypes.has(host.type) || roofTypes.has(host.type);
    const bounds = getCutterBoundsInHostLocal(host, cutter);
    const width = Math.max(.05, Number(host.a) || 1);
    const height = Math.max(.05, Number(host.b) || 1);
    const depth = Math.max(.05, Number(host.c) || .1);
    const minX = -width / 2;
    const maxX = width / 2;
    const parts = [];

    if (!horizontal) {
        const minY = -height / 2;
        const maxY = height / 2;
        const openMinX = clamp(bounds.minX, minX, maxX);
        const openMaxX = clamp(bounds.maxX, minX, maxX);
        const openMinY = clamp(bounds.minY, minY, maxY);
        const openMaxY = clamp(bounds.maxY, minY, maxY);
        if (openMaxX - openMinX <= .03 || openMaxY - openMinY <= .03)
            return [];
        const leftWidth = openMinX - minX;
        const rightWidth = maxX - openMaxX;
        const bottomHeight = openMinY - minY;
        const topHeight = maxY - openMaxY;
        if (leftWidth > .03)
            parts.push(createPieceFromLocal(host, new THREE.Vector3((minX + openMinX) / 2, 0, 0), new THREE.Vector3(leftWidth, height, depth), "wall"));
        if (rightWidth > .03)
            parts.push(createPieceFromLocal(host, new THREE.Vector3((openMaxX + maxX) / 2, 0, 0), new THREE.Vector3(rightWidth, height, depth), "wall"));
        if (bottomHeight > .03)
            parts.push(createPieceFromLocal(host, new THREE.Vector3((openMinX + openMaxX) / 2, (minY + openMinY) / 2, 0), new THREE.Vector3(openMaxX - openMinX, bottomHeight, depth), "wall"));
        if (topHeight > .03)
            parts.push(createPieceFromLocal(host, new THREE.Vector3((openMinX + openMaxX) / 2, (openMaxY + maxY) / 2, 0), new THREE.Vector3(openMaxX - openMinX, topHeight, depth), "wall"));
    } else {
        const minZ = -depth / 2;
        const maxZ = depth / 2;
        const openMinX = clamp(bounds.minX, minX, maxX);
        const openMaxX = clamp(bounds.maxX, minX, maxX);
        const openMinZ = clamp(bounds.minZ, minZ, maxZ);
        const openMaxZ = clamp(bounds.maxZ, minZ, maxZ);
        const thickness = Math.max(.05, planarRoofTypes.has(host.type) ? height : Math.min(height, .22));
        if (openMaxX - openMinX <= .03 || openMaxZ - openMinZ <= .03)
            return [];
        const leftWidth = openMinX - minX;
        const rightWidth = maxX - openMaxX;
        const backDepth = openMinZ - minZ;
        const frontDepth = maxZ - openMaxZ;
        if (leftWidth > .03)
            parts.push(createPieceFromLocal(host, new THREE.Vector3((minX + openMinX) / 2, 0, 0), new THREE.Vector3(leftWidth, thickness, depth), "panel"));
        if (rightWidth > .03)
            parts.push(createPieceFromLocal(host, new THREE.Vector3((openMaxX + maxX) / 2, 0, 0), new THREE.Vector3(rightWidth, thickness, depth), "panel"));
        if (backDepth > .03)
            parts.push(createPieceFromLocal(host, new THREE.Vector3((openMinX + openMaxX) / 2, 0, (minZ + openMinZ) / 2), new THREE.Vector3(openMaxX - openMinX, thickness, backDepth), "panel"));
        if (frontDepth > .03)
            parts.push(createPieceFromLocal(host, new THREE.Vector3((openMinX + openMaxX) / 2, 0, (openMaxZ + maxZ) / 2), new THREE.Vector3(openMaxX - openMinX, thickness, frontDepth), "panel"));
    }
    return parts;
}

function runCutTool(host, cutter) {
    const sourceHost = getSourceElement(host);
    if (!sourceHost || !cutter)
        return;
    modelLog("Cut tool start", {
        host: sourceHost.id,
        cutter: cutter.id
    });
    const pieces = cutOpening(sourceHost, cutter);
    if (!pieces.length) {
        setStatus("Kein gueltiger Ausschnitt moeglich");
        return;
    }
    const bakedMirrors = sourceHost.mirrorMode && sourceHost.mirrorMode !== "off" ? createBakedMirrors(pieces, sourceHost.mirrorMode) : [];
    const removeIds = new Set([sourceHost.id]);
    for (const element of elements)
        if (element.mirrorSourceId === sourceHost.id)
            removeIds.add(element.id);
    elements = elements.filter(element => !removeIds.has(element.id));
    elements.push(...pieces, ...bakedMirrors);
    selectedId = pieces[0] ? pieces[0].id : null;
    toolSelection = [];
    modelLog("Cut tool done", {
        createdPieces: pieces.length,
        bakedMirrors: bakedMirrors.length
    });
    commitScene("Ausschnitt erstellt");
}

function edgeLength(edge) {
    return Math.hypot(edge.end.x - edge.start.x, edge.end.z - edge.start.z);
}

function midpointDistance2D(a, b) {
    return Math.hypot(a.midpoint.x - b.midpoint.x, a.midpoint.z - b.midpoint.z);
}

function getElementWorldBounds(element) {
    const mesh = element && meshById.get(element.id);
    if (mesh) {
        mesh.updateWorldMatrix(true, true);
        return new THREE.Box3().setFromObject(mesh);
    }
    const extent = getElementExtent(element);
    return new THREE.Box3(
        new THREE.Vector3((Number(element.x) || 0) - extent.width / 2, (Number(element.y) || 0) - extent.height / 2, (Number(element.z) || 0) - extent.depth / 2),
        new THREE.Vector3((Number(element.x) || 0) + extent.width / 2, (Number(element.y) || 0) + extent.height / 2, (Number(element.z) || 0) + extent.depth / 2)
    );
}

function findClosestEdgePair(first, second) {
    let best = null;
    for (const edgeA of getEdgesForElement(first))
        for (const edgeB of getEdgesForElement(second)) {
            const lengthA = edgeLength(edgeA);
            const lengthB = edgeLength(edgeB);
            if (lengthA < .05 || lengthB < .05)
                continue;
            const ax = (edgeA.end.x - edgeA.start.x) / lengthA;
            const az = (edgeA.end.z - edgeA.start.z) / lengthA;
            const bx = (edgeB.end.x - edgeB.start.x) / lengthB;
            const bz = (edgeB.end.z - edgeB.start.z) / lengthB;
            const parallelPenalty = (1 - Math.abs(ax * bx + az * bz)) * .8;
            const score = midpointDistance2D(edgeA, edgeB) + parallelPenalty;
            if (!best || score < best.score)
                best = {
                    edgeA,
                    edgeB,
                    length: Math.max(lengthA, lengthB),
                    score
                };
        }
    return best;
}

function copyVisualSettings(target, source) {
    if (!target || !source)
        return;
    target.color = source.color;
    target.materialKind = source.materialKind;
    target.patternType = source.patternType;
    target.patternScale = source.patternScale;
    target.patternDepth = source.patternDepth;
}

function runFillTool(first, second) {
    const a = getSourceElement(first);
    const b = getSourceElement(second);
    if (!a || !b || a.id === b.id) {
        setStatus("Fuellen braucht zwei verschiedene Objekte");
        return;
    }
    modelLog("Fill tool start", {
        first: a.id,
        second: b.id
    });
    const pair = findClosestEdgePair(a, b);
    if (!pair) {
        setStatus("Keine passenden Kanten zum Fuellen gefunden");
        return;
    }
    const boxA = getElementWorldBounds(a);
    const boxB = getElementWorldBounds(b);
    const low = Math.min(boxA.max.y, boxB.max.y);
    const high = Math.max(boxA.max.y, boxB.max.y);
    const height = Math.max(.12, high - low);
    const edge = pair.edgeA;
    const edgeAngle = Math.atan2(edge.end.z - edge.start.z, edge.end.x - edge.start.x) * 180 / Math.PI;
    const extentA = getElementExtent(a);
    const extentB = getElementExtent(b);
    const thinCandidates = [extentA.width, extentA.depth, extentB.width, extentB.depth].filter(value => value > .02 && value <= 1.2);
    const thickness = clamp(thinCandidates.length ? Math.min(...thinCandidates) : Math.min(extentA.depth, extentB.depth, .28), .08, .75);
    const fill = createDefaultElement("triangleFill", {
        x: (pair.edgeA.midpoint.x + pair.edgeB.midpoint.x) / 2,
        z: (pair.edgeA.midpoint.z + pair.edgeB.midpoint.z) / 2
    });
    fill.y = roundNumber(low + height / 2);
    fill.rx = 0;
    fill.ry = roundNumber(edgeAngle);
    fill.rz = 0;
    fill.a = roundNumber(Math.max(.2, pair.length));
    fill.b = roundNumber(height);
    fill.c = roundNumber(thickness);
    fill.slopeDirection = boxA.max.y >= boxB.max.y ? "left" : "right";
    copyVisualSettings(fill, a.materialKind === "glass" ? b : a);
    elements.push(fill);
    selectedId = fill.id;
    toolSelection = [];
    modelLog("Fill tool done", {
        fillId: fill.id,
        height,
        thickness
    });
    commitScene("Dreiecksluecke gefuellt");
}

function getFootprintPoints(element) {
    const extent = getElementExtent(element);
    const angle = degToRad(element.ry);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const points = [];
    if (element.type === "cylinderWall" || element.type === "fillCylinder" || element.type === "cone" || element.type === "domeRoof") {
        const count = 16;
        for (let index = 0; index < count; index++) {
            const t = index / count * Math.PI * 2;
            const px = Math.cos(t) * extent.width / 2;
            const pz = Math.sin(t) * extent.depth / 2;
            points.push({
                x: (Number(element.x) || 0) + px * cos - pz * sin,
                z: (Number(element.z) || 0) + px * sin + pz * cos
            });
        }
        return points;
    }
    const corners = [{
        x: -extent.width / 2,
        z: -extent.depth / 2
    }, {
        x: extent.width / 2,
        z: -extent.depth / 2
    }, {
        x: extent.width / 2,
        z: extent.depth / 2
    }, {
        x: -extent.width / 2,
        z: extent.depth / 2
    }];
    for (const point of corners)
        points.push({
            x: (Number(element.x) || 0) + point.x * cos - point.z * sin,
            z: (Number(element.z) || 0) + point.x * sin + point.z * cos
        });
    return points;
}

function distancePointToSegment2D(point, start, end) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSq = dx * dx + dz * dz || 1;
    const t = clamp(((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSq, 0, 1);
    const px = start.x + dx * t;
    const pz = start.z + dz * t;
    return Math.hypot(point.x - px, point.z - pz);
}

function getEdgesForElement(element) {
    const points = getFootprintPoints(element);
    const edges = [];
    for (let index = 0; index < points.length; index++) {
        const start = points[index];
        const end = points[(index + 1) % points.length];
        edges.push({
            start,
            end,
            midpoint: {
                x: (start.x + end.x) / 2,
                z: (start.z + end.z) / 2
            }
        });
    }
    return edges;
}

function pickNearestEdge(element, hitPoint) {
    const point = {
        x: hitPoint.x,
        z: hitPoint.z
    };
    const edges = getEdgesForElement(element);
    let best = null;
    let bestDistance = Infinity;
    for (const edge of edges) {
        const distance = distancePointToSegment2D(point, edge.start, edge.end);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = edge;
        }
    }
    return best;
}

function toggleEdgeSnapMode() {
    edgeSnapMode = !edgeSnapMode;
    edgeSnapSelection = null;
    activeTool = "";
    fillToolButton.classList.remove("active");
    cutToolButton.classList.remove("active");
    toolSelection = [];
    setStatus(edgeSnapMode ? "Kante 1 auswaehlen" : "Kanten-Modus aus");
}

function handleEdgeSnapHit(hit) {
    const element = getSourceElement(getElement(hit.id));
    if (!element)
        return;
    selectElement(element.id);
    const edge = pickNearestEdge(element, hit.hit.point);
    if (!edge) {
        setStatus("Keine Kante gefunden");
        return;
    }
    if (!edgeSnapSelection) {
        edgeSnapSelection = {
            element,
            edge
        };
        setStatus("Kante 2 auswaehlen");
        return;
    }
    if (edgeSnapSelection.element.id === element.id) {
        edgeSnapSelection = {
            element,
            edge
        };
        setStatus("Kante 2 auswaehlen");
        return;
    }
    element.x = roundNumber((Number(element.x) || 0) + (edgeSnapSelection.edge.midpoint.x - edge.midpoint.x));
    element.z = roundNumber((Number(element.z) || 0) + (edgeSnapSelection.edge.midpoint.z - edge.midpoint.z));
    edgeSnapSelection = null;
    commitScene("Kanten zusammengefuehrt");
    if (edgeSnapMode)
        setStatus("Kante 1 auswaehlen");
}

function handleToolHit(hit) {
    const element = getSourceElement(getElement(hit.id));
    if (!element)
        return;
    selectElement(element.id);
    toolSelection.push(element.id);
    if (toolSelection.length < 2) {
        setStatus(activeTool === "fill" ? "Zweites Objekt fuer Fuellen auswaehlen" : "Cutter fuer Ausschnitt auswaehlen");
        return;
    }
    const first = getElement(toolSelection[0]);
    const second = getElement(toolSelection[1]);
    if (activeTool === "fill")
        runFillTool(first, second);
    else if (activeTool === "cut")
        runCutTool(first, second);
}

function onViewportPointerDown(event) {
    const hit = getRaycastHit(event);
    if (edgeSnapMode) {
        hit && handleEdgeSnapHit(hit);
        return;
    }
    if (activeTool) {
        hit && handleToolHit(hit);
        return;
    }
    if (hit)
        selectElement(hit.id);
    if (moveToolActive && hit)
        beginDrag(event, hit.id);
}

function exportCommonPart(element) {
    const data = {
        type: element.type,
        position: [roundNumber(element.x), roundNumber(element.y), roundNumber(element.z)],
        rotation: [roundNumber(element.rx), roundNumber(element.ry), roundNumber(element.rz)],
        color: hexLiteral(element.color)
    };
    if (element.materialKind)
        data.materialKind = element.materialKind;
    if (element.patternType && element.patternType !== "none")
        data.pattern = {
            type: element.patternType,
            scale: roundNumber(element.patternScale || 1),
            depth: roundNumber(element.patternDepth || .03)
        };
    if (Number(element.opacity) < 1) {
        data.transparent = true;
        data.opacity = roundNumber(element.opacity);
    }
    return data;
}

function partForExport(element) {
    const common = exportCommonPart(element);
    if (element.type === "wall" || element.type === "panel" || element.type === "roofPanel" || element.type === "floor")
        return Object.assign(common, {
            size: [roundNumber(element.a), roundNumber(element.b), roundNumber(element.c)]
        });
    if (element.type === "triangleWall" || element.type === "triangleFill" || element.type === "wedgeFill")
        return Object.assign(common, {
            size: [roundNumber(element.a), roundNumber(element.b), roundNumber(element.c)],
            slopeDirection: element.slopeDirection || "left"
        });
    if (element.type === "cylinderWall")
        return Object.assign(common, {
            radiusX: roundNumber(element.a),
            radiusZ: roundNumber(element.c),
            height: roundNumber(element.b),
            thickness: roundNumber(element.thickness || .2),
            angle: roundNumber(element.angle || 360),
            thetaStart: roundNumber(element.startAngle || 0),
            segments: Math.max(3, Math.round(Number(element.segments) || 24))
        });
    if (element.type === "fillCylinder")
        return Object.assign(common, {
            radiusX: roundNumber(element.a),
            radiusZ: roundNumber(element.c),
            height: roundNumber(element.b),
            segments: Math.max(3, Math.round(Number(element.segments) || 24))
        });
    if (element.type === "pyramidRoof")
        return Object.assign(common, {
            size: [roundNumber(element.a), roundNumber(element.b), roundNumber(element.c)],
            sides: Math.max(3, Math.round(Number(element.sides) || 4)),
            topMode: element.topMode || "point",
            ridgeLength: roundNumber(element.ridgeLength || 0),
            ridgeDirection: element.ridgeDirection || "x",
            topScale: roundNumber(element.topScale || .35),
            topSize: [roundNumber(element.topWidth || element.a * (element.topScale || .35)), roundNumber(element.topDepth || element.c * (element.topScale || .35))]
        });
    if (["gableRoof", "hipRoof", "flatRoof", "shedRoof", "mansardRoof", "domeRoof", "roundRoof", "cone", "chair", "table", "sofa", "bed", "cabinet", "counter", "shelf", "stove", "chimney"].includes(element.type)) {
        const exported = Object.assign(common, {
            size: [roundNumber(element.a), roundNumber(element.b), roundNumber(element.c)]
        });
        if (element.type === "gableRoof") {
            exported.ridgeDirection = element.ridgeDirection || "x";
            exported.ridgeLength = roundNumber(element.ridgeLength || element.a);
        }
        if (element.type === "hipRoof" || element.type === "mansardRoof")
            exported.topScale = roundNumber(element.topScale || .3);
        if (element.type === "shedRoof")
            exported.slopeDirection = element.slopeDirection || "left";
        if (element.type === "cone")
            exported.segments = Math.max(3, Math.round(Number(element.segments) || 24));
        if (element.type === "chimney" && element.linkedTo)
            exported.linkedTo = element.linkedTo;
        return exported;
    }
    if (element.type === "window")
        return Object.assign(common, {
            size: [roundNumber(element.a), roundNumber(element.b), roundNumber(element.c)],
            frameColor: hexLiteral(element.frameColor || element.color),
            glassColor: hexLiteral(element.glassColor || "#9dd5ff"),
            opacity: roundNumber(element.opacity || .55)
        });
    if (element.type === "door")
        return Object.assign(common, {
            size: [roundNumber(element.a), roundNumber(element.b), roundNumber(element.c)],
            frameColor: hexLiteral(element.frameColor || "#ece0cb"),
            hingeSide: element.hingeSide || "left",
            openAngle: roundNumber(element.openAngle || 90),
            isOpen: !!element.isOpen
        });
    return common;
}

function buildMatchConfig() {
    const mode = modelSettings.targetMode;
    const text = String(modelSettings.targetText || "").trim();
    if (mode === "all" || text.toLowerCase() === "all")
        return {
            all: true
        };
    if (mode === "address")
        return {
            address: text || "3970 Lauterbach 20"
        };
    if (mode === "chunkIndex")
        return {
            chunk: [roundNumber(modelSettings.matchChunkX || 0), roundNumber(modelSettings.matchChunkZ || 0)],
            index: roundNumber(modelSettings.matchIndex || 0)
        };
    if (mode === "near")
        return {
            near: [roundNumber(modelSettings.matchNearX || 0), roundNumber(modelSettings.matchNearZ || 0)],
            radius: roundNumber(modelSettings.matchRadius || 25)
        };
    return {
        id: text || "REPLACE_WITH_DEBUG_ID"
    };
}

function slugifyExportId(value) {
    const slug = String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return slug || "custom_house";
}

function getExportEntryId() {
    const configured = String(modelSettings.exportId || "").trim();
    if (configured && configured !== "modeler_house_replace_me")
        return configured;
    if (modelSettings.targetMode === "address")
        return `modeler_house_${slugifyExportId(modelSettings.targetText || "address")}`;
    if (modelSettings.targetMode === "debugId" && modelSettings.targetText && modelSettings.targetText !== "REPLACE_WITH_DEBUG_ID")
        return `modeler_house_${slugifyExportId(modelSettings.targetText)}`;
    return configured || "modeler_house_replace_me";
}

function exportEntry() {
    const entry = {
        id: getExportEntryId(),
        match: buildMatchConfig(),
        base: {
            enabled: !!modelSettings.baseEnabled
        },
        roof: {
            enabled: !!modelSettings.roofEnabled
        },
        windows: {
            enabled: !!modelSettings.windowsEnabled
        },
        parts: elements.map(partForExport)
    };
    const chance = clamp(Number(modelSettings.applyChance) || 1, 0.01, 1);
    if (chance < 1)
        entry.chance = roundNumber(chance);
    return entry;
}

function formatCode() {
    if (modelSettings.exportMode === "entry")
        return serializeJs(exportEntry());
    return `const tmBuildingsConfig=${serializeJs({buildings:[exportEntry()]})};`;
}

function refreshCode() {
    codeOutput.value = formatCode();
}

async function copyCode() {
    modelLog("Copy/export code start", {
        exportMode: modelSettings.exportMode,
        elementCount: elements.length
    });
    refreshCode();
    codeOutput.select();
    try {
        await navigator.clipboard.writeText(codeOutput.value);
        setStatus("Code konvertiert und kopiert");
        modelLog("Copy/export code copied via Clipboard API");
    } catch (error) {
        modelWarn("Clipboard API failed, fallback to execCommand", error);
        try {
            const copied = document.execCommand("copy");
            setStatus(copied ? "Code konvertiert und kopiert" : "Code konvertiert und markiert");
        } catch (fallbackError) {
            modelWarn("Clipboard fallback failed", fallbackError);
            setStatus("Code konvertiert und markiert");
        }
    }
}

function getSettingInputValue(input) {
    if (!input)
        return "";
    if (input.type === "checkbox")
        return input.checked;
    if (numericSettingFields.has(input.dataset.setting))
        return input.value === "" ? "" : roundNumber(input.value);
    return input.value;
}

function syncSettingInputs(sourceInput) {
    const key = sourceInput && sourceInput.dataset && sourceInput.dataset.setting;
    if (!key)
        return;
    for (const input of settingsPanel.querySelectorAll("[data-setting]")) {
        if (input === sourceInput || input.dataset.setting !== key)
            continue;
        if (input.type === "checkbox")
            input.checked = !!modelSettings[key];
        else
            input.value = modelSettings[key] ?? "";
    }
}

function handleSettingInput(input) {
    const key = input && input.dataset && input.dataset.setting;
    if (!key)
        return;
    const nextValue = getSettingInputValue(input);
    if (Object.is(modelSettings[key], nextValue))
        return;
    modelSettings[key] = nextValue;
    if (key === "targetMode")
        renderSettings();
    else
        syncSettingInputs(input);
    refreshCode();
}

function renderSettings() {
    const mode = modelSettings.targetMode;
    const exportIdValue = escapeHtml(modelSettings.exportId);
    const targetTextValue = escapeHtml(modelSettings.targetText);
    const matchChunkXValue = escapeHtml(modelSettings.matchChunkX);
    const matchChunkZValue = escapeHtml(modelSettings.matchChunkZ);
    const matchIndexValue = escapeHtml(modelSettings.matchIndex);
    const matchNearXValue = escapeHtml(modelSettings.matchNearX);
    const matchNearZValue = escapeHtml(modelSettings.matchNearZ);
    const matchRadiusValue = escapeHtml(modelSettings.matchRadius);
    const applyChanceValue = escapeHtml(modelSettings.applyChance);
    let targetFields = "";
    if (mode === "debugId")
        targetFields = `<div class="field-wide"><label>Debug-ID</label><input data-setting="targetText" type="text" value="${targetTextValue}" placeholder="REPLACE_WITH_DEBUG_ID"></div>`;
    else if (mode === "address")
        targetFields = `<div class="field-wide"><label>Adresse</label><input data-setting="targetText" type="text" value="${targetTextValue}" placeholder="3970 Lauterbach 20"></div>`;
    else if (mode === "chunkIndex")
        targetFields = `
            <div class="field-grid">
                <div class="field"><label>Chunk X</label><input data-setting="matchChunkX" type="number" value="${matchChunkXValue}" step="1"></div>
                <div class="field"><label>Chunk Z</label><input data-setting="matchChunkZ" type="number" value="${matchChunkZValue}" step="1"></div>
                <div class="field"><label>Index</label><input data-setting="matchIndex" type="number" value="${matchIndexValue}" step="1"></div>
            </div>
        `;
    else if (mode === "near")
        targetFields = `
            <div class="field-grid">
                <div class="field"><label>Near X</label><input data-setting="matchNearX" type="number" value="${matchNearXValue}" step="0.1"></div>
                <div class="field"><label>Near Z</label><input data-setting="matchNearZ" type="number" value="${matchNearZValue}" step="0.1"></div>
                <div class="field"><label>Radius</label><input data-setting="matchRadius" type="number" value="${matchRadiusValue}" min="1" step="1"></div>
            </div>
        `;
    else
        targetFields = `<div class="settings-note">Wenn du hier oder im Zieltext <strong>all</strong> verwendest, wird <code>match:{all:true}</code> exportiert.</div>`;

    settingsPanel.innerHTML = `
        <div class="field-wide"><label>Exportmodus</label><select data-setting="exportMode">
            <option value="complete"${modelSettings.exportMode === "complete" ? " selected" : ""}>Komplette buildings.js</option>
            <option value="entry"${modelSettings.exportMode === "entry" ? " selected" : ""}>Nur Eintrag</option>
        </select></div>
        <div class="field-wide"><label>Export-ID</label><input data-setting="exportId" type="text" value="${exportIdValue}"></div>
        <div class="field-wide"><label>Zielmodus</label><select data-setting="targetMode">
            <option value="debugId"${mode === "debugId" ? " selected" : ""}>Debug-ID</option>
            <option value="address"${mode === "address" ? " selected" : ""}>Adresse</option>
            <option value="chunkIndex"${mode === "chunkIndex" ? " selected" : ""}>Chunk + Index</option>
            <option value="near"${mode === "near" ? " selected" : ""}>Near</option>
            <option value="all"${mode === "all" ? " selected" : ""}>All</option>
        </select></div>
        ${targetFields}
        <div class="section field-grid">
            <div class="field"><label>Apply Chance</label><input data-setting="applyChance" type="number" value="${applyChanceValue}" min="0.01" max="1" step="0.05"></div>
            <div class="field"><label>Fallback Radius</label><input data-setting="matchRadius" type="number" value="${matchRadiusValue}" min="1" step="1"></div>
        </div>
        <div class="checkbox-row"><input data-setting="baseEnabled" type="checkbox"${modelSettings.baseEnabled ? " checked" : ""}><label>Original-Basis aktiv lassen</label></div>
        <div class="checkbox-row"><input data-setting="roofEnabled" type="checkbox"${modelSettings.roofEnabled ? " checked" : ""}><label>Original-Dach aktiv lassen</label></div>
        <div class="checkbox-row"><input data-setting="windowsEnabled" type="checkbox"${modelSettings.windowsEnabled ? " checked" : ""}><label>Original-Fenster aktiv lassen</label></div>
        <div class="settings-note">Der Standardexport bleibt einzeilig: <code>const tmBuildingsConfig={buildings:[...]};</code></div>
    `;

    for (const input of settingsPanel.querySelectorAll("[data-setting]")) {
        const onSettingChange = () => handleSettingInput(input);
        input.addEventListener("input", onSettingChange);
        input.addEventListener("change", onSettingChange);
    }
}

function resize() {
    const rect = viewport.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    selectionBox && selectionBox.update();
    renderer.render(scene, camera);
}

function setActiveTool(name) {
    activeTool = activeTool === name ? "" : name;
    modelLog("Active tool changed", {
        requested: name,
        activeTool
    });
    edgeSnapMode = false;
    edgeSnapSelection = null;
    toolSelection = [];
    fillToolButton.classList.toggle("active", activeTool === "fill");
    cutToolButton.classList.toggle("active", activeTool === "cut");
    setStatus(activeTool === "fill" ? "Fuellen: zwei Objekte auswaehlen" : activeTool === "cut" ? "Ausschneiden: Host und Cutter auswaehlen" : "Bereit");
}

palette.addEventListener("click", event => {
    const button = event.target.closest("[data-type]");
    if (!button)
        return;
    addBundleWithMirrors(button.dataset.type, {
        x: 0,
        z: 0
    });
});

palette.addEventListener("dragstart", event => {
    const button = event.target.closest("[data-type]");
    if (!button)
        return;
    event.dataTransfer.setData("text/plain", button.dataset.type);
});

viewport.addEventListener("dragover", event => {
    event.preventDefault();
});

viewport.addEventListener("drop", event => {
    event.preventDefault();
    const type = event.dataTransfer.getData("text/plain");
    const hit = pointerToGround(event) || {
        x: 0,
        z: 0
    };
    type && addBundleWithMirrors(type, {
        x: hit.x,
        z: hit.z
    });
});

moveToolButton.addEventListener("click", () => {
    moveToolActive = !moveToolActive;
    moveToolButton.classList.toggle("active", moveToolActive);
    setStatus(moveToolActive ? "Move Tool aktiv" : "Move Tool aus");
});

duplicateButton.addEventListener("click", duplicateSelected);
deleteButton.addEventListener("click", deleteSelected);
fillToolButton.addEventListener("click", () => setActiveTool("fill"));
cutToolButton.addEventListener("click", () => setActiveTool("cut"));
copyButton.addEventListener("click", copyCode);

for (const button of tabButtons)
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));

mirrorModeSelect.addEventListener("change", () => {
    setStatus(`Spiegelmodus: ${mirrorModeSelect.options[mirrorModeSelect.selectedIndex].textContent}`);
});

renderer.domElement.addEventListener("pointerdown", onViewportPointerDown);
renderer.domElement.addEventListener("pointermove", updateDrag);
renderer.domElement.addEventListener("pointerup", endDrag);
renderer.domElement.addEventListener("pointercancel", endDrag);

window.addEventListener("keydown", event => {
    const key = String(event.key || "").toLowerCase();
    if (key === "shift")
        snapKeyDown = true;
    else if (key === "v" && !event.repeat) {
        event.preventDefault();
        toggleEdgeSnapMode();
    }
});

window.addEventListener("keyup", event => {
    const key = String(event.key || "").toLowerCase();
    if (key === "shift") {
        snapKeyDown = false;
        if (!dragging && !edgeSnapMode && !activeTool)
            setStatus("Bereit");
    }
});

// Boot sequence: build the side panels, seed a tiny default house, then print the health table once.
window.addEventListener("resize", resize);
modelLog("Startup begin");
renderPalette();
renderSettings();
addBundleWithMirrors("wall", {
    x: 0,
    z: -3
});
addBundleWithMirrors("wall", {
    x: 0,
    z: 3
});
getSelectedElement().ry = 0;
addBundleWithMirrors("wall", {
    x: -3,
    z: 0
});
getSelectedElement().ry = 90;
addBundleWithMirrors("wall", {
    x: 3,
    z: 0
});
getSelectedElement().ry = 90;
addBundleWithMirrors("pyramidRoof", {
    x: 0,
    z: 0
});
selectElement(getListableElements()[0] ? getListableElements()[0].id : null);
resize();
refreshCode();
printModelerHealthTable("startup");
modelLog("Startup complete", {
    elementCount: elements.length
});
animate();
