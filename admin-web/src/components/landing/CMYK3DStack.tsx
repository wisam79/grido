import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ============================================================================
// مكدس فصل ألوان CMYK — إعادة بناء من الصفر:
// صفائح زجاجية مستديرة الزوايا مستخرجة (Extruded) بمادة فيزيائية
// (Transmission + Clearcoat + IOR) تمرر الضوء فعلياً، فوق ورقة A4 مولّدة
// إجرائياً بالـ Canvas تحمل شبكة صور هوية معشقة وعلامات تسجيل وخطوط قص،
// مع ظلال ناعمة PCF تُسقط على أرضية خفية تبيع العمق الفيزيائي للمشهد.
// ============================================================================

function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - radius);
  shape.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x + radius, y + height);
  shape.absarc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

function traceRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function createPaperTexture(): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // الورقة البيضاء
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 384);

  // هامش ورقة متقطع
  ctx.strokeStyle = 'rgba(100,116,139,0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  traceRoundRect(ctx, 16, 16, 480, 352, 8);
  ctx.stroke();

  // علامات تسجيل الطباعة في الزوايا (Registration marks)
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(100,116,139,0.55)';
  ctx.lineWidth = 1;
  const regMarks = [
    [34, 34],
    [478, 34],
    [34, 350],
    [478, 350],
  ];
  for (const [mx, my] of regMarks) {
    ctx.beginPath();
    ctx.moveTo(mx - 7, my);
    ctx.lineTo(mx + 7, my);
    ctx.moveTo(mx, my - 7);
    ctx.lineTo(mx, my + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // شبكة صور الهوية 2×4 بخلفيات جواز زرقاء
  const cellW = 104;
  const cellH = 128;
  const startX = 40;
  const startY = 44;
  const gapX = 14;
  const gapY = 16;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = startX + col * (cellW + gapX);
      const cy = startY + row * (cellH + gapY);

      ctx.fillStyle = '#3b82f6';
      traceRoundRect(ctx, cx, cy, cellW, cellH, 7);
      ctx.fill();

      const cellGrad = ctx.createLinearGradient(cx, cy, cx, cy + cellH);
      cellGrad.addColorStop(0, 'rgba(255,255,255,0.16)');
      cellGrad.addColorStop(1, 'rgba(30,58,138,0.25)');
      ctx.fillStyle = cellGrad;
      traceRoundRect(ctx, cx, cy, cellW, cellH, 7);
      ctx.fill();

      const headCx = cx + cellW / 2;
      ctx.fillStyle = '#f1c9a5';
      ctx.beginPath();
      ctx.ellipse(headCx, cy + 46, 17, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      traceRoundRect(ctx, headCx - 29, cy + 70, 58, 50, 14);
      ctx.fill();

      ctx.strokeStyle = 'rgba(30,41,59,0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      traceRoundRect(ctx, cx - 2, cy - 2, cellW + 4, cellH + 4, 7);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // أشرطة مقاسات سفلية
  ctx.fillStyle = 'rgba(100,116,139,0.5)';
  traceRoundRect(ctx, 40, 344, 160, 9, 4);
  ctx.fill();
  traceRoundRect(ctx, 340, 344, 96, 9, 4);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function CMYK3DStack() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(3.3, 2.1, 4.1);
    camera.lookAt(0, -0.15, 0);

    // 2. Renderer + ظلال ناعمة + منحنى لوني فيلمي
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(4.5, 7, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -3.5;
    keyLight.shadow.camera.right = 3.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    // 4. CMYK Stack Group
    const stackGroup = new THREE.Group();
    scene.add(stackGroup);

    // هندسة الصفيحة المشتركة — مستديرة الزوايا ومستخرجة أفقياً
    const plateGeom = new THREE.ExtrudeGeometry(roundedRectShape(2.05, 1.42, 0.1), {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
      curveSegments: 12,
    });
    plateGeom.center();
    plateGeom.rotateX(-Math.PI / 2);

    const makeGlass = (hex: number) =>
      new THREE.MeshPhysicalMaterial({
        color: hex,
        transparent: true,
        opacity: 0.75,
        transmission: 0.45,
        thickness: 0.2,
        ior: 1.4,
        metalness: 0.05,
        roughness: 0.12,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
        side: THREE.DoubleSide,
      });

    const plates: Array<{ mesh: THREE.Mesh }> = [];
    const plateDefs = [
      { color: 0x0891b2, rim: 0x67e8f9, glass: true },
      { color: 0xdb2777, rim: 0xf9a8d4, glass: true },
      { color: 0xca8a04, rim: 0xfde047, glass: true },
      { color: 0x1e293b, rim: 0x94a3b8, glass: false },
    ];
    for (const def of plateDefs) {
      const material = def.glass
        ? makeGlass(def.color)
        : new THREE.MeshStandardMaterial({ color: def.color, metalness: 0.55, roughness: 0.42 });
      const mesh = new THREE.Mesh(plateGeom, material);
      mesh.castShadow = true;
      const rim = new THREE.LineSegments(
        new THREE.EdgesGeometry(plateGeom, 22),
        new THREE.LineBasicMaterial({ color: def.rim, transparent: true, opacity: 0.6 })
      );
      mesh.add(rim);
      stackGroup.add(mesh);
      plates.push({ mesh });
    }

    // قفص هوامش الورقة
    const cageMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.35 });
    const cageMesh = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.16, 1.35, 1.52)),
      cageMat
    );
    stackGroup.add(cageMesh);

    // 5. ورقة الطباعة A4 أسفل المكدس
    const paperTexture = createPaperTexture();
    const paperMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 1.16),
      new THREE.MeshStandardMaterial({
        map: paperTexture ?? undefined,
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0,
        side: THREE.DoubleSide,
      })
    );
    paperMesh.rotation.x = -Math.PI / 2;
    paperMesh.position.y = -1.02;
    paperMesh.castShadow = true;
    paperMesh.receiveShadow = true;
    scene.add(paperMesh);

    // 6. أرضية ظلال خفية
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -1.5;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // 7. Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    container.addEventListener('mousemove', onMouseMove);

    // 8. Resize + Intersection Observer
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
      { threshold: 0.1 }
    );
    visibilityObserver.observe(container);

    // 9. Render loop — تنفّس المكدس + وميض زاوية الصفائح + تمايل الورقة
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      if (prefersReducedMotion) {
        renderer.render(scene, camera);
        return;
      }

      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      const spread = 0.33 + Math.sin(t * 1.3) * 0.07;
      plates.forEach(({ mesh }, i) => {
        mesh.position.y = spread * (1.5 - i) + Math.sin(t * 1.6 + i * 1.4) * 0.012;
        mesh.rotation.z = Math.sin(t * 0.65 + i * 2.2) * 0.022;
      });

      cageMat.opacity = 0.28 + 0.14 * Math.sin(t * 1.3);

      paperMesh.position.y = -1.02 + Math.sin(t * 0.85) * 0.035;
      paperMesh.rotation.z = Math.sin(t * 0.5) * 0.05;

      const damp = 1 - Math.exp(-3.2 * delta);
      const targetRotY = t * 0.25 + mouseX * 0.5;
      const targetRotX = mouseY * 0.3;
      stackGroup.rotation.y += (targetRotY - stackGroup.rotation.y) * damp;
      stackGroup.rotation.x += (targetRotX - stackGroup.rotation.x) * damp;

      paperMesh.rotation.y = -stackGroup.rotation.y * 0.12;

      renderer.render(scene, camera);
    };

    animate();

    // 10. تفريغ الموارد كاملاً عند الإتلاف
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', onMouseMove);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
      plateGeom.dispose();
      paperTexture?.dispose();
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[230px] rounded-lg overflow-hidden bg-gradient-to-b from-[#111827] to-[#090d16] flex items-center justify-center border border-[#2C2C2C] select-none">
      <div ref={containerRef} className="w-full h-full absolute inset-0 cursor-crosshair" />

      {/* Floating 3D Plate Color Badges */}
      <div className="absolute top-2.5 start-2.5 z-10 flex items-center gap-1.5 bg-[#141414]/90 backdrop-blur-md px-2 py-1 rounded-lg border border-[#2C2C2C] text-[10px] text-white pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#06b6d4] animate-pulse" />
        <span className="font-bold">فصل ألوان CMYK ثلاثي الأبعاد</span>
      </div>

      <div className="absolute bottom-2.5 inset-x-0 mx-auto w-max z-10 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] text-[#9E9E9E] pointer-events-none">
        <span className="text-[#06b6d4] font-bold">C</span>
        <span className="text-[#ec4899] font-bold">M</span>
        <span className="text-[#eab308] font-bold">Y</span>
        <span className="text-white font-bold">K</span>
        <span>• دقة ألوان كاملة 300 DPI</span>
      </div>
    </div>
  );
}
