import { toast } from 'sonner';

import { SaveImageFromBase64 } from '@bindings/grido/app';

import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { createLogger } from '@/lib/logger';
import { wailsIsDesktop } from '@/lib/wails-env';
import { toErrorMessage } from '@/lib/wails-error';

import type { CanvasElement, ImageElement } from '@/lib/store/types';

const logger = createLogger('image-crop-commit');

export interface CommitImageElementCropOptions {
  elementId: string;
  expectedImageSrc: string;
  cropped: string;
  dims?: { width: number; height: number };
  session?: number;
  isActive?: () => boolean;
  isMounted?: () => boolean;
  onUpdate?: (id: string, patch: Partial<CanvasElement>) => void;
}

function decodeImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };
    img.onload = () => {
      const size = {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      };
      cleanup();
      resolve(size);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('فشل قراءة القص'));
    };
    img.src = src;
  });
}

/**
 * مصدر الحقيقة الموحد لحفظ نتيجة قص صورة في الوضع الحر:
 * - يتحقق من طزاجة الهدف والجلسة والتركيب قبل وبعد العمليات غير المتزامنة.
 * - يحفظ `originalImageSrc` عند أول قص أو تعديل فقط دون مسح الأصل السابق.
 * - يحدّث نسبة ارتفاع العنصر ويدفع خطوة تراجع واحدة في التاريخ.
 */
export async function commitImageElementCrop(
  options: CommitImageElementCropOptions,
): Promise<boolean> {
  const startSession = options.session ?? getDocumentSession();

  const getLiveElement = (): ImageElement | null => {
    const item = useEditorStore.getState().elements.find((el) => el.id === options.elementId);
    return item && item.type === 'image' && !item.locked ? item : null;
  };

  const isCurrent = (): boolean => {
    if (options.isMounted && !options.isMounted()) return false;
    if (options.isActive && !options.isActive()) return false;
    if (getDocumentSession() !== startSession) return false;
    const live = getLiveElement();
    return live !== null && live.imageSrc === options.expectedImageSrc;
  };

  try {
    if (!isCurrent()) return false;

    let localPath = options.cropped;
    if (wailsIsDesktop() && options.cropped.startsWith('data:image/')) {
      const savedPath = await SaveImageFromBase64(options.cropped);
      if (savedPath) {
        localPath = savedPath;
      }
    }
    if (!isCurrent()) return false;

    let resolvedDims = options.dims;
    if (
      !resolvedDims ||
      !Number.isFinite(resolvedDims.width) ||
      !Number.isFinite(resolvedDims.height) ||
      resolvedDims.width <= 0 ||
      resolvedDims.height <= 0
    ) {
      resolvedDims = await decodeImageDimensions(options.cropped);
    }
    if (!isCurrent()) return false;

    const { width: w, height: h } = resolvedDims;
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      throw new Error('فشل قراءة أبعاد القص');
    }

    const state = useEditorStore.getState();
    const live = getLiveElement();
    if (!live || live.imageSrc !== options.expectedImageSrc) return false;

    const croppedAspect = w / h;
    const canvasRatio = state.canvasHeight > 0 ? state.canvasWidth / state.canvasHeight : 1;
    const newHeight = (live.width * canvasRatio) / croppedAspect;
    const originalImageSrc = live.originalImageSrc || live.imageSrc;

    const apply = options.onUpdate ?? state.updateElement;
    apply(live.id, {
      imageSrc: localPath,
      height: newHeight,
      originalImageSrc,
    });

    state.setLastEditedImage(localPath);
    state.setLastEditedImageAspect(croppedAspect);
    state.pushHistory();
    return true;
  } catch (err) {
    if (isCurrent()) {
      logger.error('Failed to save cropped image:', err);
      toast.error(toErrorMessage(err, 'فشل حفظ القص'));
    }
    return false;
  }
}
