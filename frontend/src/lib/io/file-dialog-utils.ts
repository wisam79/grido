import { OpenFile, OpenMultipleFiles } from "../../../wailsjs/go/main/App";

/**
 * فتح نافذة اختيار الصور بسلاسة ودقة متناهية:
 * - في بيئة Wails Desktop: تستدعي Wails Native File Dialog حصرياً وترجع الناتج (أو مصفوفة فارغة عند الإلغاء) دون الانتقال لمتصفح الويب.
 * - في بيئة المتصفح العادي فقط: تستخدم HTML File Input.
 */
export async function openImageFileDialog(multiple = false): Promise<string[]> {
  const isWailsDesktop = typeof (window as any).go?.main?.App !== "undefined";

  if (isWailsDesktop) {
    try {
      if (multiple && typeof OpenMultipleFiles === "function") {
        const res = await OpenMultipleFiles();
        return Array.isArray(res) ? res : [];
      }
      if (typeof OpenFile === "function") {
        const single = await OpenFile();
        return single ? [single] : [];
      }
    } catch (err) {
      console.error("Wails native file dialog error:", err);
      return [];
    }
    return [];
  }

  // بيئة المتصفح العادي (Browser Mode Only)
  return new Promise<string[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
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
          console.error("Failed to read file:", e);
        }
      }
      resolve(dataUrls);
    };

    input.oncancel = () => resolve([]);
    input.click();
  });
}
