/**
 * ============================================================================
 * INTERACTIVE TRIAKIS ICOSAHEDRON COMPONENT (SVG Vector Version)
 * ============================================================================
 * 
 * A 3D wireframe triakis icosahedron (60 faces) rendered as SVG vector graphics.
 * No WebGL required - pure SVG for crisp rendering at any resolution.
 * 
 * The triakis icosahedron is formed by adding a triangular pyramid to each
 * face of an icosahedron, resulting in 60 triangular faces, 32 vertices,
 * and 90 edges.
 * 
 * Features:
 *   - Resolution-independent vector rendering
 *   - Omnidirectional auto-rotation
 *   - Click-and-drag manual rotation
 *   - Momentum physics on release
 *   - Touch device support
 *   - Depth-sorted edges with opacity fading
 * 
 * Dependencies:
 *   - None! Pure vanilla JavaScript
 * 
 * @author Vu Nguyen
 * @version 3.0.0
 * @license MIT
 * ============================================================================
 */

const Polyhedron = (function() {
  'use strict';

  /* ===========================================================================
     DEFAULT CONFIGURATION
     =========================================================================== */
  const DEFAULT_CONFIG = {
    // ----- Dimensions -----
    size: 280,                    // SVG viewport size
    scale: 85,                    // Scale factor for the polyhedra

    // ----- Display Mode -----
    // 'inner' = triakis icosahedron only
    // 'outer' = truncated dodecahedron only  
    // 'both' = both shapes
    displayMode: 'inner',

    // ----- Appearance -----
    strokeColor: '#57068c',       // Inner edge color (NYU purple)
    strokeWidth: 1,               // Inner edge thickness
    strokeOpacity: 0.9,           // Inner edge opacity (0-1)
    dualStrokeColor: '#57068c',   // Dual edge color
    dualStrokeWidth: 0.5,         // Dual edge thickness (thinner)
    dualStrokeOpacity: 0.4,       // Dual edge opacity (more transparent)
    vertexColor: '#57068c',       // Vertex dot color
    vertexRadius: 0,              // Vertex dot size (0 to disable)
    depthFading: true,            // Fade edges based on depth

    // ----- Auto-rotation -----
    autoRotation: { 
      x: 0.006, 
      y: 0.010, 
      z: 0.004 
    },

    // ----- Interaction Physics -----
    dragSensitivity: 0.008,
    momentumDamping: 0.95,
    idleResumeDelay: 3000
  };

  /* ===========================================================================
     TRIAKIS ICOSAHEDRON GEOMETRY
     32 vertices, 90 edges, 60 triangular faces
     =========================================================================== */
  
  const PHI = (1 + Math.sqrt(5)) / 2;
  
  /**
   * Height of pyramids added to each icosahedron face
   * This value creates the characteristic triakis shape
   */
  const PYRAMID_HEIGHT = 0.32;

  /**
   * Scale factor for the dual (truncated dodecahedron)
   * Adjusts how far out the dual sits relative to the inner shape
   */
  const DUAL_SCALE = 1.35;

  /**
   * Base icosahedron vertices (12 vertices)
   */
  const ICO_VERTICES = [
    [-1,  PHI,  0], [ 1,  PHI,  0], [-1, -PHI,  0], [ 1, -PHI,  0],
    [ 0, -1,  PHI], [ 0,  1,  PHI], [ 0, -1, -PHI], [ 0,  1, -PHI],
    [ PHI,  0, -1], [ PHI,  0,  1], [-PHI,  0, -1], [-PHI,  0,  1]
  ];

  /**
   * Icosahedron faces (20 triangular faces)
   * Each array contains 3 vertex indices
   */
  const ICO_FACES = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  /**
   * Normalizes a vector to unit length
   */
  function normalize(v) {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return [v[0]/len, v[1]/len, v[2]/len];
  }

  /**
   * Calculates the centroid (center point) of a triangle
   */
  function centroid(v0, v1, v2) {
    return [
      (v0[0] + v1[0] + v2[0]) / 3,
      (v0[1] + v1[1] + v2[1]) / 3,
      (v0[2] + v1[2] + v2[2]) / 3
    ];
  }

  /**
   * Generates triakis icosahedron geometry by adding pyramids to each face
   * Returns { vertices, edges }
   */
  function generateTriakisIcosahedron() {
    // Normalize base icosahedron vertices to unit sphere
    const baseVertices = ICO_VERTICES.map(v => normalize(v));
    
    // Start with base vertices
    const vertices = [...baseVertices];
    const edges = new Set();
    
    // Helper to add edge (avoiding duplicates)
    function addEdge(i1, i2) {
      const key = i1 < i2 ? `${i1}-${i2}` : `${i2}-${i1}`;
      edges.add(key);
    }

    // Add pyramid vertex for each face
    ICO_FACES.forEach((face) => {
      const [i0, i1, i2] = face;
      const v0 = baseVertices[i0];
      const v1 = baseVertices[i1];
      const v2 = baseVertices[i2];

      // Calculate face center and push it outward
      const center = centroid(v0, v1, v2);
      const normal = normalize(center);
      const pyramidVertex = [
        normal[0] * (1 + PYRAMID_HEIGHT),
        normal[1] * (1 + PYRAMID_HEIGHT),
        normal[2] * (1 + PYRAMID_HEIGHT)
      ];

      // Add new vertex
      const newIndex = vertices.length;
      vertices.push(pyramidVertex);

      // Add edges from pyramid apex to each corner of the original face
      addEdge(newIndex, i0);
      addEdge(newIndex, i1);
      addEdge(newIndex, i2);

      // Add edges along the original face (base of pyramid)
      addEdge(i0, i1);
      addEdge(i1, i2);
      addEdge(i2, i0);
    });

    // Convert edge set to array of pairs
    const edgeArray = Array.from(edges).map(key => {
      const [a, b] = key.split('-').map(Number);
      return [a, b];
    });

    return { vertices, edges: edgeArray };
  }

  /**
   * Generates truncated dodecahedron (dual of triakis icosahedron)
   * 32 faces (12 decagons + 20 triangles), 60 vertices, 90 edges
   * Returns { vertices, edges }
   */
  function generateTruncatedDodecahedron() {
    const vertices = [];
    const edges = new Set();
    
    function addEdge(i1, i2) {
      const key = i1 < i2 ? `${i1}-${i2}` : `${i2}-${i1}`;
      edges.add(key);
    }

    // Truncated dodecahedron vertices using golden ratio
    // Even permutations of (0, ±1/φ, ±(2+φ))
    // Even permutations of (±1/φ, ±φ, ±2φ)
    // Even permutations of (±φ, ±2, ±(φ+1))
    
    const phi = PHI;
    const invPhi = 1 / PHI;
    const twoPhi = 2 * PHI;
    const phiPlusOne = PHI + 1;
    const twoPhiPlusOne = 2 + PHI;

    // Vertex coordinates for truncated dodecahedron
    const coords = [
      // (0, ±1/φ, ±(2+φ)) and cyclic permutations
      [0, invPhi, twoPhiPlusOne], [0, invPhi, -twoPhiPlusOne],
      [0, -invPhi, twoPhiPlusOne], [0, -invPhi, -twoPhiPlusOne],
      [twoPhiPlusOne, 0, invPhi], [twoPhiPlusOne, 0, -invPhi],
      [-twoPhiPlusOne, 0, invPhi], [-twoPhiPlusOne, 0, -invPhi],
      [invPhi, twoPhiPlusOne, 0], [invPhi, -twoPhiPlusOne, 0],
      [-invPhi, twoPhiPlusOne, 0], [-invPhi, -twoPhiPlusOne, 0],
      
      // (±1/φ, ±φ, ±2φ) and cyclic permutations
      [invPhi, phi, twoPhi], [invPhi, phi, -twoPhi],
      [invPhi, -phi, twoPhi], [invPhi, -phi, -twoPhi],
      [-invPhi, phi, twoPhi], [-invPhi, phi, -twoPhi],
      [-invPhi, -phi, twoPhi], [-invPhi, -phi, -twoPhi],
      [twoPhi, invPhi, phi], [twoPhi, invPhi, -phi],
      [twoPhi, -invPhi, phi], [twoPhi, -invPhi, -phi],
      [-twoPhi, invPhi, phi], [-twoPhi, invPhi, -phi],
      [-twoPhi, -invPhi, phi], [-twoPhi, -invPhi, -phi],
      [phi, twoPhi, invPhi], [phi, twoPhi, -invPhi],
      [phi, -twoPhi, invPhi], [phi, -twoPhi, -invPhi],
      [-phi, twoPhi, invPhi], [-phi, twoPhi, -invPhi],
      [-phi, -twoPhi, invPhi], [-phi, -twoPhi, -invPhi],
      
      // (±φ, ±2, ±(φ+1)) and cyclic permutations
      [phi, 2, phiPlusOne], [phi, 2, -phiPlusOne],
      [phi, -2, phiPlusOne], [phi, -2, -phiPlusOne],
      [-phi, 2, phiPlusOne], [-phi, 2, -phiPlusOne],
      [-phi, -2, phiPlusOne], [-phi, -2, -phiPlusOne],
      [phiPlusOne, phi, 2], [phiPlusOne, phi, -2],
      [phiPlusOne, -phi, 2], [phiPlusOne, -phi, -2],
      [-phiPlusOne, phi, 2], [-phiPlusOne, phi, -2],
      [-phiPlusOne, -phi, 2], [-phiPlusOne, -phi, -2],
      [2, phiPlusOne, phi], [2, phiPlusOne, -phi],
      [2, -phiPlusOne, phi], [2, -phiPlusOne, -phi],
      [-2, phiPlusOne, phi], [-2, phiPlusOne, -phi],
      [-2, -phiPlusOne, phi], [-2, -phiPlusOne, -phi]
    ];

    // Normalize and scale vertices
    const maxDist = Math.max(...coords.map(v => Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2])));
    coords.forEach(v => {
      const scaled = [
        (v[0] / maxDist) * DUAL_SCALE,
        (v[1] / maxDist) * DUAL_SCALE,
        (v[2] / maxDist) * DUAL_SCALE
      ];
      vertices.push(scaled);
    });

    // Find edges by connecting nearby vertices
    const edgeLength = 2 * invPhi / maxDist * DUAL_SCALE * 1.1;
    
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const dx = vertices[i][0] - vertices[j][0];
        const dy = vertices[i][1] - vertices[j][1];
        const dz = vertices[i][2] - vertices[j][2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (dist < edgeLength) {
          addEdge(i, j);
        }
      }
    }

    const edgeArray = Array.from(edges).map(key => {
      const [a, b] = key.split('-').map(Number);
      return [a, b];
    });

    return { vertices, edges: edgeArray };
  }

  // Generate both geometries
  const triakis = generateTriakisIcosahedron();
  const dual = generateTruncatedDodecahedron();
  
  const VERTICES = triakis.vertices;
  const EDGES = triakis.edges;
  const DUAL_VERTICES = dual.vertices;
  const DUAL_EDGES = dual.edges;

  /* ===========================================================================
     PRIVATE VARIABLES
     =========================================================================== */
  
  let config = { ...DEFAULT_CONFIG };
  
  const state = {
    isDragging: false,
    isAutoRotating: true,
    lastPointer: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    rotation: { x: 0.5, y: 0.3, z: 0 },  // Start with slight rotation
    resumeTimer: null
  };

  let svg = null;
  let edgeElements = [];
  let dualEdgeElements = [];
  let vertexElements = [];
  let animationId = null;
  let containerEl = null;

  /* ===========================================================================
     3D MATH UTILITIES
     =========================================================================== */

  function rotateX(point, angle) {
    const [x, y, z] = point;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [x, y * cos - z * sin, y * sin + z * cos];
  }

  function rotateY(point, angle) {
    const [x, y, z] = point;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [x * cos + z * sin, y, -x * sin + z * cos];
  }

  function rotateZ(point, angle) {
    const [x, y, z] = point;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [x * cos - y * sin, x * sin + y * cos, z];
  }

  function rotatePoint(point, rotation) {
    let p = rotateX(point, rotation.x);
    p = rotateY(p, rotation.y);
    p = rotateZ(p, rotation.z);
    return p;
  }

  function project(point) {
    const [x, y, z] = point;
    const halfSize = config.size / 2;
    return {
      x: halfSize + x * config.scale,
      y: halfSize - y * config.scale,
      z: z
    };
  }

  /* ===========================================================================
     SVG RENDERING
     =========================================================================== */

  function createSVG() {
    // Create SVG element with overflow visible
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', config.size);
    svg.setAttribute('height', config.size);
    svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
    svg.setAttribute('overflow', 'visible');
    svg.style.cursor = 'grab';
    svg.style.display = 'block';

    // Create dual edge group (rendered first, behind inner shape)
    const dualEdgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dualEdgeGroup.setAttribute('id', 'polyhedron-dual-edges');
    svg.appendChild(dualEdgeGroup);

    // Create inner edge group
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('id', 'polyhedron-edges');
    svg.appendChild(edgeGroup);

    // Create initial projections
    const initialProjected = VERTICES.map(v => {
      const rotated = rotatePoint(v, state.rotation);
      return project(rotated);
    });

    const initialDualProjected = DUAL_VERTICES.map(v => {
      const rotated = rotatePoint(v, state.rotation);
      return project(rotated);
    });

    // Create dual edge elements
    dualEdgeElements = DUAL_EDGES.map((edge, i) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const [i1, i2] = edge;
      const p1 = initialDualProjected[i1];
      const p2 = initialDualProjected[i2];
      
      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);
      line.setAttribute('stroke', config.dualStrokeColor);
      line.setAttribute('stroke-width', config.dualStrokeWidth);
      line.setAttribute('stroke-opacity', config.dualStrokeOpacity);
      line.setAttribute('stroke-linecap', 'round');
      dualEdgeGroup.appendChild(line);
      return line;
    });

    // Create inner edge elements
    edgeElements = EDGES.map((edge, i) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const [i1, i2] = edge;
      const p1 = initialProjected[i1];
      const p2 = initialProjected[i2];
      
      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);
      line.setAttribute('stroke', config.strokeColor);
      line.setAttribute('stroke-width', config.strokeWidth);
      line.setAttribute('stroke-opacity', config.strokeOpacity);
      line.setAttribute('stroke-linecap', 'round');
      edgeGroup.appendChild(line);
      return line;
    });

    // Create vertex group
    if (config.vertexRadius > 0) {
      const vertexGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      vertexGroup.setAttribute('id', 'polyhedron-vertices');
      svg.appendChild(vertexGroup);

      vertexElements = initialProjected.map((p, i) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', p.x);
        circle.setAttribute('cy', p.y);
        circle.setAttribute('r', config.vertexRadius);
        circle.setAttribute('fill', config.vertexColor);
        vertexGroup.appendChild(circle);
        return circle;
      });
    }

    // Apply initial display mode
    updateDisplayMode();

    containerEl.appendChild(svg);
  }

  /**
   * Updates visibility of shapes based on display mode
   */
  function updateDisplayMode() {
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

  function render() {
    // Transform all vertices for inner shape
    const projected = VERTICES.map(v => {
      const rotated = rotatePoint(v, state.rotation);
      return project(rotated);
    });

    // Transform all vertices for dual shape
    const dualProjected = DUAL_VERTICES.map(v => {
      const rotated = rotatePoint(v, state.rotation);
      return project(rotated);
    });

    // Update dual edges with depth sorting
    const dualEdgeData = DUAL_EDGES.map((edge, i) => {
      const [i1, i2] = edge;
      const p1 = dualProjected[i1];
      const p2 = dualProjected[i2];
      const avgZ = (p1.z + p2.z) / 2;
      return { index: i, p1, p2, avgZ };
    });

    dualEdgeData.sort((a, b) => a.avgZ - b.avgZ);

    dualEdgeData.forEach((data) => {
      const line = dualEdgeElements[data.index];
      line.setAttribute('x1', data.p1.x);
      line.setAttribute('y1', data.p1.y);
      line.setAttribute('x2', data.p2.x);
      line.setAttribute('y2', data.p2.y);

      if (config.depthFading) {
        const depthFactor = (data.avgZ + 2) / 4;
        const opacity = (0.15 + depthFactor * 0.85) * config.dualStrokeOpacity;
        line.setAttribute('stroke-opacity', opacity);
      }
    });

    // Update inner edges with depth sorting
    const edgeData = EDGES.map((edge, i) => {
      const [i1, i2] = edge;
      const p1 = projected[i1];
      const p2 = projected[i2];
      const avgZ = (p1.z + p2.z) / 2;
      return { index: i, p1, p2, avgZ };
    });

    edgeData.sort((a, b) => a.avgZ - b.avgZ);

    edgeData.forEach((data) => {
      const line = edgeElements[data.index];
      line.setAttribute('x1', data.p1.x);
      line.setAttribute('y1', data.p1.y);
      line.setAttribute('x2', data.p2.x);
      line.setAttribute('y2', data.p2.y);

      if (config.depthFading) {
        const depthFactor = (data.avgZ + 2) / 4;
        const opacity = (0.25 + depthFactor * 0.75) * config.strokeOpacity;
        line.setAttribute('stroke-opacity', opacity);
      }
    });

    // Update vertices
    if (config.vertexRadius > 0 && vertexElements.length > 0) {
      projected.forEach((p, i) => {
        vertexElements[i].setAttribute('cx', p.x);
        vertexElements[i].setAttribute('cy', p.y);
        
        if (config.depthFading) {
          const depthFactor = (p.z + 2) / 4;
          const opacity = 0.25 + depthFactor * 0.75;
          vertexElements[i].setAttribute('fill-opacity', opacity);
        }
      });
    }
  }

  /* ===========================================================================
     EVENT HANDLERS
     =========================================================================== */

  function getPointerPosition(e) {
    const source = e.touches ? e.touches[0] : e;
    return { x: source.clientX, y: source.clientY };
  }

  /**
   * Minimum distance (pixels) to consider a drag vs a click
   */
  const DRAG_THRESHOLD = 5;

  function onPointerDown(e) {
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

  function onPointerMove(e) {
    if (!state.isDragging) return;
    e.preventDefault();

    const pointer = getPointerPosition(e);
    
    // Check if we've moved enough to be considered a drag
    const dx = pointer.x - state.pointerDownPos.x;
    const dy = pointer.y - state.pointerDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > DRAG_THRESHOLD) {
      state.wasDragging = true;
      state.isAutoRotating = false;
      svg.style.cursor = 'grabbing';
    }
    
    // Only apply rotation if actually dragging
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

  function onPointerUp() {
    if (!state.isDragging) return;
    state.isDragging = false;
    svg.style.cursor = 'grab';

    // Only schedule auto-rotate resume if we were actually dragging
    if (state.wasDragging) {
      state.resumeTimer = setTimeout(() => {
        state.isAutoRotating = true;
      }, config.idleResumeDelay);
    }
  }

  function bindEvents() {
    svg.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    svg.addEventListener('mouseleave', onPointerUp);
    svg.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    
    // Click to cycle display mode (only if not dragging)
    svg.addEventListener('click', function(e) {
      if (!state.wasDragging) {
        cycleDisplayMode();
      }
      state.wasDragging = false;
    });
  }

  function unbindEvents() {
    if (!svg) return;
    svg.removeEventListener('mousedown', onPointerDown);
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    svg.removeEventListener('mouseleave', onPointerUp);
    svg.removeEventListener('touchstart', onPointerDown);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);
  }

  /* ===========================================================================
     ANIMATION LOOP
     =========================================================================== */

  function animate() {
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

  /* ===========================================================================
     PUBLIC API
     =========================================================================== */

  function init(container, userConfig = {}) {
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

  function destroy() {
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
    state.isAutoRotating = true;
    state.rotation = { x: 0.5, y: 0.3, z: 0 };
    state.velocity = { x: 0, y: 0 };
  }

  function setConfig(newConfig) {
    config = {
      ...config,
      ...newConfig,
      autoRotation: {
        ...config.autoRotation,
        ...(newConfig.autoRotation || {})
      }
    };

    if (svg) {
      if (newConfig.size) {
        svg.setAttribute('width', config.size);
        svg.setAttribute('height', config.size);
        svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
      }
    }

    edgeElements.forEach(line => {
      if (newConfig.strokeColor) line.setAttribute('stroke', config.strokeColor);
      if (newConfig.strokeWidth) line.setAttribute('stroke-width', config.strokeWidth);
    });

    dualEdgeElements.forEach(line => {
      if (newConfig.dualStrokeColor) line.setAttribute('stroke', config.dualStrokeColor);
      if (newConfig.dualStrokeWidth) line.setAttribute('stroke-width', config.dualStrokeWidth);
    });

    vertexElements.forEach(circle => {
      if (newConfig.vertexColor) circle.setAttribute('fill', config.vertexColor);
      if (newConfig.vertexRadius !== undefined) circle.setAttribute('r', config.vertexRadius);
    });

    // Update display mode if changed
    if (newConfig.displayMode !== undefined) {
      updateDisplayMode();
    }
  }

  /**
   * Display mode labels for UI feedback
   */
  const MODE_LABELS = {
    inner: 'Triakis Icosahedron',
    outer: 'Truncated Dodecahedron',
    both: 'Dual Pair'
  };

  /**
   * Shows the shape name in the hint text, then fades it out
   * @param {string} mode - The current display mode
   */
  function showModeLabel(mode) {
    const hint = document.getElementById('polyhedron-hint');
    if (!hint) return;

    // Clear any existing timer
    if (hint.dataset.timerId) {
      clearTimeout(parseInt(hint.dataset.timerId));
    }

    // Reset opacity and show mode label
    hint.style.transition = 'none';
    hint.style.opacity = '1';
    hint.textContent = MODE_LABELS[mode];
    hint.style.display = '';

    // Force reflow to reset transition
    hint.offsetHeight;

    // Fade out after 2 seconds
    const timerId = setTimeout(() => {
      hint.style.transition = 'opacity 0.5s ease';
      hint.style.opacity = '0';
      
      // Hide completely after fade
      setTimeout(() => {
        hint.style.display = 'none';
      }, 500);
    }, 2000);

    hint.dataset.timerId = timerId.toString();
  }

  /**
   * Cycles through display modes: inner → outer → both → inner...
   * @returns {string} The new display mode
   */
  function cycleDisplayMode() {
    const modes = ['inner', 'outer', 'both'];
    const currentIndex = modes.indexOf(config.displayMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    config.displayMode = modes[nextIndex];
    updateDisplayMode();
    showModeLabel(config.displayMode);
    return config.displayMode;
  }

  /**
   * Sets the display mode directly
   * @param {string} mode - 'inner', 'outer', or 'both'
   * @param {boolean} showLabel - Whether to show the mode label (default: true)
   */
  function setDisplayMode(mode, showLabel = true) {
    if (['inner', 'outer', 'both'].includes(mode)) {
      config.displayMode = mode;
      updateDisplayMode();
      if (showLabel) showModeLabel(mode);
    }
  }

  return {
    init,
    destroy,
    setConfig,
    cycleDisplayMode,
    setDisplayMode,
    get config() { return { ...config }; }
  };

})();

/* ===========================================================================
   AUTO-INITIALIZATION
   =========================================================================== */
document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('polyhedron-container');
  if (container) {
    Polyhedron.init(container);
  }
});