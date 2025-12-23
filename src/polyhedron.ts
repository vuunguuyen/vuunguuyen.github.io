/**
 * ============================================================================
 * INTERACTIVE TRIAKIS ICOSAHEDRON COMPONENT (SVG Vector Version)
 * ============================================================================
 * 
 * A 3D wireframe triakis icosahedron (60 faces) rendered as SVG vector graphics.
 * Includes its dual, the truncated dodecahedron, with toggle functionality.
 * 
 * @author Vu Nguyen
 * @version 3.0.0
 * @license MIT
 * ============================================================================
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type DisplayMode = 'inner' | 'outer' | 'both';
type Point3D = [number, number, number];
type Edge = [number, number];

interface Point2D {
  x: number;
  y: number;
}

interface Projected extends Point2D {
  z: number;
}

interface Rotation {
  x: number;
  y: number;
  z: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface AutoRotation {
  x: number;
  y: number;
  z: number;
}

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
  autoRotation: AutoRotation;
  dragSensitivity: number;
  momentumDamping: number;
  idleResumeDelay: number;
}

interface State {
  isDragging: boolean;
  wasDragging: boolean;
  isAutoRotating: boolean;
  lastPointer: Point2D;
  pointerDownPos: Point2D;
  velocity: Velocity;
  rotation: Rotation;
  resumeTimer: number | null;
}

interface Geometry {
  vertices: Point3D[];
  edges: Edge[];
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
// CONSTANTS
// =============================================================================

const PHI: number = (1 + Math.sqrt(5)) / 2;
const PYRAMID_HEIGHT: number = 0.32;
const DUAL_SCALE: number = 1.35;
const DRAG_THRESHOLD: number = 5;

const MODE_LABELS: Record<DisplayMode, string> = {
  inner: 'Triakis Icosahedron',
  outer: 'Truncated Dodecahedron',
  both: 'Triakis Icosahedron & Truncated Dodecahedron'
};

const ICO_VERTICES: Point3D[] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
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
// GEOMETRY FUNCTIONS
// =============================================================================

function normalize(v: Point3D): Point3D {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

function centroid(v0: Point3D, v1: Point3D, v2: Point3D): Point3D {
  return [
    (v0[0] + v1[0] + v2[0]) / 3,
    (v0[1] + v1[1] + v2[1]) / 3,
    (v0[2] + v1[2] + v2[2]) / 3
  ];
}

function generateTriakisIcosahedron(): Geometry {
  const baseVertices: Point3D[] = ICO_VERTICES.map(v => normalize(v));
  const vertices: Point3D[] = [...baseVertices];
  const edges = new Set<string>();

  const addEdge = (i1: number, i2: number): void => {
    const key = i1 < i2 ? `${i1}-${i2}` : `${i2}-${i1}`;
    edges.add(key);
  };

  ICO_FACES.forEach(([i0, i1, i2]) => {
    const v0 = baseVertices[i0];
    const v1 = baseVertices[i1];
    const v2 = baseVertices[i2];

    const center = centroid(v0, v1, v2);
    const normal = normalize(center);
    const pyramidVertex: Point3D = [
      normal[0] * (1 + PYRAMID_HEIGHT),
      normal[1] * (1 + PYRAMID_HEIGHT),
      normal[2] * (1 + PYRAMID_HEIGHT)
    ];

    const newIndex = vertices.length;
    vertices.push(pyramidVertex);

    addEdge(newIndex, i0);
    addEdge(newIndex, i1);
    addEdge(newIndex, i2);
    addEdge(i0, i1);
    addEdge(i1, i2);
    addEdge(i2, i0);
  });

  const edgeArray: Edge[] = Array.from(edges).map(key => {
    const [a, b] = key.split('-').map(Number);
    return [a, b] as Edge;
  });

  return { vertices, edges: edgeArray };
}

function generateTruncatedDodecahedron(): Geometry {
  const vertices: Point3D[] = [];
  const edges = new Set<string>();

  const addEdge = (i1: number, i2: number): void => {
    const key = i1 < i2 ? `${i1}-${i2}` : `${i2}-${i1}`;
    edges.add(key);
  };

  const invPhi = 1 / PHI;
  const twoPhi = 2 * PHI;
  const phiPlusOne = PHI + 1;
  const twoPhiPlusOne = 2 + PHI;

  const coords: Point3D[] = [
    [0, invPhi, twoPhiPlusOne], [0, invPhi, -twoPhiPlusOne],
    [0, -invPhi, twoPhiPlusOne], [0, -invPhi, -twoPhiPlusOne],
    [twoPhiPlusOne, 0, invPhi], [twoPhiPlusOne, 0, -invPhi],
    [-twoPhiPlusOne, 0, invPhi], [-twoPhiPlusOne, 0, -invPhi],
    [invPhi, twoPhiPlusOne, 0], [invPhi, -twoPhiPlusOne, 0],
    [-invPhi, twoPhiPlusOne, 0], [-invPhi, -twoPhiPlusOne, 0],
    [invPhi, PHI, twoPhi], [invPhi, PHI, -twoPhi],
    [invPhi, -PHI, twoPhi], [invPhi, -PHI, -twoPhi],
    [-invPhi, PHI, twoPhi], [-invPhi, PHI, -twoPhi],
    [-invPhi, -PHI, twoPhi], [-invPhi, -PHI, -twoPhi],
    [twoPhi, invPhi, PHI], [twoPhi, invPhi, -PHI],
    [twoPhi, -invPhi, PHI], [twoPhi, -invPhi, -PHI],
    [-twoPhi, invPhi, PHI], [-twoPhi, invPhi, -PHI],
    [-twoPhi, -invPhi, PHI], [-twoPhi, -invPhi, -PHI],
    [PHI, twoPhi, invPhi], [PHI, twoPhi, -invPhi],
    [PHI, -twoPhi, invPhi], [PHI, -twoPhi, -invPhi],
    [-PHI, twoPhi, invPhi], [-PHI, twoPhi, -invPhi],
    [-PHI, -twoPhi, invPhi], [-PHI, -twoPhi, -invPhi],
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

  const maxDist = Math.max(...coords.map(v => 
    Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
  ));

  coords.forEach(v => {
    vertices.push([
      (v[0] / maxDist) * DUAL_SCALE,
      (v[1] / maxDist) * DUAL_SCALE,
      (v[2] / maxDist) * DUAL_SCALE
    ]);
  });

  const edgeLength = 2 * invPhi / maxDist * DUAL_SCALE * 1.1;

  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dx = vertices[i][0] - vertices[j][0];
      const dy = vertices[i][1] - vertices[j][1];
      const dz = vertices[i][2] - vertices[j][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < edgeLength) {
        addEdge(i, j);
      }
    }
  }

  const edgeArray: Edge[] = Array.from(edges).map(key => {
    const [a, b] = key.split('-').map(Number);
    return [a, b] as Edge;
  });

  return { vertices, edges: edgeArray };
}

// =============================================================================
// 3D MATH UTILITIES
// =============================================================================

function rotateX(point: Point3D, angle: number): Point3D {
  const [x, y, z] = point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

function rotateY(point: Point3D, angle: number): Point3D {
  const [x, y, z] = point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

function rotateZ(point: Point3D, angle: number): Point3D {
  const [x, y, z] = point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - y * sin, x * sin + y * cos, z];
}

function rotatePoint(point: Point3D, rotation: Rotation): Point3D {
  let p = rotateX(point, rotation.x);
  p = rotateY(p, rotation.y);
  p = rotateZ(p, rotation.z);
  return p;
}

// =============================================================================
// POLYHEDRON MODULE
// =============================================================================

const Polyhedron: PolyhedronAPI = (function(): PolyhedronAPI {
  // Generate geometry
  const triakis: Geometry = generateTriakisIcosahedron();
  const dual: Geometry = generateTruncatedDodecahedron();

  const VERTICES: Point3D[] = triakis.vertices;
  const EDGES: Edge[] = triakis.edges;
  const DUAL_VERTICES: Point3D[] = dual.vertices;
  const DUAL_EDGES: Edge[] = dual.edges;

  // Private state
  let config: Config = { ...DEFAULT_CONFIG };

  const state: State = {
    isDragging: false,
    wasDragging: false,
    isAutoRotating: true,
    lastPointer: { x: 0, y: 0 },
    pointerDownPos: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    rotation: { x: 0.5, y: 0.3, z: 0 },
    resumeTimer: null
  };

  let svg: SVGSVGElement | null = null;
  let edgeElements: SVGLineElement[] = [];
  let dualEdgeElements: SVGLineElement[] = [];
  let vertexElements: SVGCircleElement[] = [];
  let animationId: number | null = null;
  let containerEl: HTMLElement | null = null;

  // ===========================================================================
  // PROJECTION
  // ===========================================================================

  function project(point: Point3D): Projected {
    const [x, y, z] = point;
    const halfSize = config.size / 2;
    return {
      x: halfSize + x * config.scale,
      y: halfSize - y * config.scale,
      z: z
    };
  }

  // ===========================================================================
  // SVG RENDERING
  // ===========================================================================

  function createSVG(): void {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    svg.setAttribute('width', config.size.toString());
    svg.setAttribute('height', config.size.toString());
    svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
    svg.setAttribute('overflow', 'visible');
    svg.style.cursor = 'grab';
    svg.style.display = 'block';

    const dualEdgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dualEdgeGroup.setAttribute('id', 'polyhedron-dual-edges');
    svg.appendChild(dualEdgeGroup);

    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('id', 'polyhedron-edges');
    svg.appendChild(edgeGroup);

    const initialProjected: Projected[] = VERTICES.map(v => {
      const rotated = rotatePoint(v, state.rotation);
      return project(rotated);
    });

    const initialDualProjected: Projected[] = DUAL_VERTICES.map(v => {
      const rotated = rotatePoint(v, state.rotation);
      return project(rotated);
    });

    dualEdgeElements = DUAL_EDGES.map((edge) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line') as SVGLineElement;
      const [i1, i2] = edge;
      const p1 = initialDualProjected[i1];
      const p2 = initialDualProjected[i2];

      line.setAttribute('x1', p1.x.toString());
      line.setAttribute('y1', p1.y.toString());
      line.setAttribute('x2', p2.x.toString());
      line.setAttribute('y2', p2.y.toString());
      line.setAttribute('stroke', config.dualStrokeColor);
      line.setAttribute('stroke-width', config.dualStrokeWidth.toString());
      line.setAttribute('stroke-opacity', config.dualStrokeOpacity.toString());
      line.setAttribute('stroke-linecap', 'round');
      dualEdgeGroup.appendChild(line);
      return line;
    });

    edgeElements = EDGES.map((edge) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line') as SVGLineElement;
      const [i1, i2] = edge;
      const p1 = initialProjected[i1];
      const p2 = initialProjected[i2];

      line.setAttribute('x1', p1.x.toString());
      line.setAttribute('y1', p1.y.toString());
      line.setAttribute('x2', p2.x.toString());
      line.setAttribute('y2', p2.y.toString());
      line.setAttribute('stroke', config.strokeColor);
      line.setAttribute('stroke-width', config.strokeWidth.toString());
      line.setAttribute('stroke-opacity', config.strokeOpacity.toString());
      line.setAttribute('stroke-linecap', 'round');
      edgeGroup.appendChild(line);
      return line;
    });

    if (config.vertexRadius > 0) {
      const vertexGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      vertexGroup.setAttribute('id', 'polyhedron-vertices');
      svg.appendChild(vertexGroup);

      vertexElements = initialProjected.map((p) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle') as SVGCircleElement;
        circle.setAttribute('cx', p.x.toString());
        circle.setAttribute('cy', p.y.toString());
        circle.setAttribute('r', config.vertexRadius.toString());
        circle.setAttribute('fill', config.vertexColor);
        vertexGroup.appendChild(circle);
        return circle;
      });
    }

    updateDisplayMode();
    containerEl!.appendChild(svg);
  }

  function updateDisplayMode(): void {
    const showInner = config.displayMode === 'inner' || config.displayMode === 'both';
    const showOuter = config.displayMode === 'outer' || config.displayMode === 'both';

    edgeElements.forEach(line => {
      line.style.display = showInner ? '' : 'none';
    });

    dualEdgeElements.forEach(line => {
      line.style.display = showOuter ? '' : 'none';
    });

    vertexElements.forEach(circle => {
      circle.style.display = showInner ? '' : 'none';
    });
  }

  function render(): void {
    const projected: Projected[] = VERTICES.map(v => {
      const rotated = rotatePoint(v, state.rotation);
      return project(rotated);
    });

    const dualProjected: Projected[] = DUAL_VERTICES.map(v => {
      const rotated = rotatePoint(v, state.rotation);
      return project(rotated);
    });

    // Update dual edges
    interface EdgeData {
      index: number;
      p1: Projected;
      p2: Projected;
      avgZ: number;
    }

    const dualEdgeData: EdgeData[] = DUAL_EDGES.map((edge, i) => {
      const [i1, i2] = edge;
      const p1 = dualProjected[i1];
      const p2 = dualProjected[i2];
      const avgZ = (p1.z + p2.z) / 2;
      return { index: i, p1, p2, avgZ };
    });

    dualEdgeData.sort((a, b) => a.avgZ - b.avgZ);

    dualEdgeData.forEach((data) => {
      const line = dualEdgeElements[data.index];
      line.setAttribute('x1', data.p1.x.toString());
      line.setAttribute('y1', data.p1.y.toString());
      line.setAttribute('x2', data.p2.x.toString());
      line.setAttribute('y2', data.p2.y.toString());

      if (config.depthFading) {
        const depthFactor = (data.avgZ + 2) / 4;
        const opacity = (0.15 + depthFactor * 0.85) * config.dualStrokeOpacity;
        line.setAttribute('stroke-opacity', opacity.toString());
      }
    });

    // Update inner edges
    const edgeData: EdgeData[] = EDGES.map((edge, i) => {
      const [i1, i2] = edge;
      const p1 = projected[i1];
      const p2 = projected[i2];
      const avgZ = (p1.z + p2.z) / 2;
      return { index: i, p1, p2, avgZ };
    });

    edgeData.sort((a, b) => a.avgZ - b.avgZ);

    edgeData.forEach((data) => {
      const line = edgeElements[data.index];
      line.setAttribute('x1', data.p1.x.toString());
      line.setAttribute('y1', data.p1.y.toString());
      line.setAttribute('x2', data.p2.x.toString());
      line.setAttribute('y2', data.p2.y.toString());

      if (config.depthFading) {
        const depthFactor = (data.avgZ + 2) / 4;
        const opacity = (0.25 + depthFactor * 0.75) * config.strokeOpacity;
        line.setAttribute('stroke-opacity', opacity.toString());
      }
    });

    // Update vertices
    if (config.vertexRadius > 0 && vertexElements.length > 0) {
      projected.forEach((p, i) => {
        vertexElements[i].setAttribute('cx', p.x.toString());
        vertexElements[i].setAttribute('cy', p.y.toString());

        if (config.depthFading) {
          const depthFactor = (p.z + 2) / 4;
          const opacity = 0.25 + depthFactor * 0.75;
          vertexElements[i].setAttribute('fill-opacity', opacity.toString());
        }
      });
    }
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  function getPointerPosition(e: MouseEvent | TouchEvent): Point2D {
    const source = 'touches' in e ? e.touches[0] : e;
    return { x: source.clientX, y: source.clientY };
  }

  function onPointerDown(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    const pos = getPointerPosition(e);
    state.lastPointer = pos;
    state.pointerDownPos = pos;
    state.isDragging = true;
    state.wasDragging = false;

    if (state.resumeTimer) {
      clearTimeout(state.resumeTimer);
      state.resumeTimer = null;
    }
  }

  function onPointerMove(e: MouseEvent | TouchEvent): void {
    if (!state.isDragging) return;
    e.preventDefault();

    const pointer = getPointerPosition(e);

    const dx = pointer.x - state.pointerDownPos.x;
    const dy = pointer.y - state.pointerDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > DRAG_THRESHOLD) {
      state.wasDragging = true;
      state.isAutoRotating = false;
      if (svg) svg.style.cursor = 'grabbing';
    }

    if (state.wasDragging) {
      const delta = {
        x: pointer.x - state.lastPointer.x,
        y: pointer.y - state.lastPointer.y
      };

      state.rotation.y += delta.x * config.dragSensitivity;
      state.rotation.x += delta.y * config.dragSensitivity;

      state.velocity = {
        x: delta.y * config.dragSensitivity,
        y: delta.x * config.dragSensitivity
      };
    }

    state.lastPointer = pointer;
  }

  function onPointerUp(): void {
    if (!state.isDragging) return;
    state.isDragging = false;
    if (svg) svg.style.cursor = 'grab';

    if (state.wasDragging) {
      state.resumeTimer = window.setTimeout(() => {
        state.isAutoRotating = true;
      }, config.idleResumeDelay);
    }
  }

  function onClickOrTap(): void {
    if (!state.wasDragging) {
      cycleDisplayMode();
    }
    state.wasDragging = false;
  }

  function bindEvents(): void {
    if (!svg) return;

    svg.addEventListener('mousedown', onPointerDown as EventListener);
    window.addEventListener('mousemove', onPointerMove as EventListener);
    window.addEventListener('mouseup', onPointerUp);
    svg.addEventListener('mouseleave', onPointerUp);
    svg.addEventListener('touchstart', onPointerDown as EventListener, { passive: false });
    window.addEventListener('touchmove', onPointerMove as EventListener, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    svg.addEventListener('click', onClickOrTap);
    svg.addEventListener('touchend', onClickOrTap);
  }

  function unbindEvents(): void {
    if (!svg) return;

    svg.removeEventListener('mousedown', onPointerDown as EventListener);
    window.removeEventListener('mousemove', onPointerMove as EventListener);
    window.removeEventListener('mouseup', onPointerUp);
    svg.removeEventListener('mouseleave', onPointerUp);
    svg.removeEventListener('touchstart', onPointerDown as EventListener);
    window.removeEventListener('touchmove', onPointerMove as EventListener);
    window.removeEventListener('touchend', onPointerUp);

    svg.removeEventListener('click', onClickOrTap);
    svg.removeEventListener('touchend', onClickOrTap);
  }

  // ===========================================================================
  // ANIMATION
  // ===========================================================================

  function animate(): void {
    animationId = requestAnimationFrame(animate);

    if (state.isAutoRotating) {
      state.rotation.x += config.autoRotation.x;
      state.rotation.y += config.autoRotation.y;
      state.rotation.z += config.autoRotation.z;
    } else if (!state.isDragging) {
      state.rotation.x += state.velocity.x;
      state.rotation.y += state.velocity.y;
      state.velocity.x *= config.momentumDamping;
      state.velocity.y *= config.momentumDamping;
    }

    render();
  }

  // ===========================================================================
  // MODE LABEL
  // ===========================================================================

  function showModeLabel(mode: DisplayMode): void {
    const hint = document.getElementById('polyhedron-hint');
    if (!hint) return;

    const existingTimerId = hint.dataset.timerId;
    if (existingTimerId) {
      clearTimeout(parseInt(existingTimerId));
    }

    hint.style.transition = 'none';
    hint.style.opacity = '1';
    hint.textContent = MODE_LABELS[mode];
    hint.style.display = '';

    // Force reflow
    hint.offsetHeight;

    const timerId = window.setTimeout(() => {
      hint.style.transition = 'opacity 0.5s ease';
      hint.style.opacity = '0';

      setTimeout(() => {
        hint.style.display = 'none';
      }, 500);
    }, 1500);

    hint.dataset.timerId = timerId.toString();
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  function init(container: HTMLElement | string, userConfig: Partial<Config> = {}): boolean {
    if (typeof container === 'string') {
      containerEl = document.querySelector(container);
    } else {
      containerEl = container;
    }

    if (!containerEl) {
      console.error('[Polyhedron] Container element not found');
      return false;
    }

    config = {
      ...DEFAULT_CONFIG,
      ...userConfig,
      autoRotation: {
        ...DEFAULT_CONFIG.autoRotation,
        ...(userConfig.autoRotation || {})
      }
    };

    createSVG();
    bindEvents();
    animate();

    return true;
  }

  function destroy(): void {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    if (state.resumeTimer) {
      clearTimeout(state.resumeTimer);
      state.resumeTimer = null;
    }

    unbindEvents();

    if (svg && svg.parentNode) {
      svg.parentNode.removeChild(svg);
    }

    svg = null;
    edgeElements = [];
    dualEdgeElements = [];
    vertexElements = [];
    containerEl = null;

    state.isDragging = false;
    state.wasDragging = false;
    state.isAutoRotating = true;
    state.rotation = { x: 0.5, y: 0.3, z: 0 };
    state.velocity = { x: 0, y: 0 };
  }

  function setConfig(newConfig: Partial<Config>): void {
    config = {
      ...config,
      ...newConfig,
      autoRotation: {
        ...config.autoRotation,
        ...(newConfig.autoRotation || {})
      }
    };

    if (svg) {
      if (newConfig.size !== undefined) {
        svg.setAttribute('width', config.size.toString());
        svg.setAttribute('height', config.size.toString());
        svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
      }
    }

    edgeElements.forEach(line => {
      if (newConfig.strokeColor) line.setAttribute('stroke', config.strokeColor);
      if (newConfig.strokeWidth !== undefined) line.setAttribute('stroke-width', config.strokeWidth.toString());
    });

    dualEdgeElements.forEach(line => {
      if (newConfig.dualStrokeColor) line.setAttribute('stroke', config.dualStrokeColor);
      if (newConfig.dualStrokeWidth !== undefined) line.setAttribute('stroke-width', config.dualStrokeWidth.toString());
    });

    vertexElements.forEach(circle => {
      if (newConfig.vertexColor) circle.setAttribute('fill', config.vertexColor);
      if (newConfig.vertexRadius !== undefined) circle.setAttribute('r', config.vertexRadius.toString());
    });

    if (newConfig.displayMode !== undefined) {
      updateDisplayMode();
    }
  }

  function cycleDisplayMode(): DisplayMode {
    const modes: DisplayMode[] = ['inner', 'outer', 'both'];
    const currentIndex = modes.indexOf(config.displayMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    config.displayMode = modes[nextIndex];
    updateDisplayMode();
    showModeLabel(config.displayMode);
    return config.displayMode;
  }

  function setDisplayMode(mode: DisplayMode, showLabel: boolean = true): void {
    config.displayMode = mode;
    updateDisplayMode();
    if (showLabel) showModeLabel(mode);
  }

  return {
    init,
    destroy,
    setConfig,
    cycleDisplayMode,
    setDisplayMode,
    get config(): Config { return { ...config }; }
  };
})();

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('polyhedron-container');
  if (container) {
    Polyhedron.init(container);
  }
});

// Expose globally for browser usage
(window as any).Polyhedron = Polyhedron;