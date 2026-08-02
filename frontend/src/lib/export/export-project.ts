import { toast } from "sonner";
import { exportCanvas } from "./export-image";
import { CanvasTooLargeError } from "./export-limits";
import { SaveFileDialog } from "../../../wailsjs/go/main/App";

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// تنزيل صورة من Blob عبر Wails
export async function downloadBlob(blob: Blob, filename: string): Promise<string> {
  try {
    const data = await blobToDataURL(blob);
    let displayName = "Image File";
    let pattern = "*.png;*.jpg;*.jpeg";

    if (filename.endsWith(".png")) {
      displayName = "PNG Image (*.png)";
      pattern = "*.png";
    } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
      displayName = "JPEG Image (*.jpg;*.jpeg)";
      pattern = "*.jpg;*.jpeg";
    }

    return await SaveFileDialog(data, filename, displayName, pattern);
  } catch (err) {
    console.error("Save failed:", err);
    return "error";
  }
}

// تصدير سريع بصيغة PNG
export async function quickExportPNG() {
  let blob: Blob | null;
  try {
    blob = await exportCanvas("png");
  } catch (err) {
    if (err instanceof CanvasTooLargeError) {
      toast.error(
        `الأبعاد كبيرة جداً للتصدير (${err.width}×${err.height} بكسل ≈ ${(err.pixelCount / 1e6).toFixed(1)} ميجابكسل) — الحد الأقصى 50 ميجابكسل. قلّل مقاس الكانفاس أو DPI.`
      );
    } else {
      console.error("Export failed:", err);
      toast.error("تعذر تصدير الصورة");
    }
    return;
  }

  if (blob) {
    const res = await downloadBlob(blob, `photo-${Date.now()}.png`);
    if (res === "success") {
      toast.success("تم تصدير الصورة بنجاح");
    } else if (res === "") {
      toast.info("تم إلغاء تصدير الصورة");
    } else {
      toast.error("فشل تصدير الصورة");
    }
  } else {
    toast.error("تعذر تصدير الصورة");
  }
}
