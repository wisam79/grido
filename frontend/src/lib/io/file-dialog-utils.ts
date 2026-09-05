import { OpenFile, OpenMultipleFiles, OpenDirectoryDialog } from "../../../wailsjs/go/main/App";
import { wailsIsDesktop } from "../wails-env";

/**
 * فتح نافذة اختيار الصور بسلاسة ودقة متناهية:
 * - في بيئة Wails Desktop: تستدعي Wails Native File Dialog حصرياً وترجع الناتج (أو مصفوفة فارغة عند الإلغاء) دون الانتقال لمتصفح الويب.
 * - في بيئة المتصفح العادي فقط: تستخدم HTML File Input.
 */
export async function openImageFileDialog(multiple = false): Promise<string[]> {
  const isWailsDesktop = wailsIsDesktop();

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

/**
 * فتح نافذة اختيار مجلد كامل واستيراد كافة الصور الموجودة داخله
 */
export async function openDirectoryImageDialog(): Promise<string[]> {
  const isWailsDesktop = wailsIsDesktop();

  if (isWailsDesktop) {
    try {
      if (typeof OpenDirectoryDialog === "function") {
        const res = await OpenDirectoryDialog();
        return Array.isArray(res) ? res : [];
      }
    } catch (err) {
      console.error("Wails native directory dialog error:", err);
      return [];
    }
    return [];
  }

  // بيئة المتصفح العادي (Browser Mode Directory Fallback)
  return new Promise<string[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    (input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
    (input as HTMLInputElement & { directory?: boolean }).directory = true;
    input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files || []).filter((f) => f.type.startsWith("image/"));
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
          console.error("Failed to read directory file:", e);
        }
      }
      resolve(dataUrls);
    };

    input.oncancel = () => resolve([]);
    input.click();
  });
}

