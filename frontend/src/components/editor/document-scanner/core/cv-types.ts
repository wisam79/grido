/**
 * Shared structural types for OpenCV.js WASM runtime interop.
 *
 * `@techstark/opencv-js` ships partial typings; several runtime APIs used by
 * the document scanner (MatVector contents, rotated-rect points, Emscripten
 * module globals) are untyped. These interfaces describe exactly the surface
 * we touch, replacing scattered `any` usage.
 */

export interface CvPoint {
  x: number;
  y: number;
}

export interface CvSize {
  width: number;
  height: number;
}

export interface CvRotatedRect {
  center: CvPoint;
  size: CvSize;
  angle: number;
}

/** Emscripten-style WASM object with mandatory manual `delete()`. */
export interface CvDisposable {
  delete: () => void;
  isDeleted?: () => boolean;
}

export interface CvMat extends CvDisposable {
  rows: number;
  cols: number;
  data: Uint8Array | ArrayLike<number>;
  data32S: Int32Array | ArrayLike<number>;
  data32F: Float32Array | ArrayLike<number>;
}

export interface CvMatVector extends CvDisposable {
  size: () => number;
  get: (index: number) => CvMat;
}

export interface CvRuntimeLike {
  Mat: new () => CvMat;
  MatVector: new () => CvMatVector;
  Size: new (width: number, height: number) => CvSize;
  matFromImageData: (data: ImageData) => CvMat;
  cvtColor: (src: CvMat, dst: CvMat, code: number) => void;
  GaussianBlur: (src: CvMat, dst: CvMat, ksize: CvSize, sigmaX: number, sigmaY: number, borderType: number) => void;
  Canny: (src: CvMat, dst: CvMat, threshold1: number, threshold2: number) => void;
  getStructuringElement: (shape: number, ksize: CvSize) => CvMat;
  dilate: (src: CvMat, dst: CvMat, kernel: CvMat) => void;
  adaptiveThreshold: (src: CvMat, dst: CvMat, maxVal: number, adaptMethod: number, threshType: number, blockSize: number, C: number) => void;
  threshold: (src: CvMat, dst: CvMat, thresh: number, maxVal: number, type: number) => void;
  findContours: (src: CvMat, contours: CvMatVector, hierarchy: CvMat, mode: number, method: number) => void;
  contourArea: (contour: CvMat) => number;
  arcLength: (curve: CvMat, closed: boolean) => number;
  approxPolyDP: (curve: CvMat, approx: CvMat, epsilon: number, closed: boolean) => void;
  isContourConvex: (contour: CvMat) => boolean;
  minAreaRect: (points: CvMat) => CvRotatedRect;
  convexHull: (points: CvMat, hull: CvMat, clockwise: boolean, returnPoints: boolean) => void;
  rotatedRectPoints?: (rect: CvRotatedRect) => CvPoint[];
  RotatedRect?: { points?: (rect: CvRotatedRect) => CvPoint[] };
  COLOR_RGBA2GRAY: number;
  BORDER_DEFAULT: number;
  MORPH_RECT: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  THRESH_BINARY_INV: number;
  THRESH_BINARY: number;
  THRESH_OTSU: number;
  RETR_LIST: number;
  CHAIN_APPROX_SIMPLE: number;
}
