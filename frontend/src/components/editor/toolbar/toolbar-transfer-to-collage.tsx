import React, { useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { useStageRef } from '@/lib/canvas/stage-context';
import { buildCollageInsertAssignments } from '@/lib/canvas/collage-insert';
import { exportCanvas } from '@/lib/export';
import { wailsIsDesktop } from '@/lib/wails-env';
import { SaveImageFromBase64 } from '../../../../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/huge-icon';
import { TableArrowRepeatAll } from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { toast } from 'sonner';

/**
 * ToolbarTransferToCollage — نقل التصميم من الوضع الحر إلى الكولاج:
 * تُلتقط لقطة الكانفس بكامله ثم تُدرَج كصورة عادية في خانات الكولاج الحالية
 * بنفس منطق إسقاط الصور (buildCollageInsertAssignments) — دون أي تغيير في مقاس
 * الكانفس أو اتجاهه (أفقي/عمودي) وبدون إنشاء قالب جديد.
 * ممتثلة تماماً لمعايير Fluent 2 القياسية ونظام أيقونات التطبيق الرسمية.
 */
export const ToolbarTransferToCollage = React.memo(function ToolbarTransferToCollage() {
  const mode = useEditorStore((s) => s.mode);
  const elementsCount = useEditorStore((s) => s.elements.length);
  const stageRef = useStageRef();
  const [isTransferring, setIsTransferring] = useState(false);

  // البوابة مخصصة حصراً لوضع التصميم الحر لنقل الكرت/التصميم إلى شبكة الكولاج
  if (mode !== 'single') return null;

  const handleTransfer = async () => {
    if (elementsCount === 0) {
      toast.info('الكانفس فارغ — صمم عناصر أولاً لنقلها للكولاج');
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      toast.error('تعذر الوصول لمنطقة التصميم');
      return;
    }

    setIsTransferring(true);
    try {
      // 1. التقاط التصميم بالكامل بدقة الطباعة مع إخفاء خطوط التحديد والأدلة.
      //    watermark: false لأن اللقطة وسيطة لا تُسلَّم للمستخدم — الكولاج النهائي
      //    يطبّق علامته عند تصديره، فطلبها هنا كان يُظهرها مرتين (مرة داخل التصميم)
      const blob = await exportCanvas('png', 1, stage, { watermark: false });
      if (!blob) {
        toast.error('فشل التقاط التصميم');
        return;
      }

      // 2. تحويل الـ Blob إلى Base64/DataURL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 3. الحفظ المحلي السريع على بيئة سطح المكتب لعدم إرهاق الذاكرة
      let finalSrc = dataUrl;
      if (wailsIsDesktop() && dataUrl.startsWith('data:image/')) {
        try {
          const localPath = await SaveImageFromBase64(dataUrl);
          if (localPath) finalSrc = localPath;
        } catch (e) {
          console.error('فشل حفظ صورة المونتاج محلياً:', e);
        }
      }

      // 4. الانتقال لوضع الكولاج عبر المسار القياسي — بلا setCanvasSize وبلا
      //    تبديل اتجاه: مقاس كانفاس الكولاج ووضعه يبقيان كما هما تماماً
      useEditorStore.getState().setMode('collage');

      // 5. إدراج اللقطة كصورة عادية في الخانات الحالية (تُقرأ الحالة الطازجة
      //    بعد تبديل الوضع لأن setMode قد يعيد بناء الخانات)
      const collage = useEditorStore.getState();
      if (collage.slots.length === 0) {
        toast.error('لا توجد خانات في الكولاج الحالي');
        return;
      }

      const assignments = buildCollageInsertAssignments(
        collage.slots,
        [finalSrc],
        null,
        Boolean(collage.collageTemplate?.physicalLayout),
      );
      if (assignments.length === 0) {
        toast.error('تعذر إدراج التصميم في الكولاج');
        return;
      }

      // دفعة واحدة بخطوة تراجع واحدة (داخل setSlotImagesBatch)
      collage.setSlotImagesBatch(assignments, finalSrc);

      toast.success(
        assignments.length === 1
          ? 'تم إدراج التصميم في خانة الكولاج'
          : `تم إدراج التصميم في ${assignments.length} خانات بالكولاج`,
      );
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء نقل التصميم للكولاج');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <>
      <Separator orientation="vertical" className="h-4 mx-0.5 bg-border/60" />
      <div className="fluent-command-group shadow-2xs">
        <TooltipBtn content="تكرار في الكولاج">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTransfer}
            disabled={isTransferring || elementsCount === 0}
            data-testid="toolbar-transfer-to-collage"
            aria-label="تكرار في الكولاج"
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer flex items-center justify-center disabled:opacity-40"
          >
            {isTransferring ? (
              <Spinner className="w-4 h-4 animate-spin text-primary" />
            ) : (
              // 🎨 قاعدة الشريط: الأيقونة ترث حالة الزر (رمادي في الراحة → داكن
              // عند التمرير). اللون الأساسي محجوز لحالة التفعيل الحقيقية
              // (راجع نمط «مفعّل» في toolbar-image-filters) فلا توحي أيقونة
              // زرقاء في الراحة بأن الزر مُفعَّل.
              <TableArrowRepeatAll className="w-5 h-5" weight="bold" />
            )}
          </Button>
        </TooltipBtn>
      </div>
    </>
  );
});

ToolbarTransferToCollage.displayName = 'ToolbarTransferToCollage';
