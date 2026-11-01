import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { SaveCustomTemplateWithMetadata } from '@bindings/grido/app';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/huge-icon';
import { DownloadSimple, UploadSimple, CaretDown, SidebarSimple } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';
import { toErrorMessage } from '@/lib/wails-error';

import { FreeformCanvasEditor } from './freeform-canvas-editor';
import { FreeformLeftToolsPanel } from './freeform-left-tools-panel';
import { FreeformPaperSelector } from './freeform-paper-selector';
import { FreeformRightInspectorPanel } from './freeform-right-inspector-panel';
import { FreeformTopActionBar, FreeformToolButton } from './freeform-top-action-bar';
import {
  convertToGridoTemplate,
  slotsFromGridoTemplate,
  normalizeSlotSelection,
} from '../lib/freeform-math';
import {
  useFreeformDocumentHistory,
  createBlankSheet,
  createDocument,
} from '../lib/use-freeform-document-history';
import { useFreeformKeyboard } from '../lib/use-freeform-keyboard';
import { useFreeformSlotActions } from '../lib/use-freeform-slot-actions';

import type { FreeformDocument, FreeformLayout } from '../types';

interface FreeformCollageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSaved?: () => void | Promise<void>;
}

export const FreeformCollageModal: React.FC<FreeformCollageModalProps> = ({
  open,
  onOpenChange,
  onTemplateSaved,
}) => {
  const [paperWidthMM, setPaperWidthMM] = useState<number>(100);
  const [paperHeightMM, setPaperHeightMM] = useState<number>(150);
  const [layoutName, setLayoutName] = useState<string>('كولاج حر مخصص');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [showCutLines, setShowCutLines] = useState<boolean>(false);
  const [enableSnapping, setEnableSnapping] = useState<boolean>(true);
  const [panelTab, setPanelTab] = useState('insert');
  const [panelOpen, setPanelOpen] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  // التحديد المتعدد: مجموعة خلايا نشطة إضافة للخلية الأساسية
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);

  // إعدادات التعبئة الذكية: فجوة وهامش بالمليمتر
  const [packGapMM, setPackGapMM] = useState<number>(2);
  const [packMarginMM, setPackMarginMM] = useState<number>(2);

  const selectedSlotIdRef = useRef(selectedSlotId);
  const multiSelectedIdsRef = useRef(multiSelectedIds);

  const applyDocumentToUI = useCallback((document: FreeformDocument) => {
    setPaperWidthMM(document.paperWidthMM);
    setPaperHeightMM(document.paperHeightMM);
    setLayoutName(document.name);
    setShowCutLines(document.showCutLines);
    setEnableSnapping(document.enableSnapping);
    setPackGapMM(document.packGapMM);
    setPackMarginMM(document.packMarginMM);
  }, []);

  const {
    historyState,
    slots,
    slotsRef,
    documentValueRef,
    dragStartDocumentRef,
    replaceHistory,
    updateDocumentOptions,
    updateSlotsWithHistory,
    pushDocumentWithHistory,
    handleUndo,
    handleRedo,
    finishNudgeBurst,
    handleNudge,
    handleDragStart,
    handleSlotsChange,
    handleDragEnd,
  } = useFreeformDocumentHistory({
    ui: {
      paperWidthMM,
      paperHeightMM,
      layoutName,
      showCutLines,
      enableSnapping,
      packGapMM,
      packMarginMM,
    },
    applyDocumentToUI,
    selectedSlotIdRef,
    multiSelectedIdsRef,
  });

  const setSlotSelection = useCallback(
    (primaryId: string | null, secondaryIds: readonly string[] = []) => {
      finishNudgeBurst();
      const selection = normalizeSlotSelection(primaryId, secondaryIds);
      selectedSlotIdRef.current = selection.selectedSlotId;
      multiSelectedIdsRef.current = selection.multiSelectedIds;
      setSelectedSlotId(selection.selectedSlotId);
      setMultiSelectedIds(selection.multiSelectedIds);
    },
    [finishNudgeBurst],
  );

  const handleSelectSlot = useCallback(
    (id: string | null) => {
      const { selectedIds } = normalizeSlotSelection(
        selectedSlotIdRef.current,
        multiSelectedIdsRef.current,
      );
      setSlotSelection(id, id && selectedIds.includes(id) ? selectedIds : []);
      if (id) setPanelTab('properties');
    },
    [setSlotSelection],
  );

  const {
    clipboardRef,
    importInputRef,
    handlePaperDimensionsChange,
    handleSplitHorizontal,
    handleSplitVertical,
    handleAddSlot,
    handleAddPresetSlot,
    handleAutoPack,
    handleRemoveSlot,
    handleRotateSlot,
    handleDuplicateSlot,
    handleAlignSlot,
    handleDistributeSlots,
    handleUpdateSlot,
    handleToggleMultiSelect,
    handleCopySelection,
    handlePasteClipboard,
    handleScaleSelection,
    handleAlignSelectionToEachOther,
    handleResolveOverlaps,
    handleExportLayout,
    handleImportLayout,
  } = useFreeformSlotActions({
    slotsRef,
    selectedSlotIdRef,
    multiSelectedIdsRef,
    documentValueRef,
    updateSlotsWithHistory,
    pushDocumentWithHistory,
    setSlotSelection,
    finishNudgeBurst,
    paperWidthMM,
    paperHeightMM,
    packGapMM,
    packMarginMM,
    showCutLines,
    enableSnapping,
    layoutName,
  });

  useFreeformKeyboard({
    open,
    handleUndo,
    handleRedo,
    handleDuplicateSlot,
    handleRemoveSlot,
    handleCopySelection,
    handlePasteClipboard,
    handleNudge,
    finishNudgeBurst,
    setSlotSelection,
    slotsRef,
    selectedSlotIdRef,
  });

  // لقطة الافتتاح كـ state — المقارنة أثناء الرسم على ref كانت مخالفة لقواعد React
  const [initialDocument, setInitialDocument] = useState<FreeformLayout | null>(null);
  const hasDraftChanges =
    initialDocument !== null &&
    JSON.stringify({
      ...historyState.present,
      name: layoutName,
      paperWidthMM,
      paperHeightMM,
      slots,
      showCutLines,
      enableSnapping,
      packGapMM,
      packMarginMM,
    }) !== JSON.stringify(initialDocument);

  // Reset local transactions and resume the applied document on every opening.
  useEffect(() => {
    finishNudgeBurst();
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsApplying(false);
      setIsSavingTemplate(false);
      dragStartDocumentRef.current = null;
      clipboardRef.current = null;
      const store = useEditorStore.getState();
      const ps = store.printSettings;
      const dpi = ps?.dpi || 300;
      let initW = ps?.paperWidthMM;
      let initH = ps?.paperHeightMM;
      if (!initW || !initH) {
        initW = Math.round(((store.canvasWidth || 2480) * 25.4) / dpi);
        initH = Math.round(((store.canvasHeight || 3508) * 25.4) / dpi);
      }
      const isLandscape = ps?.orientation === 'landscape';
      const resolvedW = Math.max(10, isLandscape ? Math.max(initW, initH) : Math.min(initW, initH));
      const resolvedH = Math.max(10, isLandscape ? Math.min(initW, initH) : Math.max(initW, initH));

      const currentTemplate = store.collageTemplate;
      const canResume =
        currentTemplate?.metadata?.kind === 'freeform' ||
        currentTemplate?.id.startsWith('freeform-');
      const templateMetadata = currentTemplate?.metadata;
      const initialSlots =
        canResume && currentTemplate
          ? slotsFromGridoTemplate(currentTemplate).map((slot, index) => ({
              ...slot,
              sourceSlotId: store.slots[index]?.id,
            }))
          : createBlankSheet(resolvedW, resolvedH);
      const initialDocument = createDocument(
        templateMetadata?.paperWidthMM ?? resolvedW,
        templateMetadata?.paperHeightMM ?? resolvedH,
        initialSlots,
        {
          id: currentTemplate?.id ?? crypto.randomUUID(),
          name: canResume ? currentTemplate?.name : 'كولاج حر مخصص',
          showCutLines: templateMetadata?.showCutLines ?? store.collageShowCutLines,
          enableSnapping: templateMetadata?.enableSnapping ?? true,
          packGapMM: templateMetadata?.packGapMM ?? 2,
          packMarginMM: templateMetadata?.packMarginMM ?? 2,
        },
      );
      setInitialDocument(initialDocument);
      applyDocumentToUI(initialDocument);
      setDiscardConfirmOpen(false);
      replaceHistory({ past: [], present: initialDocument, future: [] });
      setSlotSelection(initialSlots[0]?.id ?? null);
    } else {
      setIsApplying(false);
      setIsSavingTemplate(false);
      dragStartDocumentRef.current = null;
      clipboardRef.current = null;
    }
    return () => {
      finishNudgeBurst();
      dragStartDocumentRef.current = null;
    };
  }, [
    open,
    finishNudgeBurst,
    replaceHistory,
    applyDocumentToUI,
    setSlotSelection,
    dragStartDocumentRef,
    clipboardRef,
  ]);

  useEffect(() => {
    const existingIds = new Set(slots.map((slot) => slot.id));
    const validSecondary = multiSelectedIds.filter((id) => existingIds.has(id));
    const validPrimary = selectedSlotId && existingIds.has(selectedSlotId) ? selectedSlotId : null;
    if (validPrimary !== selectedSlotId || validSecondary.length !== multiSelectedIds.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlotSelection(
        validPrimary ?? validSecondary[0] ?? (selectedSlotId ? (slots[0]?.id ?? null) : null),
        validSecondary,
      );
    }
  }, [slots, selectedSlotId, multiSelectedIds, setSlotSelection]);

  const handleSaveAsCustomTemplate = async () => {
    finishNudgeBurst();
    try {
      setIsSavingTemplate(true);
      const currentSlots = slotsRef.current;
      const baseName = layoutName.trim() || 'كولاج مخصص';
      const templateName = `${baseName} (${paperWidthMM}×${paperHeightMM}مم)`;
      const gridoTemplate = convertToGridoTemplate({
        id: 'freeform-' + crypto.randomUUID(),
        name: templateName,
        paperWidthMM,
        paperHeightMM,
        slots: currentSlots,
        showCutLines,
        enableSnapping,
        packGapMM,
        packMarginMM,
      });

      if (typeof SaveCustomTemplateWithMetadata === 'function') {
        await SaveCustomTemplateWithMetadata(
          templateName,
          gridoTemplate.cells.length,
          JSON.stringify(gridoTemplate.cells),
          JSON.stringify(gridoTemplate.metadata),
        );
        toast.success(`حُفظ القالب "${templateName}" في قوالبك!`);
        await onTemplateSaved?.();
      } else {
        const raw = localStorage.getItem('grido_custom_templates');
        let saved: Array<{ name: string; template: unknown }> = [];
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            saved = parsed.filter(
              (item): item is { name: string; template: unknown } =>
                !!item &&
                typeof item === 'object' &&
                typeof (item as { name?: unknown }).name === 'string',
            );
          }
        }
        saved.push({ name: templateName, template: gridoTemplate });
        localStorage.setItem('grido_custom_templates', JSON.stringify(saved));
        toast.success(`حُفظ الكولاج "${templateName}"`);
        await onTemplateSaved?.();
      }
    } catch (err: unknown) {
      toast.error(toErrorMessage(err, 'فشل الحفظ'));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleApplyToCanvas = () => {
    finishNudgeBurst();
    try {
      setIsApplying(true);
      const currentDocument = documentValueRef.current;
      const sourceSlotIds = currentDocument.slots.map((slot) => slot.sourceSlotId);
      const layout: FreeformLayout = {
        ...currentDocument,
        id: 'freeform-' + crypto.randomUUID(),
        name: currentDocument.name || 'كولاج حر مخصص',
      };

      const gridoTemplate = convertToGridoTemplate(layout);
      const store = useEditorStore.getState();

      const result = store.commitCollageLayout(gridoTemplate, {
        paperWidthMM: layout.paperWidthMM,
        paperHeightMM: layout.paperHeightMM,
        sourceSlotIds,
      });
      if (result.remaining > 0) {
        toast.info(
          `أُبقيت ${result.remaining} ${result.remaining === 1 ? 'صورة' : 'صور'} في قائمة التعبئة`,
        );
      }

      toast.success(
        `طُبّق كولاج "${layout.name}" (${layout.paperWidthMM}×${layout.paperHeightMM} مم)`,
      );
      // نقطة الافتتاح تتقدم بعد التطبيق — الإغلاق التالي لا يسأل عن مسودة مطبقة
      setInitialDocument(documentValueRef.current);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(toErrorMessage(err, 'خطأ أثناء التطبيق'));
    } finally {
      setIsApplying(false);
    }
  };

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  const multiCountTotal = normalizeSlotSelection(selectedSlotId, multiSelectedIds).selectedIds
    .length;

  const requestClose = useCallback(() => {
    finishNudgeBurst();
    if (hasDraftChanges) setDiscardConfirmOpen(true);
    else onOpenChange(false);
  }, [finishNudgeBurst, hasDraftChanges, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        finishNudgeBurst();
        if (!next && hasDraftChanges) {
          setDiscardConfirmOpen(true);
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        ref={dialogRef}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          dialogRef.current?.focus();
        }}
        showCloseButton={false}
        className="w-[calc(100vw-16px)] max-w-none sm:max-w-[1600px] h-[calc(100dvh-16px)] flex flex-col p-0 overflow-hidden bg-card border border-border/80 rounded-xl shadow-fluent-16 font-cairo gap-0"
        dir="rtl"
        aria-describedby={undefined}
        onPointerDownCapture={finishNudgeBurst}
        onClickCapture={finishNudgeBurst}
        onEscapeKeyDown={() => setSlotSelection(selectedSlotIdRef.current)}
      >
        <DialogHeader className="px-3 py-2 border-b border-border/60 shrink-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <DialogTitle className="text-sm font-semibold whitespace-nowrap">
              الكولاج الحر
            </DialogTitle>
            <div className="hidden sm:block h-5 w-px bg-border/60 mx-1" />
            <Input
              value={layoutName}
              onChange={(e) => updateDocumentOptions({ name: e.target.value })}
              aria-label="اسم التخطيط"
              className="h-8 w-full order-last sm:order-none sm:w-48 min-w-0 border-transparent bg-transparent text-xs shadow-none hover:border-border focus-visible:border-primary"
            />
            <div className="flex-1" />
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-7 sm:w-auto gap-1 px-1 sm:px-3 text-xs"
                  aria-label="خيارات التخطيط"
                >
                  <span className="hidden sm:inline">ملف</span>
                  <CaretDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 font-cairo">
                <DropdownMenuItem onSelect={() => importInputRef.current?.click()}>
                  <UploadSimple className="size-4" />
                  استيراد JSON
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportLayout} disabled={slots.length === 0}>
                  <DownloadSimple className="size-4" />
                  تصدير JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleSaveAsCustomTemplate}
              disabled={isSavingTemplate || slots.length === 0}
            >
              {isSavingTemplate ? <Spinner size={14} /> : null}
              حفظ قالب
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs px-3 sm:px-5"
              onClick={handleApplyToCanvas}
              disabled={isApplying || slots.length === 0}
            >
              {isApplying ? <Spinner size={14} /> : null}
              {isApplying ? 'جاري التطبيق ...' : 'تطبيق الكولاج'}
            </Button>
            <div className="hidden sm:block h-5 w-px bg-border/60 mx-1" />
            <DialogCloseButton onClick={requestClose} />
          </div>
        </DialogHeader>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportLayout}
        />

        <div className="flex flex-wrap items-center justify-between border-b border-border/60 shrink-0">
          <FreeformTopActionBar
            selectedSlotId={selectedSlotId}
            multiSelectedCount={multiCountTotal}
            canUndo={historyState.past.length > 0}
            canRedo={historyState.future.length > 0}
            showCutLines={showCutLines}
            enableSnapping={enableSnapping}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDuplicateSlot={handleDuplicateSlot}
            onRotateSlot={handleRotateSlot}
            onRemoveSlot={handleRemoveSlot}
            onScaleSelection={handleScaleSelection}
            onSplitHorizontal={handleSplitHorizontal}
            onSplitVertical={handleSplitVertical}
            onAlignSlot={handleAlignSlot}
            onAlignSelectionToEachOther={handleAlignSelectionToEachOther}
            onDistributeSlots={handleDistributeSlots}
            onResolveOverlaps={handleResolveOverlaps}
            onToggleCutLines={() =>
              updateDocumentOptions({ showCutLines: !documentValueRef.current.showCutLines })
            }
            onToggleSnapping={() =>
              updateDocumentOptions({ enableSnapping: !documentValueRef.current.enableSnapping })
            }
          />

          <div className="flex items-center gap-2 px-3 py-1.5 min-w-0">
            <FreeformToolButton
              onClick={() => setPanelOpen((value) => !value)}
              active={panelOpen}
              title={panelOpen ? 'إخفاء لوحة الأدوات' : 'إظهار لوحة الأدوات'}
            >
              <SidebarSimple className="size-4" />
            </FreeformToolButton>
            <FreeformPaperSelector
              paperWidthMM={paperWidthMM}
              paperHeightMM={paperHeightMM}
              onPaperDimensionsChange={handlePaperDimensionsChange}
              className="min-w-0"
            />
          </div>
        </div>

        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          <aside
            aria-label="لوحة الكولاج"
            className={cn(
              'w-[280px] max-w-[85%] shrink-0 border-e border-border/60 bg-card min-h-0 flex-col absolute inset-y-0 start-0 z-30 shadow-fluent-16 md:static md:shadow-none',
              panelOpen ? 'flex' : 'hidden',
            )}
          >
            <Tabs
              value={panelTab}
              onValueChange={setPanelTab}
              dir="rtl"
              className="gap-0 flex-1 min-h-0"
            >
              <TabsList
                aria-label="أدوات الكولاج"
                className="h-11 w-full shrink-0 rounded-none border-0 border-b border-border/60 bg-transparent dark:bg-transparent p-0 gap-0"
              >
                {(
                  [
                    ['insert', 'إدراج'],
                    ['pack', 'تعبئة'],
                    ['properties', 'خصائص'],
                  ] as const
                ).map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-none h-full text-xs data-[state=active]:border-0 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {(['insert', 'pack'] as const).map((mode) => (
                <TabsContent
                  key={mode}
                  value={mode}
                  forceMount
                  className="min-h-0 overflow-y-auto data-[state=inactive]:hidden"
                >
                  <FreeformLeftToolsPanel
                    mode={mode}
                    packGapMM={packGapMM}
                    packMarginMM={packMarginMM}
                    onAddSlot={handleAddSlot}
                    onAddPresetSlot={handleAddPresetSlot}
                    onAutoPack={handleAutoPack}
                    onPackGapChange={(packGapMM) => updateDocumentOptions({ packGapMM })}
                    onPackMarginChange={(packMarginMM) => updateDocumentOptions({ packMarginMM })}
                  />
                </TabsContent>
              ))}
              <TabsContent value="properties" className="min-h-0 overflow-y-auto">
                <FreeformRightInspectorPanel
                  slot={selectedSlot}
                  multiSelectedCount={multiCountTotal}
                  paperWidthMM={paperWidthMM}
                  paperHeightMM={paperHeightMM}
                  onUpdateSlot={handleUpdateSlot}
                />
              </TabsContent>
            </Tabs>
          </aside>
          <main aria-label="مساحة تخطيط الكولاج" className="flex-1 min-w-0 min-h-0 flex">
            <FreeformCanvasEditor
              paperWidthMM={paperWidthMM}
              paperHeightMM={paperHeightMM}
              slots={slots}
              selectedSlotId={selectedSlotId}
              multiSelectedIds={multiSelectedIds}
              showCutLines={showCutLines}
              enableSnapping={enableSnapping}
              onSelectSlot={handleSelectSlot}
              onToggleMultiSelect={handleToggleMultiSelect}
              onDragStart={handleDragStart}
              onSlotsChange={handleSlotsChange}
              onDragEnd={handleDragEnd}
            />
          </main>
        </div>

        <footer className="h-8 px-3 border-t border-border/60 flex items-center gap-4 shrink-0 text-mini text-muted-foreground tabular-nums">
          <span>{slots.length} خلايا</span>
          {multiCountTotal > 0 && <span>{multiCountTotal} محدد</span>}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="h-7 text-mini" onClick={requestClose}>
            إلغاء
          </Button>
        </footer>

        {/* حوار تجاهل المسودة — يظهر فقط عند وجود تغييرات غير مطبقة */}
        <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
          <AlertDialogContent dir="rtl" className="font-cairo">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-start text-base font-bold">
                تجاهل تعديلات التخطيط؟
              </AlertDialogTitle>
              <AlertDialogDescription className="text-start text-xs text-muted-foreground leading-relaxed">
                لديك تعديلات لم تُطبَّق بعد. الإغلاق سيُلغيها، و«تطبيق الكولاج» يثبّتها على الورقة.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer rounded-md h-8 text-xs font-semibold">
                متابعة التحرير
              </AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer rounded-md h-8 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  finishNudgeBurst();
                  setDiscardConfirmOpen(false);
                  onOpenChange(false);
                }}
              >
                تجاهل التعديلات
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
