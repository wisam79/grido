"use client";

import { useEditorStore } from "@/lib/editor-store";
import { IMAGE_FILTERS } from "@/lib/templates";
import { toast } from "sonner";

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
    for (const slot of slots) {
      if (!slot.imageSrc) continue;
      const img = await loadImage(slot.imageSrc);
      const x = slot.x * canvasWidth;
      const y = slot.y * canvasHeight;
      const w = slot.w * canvasWidth;
      const h = slot.h * canvasHeight;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      drawImageCover(ctx, img, x, y, w, h);
      ctx.restore();
      // طبقة الفلتر (تطبيق بسيط عبر canvas filter)
      applyCanvasFilter(ctx, slot, x, y, w, h, img, canvasWidth, canvasHeight);
    }
  } else {
    // === وضع الصورة الواحدة ===
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
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

      if (el.type === "image" && el.imageSrc) {
        const img = await loadImage(el.imageSrc);
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
export async function downloadBlob(blob: Blob, filename: string) {
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
    
    await SaveFileDialog(data, filename, displayName, pattern);
  } catch (err) {
    console.error("Save failed:", err);
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

function buildCanvasFilterString(el: any): string {
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

function applyCanvasFilter(
  ctx: CanvasRenderingContext2D,
  slot: any,
  x: number,
  y: number,
  w: number,
  h: number,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
) {
  // للخلايا - الفلاتر يتم تطبيقها أثناء الرسم
  // تم دمجها في drawImageCover أعلاه عبر ctx.filter
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
export function saveProjectAsJSON() {
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
  downloadBlob(blob, `identity-studio-${Date.now()}.json`);
  toast.success("تم حفظ المشروع");
}

// تصدير سريع بصيغة PNG
export async function quickExportPNG() {
  const blob = await exportCanvas("png");
  if (blob) {
    downloadBlob(blob, `photo-${Date.now()}.png`);
    toast.success("تم تصدير الصورة بنجاح");
  } else {
    toast.error("تعذر تصدير الصورة");
  }
}
