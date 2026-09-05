import { useEffect } from "react";
import { toast } from "sonner";
import { EventsOn, EventsOff } from "../../../../wailsjs/runtime/runtime";
import { useEditorStore } from "@/lib/editor-store";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";

/**
 * usePhoneBridgeListener
 * يستمع لأحداث Wails عند التقاط أو رفع صورة من كاميرا الهاتف
 * ويقوم بإسقاطها فوراً في الكانفاس (سواء وضع الكولاج أو العناصر الحرة)
 */
export function usePhoneBridgeListener() {
  useEffect(() => {
    let isSubscribed = true;

    const unsubscribe = EventsOn(
      "phone:photo-received",
      async (payload: { path: string } | string) => {
        if (!isSubscribed) return;
        const src = typeof payload === "string" ? payload : payload?.path;
        if (!src) return;

        try {
          // منع Stale Closures: استخدام useEditorStore.getState() دائماً
          const freshState = useEditorStore.getState();

          if (freshState.mode === "collage") {
            // البحث عن الخانة المناسبة: الخانة المحددة، أو أول خانة فارغة، أو الخانة الأولى
            const targetSlot = freshState.selectedId
              ? freshState.slots.find((s) => s.id === freshState.selectedId)
              : freshState.slots.find((s) => !s.imageSrc) || freshState.slots[0];

            if (targetSlot) {
              freshState.setSlotImage(targetSlot.id, src);
              toast.success("تم استلام الصورة من الهاتف في خانة الكولاج ✨", {
                description: "تم إسقاط الصورة بنجاح في القالب المختار",
              });
            } else {
              toast.info("تم استلام الصورة بنجاح ولكن لم يتم العثور على خانة شاغرة");
            }
          } else {
            // وضع العناصر الحرة (Single Mode)
            const aspect = await resolveImageAspectRatio(src);
            useEditorStore.getState().addImageElement(src, aspect);
            toast.success("تم استلام الصورة من الهاتف إلى مساحة العمل ✨", {
              description: "تم إدراج الصورة مباشرة في الكانفاس",
            });
          }
        } catch (err) {
          console.error("[PhoneBridge] Error inserting received photo:", err);
          toast.error("حدث خطأ أثناء إدراج الصورة المستلمة من الهاتف");
        }
      }
    );

    return () => {
      isSubscribed = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      } else if (typeof EventsOff === "function") {
        EventsOff("phone:photo-received");
      }
    };
  }, []);
}
