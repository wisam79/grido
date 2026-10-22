/**
 * محرك العمليات المنطقية على المسارات — اتحاد/طرح/تقاطع/استثناء.
 *
 * المدخلات مسارات مطلقة ببكسلات الورقة (من shape-to-path.ts) والمخرجات مسار
 * واحد مُزاح إلى أصل صندوقه، لأن عنصر shape='path' في المحرر يُرسم بمقياس
 * يملأ صندوق العنصر: تخزين المسار مُنسَّباً إلى (0,0) يجعل مقياس الرسم 1
 * فيبقى الشكل المدموج مطابقاً للبكسل لمصادره.
 *
 * قاعدة التعبئة nonzero (افتراضي Konva وCanvas معاً) — بها تُحدث الحلقة
 * الداخلية ثقباً في الشكل المدموج بدل أن تعبئه.
 */
import { FillRule, PathBoolean, PathBooleanOperation } from 'path-bool';

import {
  normalizeSegments,
  segmentsBounds,
  segmentsToPathData,
  translateSegments,
} from './path-geometry';

import type { CubicSeg } from './path-geometry';
import type { Path } from 'path-bool';

export type BooleanOp = 'union' | 'subtract' | 'intersect' | 'exclude';

export interface MergedPathGeometry {
  /** بيانات المسار مُنسَّبة إلى أصل صندوقها المحيط */
  svgPath: string;
  /** صندوق الشكل في فضاء الورقة (بكسل) قبل التنسيب — يحدد موضع العنصر الجديد */
  minX: number;
  minY: number;
  w: number;
  h: number;
}

const toInput = (path: Path) => ({ path, fillRule: FillRule.NonZero });

function runOp(paths: Path[], op: PathBooleanOperation): Path[] {
  if (paths.length === 0) return [];
  if (paths.length === 1) return op === PathBooleanOperation.Difference ? [] : paths;
  return new PathBoolean(paths.map(toInput)).get(op);
}

/** طيٌّ ثنائي: A∘B ثم الناتج∘C — دلالة واضحة لا تعتمد على سلوك n-ary للمكتبة */
function foldPairwise(inputs: Path[], op: PathBooleanOperation): Path[] {
  let acc = inputs[0];
  for (let i = 1; i < inputs.length; i += 1) {
    const result = runOp([acc, inputs[i]], op);
    if (result.length === 0) return [];
    acc = result.flat();
  }
  return [acc];
}

export function booleanSegments(inputs: CubicSeg[][], op: BooleanOp): CubicSeg[] {
  const paths = inputs.filter((segs) => segs.length > 0) as Path[];
  if (paths.length < 2) return paths.length === 1 ? normalizeSegments(paths[0]) : [];

  let result: Path[];
  switch (op) {
    case 'union':
      result = runOp(paths, PathBooleanOperation.Union);
      break;
    case 'subtract': {
      // المدخل الأخير هو القاطع (الطبقة الأمامية) ويُطرح من اتحاد ما تحته —
      // نفس اتفاق Figma وIllustrator، فالمستخدم يرتب الطبقات بصرياً لا هندسياً.
      const cutter = paths[paths.length - 1];
      const base = paths.slice(0, -1);
      const baseUnion =
        base.length > 1 ? (runOp(base, PathBooleanOperation.Union).flat() as Path) : base[0];
      result = runOp([baseUnion, cutter], PathBooleanOperation.Difference);
      break;
    }
    case 'intersect':
      result = foldPairwise(paths, PathBooleanOperation.Intersection);
      break;
    case 'exclude':
      result = foldPairwise(paths, PathBooleanOperation.Exclusion);
      break;
  }
  return normalizeSegments(result.flat() as Path);
}

/**
 * ينفّذ العملية ثم يُنسِّب الناتج إلى أصل صندوقه.
 * يعيد null عندما يكون الناتج فارغاً (طرح كامل، أو تقاطع بلا تداخل).
 */
export function mergePaths(inputs: CubicSeg[][], op: BooleanOp): MergedPathGeometry | null {
  const segs = booleanSegments(inputs, op);
  if (segs.length === 0) return null;

  const box = segmentsBounds(segs);
  if (!box) return null;

  const shifted = translateSegments(segs, -box.minX, -box.minY);
  const svgPath = segmentsToPathData(shifted);
  if (!svgPath) return null;

  return { svgPath, minX: box.minX, minY: box.minY, w: box.w, h: box.h };
}
