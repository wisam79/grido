import { z } from 'zod';

import { sanitizeText } from '@/lib/canvas/text-helpers';
import { createLogger } from '@/lib/logger';
import { ProjectSchema } from '@/lib/schema';
import { sanitizeSvgMarkup } from '@/lib/utils';

const logger = createLogger('project-serializer');
import { domain } from '../../../wailsjs/go/models';

import type { EditorState } from '@/lib/editor-store';

export const CURRENT_PROJECT_VERSION = 1;
// إطار الترحيل الإصداري (2026-10-02): رفض صريح للإصدارات المستقبلية/التالفة
// بدل القبول الصامت — يغلق فجوة VERSION=1 الثابت بلا مسار ترحيل.
export const MIN_SUPPORTED_PROJECT_VERSION = 1;

// Project file layout (representing versioned project JSON export and unified DTO)
export const ProjectFileSchema = ProjectSchema.extend({
  version: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val)),
  savedAt: z.string().optional(),
});

export type ProjectFileV1 = z.infer<typeof ProjectFileSchema>;

// Serialization from Editor Store state
export function serializeEditorState(
  state: EditorState,
  embeddedAssets?: Record<string, string>,
): ProjectFileV1 {
  const projectFile: ProjectFileV1 = {
    version: CURRENT_PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    // 🛡️ معرّف المشروع في المكتبة: بدونه كانت المسودة المستعادة تُحمَّل بـ
    // projectId=null فيطبعها الحفظ التالي كمشروع جديد كل مرة (تكرار في المكتبة)
    projectId: state.projectId ?? null,
    mode: state.mode,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    backgroundColor: state.backgroundColor,
    backgroundGradientColor2: state.backgroundGradientColor2 ?? null,
    backgroundGradientAngle: state.backgroundGradientAngle ?? 135,
    elements: state.elements,
    slots: state.slots,
    template: state.template,
    collageTemplate: state.collageTemplate,
    printSettings: state.printSettings,
    embeddedAssets,

    // Grid settings
    showGrid: state.showGrid,
    gridSize: state.gridSize,
    gridColor: state.gridColor,
    gridOpacity: state.gridOpacity,
    gridSubdivisions: state.gridSubdivisions,
    gridType: state.gridType,
    snapToGrid: state.snapToGrid,

    // Layout columns settings
    showColumns: state.showColumns,
    columnsCount: state.columnsCount,
    columnsColor: state.columnsColor,
    columnsMargin: state.columnsMargin,
    columnsGutter: state.columnsGutter,

    // Ruler and guide settings
    showRuler: state.showRuler,
    rulerUnit: state.rulerUnit,
    userGuides: state.userGuides,
    showUserGuides: state.showUserGuides,
    lockUserGuides: state.lockUserGuides,
    showBleedGuides: state.showBleedGuides,
    bleedMarginMM: state.bleedMarginMM,
    safeMarginMM: state.safeMarginMM,
    cutShapeType: state.cutShapeType,

    // Collage settings
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageRadius: state.collageRadius,
    collageShowCutLines: state.collageShowCutLines,
    collageShowEndCutLine: state.collageShowEndCutLine,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
  };
  return projectFile;
}

// Migration from legacy or unknown structures to current version
export function migrateProject(raw: unknown): ProjectFileV1 {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON format');
    }
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid project data format');
  }

  const record = raw as Record<string, unknown>;

  // Normalize legacy format (without version) to v1, accept numeric strings
  let version = CURRENT_PROJECT_VERSION;
  if (typeof record.version === 'number') version = record.version;
  else if (typeof record.version === 'string' && record.version.trim() !== '') {
    const parsed = Number(record.version);
    if (!Number.isFinite(parsed))
      throw new Error(`Unsupported project version: ${String(record.version)}`);
    version = parsed;
  }
  // رفض صريح: مستقبلي أو أقدم من المدعوم — لا قبول صامت يُفسد البيانات
  if (!Number.isInteger(version) || version < MIN_SUPPORTED_PROJECT_VERSION) {
    throw new Error(
      `Unsupported project version: ${String((record as { version?: unknown }).version)} (min ${MIN_SUPPORTED_PROJECT_VERSION})`,
    );
  }
  if (version > CURRENT_PROJECT_VERSION) {
    throw new Error(
      `Project created by a newer app version (v${version} > v${CURRENT_PROJECT_VERSION}) — please update Grido Studio`,
    );
  }

  const normalized = {
    ...record,
    version,
    // Provide sensible defaults for missing fields if necessary
    showGrid: record.showGrid ?? false,
    gridSize: record.gridSize ?? 48,
    showRuler: record.showRuler ?? true,
    rulerUnit: (['mm', 'cm', 'in', 'px'].includes(record.rulerUnit as string)
      ? record.rulerUnit
      : 'mm') as 'mm' | 'cm' | 'in' | 'px',
    userGuides: Array.isArray(record.userGuides) ? record.userGuides : [],
    showUserGuides: record.showUserGuides ?? true,
    lockUserGuides: record.lockUserGuides ?? false,
    showBleedGuides: record.showBleedGuides ?? false,
    bleedMarginMM:
      typeof record.bleedMarginMM === 'number' && Number.isFinite(record.bleedMarginMM)
        ? record.bleedMarginMM
        : 2,
    safeMarginMM:
      typeof record.safeMarginMM === 'number' && Number.isFinite(record.safeMarginMM)
        ? record.safeMarginMM
        : 2,
    cutShapeType: (['rectangle', 'circle', 'rounded-rect'].includes(record.cutShapeType as string)
      ? record.cutShapeType
      : 'rectangle') as 'rectangle' | 'circle' | 'rounded-rect',
    collageGap: record.collageGap ?? 0,
    collageMargin: record.collageMargin ?? 0,
    collageRadius: record.collageRadius ?? 0,
    collageStrokeWidth: record.collageStrokeWidth ?? 0,
  };

  return normalized as ProjectFileV1;
}

// Validation and parsing — مع تعقيم النصوص الواردة من ملفات قديمة/خارجية
export function deserializeProjectFile(raw: unknown): ProjectFileV1 {
  const migrated = migrateProject(raw);
  // تعقيم نصوص العناصر قبل التحقق لضمان عدم دخول نصوص ضخمة/ملوثة للـ store
  if (Array.isArray((migrated as Record<string, unknown>).elements)) {
    const els = (migrated as { elements: unknown[] }).elements;
    for (const el of els) {
      if (el && typeof el === 'object') {
        if ((el as Record<string, unknown>).type === 'text') {
          const t = (el as Record<string, unknown>).text;
          if (typeof t === 'string') (el as Record<string, unknown>).text = sanitizeText(t);
        }
        const src = (el as Record<string, unknown>).stickerSource;
        if (src && typeof src === 'object') {
          const svg = (src as Record<string, unknown>).svg;
          if (typeof svg === 'string') {
            (src as Record<string, unknown>).svg = sanitizeSvgMarkup(svg);
          }
        }
      }
    }
  }
  const parsed = ProjectFileSchema.safeParse(migrated);
  if (!parsed.success) {
    throw new Error('Project file validation failed: ' + parsed.error.message);
  }
  return parsed.data;
}

// Map from Domain (DB) to ProjectFile DTO
export function domainProjectToProjectFile(dbProj: domain.Project): ProjectFileV1 {
  const parseSafely = <T>(data: string | undefined | null, fallback: T): T => {
    if (!data) return fallback;
    try {
      return JSON.parse(data);
    } catch (e) {
      logger.error('Failed to parse project JSON data', e);
      return fallback;
    }
  };

  const elements = parseSafely(dbProj.elements, []);
  const slots = parseSafely(dbProj.slots, []);
  const template = parseSafely(dbProj.template, null);
  const collageTemplate = parseSafely(dbProj.collageTemplate, null);
  const printSettings = parseSafely(dbProj.printSettings, undefined);

  // 🎨 التدرج: العمود الجديد في قاعدة البيانات يبدأ بصفر للمشاريع المحفوظة قبل
  // إضافته، والصفر زاوية صالحة (0° أفقية) — فلا يمكن تمييز «لم تُحفظ قط» من
  // «محفوظة كصفر». لذلك لا نُصدّر زاوية إلا مع وجود لون ثانٍ فعلي، فيبقى 135
  // هو الافتراضي عند تفعيل التدرج لاحقاً بدل أن يُقرأ صفر موهوم.
  const gradientColor2 =
    typeof dbProj.backgroundGradientColor2 === 'string' && dbProj.backgroundGradientColor2
      ? dbProj.backgroundGradientColor2
      : null;
  const gradientAngle =
    gradientColor2 &&
    typeof dbProj.backgroundGradientAngle === 'number' &&
    isFinite(dbProj.backgroundGradientAngle)
      ? dbProj.backgroundGradientAngle
      : undefined;

  const projectFile: ProjectFileV1 = {
    version: CURRENT_PROJECT_VERSION,
    savedAt: dbProj.updatedAt || new Date().toISOString(),
    mode: dbProj.mode as 'single' | 'collage',
    canvasWidth: dbProj.canvasWidth,
    canvasHeight: dbProj.canvasHeight,
    backgroundColor: dbProj.backgroundColor,
    backgroundGradientColor2: gradientColor2,
    backgroundGradientAngle: gradientAngle,
    elements,
    slots,
    template,
    collageTemplate,
    printSettings,

    // The following properties will be mapped safely
    showGrid: dbProj.showGrid ?? false,
    gridSize: dbProj.gridSize ?? 48,
    gridColor: dbProj.gridColor ?? '#000000',
    gridOpacity: dbProj.gridOpacity ?? 0.15,
    gridSubdivisions: dbProj.gridSubdivisions ?? 5,
    gridType: dbProj.gridType === 'dots' ? 'dots' : 'lines',
    snapToGrid: dbProj.snapToGrid ?? false,
    showColumns: dbProj.showColumns ?? false,
    columnsCount: dbProj.columnsCount ?? 12,
    columnsColor: dbProj.columnsColor ?? 'rgba(239, 68, 68, 0.08)',
    columnsMargin: dbProj.columnsMargin ?? 20,
    columnsGutter: dbProj.columnsGutter ?? 12,
    showRuler: dbProj.showRuler ?? true,
    rulerUnit: (['mm', 'cm', 'in', 'px'].includes(dbProj.rulerUnit) ? dbProj.rulerUnit : 'mm') as
      'mm' | 'cm' | 'in' | 'px',
    userGuides: parseSafely(dbProj.userGuides, []),
    showUserGuides: dbProj.showUserGuides ?? true,
    lockUserGuides: dbProj.lockUserGuides ?? false,
    showBleedGuides: dbProj.showBleedGuides ?? false,
    bleedMarginMM:
      typeof dbProj.bleedMarginMM === 'number' && Number.isFinite(dbProj.bleedMarginMM)
        ? dbProj.bleedMarginMM
        : 2,
    safeMarginMM:
      typeof dbProj.safeMarginMM === 'number' && Number.isFinite(dbProj.safeMarginMM)
        ? dbProj.safeMarginMM
        : 2,
    cutShapeType: (['rectangle', 'circle', 'rounded-rect'].includes(dbProj.cutShapeType)
      ? dbProj.cutShapeType
      : 'rectangle') as 'rectangle' | 'circle' | 'rounded-rect',
    collageGap: dbProj.collageGap ?? 0,
    collageMargin: dbProj.collageMargin ?? 0,
    collageRadius: dbProj.collageRadius ?? 0,
    collageShowCutLines: dbProj.collageShowCutLines ?? false,
    collageShowEndCutLine: dbProj.collageShowEndCutLine ?? true,
    collageStrokeWidth: dbProj.collageStrokeWidth ?? 0,
    collageStrokeColor: dbProj.collageStrokeColor ?? '#000000',
  };

  return deserializeProjectFile(projectFile);
}

// Map from ProjectFile DTO to Domain (DB)
export function projectFileToDomainProject(
  file: ProjectFileV1,
  id: string,
  name: string,
): domain.Project {
  const source: Partial<domain.Project> = {
    id,
    name,
    mode: file.mode,
    canvasWidth: file.canvasWidth,
    canvasHeight: file.canvasHeight,
    backgroundColor: file.backgroundColor,
    backgroundGradientColor2: file.backgroundGradientColor2 ?? '',
    backgroundGradientAngle: file.backgroundGradientAngle ?? 135,
    elements: JSON.stringify(file.elements),
    slots: JSON.stringify(file.slots),
    template: file.template ? JSON.stringify(file.template) : '',
    collageTemplate: file.collageTemplate ? JSON.stringify(file.collageTemplate) : '',
    printSettings: file.printSettings ? JSON.stringify(file.printSettings) : '',
    showGrid: file.showGrid ?? false,
    gridSize: file.gridSize ?? 48,
    gridColor: file.gridColor ?? '#000000',
    gridOpacity: file.gridOpacity ?? 0.15,
    gridSubdivisions: file.gridSubdivisions ?? 5,
    gridType: file.gridType ?? 'lines',
    snapToGrid: file.snapToGrid ?? false,
    showColumns: file.showColumns ?? false,
    columnsCount: file.columnsCount ?? 12,
    columnsColor: file.columnsColor ?? 'rgba(239, 68, 68, 0.08)',
    columnsMargin: file.columnsMargin ?? 20,
    columnsGutter: file.columnsGutter ?? 12,
    showRuler: file.showRuler ?? true,
    rulerUnit: file.rulerUnit ?? 'mm',
    userGuides: JSON.stringify(file.userGuides || []),
    showUserGuides: file.showUserGuides ?? true,
    lockUserGuides: file.lockUserGuides ?? false,
    showBleedGuides: file.showBleedGuides ?? false,
    bleedMarginMM: file.bleedMarginMM ?? 2,
    safeMarginMM: file.safeMarginMM ?? 2,
    cutShapeType: file.cutShapeType ?? 'rectangle',
    collageGap: file.collageGap ?? 0,
    collageMargin: file.collageMargin ?? 0,
    collageRadius: file.collageRadius ?? 0,
    collageShowCutLines: file.collageShowCutLines ?? false,
    collageShowEndCutLine: file.collageShowEndCutLine ?? true,
    collageStrokeWidth: file.collageStrokeWidth ?? 0,
    collageStrokeColor: file.collageStrokeColor ?? '#000000',
  };

  return new domain.Project(source);
}
