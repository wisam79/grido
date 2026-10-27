import { createLogger } from '@/lib/logger';

import {
  OpenFile,
  OpenMultipleFiles,
  OpenDirectoryDialog,
  SaveImageFromBase64,
} from '../../../wailsjs/go/main/App';
import { wailsIsDesktop } from '../wails-env';

const logger = createLogger('file-dialog-utils');

interface BrowserFilePickerOptions {
  multiple: boolean;
  accept?: string;
  directory?: boolean;
  filter?: (file: File) => boolean;
}

/** يفتح منتقي ملفات HTML ويعيد الملفات المختارة (فارغة عند الإلغاء). */
function pickBrowserFiles(options: BrowserFilePickerOptions): Promise<File[]> {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options.accept) input.accept = options.accept;
    input.multiple = options.multiple;
    if (options.directory) {
      (input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
      (input as HTMLInputElement & { directory?: boolean }).directory = true;
    }

    input.onchange = () => {
      const files = Array.from(input.files || []);
      resolve(options.filter ? files.filter(options.filter) : files);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

async function readFilesAsDataUrls(files: File[], errorMessage: string): Promise<string[]> {
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
      logger.error(errorMessage, e);
    }
  }
  return dataUrls;
}

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
  const files = await pickBrowserFiles({ multiple, accept: 'image/*' });
  return readFilesAsDataUrls(files, 'Failed to read file:');
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
  const files = await pickBrowserFiles({
    multiple: true,
    directory: true,
    filter: (file) => file.type.startsWith('image/'),
  });
  return readFilesAsDataUrls(files, 'Failed to read directory file:');
}
