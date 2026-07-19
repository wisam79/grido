import type Konva from "konva";
import { ImageElement, useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { buildCSSFilter } from "@/lib/utils";
import { serializeEditorState } from "@/lib/project-serializer";

// تصدير الكانفس الحالي كصورة PNG/JPG
// يقبل stageRef كمعامل بدلاً من قراءته من Zustand مباشرة
export async function exportCanvas(
  format: "png" | "jpg" = "png",
  quality = 0.95,
  stageRef?: Konva.Stage | null
): Promise<Blob | null> {
  const {
    mode,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    elements,
    slots,
  } = useEditorStore.getState();

  // محاولة التصدير مباشرةً من Konva Stage لتوحيد محرك التصيير للوضعين (Fitted & Collage)
  if (stageRef) {
    let dataUrl: string | null = null;
    const transformers = stageRef.find('Transformer');
    const gridLayers = stageRef.find('.grid-layer');
    const columnsLayers = stageRef.find('.columns-layer');
    let previouslyCached: any[] = [];
    try {
      // إخفاء مقابض التحكم وطبقات الشبكة والأعمدة مؤقتاً قبل التصدير لمنع ظهورها في الصورة النهائية
      transformers.forEach((tr: any) => tr.hide());
      gridLayers.forEach((gl: any) => gl.hide());
      columnsLayers.forEach((cl: any) => cl.hide());

      // إعادة بناء كاش الصور المفلترة بدقة التصدير لضمان عدم انخفاض الجودة
      const targetPixelRatio = canvasWidth / stageRef.width();
      const images = stageRef.find('Image');
      images.forEach((img: any) => {
        if (img.isCached()) {
          previouslyCached.push(img);
          img.clearCache();
          img.cache({ pixelRatio: targetPixelRatio });
        }
      });

      stageRef.batchDraw();

      dataUrl = stageRef.toDataURL({
        pixelRatio: targetPixelRatio, // تصدير بالدقة الأصلية الكاملة للكانفس
        mimeType: format === "png" ? "image/png" : "image/jpeg",
        quality: quality
      });
    } catch (e) {
      console.error("Failed to export via Konva Stage, falling back to manual canvas:", e);
    } finally {
      // ضمان استعادة جميع الطبقات حتى عند حدوث خطأ غير متوقع
      transformers.forEach((tr: any) => tr.show());
      gridLayers.forEach((gl: any) => gl.show());
      columnsLayers.forEach((cl: any) => cl.show());
      
      // استعادة الكاش بدقة الشاشة لتوفير الذاكرة
      previouslyCached.forEach((img: any) => {
        img.clearCache();
        const screenRatio = Math.max(2, canvasWidth / stageRef.width());
        img.cache({ pixelRatio: screenRatio });
      });

      stageRef.batchDraw();
    }

    if (dataUrl) {
      // [FIX #9] تحويل مباشر بدلاً من fetch(dataUrl) غير الضروري
      const originalBlob = dataURLToBlob(dataUrl);
      return await applyWatermarkIfFree(originalBlob, format, quality);
    }
  }

  // Fallback البديل في حال عدم وجود المكون الرسومي نشطاً (للاختبارات مثلاً)
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (format === "jpg" || backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor === "transparent" ? "#FFFFFF" : backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

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

    if (collageShowCutLines) {
      ctx.save();
      ctx.strokeStyle = "#a0aec0";
      ctx.lineWidth = Math.max(1, 2 * (canvasWidth / 1200));
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

    for (const slot of slots) {
      const left = margin + slot.x * availW + gap / 2;
      const top = margin + slot.y * availH + gap / 2;
      const width = slot.w * availW - gap;
      const height = slot.h * availH - gap;

      if (slot.imageSrc && slotImageMap[slot.id]) {
        const img = slotImageMap[slot.id];
        ctx.save();
        const filterStr = buildCSSFilter(slot);
        if (filterStr && filterStr !== "none") {
          ctx.filter = filterStr;
        }
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
    const sorted = [...elements]
      .filter((el) => el.visible !== false)
      .sort((a, b) => a.zIndex - b.zIndex);

    const elImageMap: Record<string, HTMLImageElement> = {};
    const elLoadPromises = sorted
      .filter((el): el is ImageElement => el.type === "image" && !!el.imageSrc)
      .map(async (el) => {
        try {
          const img = await loadImage(el.imageSrc);
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

      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      if (el.flipX) ctx.scale(-1, 1);
      ctx.translate(-w / 2, -h / 2);

      if (el.type === "image" && el.imageSrc && elImageMap[el.id]) {
        const img = elImageMap[el.id];
        ctx.filter = buildCSSFilter(el);
        drawImageCover(ctx, img, 0, 0, w, h);
        ctx.filter = "none";
      } else if (el.type === "text") {
        const fontSize = el.fontSize || 32;
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
      async (blob) => {
        if (blob) {
          const watermarked = await applyWatermarkIfFree(blob, format, quality);
          resolve(watermarked);
        } else {
          resolve(null);
        }
      },
      format === "png" ? "image/png" : "image/jpeg",
      quality
    );
  });
}

// دالة مساعدة لتطبيق العلامة المائية عند التصدير للخطة المجانية
async function applyWatermarkIfFree(blob: Blob, format: "png" | "jpg" = "png", quality = 0.95): Promise<Blob> {
  const { isLicenseActive } = useEditorStore.getState();
  if (isLicenseActive()) {
    return blob;
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob);
        return;
      }

      // رسم الصورة الأصلية
      ctx.drawImage(img, 0, 0);

      // حساب ارتفاع شريط العلامة المائية بناءً على حجم الصورة
      const bannerHeight = Math.max(50, img.height * 0.045);
      
      // رسم شريط خلفية العلامة المائية بشكل احترافي غامق وشبه شفاف
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(0, img.height - bannerHeight, img.width, bannerHeight);

      // رسم خط علوي فاصل ناعم
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = Math.max(1, img.height * 0.001);
      ctx.beginPath();
      ctx.moveTo(0, img.height - bannerHeight);
      ctx.lineTo(img.width, img.height - bannerHeight);
      ctx.stroke();

      // إعدادات الخط للعلامة المائية
      const fontSize = Math.max(12, bannerHeight * 0.32);
      ctx.font = `600 ${fontSize}px Cairo, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const text = "تم التصميم بواسطة استوديو Grido Studio (نسخة مجانية)";
      ctx.fillText(text, img.width / 2, img.height - bannerHeight / 2);

      canvas.toBlob(
        (newBlob) => {
          resolve(newBlob || blob);
        },
        format === "png" ? "image/png" : "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
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


// [FIX #9] تحويل Data URL إلى Blob مباشرة في الذاكرة بدلاً من fetch غير الضروري
function dataURLToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
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



function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
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
