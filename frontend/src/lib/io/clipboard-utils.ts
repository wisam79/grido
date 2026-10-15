import { useEditorStore } from '@/lib/editor-store';
import { CanvasElement } from '@/lib/store/types';
import {
  SaveImageFromBase64,
  GetClipboardText,
  SetClipboardText,
} from '../../../wailsjs/go/main/App';
import { resolveImageAspectRatio } from '@/lib/canvas/image-dimensions';
import { z } from 'zod';
import { CanvasElementSchema } from '@/lib/schema';
import { createLogger } from '@/lib/logger';
import { sanitizeText, TEXT_MAX_LENGTH } from '@/lib/canvas/text-helpers';

const logger = createLogger('clipboard-utils');

/**
 * دالة عامة موحدة للصق المحتوى (من حافظة النظام أو حافظة الـ Store الداخلية)
 * تعمل بسلاسة في اختصارات الكيبورد (Ctrl+V) وتتكامل مع الزر الأيمن (Context Menu)
 */
export async function pasteFromClipboardOrStore(): Promise<boolean> {
  // 🛡️ كل قراءة للحالة تأتي من getState() **لحظة الاستخدام** — التقاط مرجع واحد
  // قبل await navigator.clipboard كان يُقرأ بعد ثوانٍ فيرى slots/selectedId قديمة
  // فتذهب الصورة الملصوقة إلى خانة خاطئة أو إلى الوضع الخطأ (E-تزامن).
  const readState = () => useEditorStore.getState();

  // 1. محاولة القراءة من حافظة الويندوز/النظام أولاً (System Clipboard)
  let text: string | null = null;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      text = await navigator.clipboard.readText();
    }
  } catch (err) {
    logger.warn('System clipboard text read not permitted, falling back to Wails', err);
  }

  // استخدام بديل Wails الأصلي إذا تعذرت القراءة عبر المتصفح
  if ((!text || !text.trim()) && typeof GetClipboardText === 'function') {
    try {
      text = await GetClipboardText();
    } catch {
      // تجاهل في حالة عدم توفر الواجهة
    }
  }

  if (text && text.trim()) {
    if (text.startsWith('GRIDO_ELEMENTS:')) {
      try {
        const rawJson = text.replace('GRIDO_ELEMENTS:', '');
        const rawParsed: unknown = JSON.parse(rawJson);
        const parseResult = z.array(CanvasElementSchema).safeParse(rawParsed);
        if (parseResult.success && parseResult.data.length > 0) {
          readState().pasteCopiedElements(parseResult.data as unknown as CanvasElement[]);
          return true;
        }
      } catch (err) {
        logger.error('Failed to parse GRIDO_ELEMENTS from clipboard', err);
      }
    } else if (readState().mode !== 'collage') {
      // نص خارجي من متصفح/ورد/مفكرة — تعقيم + تنبيه عند الاقتطاع
      const sanitized = sanitizeText(text);
      if (text.length > TEXT_MAX_LENGTH) {
        const { toast } = await import('sonner');
        toast.info(`تم اقتطاع النص الطويل إلى ${TEXT_MAX_LENGTH} حرفاً`);
      }
      readState().addTextElement(sanitized);
      return true;
    }
  }

  // 2. فحص الصور المنسوخة في حافظة النظام
  try {
    if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onload = async (event) => {
              if (event.target?.result) {
                const b64 = event.target.result as string;
                try {
                  const localPath = await SaveImageFromBase64(b64);
                  if (localPath) {
                    // قراءة آنية: القالب الملتقط قبل await رأى خانات/تحديداً
                    // قد يكون تغيّر أثناء قراءة الحافظة والترميز
                    const { mode, selectedId, slots, setSlotImage, addImageElement } = readState();
                    if (mode === 'collage') {
                      let targetSlotId = selectedId;
                      if (!targetSlotId) {
                        const emptySlot = slots.find((s) => !s.imageSrc);
                        if (emptySlot) targetSlotId = emptySlot.id;
                        else if (slots.length > 0) targetSlotId = slots[0].id;
                      }
                      if (targetSlotId) setSlotImage(targetSlotId, localPath);
                    } else {
                      const aspect = await resolveImageAspectRatio(localPath);
                      addImageElement(localPath, aspect);
                    }
                    resolve(true);
                    return;
                  }
                } catch (e) {
                  logger.error('Failed to save image from clipboard read', e);
                }
              }
              resolve(false);
            };
            reader.readAsDataURL(blob);
          });
        }
      }
    }
  } catch (err) {
    logger.warn('System clipboard image read not permitted or failed', err);
  }

  // 3. الفحص الاحتياطي لحافظة الـ Store الداخلية
  const fallbackState = readState();
  if (fallbackState.clipboardElements && fallbackState.clipboardElements.length > 0) {
    fallbackState.pasteCopiedElements();
    return true;
  }

  return false;
}

/**
 * Copies a PNG base64 Data URL directly to clipboard as an Image Blob.
 */
export async function copyPngDataUrlToClipboard(pngDataUrl: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return false;
    }
    const res = await fetch(pngDataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
    return true;
  } catch (err) {
    logger.error('Failed to copy image blob to clipboard', err);
    return false;
  }
}

/**
 * Copies raw SVG vector markup code directly to clipboard as text.
 */
export async function copySvgCodeToClipboard(svgString: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(svgString);
      return true;
    }
  } catch (err) {
    logger.warn('navigator.clipboard.writeText failed, falling back to Wails', err);
  }

  // استخدام بديل Wails الأصلي
  if (typeof SetClipboardText === 'function') {
    try {
      await SetClipboardText(svgString);
      return true;
    } catch (wErr) {
      logger.error('Wails SetClipboardText failed', wErr);
    }
  }

  return false;
}
