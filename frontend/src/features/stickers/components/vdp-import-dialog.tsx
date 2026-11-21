import React, { useState, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';

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
import { Spinner } from '@/components/ui/huge-icon';
import { UploadSimple, GridFour, Link, CaretRight, WarningCircle } from '@/components/ui/icons';
import { Label } from '@/components/ui/label';
import { computeSmartGridLayout } from '@/lib/canvas/grid-layout-math';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { createLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { toErrorMessage } from '@/lib/wails-error';

import { renderVdpBatch } from '../lib/vdp-batch';
import { applyRowToParams, parseVdpFile, VDP_MAX_ROWS } from '../lib/vdp-parser';

import type { VdpDataset } from '../lib/vdp-parser';
import type { StickerTemplate, StickerParams } from '../types';

const logger = createLogger('VdpImportDialog');

/**
 * سقف فتح المخزن المؤقت قبل الإدراج على الكانفس: كل 50 بطاقة (بإحداثيات
 * محسوبة مقدماً) تُسلَّم فوراً فلا تتراكم Data URLs في الذاكرة على الويب —
 * إدراج ذري لكل شوط لا يقرر تخطيط الشبكة من جديد فتبقى المواضع مطابقة
 * لتخطيط دفعة واحدة كاملة.
 */
const VDP_INSERT_CHUNK = 50;

interface VdpBufferedCard {
  src: string;
  aspectRatio: number;
  x: number;
  y: number;
  width: number;
  height: number;
  stickerSource?: {
    templateId: string;
    params: StickerParams;
  };
}

export interface VdpImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: StickerTemplate;
  baseParams: StickerParams;
}

/**
 * حوار الطباعة بالبيانات المتغيرة: ملف Excel/CSV ← ربط الأعمدة بحقول القالب
 * ← معاينة الصف الأول ← توليد كل البطاقات وإدراجها دفعة واحدة على الكانفس.
 */
export const VdpImportDialog = React.memo(function VdpImportDialog({
  open,
  onOpenChange,
  template,
  baseParams,
}: VdpImportDialogProps) {
  const [dataset, setDataset] = useState<VdpDataset | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  // fieldId → column name (الحقول غير المرتبطة تبقى على قيمتها الأساسية)
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // حارس الإلغاء: لا تُدرج عناصر ولا تُظهر رسالة بعد إغلاق النافذة أثناء التوليد
  const cancelledRef = useRef(!open);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(0);
  const fileAttemptRef = useRef(0);
  const generationRef = useRef(0);

  const handleFile = useCallback(
    async (file: File) => {
      if (!open || cancelledRef.current || abortRef.current) return;
      const session = sessionRef.current;
      const attempt = ++fileAttemptRef.current;
      const isCurrent = () =>
        !cancelledRef.current &&
        session === sessionRef.current &&
        attempt === fileAttemptRef.current;
      setIsLoadingFile(true);
      try {
        const parsed = await parseVdpFile(file);
        if (!isCurrent()) return;
        setDataset(parsed);
        // ربط ذكي مبدئي: اسم العمود مطابق لاسم الحقل أو تسميته
        const auto: Record<string, string> = {};
        for (const field of template.fields) {
          const match = parsed.columns.find(
            (c) => c === field.id || c === field.label || c.trim() === field.label.trim(),
          );
          if (match) auto[field.id] = match;
        }
        setMapping(auto);
        if (parsed.rows.length >= VDP_MAX_ROWS) {
          toast.info(`سُقف الصفوف ${VDP_MAX_ROWS} — قُصّت البقية`);
        }
      } catch (err) {
        if (isCurrent()) toast.error(toErrorMessage(err, 'فشل قراءة الملف'));
      } finally {
        if (isCurrent()) setIsLoadingFile(false);
      }
    },
    [open, template.fields],
  );

  const previewRow = dataset?.rows[0];
  const mappedFieldCount = useMemo(
    () => template.fields.filter((f) => Boolean(mapping[f.id])).length,
    [mapping, template.fields],
  );

  const handleGenerate = useCallback(async () => {
    if (!open || cancelledRef.current || abortRef.current || !dataset || mappedFieldCount === 0)
      return;
    const generation = ++generationRef.current;
    const session = sessionRef.current;
    const documentSession = getDocumentSession();
    setIsGenerating(true);
    setProgress({ done: 0, total: dataset.rows.length });
    const controller = new AbortController();
    abortRef.current = controller;
    const ownsGeneration = () =>
      generation === generationRef.current &&
      session === sessionRef.current &&
      !cancelledRef.current;
    const isActive = () => {
      const live = useEditorStore.getState();
      const active =
        ownsGeneration() &&
        !controller.signal.aborted &&
        documentSession === getDocumentSession() &&
        live.mode === storeState.mode &&
        live.canvasWidth === storeState.canvasWidth &&
        live.canvasHeight === storeState.canvasHeight;
      if (!active) controller.abort();
      return active;
    };

    // تخطيط الشبكة يُحسب مرة واحدة لكل الصفوف (نفس محرك addImageElementsBatch
    // وبنفس قيم الافتراض) — البطاقات الناجحة تنتقي مواضعها تسلسلياً فتبقى
    // الشبكة متماسكة بلا فراغات وإن فشلت صفوف.
    if (useEditorStore.getState().mode !== 'single') useEditorStore.getState().setMode('single');
    const storeState = useEditorStore.getState();
    const placedCells = computeSmartGridLayout(
      dataset.rows.map(() => ({ src: '', aspectRatio: template.aspectRatio || 1 })),
      {
        canvasWidth: storeState.canvasWidth || 2480,
        canvasHeight: storeState.canvasHeight || 3508,
        layoutMode: 'grid',
      },
    );

    const buffer: VdpBufferedCard[] = [];
    let placedCursor = 0;
    let insertedCount = 0;
    const flushBuffer = () => {
      if (!isActive() || buffer.length === 0) return;
      useEditorStore.getState().addImageElementsBatch(buffer.splice(0, buffer.length));
    };

    try {
      const { failedRows, aborted } = await renderVdpBatch(
        template,
        baseParams,
        dataset.rows,
        mapping,
        (next) => {
          if (isActive()) setProgress(next);
        },
        {
          signal: controller.signal,
          onRendered: (src, rowIndex) => {
            if (!isActive()) return;
            const cell = placedCells[placedCursor++];
            if (!cell) return;
            buffer.push({
              src,
              aspectRatio: template.aspectRatio || 1,
              x: cell.x,
              y: cell.y,
              width: cell.width,
              height: cell.height,
              // ربط كل بطاقة بمعاملات صفها (بلا SVG — إعادة التوليد من القالب
              // أرخص من تخزين 500 متجه في ملف المشروع): يفعّل إعادة التحرير
              // وترقية الدقة التلقائية وقت الطباعة لمسار print-rerasterize
              stickerSource: {
                templateId: template.id,
                params: applyRowToParams(baseParams, mapping, dataset.rows[rowIndex]),
              },
            });
            insertedCount++;
            if (buffer.length >= VDP_INSERT_CHUNK) flushBuffer();
          },
        },
      );
      // بعد الإلغاء تبقى ما أُدرج فعلاً، وذيل المخزن يُلغى بلا إدراج —
      // التصيير المتوقف نصفه لن يُرمى عمله المكتمل معه.
      if (aborted || !isActive()) return;
      flushBuffer();
      if (insertedCount === 0) {
        toast.error('لم تُصيَّر أي بطاقة — تحقق من ربط الأعمدة');
        return;
      }
      const warn = failedRows > 0 ? ` (${failedRows} صف فشل)` : '';
      toast.success(`أُدرجت ${insertedCount} بطاقة${warn}`);
      onOpenChange(false);
    } catch (err) {
      if (!isActive()) return;
      logger.error('VDP batch generation failed:', err);
      toast.error(toErrorMessage(err, 'فشل توليد البطاقات'));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (ownsGeneration()) setIsGenerating(false);
    }
  }, [open, dataset, mappedFieldCount, template, baseParams, mapping, onOpenChange]);

  // تصفير حالات التحميل عند تغيير حالة فتح النافذة وفق معايير المشروع
  React.useEffect(() => {
    sessionRef.current += 1;
    fileAttemptRef.current += 1;
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoadingFile(false);
    setIsGenerating(false);
    if (!open) {
      cancelledRef.current = true;
      setIsLoadingFile(false);
      setIsGenerating(false);
      setIsDragging(false);
      setProgress({ done: 0, total: 0 });
      setDataset(null);
      setMapping({});
    } else {
      cancelledRef.current = false;
    }
  }, [open, template.id]);

  // إلغاء أي دفعة جارية عند إغلاق المكوّن أو إزالته
  React.useEffect(() => {
    return () => {
      cancelledRef.current = true;
      sessionRef.current += 1;
      fileAttemptRef.current += 1;
      generationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const closeAndReset = useCallback(() => {
    cancelledRef.current = true;
    sessionRef.current += 1;
    fileAttemptRef.current += 1;
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setDataset(null);
    setMapping({});
    setIsLoadingFile(false);
    setIsGenerating(false);
    setIsDragging(false);
    setProgress({ done: 0, total: 0 });
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : closeAndReset())}>
      <DialogContent
        showCloseButton={false}
        className="w-[94vw] sm:max-w-[560px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border border-border/80 dark:border-white/10 rounded-xl shadow-fluent-16 font-cairo fluent-specular gap-0"
        dir="rtl"
      >
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-foreground truncate">
                  طباعة بالبيانات المتغيرة
                </DialogTitle>
                <DialogDescription className="text-micro text-muted-foreground truncate">
                  Excel/CSV ← بطاقات على قالب «{template.name}»
                </DialogDescription>
              </div>
            </div>
            <DialogCloseButton disabled={isGenerating} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-4">
          {/* 1. رفع الملف */}
          {!dataset ? (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 h-40 rounded-md border-2 border-dashed cursor-pointer transition-colors text-center px-4',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border/60 hover:border-primary/50 hover:bg-muted/20',
              )}
            >
              {isLoadingFile ? (
                <Spinner className="w-6 h-6 text-primary animate-spin" />
              ) : (
                <UploadSimple className="w-7 h-7 text-muted-foreground" weight="duotone" />
              )}
              <span className="text-xs font-bold text-foreground">
                {isLoadingFile
                  ? 'جاري قراءة الملف ...'
                  : 'اسحب ملف Excel أو CSV هنا أو انقر للاختيار'}
              </span>
              <span className="text-micro text-muted-foreground">
                الصف الأول عناوين الأعمدة • حتى {VDP_MAX_ROWS} بطاقة
              </span>
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
            </label>
          ) : (
            <>
              {/* ملف محمَّل: ملخص */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-card/60 border border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                  <GridFour className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                  <div className="min-w-0">
                    <p
                      className="text-xs font-bold text-foreground truncate"
                      title={dataset.fileName}
                    >
                      {dataset.fileName}
                    </p>
                    <p className="text-micro text-muted-foreground font-mono">
                      {dataset.rows.length} صف • {dataset.columns.length} عمود
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isGenerating}
                  onClick={() => {
                    setDataset(null);
                    setMapping({});
                  }}
                  className="h-7 px-2 text-micro font-semibold rounded-md cursor-pointer shrink-0"
                >
                  تغيير الملف
                </Button>
              </div>

              {/* 2. ربط الأعمدة بالحقول */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Link className="w-3.5 h-3.5 text-primary" weight="bold" />
                  <span>ربط الأعمدة بالحقول</span>
                  <span className="text-micro font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {mappedFieldCount}/{template.fields.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {template.fields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Label
                        className="text-mini font-semibold text-foreground/85 w-28 shrink-0 truncate"
                        title={field.label}
                      >
                        {field.label}
                      </Label>
                      <select
                        value={mapping[field.id] ?? ''}
                        disabled={isGenerating}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className="flex-1 h-8 text-xs rounded-md bg-background border border-border/50 px-2 text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`عمود حقل ${field.label}`}
                      >
                        <option value="">— بدون ربط (يبقى الافتراضي) —</option>
                        {dataset.columns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. معاينة الصف الأول */}
              {previewRow && mappedFieldCount > 0 && (
                <div className="p-2.5 rounded-md bg-muted/20 border border-border/30 space-y-1">
                  <p className="text-micro font-bold text-muted-foreground">معاينة الصف الأول</p>
                  {template.fields
                    .filter((f) => mapping[f.id])
                    .map((f) => (
                      <div key={f.id} className="flex items-center gap-2 text-mini">
                        <span className="text-muted-foreground w-24 shrink-0 truncate">
                          {f.label}:
                        </span>
                        <span className="font-bold text-foreground truncate">
                          {previewRow[mapping[f.id]] || '—'}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {mappedFieldCount === 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30">
                  <WarningCircle className="w-4 h-4 text-amber-500 shrink-0" weight="duotone" />
                  <p className="text-mini font-semibold text-foreground/90">
                    اربط عموداً واحداً على الأقل لتوليد البطاقات
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-5 py-2.5 border-t border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          {isGenerating && dataset ? (
            <div className="flex-1 space-y-1">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-[width] duration-200"
                  style={{
                    width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="text-micro text-muted-foreground font-mono">
                جاري التوليد ({progress.done}/{progress.total}) ...
              </p>
            </div>
          ) : (
            <span className="text-micro text-muted-foreground">
              يُدرج على الكانفس شبكة جاهزة للطباعة
            </span>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeAndReset}
              disabled={isGenerating}
              className="h-8 px-3.5 text-xs font-semibold rounded-md cursor-pointer"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={!dataset || mappedFieldCount === 0 || isGenerating}
              className="h-8 px-4 rounded-md text-xs font-bold gap-1.5 shadow-xs cursor-pointer bg-primary-action text-primary-foreground hover:bg-primary-action-hover transition-colors"
            >
              {isGenerating ? (
                <>
                  <Spinner className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التوليد ...</span>
                </>
              ) : (
                <>
                  <CaretRight className="w-3.5 h-3.5" weight="bold" />
                  <span>توليد {dataset ? `(${dataset.rows.length})` : ''}</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

VdpImportDialog.displayName = 'VdpImportDialog';
