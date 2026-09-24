import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogCloseButton,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/huge-icon";
import {
  Scan,
  Sparkle,
  ArrowClockwise,
  Check,
  Eye,
  ArrowCounterClockwise,
  FileText,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { WAIT_COPY, Z_CLASS } from "@/lib/ui/ui-compliance";
import {
  Point,
  DocumentAspectType,
  ScannerFilterMode,
  defaultInsetCorners,
} from "./core";
import { toast } from "sonner";
import { ScannerSidebar } from "./components/scanner-sidebar";
import { useScannerDetection } from "./hooks/use-scanner-detection";
import { useScannerCanvasRender } from "./hooks/use-scanner-canvas-render";
import { useScannerProcessor } from "./hooks/use-scanner-processor";

interface DocumentScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onSave: (processedBase64: string | string[]) => void;
}

export function DocumentScannerDialog({
  open,
  onOpenChange,
  imageSrc,
  onSave,
}: DocumentScannerDialogProps) {
  const [corners, setCorners] = useState<Point[]>([]);
  const [aspect, setAspect] = useState<DocumentAspectType>("free");
  const [filter, setFilter] = useState<ScannerFilterMode>("original");
  const [rotation, setRotation] = useState<number>(0);

  // 🧭 عقل الكشف والمستندات (كان مضمّناً هنا)
  const detection = useScannerDetection(open, imageSrc);
  const {
    detectedDocs,
    setDetectedDocs,
    selectedDocIds,
    detectionMode,
    setDetectionMode,
    isDetecting,
    imgSize,
    imgRef,
    setDetectionCallbacks,
    toggleDocSelection,
    selectAllDocs,
    handleAddManualDocument,
    handleDeleteDocument,
    handleSplitIdCards,
    handleAutoDetect,
  } = detection;

  // 🧭 معالجة الاستعدال والتصدير (كانت مضمّنة هنا)
  const processor = useScannerProcessor(imgRef, filter, rotation, open);
  const { isPreviewMode, resetProcessorState, resetPreview: resetProcessorPreview } = processor;

  const resetPreview = useCallback(() => {
    resetProcessorPreview();
  }, [resetProcessorPreview]);

  const selectDocument = useCallback(
    (index: number) => {
      detection.selectDocument(
        index,
        setCorners,
        setAspect,
        setRotation,
        resetPreview
      );
    },
    [detection, resetPreview]
  );

  // هوية مستقرة لـ selectDocument عبر ref — كائن detection يتجدد كل render
  // وكان يُعيد إنشاء handlePointerDown في هوك الكانفاس مع كل حركة دبوس.
  const selectDocumentRef = useRef(selectDocument);
  useEffect(() => {
    selectDocumentRef.current = selectDocument;
  }, [selectDocument]);
  const stableSelectDocument = useCallback((index: number) => {
    selectDocumentRef.current(index);
  }, []);

  // 🔒 مزامنة الأركان مع المستند النشط في مصفوفة المستندات فورياً عند سحب الدبابيس بالماوس أو اللمس
  const handleCornersChange = useCallback(
    (nextCorners: Point[]) => {
      setCorners(nextCorners);
      setDetectedDocs((prev) =>
        prev.map((doc, idx) =>
          idx === detection.activeDocIndex
            ? { ...doc, corners: nextCorners, aspectType: "free" }
            : doc
        )
      );
    },
    [detection.activeDocIndex, setDetectedDocs]
  );

  const handleAspectChange = useCallback(
    (newAspect: DocumentAspectType) => {
      setAspect(newAspect);
      setDetectedDocs((prev) =>
        prev.map((doc, idx) => (idx === detection.activeDocIndex ? { ...doc, aspectType: newAspect } : doc))
      );
      resetProcessorPreview();
    },
    // resetProcessorPreview مستقر (useCallback []) — لا يُعيد إنشاء onAspectChange
    // كل render كما كان يفعل الاعتماد على كائن processor كله.
    [detection.activeDocIndex, setDetectedDocs, resetProcessorPreview]
  );

  // 🧭 الرسم الكانفاسي والتفاعل (كان مضمّناً هنا)
  const canvasApi = useScannerCanvasRender(
    open,
    isPreviewMode,
    corners,
    detectedDocs,
    detection.activeDocIndex,
    imgRef,
    imgSize,
    handleCornersChange,
    handleAspectChange,
    stableSelectDocument
  );
  const {
    containerRef,
    canvasRef,
    loupeCanvasRef,
    activeCorner,
    loupePos,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = canvasApi;

  // ربط callbacks الكشف لتحديث أركان/نوع المستند النشط هنا
  useEffect(() => {
    setDetectionCallbacks({
      onCorners: setCorners,
      onAspect: setAspect,
    });
  }, [setDetectionCallbacks]);

  // مراجع حية للحالة سريعة التغير — معالج الكيبورد يبقى مربوطاً مرة واحدة
  // بدل إعادة ربط window keydown مع كل حركة دبوس (عشرات/ثانية).
  const cornersRef = useRef(corners);
  const activeDocIndexRef = useRef(detection.activeDocIndex);
  const docsLengthRef = useRef(detectedDocs.length);
  useEffect(() => {
    cornersRef.current = corners;
    activeDocIndexRef.current = detection.activeDocIndex;
    docsLengthRef.current = detectedDocs.length;
  });

  // 🔒 تحكم الأسهم الدقيق بالدبابيس واختصارات التبديل بين المستندات
  useEffect(() => {
    if (!open || isPreviewMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // التبديل السريع بين المستندات بالأرقام (1-9)
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= docsLengthRef.current) {
          stableSelectDocument(num - 1);
          return;
        }
      }

      if (activeCorner === null || cornersRef.current.length !== 4) return;
      const baseStep = e.shiftKey ? 10 : 2;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const displayScale = canvasRect && canvasRect.width > 0 ? canvasRect.width / Math.max(1, imgSize.w) : 1;
      const step = Math.max(1, Math.round(baseStep / Math.max(0.05, displayScale)));

      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;

      e.preventDefault();
      setCorners((prev) => {
        const next = [...prev];
        const cur = next[activeCorner];
        next[activeCorner] = {
          x: Math.max(0, Math.min(imgSize.w, cur.x + dx)),
          y: Math.max(0, Math.min(imgSize.h, cur.y + dy)),
        };
        return next;
      });
      setDetectedDocs((prev) =>
        prev.map((doc, idx) =>
          idx === activeDocIndexRef.current
            ? {
                ...doc,
                aspectType: "free",
                corners: doc.corners.map((pt, cIdx) =>
                  cIdx === activeCorner
                    ? {
                        x: Math.max(0, Math.min(imgSize.w, pt.x + dx)),
                        y: Math.max(0, Math.min(imgSize.h, pt.y + dy)),
                      }
                    : pt
                ),
              }
            : doc
        )
      );
      setAspect("free");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isPreviewMode, activeCorner, imgSize, stableSelectDocument, setDetectedDocs, canvasRef]);

  // 🔒 تنظيف حالة التدوير/الفلتر عند الإغلاق
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset modal state on close
      setRotation(0);
      setFilter("original");
      setAspect("free");
      setCorners([]);
      resetProcessorState();
    }
  }, [open, resetProcessorState]);

  const handleResetCorners = useCallback(() => {
    if (!imgSize.w || !imgSize.h) return;
    const resetPts = defaultInsetCorners(imgSize.w, imgSize.h);
    const activeIdx = activeDocIndexRef.current;
    setCorners(resetPts);
    setDetectedDocs((prev) =>
      prev.map((doc, idx) => (idx === activeIdx ? { ...doc, corners: resetPts } : doc))
    );
    toast.info("أُعيد ضبط الأركان");
  }, [imgSize, setDetectedDocs]);

  const handleRotateClockwise = useCallback(() => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    setDetectedDocs((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndexRef.current ? { ...doc, rotation: nextRot } : doc))
    );
    resetProcessorPreview();
  }, [rotation, setDetectedDocs, resetProcessorPreview]);

  const handleRotateCounterClockwise = useCallback(() => {
    const nextRot = (rotation + 270) % 360;
    setRotation(nextRot);
    setDetectedDocs((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndexRef.current ? { ...doc, rotation: nextRot } : doc))
    );
    resetProcessorPreview();
  }, [rotation, setDetectedDocs, resetProcessorPreview]);

  const handleFilterChange = useCallback((newFilter: ScannerFilterMode) => {
    setFilter(newFilter);
    setDetectedDocs((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndexRef.current ? { ...doc, filterMode: newFilter } : doc))
    );
    resetProcessorPreview();
  }, [setDetectedDocs, resetProcessorPreview]);

  // منع الإغلاق أثناء التصدير — زر الإلغاء معطل أصلاً، وهذا يغطي زر X وEscape.
  const handleOpenChange = useCallback((next: boolean) => {
    if (!next && processor.isExporting) {
      toast.warning("التصدير جارٍ — انتظر اكتماله أو أوقفه أولاً");
      return;
    }
    onOpenChange(next);
  }, [processor.isExporting, onOpenChange]);

  const cornersReady = corners.length === 4;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[1140px] w-[94vw] h-[86vh] max-h-[900px] overflow-hidden flex flex-col rounded-2xl border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-2xl p-4 sm:p-5 shadow-fluent-28 transition-all duration-150 fluent-specular gap-3 font-cairo"
        dir="rtl"
      >
        {/* 🔹 رأس النافذة الأنيق مع زر الإغلاق وشارة النمط */}
        <DialogHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between shrink-0 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
              <Scan size={22} weight="duotone" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  ماسح المستندات والبطاقات
                </DialogTitle>
                {detectedDocs.length > 1 ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-micro px-2 py-0.5 font-bold rounded-full shadow-2xs">
                    كشف متعدد ({detectedDocs.length})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 text-micro px-2 py-0.5 font-bold rounded-full shadow-2xs">
                    كشف مفرد
                  </span>
                )}
              </div>
              <span className="text-xs font-normal text-muted-foreground mt-0.5 truncate">
                استعدال المنظور وتبييض الورقة تلقائياً
              </span>
            </div>
          </div>
          <DialogCloseButton />
        </DialogHeader>

        {/* Main Work Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-3 min-h-0 h-full">
          {/* Canvas Main Container */}
          <div
            ref={containerRef as React.RefObject<HTMLDivElement>}
            className="flex-1 bg-canvas-stage dark:bg-black/85 rounded-2xl overflow-hidden flex items-center justify-center h-full min-h-0 border border-border/50 relative shadow-inner p-2 select-none"
          >
            {/* Top Floating Status Badge — aria-live لقارئ الشاشة */}
            <div className={cn("absolute top-3 inset-x-0 mx-auto w-fit pointer-events-none", Z_CLASS.panel)}>
              <div
                role="status"
                aria-live="polite"
                className="px-3.5 py-1 rounded-full bg-card/90 dark:bg-card/80 border border-border/70 text-xs font-semibold text-foreground shadow-fluent-8 backdrop-blur-md flex items-center gap-2"
              >
                {isDetecting ? (
                  <>
                    <ArrowClockwise size={13} weight="bold" className="text-primary shrink-0 animate-spin" />
                    <span>{WAIT_COPY.scanningDoc}</span>
                  </>
                ) : isPreviewMode ? (
                  <>
                    <Eye size={13} weight="duotone" className="text-blue-500 shrink-0" />
                    <span>معاينة المستند بعد الاستعدال</span>
                  </>
                ) : detectedDocs.length > 1 ? (
                  <>
                    <FileText size={13} weight="duotone" className="text-emerald-500 shrink-0" />
                    <span>
                      تم تحديد {detectedDocs.length} مستندات — اضغط (1-{detectedDocs.length}) للتبديل
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkle size={13} weight="duotone" className="text-primary shrink-0" />
                    <span>اسحب الدبابيس للضبط</span>
                  </>
                )}
              </div>
            </div>

            {isPreviewMode && processor.previewSrc ? (
              <img
                src={processor.previewSrc}
                alt="المستند المستعدل"
                onError={() => toast.error("تعذر عرض المعاينة — أعد المحاولة")}
                className="max-h-full max-w-full object-contain rounded-xl shadow-fluent-8 shadow-black/20 border border-border/30 animate-in fade-in-50 duration-200"
              />
            ) : (
              <div
                role="application"
                aria-label="لوحة ضبط حدود المستند — اسحب الدبابيس الأربع لتحديد الزوايا"
                className="relative"
              >
                <canvas
                  ref={canvasRef as React.RefObject<HTMLCanvasElement>}
                  aria-hidden="true"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={cn(
                    "touch-none rounded-xl cursor-crosshair transition-opacity duration-150",
                    activeCorner !== null && "cursor-grabbing"
                  )}
                />
              </div>
            )}

            {/* Loupe Glass Magnifier */}
            <div
              className={cn(
                "absolute pointer-events-none transition-all duration-100 rounded-full border-2 border-primary bg-muted shadow-fluent-16 overflow-hidden ring-4 ring-primary/20",
                Z_CLASS.popover,
                loupePos && activeCorner !== null ? "opacity-100 scale-100" : "opacity-0 scale-90"
              )}
              style={{
                left: loupePos ? `${loupePos.x}px` : "0px",
                top: loupePos ? `${loupePos.y}px` : "0px",
                width: "115px",
                height: "115px",
              }}
            >
              <canvas ref={loupeCanvasRef as React.RefObject<HTMLCanvasElement>} className="w-full h-full" />
            </div>
          </div>

          {/* Right Control Sidebar */}
          <ScannerSidebar
            detectionMode={detectionMode}
            onModeChange={setDetectionMode}
            detectedDocs={detectedDocs}
            activeDocIndex={detection.activeDocIndex}
            selectedDocIds={selectedDocIds}
            onSelectDoc={stableSelectDocument}
            onToggleCheckDoc={toggleDocSelection}
            onSelectAllDocs={selectAllDocs}
            onAddDocument={() => handleAddManualDocument(setCorners, setAspect, resetPreview)}
            onDeleteDoc={(id) => handleDeleteDocument(id, setCorners, setAspect, resetPreview)}
            onSplitIdCards={() => handleSplitIdCards(corners, setCorners, setAspect, resetPreview)}
            isDetecting={isDetecting}
            onAutoDetect={handleAutoDetect}
            onReset={handleResetCorners}
            filterMode={filter}
            onFilterChange={handleFilterChange}
            aspectType={aspect}
            onAspectChange={handleAspectChange}
            rotation={rotation}
            onRotateClockwise={handleRotateClockwise}
            onRotateCounterClockwise={handleRotateCounterClockwise}
          />
        </div>

        {/* Footer Bar */}
        <DialogFooter className="gap-2 border-t border-border/40 pt-3 flex items-center justify-between w-full shrink-0">
          <div>
            <Button
              variant="outline"
              onClick={() => processor.handleTogglePreview(corners, aspect)}
              disabled={!cornersReady && !isPreviewMode}
              title={cornersReady ? undefined : "حدّد أركان المستند أولاً"}
              className="rounded-md h-8 px-3 text-xs font-semibold cursor-pointer gap-1.5 border border-border/60 shadow-2xs hover:bg-accent flex items-center disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              {isPreviewMode ? (
                <>
                  <ArrowCounterClockwise size={14} weight="bold" className="text-primary shrink-0" />
                  <span>تعديل</span>
                </>
              ) : (
                <>
                  <Eye size={14} weight="bold" className="text-primary shrink-0" />
                  <span>معاينة</span>
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-md h-8 px-3.5 text-xs font-semibold cursor-pointer border-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              disabled={processor.isExporting}
            >
              إلغاء
            </Button>

            {processor.isExporting && processor.exportProgress && processor.exportProgress.total > 1 && (
              <>
                <span className="text-micro font-mono text-muted-foreground" dir="ltr">
                  {processor.exportProgress.done}/{processor.exportProgress.total}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md h-8 px-3 text-xs font-semibold cursor-pointer border-destructive/50 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  onClick={processor.cancelExport}
                >
                  إيقاف
                </Button>
              </>
            )}

            {detectedDocs.length > 1 && selectedDocIds.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-md h-8 px-3.5 text-xs font-bold gap-1.5 cursor-pointer border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-xs transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                onClick={() =>
                  processor.handleApplySelected(
                    detectedDocs.filter((d) => selectedDocIds.includes(d.id)),
                    onSave,
                    () => onOpenChange(false)
                  )
                }
                disabled={processor.isExporting}
              >
                {processor.isExporting ? <Spinner className="w-3.5 h-3.5 shrink-0" size={14} /> : <Check size={14} weight="bold" className="shrink-0" />}
                <span>{processor.isExporting ? WAIT_COPY.exporting : `إدراج (${selectedDocIds.length})`}</span>
              </Button>
            )}

            <Button
              onClick={() => processor.handleApplyActive(corners, aspect, onSave, () => onOpenChange(false))}
              disabled={!cornersReady || processor.isExporting}
              title={cornersReady ? undefined : "حدّد أركان المستند أولاً"}
              className="rounded-md h-8 px-4 text-xs font-bold gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98] disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              {processor.isExporting ? <Spinner className="w-3.5 h-3.5 shrink-0" size={14} /> : <Check size={14} weight="bold" className="shrink-0" />}
              <span>{processor.isExporting ? WAIT_COPY.exporting : detectedDocs.length > 1 ? "إدراج النشط" : "إدراج"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
