import { z } from 'zod';

import { sanitizeStickerColor, sanitizeStickerFontFamily } from '../svg-safety';
import {
  buildDefaultStickerParams,
  MAX_STICKER_FIELD_LENGTH,
  MAX_STICKER_FONT_SCALE,
  MIN_STICKER_FONT_SCALE,
} from './build-svg';

import type {
  StickerFinish,
  StickerLayoutOverride,
  StickerParams,
  StickerTemplate,
  StickerUserPreset,
} from '../../types';

/**
 * schema.ts — مخطط التخصيص v2 والتحقق من البيانات المحفوظة.
 *
 * القراءة من `localStorage` أو من عنصر قديم على الكانفاس غير موثوقة:
 * كل شيء يمر هنا قبل الاستهلاك. غياب `version` يعني v1 ويُرقّى تلقائياً.
 */

export const StickerLayoutOverrideSchema = z.object({
  dxMm: z.number().min(-500).max(500),
  dyMm: z.number().min(-500).max(500),
  scale: z.number().min(0.2).max(5),
  rotationDeg: z.number().min(-180).max(180),
  visible: z.boolean(),
});

export const StickerParamsSchema = z.object({
  version: z.literal(2).optional(),
  fields: z.record(z.string(), z.string().max(MAX_STICKER_FIELD_LENGTH)),
  primaryColor: z.string().max(120),
  secondaryColor: z.string().max(120),
  backgroundColor: z.string().max(120),
  isTransparent: z.boolean(),
  fontFamily: z.string().max(80).optional(),
  fontScale: z.number().min(MIN_STICKER_FONT_SCALE).max(MAX_STICKER_FONT_SCALE).optional(),
  finish: z.enum(['standard', 'glossy', 'matte', 'holographic']).optional(),
  dieCutBorder: z.boolean().optional(),
  sizeMm: z
    .object({
      width: z.number().positive().max(1000),
      height: z.number().positive().max(1000),
    })
    .optional(),
  bleedMm: z.number().min(0).max(10).optional(),
  safeMm: z.number().min(0).max(10).optional(),
  overrides: z.record(z.string(), StickerLayoutOverrideSchema).optional(),
});

export const StickerUserPresetSchema: z.ZodType<StickerUserPreset> = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  templateId: z.string().min(1).max(120),
  params: StickerParamsSchema,
  createdAt: z.number().finite(),
});

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const FINISHES = new Set<StickerFinish>(['standard', 'glossy', 'matte', 'holographic']);

/**
 * يعيد بناء كائن JSON الشجري بلا المفاتيح الخطرة (`__proto__` ونحوها).
 *
 * محرك zod يعين مفاتيح `z.record` بتعيين خاصية مباشر، فمفتاح `__proto__`
 * بقيمة كائن يستدعي الـsetter ويُلّوث `Object.prototype` وقت الـsafeParse
 * نفسه — لهذا تُقمَّع المفاتيح الخطرة قبل الـsafeParse ولا بعده.
 */
export function stripDangerousKeys(input: unknown, depth = 4): unknown {
  if (depth <= 0 || !input || typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((value) => stripDangerousKeys(value, depth - 1));
  }
  const results: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    results[key] = stripDangerousKeys(value, depth - 1);
  }
  return results;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function coerceColor(value: unknown, fallback: string): string {
  return typeof value === 'string' ? sanitizeStickerColor(value, fallback) : fallback;
}

/** يفحص أن المدخل رقم ضمن الحدين المخطوطين، وإلا يُسقط صامتاً (هجرة متسامحة). */
function coerceBoundedNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    return undefined;
  }
  return value;
}

/**
 * يعيد بناء override واحد بقيم محصورة داخل حدود المخطط، أو null إذا بنية
 * الحقل نفسها غير قابلة للإنقاذ (نوع مفقود أو غير رقمي مثلاً) — الأرقام
 * السليمة نوعاً تُحصر في المجال بدل إسقاط إعدادات التخطيط كلها.
 */
function coerceLayoutOverride(value: unknown): StickerLayoutOverride | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.dxMm !== 'number' ||
    !Number.isFinite(raw.dxMm) ||
    typeof raw.dyMm !== 'number' ||
    !Number.isFinite(raw.dyMm) ||
    typeof raw.scale !== 'number' ||
    !Number.isFinite(raw.scale) ||
    typeof raw.rotationDeg !== 'number' ||
    !Number.isFinite(raw.rotationDeg) ||
    typeof raw.visible !== 'boolean'
  ) {
    return null;
  }
  return {
    dxMm: clamp(raw.dxMm, -500, 500),
    dyMm: clamp(raw.dyMm, -500, 500),
    scale: clamp(raw.scale, 0.2, 5),
    rotationDeg: clamp(raw.rotationDeg, -180, 180),
    visible: raw.visible,
  };
}

/**
 * هجرة متسامحة: كل حقل يمارس قيمته المحصورة المنفردة بدل إسقاط التصميم
 * كاملاً على أول خطأ — القيم التالفة ترتد إلى افتراض القالب، ولا تتسرب
 * مفاتيح مجهولة من المصدر إلى `StickerParams` (نُبنيها بصرياً لا بـspread).
 */
function normalizeParamsCandidate(template: StickerTemplate, input: unknown): StickerParams | null {
  if (!input || typeof input !== 'object') return null;

  const defaults = buildDefaultStickerParams(template);
  const source = input as Partial<StickerParams>;

  const fields: Record<string, string> = { ...defaults.fields };
  if (source.fields && typeof source.fields === 'object') {
    for (const [key, value] of Object.entries(source.fields)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      fields[key] = String(value ?? '').slice(0, MAX_STICKER_FIELD_LENGTH);
    }
  }

  const overrides: Record<string, StickerLayoutOverride> = {};
  if (source.overrides && typeof source.overrides === 'object') {
    for (const [key, value] of Object.entries(source.overrides)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      const coerced = coerceLayoutOverride(value);
      if (coerced) overrides[key] = coerced;
    }
  }

  const sizeMm = (() => {
    const rawSize = source.sizeMm ? (source.sizeMm as unknown as Record<string, unknown>) : null;
    if (!rawSize) return undefined;
    const width = coerceBoundedNumber(rawSize.width, 1, 1000);
    const height = coerceBoundedNumber(rawSize.height, 1, 1000);
    return width !== undefined && height !== undefined ? { width, height } : undefined;
  })();

  const bleedMm = coerceBoundedNumber(source.bleedMm, 0, 10);
  const safeMm = coerceBoundedNumber(source.safeMm, 0, 10);
  const fontFamily =
    typeof source.fontFamily === 'string'
      ? sanitizeStickerFontFamily(source.fontFamily).slice(0, 80)
      : undefined;
  const finish =
    typeof source.finish === 'string' && FINISHES.has(source.finish as StickerFinish)
      ? (source.finish as StickerFinish)
      : defaults.finish;

  const candidate: StickerParams = {
    ...defaults,
    version: 2,
    fields,
    primaryColor: coerceColor(source.primaryColor, defaults.primaryColor),
    secondaryColor: coerceColor(source.secondaryColor, defaults.secondaryColor),
    backgroundColor: coerceColor(source.backgroundColor, defaults.backgroundColor),
    isTransparent: typeof source.isTransparent === 'boolean' ? source.isTransparent : false,
    fontScale:
      typeof source.fontScale === 'number' && Number.isFinite(source.fontScale)
        ? clamp(source.fontScale, MIN_STICKER_FONT_SCALE, MAX_STICKER_FONT_SCALE)
        : defaults.fontScale,
    finish,
    dieCutBorder:
      typeof source.dieCutBorder === 'boolean' ? source.dieCutBorder : defaults.dieCutBorder,
    ...(fontFamily !== undefined ? { fontFamily } : {}),
    ...(sizeMm !== undefined ? { sizeMm } : {}),
    ...(bleedMm !== undefined ? { bleedMm } : {}),
    ...(safeMm !== undefined ? { safeMm } : {}),
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  };

  const parsed = StickerParamsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/**
 * يرقّي v1 (أو بيانات تالفة) إلى v2 مع دمج القيم الافتراضية للقالب.
 * الحقول القابلة للإنقاذ يُحفظ، والحقول التالفة ترتد إلى افتراضي القالب —
 * لا يُحقن شيء غير موثوق في SVG.
 */
export function migrateStickerParams(input: unknown, template: StickerTemplate): StickerParams {
  return normalizeParamsCandidate(template, input) ?? buildDefaultStickerParams(template);
}
