import {
  OpenFile,
  OpenMultipleFiles,
  OpenDirectoryDialog,
  SaveImageFromBase64,
} from '../../../wailsjs/go/main/App';
import { wailsIsDesktop } from '../wails-env';
import { createLogger } from '@/lib/logger';

const logger = createLogger('file-dialog-utils');

/**
 * فتح نافذة اختيار الصور بسلاسة ودقة متناهية:
 * - في بيئة Wails Desktop: تستدعي Wails Native File Dialog حصرياً وترجع الناتج (أو مصفوفة فارغة عند الإلغاء) دون الانتقال لمتصفح الويب.
 * - في بيئة المتصفح العادي فقط: تستخدم HTML File Input.
 */
export async function openImageFileDialog(multiple = false): Promise<string[]> {
  const isWailsDesktop = wailsIsDesktop();

  if (isWailsDesktop) {
    try {
      if (multiple && typeof OpenMultipleFiles === 'function') {
        const res = await OpenMultipleFiles();
        return Array.isArray(res) ? res : [];
      }
      if (typeof OpenFile === 'function') {
        const single = await OpenFile();
        return single ? [single] : [];
      }
    } catch (err) {
      logger.error('Wails native file dialog error:', err);
      return [];
    }
    return [];
  }

  // بيئة المتصفح العادي (Browser Mode Only)
  return new Promise<string[]>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) {
        resolve([]);
        return;
      }
      const dataUrls: string[] = [];
      for (const file of files) {
        try {
          const dataUrl = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(file);
          });
          dataUrls.push(dataUrl);
        } catch (e) {
          logger.error('Failed to read file:', e);
        }
      }
      resolve(dataUrls);
    };

    input.oncancel = () => resolve([]);
    input.click();
  });
}

/**
 * اختيار صورة واحدة من الجهاز وإرجاع مسارها الدائم الجاهز للاستخدام.
 *
 * في Wails قد يعيد OpenFile مساراً محفوظاً مسبقاً (/local-image/...) وليس
 * بيانات base64 — وتمرير مسار عادي إلى SaveImageFromBase64 يفجّر استثناء
 * فك التشفير في Go، لذا تُمرَّر بيانات dataURL فقط. مصدر واحد لكل مسارات
 * «اختيار صورة» في التطبيق (بدل تكرار الفحص في كل لوحة خصائص).
 */
export async function pickLocalImage(): Promise<string | null> {
  const [picked] = await openImageFileDialog(false);
  if (!picked) return null;
  return picked.startsWith('data:image/') ? await SaveImageFromBase64(picked) : picked;
}

/**
 * فتح نافذة اختيار مجلد كامل واستيراد كافة الصور الموجودة داخله
 */
export async function openDirectoryImageDialog(): Promise<string[]> {
  const isWailsDesktop = wailsIsDesktop();

  if (isWailsDesktop) {
    try {
      if (typeof OpenDirectoryDialog === 'function') {
        const res = await OpenDirectoryDialog();
        return Array.isArray(res) ? res : [];
      }
    } catch (err) {
      logger.error('Wails native directory dialog error:', err);
      return [];
    }
    return [];
  }

  // بيئة المتصفح العادي (Browser Mode Directory Fallback)
  return new Promise<string[]>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
    (input as HTMLInputElement & { directory?: boolean }).directory = true;
    input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files || []).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) {
        resolve([]);
        return;
      }
      const dataUrls: string[] = [];
      for (const file of files) {
        try {
          const dataUrl = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(file);
          });
          dataUrls.push(dataUrl);
        } catch (e) {
          logger.error('Failed to read directory file:', e);
        }
      }
      resolve(dataUrls);
    };

    input.oncancel = () => resolve([]);
    input.click();
  });
}
