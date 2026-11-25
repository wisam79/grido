import { fitTextGeometry } from '@/lib/canvas/text-fit';
import { sanitizeText } from '@/lib/canvas/text-helpers';
import { clamp } from '@/lib/clamp';

import { nextZIndex, normalizeSelection } from './types';
import { TEXT_PRESETS } from '../../../templates';
import { uid } from '../../../utils';

import type { ElementCross, ElementSlice } from './types';
import type { CanvasElement, TextElement } from '../../types';
import type { StateCreator } from 'zustand';

const TEXT_INSERT_MARGIN = 0.04;
const TEXT_CASCADE_STEP_X = 0.02;
const TEXT_CASCADE_STEP_Y = 0.035;
const TEXT_CASCADE_SLOTS = 8;

function resolveInsertedTextPosition(
  existingElements: readonly CanvasElement[],
  width: number,
  height: number,
): { x: number; y: number } {
  const maxX = Math.max(TEXT_INSERT_MARGIN, 1 - width - TEXT_INSERT_MARGIN);
  const maxY = Math.max(TEXT_INSERT_MARGIN, 1 - height - TEXT_INSERT_MARGIN);
  const baseX = clamp(0.5 - width / 2, TEXT_INSERT_MARGIN, maxX);
  const baseY = clamp(0.5 - height / 2, TEXT_INSERT_MARGIN, maxY);

  for (let step = 0; step < TEXT_CASCADE_SLOTS; step += 1) {
    const x = clamp(baseX + step * TEXT_CASCADE_STEP_X, TEXT_INSERT_MARGIN, maxX);
    const y = clamp(baseY + step * TEXT_CASCADE_STEP_Y, TEXT_INSERT_MARGIN, maxY);
    const collides = existingElements.some(
      (el) => Math.abs(el.x - x) < 0.015 && Math.abs(el.y - y) < 0.018,
    );
    if (!collides) return { x, y };
  }

  return {
    x: clamp(baseX + TEXT_CASCADE_STEP_X, TEXT_INSERT_MARGIN, maxX),
    y: clamp(baseY + TEXT_CASCADE_STEP_Y, TEXT_INSERT_MARGIN, maxY),
  };
}

function placeInsertedTextElement(
  el: TextElement,
  existingElements: readonly CanvasElement[],
  canvasW: number,
  canvasH: number,
): TextElement {
  const fit = fitTextGeometry(el, canvasW, canvasH);
  const width = fit?.measured ? fit.width : el.width;
  const height = fit?.measured ? fit.height : el.height;
  const { x, y } = resolveInsertedTextPosition(existingElements, width, height);
  return { ...el, width, height, x, y };
}

export const createTextElementsSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<ElementSlice, 'addTextElement' | 'addTextPreset' | 'applyTextPreset' | 'fitTextToContent'>
> = (set, get) => ({
  addTextElement: (text = 'نص جديد') => {
    const sanitized = sanitizeText(String(text ?? 'نص جديد'));
    const id = uid();
    const state = get();
    const canvasW = state.canvasWidth || 2480;
    const canvasH = state.canvasHeight || 2480;

    // مقياس خط متجاوب مع أبعاد الكانفس بحيث يظهر النص واضحاً على الصفحات عالية الدقة (مثل A4 300 DPI)
    const fontSize = Math.max(32, Math.min(96, Math.round(Math.min(canvasW, canvasH) * 0.036)));
    const charWidth = fontSize * 0.9;
    const estimatedPx = Math.max(160, Math.min(canvasW * 0.6, sanitized.length * charWidth + 60));

    const draft: TextElement = {
      id,
      type: 'text',
      x: 0,
      y: 0.45,
      width: estimatedPx / canvasW,
      height: 0.05,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(state.elements),
      text: sanitized,
      fontSize,
      fontWeight: 700,
      color: '#1a1a2e',
      fontFamily: '"IBM Plex Sans Arabic", Cairo, Tajawal, sans-serif',
      textAlign: 'center',
      textSizing: 'auto',
      textBgColor: 'transparent',
      lineHeight: 1.2,
      letterSpacing: 0,
    };

    const newEl = placeInsertedTextElement(draft, state.elements, canvasW, canvasH);

    set((s) => ({
      elements: [...s.elements, newEl],
      ...normalizeSelection(id),
    }));
    get().pushHistory();
    return id;
  },

  addTextPreset: (preset, customText) => {
    const id = uid();
    const state = get();
    const canvasW = state.canvasWidth || 2480;
    const canvasH = state.canvasHeight || 2480;

    const config = TEXT_PRESETS[preset] || TEXT_PRESETS.heading;
    const text =
      customText && customText.trim().length > 0
        ? sanitizeText(customText.trim())
        : config.getText();
    const fontSize = config.fontSize;

    const charWidth = fontSize * 0.9;
    const estimatedPx = Math.max(160, Math.min(canvasW * 0.7, text.length * charWidth + 60));

    const draft: TextElement = {
      id,
      type: 'text',
      x: 0,
      y: 0.45,
      width: estimatedPx / canvasW,
      height: config.height,
      rotation: config.rotation ?? 0,
      opacity: config.opacity ?? 1,
      zIndex: nextZIndex(state.elements),
      text,
      fontSize,
      fontWeight: config.fontWeight,
      color: config.color,
      fontFamily: config.fontFamily,
      textAlign: 'center',
      textSizing: 'auto',
      textBgColor: config.textBgColor ?? 'transparent',
      textBgRadius: config.textBgRadius ?? 0,
      textBgPadding: config.textBgPadding ?? 0,
      textBgBorderColor: config.textBgBorderColor,
      textBgBorderWidth: config.textBgBorderWidth,
      textBgPaddingX: config.textBgPaddingX,
      textBgPaddingY: config.textBgPaddingY,
      lineHeight: config.lineHeight ?? 1.2,
      letterSpacing: 0,
      stroke: config.stroke,
      strokeWidth: config.strokeWidth,
      shadowColor: config.shadowColor,
      shadowBlur: config.shadowBlur,
      shadowOffsetX: config.shadowOffsetX,
      shadowOffsetY: config.shadowOffsetY,
      shadowOpacity: config.shadowOpacity,
      shadowGlow: config.shadowGlow,
      curve: config.curve,
      fillType: config.fillType ?? 'solid',
      fillLinearGradientStartPoint: config.fillLinearGradientStartPoint,
      fillLinearGradientEndPoint: config.fillLinearGradientEndPoint,
      fillLinearGradientColorStops: config.fillLinearGradientColorStops,
    };

    const newEl = placeInsertedTextElement(draft, state.elements, canvasW, canvasH);

    set((s) => ({
      elements: [...s.elements, newEl],
      ...normalizeSelection(id),
    }));
    get().pushHistory();
  },

  applyTextPreset: (id, preset) => {
    const el = get().elements.find((x) => x.id === id);
    if (!el || el.type !== 'text' || el.locked) return;
    const config = TEXT_PRESETS[preset] || TEXT_PRESETS.heading;
    const state = get();

    const patch: Partial<TextElement> = {
      // نمط جديد = تخطيط جديد؛ لا يُورَّث ركن تحجيم زاوية قديم.
      textResizeAnchor: undefined,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      fontStyle: 'normal',
      color: config.color,
      fontFamily: config.fontFamily,
      textDecoration: 'none',
      textTransform: 'none',
      textBgColor: config.textBgColor ?? 'transparent',
      textBgRadius: config.textBgRadius ?? 0,
      textBgPadding: config.textBgPadding ?? 0,
      textBgBorderColor: config.textBgBorderColor,
      textBgBorderWidth: config.textBgBorderWidth,
      textBgPaddingX: config.textBgPaddingX,
      textBgPaddingY: config.textBgPaddingY,
      lineHeight: config.lineHeight ?? 1.2,
      letterSpacing: 0,
      stroke: config.stroke,
      strokeWidth: config.strokeWidth,
      shadowColor: config.shadowColor,
      shadowBlur: config.shadowBlur,
      shadowOffsetX: config.shadowOffsetX,
      shadowOffsetY: config.shadowOffsetY,
      shadowOpacity: config.shadowOpacity,
      shadowGlow: config.shadowGlow,
      curve: config.curve,
      fillType: config.fillType ?? 'solid',
      fillLinearGradientStartPoint: config.fillLinearGradientStartPoint,
      fillLinearGradientEndPoint: config.fillLinearGradientEndPoint,
      fillLinearGradientColorStops: config.fillLinearGradientColorStops,
      fillRadialGradientStartPoint: undefined,
      fillRadialGradientEndPoint: undefined,
      fillRadialGradientStartRadius: undefined,
      fillRadialGradientEndRadius: undefined,
      fillRadialGradientColorStops: undefined,
      fillImageSrc: undefined,
      fillImageFit: undefined,
      fillImageScale: undefined,
      fillImageRotation: undefined,
      fillImageOffsetX: undefined,
      fillImageOffsetY: undefined,
    };

    // النمط يغيّر المقاس فوراً — نلائم الصندوق في نفس التحديث بدل نبضة لاحقة
    const fit = fitTextGeometry(
      { ...el, ...patch },
      state.canvasWidth || 2480,
      state.canvasHeight || 2480,
    );
    if (fit?.measured) {
      patch.width = fit.width;
      patch.height = fit.height;
      patch.x = fit.x;
      patch.y = fit.y;
    }

    set((s) => ({
      elements: s.elements.map((item) =>
        item.id === id ? ({ ...item, ...patch } as CanvasElement) : item,
      ),
    }));
    get().pushHistory();
  },

  fitTextToContent: (id: string) => {
    const el = get().elements.find((x) => x.id === id);
    if (!el || el.type !== 'text' || el.locked) return;

    const canvasW = get().canvasWidth || 2480;
    const canvasH = get().canvasHeight || 2480;
    const fit = fitTextGeometry({ ...el, textSizing: 'auto' }, canvasW, canvasH);
    // الملاءمة تتمركز من جديد — ارتساء الزاوية السابق لم يعد ذا معنى.
    const patch: Partial<TextElement> = { textSizing: 'auto', textResizeAnchor: undefined };
    if (fit) {
      patch.width = fit.width;
      patch.height = fit.height;
      patch.x = fit.x;
      patch.y = fit.y;
    }

    set((s) => ({
      elements: s.elements.map((item) =>
        item.id === id ? ({ ...item, ...patch } as CanvasElement) : item,
      ),
    }));
    get().pushHistory();
  },
});
