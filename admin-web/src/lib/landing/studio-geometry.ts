import * as THREE from "three";

export function roundedStudioShape(
  width: number,
  height: number,
  radius: number,
) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - r);
  shape.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + height);
  shape.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

export function studioFaceGeometry(
  width: number,
  height: number,
  radius: number,
) {
  const geometry = new THREE.ShapeGeometry(
    roundedStudioShape(width, height, radius),
    20,
  );
  const positions = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(
      i,
      positions.getX(i) / width + 0.5,
      positions.getY(i) / height + 0.5,
    );
  }
  return geometry;
}

export function studioBodyGeometry(
  width: number,
  height: number,
  radius: number,
  depth: number,
) {
  const geometry = new THREE.ExtrudeGeometry(
    roundedStudioShape(width, height, radius),
    {
      depth,
      bevelEnabled: true,
      bevelThickness: Math.min(depth / 3, 0.008),
      bevelSize: Math.min(depth / 3, 0.008),
      bevelSegments: 3,
      curveSegments: 20,
      steps: 1,
    },
  );
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

export function studioCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  return { canvas, context };
}

export function studioTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function studioContactShadow(
  width: number,
  depth: number,
  opacity = 0.3,
) {
  const { canvas, context } = studioCanvas(128, 128);
  const gradient = context.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,0.85)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.38)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({
      map: studioTexture(canvas),
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function disposeStudioResources(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Points ||
      object instanceof THREE.Sprite
    ) {
      if (!(object instanceof THREE.Sprite)) geometries.add(object.geometry);
      const list = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of list) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    }
  });
  textures.forEach((texture) => {
    // تحرير مرجع صورة CanvasTexture يدوياً لأن dispose وحده لا يفكها في بعض المتصفحات
    if (texture instanceof THREE.CanvasTexture) texture.image = null;
    texture.dispose();
  });
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  scene.clear();
}
