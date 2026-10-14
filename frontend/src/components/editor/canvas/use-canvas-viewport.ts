import { useEffect, useRef, useState, type RefObject } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { clampZoomRaw } from '@/lib/canvas/zoom';
import { computeCanvasDisplay } from '@/lib/canvas/fit';

/**
 * تطبيع دلتا العجلة — توثيق Konva الرسمي يفترض deltaY بالبكسل،
 * لكن Firefox وبعض لوحات اللمس ترسل deltaMode خطوط/صفحات.
 */
function normalizeWheelDelta(e: WheelEvent, viewportW: number, viewportH: number) {
  let { deltaX, deltaY } = e;
  const { deltaMode } = e;
  if (deltaMode === 1) {
    // خطوط → بكسل (القيمة التقليدية 16px للسطر)
    deltaX *= 16;
    deltaY *= 16;
  } else if (deltaMode === 2) {
    deltaX *= viewportW;
    deltaY *= viewportH;
  }
  return { deltaX, deltaY };
}

const WHEEL_ZOOM_SENSITIVITY = 0.003; // مطابق لـ Math.exp(-dy*0.003) السابق — أسّي ناعم

/**
 * عناصر تستهلك مفتاح المسافة نيابة عن المستخدم: حقول الكتابة (تكتب مسافة)
 * والأزرار/الروابط (تُفعَّل بالنقر على المسافة). ابتلاعها بـ preventDefault
 * كان يمنع المسافة داخل نص أو يُلغي تفعيل زر بعد النقر عليه.
 */
const SPACE_CONSUMED_TAGS = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'BUTTON',
  'A',
  'SUMMARY',
]);

export function isSpaceHandledByTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return SPACE_CONSUMED_TAGS.has(el.tagName) || el.isContentEditable === true;
}

/**
 * تقييد موضع الورقة لمنع التمرير اللانهائي وضياع الورقة في الفراغ:
 * 1. في وضع التمرير بالعجلة (wheel): إن كانت الورقة تلائم الشاشة تُثبَّت في المنتصف،
 *    وإن كانت أطول من الشاشة (زوم أو ملاءمة العرض) يُسمح بالتمرير بين أعلى وأسفل الورقة فقط.
 * 2. في وضع التحريك الحر (freePan - مفتاح المسافة أو الزر الأوسط): يُسمح بحرية واسعة
 *    مع ضمان بقاء جزء مريح (150px) من الورقة ظاهراً داخل الشاشة دائماً.
 */
export function clampStagePos(
  pos: { x: number; y: number },
  displayW: number,
  displayH: number,
  viewportW: number,
  viewportH: number,
  mode: 'wheel' | 'freePan' = 'freePan',
): { x: number; y: number } {
  if (mode === 'wheel') {
    let x = pos.x;
    let y = pos.y;

    // 1. المحور الرأسي Y عند تدوير عجلة الفأرة العادية
    if (displayH <= viewportH) {
      // الورقة تلائم النافذة رأسياً: تثبيت في المنتصف تماماً
      y = Math.round((viewportH - displayH) / 2);
    } else {
      // الورقة أطول من النافذة: التمرير بين أعلى وأسفل الورقة بهامش 40px
      const minY = viewportH - displayH - 40;
      const maxY = 40;
      y = Math.max(minY, Math.min(maxY, y));
    }

    // 2. المحور الأفقي X عند تدوير عجلة الفأرة الأفقية / لوحة اللمس
    if (displayW <= viewportW) {
      // الورقة تلائم النافذة أفقياً: تثبيت في المنتصف تماماً
      x = Math.round((viewportW - displayW) / 2);
    } else {
      // الورقة أعرض من النافذة: التمرير بين حافتيها بهامش 40px
      const minX = viewportW - displayW - 40;
      const maxX = 40;
      x = Math.max(minX, Math.min(maxX, x));
    }

    return { x: Math.round(x), y: Math.round(y) };
  }

  // التحريك الحر بمفتاح المسافة (Free Pan):
  // ضمان بقاء جزء كافٍ من الورقة مرئياً على الشاشة حتى لا تضيع في الفضاء الخارجي
  const minVisible = Math.max(40, Math.min(150, Math.min(displayW, displayH) * 0.4));
  const minX = minVisible - displayW;
  const maxX = viewportW - minVisible;
  const minY = minVisible - displayH;
  const maxY = viewportH - minVisible;

  return {
    x: Math.round(Math.max(minX, Math.min(maxX, pos.x))),
    y: Math.round(Math.max(minY, Math.min(maxY, pos.y))),
  };
}

/**
 * 🧭 useCanvasViewport — محرك Viewport الكانفاس الحقيقي (Figma-grade Canvas Engine)
 *
 * يدير إحداثيات وموضع مسرح الكانفاس (Stage Position & Scale) نسبةً لنافذة العرض الكاملة:
 * 1. الـ Stage يملأ 100% من الحاوية ولا تتغير أبعاده مع الزوم (حماية VRAM من إعادة التخصيص).
 * 2. التكبير والتصغير نسبي لنقطة المؤشر (Zooming Relative to Pointer) بتراكم أسي لحظي.
 * 3. التحريك الحر عبر مفتاح المسافة (Space-Pan) مقيّد بحدود ذكية تمنع هروب الورقة نهائياً.
 * 4. عجلة الفأرة العادية تمرر داخل حدود المستند فقط ولا تُحرّك الورقة إن كانت ملائمة للشاشة.
 * 5. التوسيط مشتق رياضياً (Centered by Construction): الورقة تتوسط النافذة طبيعياً وبلا شلالات رندر.
 */
export function useCanvasViewport(
  containerRef: RefObject<HTMLDivElement | null>,
  _innerRef?: RefObject<HTMLDivElement | null>,
) {
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const canvasZoom = useEditorStore((s) => s.canvasZoom);
  const setCanvasZoom = useEditorStore((s) => s.setCanvasZoom);
  const canvasFitMode = useEditorStore((s) => s.canvasFitMode);

  const [viewportSize, setViewportSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const mode = useEditorStore((s) => s.mode);

  const aspect = canvasWidth / (canvasHeight || 1);

  // أبعاد الورقة المعروضة حالياً وفق الوضع والزوم
  const displayMetrics = computeCanvasDisplay({
    containerW: viewportSize.w,
    containerH: viewportSize.h,
    aspect,
    zoom: canvasZoom,
    fitMode: canvasFitMode,
    canvasW: canvasWidth,
    canvasH: canvasHeight,
  });

  const { displayW, displayH, resolved: resolvedFitMode, leftoverRatio } = displayMetrics;

  // إحداثيات الورقة في مساحة العمل مشتقة رياضياً: المركز التلقائي + إزاحة المستخدم (Pan)
  const defaultCenterX = Math.round((viewportSize.w - displayW) / 2);
  const defaultCenterY = Math.round((viewportSize.h - displayH) / 2);

  const rawStagePos = {
    x: defaultCenterX + pan.x,
    y: defaultCenterY + pan.y,
  };

  // تقييد إحداثيات الورقة حتى لا تضيع في الفضاء الخارجي أبداً
  const stagePos = clampStagePos(
    rawStagePos,
    displayW,
    displayH,
    viewportSize.w,
    viewportSize.h,
    'freePan',
  );

  const viewportSizeRef = useRef(viewportSize);
  const displayWRef = useRef(displayW);
  const displayHRef = useRef(displayH);
  const stagePosRef = useRef(stagePos);

  useEffect(() => {
    viewportSizeRef.current = viewportSize;
    displayWRef.current = displayW;
    displayHRef.current = displayH;
    stagePosRef.current = stagePos;
  });

  // تجميد قياس الحاوية أثناء حركة اللوح الجانبي (fluent-panel-motion 100ms)
  // لمنع تقلب resolveFitMode (height ↔ width) عند العرض الوسيط 472↔1168px
  const freezeUntilRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSizeRef = useRef<{ w: number; h: number } | null>(null);
  const isFirstMeasureRef = useRef(true);
  const didMountRef = useRef(false);

  useEffect(() => {
    // تخطّي التركيب الأول — التجميد للتبديلات اللاحقة فقط، وإلا يتأخر القياس الأول 220ms ويبقى 800×600
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    // أي تبديل وضع يعقبه حركة لوح 100ms — جمّد الحساب 220ms
    freezeUntilRef.current = Date.now() + 220;
    // إلغاء أي debounce معلق وإعادة جدولته ليطبق المقاس النهائي فقط
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingSizeRef.current) {
      const p = pendingSizeRef.current;
      pendingSizeRef.current = null;
      const delay = Math.max(0, freezeUntilRef.current - Date.now());
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        setViewportSize((prev) => {
          if (Math.abs(prev.w - p.w) < 0.5 && Math.abs(prev.h - p.h) < 0.5) return prev;
          return { w: p.w, h: p.h };
        });
      }, delay);
    }
    return () => {
      // تنظيف مشترك عند إلغاء التركيب/التبديل — المالك الوحيد debounceTimerRef أصبح هذا الأثر + الآتي
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [mode]);

  // 1. مراقبة أبعاد نافذة العرض الحقيقية عبر ResizeObserver (debounced)
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const applySize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      const nw = Math.round(w);
      const nh = Math.round(h);
      const now = Date.now();
      if (now < freezeUntilRef.current) {
        pendingSizeRef.current = { w: nw, h: nh };
        return;
      }
      setViewportSize((prev) => {
        if (Math.abs(prev.w - nw) < 0.5 && Math.abs(prev.h - nh) < 0.5) return prev;
        return { w: nw, h: nh };
      });
    };

    // القياس الأول فوري بلا freeze/debounce لتجنب وميض 800×600
    const applyImmediateIfFirst = (w: number, h: number): boolean => {
      if (!isFirstMeasureRef.current) return false;
      isFirstMeasureRef.current = false;
      const nw = Math.round(w);
      const nh = Math.round(h);
      if (nw <= 0 || nh <= 0) return true;
      setViewportSize((prev) => {
        if (Math.abs(prev.w - nw) < 0.5 && Math.abs(prev.h - nh) < 0.5) return prev;
        return { w: nw, h: nh };
      });
      return true;
    };

    const scheduleApply = (w: number, h: number) => {
      if (applyImmediateIfFirst(w, h)) return;
      pendingSizeRef.current = { w: Math.round(w), h: Math.round(h) };
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      const delay = Math.max(80, freezeUntilRef.current - Date.now());
      // خارج فترة التجميد: 80ms كافية لدمج إطارات الحركة 100ms في مقاس واحد
      // داخل التجميد: الانتظار حتى انتهائه + 80ms
      debounceTimerRef.current = setTimeout(
        () => {
          debounceTimerRef.current = null;
          const p = pendingSizeRef.current;
          pendingSizeRef.current = null;
          if (p) applySize(p.w, p.h);
        },
        delay > 80 && delay < 500 ? delay : 80,
      );
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        scheduleApply(width, height);
      }
    });

    ro.observe(node);
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      // القياس الأول فوري بلا freeze/debounce لتجنب وميض أولي (يتجاوز freezeUntil)
      applyImmediateIfFirst(rect.width, rect.height);
    }

    return () => {
      ro.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [containerRef]);

  // 2. معالجة أحداث الفأرة (Wheel Zoom & Panning)
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const spacePressedRef = { current: false };
    const isPointerPanningRef = { current: false };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const vW = viewportSizeRef.current.w;
      const vH = viewportSizeRef.current.h;

      if (e.ctrlKey || e.metaKey) {
        // زوم تتبع المؤشر (Zooming Relative to Pointer)
        const rect = node.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        const currentStagePos = stagePosRef.current;
        const currentDisplayW = displayWRef.current || 1;
        const currentDisplayH = displayHRef.current || 1;

        const paperFracX = (pointerX - currentStagePos.x) / currentDisplayW;
        const paperFracY = (pointerY - currentStagePos.y) / currentDisplayH;

        const { deltaY: normDeltaY } = normalizeWheelDelta(e, vW, vH);
        const factor = Math.exp(-normDeltaY * WHEEL_ZOOM_SENSITIVITY);
        const state = useEditorStore.getState();
        const currentZ = state.canvasZoom;
        const nextZ = clampZoomRaw(currentZ * factor);

        const nextMetrics = computeCanvasDisplay({
          containerW: vW,
          containerH: vH,
          aspect: state.canvasWidth / (state.canvasHeight || 1),
          zoom: nextZ,
          fitMode: state.canvasFitMode,
          canvasW: state.canvasWidth,
          canvasH: state.canvasHeight,
        });

        const nextPaperX = pointerX - paperFracX * nextMetrics.displayW;
        const nextPaperY = pointerY - paperFracY * nextMetrics.displayH;

        const clamped = clampStagePos(
          { x: nextPaperX, y: nextPaperY },
          nextMetrics.displayW,
          nextMetrics.displayH,
          vW,
          vH,
          'freePan',
        );

        const newCenterX = Math.round((vW - nextMetrics.displayW) / 2);
        const newCenterY = Math.round((vH - nextMetrics.displayH) / 2);

        setPan({
          x: clamped.x - newCenterX,
          y: clamped.y - newCenterY,
        });
        setCanvasZoom(nextZ);
      } else {
        // تمرير عادي بعجلة الفأرة أو لوحة اللمس (Document Scroll with bounds) — مع تطبيع deltaMode
        const currentStagePos = stagePosRef.current;
        const curW = displayWRef.current;
        const curH = displayHRef.current;
        const { deltaX, deltaY } = normalizeWheelDelta(e, vW, vH);

        const targetX = currentStagePos.x - deltaX;
        const targetY = currentStagePos.y - deltaY;

        const clamped = clampStagePos({ x: targetX, y: targetY }, curW, curH, vW, vH, 'wheel');

        const curCenterX = Math.round((vW - curW) / 2);
        const curCenterY = Math.round((vH - curH) / 2);

        setPan({
          x: clamped.x - curCenterX,
          y: clamped.y - curCenterY,
        });
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && spacePressedRef.current)) {
        e.preventDefault();
        isPointerPanningRef.current = true;
        setIsPanning(true);
        node.style.cursor = 'grabbing';
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp, { once: true });
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPointerPanningRef.current) {
        e.preventDefault();
        const vW = viewportSizeRef.current.w;
        const vH = viewportSizeRef.current.h;
        const curW = displayWRef.current;
        const curH = displayHRef.current;
        const currentStagePos = stagePosRef.current;

        const targetX = currentStagePos.x + e.movementX;
        const targetY = currentStagePos.y + e.movementY;

        const clamped = clampStagePos({ x: targetX, y: targetY }, curW, curH, vW, vH, 'freePan');

        const curCenterX = Math.round((vW - curW) / 2);
        const curCenterY = Math.round((vH - curH) / 2);

        setPan({
          x: clamped.x - curCenterX,
          y: clamped.y - curCenterY,
        });
      }
    };

    const handlePointerUp = () => {
      isPointerPanningRef.current = false;
      setIsPanning(false);
      node.style.cursor = spacePressedRef.current ? 'grab' : '';
      window.removeEventListener('pointermove', handlePointerMove);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceHandledByTarget(e.target)) {
        e.preventDefault();
        if (!spacePressedRef.current) {
          spacePressedRef.current = true;
          node.style.cursor = 'grab';
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        if (!isPointerPanningRef.current) {
          node.style.cursor = '';
        }
      }
    };

    const handleBlur = () => {
      spacePressedRef.current = false;
      isPointerPanningRef.current = false;
      setIsPanning(false);
      node.style.cursor = '';
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    node.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      node.removeEventListener('wheel', handleWheel);
      node.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pointermove', handlePointerMove);
      // 🛡️ فكّ التركيب أثناء السحب كان يُبقي pointerup معلقاً (once) يغلق
      // على node ميتة مع بقاء راية السحب — التنظيف ينهي الحالة بقوة.
      window.removeEventListener('pointerup', handlePointerUp);
      isPointerPanningRef.current = false;
    };
  }, [containerRef, setCanvasZoom]);

  return {
    viewportSize,
    stagePos,
    displayW,
    displayH,
    effectiveZoom: canvasZoom,
    stageScale: canvasWidth > 0 ? displayW / canvasWidth : 1,
    resolvedFitMode,
    leftoverRatio,
    isPanning,
    setStagePos: (
      pos:
        { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number }),
    ) => {
      const vW = viewportSize.w;
      const vH = viewportSize.h;
      const target = typeof pos === 'function' ? pos(stagePos) : pos;
      const clamped = clampStagePos(target, displayW, displayH, vW, vH, 'freePan');
      const curCenterX = Math.round((vW - displayW) / 2);
      const curCenterY = Math.round((vH - displayH) / 2);
      setPan({
        x: clamped.x - curCenterX,
        y: clamped.y - curCenterY,
      });
    },
    resetPan: () => setPan({ x: 0, y: 0 }),
  };
}
