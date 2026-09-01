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
  effectiveScore?: number;
  area?: number;
  aspectRatio?: number;
}

