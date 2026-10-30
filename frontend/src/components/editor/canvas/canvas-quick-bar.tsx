import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { X } from '@/components/ui/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import {
  getAvailableAdjacentSlotDirections,
  getCollageGeometry,
  getSlotRect,
} from '@/lib/canvas/collage-geometry';
import { getElementVisualBox } from '@/lib/canvas/element-geometry';
import { useEditorStore } from '@/lib/editor-store';
import { openImageFileDialog, persistPickedImage } from '@/lib/io/file-dialog-utils';
import { isAutoFillGridEnabled } from '@/lib/local-prefs';
import { createLogger } from '@/lib/logger';

import { useCanvasOverlayHost } from './canvas-overlay-host';
import { QuickBarElementSection } from './quick-bar/quick-bar-element-section';
import { QuickBarMultiSelectionSection } from './quick-bar/quick-bar-multi-selection-section';
import { QuickBarSlotSection } from './quick-bar/quick-bar-slot-section';

import type { CanvasElement } from '@/lib/store/types';

const logger = createLogger('canvas-quick-bar');

/**
 * CanvasQuickBar — الشريط السريع العائم **فوق العنصر المحدد** داخل ورقة الكانفاس.
 *
 * 🧭 الأقسام الثلاثة (خلية الكولاج / التحديد المتعدد / العنصر الحر) في ملفات
 * مستقلة تحت quick-bar/. كان الشريط مثبتاً بـ`top-3 left-1/2` على قشرة الكانفس
 * فكان **يغطي المساطر العلوية** و**ينفصل بصرياً** عن العنصر المحدد (خاصة مع
 * الأوراق الطويلة A4). الآن يُحسب موضعه من الصندوق المحيط للتحديد:
 *
 * 📐 التموضع: فوق منتصف العنصر بفجوة ثابتة؛ فإن ضاقت المساحة انقلب تحته،
 * وإن لم تصح الحالتان القِ بحافة الورقة العليا. والقص دائماً **داخل حدود
 * الورقة** — لا يلمس المساطر ولا أزرار الـ viewport في زوايا مساحة العمل.
 *
 * 🧷 قاعدة السكون (Rest State Invariant): أثناء سحب أو تحجيم أو تعديل العنصر
 * يختفي الشريط تماماً مانعاً حجب الرؤية أو إعاقة دلائل المحاذاة الذكية،
 * ثم ينزلق بسلاسة ويظهر في الموضع الجديد فور استقرار العنصر في حالة السكون.
 *
 * 🎯 نطاق هذا الشريط: **الموضع على الورقة** (ترتيب الطبقة، تدوير، قلب،
 * توزيع، تعبئة الصف/العمود، تفريغ الخلية، مقارنة بالأصل). أما خصائص العنصر
 * فموطنها الشريط العلوي (ToolbarSelectionTools).
 */

/** صندوق المرساة بإحداثيات بكسلية داخل مساحة الورقة المعروضة */
interface AnchorBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** صندوق عنصر حر (مع الدوران) بإحداثيات بكسلية داخل الورقة */
function pixelBoxOfElement(
  el: Pick<CanvasElement, 'x' | 'y' | 'width' | 'height'> & { rotation?: number },
  canvasWidth: number,
  canvasHeight: number,
  displayW: number,
  displayH: number,
): AnchorBox {
  const vb = getElementVisualBox(el, canvasWidth, canvasHeight);
  return {
    left: vb.x * displayW,
    top: vb.y * displayH,
    width: vb.width * displayW,
    height: vb.height * displayH,
  };
}

const GAP_PX = 5; // فجوة الشريط عن الصندوق المحيط
const EDGE_PX = 4; // هامش أمان من حواف الورقة
/**
 * 🧭 مسافة الخلوص الإضافية لمقبض التدوير (`rotater`) في المحوّل:
 * يمتد مقبض التدوير في `EditorTransformer` بـ `rotateAnchorOffset = 26px`
 * مع نصف قطر مقبض `7px` وحشوة إطار `padding = 3px` (أي ~36px في فضاء العرض).
 */
const ROTATE_ANCHOR_CLEARANCE_PX = 38;

export const CanvasQuickBar = React.memo(function CanvasQuickBar({
  printMode = false,
  isContextMenuOpen = false,
}: {
  printMode?: boolean;
  isContextMenuOpen?: boolean;
}) {
  const {
    mode,
    selectedId,
    selectedIds,
    elements,
    slots,
    canvasWidth,
    canvasHeight,
    collageMargin,
    collageGap,
    collageTemplate,
    setSlotImage,
    fillAllSlots,
    selectElement,
  } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      elements: state.elements,
      slots: state.slots,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      collageMargin: state.collageMargin,
      collageGap: state.collageGap,
      collageTemplate: state.collageTemplate,
      setSlotImage: state.setSlotImage,
      fillAllSlots: state.fillAllSlots,
      selectElement: state.selectElement,
    })),
  );

  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const overlayHost = useCanvasOverlayHost();

  // 📐 موضع الورقة (#canvas-area) داخل حاوية العناصر العائمة — الحاوية تغطي
  // قشرة الكانفس كاملة بما فيها المساطر، فلا بد من إزاحة الورقة داخلها.
  const [canvasBox, setCanvasBox] = useState<AnchorBox | null>(null);
  // 📏 مقاس الشريط الفعلي بعد الرسم (يتغير بين الأقسام: خلية/عنصر/تحديد متعدد)
  const barObserverRef = useRef<ResizeObserver | null>(null);
  const [barSize, setBarSize] = useState({ w: 190, h: 30 });

  // قياس موضع الورقة — يُعاد عبر ResizeObserver (يلتقط الزوم وتغيّر الحجم
  // وتفريع/طي الألواح الجانبية) فلا حاجة للاشتراك بالزوم يدوياً هنا.
  useEffect(() => {
    const canvasEl = document.getElementById('canvas-area');
    if (!overlayHost || !canvasEl) {
      setCanvasBox(null);
      return;
    }
    // التمرير داخل مساحة العمل يحرّك الورقة دون تغيير مقاسها — لا يلتقطه
    // ResizeObserver، فنستمع له مباشرة على الحاوية القابلة للتمرير.
    const scroller = canvasEl.closest('.workspace-grid');
    const measure = () => {
      const hostRect = overlayHost.getBoundingClientRect();
      const rect = canvasEl.getBoundingClientRect();
      setCanvasBox((prev) => {
        const next = {
          left: rect.left - hostRect.left,
          top: rect.top - hostRect.top,
          width: rect.width,
          height: rect.height,
        };
        if (
          prev &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
        ) {
          return prev;
        }
        return next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvasEl);
    ro.observe(overlayHost);
    window.addEventListener('resize', measure);
    scroller?.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      scroller?.removeEventListener('scroll', measure);
    };
  }, [overlayHost]);

  // 📏 قياس مقاس الشريط: مراقب على عنصر الشريط نفسه يلتقط تغيّر القسم المعروض
  // (خلية/عنصر/تحديد متعدد) وتغيّر تحميل الخطوط، بلا قراءة أبعاد في كل رسم
  // وبلا قائمة اعتماديات هشّة. مرجع callback يضمن إعادة الربط عند تبديل مسار الرسم.
  const measureBar = useCallback((node: HTMLDivElement) => {
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    setBarSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  const attachBar = useCallback(
    (node: HTMLDivElement | null) => {
      barObserverRef.current?.disconnect();
      barObserverRef.current = null;
      if (!node) return;
      measureBar(node);
      const ro = new ResizeObserver(() => measureBar(node));
      ro.observe(node);
      barObserverRef.current = ro;
    },
    [measureBar],
  );

  const isDragging = useCanvasInteraction((s) => s.isDragging);
  const isTransforming = useCanvasInteraction((s) => s.isTransforming);
  const isEditingText = useEditorStore((s) => Boolean(s.editingTextId));

  const selectedSlot = mode === 'collage' ? slots?.find((s) => s.id === selectedId) : undefined;
  const selectedElement = mode === 'single' ? elements.find((e) => e.id === selectedId) : undefined;

  const hasSlotSection = Boolean(selectedSlot);
  const hasElementSection = Boolean(selectedElement) && selectedIds.length <= 1;
  const hasMultiSection = selectedIds.length >= 2;

  // 🧷 قاعدة السكون (Rest State Invariant): يظهر الشريط فقط في حالة السكون
  // التام للعناصر. يختفي تماماً أثناء السحب أو التحجيم أو تدوير المقابض
  // أو تحرير النصوص، ليتيح رؤية كاملة للمرسم ودلائل المحاذاة، ثم يعود
  // للظهور بسلاسة بعد الاستقرار.
  if (
    printMode ||
    isContextMenuOpen ||
    isDragging ||
    isTransforming ||
    isEditingText ||
    (!hasSlotSection && !hasElementSection && !hasMultiSection)
  ) {
    return null;
  }

  const handleOpenFileForSlot = async () => {
    if (!selectedSlot || isFileDialogOpen) return;
    setIsFileDialogOpen(true);
    try {
      const [b64] = await openImageFileDialog(false);
      if (b64) {
        const srcToUse = await persistPickedImage(b64);
        setSlotImage(selectedSlot.id, srcToUse);
        if (isAutoFillGridEnabled()) {
          fillAllSlots(srcToUse, selectedSlot.id);
        }
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setIsFileDialogOpen(false);
    }
  };

  // جسم الشريط مشترك بين المسارين (الديناميكي والاحتياطي)
  const barBody = (
    <div className="bg-card/95 dark:bg-card/95 backdrop-blur-md border border-border/40 shadow-fluent-8 rounded-lg px-1 py-0.5 flex items-center gap-0.5 text-muted-foreground fluent-specular max-w-full overflow-x-auto">
      {/* وضع الكولاج - الخلية المحددة */}
      {hasSlotSection && selectedSlot && (
        <QuickBarSlotSection
          slot={selectedSlot}
          onOpenFileForSlot={handleOpenFileForSlot}
          isBusy={isFileDialogOpen}
        />
      )}

      {/* وضع التحديد المتعدد (Multi-Selection Mode) */}
      {hasMultiSection && <QuickBarMultiSelectionSection selectedIds={selectedIds} />}

      {/* وضع التعديل الحر - عنصر فردي */}
      {hasElementSection && selectedElement && <QuickBarElementSection element={selectedElement} />}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectElement(null)}
            className="h-6 w-6 p-0 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground ms-0.5 cursor-pointer"
            aria-label="إغلاق الشريط"
          >
            <X className="w-3 h-3" weight="regular" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">إغلاق الشريط</TooltipContent>
      </Tooltip>
    </div>
  );

  // 🧷 السقوط الآمن: تعذّر قياس الورقة (تركيبات اختبارية بلا editor-canvas،
  // أو الإطار الأول قبل القياس) → يُرسم الشريط مخفياً (invisible) في DOM
  // بدل الاختفاء التام (فلا تنكسر الاختبارات) وبدل الوميض فوق المساطر
  // قبل أول قياس — متى قِيست الورقة حلّ الشريط المموضع محله.
  if (!canvasBox || canvasBox.width < 2 || canvasBox.height < 2) {
    const legacyBar = (
      <div
        ref={attachBar}
        dir="rtl"
        data-testid="canvas-quick-bar"
        className="absolute top-3 left-1/2 -translate-x-1/2 z-(--z-quick-bar) pointer-events-auto no-print font-cairo select-none animate-in fade-in-50 slide-in-from-top-3 duration-200 max-w-[calc(100%-1.5rem)] invisible"
      >
        {barBody}
      </div>
    );
    return overlayHost ? createPortal(legacyBar, overlayHost) : legacyBar;
  }

  // 📐 صندوق المرساة (بكسل داخل الورقة): الخلية المحددة، أو الاتحاد المحيط
  // للعناصر المحددة (يشمل AABB بعد الدوران لكل عنصر)
  let anchor: AnchorBox | null = null;
  let topClearancePx = GAP_PX;
  let bottomClearancePx = GAP_PX;
  if (mode === 'collage' && selectedSlot) {
    // 📐 نفس هندسة المرسم بالضبط (collage-geometry) لكن بالبكسل الكانفسي،
    // ثم تُقاس إلى بكسل العرض — فلا ينحرف الشريط عن الخلية المرسومة فعلاً.
    const hasPhysicalLayout = Boolean(collageTemplate?.physicalLayout);
    const geo = getCollageGeometry(
      canvasWidth,
      canvasHeight,
      collageMargin,
      collageGap,
      hasPhysicalLayout,
    );
    const rect = getSlotRect(selectedSlot, geo);
    const sx = canvasWidth > 0 ? canvasBox.width / canvasWidth : 1;
    const sy = canvasHeight > 0 ? canvasBox.height / canvasHeight : 1;
    anchor = {
      left: rect.left * sx,
      top: rect.top * sy,
      width: Math.max(1, rect.width * sx),
      height: Math.max(1, rect.height * sy),
    };
    if (selectedIds.length <= 1) {
      const availableDirs = getAvailableAdjacentSlotDirections(
        selectedSlot,
        slots,
        geo,
        collageGap,
        hasPhysicalLayout,
      );
      if (availableDirs.includes('top')) topClearancePx = GAP_PX + 24;
      if (availableDirs.includes('bottom')) bottomClearancePx = GAP_PX + 24;
    }
  } else if (mode === 'single') {
    const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    const chosen = elements.filter((e) => ids.includes(e.id));
    if (chosen.length > 0 && canvasWidth > 0 && canvasHeight > 0) {
      const cw = canvasBox.width;
      const ch = canvasBox.height;
      anchor = chosen.reduce<AnchorBox | null>((acc, el) => {
        const box = pixelBoxOfElement(el, canvasWidth, canvasHeight, cw, ch);
        if (!acc) return box;
        const minX = Math.min(acc.left, box.left);
        const minY = Math.min(acc.top, box.top);
        return {
          left: minX,
          top: minY,
          width: Math.max(acc.left + acc.width, box.left + box.width) - minX,
          height: Math.max(acc.top + acc.height, box.top + box.height) - minY,
        };
      }, null);

      const allLocked = chosen.every((el) => el.locked);
      if (!allLocked) {
        // عندما يكون العنصر الفردي مقلوباً (قريباً من 180°)، يتجه مقبض التدوير للأسفل
        // بدلاً من الأعلى؛ وفي جميع الحالات الأخرى يتجه للأعلى فيتطلب خلوصاً علوياً.
        if (chosen.length === 1) {
          const rot = (((chosen[0].rotation ?? 0) % 360) + 360) % 360;
          const rotaterPointsDown = rot >= 135 && rot <= 225;
          if (rotaterPointsDown) {
            bottomClearancePx = GAP_PX + ROTATE_ANCHOR_CLEARANCE_PX;
          } else {
            topClearancePx = GAP_PX + ROTATE_ANCHOR_CLEARANCE_PX;
          }
        } else {
          topClearancePx = GAP_PX + ROTATE_ANCHOR_CLEARANCE_PX;
        }
      }
    }
  }

  if (!anchor) return null;

  const cw = canvasBox.width;
  const ch = canvasBox.height;

  // 📐 التموضع: أفقي فوق منتصف المرساة مقصوصاً بحدود الورقة؛ رأسي فوق المرساة
  // أولاً، ثم تحتها إن ضاقت المساحة، ثم القِ بأعلى الورقة كحل أخير.
  const barW = barSize.w;
  const barH = barSize.h;

  // 🛡️ عرض فعّال: الورقة الضيقة (هوية صغيرة) أضيق من الشريط أحياناً —
  // القص القديم كان ينهار (الحد الأعلى < الأدنى) فيبرز الشريط يمين الورقة.
  const effW = Math.min(barW, Math.max(0, cw - 2 * EDGE_PX));
  let barLeft = anchor.left + anchor.width / 2 - effW / 2;
  barLeft = Math.max(EDGE_PX, Math.min(barLeft, cw - effW - EDGE_PX));

  let barTop = anchor.top - barH - topClearancePx;
  let originY: 'bottom' | 'top' = 'bottom';
  if (barTop < EDGE_PX) {
    const below = anchor.top + anchor.height + bottomClearancePx;
    if (below + barH <= ch - EDGE_PX) {
      barTop = below;
      originY = 'top';
    } else {
      barTop = EDGE_PX;
    }
  }

  // إزاحة الورقة داخل حاوية العناصر العائمة (مساطر + هوامش مساحة العمل)
  barLeft += canvasBox.left;
  barTop += canvasBox.top;

  const bar = (
    <div
      ref={attachBar}
      dir="rtl"
      data-testid="canvas-quick-bar"
      className="absolute z-(--z-quick-bar) pointer-events-auto no-print font-cairo select-none animate-in fade-in-50 zoom-in-95 duration-150 transition-[left,top] ease-out"
      style={{
        left: `${barLeft}px`,
        top: `${barTop}px`,
        maxWidth: `${Math.max(120, cw - 2 * EDGE_PX)}px`,
        transformOrigin: `${originY} center`,
      }}
    >
      {barBody}
    </div>
  );

  // داخل لوح الكانفاس إن توفّر؛ وإلا يُرسم في مكانه (السقوط على حاوية الكانفاس
  // نفسها) — فلا يعتمد المكوّن على تركيبه في اللوح ليعمل.
  return overlayHost ? createPortal(bar, overlayHost) : bar;
});
