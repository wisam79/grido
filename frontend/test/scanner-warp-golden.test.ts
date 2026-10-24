import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

import {
  installScannerCanvasMock,
  makeRgbaCanvas,
  type MockCanvas,
} from './helpers/scanner-canvas-mock';
import { applyFilterMode } from '../src/components/editor/document-scanner/core/filters';
import { computePerspectiveTransform } from '../src/components/editor/document-scanner/core/perspective-warper';
import { sortCornerPoints } from '../src/components/editor/document-scanner/core/quad-geometry';
import {
  computeSourceCrop,
  toLocalCorners,
  warpSourceImage,
} from '../src/components/editor/document-scanner/core/warp-pipeline';

import type {
  Point,
  ScannerFilterMode,
} from '../src/components/editor/document-scanner/core/types';

/**
 * 📸 Golden vectors للاستعدال — المرحلة 0 من خطة ترحيل الماسح
 * (docs/plans/neural-scanner-warp-migration-spec.md §7).
 *
 * يثبّت مخرجات مسار TS الحالي (قصّ + Homography عكسي + Bilinear + فلاتر)
 * كمرجع مستقل قبل أي حذف، ليُقاس عليه توازي Go لاحقاً (RMSE < 1.5/255)
 * وليحمي المسار الحالي من الانحدار حتى إغلاق المرحلة 5.
 *
 * - التوليد: `FIXTURE_GEN=1 npx vitest run test/scanner-warp-golden.test.ts`
 *   (يكتب fixtures خام RGBA + manifest JSON — بلا أي ترميز صور يولّد تباين فك).
 * - الوضع الافتراضي: يطابق المخرجات الحالية بايت-ببايت مع المثبتة.
 *
 * التدوير 90/180/270 غير مشمول هنا عمداً: محاكي الكانفاس لا ينفّذ تحويلات
 * المصفوفة، وتوازي التدوير يُختبر في Go ببكسل حي (§5.2 من الخطة).
 */

// جذر المستودع يُكتشف صعوداً من cwd — يعمل سواء أُشغّل vitest من frontend أو من الجذر
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'internal', 'service'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`لم يُعثر على جذر المستودع (internal/service) انطلاقاً من ${process.cwd()}`);
}
const FIXTURES_DIR = join(findRepoRoot(), 'internal', 'service', 'testdata', 'scanner_warp');
const GENERATE = process.env.FIXTURE_GEN === '1';

interface GoldenCase {
  id: string;
  srcW: number;
  srcH: number;
  corners: Point[];
  targetW: number;
  targetH: number;
  /** مصفوفة Homography العكسية (dst→src) المرصودة من TS — مرجع توازي حل Go. */
  h: number[];
  srcFile: string;
  outFile: string;
}

interface GoldenManifest {
  version: 1;
  generatedBy: string;
  pipeline: string;
  cases: GoldenCase[];
  filters: {
    sourceCase: string;
    sourceFile: string;
    modes: Partial<Record<ScannerFilterMode, string>>;
  };
}

/** بذرة الصور الاصطناعية: تدرّجات + رقعة شطرنجية تُعمل أوزان Bilinear فعلياً. */
function synthImage(width: number, height: number, variant: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const checker = ((x >> 2) + (y >> 2)) % 2 === 0 ? 32 : -24;
      data[idx] = Math.max(0, Math.min(255, (x * 255) / (width - 1) + checker + variant * 17));
      data[idx + 1] = Math.max(0, Math.min(255, (y * 255) / (height - 1) - checker + variant * 29));
      data[idx + 2] = Math.max(
        0,
        Math.min(255, ((x + y) * 255) / (width + height - 2) + variant * 43),
      );
      data[idx + 3] = 255;
    }
  }
  return data;
}

interface ImageSpec {
  w: number;
  h: number;
  variant: number;
}

const IMAGES: ImageSpec[] = [
  { w: 128, h: 96, variant: 0 },
  { w: 160, h: 120, variant: 1 },
  { w: 112, h: 112, variant: 2 },
];

/** 5 مضلعات متنوعة (نِسَب من أبعاد الصورة) لكل صورة: ميل خفيف، منظور قوي، دوران 15°، إطار شبه كامل، ربع صغير جانبي. */
function cornerSets(): Array<[number, number][]> {
  return [
    [
      [0.1, 0.12],
      [0.88, 0.1],
      [0.9, 0.88],
      [0.12, 0.9],
    ],
    [
      [0.2, 0.1],
      [0.85, 0.15],
      [0.95, 0.92],
      [0.05, 0.8],
    ],
    rotateRect(0.15, 0.15, 0.85, 0.85, (15 * Math.PI) / 180),
    [
      [0.02, 0.03],
      [0.98, 0.02],
      [0.97, 0.97],
      [0.03, 0.98],
    ],
    [
      [0.55, 0.55],
      [0.86, 0.57],
      [0.84, 0.86],
      [0.53, 0.84],
    ],
  ];
}

function rotateRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rad: number,
): Array<[number, number]> {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const pts: Array<[number, number]> = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  return pts.map(([px, py]) => {
    const dx = px - cx;
    const dy = py - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos] as [number, number];
  });
}

function buildCases(): GoldenCase[] {
  const sets = cornerSets();
  const cases: GoldenCase[] = [];
  for (const img of IMAGES) {
    sets.forEach((set) => {
      const idx = cases.length;
      const corners: Point[] = set.map(([fx, fy]) => ({
        x: Math.round(fx * (img.w - 1) * 100) / 100,
        y: Math.round(fy * (img.h - 1) * 100) / 100,
      }));
      const portrait = idx % 2 === 1;
      const targetW = portrait ? 48 : 64;
      const targetH = portrait ? 64 : 48;
      const id = `warp-${String(idx).padStart(2, '0')}`;

      // إعادة اشتقاق H كما يفعل warpSourceImage داخلياً (فرز → قصّ → تحويل منظوري)
      const sorted = sortCornerPoints(corners);
      const crop = computeSourceCrop(sorted, img.w, img.h);
      const localCorners = toLocalCorners(sorted, crop);
      const dstCorners: Point[] = [
        { x: 0, y: 0 },
        { x: targetW - 1, y: 0 },
        { x: targetW - 1, y: targetH - 1 },
        { x: 0, y: targetH - 1 },
      ];
      const h = computePerspectiveTransform(dstCorners, localCorners);

      cases.push({
        id,
        srcW: img.w,
        srcH: img.h,
        corners,
        targetW,
        targetH,
        h: Array.from(h, (v) => Math.round(v * 1e12) / 1e12),
        srcFile: `${id}.src.rgba`,
        outFile: `${id}.out.rgba`,
      });
    });
  }
  return cases;
}

const FILTER_MODES: ScannerFilterMode[] = ['magic', 'bw', 'grayscale', 'sharpen', 'deyellow'];

function runWarp(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  corners: Point[],
): Uint8ClampedArray {
  const canvas = makeRgbaCanvas(srcW, srcH, src);
  const result = warpSourceImage(canvas as unknown as CanvasImageSource, srcW, srcH, {
    corners,
    targetW,
    targetH,
    filterMode: 'original',
    rotation: 0,
  });
  return (result as unknown as MockCanvas)._mockData;
}

function readRgba(path: string, byteLength: number): Uint8ClampedArray {
  const buf = readFileSync(path);
  // Buffer قد يشارك ArrayBuffer تجمّعي مع إزاحة — القراءة عبر byteOffset إلزامية
  return new Uint8ClampedArray(buf.buffer, buf.byteOffset, byteLength);
}

/** قارئ EXIF أصغر (JPEG SOI → APP1 "Exif\0\0" → TIFF IFD0 → وسم 0x0112 Orientation). */
function readExifOrientation(jpeg: Buffer): number | null {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return null;
  let off = 2;
  while (off + 4 <= jpeg.length) {
    if (jpeg[off] !== 0xff) return null;
    const marker = jpeg[off + 1];
    if (marker === 0xda || marker === 0xd9) return null;
    const size = jpeg.readUInt16BE(off + 2);
    if (marker === 0xe1) {
      if (jpeg.toString('latin1', off + 4, off + 10) !== 'Exif\0\0') return null;
      const tiff = off + 10;
      const le = jpeg[tiff] === 0x49 && jpeg[tiff + 1] === 0x49;
      const u16 = (p: number) => (le ? jpeg.readUInt16LE(p) : jpeg.readUInt16BE(p));
      const u32 = (p: number) => (le ? jpeg.readUInt32LE(p) : jpeg.readUInt32BE(p));
      const ifd = tiff + u32(tiff + 4);
      const count = u16(ifd);
      for (let i = 0; i < count; i++) {
        const entry = ifd + 2 + i * 12;
        if (u16(entry) === 0x0112) return u16(entry + 8);
      }
      return null;
    }
    off += 2 + size;
  }
  return null;
}

describe('scanner-warp golden vectors', () => {
  beforeAll(() => {
    installScannerCanvasMock();
  });

  const cases = buildCases();
  const manifestPath = join(FIXTURES_DIR, 'manifest.json');

  if (!GENERATE) {
    it('has generated fixtures on disk (run FIXTURE_GEN=1 if missing)', () => {
      expect(existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as GoldenManifest;
      expect(manifest.version).toBe(1);
      expect(manifest.cases.length).toBe(cases.length);
    });

    it.each(cases)('$id — reproduces the pinned warp output byte-exact', (testCase) => {
      const expected = readRgba(
        join(FIXTURES_DIR, testCase.outFile),
        testCase.targetW * testCase.targetH * 4,
      );
      const src = readRgba(join(FIXTURES_DIR, testCase.srcFile), testCase.srcW * testCase.srcH * 4);
      const out = runWarp(
        src,
        testCase.srcW,
        testCase.srcH,
        testCase.targetW,
        testCase.targetH,
        testCase.corners,
      );
      expect(out.length).toBe(expected.length);
      expect(Array.from(out)).toEqual(Array.from(expected));
    });

    it('matches every filter mode output byte-exact', () => {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as GoldenManifest;
      const srcCase = manifest.filters.sourceCase;
      const found = cases.find((c) => c.id === srcCase);
      expect(found).toBeDefined();
      const source = readRgba(
        join(FIXTURES_DIR, manifest.filters.sourceFile),
        found!.targetW * found!.targetH * 4,
      );

      for (const mode of FILTER_MODES) {
        const expectedPath = manifest.filters.modes[mode];
        expect(expectedPath, `fixture for filter "${mode}"`).toBeDefined();
        const expected = readRgba(join(FIXTURES_DIR, expectedPath!), source.length);
        const canvas = makeRgbaCanvas(found!.targetW, found!.targetH, source);
        const filtered = applyFilterMode(canvas as unknown as never, mode) as unknown as MockCanvas;
        expect(Array.from(filtered._mockData)).toEqual(Array.from(expected));
      }
    });

    it('pins all 8 EXIF orientation fixtures with the right tag value', () => {
      // تُولَّد بscripts/generate-scanner-exif-fixtures.py (Pillow) — انظر §5.2
      for (let n = 1; n <= 8; n++) {
        const path = join(FIXTURES_DIR, 'exif', `orientation_${n}.jpg`);
        expect(existsSync(path), `missing ${path}`).toBe(true);
        const orientation = readExifOrientation(readFileSync(path));
        expect(orientation, `orientation_${n}.jpg tag`).toBe(n);
      }
    });
  }

  if (GENERATE) {
    // وضع التوليد: يُنفَّذ بعد كل تعديل مقصود على محرك الاستعدال/الفلاتر
    // (أو المحاكي) — يكتب كل الـfixtures ثم يفشل عمداً لتنبيه المراجع.
    it('regenerates fixtures', () => {
      mkdirSync(FIXTURES_DIR, { recursive: true });
      mkdirSync(join(FIXTURES_DIR, 'filters'), { recursive: true });

      const setsPerImage = cornerSets().length;
      for (const c of cases) {
        const imgIdx = Math.floor(cases.indexOf(c) / setsPerImage);
        const src = synthImage(c.srcW, c.srcH, IMAGES[imgIdx].variant);
        writeFileSync(join(FIXTURES_DIR, c.srcFile), Buffer.from(src));
        const out = runWarp(src, c.srcW, c.srcH, c.targetW, c.targetH, c.corners);
        writeFileSync(join(FIXTURES_DIR, c.outFile), Buffer.from(out));
      }

      const sourceCase = cases[0];
      const source = runWarp(
        synthImage(sourceCase.srcW, sourceCase.srcH, IMAGES[0].variant),
        sourceCase.srcW,
        sourceCase.srcH,
        sourceCase.targetW,
        sourceCase.targetH,
        sourceCase.corners,
      );
      writeFileSync(join(FIXTURES_DIR, 'filters', 'source.rgba'), Buffer.from(source));

      const modes: GoldenManifest['filters']['modes'] = {};
      for (const mode of FILTER_MODES) {
        const canvas = makeRgbaCanvas(sourceCase.targetW, sourceCase.targetH, source);
        const filtered = applyFilterMode(canvas as unknown as never, mode) as unknown as MockCanvas;
        const file = `filters/${mode}.rgba`;
        writeFileSync(join(FIXTURES_DIR, file), Buffer.from(filtered._mockData));
        modes[mode] = file;
      }

      const manifest: GoldenManifest = {
        version: 1,
        generatedBy: 'frontend/test/scanner-warp-golden.test.ts (FIXTURE_GEN=1)',
        pipeline:
          'warpSourceImage filter=original rotation=0 — crop + inverse homography + bilinear (TS reference)',
        cases,
        filters: { sourceCase: sourceCase.id, sourceFile: 'filters/source.rgba', modes },
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      throw new Error(
        `FIXTURE_GEN: كُتبت ${cases.length} حالة استعدال + ${FILTER_MODES.length} فلاتر في ${FIXTURES_DIR} — راجع الفرق ثم شغّل الاختبار بلا العلم.`,
      );
    });
  }
});
