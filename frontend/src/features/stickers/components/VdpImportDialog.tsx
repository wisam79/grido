import React, { useState, useMemo, useCallback } from 'react';
import { UploadSimple, GridFour, Link, CaretRight, WarningCircle } from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogCloseButton,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/huge-icon';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/lib/editor-store';
import { StickerTemplate, StickerParams } from '../types';
import { parseVdpFile, VdpDataset, VDP_MAX_ROWS } from '../lib/vdp-parser';
import { renderVdpBatch } from '../lib/vdp-batch';

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

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoadingFile(true);
      try {
        const parsed = await parseVdpFile(file);
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
        toast.error(err instanceof Error ? err.message : 'فشل قراءة الملف');
      } finally {
        setIsLoadingFile(false);
      }
    },
    [template.fields],
  );

  const previewRow = dataset?.rows[0];
  const mappedFieldCount = useMemo(() => Object.values(mapping).filter(Boolean).length, [mapping]);

  const handleGenerate = useCallback(async () => {
    if (!dataset || mappedFieldCount === 0) return;
    setIsGenerating(true);
    setProgress({ done: 0, total: dataset.rows.length });
    try {
      const { pngUrls, failedRows } = await renderVdpBatch(
        template,
        baseParams,
        dataset.rows,
        mapping,
        setProgress,
      );
      if (pngUrls.length === 0) {
        toast.error('لم تُصيَّر أي بطاقة — تحقق من ربط الأعمدة');
        return;
      }
      useEditorStore.getState().addImageElementsBatch(
        pngUrls.map((src) => ({ src })),
        { layoutMode: 'grid' },
      );
      const warn = failedRows > 0 ? ` (${failedRows} صف فشل)` : '';
      toast.success(`أُدرجت ${pngUrls.length} بطاقة${warn}`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('فشل توليد البطاقات');
    } finally {
      setIsGenerating(false);
    }
  }, [dataset, mappedFieldCount, template, baseParams, mapping, onOpenChange]);

  // تصفير حالات التحميل عند تغيير حالة فتح النافذة وفق معايير المشروع
  React.useEffect(() => {
    if (!open) {
      setIsLoadingFile(false);
      setIsGenerating(false);
      setIsDragging(false);
      setProgress({ done: 0, total: 0 });
    }
  }, [open]);

  const closeAndReset = useCallback(() => {
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
        className="w-[94vw] sm:max-w-[560px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 rounded-2xl shadow-fluent-28 font-cairo fluent-specular gap-0"
        dir="rtl"
      >
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <GridFour className="w-4 h-4 text-primary" weight="duotone" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-foreground truncate">
                  طباعة بالبيانات المتغيرة
                </DialogTitle>
                <DialogDescription className="text-micro text-muted-foreground truncate">
                  Excel/CSV ← بطاقات على قالب «{template.name}»
                </DialogDescription>
              </div>
            </div>
            <DialogCloseButton />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-4">
          {/* 1. رفع الملف */}
          {!dataset ? (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all text-center px-4',
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
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card/60 border border-border/40">
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
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className="flex-1 h-8 text-xs rounded-md bg-background border border-border/50 px-2 text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30 space-y-1">
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
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
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
                  className="h-full bg-primary rounded-full transition-all duration-200"
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
              className="h-8 px-4 rounded-md text-xs font-bold gap-1.5 shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
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
