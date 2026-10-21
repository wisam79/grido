import { sanitizeText } from '@/lib/canvas/text-helpers';

import { nextZIndex, normalizeSelection } from './types';
import { TEXT_PRESETS } from '../../../templates';
import { uid } from '../../../utils';

import type { ElementCross, ElementSlice } from './types';
import type { CanvasElement } from '../../types';
import type { StateCreator } from 'zustand';

export const createTextElementsSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<ElementSlice, 'addTextElement' | 'addTextPreset' | 'autoFitTextWidth'>
> = (set, get) => ({
  addTextElement: (text = 'نص جديد') => {
    const sanitized = sanitizeText(String(text ?? 'نص جديد'));
    const id = uid();
    const state = get();
    const canvasW = state.canvasWidth || 2480;

    // قياس وتناسب عرض مربع النص مع طول النص بدقة لمنع المساحات الفارغة الشاسعة
    const fontSize = 32;
    const charWidth = fontSize * 0.9;
    const estimatedPx = Math.max(160, Math.min(canvasW * 0.6, sanitized.length * charWidth + 60));
    const initialW = estimatedPx / canvasW;

    const newEl: CanvasElement = {
      id,
      type: 'text',
      x: 0.5 - initialW / 2,
      y: 0.45,
      width: initialW,
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
      textBgColor: 'transparent',
      lineHeight: 1.2,
      letterSpacing: 0,
    };
    set((s) => ({
      elements: [...s.elements, newEl],
      ...normalizeSelection(id),
    }));
    get().pushHistory();
  },

  addTextPreset: (preset) => {
    const id = uid();
    const state = get();
    const canvasW = state.canvasWidth || 2480;

    const config = TEXT_PRESETS[preset] || TEXT_PRESETS.heading;
    const text = config.getText();
    const fontSize = config.fontSize;

    const charWidth = fontSize * 0.9;
    const estimatedPx = Math.max(160, Math.min(canvasW * 0.7, text.length * charWidth + 60));
    const initialW = estimatedPx / canvasW;

    const newEl: CanvasElement = {
      id,
      type: 'text',
      x: 0.5 - initialW / 2,
      y: 0.45,
      width: initialW,
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

    set((s) => ({
      elements: [...s.elements, newEl],
      ...normalizeSelection(id),
    }));
    get().pushHistory();
  },

  autoFitTextWidth: (id: string, textWidthPx?: number) => {
    const el = get().elements.find((x) => x.id === id);
    if (!el || el.type !== 'text') return;

    const canvasW = get().canvasWidth || 2480;
    let newWidth = el.width;

    if (textWidthPx && textWidthPx > 0) {
      newWidth = Math.min(0.85, Math.max(0.04, (textWidthPx + 40) / canvasW));
    } else if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let textToMeasure = el.text || '';
        if (el.arabicNumerals) {
          textToMeasure = textToMeasure.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)]);
        }
        const fontStylePrefix = el.fontStyle === 'italic' ? 'italic ' : '';
        ctx.font = `${fontStylePrefix}${el.fontWeight || 400} ${el.fontSize || 32}px ${el.fontFamily || 'Cairo, Tajawal, sans-serif'}`;
        const metrics = ctx.measureText(textToMeasure);
        const letterSpacingExtra = (el.letterSpacing || 0) * textToMeasure.length;
        const totalW = metrics.width + Math.max(0, letterSpacingExtra);
        newWidth = Math.min(0.95, Math.max(0.04, (totalW + 48) / canvasW));
      }
    }

    set((s) => ({
      elements: s.elements.map((item: CanvasElement) =>
        item.id === id ? { ...item, width: newWidth } : item,
      ),
    }));
    get().pushHistory();
  },
});
