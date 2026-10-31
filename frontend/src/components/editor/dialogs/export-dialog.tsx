import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { FluentSettingRow, FluentSliderField } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogCloseButton,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/huge-icon';
import { Warning } from '@/components/ui/icons';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { previewWhite } from '@/lib/canvas/canvas-colors';
import { useStageRef } from '@/lib/canvas/stage-context';
import { pxToMm } from '@/lib/canvas/units';
import { useEditorStore } from '@/lib/editor-store';
import {
  exportCanvas,
  downloadBlob,
  exportSlotCanvas,
  applyBleedAndCropMarks,
  runCmykExport,
  CanvasTooLargeError,
} from '@/lib/export';
import { classifySaveResult } from '@/lib/io/save-result';
import { createLogger } from '@/lib/logger';
import { triggerMemoryTrim } from '@/lib/memory-trim';
import { toErrorMessage } from '@/lib/wails-error';

import {
  SelectExportDirectory,
  SetTaskbarProgress,
  SendNotification,
  OpenFolder,
} from '../../../../wailsjs/go/main/App';

import type { CmykFormat } from '@/lib/export';

const logger = createLogger('export-dialog');

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** خيار راديو بصري موحّد (فضاء الألوان/الصيغة) — نفس مظهر خيارات الصيغة الأصلي. */
function FormatOptionButton({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex items-center gap-2 p-2 rounded-md border transition-colors cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none ${
        selected
          ? 'border-primary bg-primary/10 font-bold text-primary ring-1 ring-primary/20'
          : 'border-border hover:border-primary/50 bg-input hover:bg-muted/30 text-foreground'
      }`}
    >
      <div className="w-4 h-4 rounded-full border border-primary flex items-center justify-center shrink-0">
        {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
      </div>
      <div className="text-start min-w-0">
        <div className="font-bold text-xs">{title}</div>
        <div className="text-micro text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  );
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const isCancelledRef = useRef(false);
  // 🛡️ رمز الجولة: بدء تصدير جديد يُبطل الجولة القديمة (يمنع تصديرين
  // متزامنين بعد السماح بالإغلاق أثناء التحميل — Bug#9 سابقاً بالمنع الكلي).
  const runTokenRef = useRef(0);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  // 🎨 فضاء الألوان: RGB (افتراضي، تصدير عميل) أو CMYK (تحويل في الخلفية إلى TIFF/JPEG)
  const [colorSpace, setColorSpace] = useState<'rgb' | 'cmyk'>('rgb');
  const [cmykFormat, setCmykFormat] = useState<CmykFormat>('tiff');
  const [quality, setQuality] = useState(95);
  const [loading, setLoading] = useState(false);
  const [batchExport, setBatchExport] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bleedMM, setBleedMM] = useState(0);
  const [showCropMarks, setShowCropMarks] = useState(false);
  const stageRef = useStageRef();
  const {
    template,
    canvasWidth,
    canvasHeight,
    mode,
    elements,
    printSettings,
    slots,
    collageTemplate,
    collageMargin,
    collageGap,
    showBleedGuides,
    bleedMarginMM,
    backgroundColor,
  } = useEditorStore(
    useShallow((state) => ({
      template: state.template,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      mode: state.mode,
      elements: state.elements,
      printSettings: state.printSettings,
      slots: state.slots,
      collageTemplate: state.collageTemplate,
      collageMargin: state.collageMargin,
      collageGap: state.collageGap,
      showBleedGuides: state.showBleedGuides,
      bleedMarginMM: state.bleedMarginMM,
      backgroundColor: state.backgroundColor,
    })),
  );

  // ✂️ علامات القص لا تُرسم إلا داخل منطقة النزيف (applyBleedAndCropMarks):
  // بلا نزيف لا شيء يُرسم، فالمفتاح يُعطَّل مع تلميح بدل لا-فعل صامت.
  const cropMarksEnabled = bleedMM > 0;

  // تصفير مؤشرات التحميل ومزامنة هوامش النزيف للمطابع (Fluent 2 Wait UX Invariant)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false);
    setProgress(0);
    SetTaskbarProgress(0, 'none').catch(() => {});
    if (!open) {
      isCancelledRef.current = true;
    } else {
      isCancelledRef.current = false;
      if (showBleedGuides && bleedMarginMM > 0) {
        setBleedMM(bleedMarginMM);
        setShowCropMarks(true);
      }
    }
  }, [open, showBleedGuides, bleedMarginMM]);

  const handleExport = async () => {
    setLoading(true);
    setProgress(0);
    isCancelledRef.current = false;
    runTokenRef.current += 1;
    const myRun = runTokenRef.current;
    // توقف عند إغلاق المستخدم أو عند بدء جولة أحدث
    const shouldStop = () => isCancelledRef.current || runTokenRef.current !== myRun;
    SetTaskbarProgress(0, 'normal').catch(() => {});
    setTimeout(async () => {
      try {
        // 🖨️ كثافة الحفظ: نفس القيمة المعروضة في «الدقة» أعلى الحوار (قالب →
        // إعدادات طباعة → 300). تُرسل لمسار الحفظ ليحقنها في بايتات PNG/JPEG
        // لكل ملف (المفرد والمُجلَّد) — TIFF/CMYK لا يحمل بيانات كثافة.
        const exportDpi = template?.dpi || printSettings.dpi || 300;
        // All branches must validate sources before rendering or opening a save dialog.
        if (mode === 'collage') {
          const {
            loadCollageSlotImages,
            runCollagePreflight,
            getLoadedImageDimensions,
            getCollageExportSlotRectsMM,
          } = await import('@/lib/export/collage-preflight-helpers');
          const loadResult = await loadCollageSlotImages(slots);
          if (shouldStop()) return;
          const preflight = runCollagePreflight({
            slots,
            slotRectsMM: getCollageExportSlotRectsMM(
              { slots, canvasWidth, canvasHeight, collageTemplate, collageMargin, collageGap },
              exportDpi,
              colorSpace === 'rgb' && batchExport,
            ),
            imageDimensions: getLoadedImageDimensions(slots, loadResult.loaded),
            failedSlotIds: loadResult.failedSlotIds,
          });
          if (preflight.blocking.length > 0) {
            toast.error(`تعذر التصدير: ${preflight.blocking[0].message}`);
            return;
          }
          if (preflight.warnings.length > 0) {
            toast.warning(
              preflight.warnings.length === 1
                ? preflight.warnings[0].message
                : `${preflight.warnings.length} تنبيهات جودة — سيتم التصدير`,
            );
          }
        } else {
          // 🔍 فحص عناصر الصور الحرة (الملصقات/الأختام) — كانت تُصدَّر بلا أي
          // حراسة: التكبير فوق قدرة المصدر كان يخفض الدقة الفعالة بصمت.
          const { resolveFreeformImageDimensions, runFreeformPreflight } =
            await import('@/lib/export/freeform-preflight');
          const dims = await resolveFreeformImageDimensions(elements);
          if (shouldStop()) return;
          const preflight = runFreeformPreflight({
            elements,
            canvasWidthMM: pxToMm(canvasWidth, exportDpi),
            canvasHeightMM: pxToMm(canvasHeight, exportDpi),
            canvasWidthPx: canvasWidth,
            canvasHeightPx: canvasHeight,
            imageDimensions: dims,
          });
          if (preflight.blocking.length > 0) {
            toast.error(`تعذر التصدير: ${preflight.blocking[0].message}`);
            return;
          }
          if (preflight.warnings.length > 0) {
            toast.warning(
              preflight.warnings.length === 1
                ? preflight.warnings[0].message
                : `${preflight.warnings.length} تنبيهات جودة — سيتم التصدير`,
            );
          }
        }
        // 🎨 مسار CMYK: يُنفَّذ في الخلفية (Go) عبر ExportPrintSheet — لا يدعم
        // تصدير الخلايا المنفصلة، لذا يسبق فرع الدفعات ويُخرج التصميم كملف واحد.
        if (colorSpace === 'cmyk') {
          const dpi = exportDpi;
          // Match the actual RGB capture and preflight, not nominal template millimeters.
          const widthMM = pxToMm(canvasWidth, dpi);
          const heightMM = pxToMm(canvasHeight, dpi);

          setProgress(50);
          SetTaskbarProgress(50, 'normal').catch(() => {});

          const { blob: cmykBlob, sourceFilename } = await runCmykExport({
            stage: stageRef.current,
            format: cmykFormat,
            dpi,
            paperWidthMM: widthMM,
            paperHeightMM: heightMM,
            // مسار الطباعة يرسم فوق خلفية صلبة — الشفافية تُسطَّح إلى بياض المعاينة
            backgroundColor: backgroundColor === 'transparent' ? previewWhite() : backgroundColor,
            skipBlobFetch: true,
          });

          if (shouldStop()) {
            SetTaskbarProgress(0, 'none').catch(() => {});
            return;
          }

          const ext = cmykFormat === 'tiff' ? 'tif' : 'jpg';
          const dateStr = new Date().toISOString().slice(0, 10);
          const name = template
            ? `Grido_${(template.name || 'Template').replace(/\s+/g, '_')}_${template.widthMM}x${template.heightMM}mm_${dateStr}_CMYK.${ext}`
            : `Grido_${mode === 'collage' ? 'Collage' : 'Design'}_${dateStr}_${Date.now().toString().slice(-4)}_CMYK.${ext}`;

          const res = await downloadBlob(cmykBlob, name, undefined, undefined, sourceFilename);
          setProgress(100);
          SetTaskbarProgress(0, 'none').catch(() => {});
          // المستخدم أغلق أثناء حوار الحفظ — لا رسائل مضللة بعد الإغلاق
          if (shouldStop()) return;
          const outcome = classifySaveResult(res);
          if (outcome === 'success') {
            toast.success(`تم تصدير ${cmykFormat === 'tiff' ? 'TIFF' : 'JPEG'} بنظام CMYK`);
            SendNotification('Grido Studio', 'تم تصدير ملف CMYK وحفظه', '').catch(() => {});
            onOpenChange(false);
          } else if (outcome === 'cancel') {
            toast.info('تم إلغاء التصدير');
          } else {
            toast.error('فشل حفظ ملف CMYK');
          }
          return;
        }

        if (batchExport && mode === 'collage') {
          const validSlots = slots.filter((s) => s.imageSrc);
          if (validSlots.length === 0) {
            toast.error('لا توجد صور في الكولاج لتصديرها');
            setLoading(false);
            SetTaskbarProgress(0, 'none').catch(() => {});
            return;
          }

          // اختيار مجلد التصدير مرة واحدة لكافة الصور بدلاً من فتح نافذة لكل صورة
          const targetDir = await SelectExportDirectory();
          if (!targetDir) {
            setLoading(false);
            SetTaskbarProgress(0, 'none').catch(() => {});
            return;
          }

          let successCount = 0;
          for (let i = 0; i < validSlots.length; i++) {
            if (shouldStop()) break;
            const slot = validSlots[i];
            const blob = await exportSlotCanvas(slot.id, format, quality / 100);
            if (shouldStop()) break;
            if (blob) {
              const ext = format === 'png' ? 'png' : 'jpg';
              const name = `collage-photo-${i + 1}-${Date.now()}.${ext}`;
              const res = await downloadBlob(blob, name, targetDir, exportDpi);
              const outcome = classifySaveResult(res);
              if (outcome === 'success') {
                successCount++;
              } else if (outcome === 'cancel') {
                break;
              }
            }
            if (shouldStop()) break;
            const pct = Math.round(((i + 1) / validSlots.length) * 100);
            setProgress(pct);
            SetTaskbarProgress(pct, 'normal').catch(() => {});

            await new Promise((r) => setTimeout(r, 60));
          }

          if (shouldStop()) {
            SetTaskbarProgress(0, 'none').catch(() => {});
            return;
          }

          SetTaskbarProgress(0, 'none').catch(() => {});
          if (successCount > 0) {
            toast.success(`تم تصدير ${successCount} صورة`, {
              action: {
                label: 'فتح المجلد',
                onClick: () =>
                  OpenFolder(targetDir).catch((err) => logger.error('فتح مجلد التصدير فشل:', err)),
              },
            });
            SendNotification('Grido Studio', `تم تصدير ${successCount} صورة للمجلد`, '').catch(
              () => {},
            );
            onOpenChange(false);
          } else {
            toast.error('تعذر تصدير الصور');
          }
        } else {
          setProgress(50);
          SetTaskbarProgress(50, 'normal').catch(() => {});
          const blob = await exportCanvas(format, quality / 100, stageRef.current);
          // المستخدم أغلق النافذة أثناء التصدير — لا نُظهر حوار الحفظ ولا رسائل (إصلاح Bug#9)
          if (blob && !shouldStop()) {
            const finalBlob = await applyBleedAndCropMarks(
              blob,
              bleedMM,
              showCropMarks,
              format,
              quality / 100,
              exportDpi,
            );
            if (shouldStop()) {
              SetTaskbarProgress(0, 'none').catch(() => {});
              return;
            }
            const ext = format === 'png' ? 'png' : 'jpg';
            const dateStr = new Date().toISOString().slice(0, 10);
            const name = template
              ? `Grido_${(template.name || 'Template').replace(/\s+/g, '_')}_${template.widthMM}x${template.heightMM}mm_${dateStr}.${ext}`
              : mode === 'collage'
                ? `Grido_Collage_${dateStr}_${Date.now().toString().slice(-4)}.${ext}`
                : `Grido_Design_${dateStr}_${Date.now().toString().slice(-4)}.${ext}`;
            const res = await downloadBlob(finalBlob, name, undefined, exportDpi);
            setProgress(100);
            SetTaskbarProgress(0, 'none').catch(() => {});
            // المستخدم أغلق أثناء حوار الحفظ — خروج صامت بدل نجاح/فشل كاذب
            if (shouldStop()) return;
            const outcome = classifySaveResult(res);
            if (outcome === 'success') {
              toast.success('تم تصدير الصورة بنجاح');
              SendNotification('Grido Studio', 'تم تصدير الصورة وحفظها', '').catch(() => {});
              onOpenChange(false);
            } else if (outcome === 'cancel') {
              toast.info('تم إلغاء التصدير');
            } else {
              toast.error('فشل حفظ الصورة');
            }
          } else if (shouldStop()) {
            // إلغاء المستخدم — خروج صامت بدل خطأ مضلل
            SetTaskbarProgress(0, 'none').catch(() => {});
            return;
          } else {
            SetTaskbarProgress(0, 'none').catch(() => {});
            toast.error('تعذر إنشاء الصورة');
          }
        }
      } catch (e) {
        if (shouldStop()) {
          // فشل بعد إغلاق المستخدم — تنظيف صامت بلا رسائل
          SetTaskbarProgress(0, 'none').catch(() => {});
        } else {
          SetTaskbarProgress(100, 'error').catch(() => {});
          setTimeout(() => {
            SetTaskbarProgress(0, 'none').catch(() => {});
          }, 2500);
          if (e instanceof CanvasTooLargeError) {
            toast.error(
              `الأبعاد كبيرة جداً (${e.width}×${e.height} بكسل ≈ ${(e.pixelCount / 1e6).toFixed(1)} ميجابكسل) — الحد الأقصى 50 ميجابكسل. اخفض المقاس أو DPI.`,
            );
          } else {
            logger.error('Export failed:', e);
            toast.error(toErrorMessage(e, 'حدث خطأ أثناء التصدير'));
          }
        }
      } finally {
        setLoading(false);
        SetTaskbarProgress(0, 'none').catch(() => {});
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.pointerEvents = '';
        }
        triggerMemoryTrim();
      }
    }, 50);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // الإغلاق أثناء التصدير مسموح (X/Escape/خلفية/زر الإلغاء): يرفع راية
        // الإلغاء عبر التأثير أدناه فتتوقف الحلقة عند أقرب فحص بصمت، وأي بدء
        // جديد يُبطل الجولة القديمة عبر runToken (يمنع تصديرين متزامنين —
        // خليفة إصلاح Bug#9 الذي كان يمنع الإغلاق كلياً فيحبس المستخدم).
        if (!next && typeof document !== 'undefined' && document.body) {
          document.body.style.pointerEvents = '';
        }
        if (!next) {
          triggerMemoryTrim();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-md font-cairo rounded-md border border-border bg-card fluent-specular p-4 sm:p-5"
        dir="rtl"
      >
        <DialogHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold truncate">تصدير الصورة</DialogTitle>
              </div>
            </div>
            <DialogCloseButton />
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <Label
              id="export-colorspace-label"
              className="text-xs mb-2 block font-bold text-foreground/90"
            >
              فضاء الألوان
            </Label>
            <div
              role="radiogroup"
              aria-labelledby="export-colorspace-label"
              className="grid grid-cols-2 gap-2"
            >
              <FormatOptionButton
                selected={colorSpace === 'rgb'}
                title="RGB"
                subtitle="شاشة وطباعة رقمية"
                onClick={() => setColorSpace('rgb')}
              />
              <FormatOptionButton
                selected={colorSpace === 'cmyk'}
                title="CMYK"
                subtitle="مطابع الأوفست"
                onClick={() => setColorSpace('cmyk')}
              />
            </div>
          </div>

          <div>
            <Label
              id="export-format-label"
              className="text-xs mb-2 block font-bold text-foreground/90"
            >
              صيغة الملف
            </Label>
            <div
              role="radiogroup"
              aria-labelledby="export-format-label"
              className="grid grid-cols-2 gap-2"
            >
              {colorSpace === 'rgb' ? (
                <>
                  <FormatOptionButton
                    selected={format === 'png'}
                    title="PNG"
                    subtitle="جودة فائقة وشفافية"
                    onClick={() => setFormat('png')}
                  />
                  <FormatOptionButton
                    selected={format === 'jpg'}
                    title="JPG"
                    subtitle="حجم أصغر"
                    onClick={() => setFormat('jpg')}
                  />
                </>
              ) : (
                <>
                  <FormatOptionButton
                    selected={cmykFormat === 'tiff'}
                    title="TIFF"
                    subtitle="فصل أحبار حقيقي — بلا فقد"
                    onClick={() => setCmykFormat('tiff')}
                  />
                  <FormatOptionButton
                    selected={cmykFormat === 'jpeg'}
                    title="JPEG"
                    subtitle="RGB مضغوط — بلا فصل أحبار"
                    onClick={() => setCmykFormat('jpeg')}
                  />
                </>
              )}
            </div>
          </div>

          {colorSpace === 'cmyk' && (
            <div className="rounded-md border border-border/80 bg-primary/5 p-3 text-xs space-y-1.5 fluent-specular">
              <div className="font-bold text-foreground/90">تحويل CMYK في الخلفية</div>
              <p className="text-micro text-muted-foreground leading-relaxed">
                يُلتقط التصميم كاملاً (بنفس دقة التصدير) ثم يحوّله محرك الطباعة إلى CMYK ويُنتج ملف{' '}
                {cmykFormat === 'tiff' ? 'TIFF' : 'JPEG'} يغطّي حدود التصميم بالضبط (بلا نزيف أو
                علامات قص). TIFF هو الحامل الحقيقي لفصل أحبار CMYK، أما JPEG فيُسلَّم بفضاء RGB لأن
                مُرمِّز النظام لا يدعم CMYK.
              </p>
            </div>
          )}

          {(colorSpace === 'rgb' ? format === 'jpg' : cmykFormat === 'jpeg') && (
            <div className="bg-card p-3 rounded-md border border-border/80 space-y-2 fluent-specular">
              <FluentSliderField
                label="جودة الصورة"
                value={quality}
                min={50}
                max={100}
                step={5}
                unit="%"
                onChange={setQuality}
              />
            </div>
          )}

          <div className="rounded-md border border-border/80 bg-muted/30 p-3 text-xs space-y-1.5 fluent-specular">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">الأبعاد:</span>
              <span className="font-mono font-bold">
                {canvasWidth}×{canvasHeight}px
              </span>
            </div>
            {template ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">الحجم الفعلي:</span>
                  <span className="font-bold">
                    {template.widthMM}×{template.heightMM} مم
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">الدقة:</span>
                  <span className="font-mono">{template.dpi} DPI</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">الحجم الفعلي:</span>
                  <span className="font-bold">
                    {Math.round(pxToMm(canvasWidth, printSettings.dpi))}×
                    {Math.round(pxToMm(canvasHeight, printSettings.dpi))} مم
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">الدقة:</span>
                  <span className="font-mono">{printSettings.dpi} DPI</span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-1.5 border-t border-border/50 mt-1">
              <span className="text-muted-foreground font-semibold">الحجم التقريبي:</span>
              <span className="font-mono text-primary font-bold">
                {colorSpace === 'cmyk'
                  ? cmykFormat === 'tiff'
                    ? (((canvasWidth * canvasHeight * 4) / 1024 / 1024) * 1.0).toFixed(1)
                    : (
                        ((canvasWidth * canvasHeight * 3) / 1024 / 1024) *
                        0.35 *
                        (quality / 100)
                      ).toFixed(1)
                  : format === 'png'
                    ? (((canvasWidth * canvasHeight * 4) / 1024 / 1024) * 0.6).toFixed(1)
                    : (
                        ((canvasWidth * canvasHeight * 3) / 1024 / 1024) *
                        0.35 *
                        (quality / 100)
                      ).toFixed(1)}{' '}
                MB
                <span className="text-micro text-muted-foreground font-normal"> (تقريبي)</span>
              </span>
            </div>
          </div>

          <div className="border-t border-border/40 pt-3 space-y-2.5">
            {(template?.dpi || printSettings.dpi || 300) < 150 && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-xs text-destructive flex items-start gap-2">
                <Warning className="shrink-0 mt-0.5 w-4 h-4" weight="duotone" />
                <span className="font-medium">
                  الدقة الحالية ({template?.dpi || printSettings.dpi} DPI) منخفضة. يُفضل 300 DPI
                  للطباعة.
                </span>
              </div>
            )}

            {colorSpace === 'cmyk' && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <Warning className="text-amber-500 shrink-0 mt-0.5 w-4 h-4" weight="duotone" />
                <span className="font-medium">
                  CMYK لمطابع الأوفست — قد يختلف التباين عن المعاينة.
                </span>
              </div>
            )}

            {colorSpace === 'rgb' && (
              <>
                <div className="p-3 border border-border/80 rounded-md bg-card hover:bg-muted/30 transition-colors fluent-specular">
                  <FluentSettingRow
                    label="علامات القص الإرشادية"
                    description={
                      cropMarksEnabled ? 'خطوط حول منطقة النزيف' : 'تتطلب هامش نزيف أولاً'
                    }
                    control={
                      <Switch
                        checked={showCropMarks && cropMarksEnabled}
                        onCheckedChange={setShowCropMarks}
                        disabled={!cropMarksEnabled}
                        aria-label="علامات القص الإرشادية"
                      />
                    }
                  />
                  {/* ✂️ علامات القص تُرسم داخل منطقة النزيف حصراً، فبلا نزيف لا
                      تُرسم شيئاً — المفتاح يُعطَّل مع سبب صريح بدل لا-فعل صامت. */}
                  {!cropMarksEnabled && (
                    <p className="text-micro text-amber-600 dark:text-amber-400 mt-1.5 font-semibold">
                      حدّد هامش النزيف أكبر من 0 مم — تُرسم العلامات داخل منطقة النزيف، فتظهر للقاصّ
                      حول حدود التصميم.
                    </p>
                  )}
                </div>

                <div className="p-3 border border-border/80 rounded-md bg-card space-y-2.5 fluent-specular">
                  <FluentSliderField
                    label="هامش النزيف والقص"
                    value={bleedMM}
                    min={0}
                    max={10}
                    step={1}
                    unit="mm"
                    onChange={setBleedMM}
                  />
                  <p className="text-micro text-muted-foreground">يمنع ظهور حواف بيضاء بعد القص.</p>
                </div>
              </>
            )}

            {mode === 'collage' && colorSpace === 'rgb' && (
              <div className="p-3 border border-border/80 rounded-md bg-card hover:bg-muted/30 transition-colors fluent-specular">
                <FluentSettingRow
                  label="تصدير الصور كملفات منفصلة"
                  description="حفظ كل صورة كملف مستقل"
                  control={
                    <Switch
                      checked={batchExport}
                      onCheckedChange={setBatchExport}
                      aria-label="تصدير الصور كملفات منفصلة"
                    />
                  }
                />
              </div>
            )}
          </div>
        </div>

        {loading && progress > 0 && (
          <div className="px-1 pb-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>جاري التصدير ...</span>
              <span className="font-mono font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 text-xs font-semibold rounded-md cursor-pointer"
          >
            {loading ? 'إيقاف التصدير' : 'إلغاء'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="h-8 px-5 text-xs font-semibold rounded-md gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            {loading ? (
              <>
                <Spinner className="w-3.5 h-3.5" size={14} />
                <span>جاري التصدير ...</span>
              </>
            ) : (
              <span>تصدير</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
