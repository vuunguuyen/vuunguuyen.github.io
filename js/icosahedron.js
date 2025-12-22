/**
 * ============================================================================
 * INTERACTIVE ICOSAHEDRON COMPONENT (SVG Vector Version)
 * ============================================================================
 * 
 * A 3D wireframe icosahedron rendered as SVG vector graphics.
 * No WebGL required - pure SVG for crisp rendering at any resolution.
 * 
 * Features:
 *   - Resolution-independent vector rendering
 *   - Omnidirectional auto-rotation
 *   - Click-and-drag manual rotation
 *   - Momentum physics on release
 *   - Touch device support
 *   - Auto-resume rotation after idle
 *   - Depth-sorted edges for proper occlusion
 * 
 * Dependencies:
 *   - None! Pure vanilla JavaScript
 * 
 * Usage:
 *   1. Include this script in your HTML
 *   2. Add a container element with id="icosahedron-container"
 *   3. Component auto-initializes on DOMContentLoaded
 * 
 * @author Vu Nguyen
 * @version 2.0.0
 * @license MIT
 * ============================================================================
 */

const Icosahedron = (function() {
  'use strict';

  /* ===========================================================================
     DEFAULT CONFIGURATION
     =========================================================================== */
  const DEFAULT_CONFIG = {
    // ----- Dimensions -----
    size: 200,                    // SVG viewport size in pixels
    scale: 70,                    // Scale factor for the icosahedron

    // ----- Appearance -----
    strokeColor: '#57068c',       // Edge color (NYU purple)
    strokeWidth: 1.5,             // Edge thickness
    strokeOpacity: 0.9,           // Edge opacity (0-1)
    vertexColor: '#57068c',       // Vertex dot color
    vertexRadius: 2,              // Vertex dot size (0 to disable)
    depthFading: true,            // Fade edges based on depth

    // ----- Auto-rotation -----
    autoRotation: { 
      x: 0.008, 
      y: 0.012, 
      z: 0.005 
    },

    // ----- Interaction Physics -----
    dragSensitivity: 0.01,
    momentumDamping: 0.95,
    idleResumeDelay: 3000
  };

  /* ===========================================================================
     ICOSAHEDRON GEOMETRY
     Vertices and edges defining the icosahedron shape
     =========================================================================== */
  
  /**
   * Golden ratio - fundamental to icosahedron geometry
   * @constant {number}
   */
  const PHI = (1 + Math.sqrt(5)) / 2;

  /**
   * Icosahedron vertices (12 vertices)
   * Normalized coordinates based on golden ratio rectangles
   * @constant {number[][]}
   */
  const VERTICES = [
    [-1,  PHI,  0], [ 1,  PHI,  0], [-1, -PHI,  0], [ 1, -PHI,  0],
    [ 0, -1,  PHI], [ 0,  1,  PHI], [ 0, -1, -PHI], [ 0,  1, -PHI],
    [ PHI,  0, -1], [ PHI,  0,  1], [-PHI,  0, -1], [-PHI,  0,  1]
  ];

  /**
   * Icosahedron edges (30 edges)
   * Each pair represents vertex indices forming an edge
   * @constant {number[][]}
   */
  const EDGES = [
    [0, 1], [0, 5], [0, 7], [0, 10], [0, 11],
    [1, 5], [1, 7], [1, 8], [1, 9],
    [2, 3], [2, 4], [2, 6], [2, 10], [2, 11],
    [3, 4], [3, 6], [3, 8], [3, 9],
    [4, 5], [4, 9], [4, 11],
    [5, 9], [5, 11],
    [6, 7], [6, 8], [6, 10],
    [7, 8], [7, 10],
    [8, 9],
    [10, 11]
  ];

  /* ===========================================================================
     PRIVATE VARIABLES
     =========================================================================== */
  
  let config = { ...DEFAULT_CONFIG };
  
  const state = {
    isDragging: false,
    isAutoRotating: true,
    lastPointer: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    resumeTimer: null
  };

  let svg = null;
  let edgeElements = [];
  let vertexElements = [];
  let animationId = null;
  let containerEl = null;

  /* ===========================================================================
     3D MATH UTILITIES
     =========================================================================== */

  /**
   * Rotates a 3D point around the X axis
   * @param {number[]} point - [x, y, z] coordinates
   * @param {number} angle - Rotation angle in radians
   * @returns {number[]} Rotated point
   */
  function rotateX(point, angle) {
    const [x, y, z] = point;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      x,
      y * cos - z * sin,
      y * sin + z * cos
    ];
  }

  /**
   * Rotates a 3D point around the Y axis
   * @param {number[]} point - [x, y, z] coordinates
   * @param {number} angle - Rotation angle in radians
   * @returns {number[]} Rotated point
   */
  function rotateY(point, angle) {
    const [x, y, z] = point;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      x * cos + z * sin,
      y,
      -x * sin + z * cos
    ];
  }

  /**
   * Rotates a 3D point around the Z axis
   * @param {number[]} point - [x, y, z] coordinates
   * @param {number} angle - Rotation angle in radians
   * @returns {number[]} Rotated point
   */
  function rotateZ(point, angle) {
    const [x, y, z] = point;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      x * cos - y * sin,
      x * sin + y * cos,
      z
    ];
  }

  /**
   * Applies all three rotations to a point
   * @param {number[]} point - [x, y, z] coordinates
   * @param {Object} rotation - {x, y, z} rotation angles
   * @returns {number[]} Fully rotated point
   */
  function rotatePoint(point, rotation) {
    let p = rotateX(point, rotation.x);
    p = rotateY(p, rotation.y);
    p = rotateZ(p, rotation.z);
    return p;
  }

  /**
   * Projects a 3D point to 2D screen coordinates
   * Uses simple orthographic projection centered in viewport
   * @param {number[]} point - [x, y, z] coordinates
   * @returns {{x: number, y: number, z: number}} Screen coordinates + depth
   */
  function project(point) {
    const [x, y, z] = point;
    const halfSize = config.size / 2;
    return {
      x: halfSize + x * config.scale,
      y: halfSize - y * config.scale,  // Invert Y for screen coordinates
      z: z  // Preserve Z for depth sorting
    };
  }

  /* ===========================================================================
     SVG RENDERING
     =========================================================================== */

  /**
   * Creates the SVG element and initializes all edge/vertex elements
   */
  function createSVG() {
    // Create SVG element
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', config.size);
    svg.setAttribute('height', config.size);
    svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
    svg.style.cursor = 'grab';

    // Create a group for edges (rendered first, behind vertices)
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('id', 'edges');
    svg.appendChild(edgeGroup);

    // Create edge elements
    edgeElements = EDGES.map(() => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', config.strokeColor);
      line.setAttribute('stroke-width', config.strokeWidth);
      line.setAttribute('stroke-linecap', 'round');
      edgeGroup.appendChild(line);
      return line;
    });

    // Create vertex elements (if radius > 0)
    if (config.vertexRadius > 0) {
      const vertexGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      vertexGroup.setAttribute('id', 'vertices');
      svg.appendChild(vertexGroup);

      vertexElements = VERTICES.map(() => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', config.vertexRadius);
        circle.setAttribute('fill', config.vertexColor);
        vertexGroup.appendChild(circle);
        return circle;
      });
    }

    containerEl.appendChild(svg);
  }

  /**
   * Updates all SVG elements based on current rotation
   * Called every animation frame
   */
  function render() {
    // Transform all vertices
    const projected = VERTICES.map(v => {
      const rotated = rotatePoint(v, state.rotation);
      return project(rotated);
    });

    // Calculate edge depths and update elements
    const edgeData = EDGES.map((edge, i) => {
      const [i1, i2] = edge;
      const p1 = projected[i1];
      const p2 = projected[i2];
      const avgZ = (p1.z + p2.z) / 2;
      return { index: i, p1, p2, avgZ };
    });

    // Sort edges by depth (back to front)
    edgeData.sort((a, b) => a.avgZ - b.avgZ);

    // Update edge positions and opacity
    edgeData.forEach((data, sortIndex) => {
      const line = edgeElements[data.index];
      line.setAttribute('x1', data.p1.x);
      line.setAttribute('y1', data.p1.y);
      line.setAttribute('x2', data.p2.x);
      line.setAttribute('y2', data.p2.y);

      // Depth-based opacity fading
      if (config.depthFading) {
        const depthFactor = (data.avgZ + 2) / 4;  // Normalize to 0-1
        const opacity = 0.3 + depthFactor * 0.7;   // Range: 0.3 to 1.0
        line.setAttribute('stroke-opacity', opacity * config.strokeOpacity);
      } else {
        line.setAttribute('stroke-opacity', config.strokeOpacity);
      }
    });

    // Update vertex positions
    if (config.vertexRadius > 0) {
      projected.forEach((p, i) => {
        vertexElements[i].setAttribute('cx', p.x);
        vertexElements[i].setAttribute('cy', p.y);
        
        if (config.depthFading) {
          const depthFactor = (p.z + 2) / 4;
          const opacity = 0.3 + depthFactor * 0.7;
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

  function onPointerDown(e) {
    e.preventDefault();
    state.isDragging = true;
    state.isAutoRotating = false;
    state.lastPointer = getPointerPosition(e);
    svg.style.cursor = 'grabbing';

    if (state.resumeTimer) {
      clearTimeout(state.resumeTimer);
      state.resumeTimer = null;
    }
  }

  function onPointerMove(e) {
    if (!state.isDragging) return;
    e.preventDefault();

    const pointer = getPointerPosition(e);
    const delta = {
      x: pointer.x - state.lastPointer.x,
      y: pointer.y - state.lastPointer.y
    };

    // Update rotation (horizontal drag → Y rotation, vertical → X rotation)
    state.rotation.y += delta.x * config.dragSensitivity;
    state.rotation.x += delta.y * config.dragSensitivity;

    // Store velocity for momentum
    state.velocity = {
      x: delta.y * config.dragSensitivity,
      y: delta.x * config.dragSensitivity
    };

    state.lastPointer = pointer;
  }

  function onPointerUp() {
    if (!state.isDragging) return;
    state.isDragging = false;
    svg.style.cursor = 'grab';

    state.resumeTimer = setTimeout(() => {
      state.isAutoRotating = true;
    }, config.idleResumeDelay);
  }

  function bindEvents() {
    svg.addEventListener('mousedown', onPointerDown);
    svg.addEventListener('mousemove', onPointerMove);
    svg.addEventListener('mouseup', onPointerUp);
    svg.addEventListener('mouseleave', onPointerUp);
    svg.addEventListener('touchstart', onPointerDown, { passive: false });
    svg.addEventListener('touchmove', onPointerMove, { passive: false });
    svg.addEventListener('touchend', onPointerUp);
  }

  function unbindEvents() {
    if (!svg) return;
    svg.removeEventListener('mousedown', onPointerDown);
    svg.removeEventListener('mousemove', onPointerMove);
    svg.removeEventListener('mouseup', onPointerUp);
    svg.removeEventListener('mouseleave', onPointerUp);
    svg.removeEventListener('touchstart', onPointerDown);
    svg.removeEventListener('touchmove', onPointerMove);
    svg.removeEventListener('touchend', onPointerUp);
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
    // Resolve container
    if (typeof container === 'string') {
      containerEl = document.querySelector(container);
    } else {
      containerEl = container;
    }

    if (!containerEl) {
      console.error('[Icosahedron] Container element not found');
      return false;
    }

    // Merge config
    config = {
      ...DEFAULT_CONFIG,
      ...userConfig,
      autoRotation: {
        ...DEFAULT_CONFIG.autoRotation,
        ...(userConfig.autoRotation || {})
      }
    };

    // Create SVG and start animation
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
    vertexElements = [];
    containerEl = null;

    state.isDragging = false;
    state.isAutoRotating = true;
    state.rotation = { x: 0, y: 0, z: 0 };
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

    // Update SVG attributes if needed
    if (svg && newConfig.size) {
      svg.setAttribute('width', config.size);
      svg.setAttribute('height', config.size);
      svg.setAttribute('viewBox', `0 0 ${config.size} ${config.size}`);
    }

    edgeElements.forEach(line => {
      if (newConfig.strokeColor) line.setAttribute('stroke', config.strokeColor);
      if (newConfig.strokeWidth) line.setAttribute('stroke-width', config.strokeWidth);
    });

    vertexElements.forEach(circle => {
      if (newConfig.vertexColor) circle.setAttribute('fill', config.vertexColor);
      if (newConfig.vertexRadius) circle.setAttribute('r', config.vertexRadius);
    });
  }

  return {
    init,
    destroy,
    setConfig,
    get config() { return { ...config }; }
  };

})();

/* ===========================================================================
   AUTO-INITIALIZATION
   =========================================================================== */
document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('icosahedron-container');
  if (container) {
    Icosahedron.init(container);
  }
});