import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/controls/OrbitControls.js";

const viewport = document.getElementById("viewport");
const elementList = document.getElementById("elementList");
const palette = document.getElementById("palette");
const inspector = document.getElementById("inspector");
const moveToolButton = document.getElementById("moveTool");
const duplicateButton = document.getElementById("duplicateElement");
const deleteButton = document.getElementById("deleteElement");
const copyButton = document.getElementById("copyCode");
const statusText = document.getElementById("statusText");
const codeOutput = document.getElementById("codeOutput");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101316);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(10, 8, 12);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2, 0);

const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x3a3c35, 1.7);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(8, 14, 9);
sun.castShadow = true;
scene.add(sun);

const grid = new THREE.GridHelper(24, 48, 0x40505e, 0x27313a);
scene.add(grid);

const originAxes = new THREE.AxesHelper(2);
scene.add(originAxes);

const elementGroup = new THREE.Group();
scene.add(elementGroup);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dragPoint = new THREE.Vector3();

const meshById = new Map();
let elements = [];
let selectedId = null;
let idCounter = 1;
let moveToolActive = false;
let snapKeyDown = false;
let dragging = null;
let selectionBox = null;

const typeLabels = {
    wall: "Wand",
    cylinderWall: "Zylinderwand",
    pyramidRoof: "Dach",
    cone: "Kegel"
};

function setStatus(text) {
    statusText.textContent = text;
}

function degToRad(value) {
    return (Number(value) || 0) * Math.PI / 180;
}

function roundNumber(value) {
    const rounded = Math.round((Number(value) || 0) * 1000) / 1000;
    return Object.is(rounded, -0) ? 0 : rounded;
}

function colorToNumber(color) {
    return Number.parseInt(String(color || "#cccccc").replace("#", ""), 16) || 0xcccccc;
}

function hexLiteral(color) {
    return `__HEX__0x${String(color || "#cccccc").replace("#", "").padStart(6, "0").slice(0, 6)}`;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function createDefaultElement(type, position = { x: 0, z: 0 }) {
    const base = {
        id: `part_${idCounter++}`,
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
        c: 0.24,
        color: "#d8c6a6",
        opacity: 1
    };
    if (type === "cylinderWall") {
        return {
            ...base,
            name: "Zylinderwand",
            a: 2.6,
            b: 3,
            c: 2.6,
            thickness: 0.22,
            angle: 120,
            startAngle: -60,
            segments: 32,
            color: "#cdbb9b"
        };
    }
    if (type === "pyramidRoof") {
        return {
            ...base,
            name: "Dach",
            y: 4.15,
            a: 6.2,
            b: 2.2,
            c: 6.2,
            sides: 4,
            topMode: "ridge",
            ridgeLength: 3.8,
            ridgeDirection: "x",
            topScale: 0.35,
            topWidth: 2,
            topDepth: 2,
            sideScale1: 1,
            sideScale2: 1,
            sideScale3: 1,
            sideScale4: 1,
            sideScale5: 1,
            sideScale6: 1,
            sideScale7: 1,
            sideScale8: 1,
            color: "#7f3d32"
        };
    }
    if (type === "cone") {
        return {
            ...base,
            name: "Kegel",
            y: 2,
            a: 1.4,
            b: 4,
            c: 1.4,
            segments: 24,
            color: "#8d4f3d"
        };
    }
    return base;
}

function getElement(id = selectedId) {
    return elements.find(element => element.id === id) || null;
}

function materialFor(element) {
    return new THREE.MeshStandardMaterial({
        color: colorToNumber(element.color),
        roughness: 0.72,
        metalness: 0.02,
        transparent: Number(element.opacity) < 1,
        opacity: clamp(Number(element.opacity) || 1, 0.05, 1),
        side: THREE.DoubleSide
    });
}

function createCylinderWallGeometry(element) {
    const height = Math.max(0.05, Number(element.b) || 3);
    const radiusX = Math.max(0.05, Number(element.a) || 2);
    const radiusZ = Math.max(0.05, Number(element.c) || radiusX);
    const thickness = Math.min(Math.max(0.02, Number(element.thickness) || 0.2), Math.min(radiusX, radiusZ) - 0.01);
    const segments = Math.max(3, Math.round(Number(element.segments) || 24));
    const thetaStart = (Number(element.startAngle) || 0) * Math.PI / 180;
    const thetaLength = clamp(Math.abs(Number(element.angle) || 90), 1, 360) * Math.PI / 180;
    const fullCircle = thetaLength >= Math.PI * 2 - 0.001;
    const positions = [];
    const indices = [];

    for (let index = 0; index <= segments; index++) {
        const t = index / segments;
        const angle = thetaStart + thetaLength * t;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const outerX = cos * radiusX;
        const outerZ = sin * radiusZ;
        const innerX = cos * Math.max(0.02, radiusX - thickness);
        const innerZ = sin * Math.max(0.02, radiusZ - thickness);
        positions.push(
            outerX, -height / 2, outerZ,
            outerX, height / 2, outerZ,
            innerX, -height / 2, innerZ,
            innerX, height / 2, innerZ
        );
    }

    const face = (a, b, c, d) => {
        indices.push(a, b, c);
        if (d !== undefined)
            indices.push(b, d, c);
    };

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

function polygonPoints(width, depth, sides, scales = []) {
    if (sides === 4) {
        return [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]].map((point, index) => {
            const scale = Math.max(0.05, Number(scales[index]) || 1);
            return [point[0] * scale, point[1] * scale];
        });
    }
    const out = [];
    for (let index = 0; index < sides; index++) {
        const angle = -Math.PI / 2 + index / sides * Math.PI * 2;
        const scale = Math.max(0.05, Number(scales[index]) || 1);
        out.push([Math.cos(angle) * width / 2 * scale, Math.sin(angle) * depth / 2 * scale]);
    }
    return out;
}

function sideScalesFor(element) {
    return [element.sideScale1, element.sideScale2, element.sideScale3, element.sideScale4, element.sideScale5, element.sideScale6, element.sideScale7, element.sideScale8].map(value => Number(value) || 1);
}

function createRidgeGeometry(element) {
    const width = Math.max(0.05, Number(element.a) || 4);
    const height = Math.max(0.05, Number(element.b) || 2);
    const depth = Math.max(0.05, Number(element.c) || 4);
    const corners = polygonPoints(width, depth, 4, sideScalesFor(element));
    const ridgeDirection = element.ridgeDirection === "z" ? "z" : "x";
    const maxLength = ridgeDirection === "x" ? width : depth;
    const ridgeLength = Math.max(0.1, Math.min(maxLength, Number(element.ridgeLength) || maxLength * 0.55));
    const y0 = -height / 2;
    const y1 = height / 2;
    const vertices = ridgeDirection === "x" ? [
        [corners[0][0], y0, corners[0][1]],
        [corners[1][0], y0, corners[1][1]],
        [corners[2][0], y0, corners[2][1]],
        [corners[3][0], y0, corners[3][1]],
        [-ridgeLength / 2, y1, 0],
        [ridgeLength / 2, y1, 0]
    ] : [
        [corners[0][0], y0, corners[0][1]],
        [corners[1][0], y0, corners[1][1]],
        [corners[2][0], y0, corners[2][1]],
        [corners[3][0], y0, corners[3][1]],
        [0, y1, -ridgeLength / 2],
        [0, y1, ridgeLength / 2]
    ];
    const indices = ridgeDirection === "x" ? [0, 1, 4, 1, 5, 4, 3, 4, 2, 2, 4, 5, 0, 4, 3, 1, 2, 5] : [0, 4, 1, 1, 4, 5, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function createPyramidGeometry(element) {
    if (element.topMode === "ridge")
        return createRidgeGeometry(element);

    const width = Math.max(0.05, Number(element.a) || 4);
    const height = Math.max(0.05, Number(element.b) || 2);
    const depth = Math.max(0.05, Number(element.c) || 4);
    const sides = Math.max(3, Math.round(Number(element.sides) || 4));
    const bottom = polygonPoints(width, depth, sides, sideScalesFor(element));
    const positions = [];
    const indices = [];

    for (const point of bottom)
        positions.push(point[0], -height / 2, point[1]);

    const face = (a, b, c, d) => {
        indices.push(a, b, c);
        if (d !== undefined)
            indices.push(b, d, c);
    };

    if (element.topMode === "flat") {
        const topWidth = Math.max(0.02, Number(element.topWidth) || width * (Number(element.topScale) || 0.35));
        const topDepth = Math.max(0.02, Number(element.topDepth) || depth * (Number(element.topScale) || 0.35));
        const top = polygonPoints(topWidth, topDepth, sides);
        for (const point of top)
            positions.push(point[0], height / 2, point[1]);
        for (let index = 0; index < sides; index++) {
            const next = (index + 1) % sides;
            face(index, next, sides + index, sides + next);
        }
        for (let index = 1; index < sides - 1; index++)
            indices.push(sides, sides + index, sides + index + 1);
    } else {
        const apex = positions.length / 3;
        positions.push(0, height / 2, 0);
        for (let index = 0; index < sides; index++)
            indices.push(index, (index + 1) % sides, apex);
    }

    for (let index = 1; index < sides - 1; index++)
        indices.push(0, index + 1, index);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function createMesh(element) {
    let geometry;
    if (element.type === "wall") {
        geometry = new THREE.BoxGeometry(Math.max(0.05, Number(element.a) || 1), Math.max(0.05, Number(element.b) || 1), Math.max(0.02, Number(element.c) || 0.1));
    } else if (element.type === "cylinderWall") {
        geometry = createCylinderWallGeometry(element);
    } else if (element.type === "pyramidRoof") {
        geometry = createPyramidGeometry(element);
    } else if (element.type === "cone") {
        const radius = Math.max(0.05, Number(element.a) || 1);
        const height = Math.max(0.05, Number(element.b) || 2);
        const segments = Math.max(3, Math.round(Number(element.segments) || 16));
        geometry = new THREE.CylinderGeometry(0, radius, height, segments);
        const radiusZ = Math.max(0.05, Number(element.c) || radius);
        geometry.scale(1, 1, radiusZ / radius);
    } else {
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const mesh = new THREE.Mesh(geometry, materialFor(element));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(Number(element.x) || 0, Number(element.y) || 0, Number(element.z) || 0);
    mesh.rotation.set(degToRad(element.rx), degToRad(element.ry), degToRad(element.rz));
    mesh.userData.elementId = element.id;
    return mesh;
}

function rebuildMeshes() {
    for (const child of [...elementGroup.children]) {
        child.geometry?.dispose();
        if (Array.isArray(child.material))
            child.material.forEach(material => material.dispose());
        else
            child.material?.dispose();
        elementGroup.remove(child);
    }
    meshById.clear();
    for (const element of elements) {
        const mesh = createMesh(element);
        meshById.set(element.id, mesh);
        elementGroup.add(mesh);
    }
    updateSelectionBox();
}

function updateSelectionBox() {
    if (selectionBox) {
        scene.remove(selectionBox);
        selectionBox.geometry?.dispose();
        selectionBox.material?.dispose();
        selectionBox = null;
    }
    const mesh = meshById.get(selectedId);
    if (!mesh)
        return;
    selectionBox = new THREE.BoxHelper(mesh, 0x73b6ff);
    scene.add(selectionBox);
}

function renderElementList() {
    elementList.innerHTML = "";
    if (!elements.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "Keine Elemente";
        elementList.appendChild(empty);
        return;
    }
    for (const element of elements) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `element-item${element.id === selectedId ? " selected" : ""}`;
        button.dataset.id = element.id;
        button.innerHTML = `<span class="element-swatch" style="background:${element.color}"></span><span>${element.name}</span>`;
        button.addEventListener("click", () => selectElement(element.id));
        elementList.appendChild(button);
    }
}

function field(prop, label, type = "number", attrs = "") {
    const element = getElement();
    const value = element ? element[prop] ?? "" : "";
    return `<div class="field"><label>${label}</label><input data-prop="${prop}" type="${type}" value="${value}" ${attrs}></div>`;
}

function selectField(prop, label, options) {
    const element = getElement();
    const value = element ? String(element[prop] ?? "") : "";
    return `<div class="field"><label>${label}</label><select data-prop="${prop}">${options.map(option => `<option value="${option.value}"${String(option.value) === value ? " selected" : ""}>${option.label}</option>`).join("")}</select></div>`;
}

function renderInspector() {
    const element = getElement();
    if (!element) {
        inspector.innerHTML = `<div class="empty-state">Links ein Element auswaehlen.</div>`;
        return;
    }

    const common = `
        <div class="field-wide"><label>Name</label><input data-prop="name" type="text" value="${element.name}"></div>
        <div class="field-grid">
            <div class="field"><label>Farbe</label><input data-prop="color" type="color" value="${element.color}"></div>
            ${field("opacity", "Opacity", "number", 'min="0.05" max="1" step="0.05"')}
            ${field("a", "A", "number", 'step="0.1"')}
            ${field("b", "B", "number", 'step="0.1"')}
            ${field("c", "C", "number", 'step="0.1"')}
        </div>
        <div class="section field-grid">
            ${field("x", "X", "number", 'step="0.1"')}
            ${field("y", "Y", "number", 'step="0.1"')}
            ${field("z", "Z", "number", 'step="0.1"')}
            ${field("rx", "Rot X", "number", 'step="1"')}
            ${field("ry", "Rot Y", "number", 'step="1"')}
            ${field("rz", "Rot Z", "number", 'step="1"')}
        </div>
    `;

    let extra = "";
    if (element.type === "cylinderWall") {
        extra = `
            <div class="section field-grid">
                ${field("angle", "Winkel", "number", 'min="1" max="360" step="1"')}
                ${field("startAngle", "Start", "number", 'step="1"')}
                ${field("thickness", "Dicke", "number", 'min="0.02" step="0.02"')}
                ${field("segments", "Rundheit", "number", 'min="3" max="96" step="1"')}
            </div>
        `;
    } else if (element.type === "pyramidRoof") {
        extra = `
            <div class="section field-grid">
                ${field("sides", "Seiten", "number", 'min="3" max="8" step="1"')}
                ${selectField("topMode", "Oben", [{ value: "point", label: "Ecke" }, { value: "ridge", label: "Kante" }, { value: "flat", label: "Flaeche" }])}
                ${selectField("ridgeDirection", "Kante", [{ value: "x", label: "X" }, { value: "z", label: "Z" }])}
                ${field("ridgeLength", "Kantenlaenge", "number", 'step="0.1"')}
                ${field("topScale", "Top Scale", "number", 'min="0.02" step="0.05"')}
                ${field("topWidth", "Top A", "number", 'step="0.1"')}
                ${field("topDepth", "Top C", "number", 'step="0.1"')}
                ${field("sideScale1", "Side 1", "number", 'min="0.05" step="0.05"')}
                ${field("sideScale2", "Side 2", "number", 'min="0.05" step="0.05"')}
                ${field("sideScale3", "Side 3", "number", 'min="0.05" step="0.05"')}
                ${field("sideScale4", "Side 4", "number", 'min="0.05" step="0.05"')}
                ${field("sideScale5", "Side 5", "number", 'min="0.05" step="0.05"')}
                ${field("sideScale6", "Side 6", "number", 'min="0.05" step="0.05"')}
                ${field("sideScale7", "Side 7", "number", 'min="0.05" step="0.05"')}
                ${field("sideScale8", "Side 8", "number", 'min="0.05" step="0.05"')}
            </div>
        `;
    } else if (element.type === "cone") {
        extra = `
            <div class="section field-grid">
                ${field("segments", "Rundheit", "number", 'min="3" max="96" step="1"')}
            </div>
        `;
    }

    inspector.innerHTML = common + extra;
    for (const input of inspector.querySelectorAll("[data-prop]")) {
        input.addEventListener("input", () => {
            const active = getElement();
            if (!active)
                return;
            const prop = input.dataset.prop;
            active[prop] = input.type === "number" ? roundNumber(input.value) : input.value;
            rebuildMeshes();
            renderElementList();
            refreshCode();
        });
    }
}

function selectElement(id) {
    selectedId = id;
    renderElementList();
    renderInspector();
    updateSelectionBox();
}

function addElement(type, position) {
    const element = createDefaultElement(type, position);
    elements.push(element);
    selectedId = element.id;
    rebuildMeshes();
    renderElementList();
    renderInspector();
    refreshCode();
    setStatus(`${element.name} erstellt`);
}

function duplicateSelected() {
    const element = getElement();
    if (!element)
        return;
    const copy = JSON.parse(JSON.stringify(element));
    copy.id = `part_${idCounter++}`;
    copy.name = `${element.name} Copy`;
    copy.x = roundNumber((Number(copy.x) || 0) + 0.5);
    copy.z = roundNumber((Number(copy.z) || 0) + 0.5);
    elements.push(copy);
    selectedId = copy.id;
    rebuildMeshes();
    renderElementList();
    renderInspector();
    refreshCode();
}

function deleteSelected() {
    if (!selectedId)
        return;
    elements = elements.filter(element => element.id !== selectedId);
    selectedId = elements[0]?.id || null;
    rebuildMeshes();
    renderElementList();
    renderInspector();
    refreshCode();
}

function getFootprint(element, proposed = null) {
    const x = proposed ? proposed.x : Number(element.x) || 0;
    const z = proposed ? proposed.z : Number(element.z) || 0;
    let width = Number(element.a) || 1;
    let depth = Number(element.c) || 1;
    if (element.type === "cylinderWall") {
        width = Math.max(0.2, (Number(element.a) || 1) * 2);
        depth = Math.max(0.2, (Number(element.c) || Number(element.a) || 1) * 2);
    } else if (element.type === "cone") {
        width = Math.max(0.2, (Number(element.a) || 1) * 2);
        depth = Math.max(0.2, (Number(element.c) || Number(element.a) || 1) * 2);
    }
    const angle = degToRad(element.ry);
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const rotatedWidth = width * cos + depth * sin;
    const rotatedDepth = width * sin + depth * cos;
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
    const threshold = 0.35;
    const result = {
        x: Math.round(proposed.x * 4) / 4,
        z: Math.round(proposed.z * 4) / 4
    };
    let best = {
        distance: threshold
    };
    const current = getFootprint(element, result);
    for (const other of elements) {
        if (other.id === element.id)
            continue;
        const target = getFootprint(other);
        if (rangesOverlap(current.minZ, current.maxZ, target.minZ, target.maxZ)) {
            const leftToRight = Math.abs(current.minX - target.maxX);
            if (leftToRight < best.distance)
                best = { axis: "x", value: target.maxX + current.width / 2, distance: leftToRight };
            const rightToLeft = Math.abs(current.maxX - target.minX);
            if (rightToLeft < best.distance)
                best = { axis: "x", value: target.minX - current.width / 2, distance: rightToLeft };
        }
        if (rangesOverlap(current.minX, current.maxX, target.minX, target.maxX)) {
            const backToFront = Math.abs(current.minZ - target.maxZ);
            if (backToFront < best.distance)
                best = { axis: "z", value: target.maxZ + current.depth / 2, distance: backToFront };
            const frontToBack = Math.abs(current.maxZ - target.minZ);
            if (frontToBack < best.distance)
                best = { axis: "z", value: target.minZ - current.depth / 2, distance: frontToBack };
        }
    }
    if (best.axis)
        result[best.axis] = roundNumber(best.value);
    return result;
}

function pointerToGround(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(dragPlane, dragPoint) ? dragPoint.clone() : null;
}

function syncInspectorInputs() {
    const element = getElement();
    if (!element)
        return;
    for (const input of inspector.querySelectorAll("[data-prop]")) {
        const prop = input.dataset.prop;
        if (prop in element)
            input.value = element[prop];
    }
}

function beginDrag(event) {
    if (!moveToolActive || !selectedId)
        return;
    const element = getElement();
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
    rebuildMeshes();
    syncInspectorInputs();
    refreshCode();
    setStatus(snapKeyDown ? "Snap aktiv" : "Move");
}

function endDrag(event) {
    if (!dragging)
        return;
    dragging = null;
    controls.enabled = true;
    try {
        renderer.domElement.releasePointerCapture(event.pointerId);
    } catch (captureError) {}
}

function partForExport(element) {
    const common = {
        type: element.type,
        position: [roundNumber(element.x), roundNumber(element.y), roundNumber(element.z)],
        rotation: [roundNumber(element.rx), roundNumber(element.ry), roundNumber(element.rz)],
        color: hexLiteral(element.color)
    };
    if (Number(element.opacity) < 1) {
        common.transparent = true;
        common.opacity = roundNumber(element.opacity);
    }
    if (element.type === "wall") {
        return {
            ...common,
            size: [roundNumber(element.a), roundNumber(element.b), roundNumber(element.c)]
        };
    }
    if (element.type === "cylinderWall") {
        return {
            ...common,
            radiusX: roundNumber(element.a),
            radiusZ: roundNumber(element.c),
            height: roundNumber(element.b),
            thickness: roundNumber(element.thickness),
            angle: roundNumber(element.angle),
            thetaStart: roundNumber(element.startAngle),
            segments: Math.max(3, Math.round(Number(element.segments) || 24))
        };
    }
    if (element.type === "pyramidRoof") {
        const exported = {
            ...common,
            size: [roundNumber(element.a), roundNumber(element.b), roundNumber(element.c)],
            sides: Math.max(3, Math.round(Number(element.sides) || 4)),
            topMode: element.topMode || "point",
            sideScales: sideScalesFor(element).slice(0, Math.max(4, Math.round(Number(element.sides) || 4))).map(roundNumber)
        };
        if (element.topMode === "ridge") {
            exported.ridgeLength = roundNumber(element.ridgeLength);
            exported.ridgeDirection = element.ridgeDirection || "x";
        } else if (element.topMode === "flat") {
            exported.topScale = roundNumber(element.topScale);
            exported.topSize = [roundNumber(element.topWidth), roundNumber(element.topDepth)];
        }
        return exported;
    }
    if (element.type === "cone") {
        return {
            ...common,
            radius: roundNumber(element.a),
            height: roundNumber(element.b),
            c: roundNumber(element.c),
            segments: Math.max(3, Math.round(Number(element.segments) || 16))
        };
    }
    return common;
}

function exportEntry() {
    return {
        id: "modeler_house_replace_me",
        match: {
            id: "REPLACE_WITH_DEBUG_ID"
        },
        base: {
            enabled: false
        },
        roof: {
            enabled: false
        },
        windows: {
            enabled: false
        },
        parts: elements.map(partForExport)
    };
}

function formatCode(value) {
    return JSON.stringify(value, null, 4)
        .replace(/"([A-Za-z_$][A-Za-z0-9_$]*)":/g, "$1:")
        .replace(/"__HEX__(0x[0-9a-fA-F]+)"/g, "$1");
}

function refreshCode() {
    codeOutput.value = formatCode(exportEntry());
}

async function copyCode() {
    refreshCode();
    codeOutput.select();
    try {
        await navigator.clipboard.writeText(codeOutput.value);
        setStatus("Code kopiert");
    } catch (clipboardError) {
        document.execCommand("copy");
        setStatus("Code markiert");
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
    if (selectionBox)
        selectionBox.update();
    renderer.render(scene, camera);
}

palette.addEventListener("click", event => {
    const button = event.target.closest("[data-type]");
    if (!button)
        return;
    addElement(button.dataset.type, { x: 0, z: 0 });
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
    if (!type)
        return;
    const hit = pointerToGround(event) || { x: 0, z: 0 };
    addElement(type, { x: hit.x, z: hit.z });
});

moveToolButton.addEventListener("click", () => {
    moveToolActive = !moveToolActive;
    moveToolButton.classList.toggle("active", moveToolActive);
    setStatus(moveToolActive ? "Move Tool aktiv" : "Move Tool aus");
});

duplicateButton.addEventListener("click", duplicateSelected);
deleteButton.addEventListener("click", deleteSelected);
copyButton.addEventListener("click", copyCode);

renderer.domElement.addEventListener("pointerdown", beginDrag);
renderer.domElement.addEventListener("pointermove", updateDrag);
renderer.domElement.addEventListener("pointerup", endDrag);
renderer.domElement.addEventListener("pointercancel", endDrag);

window.addEventListener("keydown", event => {
    if (event.key.toLowerCase() === "v")
        snapKeyDown = true;
});

window.addEventListener("keyup", event => {
    if (event.key.toLowerCase() === "v") {
        snapKeyDown = false;
        if (!dragging)
            setStatus("Bereit");
    }
});

window.addEventListener("resize", resize);

addElement("wall", { x: 0, z: -3 });
addElement("wall", { x: 0, z: 3 });
getElement(selectedId).ry = 0;
addElement("wall", { x: -3, z: 0 });
getElement(selectedId).ry = 90;
addElement("wall", { x: 3, z: 0 });
getElement(selectedId).ry = 90;
addElement("pyramidRoof", { x: 0, z: 0 });
selectElement(elements[0].id);
resize();
refreshCode();
animate();
