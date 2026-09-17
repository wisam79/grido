import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { CollageTemplate } from "@/lib/templates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GetCustomTemplates, SaveCustomTemplate, DeleteCustomTemplate } from "../../../../wailsjs/go/main/App";
import type { NormalizedCell } from "./collage/collage-grid-math";
import { toErrorMessage } from "@/lib/wails-error";
import { CustomCollageCard } from "./custom-collage-card";
import { PanelShell } from "./panel-shell";
import {
  GridFour,
  CaretRight,
  Sparkle,
  Stack,
  FrameCorners,
  Stamp,
  Shapes,
  TextT,
} from "@phosphor-icons/react";
import { useShallow } from "zustand/react/shallow";
import { FreeformStudioPanel } from "./freeform";
import type { FreeformTab } from "./freeform/freeform-panel-constants";

export interface TemplatePanelProps {
  /** يُمرر من App لإظهار زر الطي الداخلي — يُحذف في عرض Sheet الجوال */
  onCollapse?: () => void;
  activeStudioTab?: FreeformTab;
  onActiveStudioTabChange?: (tab: FreeformTab) => void;
}

export function TemplatePanel({
  onCollapse,
  activeStudioTab = "layers",
  onActiveStudioTabChange,
}: TemplatePanelProps) {
  const { 
    setCollageTemplate, 
    collageTemplate, 
    slots, 
    mode, 
    elements,
  } = useEditorStore(useShallow((state) => ({
    setCollageTemplate: state.setCollageTemplate,
    collageTemplate: state.collageTemplate,
    slots: state.slots,
    mode: state.mode,
    elements: state.elements,
  })));

  const [savedTemplates, setSavedTemplates] = useState<CollageTemplate[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حوار تأكيد عند تبديل القالب إذا كان سيُسقط صوراً موجودة أو عناصر الوضع الحر (P2-14)
  const [pendingTemplate, setPendingTemplate] = useState<CollageTemplate | null>(null);

  const handleSelectTemplate = (t: CollageTemplate) => {
    const capacity = t.cells?.length ?? t.slots;
    const filledSlotsWithSrc = slots.filter((s) => s.imageSrc);
    const uniqueImages = new Set(filledSlotsWithSrc.map((s) => s.imageSrc));
    // إذا كانت الصور الفريدة أكثر من سعة القالب الجديد، سيتم فقدان صور فريدة حقيقية
    // أما إذا كانت صورة واحدة مكررة أو صور فريدة تتسع بالكامل للقالب الجديد، يتم التبديل مباشرة
    const dropsImages = uniqueImages.size > capacity;
    const hasFreeElements = mode !== "collage" && elements.length > 0;
    if (dropsImages || hasFreeElements) {
      setPendingTemplate(t);
      return;
    }
    setCollageTemplate(t);
  };

  const droppedCount = pendingTemplate
    ? Math.max(0, new Set(slots.filter((s) => s.imageSrc).map((s) => s.imageSrc)).size - (pendingTemplate.cells?.length ?? pendingTemplate.slots))
    : 0;

  const loadTemplates = useCallback(async () => {
    try {
      const templates = await GetCustomTemplates();
      const mapped = templates.map((t) => ({
        id: "collage-user-" + t.id,
        name: t.name,
        slots: t.slots,
        cells: typeof t.cells === "string" ? JSON.parse(t.cells) : t.cells,
      }));
      setSavedTemplates(mapped);
    } catch (e) {
      console.error("Failed to load user templates", e);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTemplates();
  }, [loadTemplates]);

  const handleSaveTemplate = async (name: string, cells: NormalizedCell[]) => {
    try {
      await SaveCustomTemplate(name, cells.length, JSON.stringify(cells));
      toast.success("تم حفظ القالب بنجاح");
      loadTemplates();
    } catch (e) {
      console.error(e);
      toast.error(toErrorMessage(e, "حدث خطأ أثناء حفظ القالب"));
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const numericId = parseInt(id.replace("collage-user-", ""));
      if (!isNaN(numericId)) {
        await DeleteCustomTemplate(numericId);
        toast.success("تم حذف القالب بنجاح");
        loadTemplates();
      }
    } catch (err) {
      console.error(err);
      toast.error(toErrorMessage(err, "فشل حذف القالب"));
    }
  };

  const studioIcon =
    activeStudioTab === "layers" ? (
      <Stack className="w-4 h-4 text-primary" weight="duotone" />
    ) : activeStudioTab === "stickers" ? (
      <Stamp className="w-4 h-4 text-primary" weight="duotone" />
    ) : activeStudioTab === "shapes" ? (
      <Shapes className="w-4 h-4 text-primary" weight="duotone" />
    ) : activeStudioTab === "text" ? (
      <TextT className="w-4 h-4 text-primary" weight="duotone" />
    ) : activeStudioTab === "presets" ? (
      <FrameCorners className="w-4 h-4 text-primary" weight="duotone" />
    ) : (
      <Sparkle className="w-4 h-4 text-primary" weight="duotone" />
    );

  const studioTitle =
    activeStudioTab === "layers"
      ? "الطبقات"
      : activeStudioTab === "stickers"
      ? "الملصقات والشارات"
      : activeStudioTab === "shapes"
      ? "الأشكال والتصاميم"
      : activeStudioTab === "text"
      ? "النصوص الجاهزة"
      : activeStudioTab === "presets"
      ? "المقاسات والورق"
      : "استوديو التصميم";

  const studioSubtitle =
    activeStudioTab === "layers"
      ? "ترتيب وتحديد عناصر الكانفاس"
      : activeStudioTab === "stickers"
      ? "أختام وشارات وبطاقات جاهزة"
      : activeStudioTab === "shapes"
      ? "أشكال هندسية ورسوم وتصاميم"
      : activeStudioTab === "text"
      ? "عناوين وتأثيرات طباعية جاهزة"
      : activeStudioTab === "presets"
      ? "نماذج طباعة ومقاسات مخصصة"
      : "الطبقات والعناصر والمقاسات";

  return (
    <PanelShell
      icon={mode === "collage" ? <GridFour className="w-4 h-4 text-primary" weight="duotone" /> : studioIcon}
      title={mode === "collage" ? "القوالب" : studioTitle}
      subtitle={mode === "collage" ? "قوالب الكولاج والطباعة" : studioSubtitle}
      onCollapse={onCollapse}
      collapseTitle={mode === "collage" ? "إخفاء لوحة القوالب (Ctrl+B)" : `إخفاء ${studioTitle} (Ctrl+B)`}
      collapseIcon={<CaretRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" weight="bold" />}
      className="bg-transparent select-none"
    >
      {/* Hidden File Input for Templates Import */}
      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        id="import-templates-hidden" 
        className="hidden" 
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            const items = JSON.parse(text);
            if (!Array.isArray(items)) throw new Error("Invalid format");
            let imported = 0;
            for (const item of items) {
              if (item.name && item.cells) {
                await SaveCustomTemplate(item.name, item.cells.length, JSON.stringify(item.cells));
                imported++;
              }
            }
            toast.success(`تم استيراد ${imported} قالب بنجاح`);
            loadTemplates();
          } catch (err) {
            toast.error(toErrorMessage(err, "ملف غير صالح للاستيراد"));
          }
          e.target.value = "";
        }}
      />

      {mode === "collage" ? (
        <div className="space-y-4">
          <CustomCollageCard
            onSelect={handleSelectTemplate}
            activeTemplateId={collageTemplate?.id}
            onSaveTemplate={handleSaveTemplate}
            savedTemplates={savedTemplates}
            onDeleteTemplate={handleDeleteTemplate}
            fileInputRef={fileInputRef}
          />
        </div>
      ) : (
        <FreeformStudioPanel activeTab={activeStudioTab} />
      )}

      {/* Confirmation Dialog when switching templates with existing photos */}
      <AlertDialog open={pendingTemplate !== null} onOpenChange={(open) => { if (!open) setPendingTemplate(null); }}>
        <AlertDialogContent dir="rtl" className="font-cairo rounded-2xl border fluent-specular">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start text-base font-bold">
              {droppedCount > 0 ? "تبديل قالب الكولاج" : "الانتقال إلى وضع الكولاج"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start text-xs text-muted-foreground leading-relaxed">
              {droppedCount > 0 && mode === "collage"
                ? `سيتم حذف ${droppedCount} ${droppedCount === 1 ? "صورة" : "صور"} موجودة لا تتسع للقالب الجديد. هل تريد المتابعة؟`
                : droppedCount > 0
                  ? `سيتم حذف ${droppedCount} ${droppedCount === 1 ? "صورة" : "صور"} موجودة ومسح عناصر الوضع الحر الحالية. هل تريد المتابعة؟`
                  : "سيتم مسح عناصر الوضع الحر الحالية عند التحويل إلى وضع الكولاج. هل تريد المتابعة؟"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer rounded-md h-8 text-xs font-semibold">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer rounded-md h-8 text-xs font-semibold"
              onClick={() => {
                if (pendingTemplate) setCollageTemplate(pendingTemplate);
                setPendingTemplate(null);
              }}
            >
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelShell>
  );
}
