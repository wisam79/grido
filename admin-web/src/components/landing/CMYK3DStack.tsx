import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function CMYK3DStack() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(3.2, 2.4, 3.8);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    // 4. CMYK Plates Group
    const stackGroup = new THREE.Group();
    scene.add(stackGroup);

    const plateWidth = 2.2;
    const plateHeight = 1.5;
    const plateGeom = new THREE.PlaneGeometry(plateWidth, plateHeight);

    // Cyan Plate
    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      metalness: 0.2,
      roughness: 0.3,
    });
    const cyanMesh = new THREE.Mesh(plateGeom, cyanMat);
    cyanMesh.rotation.x = -Math.PI / 2;
    stackGroup.add(cyanMesh);

    // Magenta Plate
    const magMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      metalness: 0.2,
      roughness: 0.3,
    });
    const magMesh = new THREE.Mesh(plateGeom, magMat);
    magMesh.rotation.x = -Math.PI / 2;
    stackGroup.add(magMesh);

    // Yellow Plate
    const yelMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      metalness: 0.2,
      roughness: 0.3,
    });
    const yelMesh = new THREE.Mesh(plateGeom, yelMat);
    yelMesh.rotation.x = -Math.PI / 2;
    stackGroup.add(yelMesh);

    // Key (Black) Plate with Cutting Guides
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      side: THREE.DoubleSide,
      metalness: 0.5,
      roughness: 0.5,
    });
    const keyMesh = new THREE.Mesh(plateGeom, keyMat);
    keyMesh.rotation.x = -Math.PI / 2;
    stackGroup.add(keyMesh);

    // Outer Wireframe Bounding Cage (Simulating paper margins)
    const cageGeom = new THREE.BoxGeometry(plateWidth + 0.1, 1.4, plateHeight + 0.1);
    const cageMat = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.4,
    });
    const cageMesh = new THREE.LineSegments(new THREE.EdgesGeometry(cageGeom), cageMat);
    stackGroup.add(cageMesh);

    // 5. Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseX = (x - 0.5) * 2;
      mouseY = (y - 0.5) * 2;
    };
    container.addEventListener('mousemove', onMouseMove);

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
        entries.forEach((e) => {
          isVisible = e.isIntersecting;
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

      const t = clock.getElapsedTime();

      // Dynamic plate separation (breathing stack effect)
      const spread = 0.32 + Math.sin(t * 1.5) * 0.08;
      cyanMesh.position.y = spread * 1.5;
      magMesh.position.y = spread * 0.5;
      yelMesh.position.y = -spread * 0.5;
      keyMesh.position.y = -spread * 1.5;

      // Group rotation with mouse damping
      const targetRotY = t * 0.3 + mouseX * 0.5;
      const targetRotX = mouseY * 0.3;

      stackGroup.rotation.y += (targetRotY - stackGroup.rotation.y) * 0.05;
      stackGroup.rotation.x += (targetRotX - stackGroup.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      observer.disconnect();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
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
