import { useEditorStore } from "@/lib/editor-store";
import { IMAGE_FILTERS } from "@/lib/templates";
import { toast } from "sonner";
import { FilterableObject } from "@/lib/utils";

// تصدير الكانفس الحالي كصورة PNG/JPG
export async function exportCanvas(
  format: "png" | "jpg" = "png",
  quality = 0.95
): Promise<Blob | null> {
  const {
    mode,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    elements,
    slots,
    template,
  } = useEditorStore.getState();

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // الخلفية
  if (format === "jpg" || backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor === "transparent" ? "#FFFFFF" : backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // === وضع الكولاج ===
  if (mode === "collage") {
    const state = useEditorStore.getState();
    const {
      collageGap = 0,
      collageMargin = 0,
      collageRadius = 0,
      collageShowCutLines = false,
      collageStrokeWidth = 0,
      collageStrokeColor = "#000000",
    } = state;

    const margin = collageMargin;
    const gap = collageGap;
    const radius = collageRadius;
    const borderW = collageStrokeWidth;

    const availW = canvasWidth - 2 * margin;
    const availH = canvasHeight - 2 * margin;

    // 1. رسم خطوط القص أولاً خلف الصور لتكون واضحة ومستمرة في الفراغات
    if (collageShowCutLines) {
      ctx.save();
      ctx.strokeStyle = "#a0aec0"; // لون رمادي ناعم
      ctx.lineWidth = Math.max(1, 2 * (canvasWidth / 1200)); // يتناسب مع الدقة
      ctx.setLineDash([8, 8]);
      for (const slot of slots) {
        const left = margin + slot.x * availW + gap / 2;
        const top = margin + slot.y * availH + gap / 2;
        const width = slot.w * availW - gap;
        const height = slot.h * availH - gap;

        ctx.strokeRect(left - gap / 2, top - gap / 2, width + gap, height + gap);
      }
      ctx.restore();
    }

    // تحميل جميع صور الخلايا بالتوازي
    const slotImageMap: Record<string, HTMLImageElement> = {};
    const slotLoadPromises = slots
      .filter((slot) => slot.imageSrc)
      .map(async (slot) => {
        try {
          const img = await loadImage(slot.imageSrc!);
          slotImageMap[slot.id] = img;
        } catch (e) {
          console.error("Failed to pre-load slot image:", slot.imageSrc, e);
        }
      });
    await Promise.all(slotLoadPromises);

    // 2. رسم الصور والحدود
    for (const slot of slots) {
      const left = margin + slot.x * availW + gap / 2;
      const top = margin + slot.y * availH + gap / 2;
      const width = slot.w * availW - gap;
      const height = slot.h * availH - gap;

      if (slot.imageSrc && slotImageMap[slot.id]) {
        const img = slotImageMap[slot.id];
        ctx.save();

        // تطبيق الفلتر على مستوى السياق إن وجد
        const filterStr = buildCanvasFilterString(slot);
        if (filterStr && filterStr !== "none") {
          ctx.filter = filterStr;
        }

        // قص الزوايا المستديرة (Clipping)
        ctx.beginPath();
        if (radius > 0) {
          drawRoundRect(ctx, left, top, width, height, radius);
        } else {
          ctx.rect(left, top, width, height);
        }
        ctx.clip();

        drawImageCover(ctx, img, left, top, width, height);
        ctx.restore();
      }

      // رسم حدود خلايا الكولاج (Stroke)
      if (borderW > 0) {
        ctx.save();
        ctx.strokeStyle = collageStrokeColor;
        ctx.lineWidth = borderW;
        ctx.beginPath();
        if (radius > 0) {
          drawRoundRect(ctx, left, top, width, height, radius);
        } else {
          ctx.rect(left, top, width, height);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  } else {
    // === وضع الصورة الواحدة (React-Konva) ===
    const stage = useEditorStore.getState().stageRef;
    if (stage) {
      try {
        const dataUrl = stage.toDataURL({
          pixelRatio: canvasWidth / stage.width(), // تصدير بالدقة الأصلية للكانفس
          mimeType: format === "png" ? "image/png" : "image/jpeg",
          quality: quality
        });
        const res = await fetch(dataUrl);
        return await res.blob();
      } catch (e) {
        console.error("Failed to export via Konva Stage, falling back to 2d canvas context:", e);
      }
    }

    // Fallback if stage is not initialized (e.g., in unit tests)
    const sorted = [...elements]
      .filter((el) => el.visible !== false)
      .sort((a, b) => a.zIndex - b.zIndex);

    // تحميل جميع صور العناصر بالتوازي
    const elImageMap: Record<string, HTMLImageElement> = {};
    const elLoadPromises = sorted
      .filter((el) => el.type === "image" && el.imageSrc)
      .map(async (el) => {
        try {
          const img = await loadImage(el.imageSrc!);
          elImageMap[el.id] = img;
        } catch (e) {
          console.error("Failed to pre-load element image:", el.imageSrc, e);
        }
      });
    await Promise.all(elLoadPromises);

    for (const el of sorted) {
      ctx.save();
      ctx.globalAlpha = el.opacity;

      const x = el.x * canvasWidth;
      const y = el.y * canvasHeight;
      const w = el.width * canvasWidth;
      const h = el.height * canvasHeight;

      // التدوير حول المركز
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-w / 2, -h / 2);

      if (el.type === "image" && el.imageSrc && elImageMap[el.id]) {
        const img = elImageMap[el.id];
        ctx.filter = buildCanvasFilterString(el);
        drawImageCover(ctx, img, 0, 0, w, h);
        ctx.filter = "none";
      } else if (el.type === "text") {
        const fontSize = (el.fontSize || 32) * (canvasWidth / 600);
        ctx.font = `${el.fontWeight || 700} ${fontSize}px Cairo, Tajawal, sans-serif`;
        ctx.fillStyle = el.color || "#000000";
        ctx.textAlign = (el.textAlign as CanvasTextAlign) || "center";
        ctx.textBaseline = "middle";
        ctx.direction = "rtl";
        const lines = (el.text || "").split("\n");
        const lineHeight = fontSize * 1.2;
        const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2;
        const textX = el.textAlign === "left" ? 0 : el.textAlign === "right" ? w : w / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, textX, startY + i * lineHeight);
        });
      } else if (el.type === "shape") {
        ctx.fillStyle = el.fill || "#6366f1";
        ctx.strokeStyle = el.stroke || "#000000";
        ctx.lineWidth = el.strokeWidth || 0;
        if (el.shape === "rect") {
          const r = el.radius || 0;
          drawRoundRect(ctx, 0, 0, w, h, r);
          ctx.fill();
          if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke();
        } else if (el.shape === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke();
        } else if (el.shape === "line") {
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.lineWidth = Math.max(1, el.strokeWidth || 4);
          ctx.strokeStyle = el.fill || "#000000";
          ctx.stroke();
        } else if (el.shape === "star") {
          drawStar(ctx, w / 2, h / 2, 5, Math.min(w, h) / 2, Math.min(w, h) / 4);
          ctx.fill();
          if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      format === "png" ? "image/png" : "image/jpeg",
      quality
    );
  });
}

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

// تحميل صورة من رابط أو DataURL
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// رسم صورة مع object-fit: cover
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (imgAspect > boxAspect) {
    sw = img.height * boxAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxAspect;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function buildCanvasFilterString(el: FilterableObject): string {
  const parts: string[] = [];
  const filterDef = IMAGE_FILTERS.find((f) => f.id === el.filter);
  if (filterDef && filterDef.css) {
    // تحويل CSS filter إلى canvas filter
    const css = filterDef.css;
    parts.push(css);
  }
  if (el.brightness !== undefined && el.brightness !== 100)
    parts.push(`brightness(${el.brightness}%)`);
  if (el.contrast !== undefined && el.contrast !== 100)
    parts.push(`contrast(${el.contrast}%)`);
  if (el.saturation !== undefined && el.saturation !== 100)
    parts.push(`saturate(${el.saturation}%)`);
  if (el.blur && el.blur > 0) parts.push(`blur(${el.blur}px)`);
  return parts.join(" ") || "none";
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// حفظ المشروع كملف JSON
export async function saveProjectAsJSON() {
  const state = useEditorStore.getState();
  const project = {
    version: "1.0",
    mode: state.mode,
    template: state.template,
    collageTemplate: state.collageTemplate,
    elements: state.elements,
    slots: state.slots,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    backgroundColor: state.backgroundColor,
    printSettings: state.printSettings,
    savedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const res = await downloadBlob(blob, `identity-studio-${Date.now()}.json`);
  if (res === "success") {
    toast.success("تم حفظ المشروع");
  }
}

// تصدير سريع بصيغة PNG
export async function quickExportPNG() {
  const blob = await exportCanvas("png");
  if (blob) {
    const res = await downloadBlob(blob, `photo-${Date.now()}.png`);
    if (res === "success") {
      toast.success("تم تصدير الصورة بنجاح");
    }
  } else {
    toast.error("تعذر تصدير الصورة");
  }
}
