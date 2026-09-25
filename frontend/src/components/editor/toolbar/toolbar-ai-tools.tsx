import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/huge-icon";
import {
  Sparkle,
  PaintBrush,
  UserSquare,
  MagicWand,
} from "@/components/ui/icons";
import { useShallow } from "zustand/react/shallow";
import { FluentTooltip as TooltipBtn } from "@/components/ui/blocks";
import { cn } from "@/lib/utils";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { useFaceFrame } from "@/hooks/use-face-frame";

const RefineBgDialog = React.lazy(() => import("../dialogs/refine-bg-dialog").then((m) => ({ default: m.RefineBgDialog })));

/** شريط أدوات الذكاء الاصطناعي للصورة المحددة — يُستخدم داخل أدوات التحديد. */
export const AiToolsToolbarGroup = React.memo(function AiToolsToolbarGroup() {
  const { selectedItem } = useEditorStore(useShallow((state) => {
    const el = state.elements.find((e) => e.id === state.selectedId);
    const slot = state.slots?.find((s) => s.id === state.selectedId);
    const target = state.mode === "collage" ? slot : (el?.type === "image" ? el : null);
    return { selectedItem: target };
  }));

  const onUpdate = React.useCallback((id: string, patch: Partial<Record<string, unknown>>) => {
    const store = useEditorStore.getState();
    if (store.mode === "collage") {
      store.updateSlot(id, patch);
    } else {
      store.updateElement(id, patch);
    }
  }, []);

  const { isRemovingBg, bgProgress, bgProgressText, handleCancelBgRemoval, handleRemoveBg } = useBgRemoval(onUpdate);
  const { isEnhancing, enhanceProgress, enhanceProgressText, remainingQuota, dailyLimit, handleEnhance } =
    useAiEnhance(onUpdate);
  const { isFraming, frameProgress, frameProgressText, handleCancelFrame, handleFrameFace } = useFaceFrame(onUpdate);

  const [refineOpen, setRefineOpen] = React.useState(false);

  if (!selectedItem || !selectedItem.imageSrc) return null;

  return (
    <div className="fluent-command-group font-cairo bg-primary/5 dark:bg-primary/10 border-primary/25 dark:border-primary/30 shadow-2xs animate-in fade-in zoom-in-95 duration-150">
      {/* العنوان «ذكاء اصطناعي» أُزيل: الأدوات تُشرح بنفسها، والوسم كان
          يضيف كلمة تسويقية بلا معلومة للاستخدام اليومي. */}

      {/* عزل الخلفية - Fluent Wait UX */}
      <TooltipBtn content={isRemovingBg ? bgProgressText || "إلغاء عزل الخلفية" : "عزل الخلفية"}>
        <Button
          variant={isRemovingBg ? "destructive" : "outline"}
          size="sm"
          aria-label="عزل الخلفية"
          className={cn(
            "h-8 px-2.5 gap-1.5 border border-primary/25 dark:border-primary/35 bg-background/60 dark:bg-card/60 hover:bg-primary/10 hover:border-primary text-foreground font-semibold text-xs rounded-md transition-colors cursor-pointer shadow-2xs",
            isRemovingBg && "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          )}
          onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(selectedItem)}
        >
          {isRemovingBg ? (
            <>
              <Spinner className="w-3.5 h-3.5 shrink-0" size={14} />
              <span className="hidden xl:inline">{bgProgress > 0 ? `جاري العزل ... (${bgProgress}%)` : "جاري العزل ..."}</span>
            </>
          ) : (
            <>
              <Sparkle className="w-4 h-4 text-primary shrink-0" weight="duotone" />
              <span className="hidden xl:inline">عزل الخلفية</span>
            </>
          )}
        </Button>
      </TooltipBtn>

      {/* تعديل تفاصيل العزل يدويًا إذا كانت خلفيته معزولة */}
      {selectedItem.originalImageSrc && (
        <TooltipBtn content="تعديل العزل يدوياً">
          <Button
            variant="outline"
            size="sm"
            aria-label="تعديل العزل يدوياً"
            className="h-8 px-2.5 gap-1 text-xs font-semibold border border-primary/25 dark:border-primary/35 bg-background/60 dark:bg-card/60 hover:bg-primary/10 hover:border-primary text-foreground rounded-md cursor-pointer shadow-2xs"
            onClick={() => setRefineOpen(true)}
          >
            <PaintBrush className="w-4 h-4 text-primary shrink-0" weight="duotone" />
            <span className="hidden xl:inline">تعديل العزل</span>
          </Button>
        </TooltipBtn>
      )}

      {/* ضبط وتأطير الوجه تلقائياً */}
      <TooltipBtn content={isFraming ? frameProgressText || "إلغاء التأطير" : "تأطير الوجه"}>
        <Button
          variant={isFraming ? "destructive" : "outline"}
          size="sm"
          aria-label="تأطير الوجه"
          disabled={isEnhancing || isRemovingBg}
          className={cn(
            "h-8 px-2.5 gap-1.5 border border-primary/25 dark:border-primary/35 bg-background/60 dark:bg-card/60 hover:bg-primary/10 hover:border-primary text-foreground font-semibold text-xs rounded-md transition-colors cursor-pointer shadow-2xs",
            (isEnhancing || isRemovingBg) && "opacity-50 cursor-not-allowed",
            isFraming && "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          )}
          onClick={isFraming ? handleCancelFrame : () => handleFrameFace(selectedItem)}
        >
          {isFraming ? (
            <>
              <Spinner className="w-3.5 h-3.5 shrink-0" size={14} />
              <span className="hidden xl:inline">{frameProgress > 0 ? `جاري التأطير ... (${frameProgress}%)` : "جاري التأطير ..."}</span>
            </>
          ) : (
            <>
              <UserSquare className="w-4 h-4 text-primary shrink-0" weight="duotone" />
              <span className="hidden xl:inline">تأطير الوجه</span>
            </>
          )}
        </Button>
      </TooltipBtn>

      {/* تحسين الجودة وترميم الوجه — التلميح يحمل الحصة المتبقية (كانت معروضة
          في الشريط العائم وحده قبل توحيد أدوات AI في الشريط العلوي) */}
      <TooltipBtn
        content={
          isEnhancing
            ? "إلغاء الترميم"
            : `ترميم الوجه — المتبقي ${remainingQuota} من ${dailyLimit} اليوم`
        }
      >
        <Button
          variant="outline"
          size="sm"
          aria-label="ترميم الوجه"
          disabled={isEnhancing || isRemovingBg || isFraming}
          className={cn(
            "h-8 px-2.5 gap-1.5 border border-primary/25 dark:border-primary/35 bg-background/60 dark:bg-card/60 hover:bg-primary/10 hover:border-primary text-foreground font-semibold text-xs rounded-md transition-colors cursor-pointer shadow-2xs",
            (isEnhancing || isRemovingBg || isFraming) && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => handleEnhance(selectedItem)}
        >
          {isEnhancing ? <Spinner className="w-3.5 h-3.5 text-primary shrink-0" size={14} /> : <MagicWand className="w-4 h-4 text-primary shrink-0" weight="duotone" />}
          <span className="hidden xl:inline">{isEnhancing ? (enhanceProgress > 0 ? `جاري الترميم ... (${enhanceProgress}%)` : "جاري الترميم ...") : "ترميم الوجه"}</span>
        </Button>
      </TooltipBtn>

      {selectedItem.originalImageSrc && refineOpen && (
        <React.Suspense fallback={null}>
          <RefineBgDialog
            open={refineOpen}
            onOpenChange={setRefineOpen}
            element={selectedItem}
            onSave={async (newImageSrc) => {
              onUpdate(selectedItem.id, { imageSrc: newImageSrc });
              useEditorStore.getState().pushHistory();
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
});
