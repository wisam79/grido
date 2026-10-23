import { fitTextGeometry } from '@/lib/canvas/text-fit';
import { sanitizeText } from '@/lib/canvas/text-helpers';

import { nextZIndex, normalizeSelection } from './types';
import { TEXT_PRESETS } from '../../../templates';
import { uid } from '../../../utils';

import type { ElementCross, ElementSlice } from './types';
import type { CanvasElement, TextElement } from '../../types';
import type { StateCreator } from 'zustand';

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

    // تقدير أولي يُستخدم فقط إن تعذّر القياس الحقيقي (بيئة بلا Canvas)
    const fontSize = 32;
    const charWidth = fontSize * 0.9;
    const estimatedPx = Math.max(160, Math.min(canvasW * 0.6, sanitized.length * charWidth + 60));

    const newEl: TextElement = {
      id,
      type: 'text',
      x: 0,
      y: 0.45,
      width: estimatedPx / canvasW,
      height: 0.05,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(get().elements),
      text: sanitized,
      fontSize: 32,
      fontWeight: 700,
      color: '#1a1a2e',
      fontFamily: '"IBM Plex Sans Arabic", Cairo, Tajawal, sans-serif',
      textAlign: 'center',
      textSizing: 'auto',
      textBgColor: 'transparent',
      lineHeight: 1.2,
      letterSpacing: 0,
    };

    const fit = fitTextGeometry(newEl, canvasW, canvasH);
    if (fit?.measured) {
      newEl.width = fit.width;
      newEl.height = fit.height;
    }
    newEl.x = 0.5 - newEl.width / 2;

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

    const newEl: TextElement = {
      id,
      type: 'text',
      x: 0,
      y: 0.45,
      width: estimatedPx / canvasW,
      height: config.height,
      rotation: config.rotation ?? 0,
      opacity: config.opacity ?? 1,
      zIndex: nextZIndex(get().elements),
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

    const fit = fitTextGeometry(newEl, canvasW, canvasH);
    if (fit?.measured) {
      newEl.width = fit.width;
      newEl.height = fit.height;
    }
    newEl.x = 0.5 - newEl.width / 2;

    set((s) => ({
      elements: [...s.elements, newEl],
      ...normalizeSelection(id),
    }));
    get().pushHistory();
  },

  applyTextPreset: (id, preset) => {
    const el = get().elements.find((x) => x.id === id);
    if (!el || el.type !== 'text') return;
    const config = TEXT_PRESETS[preset] || TEXT_PRESETS.heading;
    const state = get();

    const patch: Partial<TextElement> = {
      // نمط جديد = تخطيط جديد؛ لا يُورَّث ركن تحجيم زاوية قديم.
      textResizeAnchor: undefined,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color: config.color,
      fontFamily: config.fontFamily,
      textBgColor: config.textBgColor ?? 'transparent',
      textBgRadius: config.textBgRadius ?? 0,
      textBgPadding: config.textBgPadding ?? 0,
      textBgBorderColor: config.textBgBorderColor,
      textBgBorderWidth: config.textBgBorderWidth,
      textBgPaddingX: config.textBgPaddingX,
      textBgPaddingY: config.textBgPaddingY,
      lineHeight: config.lineHeight ?? 1.2,
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
    if (!el || el.type !== 'text') return;

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
