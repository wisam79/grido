import React, { useMemo } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Eye,
  EyeSlash,
  LockSimple,
  LockSimpleOpen,
  FolderSimplePlus,
  FolderSimpleDashed,
  Trash,
  Copy,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignRight,
  AlignTop,
  AlignBottom,
  ArrowsHorizontal,
  ArrowsVertical,
} from "@phosphor-icons/react";
import { LayersList } from "../../properties/layers-list";

interface QuickActionBtnProps {
  content: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function QuickActionBtn({ content, onClick, disabled, children }: QuickActionBtnProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onClick}
          className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-cairo text-xs font-semibold py-1 px-2.5">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export const FreeformLayersTab = React.memo(function FreeformLayersTab() {
  const {
    elements,
    selectedIds,
    updateElements,
    removeElements,
    duplicateElements,
    groupSelectedElements,
    ungroupSelectedElements,
    alignSelectedElements,
    distributeSelectedElements,
    pushHistory,
  } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedIds: state.selectedIds,
      updateElements: state.updateElements,
      removeElements: state.removeElements,
      duplicateElements: state.duplicateElements,
      groupSelectedElements: state.groupSelectedElements,
      ungroupSelectedElements: state.ungroupSelectedElements,
      alignSelectedElements: state.alignSelectedElements,
      distributeSelectedElements: state.distributeSelectedElements,
      pushHistory: state.pushHistory,
    }))
  );

  const hasElements = elements.length > 0;
  const hasMultipleSelected = selectedIds.length > 1;
  const hasSelection = selectedIds.length > 0;

  // فحص حالة القفل والرؤية لجميع العناصر
  const allLocked = useMemo(() => hasElements && elements.every((e) => e.locked), [hasElements, elements]);
  const allHidden = useMemo(() => hasElements && elements.every((e) => e.visible === false), [hasElements, elements]);

  // إخفاء / إظهار الكل
  const handleToggleAllVisibility = () => {
    if (!hasElements) return;
    const target = allHidden; // إذا كان الكل مخفياً، أظهر الكل
    updateElements(elements.map((e) => ({ id: e.id, patch: { visible: target } })));
    pushHistory();
  };

  // قفل / فتح الكل
  const handleToggleAllLock = () => {
    if (!hasElements) return;
    const target = !allLocked;
    updateElements(elements.map((e) => ({ id: e.id, patch: { locked: target } })));
    pushHistory();
  };

  return (
    <div className="space-y-3 font-cairo animate-in fade-in duration-150" dir="rtl">
      {/* 🎛️ شريط أدوات الطبقات السريع المجمع */}
      <div className="bg-card border border-border p-2 rounded-xl shadow-xs fluent-specular space-y-2">
        <div className="flex items-center justify-between border-b border-border/40 pb-1.5 px-1">
          <span className="text-xs font-bold text-foreground/80">أدوات الطبقات والترتيب</span>
          <span className="text-micro text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
            {selectedIds.length > 0 ? `${selectedIds.length} محدد` : `${elements.length} طبقة`}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1 flex-wrap">
          {/* التحكم الجماعي */}
          <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/30">
            <QuickActionBtn
              content={allHidden ? "إظهار كافة الطبقات" : "إخفاء كافة الطبقات"}
              onClick={handleToggleAllVisibility}
              disabled={!hasElements}
            >
              {allHidden ? <EyeSlash className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
            </QuickActionBtn>

            <QuickActionBtn
              content={allLocked ? "فتح قفل كافة الطبقات" : "قفل كافة الطبقات"}
              onClick={handleToggleAllLock}
              disabled={!hasElements}
            >
              {allLocked ? <LockSimple className="w-3.5 h-3.5 text-amber-500" /> : <LockSimpleOpen className="w-3.5 h-3.5" />}
            </QuickActionBtn>
          </div>

          {/* التجميع والعمليات */}
          <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/30">
            <QuickActionBtn
              content="تجميع العناصر المحددة (Ctrl+G)"
              onClick={groupSelectedElements}
              disabled={!hasMultipleSelected}
            >
              <FolderSimplePlus className="w-3.5 h-3.5" />
            </QuickActionBtn>

            <QuickActionBtn
              content="فك التجميع (Ctrl+Shift+G)"
              onClick={ungroupSelectedElements}
              disabled={!hasSelection}
            >
              <FolderSimpleDashed className="w-3.5 h-3.5" />
            </QuickActionBtn>

            <QuickActionBtn
              content="تكرار العناصر المحددة"
              onClick={() => duplicateElements(selectedIds)}
              disabled={!hasSelection}
            >
              <Copy className="w-3.5 h-3.5" />
            </QuickActionBtn>

            <QuickActionBtn
              content="حذف العناصر المحددة"
              onClick={() => removeElements(selectedIds)}
              disabled={!hasSelection}
            >
              <Trash className="w-3.5 h-3.5 text-destructive" />
            </QuickActionBtn>
          </div>
        </div>

        {/* أدوات المحاذاة السريعة للتحديد المتعدد أو الفردي */}
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5">
            <QuickActionBtn content="محاذاة لليمين" onClick={() => alignSelectedElements("right")} disabled={!hasSelection}>
              <AlignRight className="w-3.5 h-3.5" />
            </QuickActionBtn>
            <QuickActionBtn content="توسيط أفقي" onClick={() => alignSelectedElements("center")} disabled={!hasSelection}>
              <AlignCenterHorizontal className="w-3.5 h-3.5" />
            </QuickActionBtn>
            <QuickActionBtn content="محاذاة لليسار" onClick={() => alignSelectedElements("left")} disabled={!hasSelection}>
              <AlignLeft className="w-3.5 h-3.5" />
            </QuickActionBtn>
          </div>

          <div className="w-px h-4 bg-border/50" />

          <div className="flex items-center gap-0.5">
            <QuickActionBtn content="محاذاة للأعلى" onClick={() => alignSelectedElements("top")} disabled={!hasSelection}>
              <AlignTop className="w-3.5 h-3.5" />
            </QuickActionBtn>
            <QuickActionBtn content="توسيط عمودي" onClick={() => alignSelectedElements("middle")} disabled={!hasSelection}>
              <AlignCenterVertical className="w-3.5 h-3.5" />
            </QuickActionBtn>
            <QuickActionBtn content="محاذاة للأسفل" onClick={() => alignSelectedElements("bottom")} disabled={!hasSelection}>
              <AlignBottom className="w-3.5 h-3.5" />
            </QuickActionBtn>
          </div>

          <div className="w-px h-4 bg-border/50" />

          <div className="flex items-center gap-0.5">
            <QuickActionBtn content="توزيع المسافات أفقياً" onClick={() => distributeSelectedElements("horizontal")} disabled={!hasMultipleSelected}>
              <ArrowsHorizontal className="w-3.5 h-3.5" />
            </QuickActionBtn>
            <QuickActionBtn content="توزيع المسافات عمودياً" onClick={() => distributeSelectedElements("vertical")} disabled={!hasMultipleSelected}>
              <ArrowsVertical className="w-3.5 h-3.5" />
            </QuickActionBtn>
          </div>
        </div>
      </div>

      {/* 📜 قائمة الطبقات التفاعلية بالسحب والإفلات */}
      <LayersList />
    </div>
  );
});
