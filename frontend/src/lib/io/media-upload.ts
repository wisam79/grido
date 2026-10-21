import { setCachedImageAspectRatio } from '@/lib/canvas/image-dimensions';
import { fetchLocalApi } from '@/lib/local-api';

import { SaveImageFromBase64 } from '../../../wailsjs/go/main/App';

export interface UploadMediaResult {
  imageSrc: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

/**
 * يرفع كائن Blob ثنائي مباشرة إلى خادم الوسائط المحلي /api/upload-media
 * دون تحويله إلى نصوص Base64 في ذاكرة V8 Heap.
 * يحدّث كاش أبعاد الصورة في الذاكرة فوراً لضمان سرعة الوصول اللاحق O(1).
 */
export async function uploadMediaBlob(
  blob: Blob,
  filename = 'image.png',
): Promise<UploadMediaResult> {
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    !window.location.origin.startsWith('file:') &&
    typeof fetch === 'function'
  ) {
    const formData = new FormData();
    formData.append('file', blob, filename);
    const resp = await fetchLocalApi(`${window.location.origin}/api/upload-media`, {
      method: 'POST',
      body: formData,
    });
    if (resp.ok) {
      const data = (await resp.json()) as {
        status: string;
        imageSrc: string;
        width?: number;
        height?: number;
        aspectRatio?: number;
      };
      if (data.status === 'success' && data.imageSrc) {
        if (typeof data.aspectRatio === 'number' && data.aspectRatio > 0) {
          setCachedImageAspectRatio(data.imageSrc, data.aspectRatio);
        }
        return {
          imageSrc: data.imageSrc,
          width: data.width,
          height: data.height,
          aspectRatio: data.aspectRatio,
        };
      }
    }
  }

  // Fallback إلى المسار الاحتياطي: تحويل إلى DataURL ثم SaveImageFromBase64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const localPath = await SaveImageFromBase64(dataUrl);
        resolve({ imageSrc: localPath });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * يحول عنصر HTML5 Canvas إلى Blob ثنائي ويرفعه مباشرة إلى خادم الوسائط المحلي.
 */
export async function uploadCanvasBlob(
  canvas: HTMLCanvasElement,
  mimeType = 'image/png',
  quality?: number,
  filename = 'canvas-export.png',
): Promise<UploadMediaResult> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
  if (!blob) {
    throw new Error('Failed to create Blob from Canvas');
  }
  return uploadMediaBlob(blob, filename);
}
