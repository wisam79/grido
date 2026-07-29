import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

// 1. Interactive 3D Icon for Benefit Cards
export function Benefit3DIcon({ type }: { type: 'monitor' | 'edit' | 'shield' | 'zap' | 'printer' }) {
  return (
    <div className="w-14 h-14 relative flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 3, 3]} intensity={1.2} color="#60a5fa" />
        <pointLight position={[-2, -2, -2]} intensity={0.8} color="#2563eb" />
        
        <Float speed={2} rotationIntensity={0.6} floatIntensity={0.6}>
          <BenefitMesh type={type} />
        </Float>
      </Canvas>
    </div>
  );
}

function BenefitMesh({ type }: { type: 'monitor' | 'edit' | 'shield' | 'zap' | 'printer' }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.8;
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.2;
    }
  });

  if (type === 'shield') {
    return (
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.85, 0]} />
        <MeshWobbleMaterial color="#3b82f6" factor={0.2} speed={1.5} wireframe metalness={0.7} roughness={0.2} />
      </mesh>
    );
  }

  if (type === 'zap') {
    return (
      <mesh ref={meshRef}>
        <coneGeometry args={[0.75, 1.4, 4]} />
        <meshStandardMaterial color="#60a5fa" wireframe metalness={0.8} roughness={0.2} emissive="#2563eb" emissiveIntensity={0.4} />
      </mesh>
    );
  }

  if (type === 'monitor') {
    return (
      <mesh ref={meshRef}>
        <boxGeometry args={[1.2, 0.8, 0.2]} />
        <meshStandardMaterial color="#3b82f6" wireframe metalness={0.7} roughness={0.3} />
      </mesh>
    );
  }

  if (type === 'edit') {
    return (
      <mesh ref={meshRef}>
        <torusGeometry args={[0.65, 0.2, 12, 32]} />
        <meshStandardMaterial color="#60a5fa" wireframe metalness={0.8} roughness={0.2} />
      </mesh>
    );
  }

  // printer / default
  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.7, 0.7, 0.6, 6]} />
      <meshStandardMaterial color="#2563eb" wireframe metalness={0.9} roughness={0.1} />
    </mesh>
  );
}

// 2. Interactive 3D CMYK Layer Stack inside FeaturesTabs
export function CMYK3DStack() {
  return (
    <div className="w-full h-32 relative">
      <Canvas
        camera={{ position: [2.5, 2, 3.5], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <StackMesh />
      </Canvas>
    </div>
  );
}

function StackMesh() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.4) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Cyan Layer */}
      <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshStandardMaterial color="#06b6d4" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      {/* Magenta Layer */}
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshStandardMaterial color="#ec4899" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      {/* Yellow Layer */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshStandardMaterial color="#eab308" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      {/* Key (Black) Layer */}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshStandardMaterial color="#18181b" wireframe side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
