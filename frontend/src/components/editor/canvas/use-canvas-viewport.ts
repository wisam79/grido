import { useEffect, useRef, useState, type RefObject } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { clampZoomRaw } from '@/lib/canvas/zoom';
import { computeCanvasDisplay } from '@/lib/canvas/fit';

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

  // 1. مراقبة أبعاد نافذة العرض الحقيقية عبر ResizeObserver
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewportSize((prev) => {
            if (Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5) return prev;
            return { w: Math.round(width), h: Math.round(height) };
          });
        }
      }
    });

    ro.observe(node);
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setViewportSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    }

    return () => ro.disconnect();
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

        const factor = Math.exp(-e.deltaY * 0.003);
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
        // تمرير عادي بعجلة الفأرة أو لوحة اللمس (Document Scroll with bounds)
        const currentStagePos = stagePosRef.current;
        const curW = displayWRef.current;
        const curH = displayHRef.current;

        const targetX = currentStagePos.x - e.deltaX;
        const targetY = currentStagePos.y - e.deltaY;

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
