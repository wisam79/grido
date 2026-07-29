import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshWobbleMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function FloatingStudioElements() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const cubeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Parallax tracking with mouse cursor
    if (groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, state.pointer.y * 0.15, 0.05);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, state.pointer.x * 0.2, 0.05);
    }
    // Rotating aperture ring
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.2;
      ringRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    }
    // Floating Studio Lens Box
    if (cubeRef.current) {
      cubeRef.current.rotation.y = t * 0.4;
      cubeRef.current.rotation.x = t * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. Main Floating Aperture Ring */}
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.8}>
        <mesh ref={ringRef} position={[2, 0.5, -1]}>
          <torusGeometry args={[1.8, 0.04, 16, 64]} />
          <meshStandardMaterial
            color="#3b82f6"
            metalness={0.8}
            roughness={0.2}
            wireframe
            emissive="#1d4ed8"
            emissiveIntensity={0.5}
          />
        </mesh>
      </Float>

      {/* 2. Secondary Inner Glowing Ring */}
      <Float speed={2} rotationIntensity={0.8} floatIntensity={1}>
        <mesh position={[-2.2, -0.8, -1.5]}>
          <torusGeometry args={[1.2, 0.03, 16, 48]} />
          <meshStandardMaterial
            color="#60a5fa"
            metalness={0.9}
            roughness={0.1}
            emissive="#2563eb"
            emissiveIntensity={0.8}
          />
        </mesh>
      </Float>

      {/* 3. Floating Interactive Studio Wobble Crystal */}
      <Float speed={2.5} rotationIntensity={1} floatIntensity={1.2}>
        <mesh ref={cubeRef} position={[2.8, -1.2, 0]}>
          <octahedronGeometry args={[0.5, 0]} />
          <MeshWobbleMaterial
            color="#60a5fa"
            factor={0.4}
            speed={2}
            wireframe
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      </Float>

      {/* 4. Studio Floating Photo Card Mesh */}
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
        <mesh position={[-2.5, 1.2, -0.5]} rotation={[0.2, 0.4, -0.1]}>
          <boxGeometry args={[1.2, 1.5, 0.05]} />
          <meshStandardMaterial
            color="#1e1e24"
            metalness={0.5}
            roughness={0.3}
            wireframe={false}
          />
        </mesh>
      </Float>

      {/* 5. Studio Ambient Particles / Dust */}
      <Sparkles
        count={60}
        scale={[10, 8, 5]}
        size={2.5}
        speed={0.4}
        opacity={0.6}
        color="#60a5fa"
      />
    </group>
  );
}

export function StudioHero3D() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-70">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#60a5fa" />
        <pointLight position={[-10, -10, -5]} intensity={1} color="#1d4ed8" />
        <FloatingStudioElements />
      </Canvas>
    </div>
  );
}
