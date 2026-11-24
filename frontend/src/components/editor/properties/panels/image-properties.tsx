import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { requestStickerReedit } from '@/components/editor/dialogs/sticker-reedit-bus';
import { FluentSection, FluentSliderField } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/huge-icon';
import {
  Sparkle,
  MagicWand,
  UserFocus,
  Crop,
  ImageSquare,
  ArrowCounterClockwise,
  Eye,
  FrameCorners,
  PaintBrush,
  ArrowClockwise,
  X,
  Scan,
  Sticker,
  Code,
} from '@/components/ui/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  canCopyStickerSvg,
  copyStickerSvgWithFeedback,
} from '@/features/stickers/lib/clipboard-utils';
import { useAiEnhance } from '@/hooks/use-ai-enhance';
import { useBgRemoval } from '@/hooks/use-bg-removal';
import { useFaceFrame } from '@/hooks/use-face-frame';
import { findLiveAiTarget } from '@/lib/ai/ai-result-commit';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import { commitImageElementCrop } from '@/lib/canvas/image-crop-commit';
import { resolveBatchImageAspectRatios } from '@/lib/canvas/image-dimensions';
import { buildMaskPath, MASK_SHAPES, maskPathToSvg } from '@/lib/canvas/mask-geometry';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { isSvgImageSource, sanitizeSvgTintColor } from '@/lib/canvas/svg-logo';
import { useEditorStore } from '@/lib/editor-store';
import { hasCustomImageCrop } from '@/lib/export/export-primitives';
import { getDocumentSession } from '@/lib/io/document-session';
import { pickLocalImage } from '@/lib/io/file-dialog-utils';
import { createLogger } from '@/lib/logger';
import { IMAGE_FILTERS, filterShortName } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { toErrorMessage } from '@/lib/wails-error';

import { ColorField, ColorPanel } from '../color-panel';
import { ShadowGlowSection } from '../element/shared/shadow-glow-section';

import type { ImageElement, CanvasElement } from '@/lib/editor-store';

const logger = createLogger('image-properties');
const MASK_LABELS = {
  none: 'طبيعي',
  circle: 'دائري',
  arch: 'قوس',
  hexagon: 'سداسي',
  diamond: 'ماسة',
  heart: 'قلب',
  star: 'نجمة',
  seal: 'ختم مزخرف',
};
const MASK_OPTIONS = MASK_SHAPES.map((id) => ({
  id,
  label: MASK_LABELS[id],
  path: maskPathToSvg(buildMaskPath(id, 32, 32)),
}));

// أدوات الصور الثقيلة لا تُحمّل إلا عند فتحها، بدلاً من تأخير المحرر عند البدء.
const CropDialog = lazy(() =>
  import('../../dialogs/crop-dialog').then((module) => ({ default: module.CropDialog })),
);
const DocumentScannerDialog = lazy(() =>
  import('../../document-scanner').then((module) => ({ default: module.DocumentScannerDialog })),
);
const RefineBgDialog = lazy(() =>
  import('../../dialogs/refine-bg-dialog').then((module) => ({ default: module.RefineBgDialog })),
);
interface ImagePropertiesProps {
  element: ImageElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

export function ImageAdjustProperties({
  element,
  onUpdate,
  showReset = true,
}: ImagePropertiesProps & { showReset?: boolean }) {
  const currentOpacity = Math.round((element.opacity ?? 1) * 100);

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150 font-cairo">
      {/* بطاقة 1: تعديل الألوان */}
      <FluentSection title="تعديل الألوان" collapsible defaultOpen={true}>
        {/* قوالب تدرج لوني سريعة للاستوديوهات */}
        <div className="space-y-1.5 pb-2 border-b border-border/20">
          <span className="text-mini font-normal text-muted-foreground block">قوالب الاستوديو</span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'استوديو دافئ', b: 104, c: 106, s: 108 },
              { label: 'جواز سفر حيوي', b: 108, c: 115, s: 118 },
              { label: 'إشراق ناعم', b: 110, c: 95, s: 102 },
              { label: 'أبيض وأسود', b: 105, c: 120, s: 0 },
            ].map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="h-7 text-mini font-normal rounded-md border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                onClick={() => {
                  onUpdate(element.id, {
                    brightness: preset.b,
                    contrast: preset.c,
                    saturation: preset.s,
                  });
                  useEditorStore.getState().pushHistory();
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <FluentSliderField
            label="السطوع"
            value={element.brightness ?? 100}
            min={0}
            max={200}
            step={1}
            unit="%"
            defaultValue={100}
            onChange={(v) => onUpdate(element.id, { brightness: v })}
            onCommit={() => {
              useRenderQuality.getState().setIsDraggingFilter(false);
              useEditorStore.getState().pushHistory();
            }}
            onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true, element.id)}
            onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
          />
          <FluentSliderField
            label="التباين"
            value={element.contrast ?? 100}
            min={0}
            max={200}
            step={1}
            unit="%"
            defaultValue={100}
            onChange={(v) => onUpdate(element.id, { contrast: v })}
            onCommit={() => {
              useRenderQuality.getState().setIsDraggingFilter(false);
              useEditorStore.getState().pushHistory();
            }}
            onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true, element.id)}
            onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
          />
          <FluentSliderField
            label="التشبع"
            value={element.saturation ?? 100}
            min={0}
            max={200}
            step={1}
            unit="%"
            defaultValue={100}
            onChange={(v) => onUpdate(element.id, { saturation: v })}
            onCommit={() => {
              useRenderQuality.getState().setIsDraggingFilter(false);
              useEditorStore.getState().pushHistory();
            }}
            onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true, element.id)}
            onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
          />
          <FluentSliderField
            label="الضبابية"
            value={element.blur ?? 0}
            min={0}
            max={20}
            step={1}
            unit="px"
            defaultValue={0}
            onChange={(v) => onUpdate(element.id, { blur: v })}
            onCommit={() => {
              useRenderQuality.getState().setIsDraggingFilter(false);
              useEditorStore.getState().pushHistory();
            }}
            onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true, element.id)}
            onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
          />
        </div>

        {showReset && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs font-normal text-muted-foreground hover:text-foreground gap-1.5 rounded-md border border-border/40 hover:bg-muted"
            onClick={() => {
              onUpdate(element.id, {
                filter: 'none',
                brightness: 100,
                contrast: 100,
                saturation: 100,
                blur: 0,
              });
              useEditorStore.getState().pushHistory();
            }}
          >
            <ArrowClockwise className="w-3.5 h-3.5" weight="regular" />
            <span>إعادة تعيين الألوان</span>
          </Button>
        )}
      </FluentSection>

      {/* بطاقة 2: الشفافية العامة */}
      <FluentSection title="الشفافية">
        <FluentSliderField
          label="شفافية الصورة"
          value={currentOpacity}
          min={0}
          max={100}
          step={1}
          unit="%"
          defaultValue={100}
          onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />
      </FluentSection>
    </div>
  );
}

/**
 * 🎴 ImageFiltersSection — بطاقة المرشحات لمعاينة واختيار فلاتر الصورة
 */
export function ImageFiltersSection({ element, onUpdate }: ImagePropertiesProps) {
  return (
    <FluentSection
      title="المرشحات"
      collapsible
      defaultOpen={true}
      action={
        element.filter && element.filter !== 'none' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onUpdate(element.id, { filter: undefined });
              useEditorStore.getState().pushHistory();
            }}
            className="text-mini text-muted-foreground hover:text-foreground cursor-pointer"
          >
            إزالة المرشح
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-1.5">
        {IMAGE_FILTERS.map((filter) => {
          const isActive = (element.filter || 'none') === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                onUpdate(element.id, { filter: filter.id });
                useEditorStore.getState().pushHistory();
              }}
              aria-pressed={isActive}
              aria-label={filter.name}
              title={filter.name}
              className={cn(
                'flex flex-col items-center gap-1 p-1 rounded-md border transition-colors duration-150 cursor-pointer',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                isActive
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border/60 bg-card/60 hover:bg-accent/60 text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="w-full aspect-4/3 rounded-sm overflow-hidden shrink-0 border border-foreground/10 bg-muted relative">
                <img
                  src={element.imageSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: filter.css }}
                />
              </span>
              <span className="text-mini w-full text-center leading-tight truncate px-0.5">
                {filterShortName(filter.name)}
              </span>
            </button>
          );
        })}
      </div>
    </FluentSection>
  );
}

/**
 * 🎴 ImageEffectsProperties — تبويب التأثيرات للصور (المرشحات + الظل والوهج)
 */
export function ImageEffectsProperties({ element, onUpdate }: ImagePropertiesProps) {
  return (
    <div className="space-y-2.5 font-cairo animate-in fade-in duration-150">
      {/* 🎴 بطاقة 1: المرشحات */}
      <ImageFiltersSection element={element} onUpdate={onUpdate} />

      {/* 🎴 بطاقة 2: الظل والوهج */}
      <ShadowGlowSection element={element} onUpdate={onUpdate} />
    </div>
  );
}

export function ImageStyleProperties({ element, onUpdate }: ImagePropertiesProps) {
  const [cropOpen, setCropOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const _isLicenseActive = useEditorStore((state) => state.isLicenseActive());
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const svgTintDirtyRef = useRef(false);
  const isImportedSvg = !element.stickerSource && isSvgImageSource(element.imageSrc);

  useEffect(() => {
    svgTintDirtyRef.current = false;
  }, [element.id]);

  const handleScannerSave = async (processedResult: string | string[]) => {
    const session = getDocumentSession();
    const targetElementId = element.id;
    const targetWidth = element.width;
    try {
      // مسار URL-first (المرحلة 2 من ترحيل الماسح): Go يكتب النتائج في
      // الوسائط ويسلّم روابط /local-image/ جاهزة — لا Blob ولا رفع من الواجهة.
      const paths = (Array.isArray(processedResult) ? processedResult : [processedResult]).filter(
        (src) => typeof src === 'string' && src.length > 0,
      );
      if (paths.length === 0) return;

      const state = useEditorStore.getState();
      const canvasRatio = state.canvasWidth / state.canvasHeight;

      // حل أبعاد الدفعة الكبيرة بطلب Go واحد متوازي O(1)
      const aspectMap = await resolveBatchImageAspectRatios(paths);
      if (!isMountedRef.current || getDocumentSession() !== session) return;

      const liveState = useEditorStore.getState();
      // تحديث العنصر الأول بالكانفاس
      const firstPath = paths[0];
      const firstAspect = aspectMap.get(firstPath) || 1.0;
      const newHeight = (targetWidth * canvasRatio) / firstAspect;
      onUpdate(targetElementId, {
        imageSrc: firstPath,
        height: newHeight,
      });
      liveState.setLastEditedImageAspect(firstAspect);

      // إدراج بقية المستندات المحددة كعناصر جديدة على الكانفاس بدفعة واحدة ولقطة تراجع واحدة
      if (paths.length > 1) {
        const extraItems = paths.slice(1).map((src) => ({
          src,
          aspectRatio: aspectMap.get(src) || 1.0,
        }));
        liveState.addImageElementsBatch(extraItems);
      } else {
        liveState.pushHistory();
      }

      if (paths.length > 1) {
        toast.success(`تم استبدال وإدراج ${paths.length} مستندات`);
      } else {
        toast.success('تم عزل المستند');
      }
    } catch (err) {
      if (!isMountedRef.current || getDocumentSession() !== session) return;
      logger.error(err);
      toast.error(toErrorMessage(err, 'فشل حفظ المستند المستعدل'));
    }
  };
  const { isRemovingBg, bgProgress, bgProgressText, handleCancelBgRemoval, handleRemoveBg } =
    useBgRemoval(onUpdate);
  const {
    isEnhancing,
    enhanceProgress,
    enhanceProgressText,
    remainingQuota,
    dailyLimit,
    handleEnhance,
  } = useAiEnhance(onUpdate);
  const { isFraming, frameProgress, frameProgressText, handleCancelFrame, handleFrameFace } =
    useFaceFrame(onUpdate);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleOpenFile = async () => {
    if (isFileDialogOpen) return;
    const session = getDocumentSession();
    const targetElementId = element.id;
    setIsFileDialogOpen(true);
    try {
      const finalPath = await pickLocalImage();
      if (!isMountedRef.current || getDocumentSession() !== session) return;
      if (finalPath) {
        onUpdate(targetElementId, {
          imageSrc: finalPath,
          svgTintColor: undefined,
          cropZoom: undefined,
          cropPanX: undefined,
          cropPanY: undefined,
        });
        useEditorStore.getState().pushHistory();
      }
    } catch (err) {
      if (!isMountedRef.current || getDocumentSession() !== session) return;
      logger.error(err);
      toast.error(toErrorMessage(err, 'فشل تغيير الصورة'));
    } finally {
      if (isMountedRef.current) {
        setIsFileDialogOpen(false);
      }
    }
  };

  return (
    <div className="space-y-2.5 font-cairo animate-in fade-in duration-150">
      {element.stickerSource && (
        <FluentSection title="استوديو الملصقات">
          <div className="grid grid-cols-2 gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  disabled={Boolean(element.locked)}
                  className="h-9 rounded-md bg-primary-action hover:bg-primary-action-hover text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 px-2.5 cursor-pointer shadow-2xs"
                  onClick={() => {
                    const live = useEditorStore
                      .getState()
                      .elements.find((el) => el.id === element.id);
                    if (!live || live.type !== 'image' || live.locked || !live.stickerSource)
                      return;
                    requestStickerReedit(live.id);
                  }}
                >
                  <Sticker className="w-4 h-4 shrink-0" weight="fill" />
                  <span>تعديل الملصق</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">فتح القالب ونصوصه في استوديو الملصقات</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canCopyStickerSvg(element.stickerSource)}
                  className="h-9 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 px-2.5 cursor-pointer shadow-2xs"
                  onClick={() => {
                    const live = useEditorStore
                      .getState()
                      .elements.find((el) => el.id === element.id);
                    const source =
                      live && live.type === 'image' ? live.stickerSource : element.stickerSource;
                    void copyStickerSvgWithFeedback(source);
                  }}
                >
                  <Code className="w-4 h-4 text-primary shrink-0" weight="regular" />
                  <span>نسخ SVG</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">نسخ كود SVG المتجه للحافظة</TooltipContent>
            </Tooltip>
          </div>
        </FluentSection>
      )}

      {isImportedSvg && (
        <FluentSection title="لون الشعار">
          <div className="space-y-1.5">
            <ColorField
              color={element.svgTintColor ?? 'transparent'}
              onChange={(val) => {
                const live = useEditorStore.getState().elements.find((el) => el.id === element.id);
                if (!live || live.type !== 'image' || live.locked) return;
                const nextTint = sanitizeSvgTintColor(val);
                if ((live.svgTintColor ?? undefined) === nextTint) return;
                svgTintDirtyRef.current = true;
                onUpdate(element.id, { svgTintColor: nextTint });
              }}
              onCommit={(val) => {
                const live = useEditorStore.getState().elements.find((el) => el.id === element.id);
                if (!live || live.type !== 'image' || live.locked) {
                  svgTintDirtyRef.current = false;
                  return;
                }
                const nextTint = sanitizeSvgTintColor(val);
                const changed =
                  svgTintDirtyRef.current || (live.svgTintColor ?? undefined) !== nextTint;
                svgTintDirtyRef.current = false;
                if (!changed) return;
                if ((live.svgTintColor ?? undefined) !== nextTint) {
                  onUpdate(element.id, { svgTintColor: nextTint });
                }
                useEditorStore.getState().pushHistory();
              }}
              className="w-full"
              ariaLabel="لون الشعار"
            />
            {Boolean(element.svgTintColor) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-8 rounded-md border-border/80 hover:bg-muted transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground shadow-2xs"
                onClick={() => {
                  const live = useEditorStore
                    .getState()
                    .elements.find((el) => el.id === element.id);
                  if (!live || live.type !== 'image' || live.locked || !live.svgTintColor) return;
                  svgTintDirtyRef.current = false;
                  onUpdate(element.id, { svgTintColor: undefined });
                  useEditorStore.getState().pushHistory();
                }}
              >
                <ArrowCounterClockwise className="w-3.5 h-3.5 shrink-0" weight="regular" />
                <span>استعادة اللون الأصلي</span>
              </Button>
            )}
          </div>
        </FluentSection>
      )}

      {/* 🎴 بطاقة 1: شبكة أدوات الذكاء الاصطناعي الفاخرة (2x2 Grid) */}
      <FluentSection
        key={`ai-${element.id}-${Boolean(element.stickerSource)}-${isImportedSvg}`}
        title="أدوات الذكاء الاصطناعي"
        collapsible
        defaultOpen={!element.stickerSource && !isImportedSvg}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {/* 1. عزل الخلفية */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isRemovingBg ? 'destructive' : 'outline'}
                title={isRemovingBg ? 'إلغاء العزل' : 'عزل الخلفية'}
                className={cn(
                  'relative overflow-hidden h-9 flex items-center justify-center gap-2 rounded-md border border-border/70 hover:border-primary/40 bg-muted/30 hover:bg-primary/10 text-foreground transition-colors cursor-pointer px-2.5 shadow-2xs',
                  isRemovingBg &&
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent',
                )}
                onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(element)}
              >
                {isRemovingBg ? (
                  <Spinner className="w-4 h-4 shrink-0" size={16} />
                ) : (
                  <Sparkle className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                )}
                <span className="text-xs font-bold">
                  {isRemovingBg
                    ? bgProgress > 0
                      ? `إلغاء (${Math.round(bgProgress)}%)`
                      : 'إلغاء'
                    : 'عزل الخلفية'}
                </span>
                {isRemovingBg && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-destructive-foreground/30"
                  >
                    <span
                      className="block h-full bg-destructive-foreground transition-[width] duration-300"
                      style={{ width: `${Math.round(bgProgress)}%` }}
                    />
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isRemovingBg ? bgProgressText || 'إلغاء عزل الخلفية' : 'عزل الخلفية الذكي (AI)'}
            </TooltipContent>
          </Tooltip>

          {/* 2. ترميم الوجه */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                title={`ترميم الوجه (${remainingQuota}/${dailyLimit})`}
                disabled={isEnhancing || isRemovingBg}
                className={cn(
                  'relative overflow-hidden h-9 flex items-center justify-center gap-2 rounded-md border border-border/70 hover:border-primary/40 bg-muted/30 hover:bg-primary/10 text-foreground transition-colors cursor-pointer px-2.5 shadow-2xs',
                  isEnhancing && 'border-primary/40 bg-primary/10 text-primary opacity-100',
                  !isEnhancing && isRemovingBg && 'opacity-50 cursor-not-allowed',
                )}
                onClick={() => handleEnhance(element)}
              >
                {isEnhancing ? (
                  <Spinner className="w-4 h-4 text-primary shrink-0" size={16} />
                ) : (
                  <MagicWand className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                )}
                <span className="text-xs font-bold tabular-nums">
                  {isEnhancing
                    ? enhanceProgress > 0
                      ? `جاري الترميم ${Math.round(enhanceProgress)}%`
                      : 'جاري الترميم…'
                    : 'ترميم الوجه'}
                </span>
                {isEnhancing && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/20"
                  >
                    <span
                      className="block h-full bg-primary transition-[width] duration-300"
                      style={{ width: `${Math.round(enhanceProgress)}%` }}
                    />
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isEnhancing
                ? enhanceProgressText || 'جاري ترميم الوجه'
                : `ترميم الوجه (${remainingQuota}/${dailyLimit} اليوم)`}
            </TooltipContent>
          </Tooltip>

          {/* 3. تأطير الوجه */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isFraming ? 'destructive' : 'outline'}
                title={isFraming ? 'إلغاء ضبط الوجه' : 'تأطير الوجه تلقائياً'}
                className={cn(
                  'relative overflow-hidden h-9 flex items-center justify-center gap-2 rounded-md border border-border/70 hover:border-primary/40 bg-muted/30 hover:bg-primary/10 text-foreground transition-colors cursor-pointer px-2.5 shadow-2xs',
                  isFraming &&
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent',
                )}
                onClick={isFraming ? handleCancelFrame : () => handleFrameFace(element)}
              >
                {isFraming ? (
                  <X className="w-4 h-4 text-destructive-foreground shrink-0" weight="bold" />
                ) : (
                  <UserFocus className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                )}
                <span className="text-xs font-bold">
                  {isFraming
                    ? frameProgress > 0
                      ? `إلغاء (${Math.round(frameProgress)}%)`
                      : 'إلغاء'
                    : 'تأطير الوجه'}
                </span>
                {isFraming && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-destructive-foreground/30"
                  >
                    <span
                      className="block h-full bg-destructive-foreground transition-[width] duration-300"
                      style={{ width: `${Math.round(frameProgress)}%` }}
                    />
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isFraming ? frameProgressText || 'إلغاء ضبط الوجه' : 'تأطير الوجه وفق معايير الهوية'}
            </TooltipContent>
          </Tooltip>

          {/* 4. مسح المستند */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                title="مسح وتقويم المستند"
                className="h-9 flex items-center justify-center gap-2 rounded-md border border-border/70 hover:border-primary/40 bg-muted/30 hover:bg-primary/10 text-foreground transition-colors cursor-pointer px-2.5 shadow-2xs"
                onClick={() => setScannerOpen(true)}
              >
                <Scan className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                <span className="text-xs font-bold">مسح المستند</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">مسح وتقويم المستند</TooltipContent>
          </Tooltip>
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 2: خلفية الصورة — متقدمة، مطوية افتراضياً (كشف تدريجي) */}
      <FluentSection title="خلفية الصورة" collapsible defaultOpen={false}>
        <ColorPanel wheelPosition="bottom">
          <ColorField
            color={element.bgColor ?? 'transparent'}
            onChange={(val) => {
              onUpdate(element.id, { bgColor: val });
            }}
            onCommit={() => useEditorStore.getState().pushHistory()}
            className="w-full"
            ariaLabel="لون خلفية الصورة"
          />
        </ColorPanel>
      </FluentSection>

      {/* 🎴 بطاقة 3: أدوات الصورة والقص */}
      <FluentSection title="الصورة والقص">
        <div className="grid grid-cols-2 gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs group text-foreground shadow-2xs"
                onClick={() => setCropOpen(true)}
              >
                <Crop
                  className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                  weight="regular"
                />
                <span>قص وتدوير</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">قص وتدوير الصورة</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs group text-foreground shadow-2xs"
                onClick={handleOpenFile}
              >
                <ImageSquare
                  className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                  weight="regular"
                />
                <span>تبديل الصورة</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">استبدال الصورة</TooltipContent>
          </Tooltip>
        </div>

        {!element.stickerSource && (
          <div
            className={cn(
              'grid gap-1.5',
              hasCustomImageCrop(element) ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs group text-foreground shadow-2xs"
              onClick={() => useCanvasInteraction.getState().setCroppingElementId(element.id)}
              title="ضبط الكادر داخل الإطار دون قصّ الأصل"
            >
              <FrameCorners
                className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                weight="regular"
              />
              <span>ضبط الكادر</span>
            </Button>

            {hasCustomImageCrop(element) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:bg-muted transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground shadow-2xs"
                onClick={() => {
                  onUpdate(element.id, {
                    cropZoom: undefined,
                    cropPanX: undefined,
                    cropPanY: undefined,
                  });
                  useEditorStore.getState().pushHistory();
                }}
                title="تصفير تكبير وإزاحة الكادر"
              >
                <ArrowCounterClockwise className="w-3.5 h-3.5 shrink-0" weight="regular" />
                <span>تصفير الكادر</span>
              </Button>
            )}
          </div>
        )}

        {Boolean(element.originalImageSrc && element.originalImageSrc !== element.imageSrc) && (
          <div className="space-y-1.5 pt-2 border-t border-border/40 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                onClick={() => {
                  onUpdate(element.id, {
                    imageSrc: element.originalImageSrc,
                    originalImageSrc: undefined,
                    svgTintColor: undefined,
                    bgColor: 'transparent',
                    cropZoom: undefined,
                    cropPanX: undefined,
                    cropPanY: undefined,
                    ...(element.stickerSource
                      ? {
                          stickerSource: {
                            ...element.stickerSource,
                            params: {
                              ...element.stickerSource.params,
                              isTransparent: false,
                            },
                          },
                        }
                      : {}),
                  });
                  useEditorStore.getState().pushHistory();
                  toast.success('تمت استعادة الصورة الأصلية');
                }}
                title="استعادة الصورة الأصلية"
              >
                <ArrowCounterClockwise className="w-4 h-4" weight="regular" />
                <span>استعادة الأصل</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer select-none active:bg-primary-action active:text-primary-foreground shadow-2xs"
                onPointerDown={() => {
                  const curr = element.imageSrc;
                  onUpdate(element.id, { imageSrc: element.originalImageSrc });
                  // 🛡️ تنظيف شامل: pointercancel/blur يغطيان رفع المؤشر خارج
                  // النافذة أو فقدان التركيز — كان mouseup وحده يترك الصورة
                  // الأصلية معروضة ومستمعاً معلقاً حتى نقرة تالٍ.
                  // التسجيل في onPointerDown **وحده**: الجمع بين onMouseDown
                  // و onTouchStart كان يسجّل مجموعتين مستقلتين على اللمس،
                  // والثانية تتسرب وتُعيد تطبيق قيمة قديمة بعد رفع الإصبع.
                  const restore = () => {
                    onUpdate(element.id, { imageSrc: curr });
                    cleanup();
                  };
                  const cleanup = () => {
                    window.removeEventListener('pointerup', restore);
                    window.removeEventListener('pointercancel', restore);
                    window.removeEventListener('blur', restore);
                  };
                  window.addEventListener('pointerup', restore);
                  window.addEventListener('pointercancel', restore);
                  window.addEventListener('blur', restore);
                }}
                title="اضغط مطولاً للمقارنة"
              >
                <Eye className="w-4 h-4" weight="regular" />
                <span>مقارنة الأصل</span>
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full h-8 text-xs font-semibold transition-colors duration-200 flex items-center justify-center px-3 gap-1.5 cursor-pointer rounded-md border-border/70 hover:border-primary/50 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground group shadow-2xs"
              onClick={() => setRefineOpen(true)}
              title="تعديل العزل يدوياً"
            >
              <PaintBrush className="w-3.5 h-3.5 text-primary shrink-0" weight="regular" />
              <span>تعديل العزل يدوياً</span>
            </Button>
          </div>
        )}
      </FluentSection>

      {/* 🎴 بطاقة 4: استدارة الحواف وقناع القص */}
      <FluentSection title="استدارة وقناع القص">
        {(!element.maskShape || element.maskShape === 'none') && (
          <FluentSliderField
            label="الزوايا"
            value={element.cornerRadius || 0}
            min={0}
            max={200}
            step={1}
            unit="px"
            defaultValue={0}
            onChange={(v) => onUpdate(element.id, { cornerRadius: v })}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        )}

        <div className="pt-2 border-t border-border/30 space-y-1.5">
          <span className="text-mini font-normal text-muted-foreground block">قناع الشكل</span>
          <div
            role="group"
            aria-label="قناع الشكل"
            className="grid grid-cols-4 gap-1 p-1 rounded-md bg-muted border border-border/60"
          >
            {MASK_OPTIONS.map((mask) => {
              const isActive = (element.maskShape || 'none') === mask.id;
              return (
                <Tooltip key={mask.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={mask.label}
                      aria-pressed={isActive}
                      disabled={element.locked}
                      className={cn(
                        'h-10 min-w-7 coarse-touch-target rounded-md border transition-colors motion-reduce:transition-none cursor-pointer flex items-center justify-center select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                        isActive
                          ? 'bg-card text-foreground border-border/80 dark:border-white/15'
                          : 'text-muted-foreground hover:text-foreground hover:bg-card/40 border-transparent',
                      )}
                      onClick={() => {
                        const live = useEditorStore
                          .getState()
                          .elements.find((el) => el.id === element.id);
                        if (
                          !live ||
                          live.type !== 'image' ||
                          live.locked ||
                          (live.maskShape || 'none') === mask.id
                        )
                          return;
                        onUpdate(element.id, { maskShape: mask.id });
                        useEditorStore.getState().pushHistory();
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        focusable="false"
                        viewBox="-2 -2 36 36"
                        className="size-6"
                      >
                        <path d={mask.path} fill="currentColor" />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{mask.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </FluentSection>

      {element.imageSrc && cropOpen && (
        <Suspense fallback={null}>
          <CropDialog
            open={cropOpen}
            onOpenChange={setCropOpen}
            imageSrc={element.imageSrc}
            originalImageSrc={element.originalImageSrc}
            onCropSave={async (cropped, dims, isActive) => {
              if (!element.imageSrc) return false;
              const committed = await commitImageElementCrop({
                elementId: element.id,
                expectedImageSrc: element.imageSrc,
                cropped,
                dims,
                isActive,
                isMounted: () => isMountedRef.current,
                onUpdate,
              });
              if (committed) {
                setCropOpen(false);
              }
              return committed;
            }}
          />
        </Suspense>
      )}

      {element.imageSrc && scannerOpen && (
        <Suspense fallback={null}>
          <DocumentScannerDialog
            open={scannerOpen}
            onOpenChange={setScannerOpen}
            imageSrc={element.imageSrc}
            onSave={handleScannerSave}
          />
        </Suspense>
      )}

      {element.imageSrc && element.originalImageSrc && refineOpen && (
        <Suspense fallback={null}>
          <RefineBgDialog
            open={refineOpen}
            onOpenChange={setRefineOpen}
            element={element}
            onSave={(newImageSrc, isActive) => {
              if (
                !isMountedRef.current ||
                (isActive && !isActive()) ||
                findLiveAiTarget(element.id)?.imageSrc !== element.imageSrc
              )
                return false;
              onUpdate(element.id, { imageSrc: newImageSrc });
              useEditorStore.getState().pushHistory();
              return true;
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
