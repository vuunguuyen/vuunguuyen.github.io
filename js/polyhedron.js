"use strict";
const PHI = 1.6180339887498949;
const INV_PHI = 0.6180339887498949;
const PYRAMID_HEIGHT = 0.32;
const DUAL_SCALE = 1.35;
const DRAG_THRESHOLD = 25;
const TWO_PI = Math.PI * 2;
const MODE_LABELS = {
    inner: 'Triakis Icosahedron',
    outer: 'Truncated Dodecahedron',
    both: 'Triakis Icosahedron & Truncated Dodecahedron'
};
const ICO_VERTICES = [
    [-0.5257311121, 0.8506508084, 0], [0.5257311121, 0.8506508084, 0],
    [-0.5257311121, -0.8506508084, 0], [0.5257311121, -0.8506508084, 0],
    [0, -0.5257311121, 0.8506508084], [0, 0.5257311121, 0.8506508084],
    [0, -0.5257311121, -0.8506508084], [0, 0.5257311121, -0.8506508084],
    [0.8506508084, 0, -0.5257311121], [0.8506508084, 0, 0.5257311121],
    [-0.8506508084, 0, -0.5257311121], [-0.8506508084, 0, 0.5257311121]
];
const ICO_FACES = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
];
const TRUNC_DODECA_EDGES = [
    [0, 2], [0, 12], [0, 16], [1, 3], [1, 13], [1, 17], [2, 14], [2, 18], [3, 15], [3, 19],
    [4, 5], [4, 20], [4, 22], [5, 21], [5, 23], [6, 7], [6, 24], [6, 26], [7, 25], [7, 27],
    [8, 10], [8, 28], [8, 29], [9, 11], [9, 30], [9, 31], [10, 32], [10, 33], [11, 34], [11, 35],
    [12, 16], [12, 36], [13, 17], [13, 37], [14, 18], [14, 38], [15, 19], [15, 39], [16, 40],
    [17, 41], [18, 42], [19, 43], [20, 22], [20, 44], [21, 23], [21, 45], [22, 46], [23, 47],
    [24, 26], [24, 48], [25, 27], [25, 49], [26, 50], [27, 51], [28, 29], [28, 52], [29, 53],
    [30, 31], [30, 54], [31, 55], [32, 33], [32, 56], [33, 57], [34, 35], [34, 58], [35, 59],
    [36, 40], [36, 52], [37, 41], [37, 53], [38, 42], [38, 54], [39, 43], [39, 55], [40, 48],
    [41, 49], [42, 50], [43, 51], [44, 46], [44, 52], [45, 47], [45, 53], [46, 54], [47, 55],
    [48, 56], [49, 57], [50, 58], [51, 59], [56, 58], [57, 59]
];
const DEFAULT_CONFIG = {
    size: 280,
    scale: 85,
    displayMode: 'inner',
    strokeColor: '#0e0e7b',
    strokeWidth: 1,
    strokeOpacity: 0.9,
    dualStrokeColor: '#0e0e7b',
    dualStrokeWidth: 0.5,
    dualStrokeOpacity: 0.4,
    vertexColor: '#0e0e7b',
    vertexRadius: 0,
    depthFading: true,
    autoRotation: { x: 0.006, y: 0.010, z: 0.004 },
    dragSensitivity: 0.008,
    momentumDamping: 0.95,
    idleResumeDelay: 3000
};
function generateTriakisIcosahedron() {
    const vertices = [...ICO_VERTICES];
    const edges = [];
    const edgeSet = new Set();
    const addEdge = (i1, i2) => {
        const key = i1 < i2 ? (i1 << 16) | i2 : (i2 << 16) | i1;
        if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push([Math.min(i1, i2), Math.max(i1, i2)]);
        }
    };
    for (let f = 0; f < ICO_FACES.length; f++) {
        const [i0, i1, i2] = ICO_FACES[f];
        const v0 = ICO_VERTICES[i0], v1 = ICO_VERTICES[i1], v2 = ICO_VERTICES[i2];
        const cx = (v0[0] + v1[0] + v2[0]) / 3;
        const cy = (v0[1] + v1[1] + v2[1]) / 3;
        const cz = (v0[2] + v1[2] + v2[2]) / 3;
        const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
        const s = (1 + PYRAMID_HEIGHT) / len;
        const idx = vertices.length;
        vertices.push([cx * s, cy * s, cz * s]);
        addEdge(idx, i0);
        addEdge(idx, i1);
        addEdge(idx, i2);
        addEdge(i0, i1);
        addEdge(i1, i2);
        addEdge(i2, i0);
    }
    return { vertices, edges };
}
function generateTruncatedDodecahedron() {
    const twoPhi = 2 * PHI, phiPlusOne = PHI + 1, twoPhiPlusOne = 2 + PHI;
    const raw = [
        [0, INV_PHI, twoPhiPlusOne], [0, INV_PHI, -twoPhiPlusOne],
        [0, -INV_PHI, twoPhiPlusOne], [0, -INV_PHI, -twoPhiPlusOne],
        [twoPhiPlusOne, 0, INV_PHI], [twoPhiPlusOne, 0, -INV_PHI],
        [-twoPhiPlusOne, 0, INV_PHI], [-twoPhiPlusOne, 0, -INV_PHI],
        [INV_PHI, twoPhiPlusOne, 0], [INV_PHI, -twoPhiPlusOne, 0],
        [-INV_PHI, twoPhiPlusOne, 0], [-INV_PHI, -twoPhiPlusOne, 0],
        [INV_PHI, PHI, twoPhi], [INV_PHI, PHI, -twoPhi],
        [INV_PHI, -PHI, twoPhi], [INV_PHI, -PHI, -twoPhi],
        [-INV_PHI, PHI, twoPhi], [-INV_PHI, PHI, -twoPhi],
        [-INV_PHI, -PHI, twoPhi], [-INV_PHI, -PHI, -twoPhi],
        [twoPhi, INV_PHI, PHI], [twoPhi, INV_PHI, -PHI],
        [twoPhi, -INV_PHI, PHI], [twoPhi, -INV_PHI, -PHI],
        [-twoPhi, INV_PHI, PHI], [-twoPhi, INV_PHI, -PHI],
        [-twoPhi, -INV_PHI, PHI], [-twoPhi, -INV_PHI, -PHI],
        [PHI, twoPhi, INV_PHI], [PHI, twoPhi, -INV_PHI],
        [PHI, -twoPhi, INV_PHI], [PHI, -twoPhi, -INV_PHI],
        [-PHI, twoPhi, INV_PHI], [-PHI, twoPhi, -INV_PHI],
        [-PHI, -twoPhi, INV_PHI], [-PHI, -twoPhi, -INV_PHI],
        [PHI, 2, phiPlusOne], [PHI, 2, -phiPlusOne],
        [PHI, -2, phiPlusOne], [PHI, -2, -phiPlusOne],
        [-PHI, 2, phiPlusOne], [-PHI, 2, -phiPlusOne],
        [-PHI, -2, phiPlusOne], [-PHI, -2, -phiPlusOne],
        [phiPlusOne, PHI, 2], [phiPlusOne, PHI, -2],
        [phiPlusOne, -PHI, 2], [phiPlusOne, -PHI, -2],
        [-phiPlusOne, PHI, 2], [-phiPlusOne, PHI, -2],
        [-phiPlusOne, -PHI, 2], [-phiPlusOne, -PHI, -2],
        [2, phiPlusOne, PHI], [2, phiPlusOne, -PHI],
        [2, -phiPlusOne, PHI], [2, -phiPlusOne, -PHI],
        [-2, phiPlusOne, PHI], [-2, phiPlusOne, -PHI],
        [-2, -phiPlusOne, PHI], [-2, -phiPlusOne, -PHI]
    ];
    let maxDistSq = 0;
    for (let i = 0; i < raw.length; i++) {
        const [x, y, z] = raw[i];
        maxDistSq = Math.max(maxDistSq, x * x + y * y + z * z);
    }
    const scale = DUAL_SCALE / Math.sqrt(maxDistSq);
    const vertices = raw.map(([x, y, z]) => [x * scale, y * scale, z * scale]);
    return { vertices, edges: TRUNC_DODECA_EDGES };
}
function rotatePoint(p, r) {
    const cx = Math.cos(r.x), sx = Math.sin(r.x);
    const cy = Math.cos(r.y), sy = Math.sin(r.y);
    const cz = Math.cos(r.z), sz = Math.sin(r.z);
    const y1 = p[1] * cx - p[2] * sx;
    const z1 = p[1] * sx + p[2] * cx;
    const x2 = p[0] * cy + z1 * sy;
    const z2 = -p[0] * sy + z1 * cy;
    return [x2 * cz - y1 * sz, x2 * sz + y1 * cz, z2];
}
const Polyhedron = (function () {
    const triakis = generateTriakisIcosahedron();
    const dual = generateTruncatedDodecahedron();
    let config = { ...DEFAULT_CONFIG };
    let svg = null;
    let edgeLines = [];
    let dualLines = [];
    let vertexCircles = [];
    let containerEl = null;
    let animationId = null;
    let isDragging = false, wasDragging = false, isAutoRotating = true;
    let lastX = 0, lastY = 0, downX = 0, downY = 0;
    let velX = 0, velY = 0;
    let rotX = 0.5, rotY = 0.3, rotZ = 0;
    let resumeTimer = null;
    const projected = [];
    const dualProjected = [];
    function project(p) {
        const h = config.size / 2;
        return { x: h + p[0] * config.scale, y: h - p[1] * config.scale, z: p[2] };
    }
    function createSVG() {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', String(config.size));
        svg.setAttribute('height', String(config.size));
        svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
        svg.style.cssText = 'cursor:grab;display:block;overflow:visible';
        const dualGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svg.append(dualGroup, edgeGroup);
        dualLines = dual.edges.map(() => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('stroke', config.dualStrokeColor);
            line.setAttribute('stroke-width', String(config.dualStrokeWidth));
            line.setAttribute('stroke-linecap', 'round');
            dualGroup.appendChild(line);
            return line;
        });
        edgeLines = triakis.edges.map(() => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('stroke', config.strokeColor);
            line.setAttribute('stroke-width', String(config.strokeWidth));
            line.setAttribute('stroke-linecap', 'round');
            edgeGroup.appendChild(line);
            return line;
        });
        if (config.vertexRadius > 0) {
            const vertGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            svg.appendChild(vertGroup);
            vertexCircles = triakis.vertices.map(() => {
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('r', String(config.vertexRadius));
                c.setAttribute('fill', config.vertexColor);
                vertGroup.appendChild(c);
                return c;
            });
        }
        updateDisplayMode();
        containerEl.appendChild(svg);
    }
    function updateDisplayMode() {
        const showInner = config.displayMode !== 'outer';
        const showOuter = config.displayMode !== 'inner';
        const innerDisplay = showInner ? '' : 'none';
        const outerDisplay = showOuter ? '' : 'none';
        edgeLines.forEach(l => l.style.display = innerDisplay);
        dualLines.forEach(l => l.style.display = outerDisplay);
        vertexCircles.forEach(c => c.style.display = innerDisplay);
    }
    function render() {
        const rot = { x: rotX, y: rotY, z: rotZ };
        const showInner = config.displayMode !== 'outer';
        const showOuter = config.displayMode !== 'inner';
        const fade = config.depthFading;
        if (showInner) {
            for (let i = 0; i < triakis.vertices.length; i++) {
                projected[i] = project(rotatePoint(triakis.vertices[i], rot));
            }
        }
        if (showOuter) {
            for (let i = 0; i < dual.vertices.length; i++) {
                dualProjected[i] = project(rotatePoint(dual.vertices[i], rot));
            }
        }
        if (showOuter) {
            for (let i = 0; i < dual.edges.length; i++) {
                const [i1, i2] = dual.edges[i];
                const p1 = dualProjected[i1], p2 = dualProjected[i2];
                const line = dualLines[i];
                line.setAttribute('x1', String(p1.x));
                line.setAttribute('y1', String(p1.y));
                line.setAttribute('x2', String(p2.x));
                line.setAttribute('y2', String(p2.y));
                if (fade) {
                    const depth = ((p1.z + p2.z) / 2 + 2) / 4;
                    line.setAttribute('stroke-opacity', String((0.15 + depth * 0.85) * config.dualStrokeOpacity));
                }
            }
        }
        if (showInner) {
            for (let i = 0; i < triakis.edges.length; i++) {
                const [i1, i2] = triakis.edges[i];
                const p1 = projected[i1], p2 = projected[i2];
                const line = edgeLines[i];
                line.setAttribute('x1', String(p1.x));
                line.setAttribute('y1', String(p1.y));
                line.setAttribute('x2', String(p2.x));
                line.setAttribute('y2', String(p2.y));
                if (fade) {
                    const depth = ((p1.z + p2.z) / 2 + 2) / 4;
                    line.setAttribute('stroke-opacity', String((0.25 + depth * 0.75) * config.strokeOpacity));
                }
            }
            for (let i = 0; i < vertexCircles.length; i++) {
                const p = projected[i];
                vertexCircles[i].setAttribute('cx', String(p.x));
                vertexCircles[i].setAttribute('cy', String(p.y));
                if (fade) {
                    vertexCircles[i].setAttribute('fill-opacity', String(0.25 + ((p.z + 2) / 4) * 0.75));
                }
            }
        }
    }
    function getPos(e) {
        const src = 'touches' in e ? e.touches[0] : e;
        return { x: src.clientX, y: src.clientY };
    }
    function onDown(e) {
        e.preventDefault();
        const p = getPos(e);
        lastX = downX = p.x;
        lastY = downY = p.y;
        isDragging = true;
        wasDragging = false;
        if (resumeTimer) {
            clearTimeout(resumeTimer);
            resumeTimer = null;
        }
    }
    function onMove(e) {
        if (!isDragging)
            return;
        e.preventDefault();
        const p = getPos(e);
        const dx = p.x - downX, dy = p.y - downY;
        if (dx * dx + dy * dy > DRAG_THRESHOLD) {
            wasDragging = true;
            isAutoRotating = false;
            if (svg)
                svg.style.cursor = 'grabbing';
        }
        if (wasDragging) {
            const mx = p.x - lastX, my = p.y - lastY;
            rotY += mx * config.dragSensitivity;
            rotX += my * config.dragSensitivity;
            velX = my * config.dragSensitivity;
            velY = mx * config.dragSensitivity;
        }
        lastX = p.x;
        lastY = p.y;
    }
    function onUp() {
        if (!isDragging)
            return;
        isDragging = false;
        if (svg)
            svg.style.cursor = 'grab';
        if (wasDragging) {
            resumeTimer = window.setTimeout(() => { isAutoRotating = true; }, config.idleResumeDelay);
        }
    }
    function onClick() {
        if (!wasDragging)
            cycleDisplayMode();
        wasDragging = false;
    }
    function bindEvents() {
        if (!svg)
            return;
        svg.addEventListener('mousedown', onDown);
        svg.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
        svg.addEventListener('click', onClick);
    }
    function unbindEvents() {
        if (!svg)
            return;
        svg.removeEventListener('mousedown', onDown);
        svg.removeEventListener('touchstart', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchend', onUp);
        svg.removeEventListener('click', onClick);
    }
    function animate() {
        animationId = requestAnimationFrame(animate);
        if (isAutoRotating) {
            rotX += config.autoRotation.x;
            rotY += config.autoRotation.y;
            rotZ += config.autoRotation.z;
        }
        else if (!isDragging) {
            rotX += velX;
            rotY += velY;
            velX *= config.momentumDamping;
            velY *= config.momentumDamping;
        }
        render();
    }
    function showModeLabel(mode) {
        const hint = document.getElementById('polyhedron-hint');
        if (!hint)
            return;
        const tid = hint.dataset.timerId;
        if (tid)
            clearTimeout(+tid);
        hint.style.transition = 'none';
        hint.style.opacity = '1';
        hint.textContent = MODE_LABELS[mode];
        hint.style.display = '';
        hint.offsetHeight;
        hint.dataset.timerId = String(setTimeout(() => {
            hint.style.transition = 'opacity 0.5s';
            hint.style.opacity = '0';
            setTimeout(() => { hint.style.display = 'none'; }, 500);
        }, 1500));
    }
    function init(container, userConfig = {}) {
        containerEl = typeof container === 'string' ? document.querySelector(container) : container;
        if (!containerEl) {
            console.error('[Polyhedron] Container not found');
            return false;
        }
        config = { ...DEFAULT_CONFIG, ...userConfig,
            autoRotation: { ...DEFAULT_CONFIG.autoRotation, ...(userConfig.autoRotation || {}) }
        };
        createSVG();
        bindEvents();
        animate();
        return true;
    }
    function destroy() {
        if (animationId)
            cancelAnimationFrame(animationId);
        if (resumeTimer)
            clearTimeout(resumeTimer);
        unbindEvents();
        svg?.remove();
        svg = null;
        edgeLines = [];
        dualLines = [];
        vertexCircles = [];
        containerEl = null;
        isDragging = wasDragging = false;
        isAutoRotating = true;
        rotX = 0.5;
        rotY = 0.3;
        rotZ = velX = velY = 0;
    }
    function setConfig(nc) {
        config = { ...config, ...nc, autoRotation: { ...config.autoRotation, ...(nc.autoRotation || {}) } };
        if (svg && nc.size !== undefined) {
            svg.setAttribute('width', String(config.size));
            svg.setAttribute('height', String(config.size));
            svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
        }
        if (nc.strokeColor)
            edgeLines.forEach(l => l.setAttribute('stroke', config.strokeColor));
        if (nc.strokeWidth !== undefined)
            edgeLines.forEach(l => l.setAttribute('stroke-width', String(config.strokeWidth)));
        if (nc.dualStrokeColor)
            dualLines.forEach(l => l.setAttribute('stroke', config.dualStrokeColor));
        if (nc.dualStrokeWidth !== undefined)
            dualLines.forEach(l => l.setAttribute('stroke-width', String(config.dualStrokeWidth)));
        if (nc.displayMode !== undefined)
            updateDisplayMode();
    }
    function cycleDisplayMode() {
        const modes = ['inner', 'outer', 'both'];
        config.displayMode = modes[(modes.indexOf(config.displayMode) + 1) % 3];
        updateDisplayMode();
        showModeLabel(config.displayMode);
        return config.displayMode;
    }
    function setDisplayMode(mode, showLabel = true) {
        config.displayMode = mode;
        updateDisplayMode();
        if (showLabel)
            showModeLabel(mode);
    }
    return { init, destroy, setConfig, cycleDisplayMode, setDisplayMode, get config() { return { ...config }; } };
})();
document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('polyhedron-container');
    if (c)
        Polyhedron.init(c);
});
window.Polyhedron = Polyhedron;
