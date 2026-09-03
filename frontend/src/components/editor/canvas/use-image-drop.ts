import { useCallback, useState, type DragEvent, type RefObject } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";

/**
 * 🧭 منطق إسقاط الصور على مساحة العمل: رفع بدفعات (3 ملفات)، مطابقة الخانة
 * تحت مؤشر السقوط بإحداثيات منطقية، وتوزيع الصور على الخانات الفارغة.
 * 🛡️ يقرأ الحالة الطازجة (freshState) لحظة الاكتمال — إعدادات الكولاج قد
 * تتغير أثناء الرفع (إصلاح Bug#15) — وكانت هذه الكتلة مضمّنة في EditorCanvas.
 */
export function useImageDrop(
  innerRef: RefObject<HTMLDivElement | null>
) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter((f): f is File => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const CHUNK_SIZE = 3;

    try {
      setIsLoading(true);
      const uploadedSrcs: string[] = [];
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(chunk.map(async (file) => {
          if (file.size > MAX_FILE_SIZE) {
            console.warn(`Skipping oversized file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
            return null;
          }
          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            });
            const src = await SaveImageFromBase64(dataUrl);
            return src || null;
          } catch {
            return null;
          }
        }));
        for (const src of results) {
          if (src) uploadedSrcs.push(src);
        }
        await new Promise((r) => setTimeout(r, 0));
      }

      if (uploadedSrcs.length === 0) return;

      const freshState = useEditorStore.getState();
      const freshMode = freshState.mode;
      const freshSlots = freshState.slots;
      const freshCollageTemplate = freshState.collageTemplate;
      // قراءة الأبعاد من الحالة الطازجة أيضاً — قد تتغير إعدادات الكولاج أثناء
      // رفع الملفات فلا تُطابق خانات محسوبة بقيم قديمة (إصلاح Bug#15)
      const freshCanvasWidth = freshState.canvasWidth;
      const freshCanvasHeight = freshState.canvasHeight;
      const freshCollageMargin = freshState.collageMargin;
      const freshCollageGap = freshState.collageGap;

      if (freshMode === "collage" || freshSlots.length > 0) {
        if (freshMode !== "collage") {
          freshState.setMode("collage");
        }

        let targetSlotId: string | null = null;
        if (innerRef.current) {
          const rect = innerRef.current.getBoundingClientRect();
          // إحداثيات منطقية بمساحة الكانفس (مثل konva-collage-layer) بدل نسبة عرض الشاشة —
          // القانون يشمل هوامش الكولاج وفجواته: margin + slot.x * availW + gap/2
          const scale = rect.width / freshCanvasWidth;
          const logicalX = (e.clientX - rect.left) / scale;
          const logicalY = (e.clientY - rect.top) / scale;
          const hasPhysical = freshCollageTemplate?.physicalLayout;
          const margin = hasPhysical ? 0 : freshCollageMargin;
          const gap = hasPhysical ? 0 : freshCollageGap;
          const availW = freshCanvasWidth - 2 * margin;
          const availH = freshCanvasHeight - 2 * margin;

          const matched = freshSlots.find((s) => {
            const sx = margin + s.x * availW + gap / 2;
            const sy = margin + s.y * availH + gap / 2;
            const sw = s.w * availW - gap;
            const sh = s.h * availH - gap;
            return logicalX >= sx && logicalX <= sx + sw && logicalY >= sy && logicalY <= sy + sh;
          });
          if (matched) {
            targetSlotId = matched.id;
          }
        }

        const assignments: { slotId: string; src: string }[] = [];
        if ((freshCollageTemplate?.physicalLayout || freshSlots.length > 1) && uploadedSrcs.length === 1 && uploadedSrcs[0]) {
          for (const s of freshSlots) {
            assignments.push({ slotId: s.id, src: uploadedSrcs[0] });
          }
        } else if (targetSlotId && uploadedSrcs[0]) {
          assignments.push({ slotId: targetSlotId, src: uploadedSrcs[0] });
          let srcIdx = 1;
          for (const s of freshSlots) {
            if (s.id !== targetSlotId && !s.imageSrc && srcIdx < uploadedSrcs.length) {
              assignments.push({ slotId: s.id, src: uploadedSrcs[srcIdx++] });
            }
          }
        } else {
          let srcIdx = 0;
          for (const s of freshSlots) {
            if (!s.imageSrc && srcIdx < uploadedSrcs.length) {
              assignments.push({ slotId: s.id, src: uploadedSrcs[srcIdx++] });
            }
          }
          if (srcIdx === 0 && freshSlots[0] && uploadedSrcs[0]) {
            assignments.push({ slotId: freshSlots[0].id, src: uploadedSrcs[0] });
          }
        }
        // دفعة واحدة بخطوة تراجع واحدة بدل خطوة لكل صورة (الإسقاط المتعدد)
        freshState.setSlotImagesBatch(assignments, uploadedSrcs[0] || null);
      } else {
        if (uploadedSrcs.length === 1) {
          const aspect = await resolveImageAspectRatio(uploadedSrcs[0]);
          freshState.addImageElement(uploadedSrcs[0], aspect);
        } else {
          const items: { src: string; aspectRatio: number }[] = [];
          for (const src of uploadedSrcs) {
            const aspect = await resolveImageAspectRatio(src);
            items.push({ src, aspectRatio: aspect });
          }
          freshState.addImageElementsBatch(items);
        }
      }
    } catch (err) {
      console.error("Drop file error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [innerRef]);

  return {
    isLoading,
    setIsLoading,
    handleDragOver,
    handleDrop,
  };
}
