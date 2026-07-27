import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { serializeEditorState } from "@/lib/project-serializer";
import { exportCanvas } from "./export-image";
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
    let data: string;
    let displayName = "Image File";
    let pattern = "*.png;*.jpg;*.jpeg";

    if (filename.endsWith(".json")) {
      data = await blob.text();
      displayName = "Project File (*.json)";
      pattern = "*.json";
    } else {
      data = await blobToDataURL(blob);
      if (filename.endsWith(".png")) {
        displayName = "PNG Image (*.png)";
        pattern = "*.png";
      } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
        displayName = "JPEG Image (*.jpg;*.jpeg)";
        pattern = "*.jpg;*.jpeg";
      }
    }

    return await SaveFileDialog(data, filename, displayName, pattern);
  } catch (err) {
    console.error("Save failed:", err);
    return "error";
  }
}

// حفظ المشروع كملف JSON
export async function saveProjectAsJSON() {
  const state = useEditorStore.getState();
  const project = serializeEditorState(state);
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const res = await downloadBlob(blob, `identity-studio-${Date.now()}.json`);
  if (res === "success") {
    toast.success("تم حفظ المشروع بنجاح");
  } else if (res === "") {
    toast.info("تم إلغاء حفظ المشروع");
  } else {
    toast.error("فشل حفظ المشروع");
  }
}

// تصدير سريع بصيغة PNG
export async function quickExportPNG() {
  const blob = await exportCanvas("png");
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
