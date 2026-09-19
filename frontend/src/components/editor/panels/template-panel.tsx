import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { CaretLeft } from "@phosphor-icons/react";
import { getCollageTool, getStudioTool } from "@/lib/workspace-tools";
import { useShallow } from "zustand/react/shallow";
import { FreeformStudioPanel } from "./freeform";
import type { FreeformTab } from "./freeform/freeform-panel-constants";
import type { CollageTab } from "@/hooks/use-workspace-panels";

export interface TemplatePanelProps {
  /** يُمرر من App لإظهار زر الطي الداخلي — يُحذف في عرض Sheet الجوال */
  onCollapse?: () => void;
  activeStudioTab?: FreeformTab;
  onActiveStudioTabChange?: (tab: FreeformTab) => void;
  activeCollageTab?: CollageTab;
  onActiveCollageTabChange?: (tab: CollageTab) => void;
  /** يُمكّن شريط التبويبات الداخلي في الشاشات المدمجة (< 1024px) */
  showInternalCollageTabs?: boolean;
}

export const TemplatePanel = React.memo(function TemplatePanel({
  onCollapse,
  activeStudioTab = "layers",
  onActiveStudioTabChange,
  activeCollageTab = "custom",
  onActiveCollageTabChange,
  showInternalCollageTabs = false,
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

  const droppedCount = useMemo(() => pendingTemplate
    ? Math.max(0, new Set(slots.filter((s) => s.imageSrc).map((s) => s.imageSrc)).size - (pendingTemplate.cells?.length ?? pendingTemplate.slots))
    : 0, [pendingTemplate, slots]);

  const loadTemplates = useCallback(async () => {
    try {
      const templates = await GetCustomTemplates();
      const mapped = (templates || []).map((t) => ({
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
    loadTemplates();
  }, [loadTemplates]);

  const handleSaveTemplate = async (name: string, cells: NormalizedCell[]) => {
    try {
      await SaveCustomTemplate(name, cells.length, JSON.stringify(cells));
      toast.success("تم حفظ القالب");
      loadTemplates();
    } catch (e) {
      console.error(e);
      toast.error(toErrorMessage(e, "فشل حفظ القالب"));
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const numericId = parseInt(id.replace("collage-user-", ""));
      if (!isNaN(numericId)) {
        await DeleteCustomTemplate(numericId);
        toast.success("تم حذف القالب");
        loadTemplates();
      }
    } catch (err) {
      console.error(err);
      toast.error(toErrorMessage(err, "فشل حذف القالب"));
    }
  };

  // العنوان والوصف والأيقونة تُقرأ من سجل الأدوات الموحّد (كانت 4 سلاسل شروط ثلاثية)
  const activeTool = mode === "collage" ? getCollageTool(activeCollageTab) : getStudioTool(activeStudioTab);
  const ActiveToolIcon = activeTool.icon;

  return (
    <PanelShell
      icon={<ActiveToolIcon className="w-4 h-4 text-primary" weight="duotone" />}
      title={activeTool.title}
      subtitle={activeTool.subtitle}
      onCollapse={onCollapse}
      collapseTitle={`إخفاء ${activeTool.label} (Ctrl+B)`}
      collapseIcon={<CaretLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-0.5 transition-all" weight="bold" />}
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
            toast.success(`تم استيراد ${imported} قالب`);
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
            activeTab={activeCollageTab}
            onActiveTabChange={onActiveCollageTabChange}
            showInternalTabs={showInternalCollageTabs}
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
              {droppedCount > 0 ? "تبديل قالب الكولاج" : "وضع الكولاج"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start text-xs text-muted-foreground leading-relaxed">
              {droppedCount > 0 && mode === "collage"
                ? `سيتم حذف ${droppedCount} ${droppedCount === 1 ? "صورة" : "صور"} لا تتسع للقالب الجديد. متابعة؟`
                : droppedCount > 0
                  ? `سيتم حذف ${droppedCount} ${droppedCount === 1 ? "صورة" : "صور"} ومسح عناصر الوضع الحر. متابعة؟`
                  : "سيتم مسح عناصر الوضع الحر عند التحويل للكولاج. متابعة؟"}
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
});
