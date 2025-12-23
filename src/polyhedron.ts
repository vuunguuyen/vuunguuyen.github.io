/**
 * ============================================================================
 * INTERACTIVE TRIAKIS ICOSAHEDRON COMPONENT (SVG Vector Version)
 * ============================================================================
 * 
 * Optimized 3D wireframe polyhedron renderer using SVG.
 * 
 * @author Vu Nguyen
 * @version 3.1.0
 * @license MIT
 * ============================================================================
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type DisplayMode = 'inner' | 'outer' | 'both';
type Vec3 = [number, number, number];
type Edge = [number, number];

interface Projected { x: number; y: number; z: number; }
interface Rotation { x: number; y: number; z: number; }
interface Point2D { x: number; y: number; }
interface Geometry { vertices: Vec3[]; edges: Edge[]; }

interface Config {
  size: number;
  scale: number;
  displayMode: DisplayMode;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  dualStrokeColor: string;
  dualStrokeWidth: number;
  dualStrokeOpacity: number;
  vertexColor: string;
  vertexRadius: number;
  depthFading: boolean;
  autoRotation: Rotation;
  dragSensitivity: number;
  momentumDamping: number;
  idleResumeDelay: number;
}

interface PolyhedronAPI {
  init: (container: HTMLElement | string, userConfig?: Partial<Config>) => boolean;
  destroy: () => void;
  setConfig: (newConfig: Partial<Config>) => void;
  cycleDisplayMode: () => DisplayMode;
  setDisplayMode: (mode: DisplayMode, showLabel?: boolean) => void;
  readonly config: Config;
}

// =============================================================================
// CONSTANTS (Precomputed for performance)
// =============================================================================

const PHI = 1.6180339887498949; // (1 + √5) / 2
const INV_PHI = 0.6180339887498949;
const PYRAMID_HEIGHT = 0.32;
const DUAL_SCALE = 1.35;
const DRAG_THRESHOLD = 25; // Squared to avoid sqrt
const TWO_PI = Math.PI * 2;

const MODE_LABELS: Record<DisplayMode, string> = {
  inner: 'Triakis Icosahedron',
  outer: 'Truncated Dodecahedron',
  both: 'Triakis Icosahedron & Truncated Dodecahedron'
};

// Precomputed normalized icosahedron vertices
const ICO_VERTICES: Vec3[] = [
  [-0.5257311121, 0.8506508084, 0], [0.5257311121, 0.8506508084, 0],
  [-0.5257311121, -0.8506508084, 0], [0.5257311121, -0.8506508084, 0],
  [0, -0.5257311121, 0.8506508084], [0, 0.5257311121, 0.8506508084],
  [0, -0.5257311121, -0.8506508084], [0, 0.5257311121, -0.8506508084],
  [0.8506508084, 0, -0.5257311121], [0.8506508084, 0, 0.5257311121],
  [-0.8506508084, 0, -0.5257311121], [-0.8506508084, 0, 0.5257311121]
];

const ICO_FACES: [number, number, number][] = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
];



const DEFAULT_CONFIG: Config = {
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

// =============================================================================
// GEOMETRY GENERATION
// =============================================================================

function generateTriakisIcosahedron(): Geometry {
  const vertices: Vec3[] = [...ICO_VERTICES];
  const edges: Edge[] = [];
  const edgeSet = new Set<number>();
  
  const addEdge = (i1: number, i2: number) => {
    const key = i1 < i2 ? (i1 << 16) | i2 : (i2 << 16) | i1;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push([Math.min(i1, i2), Math.max(i1, i2)]);
    }
  };

  for (let f = 0; f < ICO_FACES.length; f++) {
    const [i0, i1, i2] = ICO_FACES[f];
    const v0 = ICO_VERTICES[i0], v1 = ICO_VERTICES[i1], v2 = ICO_VERTICES[i2];
    
    // Centroid and pyramid apex
    const cx = (v0[0] + v1[0] + v2[0]) / 3;
    const cy = (v0[1] + v1[1] + v2[1]) / 3;
    const cz = (v0[2] + v1[2] + v2[2]) / 3;
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
    const s = (1 + PYRAMID_HEIGHT) / len;
    
    const idx = vertices.length;
    vertices.push([cx * s, cy * s, cz * s]);
    
    addEdge(idx, i0); addEdge(idx, i1); addEdge(idx, i2);
    addEdge(i0, i1); addEdge(i1, i2); addEdge(i2, i0);
  }
  
  return { vertices, edges };
}

function generateTruncatedDodecahedron(): Geometry {
  const twoPhi = 2 * PHI, phiPlusOne = PHI + 1, twoPhiPlusOne = 2 + PHI;
  
  const raw: Vec3[] = [
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
  const maxDist = Math.sqrt(maxDistSq);
  const scale = DUAL_SCALE / maxDist;
  
  const vertices: Vec3[] = raw.map(([x, y, z]) => [x * scale, y * scale, z * scale]);
  
  // Compute edges by finding vertices within edge length distance
  const edges: Edge[] = [];
  const edgeLength = 2 * INV_PHI / maxDist * DUAL_SCALE * 1.1;
  const edgeLengthSq = edgeLength * edgeLength;
  
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dx = vertices[i][0] - vertices[j][0];
      const dy = vertices[i][1] - vertices[j][1];
      const dz = vertices[i][2] - vertices[j][2];
      const distSq = dx * dx + dy * dy + dz * dz;
      
      if (distSq < edgeLengthSq) {
        edges.push([i, j]);
      }
    }
  }
  
  return { vertices, edges };
}

// =============================================================================
// 3D MATH (Optimized combined rotation)
// =============================================================================

function rotatePoint(p: Vec3, r: Rotation): Vec3 {
  const cx = Math.cos(r.x), sx = Math.sin(r.x);
  const cy = Math.cos(r.y), sy = Math.sin(r.y);
  const cz = Math.cos(r.z), sz = Math.sin(r.z);
  
  // Combined rotation matrix multiplication
  const y1 = p[1] * cx - p[2] * sx;
  const z1 = p[1] * sx + p[2] * cx;
  const x2 = p[0] * cy + z1 * sy;
  const z2 = -p[0] * sy + z1 * cy;
  
  return [x2 * cz - y1 * sz, x2 * sz + y1 * cz, z2];
}

// =============================================================================
// POLYHEDRON MODULE
// =============================================================================

const Polyhedron: PolyhedronAPI = (function(): PolyhedronAPI {
  const triakis = generateTriakisIcosahedron();
  const dual = generateTruncatedDodecahedron();
  
  let config: Config = { ...DEFAULT_CONFIG };
  let svg: SVGSVGElement | null = null;
  let edgeLines: SVGLineElement[] = [];
  let dualLines: SVGLineElement[] = [];
  let vertexCircles: SVGCircleElement[] = [];
  let containerEl: HTMLElement | null = null;
  let animationId: number | null = null;
  
  // State
  let isDragging = false, wasDragging = false, isAutoRotating = true;
  let lastX = 0, lastY = 0, downX = 0, downY = 0;
  let velX = 0, velY = 0;
  let rotX = 0.5, rotY = 0.3, rotZ = 0;
  let resumeTimer: number | null = null;

  // Projection cache
  const projected: Projected[] = [];
  const dualProjected: Projected[] = [];
  
  function project(p: Vec3): Projected {
    const h = config.size / 2;
    return { x: h + p[0] * config.scale, y: h - p[1] * config.scale, z: p[2] };
  }

  function createSVG(): void {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(config.size));
    svg.setAttribute('height', String(config.size));
    svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
    svg.style.cssText = 'cursor:grab;display:block;overflow:visible';

    const dualGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.append(dualGroup, edgeGroup);

    // Create dual edges
    dualLines = dual.edges.map(() => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', config.dualStrokeColor);
      line.setAttribute('stroke-width', String(config.dualStrokeWidth));
      line.setAttribute('stroke-linecap', 'round');
      dualGroup.appendChild(line);
      return line;
    });

    // Create triakis edges
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
    containerEl!.appendChild(svg);
  }

  function updateDisplayMode(): void {
    const showInner = config.displayMode !== 'outer';
    const showOuter = config.displayMode !== 'inner';
    const innerDisplay = showInner ? '' : 'none';
    const outerDisplay = showOuter ? '' : 'none';
    
    edgeLines.forEach(l => l.style.display = innerDisplay);
    dualLines.forEach(l => l.style.display = outerDisplay);
    vertexCircles.forEach(c => c.style.display = innerDisplay);
  }

  function render(): void {
    const rot: Rotation = { x: rotX, y: rotY, z: rotZ };
    const showInner = config.displayMode !== 'outer';
    const showOuter = config.displayMode !== 'inner';
    const fade = config.depthFading;

    // Project vertices
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

    // Update dual edges
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

    // Update triakis edges
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

      // Update vertices
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

  // Event handlers
  function getPos(e: MouseEvent | TouchEvent): Point2D {
    const src = 'touches' in e ? e.touches[0] : e;
    return { x: src.clientX, y: src.clientY };
  }

  // Track if this was a tap/click (no movement at all)
  let didMove = false;
  
  function onDown(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    const p = getPos(e);
    lastX = downX = p.x;
    lastY = downY = p.y;
    isDragging = true;
    wasDragging = false;
    didMove = false;
    isAutoRotating = false;
    if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
  }

  function onMove(e: MouseEvent | TouchEvent): void {
    if (!isDragging) return;
    e.preventDefault();
    const p = getPos(e);
    const dx = p.x - downX, dy = p.y - downY;
    
    // Mark that movement occurred
    didMove = true;
    
    if (dx * dx + dy * dy > DRAG_THRESHOLD) {
      wasDragging = true;
      isAutoRotating = false;
      if (svg) svg.style.cursor = 'grabbing';
    }

    if (wasDragging) {
      const mx = p.x - lastX, my = p.y - lastY;
      rotY += mx * config.dragSensitivity;
      rotX += my * config.dragSensitivity;
      velX = my * config.dragSensitivity;
      velY = mx * config.dragSensitivity;
    }
    lastX = p.x; lastY = p.y;
  }

  function onUp(e: Event): void {
    if (!isDragging) return;
    isDragging = false;
    if (svg) svg.style.cursor = 'grab';
    
    const isTouchEvent = e.type === 'touchend';
    const wasPureTap = !didMove && !wasDragging;
    
    if (wasDragging) {
      // After dragging, resume auto-rotation after delay
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => { 
        isAutoRotating = true; 
      }, config.idleResumeDelay);
    } else if (wasPureTap && isTouchEvent) {
      // Pure tap on mobile (no movement at all)
      cycleDisplayMode();
      isAutoRotating = true;
    } else if (!isTouchEvent) {
      // Mouse release - let onClick handle if it was a pure click
      // Resume rotation after delay regardless
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => { 
        isAutoRotating = true; 
      }, config.idleResumeDelay);
    } else {
      // Touch with small movement but not a drag - just resume rotation
      isAutoRotating = true;
    }
  }

  function onClick(): void {
    // Only handle click for mouse if no movement occurred
    if (didMove || wasDragging) {
      wasDragging = false;
      didMove = false;
      return;
    }
    
    cycleDisplayMode();
    if (resumeTimer) clearTimeout(resumeTimer);
    isAutoRotating = true;
    wasDragging = false;
    didMove = false;
  }

  function bindEvents(): void {
    if (!svg) return;
    svg.addEventListener('mousedown', onDown as EventListener);
    svg.addEventListener('touchstart', onDown as EventListener, { passive: false });
    window.addEventListener('mousemove', onMove as EventListener);
    window.addEventListener('touchmove', onMove as EventListener, { passive: false });
    window.addEventListener('mouseup', onUp as EventListener);
    window.addEventListener('touchend', onUp as EventListener);
    svg.addEventListener('click', onClick);
  }

  function unbindEvents(): void {
    if (!svg) return;
    svg.removeEventListener('mousedown', onDown as EventListener);
    svg.removeEventListener('touchstart', onDown as EventListener);
    window.removeEventListener('mousemove', onMove as EventListener);
    window.removeEventListener('touchmove', onMove as EventListener);
    window.removeEventListener('mouseup', onUp as EventListener);
    window.removeEventListener('touchend', onUp as EventListener);
    svg.removeEventListener('click', onClick);
  }

  function animate(): void {
    animationId = requestAnimationFrame(animate);
    
    if (isAutoRotating) {
      rotX += config.autoRotation.x;
      rotY += config.autoRotation.y;
      rotZ += config.autoRotation.z;
    } else if (!isDragging) {
      rotX += velX; rotY += velY;
      velX *= config.momentumDamping;
      velY *= config.momentumDamping;
    }
    render();
  }

  function showModeLabel(mode: DisplayMode): void {
    const hint = document.getElementById('polyhedron-hint');
    if (!hint) return;
    
    const tid = hint.dataset.timerId;
    if (tid) clearTimeout(+tid);
    
    hint.style.transition = 'none';
    hint.style.opacity = '1';
    hint.textContent = MODE_LABELS[mode];
    hint.style.display = '';
    hint.offsetHeight; // force reflow
    
    hint.dataset.timerId = String(setTimeout(() => {
      hint.style.transition = 'opacity 0.5s';
      hint.style.opacity = '0';
      setTimeout(() => { hint.style.display = 'none'; }, 500);
    }, 1500));
  }

  // Public API
  function init(container: HTMLElement | string, userConfig: Partial<Config> = {}): boolean {
    containerEl = typeof container === 'string' ? document.querySelector(container) : container;
    if (!containerEl) { console.error('[Polyhedron] Container not found'); return false; }
    
    config = { ...DEFAULT_CONFIG, ...userConfig, 
      autoRotation: { ...DEFAULT_CONFIG.autoRotation, ...(userConfig.autoRotation || {}) }
    };
    
    createSVG();
    bindEvents();
    animate();
    return true;
  }

  function destroy(): void {
    if (animationId) cancelAnimationFrame(animationId);
    if (resumeTimer) clearTimeout(resumeTimer);
    unbindEvents();
    svg?.remove();
    svg = null; edgeLines = []; dualLines = []; vertexCircles = []; containerEl = null;
    isDragging = wasDragging = didMove = false; isAutoRotating = true;
    rotX = 0.5; rotY = 0.3; rotZ = velX = velY = 0;
  }

  function setConfig(nc: Partial<Config>): void {
    config = { ...config, ...nc, autoRotation: { ...config.autoRotation, ...(nc.autoRotation || {}) }};
    if (svg && nc.size !== undefined) {
      svg.setAttribute('width', String(config.size));
      svg.setAttribute('height', String(config.size));
      svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
    }
    if (nc.strokeColor) edgeLines.forEach(l => l.setAttribute('stroke', config.strokeColor));
    if (nc.strokeWidth !== undefined) edgeLines.forEach(l => l.setAttribute('stroke-width', String(config.strokeWidth)));
    if (nc.dualStrokeColor) dualLines.forEach(l => l.setAttribute('stroke', config.dualStrokeColor));
    if (nc.dualStrokeWidth !== undefined) dualLines.forEach(l => l.setAttribute('stroke-width', String(config.dualStrokeWidth)));
    if (nc.displayMode !== undefined) updateDisplayMode();
  }

  function cycleDisplayMode(): DisplayMode {
    const modes: DisplayMode[] = ['inner', 'outer', 'both'];
    config.displayMode = modes[(modes.indexOf(config.displayMode) + 1) % 3];
    updateDisplayMode();
    showModeLabel(config.displayMode);
    return config.displayMode;
  }

  function setDisplayMode(mode: DisplayMode, showLabel = true): void {
    config.displayMode = mode;
    updateDisplayMode();
    if (showLabel) showModeLabel(mode);
  }

  return { init, destroy, setConfig, cycleDisplayMode, setDisplayMode, get config() { return { ...config }; } };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  const c = document.getElementById('polyhedron-container');
  if (c) Polyhedron.init(c);
});

(window as any).Polyhedron = Polyhedron;