import React, { useMemo } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
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
} from '@/components/ui/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { LayersList } from '../../properties/layers-list';

interface QuickActionBtnProps {
  content: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

function QuickActionBtn({ content, onClick, disabled, children, className }: QuickActionBtnProps) {
  // 🛡️ الزر المعطّل ملفوف لاستقبال التحويم (التلميح يشرح سبب التعطيل)،
  // وبحجم h-7 الحد الأدنى بدل 6.5 — بلا pointer-events:none القاتل للتلميح.
  const btn = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      aria-label={content}
      className={cn(
        'h-7 w-7 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </Button>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? <span className="inline-flex cursor-not-allowed">{btn}</span> : btn}
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
    })),
  );

  const hasElements = elements.length > 0;
  const hasMultipleSelected = selectedIds.length > 1;
  const hasSelection = selectedIds.length > 0;

  // فحص حالة القفل والرؤية لجميع العناصر
  const allLocked = useMemo(
    () => hasElements && elements.every((e) => e.locked),
    [hasElements, elements],
  );
  const allHidden = useMemo(
    () => hasElements && elements.every((e) => e.visible === false),
    [hasElements, elements],
  );

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
    <div
      data-testid="studio-layers-panel"
      className="flex flex-col gap-2 font-cairo select-none animate-in fade-in duration-150"
      dir="rtl"
    >
      {/* 🎛️ شريط أدوات الطبقات الموحد الرشيق */}
      <div className="flex items-center justify-between h-8 px-2 rounded-lg border border-border/70 bg-card/60 shadow-2xs">
        {/* عدّاد فقط — رأس اللوح يحمل اسم «الطبقات» فلا نكرّره هنا؛
            والباقي من عرض الصف يعود لأزرار الإجراءات. */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="sr-only">{hasSelection ? 'العناصر المحددة' : 'عدد العناصر'}</span>
          <span
            title={
              hasSelection
                ? `المحدد ${selectedIds.length} من ${elements.length}`
                : `${elements.length} عنصر`
            }
            className="text-3xs font-mono font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40 shrink-0"
          >
            {selectedIds.length > 0 ? `${selectedIds.length}/${elements.length}` : elements.length}
          </span>
        </div>

        {/* أزرار الإجراءات السريعة في صف واحد مدمج */}
        <div className="flex items-center gap-0.5 shrink-0">
          <QuickActionBtn
            content={allHidden ? 'إظهار كل الطبقات' : 'إخفاء كل الطبقات'}
            onClick={handleToggleAllVisibility}
            disabled={!hasElements}
          >
            {allHidden ? (
              <EyeSlash className="w-3.5 h-3.5 text-warning" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </QuickActionBtn>

          <QuickActionBtn
            content={allLocked ? 'فك قفل كل الطبقات' : 'قفل كل الطبقات'}
            onClick={handleToggleAllLock}
            disabled={!hasElements}
          >
            {allLocked ? (
              <LockSimple className="w-3.5 h-3.5 text-warning" />
            ) : (
              <LockSimpleOpen className="w-3.5 h-3.5" />
            )}
          </QuickActionBtn>

          <div className="w-px h-3.5 bg-border/60 mx-0.5" />

          <QuickActionBtn
            content="تجميع المحدد (Ctrl+G)"
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
            content="تكرار المحدد"
            onClick={() => duplicateElements(selectedIds)}
            disabled={!hasSelection}
          >
            <Copy className="w-3.5 h-3.5" />
          </QuickActionBtn>

          <QuickActionBtn
            content="حذف المحدد"
            className="hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              const { elements } = useEditorStore.getState();
              const lockedCount = selectedIds.filter(
                (id) => elements.find((el) => el.id === id)?.locked,
              ).length;
              const removableIds = selectedIds.filter(
                (id) => !elements.find((el) => el.id === id)?.locked,
              );
              if (removableIds.length === 0 && lockedCount > 0) {
                toast.info('العناصر المحددة مقفلة — ألغِ قفلها أولاً للحذف');
                return;
              }
              if (lockedCount > 0) {
                toast.info('تجاهلنا العناصر المقفلة وحذفنا غير المقفلة فقط');
              }
              if (removableIds.length > 0) {
                removeElements(removableIds);
              }
            }}
            disabled={!hasSelection}
          >
            <Trash className="w-3.5 h-3.5" />
          </QuickActionBtn>
        </div>
      </div>

      {/* 🧭 شريط المحاذاة المشروط: يظهر فقط عند وجود عناصر محددة بتصميم رشيق مدمج */}
      {hasSelection && (
        <div className="flex items-center justify-between h-7 px-1.5 rounded-lg border border-border/50 bg-muted/30 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-0.5">
            <QuickActionBtn
              content={
                hasMultipleSelected ? 'محاذاة العناصر لليمين' : 'محاذاة لليمين في لوحة العمل'
              }
              onClick={() => alignSelectedElements('right')}
            >
              <AlignRight className="w-3 h-3" />
            </QuickActionBtn>
            <QuickActionBtn
              content={hasMultipleSelected ? 'توسيط العناصر أفقياً' : 'توسيط أفقي في لوحة العمل'}
              onClick={() => alignSelectedElements('center')}
            >
              <AlignCenterHorizontal className="w-3 h-3" />
            </QuickActionBtn>
            <QuickActionBtn
              content={
                hasMultipleSelected ? 'محاذاة العناصر لليسار' : 'محاذاة لليسار في لوحة العمل'
              }
              onClick={() => alignSelectedElements('left')}
            >
              <AlignLeft className="w-3 h-3" />
            </QuickActionBtn>
          </div>

          <div className="w-px h-3.5 bg-border/50" />

          <div className="flex items-center gap-0.5">
            <QuickActionBtn
              content={
                hasMultipleSelected ? 'محاذاة العناصر للأعلى' : 'محاذاة للأعلى في لوحة العمل'
              }
              onClick={() => alignSelectedElements('top')}
            >
              <AlignTop className="w-3 h-3" />
            </QuickActionBtn>
            <QuickActionBtn
              content={hasMultipleSelected ? 'توسيط العناصر عمودياً' : 'توسيط عمودي في لوحة العمل'}
              onClick={() => alignSelectedElements('middle')}
            >
              <AlignCenterVertical className="w-3 h-3" />
            </QuickActionBtn>
            <QuickActionBtn
              content={
                hasMultipleSelected ? 'محاذاة العناصر للأسفل' : 'محاذاة للأسفل في لوحة العمل'
              }
              onClick={() => alignSelectedElements('bottom')}
            >
              <AlignBottom className="w-3 h-3" />
            </QuickActionBtn>
          </div>

          {hasMultipleSelected && (
            <>
              <div className="w-px h-3.5 bg-border/50" />
              <div className="flex items-center gap-0.5">
                <QuickActionBtn
                  content="توزيع أفقي"
                  onClick={() => distributeSelectedElements('horizontal')}
                >
                  <ArrowsHorizontal className="w-3 h-3" />
                </QuickActionBtn>
                <QuickActionBtn
                  content="توزيع عمودي"
                  onClick={() => distributeSelectedElements('vertical')}
                >
                  <ArrowsVertical className="w-3 h-3" />
                </QuickActionBtn>
              </div>
            </>
          )}
        </div>
      )}

      {/* 📜 قائمة الطبقات الكاملة بنمط مستقل يملأ الارتفاع المتاح */}
      <LayersList standalone />
    </div>
  );
});
