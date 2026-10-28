import * as THREE from "three";
import { StudioSceneFrame } from "./StudioSceneFrame";
import {
  studioBodyGeometry,
  studioCanvas,
  studioContactShadow,
  studioFaceGeometry,
  studioTexture,
} from "../../lib/landing/studio-geometry";
import type { StudioFrame, StudioScene } from "../../lib/landing/studio-scene";

const CAMERA: [number, number, number] = [0, 0.4, 7];
const VIEW = { width: 3.7, height: 2.6 };
const CARD_WIDTH = 2.8;
const CARD_HEIGHT = 1.78;

function drawCard(
  context: CanvasRenderingContext2D,
  portrait?: HTMLImageElement,
) {
  context.clearRect(0, 0, 1120, 712);
  context.fillStyle = "#e9edf0";
  context.fillRect(0, 0, 1120, 712);
  const wash = context.createLinearGradient(0, 0, 1120, 712);
  wash.addColorStop(0, "#f9faf9");
  wash.addColorStop(0.6, "#edf1f4");
  wash.addColorStop(1, "#dce5e8");
  context.fillStyle = wash;
  context.fillRect(0, 0, 1120, 712);

  context.save();
  context.beginPath();
  context.rect(440, 155, 625, 370);
  context.clip();
  context.strokeStyle = "rgba(96,132,154,0.1)";
  context.lineWidth = 1.2;
  for (let row = 0; row < 16; row++) {
    context.beginPath();
    for (let x = 0; x <= 1120; x += 8) {
      const y = 180 + row * 22 + Math.sin(x / 80 + row * 0.35) * 30;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();

  context.fillStyle = "#142b45";
  context.fillRect(0, 0, 1120, 124);
  context.fillStyle = "#f2f6fa";
  context.font = "600 34px sans-serif";
  context.fillText("GRIDO", 56, 73);
  context.font = "500 17px sans-serif";
  context.fillStyle = "#b4c9db";
  context.fillText("IDENTITY STUDIO", 223, 71);
  context.textAlign = "right";
  context.font = "500 15px monospace";
  context.fillText("SPECIMEN / 01", 1060, 71);
  context.textAlign = "left";

  context.save();
  context.beginPath();
  context.roundRect(56, 162, 292, 366, 12);
  context.clip();
  context.fillStyle = "#d0dfe7";
  context.fillRect(56, 162, 292, 366);
  if (portrait) {
    const scale = Math.max(
      292 / portrait.naturalWidth,
      366 / portrait.naturalHeight,
    );
    const width = portrait.naturalWidth * scale;
    const height = portrait.naturalHeight * scale;
    context.drawImage(
      portrait,
      56 + (292 - width) / 2,
      162 + (366 - height) / 2,
      width,
      height,
    );
  } else {
    context.fillStyle = "#acbfcb";
    context.beginPath();
    context.ellipse(202, 291, 65, 79, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(202, 505, 132, 109, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  context.fillStyle = "#60768b";
  context.font = "500 15px monospace";
  context.fillText("PHOTO FORMAT", 400, 196);
  context.fillText("WORKSPACE", 400, 306);
  context.fillText("DOCUMENT", 400, 402);
  context.fillStyle = "#203c55";
  context.font = "500 34px sans-serif";
  context.fillText("35 × 45 mm", 400, 243);
  context.font = "500 25px sans-serif";
  context.fillText("Grido Studio", 400, 347);
  context.fillText("Photo preparation", 400, 443);

  context.save();
  context.translate(906, 402);
  const foil = context.createLinearGradient(0, 0, 150, 96);
  foil.addColorStop(0, "#a0c4ba");
  foil.addColorStop(0.35, "#dceacb");
  foil.addColorStop(0.7, "#aabbd7");
  foil.addColorStop(1, "#e6d8b5");
  context.fillStyle = foil;
  context.beginPath();
  context.roundRect(0, 0, 150, 96, 12);
  context.fill();
  context.strokeStyle = "rgba(69,105,123,0.3)";
  context.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    context.beginPath();
    context.ellipse(75, 48, 20 + i * 7, 20 + i * 3, -0.35, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();

  context.fillStyle = "rgba(88,107,128,0.18)";
  context.fillRect(56, 565, 1008, 1);
  context.font = "500 17px monospace";
  context.fillStyle = "#778698";
  context.fillText("GRIDO<STUDIO<<PHOTO<LAYOUT<<<<<<<<<<<<", 56, 610);
  context.fillText("SAMPLE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<", 56, 644);
  context.fillStyle = "#547693";
  for (let i = 0; i < 33; i++) {
    const width = i % 4 === 0 ? 4 : 2;
    context.fillRect(874 + i * 5, 590, width, 48 - (i % 3) * 4);
  }
}

function buildBiometricCard(studio: StudioScene) {
  const { scene } = studio;
  const card = new THREE.Group();
  scene.add(card);

  const body = new THREE.Mesh(
    studioBodyGeometry(CARD_WIDTH, CARD_HEIGHT, 0.115, 0.042),
    new THREE.MeshPhysicalMaterial({
      color: 0xc5cdd2,
      metalness: 0.32,
      roughness: 0.32,
      clearcoat: 0.7,
      clearcoatRoughness: 0.28,
    }),
  );
  card.add(body);

  const { canvas, context } = studioCanvas(1120, 712);
  drawCard(context);
  const texture = studioTexture(canvas);
  const front = new THREE.Mesh(
    studioFaceGeometry(CARD_WIDTH, CARD_HEIGHT, 0.115),
    new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.03,
      clearcoat: 0.48,
      clearcoatRoughness: 0.3,
    }),
  );
  front.position.z = 0.039;
  card.add(front);
  studio.loadImage("/sample-passport-after.png", (image) => {
    drawCard(context, image);
    texture.needsUpdate = true;
  });

  const chip = new THREE.Group();
  chip.position.set(1.04, 0.25, 0.049);
  chip.add(
    new THREE.Mesh(
      studioBodyGeometry(0.28, 0.22, 0.026, 0.008),
      new THREE.MeshPhysicalMaterial({
        color: 0xc5ae72,
        metalness: 0.82,
        roughness: 0.28,
        clearcoat: 0.3,
      }),
    ),
  );
  const chipLines = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.046, -0.1, 0.008),
    new THREE.Vector3(-0.046, 0.1, 0.008),
    new THREE.Vector3(0.046, -0.1, 0.008),
    new THREE.Vector3(0.046, 0.1, 0.008),
    new THREE.Vector3(-0.13, -0.035, 0.008),
    new THREE.Vector3(0.13, -0.035, 0.008),
    new THREE.Vector3(-0.13, 0.035, 0.008),
    new THREE.Vector3(0.13, 0.035, 0.008),
  ]);
  chip.add(
    new THREE.LineSegments(
      chipLines,
      new THREE.LineBasicMaterial({
        color: 0x7b713f,
        transparent: true,
        opacity: 0.7,
      }),
    ),
  );
  card.add(chip);

  const portraitFrame = new THREE.Group();
  portraitFrame.position.set(-0.895, 0.03, 0.048);
  card.add(portraitFrame);
  const corners: number[] = [];
  for (const x of [-0.35, 0.35]) {
    for (const y of [-0.45, 0.45]) {
      corners.push(
        x,
        y - Math.sign(y) * 0.09,
        0,
        x,
        y,
        0,
        x,
        y,
        0,
        x - Math.sign(x) * 0.09,
        y,
        0,
      );
    }
  }
  const brackets = new THREE.BufferGeometry();
  brackets.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(corners, 3),
  );
  portraitFrame.add(
    new THREE.LineSegments(
      brackets,
      new THREE.LineBasicMaterial({
        color: 0x2d9fc1,
        transparent: true,
        opacity: 0.85,
      }),
    ),
  );

  const { canvas: scanCanvas, context: scanContext } = studioCanvas(16, 128);
  const scanGradient = scanContext.createLinearGradient(0, 0, 0, 128);
  scanGradient.addColorStop(0, "rgba(65,170,198,0)");
  scanGradient.addColorStop(0.92, "rgba(65,170,198,0.1)");
  scanGradient.addColorStop(0.97, "rgba(141,224,233,0.65)");
  scanGradient.addColorStop(1, "rgba(141,224,233,0)");
  scanContext.fillStyle = scanGradient;
  scanContext.fillRect(0, 0, 16, 128);
  const scan = new THREE.Mesh(
    new THREE.PlaneGeometry(0.67, 0.2),
    new THREE.MeshBasicMaterial({
      map: studioTexture(scanCanvas),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  scan.position.z = 0.004;
  portraitFrame.add(scan);

  const shadow = studioContactShadow(4.1, 2.5, 0.5);
  shadow.position.set(0, -1.13, -0.12);
  scene.add(shadow);

  return ({ time, pointer, animated }: StudioFrame) => {
    card.rotation.set(-0.1 + pointer.y * 0.12, -0.24 + pointer.x * 0.3, -0.035);
    card.position.y = Math.sin(time * 0.7) * 0.026;
    scan.visible = animated;
    scan.position.y = Math.sin(time * 0.85) * 0.31;
  };
}

export function Biometric3DCard() {
  return (
    <StudioSceneFrame
      label="بطاقة توضيحية لتجهيز صور الهوية"
      fallbackImage="/biometric-cutout-blend.jpg"
      camera={CAMERA}
      view={VIEW}
      build={buildBiometricCard}
    />
  );
}
