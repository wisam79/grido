import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ============================================================================
// Hero "Aurora Dot Ocean" — إعادة بناء من الصفر:
// محيط نقطي مائل بمنظور عمقي، موجات هارمونية على GPU، هالة تفاعلية حول المؤشر
// مع حلقات موجية متباعدة، نبضة رادار بطيئة تجتاح العمق، غبار نجمي عائم،
// وغيوم توهج Aurora كبيرة خلف المشهد لإحساس فاخر بالعمق.
// ============================================================================

const dotsVertexShader = `
  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uBaseSize;
  uniform float uPixelRatio;

  attribute float aRand;

  varying float vGlow;
  varying float vElev;
  varying float vDepth;
  varying float vRand;
  varying float vSweep;
  varying float vEdge;

  float elevation(vec2 p, float t) {
    float e  = sin(p.x * 0.42 + t * 0.62) * 0.50;
    e += sin(p.y * 0.31 - t * 0.44) * 0.42;
    e += sin((p.x + p.y) * 0.22 + t * 0.30) * 0.30;
    e += sin(length(p) * 0.36 - t * 0.90) * 0.16;
    return e;
  }

  void main() {
    vec2 xz = position.xz;
    float elev = elevation(xz, uTime);
    vElev = elev;
    vRand = aRand;

    vec3 p = position;
    p.y += elev * 0.55;

    // هالة المؤشر + حلقات موجية متباعدة على مستوى الحقل
    float md = length(xz - uMouse.xz);
    float halo = exp(-md * md * 0.14);
    float ring = exp(-md * 0.5) * max(sin(md * 2.4 - uTime * 2.2), 0.0);
    vGlow = clamp(halo + ring * 0.65, 0.0, 1.4);

    // نبضة رادار بطيئة تعبر المشهد باتجاه العمق
    float sweepCenter = mod(uTime * 1.5, 20.0) - 12.0;
    vSweep = exp(-pow((p.z - sweepCenter) * 0.85, 2.0));

    // تلاشي حواف ناعم ليذوب الحقل في الخلفية بلا حدود حادة
    vEdge = smoothstep(15.5, 12.5, abs(p.x))
          * smoothstep(4.8, 3.2, p.z)
          * smoothstep(-12.0, -9.0, p.z);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vDepth = clamp((-mv.z - 5.0) / 16.0, 0.0, 1.0);

    gl_PointSize = clamp(
      uBaseSize * (0.75 + aRand * 0.55) * (1.0 + vGlow * 0.9 + vSweep * 0.45)
        * (26.0 / -mv.z) * uPixelRatio,
      1.5, 7.0
    );
  }
`;

const dotsFragmentShader = `
  uniform vec3 uDeep;
  uniform vec3 uAzure;
  uniform vec3 uCyan;
  uniform vec3 uWhite;
  uniform float uFade;

  varying float vGlow;
  varying float vElev;
  varying float vDepth;
  varying float vRand;
  varying float vSweep;
  varying float vEdge;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;

    float core = smoothstep(0.36, 0.05, d);
    float halo = exp(-d * 4.5);

    // منحدر قزحي حسب الارتفاع: كحلي عميق ← أزرق ← سماوي
    float h = clamp(vElev * 0.55 + 0.5, 0.0, 1.0);
    vec3 col = mix(uDeep, uAzure, smoothstep(0.12, 0.62, h));
    col = mix(col, uCyan, smoothstep(0.58, 0.96, h));

    // شرارات بيضاء نادرة عند قمم الأمواج
    float sparkle = step(0.94, vRand) * smoothstep(0.78, 1.0, h);
    col = mix(col, uWhite, sparkle * 0.9);

    // نواة ساخنة عند المؤشر
    vec3 hotCore = mix(uCyan, uWhite, clamp(core * 0.45 + vGlow * 0.65, 0.0, 1.0));
    float energy = clamp(vGlow, 0.0, 1.0);
    col = mix(col, hotCore, energy);
    col += uCyan * vSweep * 0.30;

    float alpha = (0.30 + 0.38 * h) * halo;
    alpha = mix(alpha, 0.95 * halo, energy * 0.75);
    alpha *= mix(1.0, 0.28, vDepth);
    alpha *= vEdge * uFade;

    gl_FragColor = vec4(col, alpha);
  }
`;

const dustVertexShader = `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aPhase;
  varying float vTwinkle;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.07 + aPhase) * 0.6;
    p.y += cos(uTime * 0.05 + aPhase * 1.4) * 0.4;
    vTwinkle = 0.5 + 0.5 * sin(uTime * 0.9 + aPhase * 3.1);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(1.4 * (26.0 / -mv.z) * uPixelRatio, 1.0, 3.2);
  }
`;

const dustFragmentShader = `
  varying float vTwinkle;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float halo = exp(-d * 5.0);
    gl_FragColor = vec4(vec3(0.62, 0.78, 0.98), (0.08 + 0.20 * vTwinkle) * halo);
  }
`;

export function Hero3DScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 📱 تخطي المشهد ثلاثي الأبعاد على الجوال بالكامل — رسوميات أقل بلا مقابل
    // حسي على شاشة صغيرة، وتوفير مباشر للبطارية والحرارة أثناء التمرير.
    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;

    if (isMobileViewport) {
      container.style.display = 'none';
      return;
    }
    if (prefersReducedMotion) {
      container.style.opacity = '0.4';
    }

    // 1. Scene & Camera — كاميرا منخفضة تنظر فوق حقل نقاط مائل
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    const CAM_BASE = new THREE.Vector3(0, 3.3, 8.4);
    const CAM_LOOK = new THREE.Vector3(0, 0, -2.5);
    camera.position.copy(CAM_BASE);
    camera.lookAt(CAM_LOOK);

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

    // 3. حقل النقاط — شبكة 100×44 ممدودة نحو العمق (منظور طبيعي)
    const COLS = 100;
    const ROWS = 44;
    const X_HALF = 15.5;
    const Z_NEAR = 4.5;
    const Z_FAR = -11.0;
    const TOTAL = COLS * ROWS;

    const positions = new Float32Array(TOTAL * 3);
    const rands = new Float32Array(TOTAL);
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      const z = Z_FAR + (Z_NEAR - Z_FAR) * (r / (ROWS - 1));
      for (let c = 0; c < COLS; c++) {
        positions[idx * 3] = -X_HALF + 2 * X_HALF * (c / (COLS - 1));
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = z;
        rands[idx] = Math.random();
        idx++;
      }
    }

    const dotsGeometry = new THREE.BufferGeometry();
    dotsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dotsGeometry.setAttribute('aRand', new THREE.BufferAttribute(rands, 1));

    const uMouse = new THREE.Vector3(0, 0, -3);

    const dotsMaterial = new THREE.ShaderMaterial({
      vertexShader: dotsVertexShader,
      fragmentShader: dotsFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: uMouse },
        uBaseSize: { value: 1.55 },
        uPixelRatio: { value: pixelRatio },
        uFade: { value: 0 },
        uDeep: { value: new THREE.Color(0x172554) },
        uAzure: { value: new THREE.Color(0x3b82f6) },
        uCyan: { value: new THREE.Color(0x38bdf8) },
        uWhite: { value: new THREE.Color(0xffffff) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(dotsGeometry, dotsMaterial));

    // 4. غبار نجمي عائم فوق الحقل (طبقة عمق علوية)
    const DUST_COUNT = 90;
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustPhases = new Float32Array(DUST_COUNT);
    for (let s = 0; s < DUST_COUNT; s++) {
      dustPositions[s * 3] = (Math.random() - 0.5) * 26;
      dustPositions[s * 3 + 1] = 0.6 + Math.random() * 2.8;
      dustPositions[s * 3 + 2] = -9 + Math.random() * 12;
      dustPhases[s] = Math.random() * Math.PI * 2;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('aPhase', new THREE.BufferAttribute(dustPhases, 1));

    const dustMaterial = new THREE.ShaderMaterial({
      vertexShader: dustVertexShader,
      fragmentShader: dustFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(dustGeometry, dustMaterial));

    // 5. إسقاط المؤشر على مستوى الحقل (Ray ⟂ Plane) لهالة دقيقة الموضع
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const pointerNDC = new THREE.Vector2();
    const hitPoint = new THREE.Vector3();
    const glowTarget = new THREE.Vector3(0, 0, -3);
    let hasPointer = false;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      pointerNDC.copy(ndc);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        glowTarget.copy(hitPoint);
        hasPointer = true;
      }
    };

    const onPointerLeave = () => {
      hasPointer = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onPointerLeave);

    // 7. Resize + Intersection Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

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

    // 8. حلقة رسم نظيفة مدفوعة بالـ GPU
    let animationFrameId: number;
    const clock = new THREE.Clock();
    const parallax = new THREE.Vector2(0, 0);

    const animate = () => {
      if (prefersReducedMotion) {
        // لقطة ساكنة واحدة — صفر استهلاك GPU مستمر
        dotsMaterial.uniforms.uTime.value = 8;
        dotsMaterial.uniforms.uFade.value = 1;
        dustMaterial.uniforms.uTime.value = 8;
        renderer.render(scene, camera);
        return;
      }

      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      // مسار محوري هادئ عند عدم وجود مؤشر
      if (!hasPointer) {
        glowTarget.set(Math.sin(t * 0.32) * 4.5, 0, Math.cos(t * 0.24) * 2.5 - 3);
      }
      const follow = 1 - Math.exp(-4.0 * delta);
      uMouse.lerp(glowTarget, follow);

      dotsMaterial.uniforms.uTime.value = t;
      dotsMaterial.uniforms.uFade.value = Math.min(1, dotsMaterial.uniforms.uFade.value + delta * 0.4);
      dustMaterial.uniforms.uTime.value = t;

      // Parallax ناعم للكاميرا يتبع المؤشر بتخميد أسي
      const pf = 1 - Math.exp(-2.2 * delta);
      parallax.x += (pointerNDC.x * 0.65 - parallax.x) * pf;
      parallax.y += (pointerNDC.y * 0.35 - parallax.y) * pf;
      camera.position.set(CAM_BASE.x + parallax.x, CAM_BASE.y + parallax.y, CAM_BASE.z);
      camera.lookAt(CAM_LOOK);

      renderer.render(scene, camera);
    };

    animate();

    // 8. تفريغ الموارد كاملاً عند الإتلاف
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      dotsGeometry.dispose();
      dotsMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
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
