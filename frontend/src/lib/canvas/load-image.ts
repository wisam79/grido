import { useEditorStore } from "@/lib/editor-store";
import { resolveImageAspectRatio } from "./image-dimensions";
import { getExifOrientation } from "../io/exif-utils";

/**
 * lib/canvas/load-image — تحميل صورة إلى الكانفس من أي مصدر (كانت 3 نسخ
 * متطابقة في App.tsx + ~15 قالباً مشابهاً خارجه: new Image + onload +
 * حساب النسبة + addImageElement). يستخدم المسار الموحد المصحح EXIF.
 */
export async function loadImageAspect(src: string): Promise<number> {
  if (!src) return 1;
  try {
    return await resolveImageAspectRatio(src);
  } catch {
    return 1;
  }
}

export async function addImageFromSrc(
  src: string,
  opts?: { setSingleMode?: boolean }
): Promise<void> {
  if (!src) return;
  const aspect = await loadImageAspect(src);
  const store = useEditorStore.getState();
  if (opts?.setSingleMode) store.setMode("single");
  store.addImageElement(src, aspect);
}

/**
 * قياس نسبة أبعاد الصورة مع عقد NaN عند الفشل (كانت في collage-slice).
 * يُستخدم لمقارنة نسب الاستبدال قبل تصفير إزاحات القص — الفشل يُتجاهل
 * بصمت عبر Number.isFinite بدل التصفير الخاطئ. تتضمن تصحيح EXIF للصور
 * الرأسية (كانت تُحسب مقلوبة فتُصفّر القص خطأً).
 */
export function measureImageAspect(src: string): Promise<number> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(NaN);
      return;
    }
    const img = new Image();
    // ⏱️ مهلة: صورة تتعطّل كانت تُبقي الوعيد معلّقاً للأبد
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(NaN);
    }, 10_000);
    const settle = (value: number) => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(value);
    };
    img.onload = async () => {
      const w = img.width;
      const h = img.height;
      if (!(w > 0 && h > 0)) {
        settle(NaN);
        return;
      }
      try {
        const exif = await getExifOrientation(src);
        settle(exif.isQuarterRotated ? h / w : w / h);
      } catch {
        settle(w / h);
      }
    };
    img.onerror = () => settle(NaN);
    img.src = src;
  });
}
