import { useEditorStore } from "@/lib/editor-store";
import { resolveImageAspectRatio } from "./image-dimensions";

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
