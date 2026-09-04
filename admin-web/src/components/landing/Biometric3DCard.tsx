import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function Biometric3DCard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    // 2. High-Performance Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x60a5fa, 2.0);
    dirLight.position.set(4, 5, 5);
    scene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x38bdf8, 2.5, 8);
    cyanLight.position.set(-3, -2, 3);
    scene.add(cyanLight);

    // 4. Main 3D Card Group
    const cardGroup = new THREE.Group();
    scene.add(cardGroup);

    // A. Card Body
    const cardGeom = new THREE.BoxGeometry(1.6, 2.1, 0.05);
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0x161f30,
      metalness: 0.8,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85,
    });
    const cardMesh = new THREE.Mesh(cardGeom, cardMat);
    cardGroup.add(cardMesh);

    // B. Glowing Card Edges
    const edgesGeom = new THREE.EdgesGeometry(cardGeom);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.8,
    });
    const edgesLines = new THREE.LineSegments(edgesGeom, edgesMat);
    cardGroup.add(edgesLines);

    // C. Biometric Face Target Ring
    const faceRingGeom = new THREE.RingGeometry(0.3, 0.33, 32);
    const faceRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const faceRingMesh = new THREE.Mesh(faceRingGeom, faceRingMat);
    faceRingMesh.position.set(0, 0.25, 0.035);
    cardGroup.add(faceRingMesh);

    // D. Biometric Keypoint Nodes (Dots on face landmarks)
    const pointsCount = 18;
    const pointsGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(pointsCount * 3);
    
    // Create geometric face landmark coordinates
    const coords = [
      [0, 0.45, 0.04],   // forehead
      [-0.18, 0.32, 0.04], [0.18, 0.32, 0.04], // eyes
      [0, 0.22, 0.04],   // nose
      [-0.12, 0.08, 0.04], [0.12, 0.08, 0.04], // mouth
      [0, -0.02, 0.04],  // chin
      [-0.28, 0.22, 0.04], [0.28, 0.22, 0.04], // cheeks
      [-0.22, -0.15, 0.04], [0.22, -0.15, 0.04], // jaw
      [-0.32, 0.35, 0.04], [0.32, 0.35, 0.04], // temples
      [-0.1, 0.38, 0.04], [0.1, 0.38, 0.04], // eyebrows
      [0, -0.25, 0.04],  // neck
      [-0.25, -0.35, 0.04], [0.25, -0.35, 0.04], // shoulders
    ];

    for (let i = 0; i < coords.length; i++) {
      positions[i * 3] = coords[i][0];
      positions[i * 3 + 1] = coords[i][1];
      positions[i * 3 + 2] = coords[i][2];
    }
    pointsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pointsMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.045,
      blending: THREE.AdditiveBlending,
    });
    const landmarkPoints = new THREE.Points(pointsGeom, pointsMat);
    cardGroup.add(landmarkPoints);

    // E. 3D Sweeping Laser Beam
    const laserGeom = new THREE.CylinderGeometry(0.012, 0.012, 1.7, 16);
    laserGeom.rotateZ(Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
    });
    const laserMesh = new THREE.Mesh(laserGeom, laserMat);
    laserMesh.position.z = 0.04;
    cardGroup.add(laserMesh);

    // F. Outer Floating Holographic Gyro Ring
    const gyroGeom = new THREE.TorusGeometry(1.4, 0.012, 16, 64);
    const gyroMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.5,
      wireframe: true,
    });
    const gyroMesh = new THREE.Mesh(gyroGeom, gyroMat);
    scene.add(gyroMesh);

    // 5. Interactive Drag to Rotate Logic
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
    };

    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    dom.style.cursor = 'grab';
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 6. Resize & Observer
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // 7. Render Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();

      // Laser Scanner Sweep
      laserMesh.position.y = Math.sin(elapsed * 2.5) * 0.95;

      // Inertia & Damping
      if (!isDragging) {
        velocityX *= 0.92;
        velocityY *= 0.92;
        rotX += velocityX;
        rotY += velocityY;

        // Gentle auto rotation when resting
        rotY += 0.004;
        rotX = THREE.MathUtils.lerp(rotX, Math.sin(elapsed * 0.6) * 0.15, 0.03);
      }

      // Clamp X rotation to prevent flipping upside down
      rotX = Math.max(-0.6, Math.min(0.6, rotX));

      cardGroup.rotation.x = rotX;
      cardGroup.rotation.y = rotY;

      // Gyro Ring counter-rotation
      gyroMesh.rotation.z = elapsed * 0.2;
      gyroMesh.rotation.x = rotX * 0.5;
      gyroMesh.rotation.y = rotY * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      observer.disconnect();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
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
        <span>{isInteracting ? 'جاري التدوير والتكبير...' : 'انقر واسحب للتدوير في الفضاء 3D'}</span>
      </div>
    </div>
  );
}
