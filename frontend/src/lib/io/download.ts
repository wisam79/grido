import { registerObjectUrl } from './object-url-registry';

/**
 * تنزيل كائن كملف JSON منسّق. الرابط المؤقت يُلغى عبر السجل المركزي بعد
 * نافذة الأمان بدل إلغائه فوراً قبل أن يبدأ المتصفح التنزيل.
 */
export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  registerObjectUrl(url);
}
