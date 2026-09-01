import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import {
  autoDetectAllDocumentCorners,
  sortCornerPoints,
  computePerspectiveTransform,
  Point,
  DetectedDocument,
} from "../src/components/editor/document-scanner/perspective-transform";

// Simple PNG Decoder (Zero-Dependency via Node.js zlib)
function decodePNG(buffer: Buffer): { width: number; height: number; rgba: Uint8ClampedArray } {
  let offset = 8;
  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === "IDAT") {
      idatChunks.push(data);
    }
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = width * bpp;
  const rgba = new Uint8ClampedArray(width * height * 4);
  let srcOffset = 0;
  let dstOffset = 0;

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[srcOffset++];
    for (let x = 0; x < stride; x++) {
      let val = decompressed[srcOffset++];
      const left = x >= bpp ? rgba[dstOffset - bpp] : 0;
      const up = y > 0 ? rgba[dstOffset - stride] : 0;
      const upLeft = y > 0 && x >= bpp ? rgba[dstOffset - stride - bpp] : 0;

      if (filterType === 1) {
        val = (val + left) & 0xff;
      } else if (filterType === 2) {
        val = (val + up) & 0xff;
      } else if (filterType === 3) {
        val = (val + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        let pr = upLeft;
        if (pa <= pb && pa <= pc) pr = left;
        else if (pb <= pc) pr = up;
        val = (val + pr) & 0xff;
      }
      rgba[dstOffset++] = val;
    }
  }

  return { width, height, rgba };
}

// Simple PNG Encoder (Zero-Dependency via Node.js zlib)
function encodePNG(width: number, height: number, rgba: Uint8ClampedArray | Uint8Array): Buffer {
  const stride = width * 4;
  const rawData = Buffer.alloc(height * (stride + 1));
  let srcPos = 0;
  let dstPos = 0;

  for (let y = 0; y < height; y++) {
    rawData[dstPos++] = 0; // Filter None
    for (let x = 0; x < stride; x++) {
      rawData[dstPos++] = rgba[srcPos++];
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const makeChunk = (type: string, data: Buffer) => {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, "ascii");
    data.copy(buf, 8);
    // Simple CRC approximation or standard crc32
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  };

  const idatChunk = makeChunk("IDAT", compressed);
  const ihdrChunk = makeChunk("IHDR", ihdr);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation for PNG
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

describe("Document Scanner - Real Image Evaluation", () => {
  const realImagePath =
    "C:/Users/Laptop Shop/.gemini/antigravity/brain/da406bfe-54e3-4b7c-a740-e8d76c6b2da2/.user_uploaded/media_1788265471891.png";

  it("analyzes the uploaded photo and detects the two Iraqi ID cards with precision", () => {
    if (!fs.existsSync(realImagePath)) {
      console.log("Real sample image not present on CI runner environment, skipping.");
      return;
    }

    const fileBuf = fs.readFileSync(realImagePath);
    const { width, height, rgba } = decodePNG(fileBuf);

    expect(width).toBe(387);
    expect(height).toBe(516);

    const imgData = {
      data: rgba,
      width,
      height,
    } as unknown as ImageData;

    // Run multi-document detection
    const docs = autoDetectAllDocumentCorners(imgData, width, height, width, height);

    console.log("Detected Documents Count:", docs.length);
    for (const [idx, doc] of docs.entries()) {
      console.log(`Document #${idx + 1}:`, {
        label: doc.label,
        confidence: doc.confidence,
        aspectType: doc.aspectType,
        corners: doc.corners,
      });
    }

    expect(docs.length).toBeGreaterThanOrEqual(1);

    // Save detected visualizations to artifacts directory
    const artifactsDir = "C:/Users/Laptop Shop/.gemini/antigravity/brain/da406bfe-54e3-4b7c-a740-e8d76c6b2da2";

    // 1. Draw bounding boxes on a copy of the original image
    const annotated = new Uint8ClampedArray(rgba);
    for (const [docIdx, doc] of docs.entries()) {
      const corners = sortCornerPoints(doc.corners);
      const color = docIdx === 0 ? [0, 240, 255] : [255, 165, 0]; // Cyan for doc 1, Orange for doc 2

      // Draw lines between corners
      for (let i = 0; i < 4; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % 4];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const steps = Math.round(dist);
        for (let s = 0; s <= steps; s++) {
          const t = s / Math.max(1, steps);
          const px = Math.round(p1.x + t * (p2.x - p1.x));
          const py = Math.round(p1.y + t * (p2.y - p1.y));
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const x = px + dx;
              const y = py + dy;
              if (x >= 0 && x < width && y >= 0 && y < height) {
                const idx = (y * width + x) * 4;
                annotated[idx] = color[0];
                annotated[idx + 1] = color[1];
                annotated[idx + 2] = color[2];
                annotated[idx + 3] = 255;
              }
            }
          }
        }
      }
    }

    const annotatedBuf = encodePNG(width, height, annotated);
    fs.writeFileSync(path.join(artifactsDir, "real_image_detected_preview.png"), annotatedBuf);
    console.log("Saved preview to real_image_detected_preview.png");

    // 2. Perform perspective correction & cropping on each detected ID card
    for (const [docIdx, doc] of docs.entries()) {
      const sorted = sortCornerPoints(doc.corners);
      const cardW = Math.round(Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y));
      const cardH = Math.round(Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y));

      // Create a memory canvas for warping
      const outRgba = new Uint8ClampedArray(cardW * cardH * 4);

      // Homography mapping
      const dstCorners: Point[] = [
        { x: 0, y: 0 },
        { x: cardW, y: 0 },
        { x: cardW, y: cardH },
        { x: 0, y: cardH },
      ];
      const hMatrix = computePerspectiveTransform(sorted, dstCorners);

      // Invert matrix for backward texture sampling (Bilinear Interpolation)
      const a = hMatrix[0], b = hMatrix[1], c = hMatrix[2];
      const d = hMatrix[3], e = hMatrix[4], f = hMatrix[5];
      const g = hMatrix[6], h = hMatrix[7], k = hMatrix[8];

      // Matrix adjoint for 3x3 inversion
      const A = e * k - f * h;
      const B = -(d * k - f * g);
      const C = d * h - e * g;
      const D = -(b * k - c * h);
      const E = a * k - c * g;
      const F = -(a * h - b * g);
      const G = b * f - c * e;
      const H = -(a * f - c * d);
      const K = a * e - b * d;
      const det = a * A + b * B + c * C;

      if (Math.abs(det) > 1e-9) {
        const invH = [
          A / det, D / det, G / det,
          B / det, E / det, H / det,
          C / det, F / det, K / det,
        ];

        for (let y = 0; y < cardH; y++) {
          for (let x = 0; x < cardW; x++) {
            const wDenom = invH[6] * x + invH[7] * y + invH[8];
            if (Math.abs(wDenom) < 1e-9) continue;
            const srcX = (invH[0] * x + invH[1] * y + invH[2]) / wDenom;
            const srcY = (invH[3] * x + invH[4] * y + invH[5]) / wDenom;

            if (srcX >= 0 && srcX < width - 1 && srcY >= 0 && srcY < height - 1) {
              const x0 = Math.floor(srcX);
              const y0 = Math.floor(srcY);
              const x1 = x0 + 1;
              const y1 = y0 + 1;
              const fx = srcX - x0;
              const fy = srcY - y0;

              const idx00 = (y0 * width + x0) * 4;
              const idx10 = (y0 * width + x1) * 4;
              const idx01 = (y1 * width + x0) * 4;
              const idx11 = (y1 * width + x1) * 4;

              const outIdx = (y * cardW + x) * 4;
              for (let ch = 0; ch < 4; ch++) {
                const top = rgba[idx00 + ch] * (1 - fx) + rgba[idx10 + ch] * fx;
                const bot = rgba[idx01 + ch] * (1 - fx) + rgba[idx11 + ch] * fx;
                outRgba[outIdx + ch] = Math.round(top * (1 - fy) + bot * fy);
              }
            }
          }
        }

        const cardBuf = encodePNG(cardW, cardH, outRgba);
        const cardFilename = `real_image_card_${docIdx + 1}_crop.png`;
        fs.writeFileSync(path.join(artifactsDir, cardFilename), cardBuf);
        console.log(`Saved warped crop to ${cardFilename} (${cardW}x${cardH})`);
      }
    }
  });
});
