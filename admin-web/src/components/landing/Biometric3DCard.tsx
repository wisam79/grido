import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ============================================================================
// بطاقة هوية بيومترية مجسمة — إعادة بناء من الصفر:
// جسم بطاقة مستخرج بزوايا دائرية (Extruded Rounded Card) بمادة معدنية داكنة
// ولمعان فيزيائي (Clearcoat)، طبقة هولوغرام أمامية مولّدة إجرائياً بالـ Canvas
// (Scanlines + دوائر جويوش + شريحة ذهبية + كود MRZ)، كوكبة معالم وجه ثلاثية
// الأبعاد محدبة متصلة بشبكة خطوط، وحلقتا استهداف رادار، وليزر مسح بتوهج.
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

function createCardTexture(): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 704;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // قص الزوايا الدائرية لتطابق هندسة جسم البطاقة
  traceRoundRect(ctx, 0, 0, 512, 704, 44);
  ctx.save();
  ctx.clip();

  // تدرج لوني خفيف وعامودي
  const sheen = ctx.createLinearGradient(0, 0, 512, 704);
  sheen.addColorStop(0, 'rgba(148,163,184,0.05)');
  sheen.addColorStop(0.5, 'rgba(96,165,250,0.10)');
  sheen.addColorStop(1, 'rgba(148,163,184,0.05)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 512, 704);

  // خطوط مسح قطرية أمنية (Scanlines)
  ctx.strokeStyle = 'rgba(96,165,250,0.07)';
  ctx.lineWidth = 1;
  for (let i = -704; i < 1216; i += 7) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 704, 704);
    ctx.stroke();
  }

  // دوائر جويوش منقوشة حول منطقة صورة الوجه
  const FX = 256;
  const FY = 208;
  ctx.strokeStyle = 'rgba(56,189,248,0.07)';
  for (let r = 36; r <= 130; r += 14) {
    ctx.beginPath();
    ctx.arc(FX, FY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // حلقات جويوش متموجة رياضياً
  ctx.strokeStyle = 'rgba(56,189,248,0.05)';
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    for (let a = 0; a <= 64; a++) {
      const th = (a / 64) * Math.PI * 2;
      const rr = 96 + k * 24 + Math.sin(th * 9 + k * 2) * 6;
      const px = FX + Math.cos(th) * rr;
      const py = FY + Math.sin(th) * rr * 0.92;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // شبح البورتريه خلف الكوكبة ثلاثية الأبعاد
  ctx.fillStyle = 'rgba(37,99,235,0.15)';
  ctx.beginPath();
  ctx.ellipse(FX, FY + 14, 54, 64, 0, 0, Math.PI * 2);
  ctx.fill();
  traceRoundRect(ctx, FX - 86, FY + 82, 172, 58, 26);
  ctx.fill();

  // إطار الصورة النقطي المتقطع
  ctx.strokeStyle = 'rgba(56,189,248,0.30)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([7, 5]);
  traceRoundRect(ctx, FX - 98, FY - 124, 196, 248, 12);
  ctx.stroke();
  ctx.setLineDash([]);

  // أشرطة نصية أعلى اليسار
  ctx.fillStyle = 'rgba(148,163,184,0.32)';
  traceRoundRect(ctx, 40, 60, 120, 11, 5);
  ctx.fill();
  traceRoundRect(ctx, 40, 82, 84, 8, 4);
  ctx.fill();

  // شريحة اتصال ذهبية ذكية (Smart Chip)
  ctx.fillStyle = '#c9a227';
  traceRoundRect(ctx, 392, 56, 66, 48, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(425, 56);
  ctx.lineTo(425, 104);
  ctx.moveTo(392, 72);
  ctx.lineTo(458, 72);
  ctx.moveTo(392, 88);
  ctx.lineTo(458, 88);
  ctx.stroke();

  // سطرا MRZ للقراءة الآلية أسفل البطاقة
  ctx.fillStyle = 'rgba(203,213,225,0.5)';
  for (const row of [616, 646]) {
    let x = 42;
    while (x < 468) {
      const w = 4 + Math.random() * 9;
      if (Math.random() > 0.15) ctx.fillRect(x, row, w, 10);
      x += w + 3;
    }
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGlowTexture(): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.35, 'rgba(56,189,248,0.45)');
  gradient.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

type XY = [number, number];

function ellipseArc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): XY[] {
  const pts: XY[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

function buildFace() {
  const domeZ = (x: number, y: number) => 0.085 * Math.max(0, 1 - (x * x) / 0.32 - (y * y) / 0.62);

  const curves: XY[][] = [
    ellipseArc(0, 0.02, 0.335, 0.46, Math.PI * 0.12, Math.PI * 0.88, 22),
    ellipseArc(0, 0, 0.295, 0.435, Math.PI * 1.1, Math.PI * 1.9, 20),
    ellipseArc(-0.15, 0.285, 0.082, 0.02, Math.PI * 1.15, Math.PI * 1.85, 5),
    ellipseArc(0.15, 0.285, 0.082, 0.02, Math.PI * 1.15, Math.PI * 1.85, 5),
    ellipseArc(-0.15, 0.2, 0.058, 0.026, 0, Math.PI * 2, 8),
    ellipseArc(0.15, 0.2, 0.058, 0.026, 0, Math.PI * 2, 8),
    [[0, 0.27], [0, 0.21], [0, 0.15], [0, 0.115]],
    [[-0.032, 0.108], [0.032, 0.108]],
    ellipseArc(0, 0.015, 0.095, 0.03, Math.PI * 1.08, Math.PI * 1.92, 7),
  ];

  const flat: XY[] = [];
  for (const c of curves) flat.push(...c);

  const nearest = (x: number, y: number) => {
    let bi = 0;
    let bd = Infinity;
    for (let i = 0; i < flat.length; i++) {
      const d = (flat[i][0] - x) ** 2 + (flat[i][1] - y) ** 2;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    return bi;
  };

  const pairs: Array<[number, number]> = [];
  let offset = 0;
  for (const c of curves) {
    for (let i = 0; i < c.length - 1; i++) {
      pairs.push([offset + i, offset + i + 1]);
    }
    offset += c.length;
  }

  // خطوط ربط عابرة بين المعالم
  const cross: XY[][] = [
    [[-0.092, 0.2], [0, 0.27]],
    [[0.092, 0.2], [0, 0.27]],
    [[-0.032, 0.108], [0, 0.115]],
    [[0.032, 0.108], [0, 0.115]],
    [[-0.032, 0.108], [-0.09, 0.02]],
    [[0.032, 0.108], [0.09, 0.02]],
    [[0, -0.013], [0, -0.43]],
    [[-0.208, 0.2], [-0.27, -0.12]],
    [[0.208, 0.2], [0.27, -0.12]],
  ];
  for (const [a, b] of cross) {
    pairs.push([nearest(a[0], a[1]), nearest(b[0], b[1])]);
  }

  const nodePositions = new Float32Array(flat.length * 3);
  flat.forEach(([x, y], idx) => {
    nodePositions[idx * 3] = x;
    nodePositions[idx * 3 + 1] = y;
    nodePositions[idx * 3 + 2] = domeZ(x, y);
  });

  const segmentPositions = new Float32Array(pairs.length * 6);
  pairs.forEach(([a, b], i) => {
    segmentPositions[i * 6] = nodePositions[a * 3];
    segmentPositions[i * 6 + 1] = nodePositions[a * 3 + 1];
    segmentPositions[i * 6 + 2] = nodePositions[a * 3 + 2];
    segmentPositions[i * 6 + 3] = nodePositions[b * 3];
    segmentPositions[i * 6 + 4] = nodePositions[b * 3 + 1];
    segmentPositions[i * 6 + 5] = nodePositions[b * 3 + 2];
  });

  const keyXY: XY[] = [
    [-0.15, 0.2], [0.15, 0.2], [0, 0.27], [0, 0.115],
    [-0.09, 0.015], [0.09, 0.015], [0, -0.43], [0, 0.48],
    [-0.31, 0.19], [0.31, 0.19], [-0.032, 0.108], [0.032, 0.108],
  ];
  const keyPositions = new Float32Array(keyXY.length * 3);
  keyXY.forEach(([x, y], idx) => {
    keyPositions[idx * 3] = x;
    keyPositions[idx * 3 + 1] = y;
    keyPositions[idx * 3 + 2] = domeZ(x, y) + 0.004;
  });

  return { nodePositions, segmentPositions, keyPositions };
}

export function Biometric3DCard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.1, 4.25);
    camera.lookAt(0, 0, 0);

    // 2. High-Performance Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    dom.style.cursor = 'grab';
    container.appendChild(dom);

    // 3. Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(4, 6, 6);
    scene.add(keyLight);
    const cyanLight = new THREE.PointLight(0x38bdf8, 2.2, 9);
    cyanLight.position.set(-3, -2, 3);
    scene.add(cyanLight);
    const rimLight = new THREE.PointLight(0x93c5fd, 0.9, 11);
    rimLight.position.set(2.5, 3, -4);
    scene.add(rimLight);

    // 4. Card
    const cardGroup = new THREE.Group();
    scene.add(cardGroup);

    const cardGeom = new THREE.ExtrudeGeometry(roundedRectShape(1.5, 2.05, 0.13), {
      depth: 0.035,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
      curveSegments: 14,
    });
    cardGroup.add(new THREE.Mesh(cardGeom, new THREE.MeshPhysicalMaterial({
      color: 0x0b1220,
      metalness: 0.72,
      roughness: 0.26,
      clearcoat: 1.0,
      clearcoatRoughness: 0.22,
    })));

    const cardTexture = createCardTexture();
    if (cardTexture) {
      const overlayMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 2.05),
        new THREE.MeshBasicMaterial({ map: cardTexture, transparent: true, toneMapped: false })
      );
      overlayMesh.position.z = 0.045;
      cardGroup.add(overlayMesh);
    }

    // وجه بيومتري محدب + شبكة ربط
    const face = buildFace();
    const faceGroup = new THREE.Group();
    faceGroup.position.set(0, 0.42, 0.045);
    cardGroup.add(faceGroup);

    const nodesGeom = new THREE.BufferGeometry();
    nodesGeom.setAttribute('position', new THREE.BufferAttribute(face.nodePositions, 3));
    const nodesMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.011,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    faceGroup.add(new THREE.Points(nodesGeom, nodesMat));

    const meshGeom = new THREE.BufferGeometry();
    meshGeom.setAttribute('position', new THREE.BufferAttribute(face.segmentPositions, 3));
    const meshMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    faceGroup.add(new THREE.LineSegments(meshGeom, meshMat));

    const keyGeom = new THREE.BufferGeometry();
    keyGeom.setAttribute('position', new THREE.BufferAttribute(face.keyPositions, 3));
    const keyMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.022,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    faceGroup.add(new THREE.Points(keyGeom, keyMat));

    // حلقتا استهداف رادار متعاكستا الدوران
    const reticleGeom = new THREE.RingGeometry(0.30, 0.322, 48, 1, 0, Math.PI * 0.55);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const reticleA = new THREE.Mesh(reticleGeom, reticleMat);
    reticleA.position.z = 0.006;
    faceGroup.add(reticleA);
    const reticleB = new THREE.Mesh(reticleGeom, reticleMat);
    reticleB.position.z = 0.006;
    reticleB.rotation.z = Math.PI;
    faceGroup.add(reticleB);

    // أقواس تصويب بزوايا البطاقة (Viewfinder brackets)
    const bracketSegs: number[] = [];
    const corners: Array<[number, number, number, number]> = [
      [-0.68, 0.94, 1, -1],
      [0.68, 0.94, -1, -1],
      [-0.68, -0.94, 1, 1],
      [0.68, -0.94, -1, 1],
    ];
    for (const [cx, cy, ix, iy] of corners) {
      bracketSegs.push(cx, cy, 0.04, cx + ix * 0.15, cy, 0.04);
      bracketSegs.push(cx, cy, 0.04, cx, cy + iy * 0.13, 0.04);
    }
    const bracketGeom = new THREE.BufferGeometry();
    bracketGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bracketSegs), 3));
    const bracketMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      toneMapped: false,
    });
    cardGroup.add(new THREE.LineSegments(bracketGeom, bracketMat));

    // ليزر المسح الأفقي
    const laserGeom = new THREE.PlaneGeometry(0.95, 0.016);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const laserMesh = new THREE.Mesh(laserGeom, laserMat);
    laserMesh.position.z = 0.048;
    cardGroup.add(laserMesh);

    // هالة الليزر التوهجية
    const glowTexture = createGlowTexture();
    let laserGlow: THREE.Sprite | null = null;
    if (glowTexture) {
      laserGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }));
      laserGlow.scale.set(1.15, 0.55, 1);
      laserGlow.position.z = 0.047;
      cardGroup.add(laserGlow);
    }

    // حلقتا جايرو متعاكستان حول البطاقة
    const gyroMatA = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      wireframe: true,
    });
    const gyroA = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.0075, 8, 96), gyroMatA);
    scene.add(gyroA);
    const gyroMatB = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      wireframe: true,
    });
    const gyroB = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.005, 8, 96), gyroMatB);
    gyroB.rotation.x = Math.PI / 2.4;
    scene.add(gyroB);

    // غبار مداري عائم
    const DUST = 48;
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      const r = 1.02 + Math.random() * 0.3;
      const a = Math.random() * Math.PI * 2;
      dustPos[i * 3] = Math.cos(a) * r;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 1.15;
      dustPos[i * 3 + 2] = Math.sin(a) * r;
    }
    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.013,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const dustGroup = new THREE.Group();
    dustGroup.add(new THREE.Points(dustGeom, dustMat));
    scene.add(dustGroup);

    // 5. تفاعل السحب بالقصور الذاتي
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let rotX = 0.15;
    let rotY = -0.25;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      setIsInteracting(true);
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      velocityX = 0;
      velocityY = 0;
      dom.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      velocityY = deltaX * 0.008;
      velocityX = deltaY * 0.008;
      rotY += velocityY;
      rotX += velocityX;
    };

    const onPointerUp = () => {
      isDragging = false;
      setIsInteracting(false);
      dom.style.cursor = 'grab';
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 6. Resize + Intersection Observer
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
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    visibilityObserver.observe(container);

    // 7. Render loop
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      if (prefersReducedMotion) {
        cardGroup.rotation.set(0.15, -0.25, 0);
        renderer.render(scene, camera);
        return;
      }

      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      // ليزر المسح مع هالته
      const laserY = Math.sin(t * 1.7) * 0.92;
      laserMesh.position.y = laserY;
      if (laserGlow) laserGlow.position.y = laserY;
      laserMat.opacity = 0.55 + 0.35 * Math.abs(Math.cos(t * 1.7));

      // حلقات الاستهداف
      reticleA.rotation.z = t * 1.1;
      reticleB.rotation.z = -t * 1.1 + Math.PI;

      // نبض القياسات الرئيسية والشبكة والأقواس
      keyMat.size = 0.02 + 0.005 * Math.sin(t * 2.4);
      meshMat.opacity = 0.22 + 0.12 * Math.sin(t * 1.6);
      bracketMat.opacity = 0.5 + 0.28 * Math.sin(t * 2.4);

      if (!isDragging) {
        velocityX *= 0.92;
        velocityY *= 0.92;
        rotX += velocityX;
        rotY += velocityY;
        rotY += delta * 0.22;
        rotX = THREE.MathUtils.lerp(rotX, Math.sin(t * 0.5) * 0.14, 0.04);
      }

      rotX = Math.max(-0.55, Math.min(0.55, rotX));
      cardGroup.rotation.x = rotX;
      cardGroup.rotation.y = rotY;

      gyroA.rotation.z = t * 0.25;
      gyroA.rotation.x = rotX * 0.5;
      gyroA.rotation.y = rotY * 0.5;
      gyroB.rotation.z = -t * 0.18;
      gyroB.rotation.x = Math.PI / 2.4 + rotX * 0.4;
      gyroB.rotation.y = rotY * 0.4;

      dustGroup.rotation.y = t * 0.35;

      cyanLight.position.set(
        -3 + Math.sin(t * 0.8) * 1.2,
        -2 + Math.cos(t * 0.6) * 1.0,
        3
      );

      renderer.render(scene, camera);
    };

    animate();

    // 8. تفريغ الموارد كاملاً عند الإتلاف
    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        } else if (obj instanceof THREE.Sprite) {
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
      cardTexture?.dispose();
      glowTexture?.dispose();
      renderer.dispose();

      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[230px] rounded-lg overflow-hidden bg-gradient-to-b from-[#101726] to-[#0a0e18] flex items-center justify-center border border-[#2C2C2C] select-none">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* Floating 3D Control Hints */}
      <div className="absolute top-2.5 start-2.5 z-10 flex items-center gap-1.5 bg-[#141414]/85 backdrop-blur-md px-2 py-1 rounded-lg border border-[#2C2C2C] text-[10px] text-white pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
        <span className="font-bold">مجسم ثلاثي الأبعاد تفاعلي</span>
      </div>

      <div className="absolute bottom-2.5 inset-x-0 mx-auto w-max z-10 bg-black/75 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/10 text-[10px] text-[#9E9E9E] pointer-events-none transition-opacity duration-200">
        <span>{isInteracting ? 'جاري التدوير والتكبير ...' : 'انقر واسحب للتدوير في الفضاء 3D'}</span>
      </div>
    </div>
  );
}
