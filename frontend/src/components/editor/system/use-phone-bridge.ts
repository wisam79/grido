import { useEffect } from 'react';
import { toast } from 'sonner';

import { resolveImageAspectRatio } from '@/lib/canvas/image-dimensions';
import { useEditorStore } from '@/lib/editor-store';
import { createLogger } from '@/lib/logger';
import { usePhoneBridgeStore } from '@/lib/phone-bridge-store';
import { toErrorMessage } from '@/lib/wails-error';

import { GetPhoneBridgeStatus } from '../../../../wailsjs/go/main/App';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';

const logger = createLogger('use-phone-bridge');

/**
 * usePhoneBridgeListener
 * يستمع لأحداث Wails عند التقاط أو رفع صورة من كاميرا الهاتف
 * ويقوم بإسقاطها فوراً في الكانفاس (سواء وضع الكولاج أو العناصر الحرة)
 * ويحافظ على مزامنة حالة الجسر الحية مع شريط الأدوات والنوافذ
 */
export function usePhoneBridgeListener() {
  useEffect(() => {
    let isSubscribed = true;

    // استعلام الحالة الحالية للجسر عند الإقلاع لمزامنة الشريط العلوي
    if (typeof GetPhoneBridgeStatus === 'function') {
      GetPhoneBridgeStatus()
        .then((status) => {
          if (isSubscribed && status) {
            usePhoneBridgeStore.getState().updateStatus({
              isRunning: status.isRunning,
              pairedDevice: status.pairedDevice,
              receivedCount: status.receivedCount,
              lastReceived: status.lastReceived,
            });
          }
        })
        .catch(() => {
          // خمول في بيئات الاختبار بدون Go runtime
        });
    }

    // 1. الاستماع لتغيرات حالة الجسر المركزية
    const unsubStatus = EventsOn(
      'phone:status',
      (payload: {
        isRunning?: boolean;
        pairedDevice?: string;
        receivedCount?: number;
        lastReceived?: string;
      }) => {
        if (!isSubscribed || !payload) return;
        usePhoneBridgeStore.getState().updateStatus(payload);
      },
    );

    // 2. الاستماع لإشعار اقتران الجهاز بنجاح
    const unsubPaired = EventsOn('phone:paired', (data: { device?: string }) => {
      if (!isSubscribed || !data?.device) return;
      usePhoneBridgeStore.getState().updateStatus({
        isRunning: true,
        pairedDevice: data.device,
      });
      toast.success(`تم اقتران الهاتف بنجاح (${data.device})`);
    });

    // 3. الاستماع لوصول صورة جديدة من الهاتف وإسقاطها في الكانفاس
    const unsubPhoto = EventsOn(
      'phone:photo-received',
      async (payload: { path: string } | string) => {
        if (!isSubscribed) return;
        const src = typeof payload === 'string' ? payload : payload?.path;
        if (!src) return;

        try {
          usePhoneBridgeStore.getState().incrementReceivedCount();

          // منع Stale Closures: استخدام useEditorStore.getState() دائماً
          const freshState = useEditorStore.getState();

          if (freshState.mode === 'collage' && freshState.slots.length > 0) {
            // البحث الذكي عن الخانة المستهدفة:
            // أ) الخانة المحددة إن كانت فارغة
            // ب) أول خانة فارغة في القالب
            // ج) الخانة المحددة حالياً أو أول خانة إذا كانت الخانات ممتلئة
            const selectedSlot = freshState.selectedId
              ? freshState.slots.find((s) => s.id === freshState.selectedId)
              : null;
            const firstEmptySlot = freshState.slots.find((s) => !s.imageSrc);
            const targetSlot =
              selectedSlot && !selectedSlot.imageSrc
                ? selectedSlot
                : firstEmptySlot || selectedSlot || freshState.slots[0];

            if (targetSlot) {
              freshState.setSlotImage(targetSlot.id, src);

              // التقدم التلقائي للخانة الشاغرة التالية لتسلسل تصوير متصل وسلس
              const remainingEmpty = freshState.slots.filter(
                (s) => s.id !== targetSlot.id && !s.imageSrc,
              );
              if (remainingEmpty.length > 0) {
                freshState.setSelectedIds([remainingEmpty[0].id]);
              } else {
                freshState.setSelectedIds([targetSlot.id]);
              }

              toast.success('تم استلام الصورة من الهاتف في خانة الكولاج', {
                description: 'تم إسقاط الصورة بنجاح في القالب المختار',
              });
            } else {
              // مسار احتياطي آمن إن لم تتوفر أي خانة
              const aspect = await resolveImageAspectRatio(src);
              useEditorStore.getState().addImageElement(src, aspect);
              toast.success('تم استلام الصورة من الهاتف إلى مساحة العمل');
            }
          } else {
            // وضع العناصر الحرة (Single Mode) أو قالب كولاج بلا خانات
            const aspect = await resolveImageAspectRatio(src);
            useEditorStore.getState().addImageElement(src, aspect);
            toast.success('تم استلام الصورة من الهاتف إلى مساحة العمل', {
              description: 'تم إدراج الصورة مباشرة في الكانفاس',
            });
          }
        } catch (err) {
          logger.error('[PhoneBridge] Error inserting received photo:', err);
          toast.error(toErrorMessage(err, 'حدث خطأ أثناء إدراج الصورة المستلمة من الهاتف'));
        }
      },
    );

    // 4. الاستماع لأخطاء الجسر السحابي وتنبيه المستخدم
    const unsubCloudError = EventsOn(
      'phone:cloud-error',
      (payload: { message?: string } | string) => {
        if (!isSubscribed) return;
        const msg = typeof payload === 'string' ? payload : payload?.message;
        if (!msg) return;
        toast.warning(msg, {
          duration: 6000,
        });
      },
    );

    return () => {
      isSubscribed = false;
      if (typeof unsubStatus === 'function') unsubStatus();
      if (typeof unsubPaired === 'function') unsubPaired();
      if (typeof unsubPhoto === 'function') unsubPhoto();
      if (typeof unsubCloudError === 'function') unsubCloudError();
    };
  }, []);
}
