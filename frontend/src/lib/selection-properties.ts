import { isPrintFilterId } from './filters/print-filter-contract';

import type { PrintFilterId } from './filters/print-filter-contract';
import type { CanvasElement } from './store/types';

export type SelectionValue<T> = { kind: 'value'; value: T } | { kind: 'mixed' };
export type SelectionNumericKey = 'opacity' | 'fontSize' | 'brightness' | 'contrast' | 'saturation';
export type SelectionColorKey = 'textColor' | 'shapeFill';
export type SelectionChange =
  | { key: SelectionNumericKey; value: number }
  | { key: SelectionColorKey; value: string }
  | { key: 'filter'; value: PrintFilterId };
export type SelectionField =
  | {
      kind: 'number';
      key: SelectionNumericKey;
      label: string;
      unit: string;
      min: number;
      max: number;
      state: SelectionValue<number>;
    }
  | { kind: 'color'; key: SelectionColorKey; label: string; state: SelectionValue<string> }
  | { kind: 'filter'; key: 'filter'; label: string; state: SelectionValue<PrintFilterId> };

// Finite source matrix, not Partial<CanvasElement> broadcasting:
// opacity: BaseCanvasElement (display %, persisted 0..1).
// fontSize: TextElement + crud.ts TEXT_MEASURE_KEYS (anchor invalidation in store).
// solid colors: TextColorTab.color / ShapeStyleProperties.fill; only explicit HEX,
// solid fills, and filled shape kinds (no line/arc stroke masquerading as fill).
// image adjustments: ImageAdjustProperties, persisted 0..200%, default 100.
// filter: print-filter-contract.ts IDs and canonical default 'none'.
// No width/height, absolute x/y, source/content, gradients or arbitrary patches.
const NUMERIC_FIELDS = [
  { key: 'opacity', label: 'الشفافية', unit: '%', min: 0, max: 100 },
  { key: 'fontSize', label: 'حجم الخط', unit: 'px', min: 1, max: 500 },
  { key: 'brightness', label: 'السطوع', unit: '%', min: 0, max: 200 },
  { key: 'contrast', label: 'التباين', unit: '%', min: 0, max: 200 },
  { key: 'saturation', label: 'التشبع', unit: '%', min: 0, max: 200 },
] as const;

export function getSelectionElements(
  elements: readonly CanvasElement[],
  ids: readonly string[],
  primaryId?: string | null,
): CanvasElement[] {
  const targets = new Set(ids.length ? ids : primaryId ? [primaryId] : []);
  return elements.filter((element) => targets.has(element.id));
}

export function aggregateSelectionValue<T>(values: readonly T[]): SelectionValue<T> | undefined {
  if (!values.length) return undefined;
  return values.every((value) => Object.is(value, values[0]))
    ? { kind: 'value', value: values[0] }
    : { kind: 'mixed' };
}

export function isSelectionHex(value: string): boolean {
  return /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value);
}

function readNumeric(element: CanvasElement, key: SelectionNumericKey): number | undefined {
  switch (key) {
    case 'opacity':
      return Number.isFinite(element.opacity) ? element.opacity * 100 : undefined;
    case 'fontSize':
      return element.type === 'text' && Number.isFinite(element.fontSize)
        ? element.fontSize
        : undefined;
    default:
      return element.type === 'image' ? (element[key] ?? 100) : undefined;
  }
}

function readColor(element: CanvasElement, key: SelectionColorKey): string | undefined {
  if (element.fillType && element.fillType !== 'solid') return undefined;
  const color =
    key === 'textColor'
      ? element.type === 'text'
        ? element.color
        : undefined
      : element.type === 'shape' && element.shape !== 'line' && element.shape !== 'arc'
        ? element.fill
        : undefined;
  return color && isSelectionHex(color) ? color.toLowerCase() : undefined;
}

function supportedState<T>(
  elements: readonly CanvasElement[],
  read: (element: CanvasElement) => T | undefined,
): SelectionValue<T> | undefined {
  const values = elements.map(read);
  if (values.some((value) => value === undefined)) return undefined;
  return aggregateSelectionValue(values.filter((value): value is T => value !== undefined));
}

export function deriveSelectionProperties(elements: readonly CanvasElement[]) {
  const fields: SelectionField[] = [];
  for (const spec of NUMERIC_FIELDS) {
    const state = supportedState(elements, (element) => {
      const value = readNumeric(element, spec.key);
      return value !== undefined && Number.isFinite(value) && value >= spec.min && value <= spec.max
        ? value
        : undefined;
    });
    if (state) fields.push({ ...spec, kind: 'number', state });
  }
  for (const spec of [
    { key: 'textColor', label: 'لون النص' },
    { key: 'shapeFill', label: 'لون التعبئة' },
  ] as const) {
    const state = supportedState(elements, (element) => readColor(element, spec.key));
    if (state) fields.push({ ...spec, kind: 'color', state });
  }
  const filter = supportedState(elements, (element) => {
    if (element.type !== 'image') return undefined;
    const value = element.filter ?? 'none';
    return isPrintFilterId(value) ? value : undefined;
  });
  if (filter) fields.push({ kind: 'filter', key: 'filter', label: 'فلتر الصورة', state: filter });
  return {
    selectedCount: elements.length,
    eligibleCount: elements.filter((element) => !element.locked).length,
    fields,
  };
}

export function parseSelectionNumber(raw: string, min: number, max: number): number | undefined {
  const normalized = raw
    .trim()
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/٫/g, '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

export function buildSelectionPropertyPatches(
  elements: readonly CanvasElement[],
  change: SelectionChange,
) {
  // Recheck the *whole* current source selection at commit, including locked types.
  const field = deriveSelectionProperties(elements).fields.find((item) => item.key === change.key);
  if (!field) return [];
  const patches: { id: string; patch: Partial<CanvasElement> }[] = [];
  for (const element of elements) {
    if (element.locked) continue;
    let patch: Partial<CanvasElement>;
    if (field.kind === 'number' && typeof change.value === 'number') {
      const value = change.value;
      if (!Number.isFinite(value) || value < field.min || value > field.max) return [];
      if (Object.is(readNumeric(element, field.key), value)) continue;
      switch (field.key) {
        case 'opacity':
          patch = { opacity: value / 100 };
          break;
        case 'fontSize':
          patch = { fontSize: value };
          break;
        case 'brightness':
          patch = { brightness: value };
          break;
        case 'contrast':
          patch = { contrast: value };
          break;
        case 'saturation':
          patch = { saturation: value };
          break;
      }
    } else if (
      field.kind === 'color' &&
      typeof change.value === 'string' &&
      isSelectionHex(change.value)
    ) {
      if (readColor(element, field.key) === change.value.toLowerCase()) continue;
      patch = field.key === 'textColor' ? { color: change.value } : { fill: change.value };
    } else if (
      field.kind === 'filter' &&
      typeof change.value === 'string' &&
      isPrintFilterId(change.value)
    ) {
      if ((element.type === 'image' ? (element.filter ?? 'none') : undefined) === change.value)
        continue;
      patch = { filter: change.value };
    } else return [];
    patches.push({ id: element.id, patch });
  }
  return patches;
}

/** Existing align/group actions need complete, unlocked groups: never split a locked group. */
export function canArrangeSelection(
  elements: readonly CanvasElement[],
  ids: readonly string[],
): boolean {
  const selected = getSelectionElements(elements, ids);
  const groups = new Set(selected.flatMap((element) => (element.groupId ? [element.groupId] : [])));
  const targets = new Set(selected.map((element) => element.id));
  return (
    selected.some((element) => !element.locked) &&
    elements.every(
      (element) =>
        !element.groupId ||
        !groups.has(element.groupId) ||
        (targets.has(element.id) && !element.locked),
    )
  );
}

/** Move the eligible stack together, preserving internal layer order in one batch. */
export function buildSelectionLayerPatches(
  elements: readonly CanvasElement[],
  ids: readonly string[],
  direction: 'front' | 'back',
) {
  if (!canArrangeSelection(elements, ids)) return [];
  const selected = getSelectionElements(elements, ids)
    .filter((element) => !element.locked)
    .sort((a, b) => a.zIndex - b.zIndex);
  if (!selected.length || elements.some((element) => !Number.isFinite(element.zIndex))) return [];
  const targets = new Set(selected.map((element) => element.id));
  const others = elements.filter((element) => !targets.has(element.id));
  if (!others.length) return [];
  const edge = others.reduce(
    (value, element) =>
      direction === 'front' ? Math.max(value, element.zIndex) : Math.min(value, element.zIndex),
    others[0].zIndex,
  );
  if (
    selected.every((element) =>
      direction === 'front' ? element.zIndex > edge : element.zIndex < edge,
    )
  )
    return [];
  return selected.map((element, index) => ({
    id: element.id,
    patch: {
      zIndex:
        direction === 'front' ? edge + (index + 1) * 10 : edge - (selected.length - index) * 10,
    },
  }));
}
