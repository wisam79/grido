/**
 * العلامة المائية للخطة المجانية — تُطبق بعد التصدير وقبل التسليم.
 * مستخرجة من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */
import { useEditorStore } from '@/lib/editor-store';

// دالة مساعدة لتطبيق العلامة المائية عند التصدير للخطة المجانية
export async function applyWatermarkIfFree(
  blob: Blob,
  format: 'png' | 'jpg' = 'png',
  quality = 0.95,
): Promise<Blob> {
  const { isLicenseActive } = useEditorStore.getState();
  if (isLicenseActive()) {
    return blob;
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }

      // رسم الصورة الأصلية
      ctx.drawImage(img, 0, 0);

      // حساب ارتفاع شريط العلامة المائية بناءً على حجم الصورة
      const bannerHeight = Math.max(50, img.height * 0.045);

      // رسم شريط خلفية العلامة المائية بشكل احترافي غامق وشبه شفاف
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, img.height - bannerHeight, img.width, bannerHeight);

      // رسم خط علوي فاصل ناعم
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = Math.max(1, img.height * 0.001);
      ctx.beginPath();
      ctx.moveTo(0, img.height - bannerHeight);
      ctx.lineTo(img.width, img.height - bannerHeight);
      ctx.stroke();

      // إعدادات الخط للعلامة المائية
      const fontSize = Math.max(12, bannerHeight * 0.32);
      ctx.font = `600 ${fontSize}px Cairo, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = 'تم التصميم بواسطة استوديو Grido Studio (نسخة مجانية)';
      ctx.fillText(text, img.width / 2, img.height - bannerHeight / 2);

      canvas.toBlob(
        (newBlob) => {
          resolve(newBlob || blob);
        },
        format === 'png' ? 'image/png' : 'image/jpeg',
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}
