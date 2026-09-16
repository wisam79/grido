import { useEditorStore } from "@/lib/editor-store";
import { CanvasElement } from "@/lib/store/types";
import { SaveImageFromBase64, GetClipboardText, SetClipboardText } from "../../../wailsjs/go/main/App";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";

/**
 * دالة عامة موحدة للصق المحتوى (من حافظة النظام أو حافظة الـ Store الداخلية)
 * تعمل بسلاسة في اختصارات الكيبورد (Ctrl+V) وتتكامل مع الزر الأيمن (Context Menu)
 */
export async function pasteFromClipboardOrStore(): Promise<boolean> {
  const state = useEditorStore.getState();

  // 1. محاولة القراءة من حافظة الويندوز/النظام أولاً (System Clipboard)
  let text: string | null = null;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
      text = await navigator.clipboard.readText();
    }
  } catch (err) {
    console.warn("System clipboard text read not permitted, falling back to Wails:", err);
  }

  // استخدام بديل Wails الأصلي إذا تعذرت القراءة عبر المتصفح
  if ((!text || !text.trim()) && typeof GetClipboardText === "function") {
    try {
      text = await GetClipboardText();
    } catch {
      // تجاهل في حالة عدم توفر الواجهة
    }
  }

  if (text && text.trim()) {
    if (text.startsWith("GRIDO_ELEMENTS:")) {
      try {
        const rawJson = text.replace("GRIDO_ELEMENTS:", "");
        const parsedElements: CanvasElement[] = JSON.parse(rawJson);
        if (Array.isArray(parsedElements) && parsedElements.length > 0) {
          state.pasteCopiedElements(parsedElements);
          return true;
        }
      } catch (err) {
        console.error("Failed to parse GRIDO_ELEMENTS from clipboard:", err);
      }
    } else if (state.mode !== "collage") {
      // نص خارجي من متصفح/ورد/مفكرة
      state.addTextElement(text);
      return true;
    }
  }

  // 2. فحص الصور المنسوخة في حافظة النظام
  try {
    if (navigator.clipboard && typeof navigator.clipboard.read === "function") {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
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
                    if (state.mode === "collage") {
                      let targetSlotId = state.selectedId;
                      if (!targetSlotId) {
                        const emptySlot = state.slots.find((s) => !s.imageSrc);
                        if (emptySlot) targetSlotId = emptySlot.id;
                        else if (state.slots.length > 0) targetSlotId = state.slots[0].id;
                      }
                      if (targetSlotId) state.setSlotImage(targetSlotId, localPath);
                    } else {
                      const aspect = await resolveImageAspectRatio(localPath);
                      state.addImageElement(localPath, aspect);
                    }
                    resolve(true);
                    return;
                  }
                } catch (e) {
                  console.error("Failed to save image from clipboard read:", e);
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
    console.warn("System clipboard image read not permitted or failed:", err);
  }

  // 3. الفحص الاحتياطي لحافظة الـ Store الداخلية
  if (state.clipboardElements && state.clipboardElements.length > 0) {
    state.pasteCopiedElements();
    return true;
  }

  return false;
}

/**
 * Copies a PNG base64 Data URL directly to clipboard as an Image Blob.
 */
export async function copyPngDataUrlToClipboard(pngDataUrl: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
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
    console.error("Failed to copy image blob to clipboard:", err);
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
    console.warn("navigator.clipboard.writeText failed, falling back to Wails:", err);
  }

  // استخدام بديل Wails الأصلي
  if (typeof SetClipboardText === "function") {
    try {
      await SetClipboardText(svgString);
      return true;
    } catch (wErr) {
      console.error("Wails SetClipboardText failed:", wErr);
    }
  }

  return false;
}

