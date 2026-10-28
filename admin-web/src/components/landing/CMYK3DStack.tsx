import * as THREE from "three";
import { StudioSceneFrame } from "./StudioSceneFrame";
import { rgbToCmyk } from "../../lib/landing/scene-math";
import {
  studioBodyGeometry,
  studioCanvas,
  studioContactShadow,
  studioFaceGeometry,
  studioTexture,
} from "../../lib/landing/studio-geometry";
import type { StudioFrame, StudioScene } from "../../lib/landing/studio-scene";

const CAMERA: [number, number, number] = [3.2, 2.8, 5];
const VIEW = { width: 4.7, height: 3.55 };
const PLATE_WIDTH = 2.55;
const PLATE_HEIGHT = 1.8;
const INKS = [
  { label: "C", color: "#179db7", rgb: [12, 156, 184] },
  { label: "M", color: "#d44f88", rgb: [202, 53, 114] },
  { label: "Y", color: "#d9ac38", rgb: [231, 183, 37] },
  { label: "K", color: "#6f7b8a", rgb: [49, 57, 71] },
];

function drawSheet(
  context: CanvasRenderingContext2D,
  portrait?: HTMLImageElement,
) {
  context.fillStyle = "#faf9f6";
  context.fillRect(0, 0, 1020, 720);
  context.fillStyle = "#3f4f5b";
  context.font = "500 19px monospace";
  context.fillText("GRIDO / PRINT LAYOUT", 68, 48);
  context.textAlign = "right";
  context.font = "500 15px monospace";
  context.fillText("CMYK / PREVIEW", 952, 48);
  context.textAlign = "left";

  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 4; column++) {
      const x = 71 + column * 223;
      const y = 86 + row * 269;
      context.save();
      context.beginPath();
      context.rect(x, y, 207, 251);
      context.clip();
      context.fillStyle = "#c8dce6";
      context.fillRect(x, y, 207, 251);
      if (portrait) {
        const scale = Math.max(
          207 / portrait.naturalWidth,
          251 / portrait.naturalHeight,
        );
        const width = portrait.naturalWidth * scale;
        const height = portrait.naturalHeight * scale;
        context.drawImage(
          portrait,
          x + (207 - width) / 2,
          y + (251 - height) / 2,
          width,
          height,
        );
      } else {
        context.fillStyle = "#7895ab";
        context.beginPath();
        context.ellipse(x + 104, y + 90, 39, 47, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#445c72";
        context.beginPath();
        context.ellipse(x + 104, y + 229, 89, 78, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
      context.strokeStyle = "#78909d";
      context.lineWidth = 1;
      for (const px of [x, x + 207]) {
        for (const py of [y, y + 251]) {
          const dx = px === x ? -1 : 1;
          const dy = py === y ? -1 : 1;
          context.beginPath();
          context.moveTo(px + dx * 3, py);
          context.lineTo(px + dx * 9, py);
          context.moveTo(px, py + dy * 3);
          context.lineTo(px, py + dy * 9);
          context.stroke();
        }
      }
    }
  }

  for (const x of [33, 987]) {
    for (const y of [76, 637]) {
      context.strokeStyle = "#7b8992";
      context.beginPath();
      context.arc(x, y, 6, 0, Math.PI * 2);
      context.moveTo(x - 10, y);
      context.lineTo(x + 10, y);
      context.moveTo(x, y - 10);
      context.lineTo(x, y + 10);
      context.stroke();
    }
  }
  INKS.forEach((ink, index) => {
    context.fillStyle = ink.color;
    context.fillRect(71 + index * 31, 660, 24, 16);
  });
  context.fillStyle = "#7b8992";
  context.font = "500 15px monospace";
  context.textAlign = "right";
  context.fillText("COLOR SEPARATION STUDY", 950, 674);
  context.textAlign = "left";
}

function drawSeparations(
  source: HTMLCanvasElement,
  targets: CanvasRenderingContext2D[],
) {
  const { canvas, context } = studioCanvas(510, 360);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const outputs = targets.map((target) =>
    target.createImageData(canvas.width, canvas.height),
  );
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    const amounts = rgbToCmyk(
      pixels.data[offset],
      pixels.data[offset + 1],
      pixels.data[offset + 2],
    );
    outputs.forEach((output, index) => {
      const [r, g, b] = INKS[index].rgb;
      output.data[offset] = r;
      output.data[offset + 1] = g;
      output.data[offset + 2] = b;
      output.data[offset + 3] = Math.round(amounts[index] * 210);
    });
  }
  targets.forEach((target, index) => target.putImageData(outputs[index], 0, 0));
}

function buildCmykStack(studio: StudioScene) {
  const { scene } = studio;
  const assembly = new THREE.Group();
  scene.add(assembly);
  const sheet = studioCanvas(1020, 720);
  drawSheet(sheet.context);
  const paperTexture = studioTexture(sheet.canvas);
  const separations = INKS.map(() => studioCanvas(510, 360));
  drawSeparations(
    sheet.canvas,
    separations.map(({ context }) => context),
  );
  const separationTextures = separations.map(({ canvas }) =>
    studioTexture(canvas),
  );

  const bodyGeometry = studioBodyGeometry(
    PLATE_WIDTH,
    PLATE_HEIGHT,
    0.045,
    0.014,
  );
  const faceGeometry = studioFaceGeometry(PLATE_WIDTH, PLATE_HEIGHT, 0.045);
  const paper = new THREE.Group();
  paper.rotation.x = -Math.PI / 2;
  paper.position.y = -0.76;
  paper.add(
    new THREE.Mesh(
      bodyGeometry,
      new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.85 }),
    ),
  );
  const print = new THREE.Mesh(
    faceGeometry,
    new THREE.MeshStandardMaterial({ map: paperTexture, roughness: 0.8 }),
  );
  print.position.z = 0.013;
  paper.add(print);
  assembly.add(paper);

  const plates = INKS.map((ink, index) => {
    const group = new THREE.Group();
    group.rotation.x = -Math.PI / 2;
    group.position.y = 0.84 - index * 0.36;
    group.position.x = (1.5 - index) * 0.075;
    const face = new THREE.Mesh(
      faceGeometry,
      new THREE.MeshPhysicalMaterial({
        color: ink.color,
        roughness: 0.34,
        metalness: 0.12,
        clearcoat: 0.55,
        clearcoatRoughness: 0.28,
        transparent: true,
        opacity: index === 3 ? 0.14 : 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    // Transparent sheets are ordered from the paper upward for this bounded camera view.
    face.renderOrder = 10 - index * 2;
    group.add(face);
    const separation = new THREE.Mesh(
      faceGeometry,
      new THREE.MeshBasicMaterial({
        map: separationTextures[index],
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    separation.position.z = 0.009;
    separation.renderOrder = face.renderOrder + 1;
    group.add(separation);

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeometry, 28),
      new THREE.LineBasicMaterial({
        color: ink.color,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      }),
    );
    edge.renderOrder = face.renderOrder + 1;
    group.add(edge);

    const { canvas, context } = studioCanvas(96, 96);
    context.fillStyle = "#20262d";
    context.beginPath();
    context.roundRect(1, 1, 94, 94, 18);
    context.fill();
    context.strokeStyle = ink.color;
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = index === 3 ? "#d9e0e9" : ink.color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "600 48px sans-serif";
    context.fillText(ink.label, 48, 52);
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: studioTexture(canvas),
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    label.scale.set(0.21, 0.21, 1);
    label.position.set(
      -PLATE_WIDTH / 2 - 0.17,
      group.position.y,
      PLATE_HEIGHT / 2,
    );
    label.renderOrder = 30;
    assembly.add(label);
    assembly.add(group);
    return { group, label, height: group.position.y };
  });

  const shadow = studioContactShadow(4.4, 3.2, 0.46);
  shadow.position.y = -0.81;
  assembly.add(shadow);

  studio.loadImage("/sample-passport-after.png", (portrait) => {
    drawSheet(sheet.context, portrait);
    drawSeparations(
      sheet.canvas,
      separations.map(({ context }) => context),
    );
    paperTexture.needsUpdate = true;
    separationTextures.forEach((texture) => {
      texture.needsUpdate = true;
    });
  });

  return ({ time, pointer }: StudioFrame) => {
    assembly.rotation.y = -0.12 + pointer.x * 0.14;
    assembly.rotation.x = pointer.y * 0.06;
    plates.forEach(({ group, label, height }, index) => {
      const lift = Math.sin(time * 0.65) * 0.02 * (4 - index);
      group.position.y = height + lift;
      label.position.y = group.position.y;
    });
  };
}

export function CMYK3DStack() {
  return (
    <StudioSceneFrame
      label="طبقات توضيحية لفصل ألوان الطباعة CMYK"
      fallbackImage="/studio-cutter-sheet.jpg"
      camera={CAMERA}
      view={VIEW}
      build={buildCmykStack}
    />
  );
}
