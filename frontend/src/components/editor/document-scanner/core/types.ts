export interface Point {
  x: number;
  y: number;
}

export type DocumentAspectType = "free" | "a4_p" | "a4_l" | "id_card" | "square";

export type ScannerFilterMode = "original" | "magic" | "bw" | "grayscale" | "sharpen" | "deyellow";

export type DetectionMode = "auto" | "multi" | "single";

export interface DetectedDocument {
  id: string;
  corners: Point[];
  confidence: number;
  label: string;
  aspectType: DocumentAspectType;
  rotation?: number;
  filterMode?: ScannerFilterMode;
}

export interface DetectionResult {
  corners: Point[];
  confidence: number;
  method: "js" | "opencv" | "scanic" | "default";
  documents?: DetectedDocument[];
}

export interface QuadOverlapStats {
  iou: number;
  overlapRatio1: number;
  overlapRatio2: number;
  maxOverlapRatio: number;
}

export interface ScoredCandidate {
  quad: Point[];
  score: number;
}

/** مضلع رباعي صالح — 4 نقاط بالضبط بترتيب عقارب الساعة */
export type Quad = [Point, Point, Point, Point];

export function isQuad(pts: Point[] | null | undefined): pts is Quad {
  return !!pts && pts.length === 4;
}

// 🌟 ثوابت هندسية موحدة لتقسيم البطاقات المكدسة والنسب المرجعية
export const STACKED_SPLIT_MIN_RATIO = 0.66;
export const STACKED_SPLIT_MAX_RATIO = 0.90;
export const ID_HALF_MIN_RATIO = 1.44;
export const ID_HALF_MAX_RATIO = 1.84;

