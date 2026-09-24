import { describe, it, expect } from "vitest";
import {
  fuseDetections,
  ML_CONFIRM_IOU,
  ML_MISS_IOU,
  ML_ADD_MIN_SCORE,
  ML_STANDALONE_MIN,
  ML_GRACE_MS,
} from "../core/detect-fusion";
import { Point, DetectionResult, DetectedDocument, DetectionMode } from "../core/types";

function rect(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

function doc(corners: Point[], confidence: number, id = "doc-1"): DetectedDocument {
  return {
    id,
    corners,
    confidence,
    label: "مستند 1",
    aspectType: "free",
  };
}

function classicalResult(
  docs: DetectedDocument[],
  method: DetectionResult["method"] = "js"
): DetectionResult {
  const primary = docs[0];
  return {
    corners: primary.corners,
    confidence: primary.confidence,
    method,
    documents: docs,
  };
}

function mlResult(corners: Point[], score: number): DetectionResult {
  return {
    corners,
    confidence: score,
    method: "scanic",
    documents: [doc(corners, score)],
  };
}

describe("detect-fusion — ML verifier fusion", () => {
  it("uses the configured thresholds", () => {
    expect(ML_CONFIRM_IOU).toBeGreaterThan(ML_MISS_IOU);
    expect(ML_ADD_MIN_SCORE).toBeGreaterThan(ML_STANDALONE_MIN);
    expect(ML_GRACE_MS).toBeGreaterThan(0);
  });

  it("returns classical untouched when ML is null or invalid", () => {
    const classical = classicalResult([doc(rect(10, 10, 100, 100), 0.6)]);
    expect(fuseDetections(null, classical, "single")).toBe(classical);
    expect(
      fuseDetections({ corners: [], confidence: 0.9, method: "scanic", documents: [] }, classical, "single")
    ).toBe(classical);
  });

  it("replaces default inset with confident ML (classical found nothing real)", () => {
    const inset = rect(10, 10, 180, 180);
    const classical = classicalResult([doc(inset, 0.5)], "default");
    const mlQuad = rect(40, 30, 120, 140);
    const fused = fuseDetections(mlResult(mlQuad, 0.8), classical, "single");

    expect(fused.method).toBe("scanic");
    expect(fused.confidence).toBeCloseTo(0.8, 5);
    expect(fused.corners).toEqual(mlQuad);
  });

  it("keeps default inset when ML is weaker than the standalone gate", () => {
    const classical = classicalResult([doc(rect(10, 10, 180, 180), 0.5)], "default");
    const fused = fuseDetections(mlResult(rect(40, 30, 120, 140), ML_STANDALONE_MIN - 0.01), classical, "single");
    expect(fused).toBe(classical);
  });

  it("keeps a strong default-inset detection when ML scores lower", () => {
    const classical = classicalResult([doc(rect(5, 5, 190, 190), 0.7)], "default");
    const fused = fuseDetections(mlResult(rect(40, 30, 120, 140), 0.6), classical, "single");
    expect(fused).toBe(classical);
  });

  it("confirm: boosts matching classical candidate without touching its geometry", () => {
    const quad = rect(40, 30, 160, 120);
    const classical = classicalResult([doc(quad, 0.5)]);
    const fused = fuseDetections(mlResult(rect(42, 32, 156, 116), 0.9), classical, "multi");

    // blended = 0.5*0.4 + 0.9*0.6 = 0.74
    expect(fused.confidence).toBeCloseTo(0.74, 5);
    expect(fused.corners).toBe(quad);
    expect(fused.method).toBe("js");
    expect(fused.documents).toHaveLength(1);
  });

  it("confirm: does not lower confidence when ML is weaker", () => {
    const quad = rect(40, 30, 160, 120);
    const classical = classicalResult([doc(quad, 0.9)]);
    const fused = fuseDetections(mlResult(quad, 0.5), classical, "single");
    expect(fused).toBe(classical);
  });

  it("rescue: adds an ML document the classical path missed (multi keeps both)", () => {
    const classicalQuad = rect(140, 25, 80, 130);
    const classical = classicalResult([doc(classicalQuad, 0.6)]);
    const mlQuad = rect(20, 25, 80, 130);
    const fused = fuseDetections(mlResult(mlQuad, 0.75), classical, "multi");

    expect(fused.documents).toHaveLength(2);
    expect(fused.documents![0].corners).toEqual(mlQuad); // 0.75 > 0.6 → ML أولاً
    expect(fused.documents![1].corners).toEqual(classicalQuad);
    expect(fused.method).toBe("scanic");
    expect(fused.documents!.map((d) => d.id)).toEqual(["doc-1", "doc-2"]);
    expect(fused.documents![1].label).toContain("مستند 2");
  });

  it("rescue: single mode slices to the top-confidence document", () => {
    const classical = classicalResult([doc(rect(140, 25, 80, 130), 0.6)]);
    const fused = fuseDetections(mlResult(rect(20, 25, 80, 130), 0.75), classical, "single");
    expect(fused.documents).toHaveLength(1);
    expect(fused.confidence).toBeCloseTo(0.75, 5);
  });

  it("rescue: blocked below ML_ADD_MIN_SCORE", () => {
    const classical = classicalResult([doc(rect(140, 25, 80, 130), 0.5)]);
    const fused = fuseDetections(
      mlResult(rect(20, 25, 80, 130), ML_ADD_MIN_SCORE - 0.01),
      classical,
      "multi"
    );
    expect(fused).toBe(classical);
  });

  it("rescue: blocked when ML quad is contained in an existing candidate (same doc, tighter bounds)", () => {
    const classicalQuad = rect(10, 10, 200, 200);
    const classical = classicalResult([doc(classicalQuad, 0.55)]);
    const fused = fuseDetections(mlResult(rect(50, 50, 60, 60), 0.8), classical, "multi");
    expect(fused).toBe(classical);
  });

  it("ambiguous overlap (between MISS and CONFIRM) leaves everything unchanged", () => {
    // IoU = 70*100 / 130*100 ≈ 0.538 — داخل النطاق المشوش
    const classical = classicalResult([doc(rect(0, 0, 100, 100), 0.6)]);
    const fused = fuseDetections(mlResult(rect(30, 0, 100, 100), 0.9), classical, "multi");
    expect(fused).toBe(classical);
  });

  it("multi-mode confirm keeps all candidates and re-sorts by boosted confidence", () => {
    const docA = rect(10, 10, 60, 80);
    const docB = rect(100, 10, 60, 80);
    const classical = classicalResult([doc(docA, 0.5, "doc-1"), doc(docB, 0.6, "doc-2")]);
    // ML يؤكد A — ثقة A تصبح 0.74 فتتقدم على B (0.6)
    const fused = fuseDetections(mlResult(docA, 0.9), classical, "multi");

    expect(fused.documents).toHaveLength(2);
    expect(fused.documents![0].corners).toEqual(docA);
    expect(fused.documents![0].confidence).toBeCloseTo(0.74, 5);
    expect(fused.documents!.map((d) => d.id)).toEqual(["doc-1", "doc-2"]);
    expect(fused.method).toBe("js");
  });

  it("mode 'auto' keeps all rescued documents (no single-mode slice)", () => {
    const classical = classicalResult([doc(rect(140, 25, 80, 130), 0.6)]);
    const fused = fuseDetections(mlResult(rect(20, 25, 80, 130), 0.75), classical, "auto" as DetectionMode);
    expect(fused.documents).toHaveLength(2);
  });
});
