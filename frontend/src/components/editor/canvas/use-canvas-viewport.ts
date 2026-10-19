import { useEffect, useRef, useState, type RefObject } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { clampZoomRaw } from '@/lib/canvas/zoom';
import { computeCanvasDisplay, CANVAS_FIT_PADDING } from '@/lib/canvas/fit';
import { RESET_CANVAS_PAN_EVENT } from '@/hooks/use-canvas-zoom';
import { useStageRef } from '@/lib/canvas/stage-context';
import { useStableViewportSize } from './use-stable-viewport-size';

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
 * حساب الموضع الافتراضي غير المزاح (Origin) لمسرح الكانفاس:
 * - إذا كان البُعد أصغر من أو يساوي النافذة، يُوسَّط تماماً.
 * - إذا كان البُعد أكبر من النافذة (مثل الارتفاع في ملاءمة العرض أو الحجم الفعلي 1:1)،
 *   يبدأ من هامش الحماية العلوي/الجانبي (padding / 2) حتى لا يُقطع رأس أو جانب الورقة.
 */
export function computeDefaultStageOrigin(
  displayW: number,
  displayH: number,
  viewportW: number,
  viewportH: number,
  padding = CANVAS_FIT_PADDING,
): { x: number; y: number } {
  const margin = Math.round(padding / 2);
  const x = displayW <= viewportW ? Math.round((viewportW - displayW) / 2) : margin;
  const y = displayH <= viewportH ? Math.round((viewportH - displayH) / 2) : margin;
  return { x, y };
}

/**
 * تقييد موضع الورقة لمنع التمرير اللانهائي وضياع الورقة في الفراغ:
 * يسمح بالتحريك الحر على المحورين (عجلة / لوحة لمس / مسافة / الزر الأوسط)
 * مع ضمان بقاء جزء مريح (40–150px) من الورقة ظاهراً داخل الشاشة دائماً.
 * لا يوجد وضع Wheel منفصل يفرض التوسيط، لأن فرضه كان يسبب snap-back مزعجاً
 * على لوحات اللمس عند محاولة التمرير.
 */
export function getStageClampBounds(
  displayW: number,
  displayH: number,
  viewportW: number,
  viewportH: number,
): { minX: number; maxX: number; minY: number; maxY: number; minVisible: number } {
  const minVisible = Math.max(40, Math.min(150, Math.min(displayW, displayH) * 0.4));
  const minX = minVisible - displayW;
  const maxX = viewportW - minVisible;
  const minY = minVisible - displayH;
  const maxY = viewportH - minVisible;

  return { minX, maxX, minY, maxY, minVisible };
}

export function clampStagePos(
  pos: { x: number; y: number },
  displayW: number,
  displayH: number,
  viewportW: number,
  viewportH: number,
): { x: number; y: number } {
  const { minX, maxX, minY, maxY } = getStageClampBounds(displayW, displayH, viewportW, viewportH);

  return {
    x: Math.max(minX, Math.min(maxX, pos.x)),
    y: Math.max(minY, Math.min(maxY, pos.y)),
  };
}

/**
 * 🧭 useCanvasViewport — محرك Viewport الكانفاس الحقيقي (Figma-grade Canvas Engine)
 *
 * يدير إحداثيات وموضع مسرح الكانفاس (Stage Position & Scale) نسبةً لنافذة العرض الكاملة:
 * 1. الـ Stage يملأ 100% من الحاوية ولا تتغير أبعاده مع الزوم (حماية VRAM من إعادة التخصيص).
 * 2. التكبير والتصغير نسبي لنقطة المؤشر (Zooming Relative to Pointer) بتراكم أسي لحظي.
 * 3. التحريك الحر عبر مفتاح المسافة أو الزر الأوسط مقيّد بحدود ذكية تمنع هروب الورقة نهائياً.
 * 4. عجلة الفأرة ولوحة اللمس تمرران الورقة على المحورين بلا snap-back أو فرض توسيط.
 * 5. التوسيط مشتق رياضياً (Centered by Construction): الورقة تتوسط النافذة طبيعياً وبلا شلالات رندر.
 */
export function useCanvasViewport(
  containerRef: RefObject<HTMLDivElement | null>,
  innerRef?: RefObject<HTMLDivElement | null>,
) {
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const canvasZoom = useEditorStore((s) => s.canvasZoom);
  const setCanvasZoom = useEditorStore((s) => s.setCanvasZoom);
  const canvasFitMode = useEditorStore((s) => s.canvasFitMode);

  const stageRef = useStageRef();
  const viewportSize = useStableViewportSize(containerRef);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [prevGeomKey, setPrevGeomKey] = useState(
    () => `${canvasFitMode}:${canvasWidth}:${canvasHeight}`,
  );
  const currentGeomKey = `${canvasFitMode}:${canvasWidth}:${canvasHeight}`;

  // تصفير إزاحة التحريك عند تغيّر وضع الملاءمة أو أبعاد الورقة أثناء التصيير
  if (prevGeomKey !== currentGeomKey) {
    setPrevGeomKey(currentGeomKey);
    setPan({ x: 0, y: 0 });
  }

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

  // إحداثيات الورقة في مساحة العمل مشتقة رياضياً: المركز/البداية التلقائية + إزاحة المستخدم (Pan)
  const defaultOrigin = computeDefaultStageOrigin(
    displayW,
    displayH,
    viewportSize.w,
    viewportSize.h,
  );

  const rawStagePos = {
    x: defaultOrigin.x + pan.x,
    y: defaultOrigin.y + pan.y,
  };

  // تقييد إحداثيات الورقة حتى لا تضيع في الفضاء الخارجي أبداً
  const stagePos = clampStagePos(rawStagePos, displayW, displayH, viewportSize.w, viewportSize.h);

  const viewportSizeRef = useRef(viewportSize);
  const displayWRef = useRef(displayW);
  const displayHRef = useRef(displayH);
  const stagePosRef = useRef(stagePos);
  const wheelCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPanPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    viewportSizeRef.current = viewportSize;
    displayWRef.current = displayW;
    displayHRef.current = displayH;
    stagePosRef.current = stagePos;
  });

  // 1. معالجة أحداث الفأرة (Wheel Zoom & Panning)
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const spacePressedRef = { current: false };
    const isPointerPanningRef = { current: false };

    let wheelRafId: number | null = null;
    let wheelPanX = 0;
    let wheelPanY = 0;
    let wheelZoomDelta = 0;
    let wheelClientX = 0;
    let wheelClientY = 0;
    let wheelIsZoom = false;

    const applyImperativeTransform = (pos: { x: number; y: number }) => {
      // 1. مسرح Konva وتصيير بكسلاته على الـ GPU فورياً
      if (stageRef.current) {
        stageRef.current.position(pos);
        stageRef.current.batchDraw();
      }
      // 2. غلاف عناصر الـ HTML الطافية بالـ GPU Compositor
      if (innerRef?.current) {
        innerRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      }
      // 3. تدريج المساطر وعصي التمرير فلوينت
      const shell = node.closest('[data-testid="workspace-canvas-shell"]');
      if (shell) {
        const dx = pos.x - initialPanPosRef.current.x;
        const dy = pos.y - initialPanPosRef.current.y;
        const hContent = shell.querySelector('#h-ruler-content') as SVGGElement | null;
        const vContent = shell.querySelector('#v-ruler-content') as SVGGElement | null;
        if (hContent) hContent.style.transform = `translate3d(${dx}px, 0, 0)`;
        if (vContent) vContent.style.transform = `translate3d(0, ${dy}px, 0)`;

        // 🧭 تزامن عصي التمرير فلوينت بالـ GPU Compositor فورياً (Zero-Latency Scrollbars)
        const vW = viewportSizeRef.current.w;
        const vH = viewportSizeRef.current.h;
        const curW = displayWRef.current;
        const curH = displayHRef.current;
        const bounds = getStageClampBounds(curW, curH, vW, vH);

        const hThumb = shell.querySelector('[data-canvas-h-thumb]') as HTMLElement | null;
        if (hThumb) {
          const spanX = bounds.maxX - bounds.minX;
          const tx = spanX > 0 ? Math.max(0, Math.min(1, (bounds.maxX - pos.x) / spanX)) : 0.5;
          const totalRangeX = spanX + vW;
          const ratioX = totalRangeX > 0 ? Math.min(1, vW / totalRangeX) : 1;
          const trackLength = Math.max(40, vW);
          const thumbLength = Math.max(28, Math.min(trackLength, Math.round(trackLength * ratioX)));
          const maxOffset = Math.max(0, trackLength - thumbLength);
          const offset = Math.round(tx * maxOffset);
          hThumb.style.width = `${thumbLength}px`;
          hThumb.style.transform = `translate3d(${offset}px, 0, 0)`;
          hThumb.dataset.maxOffset = maxOffset.toString();
        }

        const vThumb = shell.querySelector('[data-canvas-v-thumb]') as HTMLElement | null;
        if (vThumb) {
          const spanY = bounds.maxY - bounds.minY;
          const ty = spanY > 0 ? Math.max(0, Math.min(1, (bounds.maxY - pos.y) / spanY)) : 0.5;
          const totalRangeY = spanY + vH;
          const ratioY = totalRangeY > 0 ? Math.min(1, vH / totalRangeY) : 1;
          const trackLength = Math.max(40, vH);
          const thumbLength = Math.max(28, Math.min(trackLength, Math.round(trackLength * ratioY)));
          const maxOffset = Math.max(0, trackLength - thumbLength);
          const offset = Math.round(ty * maxOffset);
          vThumb.style.height = `${thumbLength}px`;
          vThumb.style.transform = `translate3d(0, ${offset}px, 0)`;
          vThumb.dataset.maxOffset = maxOffset.toString();
        }
      }
    };

    const resetRulerTransforms = () => {
      const shell = node.closest('[data-testid="workspace-canvas-shell"]');
      if (shell) {
        const hContent = shell.querySelector('#h-ruler-content') as SVGGElement | null;
        const vContent = shell.querySelector('#v-ruler-content') as SVGGElement | null;
        if (hContent) hContent.style.transform = '';
        if (vContent) vContent.style.transform = '';
      }
    };

    const normalizeWheelDelta = (
      axis: 'x' | 'y',
      delta: number,
      deltaMode: number,
      vW: number,
      vH: number,
    ) => {
      if (deltaMode === 1) return delta * 16;
      if (deltaMode === 2) return delta * (axis === 'x' ? vW : vH);
      return delta;
    };

    const flushWheel = () => {
      wheelRafId = null;
      const vW = viewportSizeRef.current.w;
      const vH = viewportSizeRef.current.h;

      // هل هذا زوم مقصود؟ في التاتش باد نرفض الرعشات الدقيقة (< 0.5px) لمنع تعطيل التمرير
      const hasDeliberateZoom = wheelIsZoom && Math.abs(wheelZoomDelta) >= 0.5;

      if (hasDeliberateZoom) {
        if (wheelCommitTimerRef.current !== null) {
          clearTimeout(wheelCommitTimerRef.current);
          wheelCommitTimerRef.current = null;
        }
        resetRulerTransforms();

        // زوم تتبع المؤشر (Zooming Relative to Pointer)
        const rect = node.getBoundingClientRect();
        const pointerX = wheelClientX - rect.left;
        const pointerY = wheelClientY - rect.top;

        const currentStagePos = stagePosRef.current;
        const currentDisplayW = displayWRef.current || 1;
        const currentDisplayH = displayHRef.current || 1;

        const paperFracX = (pointerX - currentStagePos.x) / currentDisplayW;
        const paperFracY = (pointerY - currentStagePos.y) / currentDisplayH;

        const factor = Math.exp(-wheelZoomDelta * 0.003);
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

        // دمج أي إزاحة تحريك مصاحبة لحركة القرص في نفس الإطار
        const nextPaperX = pointerX - paperFracX * nextMetrics.displayW - wheelPanX;
        const nextPaperY = pointerY - paperFracY * nextMetrics.displayH - wheelPanY;

        const clamped = clampStagePos(
          { x: nextPaperX, y: nextPaperY },
          nextMetrics.displayW,
          nextMetrics.displayH,
          vW,
          vH,
        );

        const newOrigin = computeDefaultStageOrigin(
          nextMetrics.displayW,
          nextMetrics.displayH,
          vW,
          vH,
        );

        stagePosRef.current = clamped;
        setPan({
          x: clamped.x - newOrigin.x,
          y: clamped.y - newOrigin.y,
        });
        setCanvasZoom(nextZ);

        // 🧭 تزامن مقاس وموضع عصي التمرير فلوينت فورياً عند التكبير/التصغير
        const shell = node.closest('[data-testid="workspace-canvas-shell"]');
        if (shell) {
          const hThumb = shell.querySelector('[data-canvas-h-thumb]') as HTMLElement | null;
          if (hThumb) {
            const ratioX = Math.min(1, vW / Math.max(vW, nextMetrics.displayW));
            const trackLenX = Math.max(40, vW);
            const thumbLenX = Math.max(
              28,
              Math.min(trackLenX, Math.round(trackLenX * Math.max(0.12, ratioX * 0.85))),
            );
            const maxOffX = Math.max(0, trackLenX - thumbLenX);
            const { minX, maxX } = getStageClampBounds(nextMetrics.displayW, 100, vW, 100);
            const spanX = maxX - minX;
            const tx = spanX > 0 ? Math.max(0, Math.min(1, (maxX - clamped.x) / spanX)) : 0.5;
            const offX = Math.round(tx * maxOffX);
            hThumb.style.width = `${thumbLenX}px`;
            hThumb.style.transform = `translate3d(${offX}px, 0, 0)`;
            hThumb.dataset.maxOffset = String(maxOffX);
          }
          const vThumb = shell.querySelector('[data-canvas-v-thumb]') as HTMLElement | null;
          if (vThumb) {
            const ratioY = Math.min(1, vH / Math.max(vH, nextMetrics.displayH));
            const trackLenY = Math.max(40, vH);
            const thumbLenY = Math.max(
              28,
              Math.min(trackLenY, Math.round(trackLenY * Math.max(0.12, ratioY * 0.85))),
            );
            const maxOffY = Math.max(0, trackLenY - thumbLenY);
            const { minY, maxY } = getStageClampBounds(100, nextMetrics.displayH, 100, vH);
            const spanY = maxY - minY;
            const ty = spanY > 0 ? Math.max(0, Math.min(1, (maxY - clamped.y) / spanY)) : 0.5;
            const offY = Math.round(ty * maxOffY);
            vThumb.style.height = `${thumbLenY}px`;
            vThumb.style.transform = `translate3d(0, ${offY}px, 0)`;
            vThumb.dataset.maxOffset = String(maxOffY);
          }
        }
      } else if (wheelPanX !== 0 || wheelPanY !== 0) {
        // تمرير إجرائي فوري وسلس (Konva Fast-Path) بلا ارتعاش وبلا رندر متكرر
        const currentStagePos = stagePosRef.current;
        const curW = displayWRef.current;
        const curH = displayHRef.current;

        const targetX = currentStagePos.x - wheelPanX;
        const targetY = currentStagePos.y - wheelPanY;

        const clamped = clampStagePos({ x: targetX, y: targetY }, curW, curH, vW, vH);

        stagePosRef.current = clamped;
        applyImperativeTransform(clamped);

        // تثبيت الحالة في React فقط بعد هدوء التمرير (Debounced Commit)
        if (wheelCommitTimerRef.current !== null) {
          clearTimeout(wheelCommitTimerRef.current);
        }
        wheelCommitTimerRef.current = setTimeout(() => {
          wheelCommitTimerRef.current = null;
          const vW = viewportSizeRef.current.w;
          const vH = viewportSizeRef.current.h;
          const curW = displayWRef.current;
          const curH = displayHRef.current;
          const curOrigin = computeDefaultStageOrigin(curW, curH, vW, vH);
          resetRulerTransforms();
          setPan({
            x: stagePosRef.current.x - curOrigin.x,
            y: stagePosRef.current.y - curOrigin.y,
          });
        }, 80);
      }

      wheelPanX = 0;
      wheelPanY = 0;
      wheelZoomDelta = 0;
      wheelIsZoom = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const vW = viewportSizeRef.current.w;
      const vH = viewportSizeRef.current.h;
      const dx = normalizeWheelDelta('x', e.deltaX, e.deltaMode, vW, vH);
      const dy = normalizeWheelDelta('y', e.deltaY, e.deltaMode, vW, vH);

      if (e.ctrlKey || e.metaKey) {
        wheelIsZoom = true;
        wheelZoomDelta += dy;
        wheelClientX = e.clientX;
        wheelClientY = e.clientY;
      } else {
        wheelPanX += dx;
        wheelPanY += dy;
        if (wheelCommitTimerRef.current === null) {
          initialPanPosRef.current = { ...stagePosRef.current };
        }
      }

      if (wheelRafId === null) {
        wheelRafId = requestAnimationFrame(flushWheel);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && spacePressedRef.current)) {
        e.preventDefault();
        isPointerPanningRef.current = true;
        setIsPanning(true);
        initialPanPosRef.current = { ...stagePosRef.current };
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

        const clamped = clampStagePos({ x: targetX, y: targetY }, curW, curH, vW, vH);

        stagePosRef.current = clamped;
        applyImperativeTransform(clamped);
      }
    };

    const handlePointerUp = () => {
      isPointerPanningRef.current = false;
      setIsPanning(false);
      node.style.cursor = spacePressedRef.current ? 'grab' : '';
      window.removeEventListener('pointermove', handlePointerMove);

      const vW = viewportSizeRef.current.w;
      const vH = viewportSizeRef.current.h;
      const curW = displayWRef.current;
      const curH = displayHRef.current;
      const curOrigin = computeDefaultStageOrigin(curW, curH, vW, vH);
      resetRulerTransforms();
      setPan({
        x: stagePosRef.current.x - curOrigin.x,
        y: stagePosRef.current.y - curOrigin.y,
      });
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
      if (wheelRafId !== null) cancelAnimationFrame(wheelRafId);
      if (wheelCommitTimerRef.current !== null) {
        clearTimeout(wheelCommitTimerRef.current);
        wheelCommitTimerRef.current = null;
      }
      resetRulerTransforms();
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
  }, [containerRef, innerRef, setCanvasZoom, stageRef]);

  // الاستماع لحدث إعادة توسيط الكانفاس الصادر من أزرار الملاءمة والزوم
  useEffect(() => {
    const handleResetPan = () => {
      if (wheelCommitTimerRef.current !== null) {
        clearTimeout(wheelCommitTimerRef.current);
        wheelCommitTimerRef.current = null;
      }
      const vW = viewportSizeRef.current.w;
      const vH = viewportSizeRef.current.h;
      const curW = displayWRef.current;
      const curH = displayHRef.current;
      const curOrigin = computeDefaultStageOrigin(curW, curH, vW, vH);
      stagePosRef.current = curOrigin;
      if (stageRef.current) {
        stageRef.current.position(curOrigin);
        stageRef.current.batchDraw();
      }
      if (innerRef?.current) {
        innerRef.current.style.transform = `translate3d(${curOrigin.x}px, ${curOrigin.y}px, 0)`;
      }
      const shell = containerRef.current?.closest('[data-testid="workspace-canvas-shell"]');
      if (shell) {
        const hContent = shell.querySelector('#h-ruler-content') as SVGGElement | null;
        const vContent = shell.querySelector('#v-ruler-content') as SVGGElement | null;
        if (hContent) hContent.style.transform = '';
        if (vContent) vContent.style.transform = '';
      }
      setPan({ x: 0, y: 0 });
    };
    window.addEventListener(RESET_CANVAS_PAN_EVENT, handleResetPan);
    return () => window.removeEventListener(RESET_CANVAS_PAN_EVENT, handleResetPan);
  }, [containerRef, innerRef, stageRef]);

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
      if (wheelCommitTimerRef.current !== null) {
        clearTimeout(wheelCommitTimerRef.current);
        wheelCommitTimerRef.current = null;
      }
      const vW = viewportSize.w;
      const vH = viewportSize.h;
      const target = typeof pos === 'function' ? pos(stagePos) : pos;
      const clamped = clampStagePos(target, displayW, displayH, vW, vH);
      const curOrigin = computeDefaultStageOrigin(displayW, displayH, vW, vH);
      stagePosRef.current = clamped;
      if (stageRef.current) {
        stageRef.current.position(clamped);
        stageRef.current.batchDraw();
      }
      if (innerRef?.current) {
        innerRef.current.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;
      }
      const shell = containerRef.current?.closest('[data-testid="workspace-canvas-shell"]');
      if (shell) {
        const hContent = shell.querySelector('#h-ruler-content') as SVGGElement | null;
        const vContent = shell.querySelector('#v-ruler-content') as SVGGElement | null;
        if (hContent) hContent.style.transform = '';
        if (vContent) vContent.style.transform = '';
      }
      setPan({
        x: clamped.x - curOrigin.x,
        y: clamped.y - curOrigin.y,
      });
    },
    resetPan: () => {
      if (wheelCommitTimerRef.current !== null) {
        clearTimeout(wheelCommitTimerRef.current);
        wheelCommitTimerRef.current = null;
      }
      const curOrigin = computeDefaultStageOrigin(
        displayWRef.current,
        displayHRef.current,
        viewportSizeRef.current.w,
        viewportSizeRef.current.h,
      );
      stagePosRef.current = curOrigin;
      if (stageRef.current) {
        stageRef.current.position(curOrigin);
        stageRef.current.batchDraw();
      }
      if (innerRef?.current) {
        innerRef.current.style.transform = `translate3d(${curOrigin.x}px, ${curOrigin.y}px, 0)`;
      }
      const shell = containerRef.current?.closest('[data-testid="workspace-canvas-shell"]');
      if (shell) {
        const hContent = shell.querySelector('#h-ruler-content') as SVGGElement | null;
        const vContent = shell.querySelector('#v-ruler-content') as SVGGElement | null;
        if (hContent) hContent.style.transform = '';
        if (vContent) vContent.style.transform = '';
      }
      setPan({ x: 0, y: 0 });
    },
  };
}
