import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// =========================================================================
// GLSL Shaders for GPU-Accelerated Rect Grid Nodes (Dewdrops / Pinpoint Stars)
// =========================================================================
const nodeVertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uBaseSize;
  uniform float uPixelRatio;

  attribute float aPhase;
  attribute vec2 aGridCoord;

  varying float vGlow;
  varying float vPhase;
  varying vec2 vGridCoord;

  void main() {
    vPhase = aPhase;
    vGridCoord = aGridCoord;

    // Gentle, harmonic architectural undulation (deep, soothing oceanic wave)
    float wave = sin(uTime * 0.65 + position.x * 0.35 + position.y * 0.25) * 0.10
               + cos(uTime * 0.45 + position.x * 0.20 - position.y * 0.28) * 0.07;

    // Smooth Gaussian distance falloff from mouse cursor (no sudden cutoffs)
    float dist = length(position.xy - uMouse);
    float glow = exp(-dist * dist * 0.16);
    vGlow = glow;

    // Silky smooth Z elevation - zero high-frequency jitter, pure organic cushion
    float lift = glow * 0.18;

    vec3 transformed = position;
    // Strictly preserve X & Y to maintain clean architectural grid lines
    transformed.z += wave + lift;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Micro pinprick point size with subtle scale under mouse
    gl_PointSize = clamp(uBaseSize * (1.0 + glow * 0.65) * (24.0 / -mvPosition.z) * uPixelRatio, 2.0, 6.0);
  }
`;

const nodeFragmentShader = `
  uniform float uTime;
  uniform vec3 uColorCyan;
  uniform vec3 uColorAzure;
  uniform vec3 uColorSlate;
  uniform vec3 uColorWhite;

  varying float vGlow;
  varying float vPhase;
  varying vec2 vGridCoord;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Crisp pinpoint core with silky ambient halo
    float core = smoothstep(0.38, 0.04, dist);
    float halo = exp(-dist * 4.2);

    // Serene breathing pulse (1.1 rad/sec - eye-comfort rate)
    float breath = 0.82 + 0.18 * sin(uTime * 1.1 + vPhase);

    // Soft resting slate-cyan, radiant azure/cyan under cursor, pure luminous white center
    vec3 restingColor = mix(uColorSlate, uColorCyan, 0.35);
    vec3 activeColor = mix(uColorCyan, uColorWhite, clamp(core * 0.65 + vGlow * 0.75, 0.0, 1.0));
    vec3 finalColor = mix(restingColor * breath, activeColor, vGlow);

    float alpha = mix(0.18, 0.90, vGlow) * halo;
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// =========================================================================
// GLSL Shaders for GPU-Accelerated Rect Grid Filaments (Orthogonal Lines)
// =========================================================================
const lineVertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;

  attribute float aLineIndex;

  varying float vGlow;
  varying vec2 vPosition;

  void main() {
    vPosition = position.xy;

    // Identical harmonic wave as nodes to guarantee seamless continuous mesh alignment
    float wave = sin(uTime * 0.65 + position.x * 0.35 + position.y * 0.25) * 0.10
               + cos(uTime * 0.45 + position.x * 0.20 - position.y * 0.28) * 0.07;

    // Smooth Gaussian proximity to mouse
    float dist = length(position.xy - uMouse);
    float glow = exp(-dist * dist * 0.16);
    vGlow = glow;

    // Gentle Z lift matching the nodes exactly
    float lift = glow * 0.18;

    vec3 transformed = position;
    transformed.z += wave + lift;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const lineFragmentShader = `
  uniform float uTime;
  uniform vec3 uColorCyan;
  uniform vec3 uColorAzure;
  uniform vec3 uColorSlate;
  uniform vec3 uColorWhite;

  varying float vGlow;
  varying vec2 vPosition;

  void main() {
    // Base resting lines: Very soft, translucent architectural coordinate grid (comfortable for eyes)
    vec3 baseColor = uColorSlate;
    float baseAlpha = 0.09;

    // Illuminated highlight under mouse: Vibrant Azure / Cyan gradient
    vec3 highlightColor = mix(uColorCyan, uColorWhite, vGlow * 0.35);

    // Smooth, organic blend - NO crackling, NO vibration, NO flickering!
    vec3 finalColor = mix(baseColor, highlightColor, vGlow);
    float finalAlpha = baseAlpha + vGlow * 0.50;

    gl_FragColor = vec4(finalColor * finalAlpha, finalAlpha);
  }
`;

export function Hero3DScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 7.8);

    // 2. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 3. Master 3D Rect Grid Group
    const gridGroup = new THREE.Group();
    scene.add(gridGroup);

    // ==========================================
    // 4. RECTANGULAR GRID TOPOLOGY GENERATION
    // ==========================================
    const COLS = 26; // 26 Horizontal grid columns across viewport
    const ROWS = 15; // 15 Vertical grid rows
    const TOTAL_NODES = COLS * ROWS;

    const GRID_WIDTH = 18.0;  // Span across full field of view
    const GRID_HEIGHT = 10.0;
    const ORIGIN_X = -GRID_WIDTH / 2;
    const ORIGIN_Y = -GRID_HEIGHT / 2 + 0.25;

    const DX = GRID_WIDTH / (COLS - 1);
    const DY = GRID_HEIGHT / (ROWS - 1);

    const nodePositions = new Float32Array(TOTAL_NODES * 3);
    const nodePhases = new Float32Array(TOTAL_NODES);
    const nodeGridCoords = new Float32Array(TOTAL_NODES * 2);

    // Precalculate Symmetrical Rectangular Grid Intersections
    for (let r = 0; r < ROWS; r++) {
      const y = ORIGIN_Y + r * DY;
      const normY = r / (ROWS - 1);

      for (let c = 0; c < COLS; c++) {
        const x = ORIGIN_X + c * DX;
        const normX = c / (COLS - 1);

        const nodeIdx = r * COLS + c;
        const i3 = nodeIdx * 3;
        const i2 = nodeIdx * 2;

        // Subtle concave curvature in deep Z space for immersive perspective depth
        const distFromCenter = Math.sqrt(Math.pow(normX - 0.5, 2) + Math.pow(normY - 0.5, 2));
        const z = -0.5 * Math.pow(distFromCenter * 1.6, 1.4);

        nodePositions[i3] = x;
        nodePositions[i3 + 1] = y;
        nodePositions[i3 + 2] = z;

        nodePhases[nodeIdx] = (c * 0.25) + (r * 0.35);
        nodeGridCoords[i2] = normX;
        nodeGridCoords[i2 + 1] = normY;
      }
    }

    // Nodes BufferGeometry
    const nodesGeometry = new THREE.BufferGeometry();
    nodesGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    nodesGeometry.setAttribute('aPhase', new THREE.BufferAttribute(nodePhases, 1));
    nodesGeometry.setAttribute('aGridCoord', new THREE.BufferAttribute(nodeGridCoords, 2));

    const uMouse = new THREE.Vector2(0, 0);

    const nodesMaterial = new THREE.ShaderMaterial({
      vertexShader: nodeVertexShader,
      fragmentShader: nodeFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: uMouse },
        uBaseSize: { value: 1.0 },
        uPixelRatio: { value: pixelRatio },
        uColorCyan: { value: new THREE.Color(0x38bdf8) },
        uColorAzure: { value: new THREE.Color(0x60a5fa) },
        uColorSlate: { value: new THREE.Color(0x1e3a5f) },
        uColorWhite: { value: new THREE.Color(0xffffff) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const dewdropPoints = new THREE.Points(nodesGeometry, nodesMaterial);
    gridGroup.add(dewdropPoints);

    // ==========================================
    // 5. RECT GRID MESH FILAMENTS (8 SUBDIVISIONS PER SEGMENT)
    // ==========================================
    // 8 Subdivisions ensure perfectly smooth, continuous curvature with zero jagged kinks
    const SUB_DIV = 8;

    const horizontalArcs = ROWS * (COLS - 1);
    const verticalArcs = COLS * (ROWS - 1);
    const totalSegments = (horizontalArcs + verticalArcs) * SUB_DIV;

    const linePositions = new Float32Array(totalSegments * 2 * 3);
    const lineIndices = new Float32Array(totalSegments * 2);

    let segCursor = 0;
    let lineCounter = 0;

    const writeLineSegment = (
      p1x: number, p1y: number, p1z: number,
      p2x: number, p2y: number, p2z: number,
      t1: number, t2: number,
      lineIdx: number
    ) => {
      const pIdx = segCursor * 6;
      const aIdx = segCursor * 2;

      // Smoothly interpolated subsegment points
      linePositions[pIdx] = (1.0 - t1) * p1x + t1 * p2x;
      linePositions[pIdx + 1] = (1.0 - t1) * p1y + t1 * p2y;
      linePositions[pIdx + 2] = (1.0 - t1) * p1z + t1 * p2z;

      linePositions[pIdx + 3] = (1.0 - t2) * p1x + t2 * p2x;
      linePositions[pIdx + 4] = (1.0 - t2) * p1y + t2 * p2y;
      linePositions[pIdx + 5] = (1.0 - t2) * p1z + t2 * p2z;

      lineIndices[aIdx] = lineIdx;
      lineIndices[aIdx + 1] = lineIdx;

      segCursor++;
    };

    // A. Horizontal Grid Lines (Connecting (c, r) -> (c+1, r))
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const n1_3 = (r * COLS + c) * 3;
        const n2_3 = (r * COLS + (c + 1)) * 3;

        const p1x = nodePositions[n1_3];
        const p1y = nodePositions[n1_3 + 1];
        const p1z = nodePositions[n1_3 + 2];

        const p2x = nodePositions[n2_3];
        const p2y = nodePositions[n2_3 + 1];
        const p2z = nodePositions[n2_3 + 2];

        for (let sub = 0; sub < SUB_DIV; sub++) {
          const t1 = sub / SUB_DIV;
          const t2 = (sub + 1) / SUB_DIV;
          writeLineSegment(p1x, p1y, p1z, p2x, p2y, p2z, t1, t2, lineCounter);
        }
        lineCounter++;
      }
    }

    // B. Vertical Grid Lines (Connecting (c, r) -> (c, r+1))
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 1; r++) {
        const n1_3 = (r * COLS + c) * 3;
        const n2_3 = ((r + 1) * COLS + c) * 3;

        const p1x = nodePositions[n1_3];
        const p1y = nodePositions[n1_3 + 1];
        const p1z = nodePositions[n1_3 + 2];

        const p2x = nodePositions[n2_3];
        const p2y = nodePositions[n2_3 + 1];
        const p2z = nodePositions[n2_3 + 2];

        for (let sub = 0; sub < SUB_DIV; sub++) {
          const t1 = sub / SUB_DIV;
          const t2 = (sub + 1) / SUB_DIV;
          writeLineSegment(p1x, p1y, p1z, p2x, p2y, p2z, t1, t2, lineCounter);
        }
        lineCounter++;
      }
    }

    // Upload Baked Mesh to GPU
    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    linesGeometry.setAttribute('aLineIndex', new THREE.BufferAttribute(lineIndices, 1));

    const linesMaterial = new THREE.ShaderMaterial({
      vertexShader: lineVertexShader,
      fragmentShader: lineFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: uMouse },
        uColorCyan: { value: new THREE.Color(0x38bdf8) },
        uColorAzure: { value: new THREE.Color(0x60a5fa) },
        uColorSlate: { value: new THREE.Color(0x1e3a5f) },
        uColorWhite: { value: new THREE.Color(0xffffff) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const gridLines = new THREE.LineSegments(linesGeometry, linesMaterial);
    gridGroup.add(gridLines);

    // ==========================================
    // 6. SILKY ORGANIC POINTER INTERACTION
    // ==========================================
    let hasPointer = false;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const onPointerMove = (e: PointerEvent) => {
      hasPointer = true;
      const rect = container.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetMouseX = ndcX * 7.5;
      targetMouseY = ndcY * 4.5;
    };

    const onPointerLeave = () => {
      hasPointer = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('blur', onPointerLeave);

    // ==========================================
    // 7. PRECISE RESIZE OBSERVER
    // ==========================================
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        nodesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 1.5);
      }
    });
    resizeObserver.observe(container);

    // Visibility Observer
    let isVisible = true;
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          isVisible = e.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    visibilityObserver.observe(container);

    // ==========================================
    // 8. PURE GPU-DRIVEN ANIMATION LOOP (0% CPU)
    // ==========================================
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const speedMult = prefersReducedMotion ? 0.25 : 1.0;
      const timeVal = elapsed * speedMult;

      // When user is not interacting, smoothly drift along a calm ambient orbit
      if (!hasPointer) {
        targetMouseX = Math.sin(timeVal * 0.35) * 2.2;
        targetMouseY = Math.cos(timeVal * 0.25) * 1.2;
      }

      // Smooth exponential damping across 60Hz, 120Hz, 144Hz displays
      const lerpFactor = 1.0 - Math.exp(-4.5 * delta);
      currentMouseX += (targetMouseX - currentMouseX) * lerpFactor;
      currentMouseY += (targetMouseY - currentMouseY) * lerpFactor;

      // Subtle, tranquil 3D parallax tilt (relaxing depth, never nauseating)
      gridGroup.rotation.y = currentMouseX * 0.012;
      gridGroup.rotation.x = -currentMouseY * 0.008;

      // Update uniforms smoothly
      nodesMaterial.uniforms.uTime.value = timeVal;
      nodesMaterial.uniforms.uMouse.value.set(currentMouseX, currentMouseY);

      linesMaterial.uniforms.uTime.value = timeVal;
      linesMaterial.uniforms.uMouse.value.set(currentMouseX, currentMouseY);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Clean Lifecycle Tear Down
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      nodesGeometry.dispose();
      nodesMaterial.dispose();
      linesGeometry.dispose();
      linesMaterial.dispose();
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-85"
    />
  );
}
