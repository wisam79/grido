import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  EyeSlash,
  LockSimple,
  LockSimpleOpen,
  Group,
  GroupDismiss,
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
  Merge,
  ShapeUnion,
  ShapeSubtract,
  ShapeIntersect,
  ShapeExclude,
  ImageStack,
} from '@/components/ui/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useStageRef } from '@/lib/canvas/stage-context';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { LayersList } from '../../properties/layers-list';

import type { BooleanOp } from '@/lib/canvas/path-boolean';
import type { MergeResult, RasterizeResult } from '@/lib/store/slices/element';

const QUICK_BTN_CLASS =
  'h-7 w-7 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';

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
      className={cn(QUICK_BTN_CLASS, className)}
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

/** الدمج يعمل على كامل التحديد لا على الطبقة المضغوطة وحدها */
const MERGE_MESSAGES: Record<Exclude<MergeResult, 'ok'>, string> = {
  'need-two-shapes': 'حدّد شكلين أو أكثر لدمجهما',
  locked: 'بعض الطبقات المحددة مقفلة — فكّ القفل أولاً',
  unsupported: 'الدمج المنطقي للأشكال المتجهة فقط — استخدم «تسطيح كصورة» للنصوص والصور',
  'empty-result': 'لا تداخل بين الطبقات — الناتج شكل فارغ',
  failed: 'تعذّر تنفيذ عملية الدمج',
};

const RASTERIZE_MESSAGES: Record<Exclude<RasterizeResult, 'ok'>, string> = {
  empty: 'لا طبقات مرئية ضمن التحديد',
  locked: 'بعض الطبقات المحددة مقفلة — فكّ القفل أولاً',
  'no-stage': 'لوح العمل غير جاهز بعد',
  'wrong-mode': 'التسطيح متاح في الطبقة الحرة فقط',
  'too-large': 'منطقة التحديد أكبر مما يسمح به التسطيح',
  failed: 'تعذّر التقاط الطبقات',
};

const MERGE_OPS: { op: BooleanOp; label: string; icon: React.ReactNode }[] = [
  { op: 'union', label: 'اتحاد', icon: <ShapeUnion className="w-3.5 h-3.5" /> },
  {
    op: 'subtract',
    label: 'طرح (الأمامية تقطع الخلفية)',
    icon: <ShapeSubtract className="w-3.5 h-3.5" />,
  },
  {
    op: 'intersect',
    label: 'تقاطع (التداخل فقط)',
    icon: <ShapeIntersect className="w-3.5 h-3.5" />,
  },
  {
    op: 'exclude',
    label: 'استثناء (ما عدا التداخل)',
    icon: <ShapeExclude className="w-3.5 h-3.5" />,
  },
];

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
    mergeSelectedShapes,
    rasterizeSelected,
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
      mergeSelectedShapes: state.mergeSelectedShapes,
      rasterizeSelected: state.rasterizeSelected,
      pushHistory: state.pushHistory,
    })),
  );

  const stageRef = useStageRef();
  const [isRasterizing, setIsRasterizing] = useState(false);

  const hasElements = elements.length > 0;
  const hasMultipleSelected = selectedIds.length > 1;
  const hasSelection = selectedIds.length > 0;

  const selectedElements = useMemo(
    () => elements.filter((el) => selectedIds.includes(el.id)),
    [elements, selectedIds],
  );
  // الطبقات المخفية خارج الحساب كما في كل أدوات الدمج: اتحاد طبقة مخفية كان
  // يُنتج شكلاً غير مرئي فيصدر المستند بنقص صامت
  const visibleSelected = useMemo(
    () => selectedElements.filter((el) => el.visible !== false),
    [selectedElements],
  );
  const selectionLocked = selectedElements.some((el) => el.locked);
  const canMerge =
    visibleSelected.length >= 2 && visibleSelected.every((el) => el.type === 'shape');
  const canRasterize = visibleSelected.length >= 1 && !selectionLocked;

  const runMerge = (op: BooleanOp) => {
    const result = mergeSelectedShapes(op);
    if (result === 'ok') {
      toast.success('دُمجت الطبقات في شكل واحد');
      return;
    }
    toast.error(MERGE_MESSAGES[result]);
  };

  const runRasterize = async () => {
    setIsRasterizing(true);
    try {
      const result = await rasterizeSelected(stageRef.current);
      if (result === 'ok') toast.success('طُسّلت الطبقات في صورة واحدة');
      else toast.error(RASTERIZE_MESSAGES[result]);
    } finally {
      setIsRasterizing(false);
    }
  };

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
      <div className="flex items-center justify-between h-8 px-1.5 rounded-md border border-border/60 bg-card/40">
        {/* عدّاد فقط — رأس اللوح يحمل اسم «الطبقات» فلا نكرّره هنا؛
            والباقي من عرض الصف يعود لأزرار الإجراءات. */}
        <div className="flex items-center gap-1.5 shrink-0 ps-0.5">
          <span className="sr-only">{hasSelection ? 'العناصر المحددة' : 'عدد العناصر'}</span>
          <span
            title={
              hasSelection
                ? `المحدد ${selectedIds.length} من ${elements.length}`
                : `${elements.length} عنصر`
            }
            className={cn(
              'text-3xs font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded-md border shrink-0 transition-colors',
              hasSelection
                ? 'bg-primary/10 text-primary border-primary/25'
                : 'bg-muted/60 text-muted-foreground border-border/50',
            )}
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
            <Group className="w-3.5 h-3.5" />
          </QuickActionBtn>

          <QuickActionBtn
            content="فك التجميع (Ctrl+Shift+G)"
            onClick={ungroupSelectedElements}
            disabled={!hasSelection}
          >
            <GroupDismiss className="w-3.5 h-3.5" />
          </QuickActionBtn>

          {/* الدمج يعمل على كامل التحديد لا على الطبقة المضغوطة وحدها، فموضعه
              شريط التحديد لا قائمة كل سطر — وسبب التعطيل في التلميح. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!canMerge && !canRasterize}
                      aria-label="دمج الطبقات المحددة"
                      data-testid="layers-merge-menu"
                      className={QUICK_BTN_CLASS}
                    >
                      <Merge className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={6} className="w-56 font-cairo">
                    <DropdownMenuLabel className="text-mini">دمج الطبقات المحددة</DropdownMenuLabel>
                    {MERGE_OPS.map((item) => (
                      <DropdownMenuItem
                        key={item.op}
                        disabled={!canMerge}
                        onClick={() => runMerge(item.op)}
                      >
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!canRasterize || isRasterizing}
                      onClick={runRasterize}
                    >
                      <ImageStack className="w-3.5 h-3.5" />
                      {isRasterizing ? 'جاري التسطيح ...' : 'تسطيح كصورة'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-cairo text-xs font-semibold py-1 px-2.5">
              {canMerge
                ? 'دمج الأشكال المحددة في شكل واحد'
                : canRasterize
                  ? 'تسطيح الطبقات المحددة في صورة واحدة'
                  : 'حدّد طبقتين من الأشكال للدمج المنطقي'}
            </TooltipContent>
          </Tooltip>

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
        <div className="flex items-center justify-between h-8 px-1 rounded-md border border-border/60 bg-card/40 animate-in fade-in duration-150">
          <div className="flex items-center gap-0.5">
            <QuickActionBtn
              content={
                hasMultipleSelected ? 'محاذاة العناصر لليمين' : 'محاذاة لليمين في لوحة العمل'
              }
              onClick={() => alignSelectedElements('right')}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </QuickActionBtn>
            <QuickActionBtn
              content={hasMultipleSelected ? 'توسيط العناصر أفقياً' : 'توسيط أفقي في لوحة العمل'}
              onClick={() => alignSelectedElements('center')}
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5" />
            </QuickActionBtn>
            <QuickActionBtn
              content={
                hasMultipleSelected ? 'محاذاة العناصر لليسار' : 'محاذاة لليسار في لوحة العمل'
              }
              onClick={() => alignSelectedElements('left')}
            >
              <AlignLeft className="w-3.5 h-3.5" />
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
              <AlignTop className="w-3.5 h-3.5" />
            </QuickActionBtn>
            <QuickActionBtn
              content={hasMultipleSelected ? 'توسيط العناصر عمودياً' : 'توسيط عمودي في لوحة العمل'}
              onClick={() => alignSelectedElements('middle')}
            >
              <AlignCenterVertical className="w-3.5 h-3.5" />
            </QuickActionBtn>
            <QuickActionBtn
              content={
                hasMultipleSelected ? 'محاذاة العناصر للأسفل' : 'محاذاة للأسفل في لوحة العمل'
              }
              onClick={() => alignSelectedElements('bottom')}
            >
              <AlignBottom className="w-3.5 h-3.5" />
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
                  <ArrowsHorizontal className="w-3.5 h-3.5" />
                </QuickActionBtn>
                <QuickActionBtn
                  content="توزيع عمودي"
                  onClick={() => distributeSelectedElements('vertical')}
                >
                  <ArrowsVertical className="w-3.5 h-3.5" />
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
