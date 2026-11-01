import React, { useState, useCallback, useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogCloseButton,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/huge-icon';
import {
  Plus,
  GridFour,
  DownloadSimple,
  Copy,
  FilePng,
  FileSvg,
  CaretDown,
  ArrowRight,
  ArrowCounterClockwise,
  Sparkle,
  Code,
  Scissors,
  GridFour as TableIcon,
} from '@/components/ui/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import { StickerCatalog } from './sticker-catalog';
import { StickerPreview } from './sticker-preview';
import { StickerProperties } from './sticker-properties';
import { VdpImportDialog } from './vdp-import-dialog';
import { useStickerCustomization } from '../lib/use-sticker-customization';
import { useStickerExportActions } from '../lib/use-sticker-export-actions';
import { resolveStickerSheetMm, useStickerInsertActions } from '../lib/use-sticker-insert-actions';
import { ALL_STICKER_TEMPLATES } from '../templates';
import type { StickerCategory, StickerCategoryGroupId, StickerShape } from '../types';
import type { StickerElementSource } from '@/lib/store/types';

export interface StickerStudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: StickerCategoryGroupId | StickerCategory | 'all';
  /**
   * وضع إعادة التحرير: عنصر ملصق موجود على الكانفس. عند توفيره يُفتح الاستوديو
   * على قالب العنصر بتخصيصاته المحفوظة، والإدراج يُحدّث نفس العنصر بدل إضافة جديد.
   */
  editingElement?: { id: string; source: StickerElementSource } | null;
}

export const StickerStudioDialog = React.memo(function StickerStudioDialog({
  open,
  onOpenChange,
  initialCategory = 'all',
  editingElement = null,
}: StickerStudioDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    StickerCategoryGroupId | StickerCategory | 'all'
  >(initialCategory);
  const [selectedShape, setSelectedShape] = useState<StickerShape | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVdpOpen, setIsVdpOpen] = useState(false);

  // حارس الإلغاء: أي دالة غير متزامنة (إدراج/شيت/تصدير) لا تُنتج عنصراً ولا
  // تُظهر رسالة نجاح إذا أُغلقت النافذة أثناء انتظارها
  const cancelledRef = useRef(false);

  const {
    view,
    setView,
    selectedTemplate,
    params,
    canUndo,
    canRedo,
    setParams,
    commitParams,
    undo,
    redo,
    handleSelectTemplate,
    handleBackToGallery,
    handleResetDefaults,
    handleChangeField,
    handleChangeColor,
    handleResetField,
    svgString,
    exportableSvg,
    hiddenFieldIds,
  } = useStickerCustomization({ open, initialCategory, editingElement, cancelledRef });

  const {
    isInserting,
    isGeneratingSheet,
    gridConfig,
    setGridConfig,
    handleInsertSingle,
    handleInsertSheet,
  } = useStickerInsertActions({
    open,
    editingElement,
    selectedTemplate,
    params,
    svgString,
    exportableSvg,
    cancelledRef,
    onOpenChange,
  });

  const {
    busyExport,
    handleDownloadSvg,
    handleDownloadCutContour,
    handleDownloadPureCutContour,
    handleDownloadPng,
    handleCopyImage,
    handleCopySvgCode,
  } = useStickerExportActions({
    open,
    selectedTemplate,
    params,
    svgString,
    exportableSvg,
    cancelledRef,
  });

  const handleChangeCategory = useCallback(
    (cat: StickerCategoryGroupId | StickerCategory | 'all') => {
      setSelectedCategory(cat);
    },
    [],
  );

  // أبعاد ورقة الطباعة الفعالة لزر «ملاءمة تلقائية» في تبويب الشيت
  // (قراءة خفيفة من المتجر عند كل render — الورق لا يتغير والحوار مفتوح عادةً)
  const sheetMm = resolveStickerSheetMm();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        // 🛡️ بلا min-h ثابت (كان يحجب الفوتر تحت ~590px) وبلا قص أفقي
        // صامت للعمودين (670px ثابتة) — تمرير أفقي بدلاً من ذلك
        className="w-[94vw] sm:max-w-[920px] h-[640px] max-h-[88vh] flex flex-col p-0 overflow-hidden bg-card border border-border/80 dark:border-white/10 rounded-xl shadow-fluent-16 font-cairo fluent-specular gap-0"
        dir="rtl"
      >
        {/* ── Title Bar Header (Adapts to Active Stage) ── */}
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            {view === 'gallery' ? (
              /* Gallery Header */
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <DialogTitle className="text-sm font-bold text-foreground truncate">
                    الملصقات
                  </DialogTitle>
                  <span className="text-mini font-mono font-bold px-2 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {ALL_STICKER_TEMPLATES.length}
                  </span>
                  <DialogDescription className="sr-only">
                    معرض ملصقات وشارات Grido
                  </DialogDescription>
                </div>
              </div>
            ) : (
              /* Customize Header with Back Button */
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToGallery}
                  className="h-8 px-2 text-xs font-bold gap-1 rounded-md hover:bg-muted text-foreground cursor-pointer shrink-0 border border-border/40 hover:border-border/70"
                  title="العودة للمعرض"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>المعرض</span>
                </Button>

                <div className="w-px h-4 bg-border/60 shrink-0" />

                <div className="flex items-center gap-2 min-w-0">
                  <DialogTitle className="text-sm font-bold text-foreground truncate">
                    {selectedTemplate.name}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    تخصيص ملصق {selectedTemplate.name}
                  </DialogDescription>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 shrink-0">
              {view === 'customize' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetDefaults}
                      disabled={isInserting || isGeneratingSheet || busyExport}
                      className="w-7 h-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-md hover:bg-muted/50"
                      aria-label="استعادة الافتراضي"
                    >
                      <ArrowCounterClockwise className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-cairo">
                    استعادة الافتراضي
                  </TooltipContent>
                </Tooltip>
              )}
              <DialogCloseButton disabled={isInserting || isGeneratingSheet || busyExport} />
            </div>
          </div>
        </DialogHeader>

        {/* ── Dialog Body: Gallery vs Customize ── */}
        {view === 'gallery' ? (
          /* View 1: Spacious Gallery */
          <div className="flex-1 min-h-0 overflow-hidden">
            <StickerCatalog
              selectedCategory={selectedCategory}
              selectedShape={selectedShape}
              selectedTemplateId={selectedTemplate.id}
              onSelectTemplate={handleSelectTemplate}
              onSelectCategory={handleChangeCategory}
              onSelectShape={setSelectedShape}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        ) : (
          /* View 2: Focused 2-Column Customizer */
          <div className="flex flex-row flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
            {/* Right Side (RTL Start): Live Vector Preview */}
            <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden border-e border-border/40">
              <StickerPreview
                template={selectedTemplate}
                params={params}
                svgString={svgString}
                onChangeField={handleChangeField}
                onChangeColor={handleChangeColor}
                onResetField={handleResetField}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
              />
            </div>

            {/* Left Side (RTL End): Streamlined Inspector */}
            <div className="w-[330px] xl:w-[350px] shrink-0 h-full flex flex-col overflow-hidden">
              <StickerProperties
                template={selectedTemplate}
                params={params}
                onChangeParams={setParams}
                onCommitParams={commitParams}
                gridConfig={gridConfig}
                onChangeGridConfig={setGridConfig}
                hiddenFieldIds={hiddenFieldIds}
                sheetMm={sheetMm}
              />
            </div>
          </div>
        )}

        {/* ── Footer: Action Bar (Adapts to Active Stage) ── */}
        <DialogFooter className="px-5 py-2.5 border-t border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          {view === 'gallery' ? (
            /* Gallery Footer */
            <div className="flex items-center gap-2 shrink-0 ms-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 px-3.5 text-xs font-semibold rounded-md cursor-pointer"
              >
                إلغاء
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setView('customize')}
                className="h-8 px-4 rounded-md text-xs font-bold gap-1.5 shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <span>تخصيص</span>
                <Sparkle className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </div>
          ) : (
            /* Customize Footer */
            <>
              {/* Auxiliary Tools & Export */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Export Dropdown */}
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isInserting || isGeneratingSheet || busyExport}
                      className="h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-md hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground shrink-0 border-border/60"
                    >
                      {busyExport ? (
                        <Spinner className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <DownloadSimple className="w-3.5 h-3.5" />
                      )}
                      <span>{busyExport ? 'جاري التصدير ...' : 'تصدير'}</span>
                      {!busyExport && <CaretDown className="w-3 h-3 text-muted-foreground" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 text-xs font-cairo">
                    <DropdownMenuItem
                      onClick={() => void handleDownloadPng(300)}
                      className="cursor-pointer gap-2"
                    >
                      <FilePng className="w-4 h-4 text-primary" weight="duotone" />
                      <span>صورة PNG (300 DPI)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void handleDownloadPng(600)}
                      className="cursor-pointer gap-2"
                    >
                      <FilePng className="w-4 h-4 text-violet-500" weight="duotone" />
                      <span>صورة PNG فائقة (600 DPI للمطابع)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadSvg} className="cursor-pointer gap-2">
                      <FileSvg className="w-4 h-4 text-emerald-500" weight="duotone" />
                      <span>ملف SVG متجه</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDownloadCutContour}
                      className="cursor-pointer gap-2"
                    >
                      <Scissors className="w-4 h-4 text-pink-500" weight="duotone" />
                      <span>SVG مع خط القص (CutContour)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDownloadPureCutContour}
                      className="cursor-pointer gap-2"
                    >
                      <Scissors className="w-4 h-4 text-fuchsia-500" weight="duotone" />
                      <span>خط القص فقط للمقصات (Plotter)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyImage} className="cursor-pointer gap-2">
                      <Copy className="w-4 h-4 text-amber-500" weight="duotone" />
                      <span>نسخ صورة</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopySvgCode} className="cursor-pointer gap-2">
                      <Code className="w-4 h-4 text-indigo-500" weight="duotone" />
                      <span>نسخ SVG</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* VDP: طباعة بالبيانات المتغيرة — Excel/CSV ← بطاقات دفعية */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVdpOpen(true)}
                  disabled={isInserting || isGeneratingSheet || busyExport}
                  className="h-8 px-2.5 rounded-md text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted cursor-pointer shrink-0"
                  title="توليد بطاقات من ملف Excel/CSV"
                >
                  <TableIcon className="w-3.5 h-3.5 text-primary" weight="duotone" />
                  <span>من جدول</span>
                </Button>

                {/* Sheet Insert Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleInsertSheet}
                  disabled={isInserting || isGeneratingSheet || busyExport}
                  className="h-8 px-2.5 rounded-md text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted cursor-pointer shrink-0"
                  title={`إدراج شيت (${gridConfig.rows}×${gridConfig.cols})`}
                >
                  {isGeneratingSheet ? (
                    <>
                      <Spinner className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري التوليد ...</span>
                    </>
                  ) : (
                    <>
                      <GridFour className="w-3.5 h-3.5 text-primary" weight="bold" />
                      <span>شيت ({gridConfig.rows * gridConfig.cols})</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Actions: Cancel & Hero Insert */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isInserting || isGeneratingSheet || busyExport}
                  className="h-8 px-3.5 text-xs font-semibold rounded-md cursor-pointer"
                >
                  إلغاء
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleInsertSingle}
                  disabled={isInserting || isGeneratingSheet || busyExport}
                  className="h-8 px-5 rounded-md text-xs font-bold gap-1.5 shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-w-[90px]"
                >
                  {isInserting ? (
                    <>
                      <Spinner className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الإدراج ...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" weight="bold" />
                      <span>إدراج</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>

        {/* حوار الطباعة بالبيانات المتغيرة */}
        <VdpImportDialog
          open={isVdpOpen}
          onOpenChange={setIsVdpOpen}
          template={selectedTemplate}
          baseParams={params}
        />
      </DialogContent>
    </Dialog>
  );
});

StickerStudioDialog.displayName = 'StickerStudioDialog';
