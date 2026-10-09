import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { clampZoomRaw } from '@/lib/canvas/zoom';

/**
 * عتبة التزام الزوم: تغييرات العجلة الدقيقة (ضجيج لوحة اللمس) التي تقل عن
 * ~بكسل عرض واحد (Δz ≈ 1/boxW ≈ 0.001) ودون عتبة تسمية النسبة (0.5%) تُراكم
 * بلا التزام — فكل التزام يعيد حساب الملاءمة.
 */
const ZOOM_COMMIT_EPSILON = 0.001;

/**
 * مدّة استقرار إيماءة الزوم قبل «الخبز» (M15 من تدقيق 2026-10-08).
 * أثناء حركة العجلة يُطبَّق الزوم بـ CSS transform فقط — بلا أي إعادة تخصيص
 * لطبقات Konva ولا `layer.draw()` متزامن، فالإيماءة سلسة تماماً. وعند توقف
 * المستخدم تُثبَّت النتيجة في الـ Stage (ومقاسه وكثافة البكسل) بمرة واحدة،
 * فيعود الرسم بكامل حدّته دون أن ندفع ثمن re-raster في كل إطار.
 */
const ZOOM_BAKE_DELAY_MS = 140;

/** الأدوات الافتراضية للنافذة: وضع الخبز أثناء الاختبارات */
const BAKE_DEBUG_KEY = 'grido-zoom-bake-debug';

interface ZoomBakeMetrics {
  /** عدد مرات إعادة تخصيص الـ Stage (خبز) لتتبع الانحدار */
  bakes: number;
  /** عدد إيماءات الزوم التي اكتفت بالـ CSS */
  cssOnlyFrames: number;
}

declare global {
  interface Window {
    __gridoZoomBake?: ZoomBakeMetrics;
  }
}

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
 * 🧭 منطق إطار عرض المحرر: زوم العجلة المحوري (Ctrl+Wheel) بمحور مؤشر ثابت،
 * والتحريك بزر السحب الأوسط أو مفتاح المسافة (Space-Pan).
 * 🛡️ معدل بالراف: عجلات متتالية تُدمج في إطار رسم واحد — كانت هذه الكتلة
 * مضمّنة في EditorCanvas.
 */
export function useCanvasViewport(
  containerRef: RefObject<HTMLDivElement | null>,
  innerRef: RefObject<HTMLDivElement | null>,
) {
  const prevZoomRef = useRef(useEditorStore.getState().canvasZoom);
  const prevCanvasRectRef = useRef<DOMRect | null>(null);
  const zoomPivotRef = useRef<{
    pctX: number;
    pctY: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // ── زوم الإيماءة اللحظي (CSS transform) + خبز بعد الاستقرار ──────────────
  // المستودع يحتفظ بآخر قيمة مُثبَّتة فقط؛ القيمة المؤقتة تُعرض مباشرة على
  // الغلاف وتُكتب في المتجر عند الاستقرار (أو فوراً عند الزوم بالأزرار).
  const canvasZoom = useEditorStore((s) => s.canvasZoom);
  const setCanvasZoom = useEditorStore((s) => s.setCanvasZoom);
  const [gestureZoom, setGestureZoom] = useState<number | null>(null);
  // مرآة قابلة للقراءة داخل مستمع العجلة (مُسجَّل مرة واحدة بمصفوفة تبعيات
  // ثابتة) — بلا هذه يعود المستمع لفارق قديم في كل إطار.
  const gestureZoomRef = useRef<number | null>(null);
  // المزامنة في أثر لا أثناء التصيير (قاعدة react-hooks/refs) — المستمع
  // يقرأها بعد الـ commit وقبل أي حدث لاحق، فلا يحتاج قيمة متزامنة مع الرسم.
  useEffect(() => {
    gestureZoomRef.current = gestureZoom;
  }, [gestureZoom]);
  const effectiveZoom = gestureZoom ?? canvasZoom;

  useEffect(() => {
    const spacePressedRef = { current: false };
    const isPanningRef = { current: false };
    const node = containerRef.current;
    if (!node) return;

    let pendingZoom: number | null = null;
    let rafId: number | null = null;
    let bakeTimer: ReturnType<typeof setTimeout> | null = null;

    /** كتابة القيمة في المتجر وإعادة تخصيص الـ Stage (الخبز) */
    const bakeZoom = (target: number) => {
      bakeTimer = null;
      const committed = useEditorStore.getState().canvasZoom;
      if (Math.abs(target - committed) < ZOOM_COMMIT_EPSILON) {
        setGestureZoom(null);
        return;
      }
      if (innerRef.current) {
        const canvasRect = innerRef.current.getBoundingClientRect();
        prevCanvasRectRef.current = canvasRect;
        zoomPivotRef.current = {
          pctX: (lastWheelClientX - canvasRect.left) / (canvasRect.width || 1),
          pctY: (lastWheelClientY - canvasRect.top) / (canvasRect.height || 1),
          screenX: lastWheelClientX,
          screenY: lastWheelClientY,
        };
      }
      setGestureZoom(null);
      setCanvasZoom(target);
      if (typeof window !== 'undefined' && BAKE_DEBUG_KEY) {
        const m = (window.__gridoZoomBake ??= { bakes: 0, cssOnlyFrames: 0 });
        m.bakes += 1;
      }
    };

    const scheduleBake = (target: number) => {
      if (bakeTimer !== null) clearTimeout(bakeTimer);
      bakeTimer = setTimeout(() => bakeZoom(target), ZOOM_BAKE_DELAY_MS);
    };

    const applyZoom = () => {
      rafId = null;
      if (pendingZoom === null) return;

      const newZoom = pendingZoom;
      pendingZoom = null;

      // 🛡️ M15: أثناء الإيماءة لا نكتب المتجر — نعرض الزوم بـ CSS فقط.
      // كتابة المتجر كانت تُعيد حساب `computeCanvasDisplay` فتُغيّر مقاس
      // الـ Stage ⇒ إعادة تخصيص backing store لكل طبقة + layer.draw() متزامن
      // في كل إطار من العجلة (أثقل تكلفة في دورة التكبير).
      setGestureZoom(newZoom);
      if (typeof window !== 'undefined' && BAKE_DEBUG_KEY) {
        const m = (window.__gridoZoomBake ??= { bakes: 0, cssOnlyFrames: 0 });
        m.cssOnlyFrames += 1;
      }
      scheduleBake(newZoom);
    };

    let lastWheelClientX = 0;
    let lastWheelClientY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        lastWheelClientX = e.clientX;
        lastWheelClientY = e.clientY;

        const baseZoom =
          pendingZoom ?? gestureZoomRef.current ?? useEditorStore.getState().canvasZoom;
        const factor = Math.exp(-e.deltaY * 0.003);
        const newZoom = clampZoomRaw(baseZoom * factor);

        // دون العتبة: راكم المرشّح بلا جدولة إطار — يحفظ سلاسة التراكم
        // للقرص البطيء ويُسقط ضجيجاً لا يغيّر بكسلاً واحداً ولا التسمية
        if (Math.abs(newZoom - baseZoom) < ZOOM_COMMIT_EPSILON) {
          pendingZoom = newZoom;
          return;
        }

        pendingZoom = newZoom;
        if (rafId === null) {
          rafId = requestAnimationFrame(applyZoom);
        }
      }
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
        node.style.cursor = '';
      }
    };

    const handleBlur = () => {
      spacePressedRef.current = false;
      isPanningRef.current = false;
      node.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && spacePressedRef.current)) {
        e.preventDefault();
        e.stopPropagation();
        isPanningRef.current = true;
        node.style.cursor = 'grabbing';
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp, { once: true });
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPanningRef.current) {
        e.preventDefault();
        node.scrollLeft -= e.movementX;
        node.scrollTop -= e.movementY;
      }
    };

    const handlePointerUp = () => {
      isPanningRef.current = false;
      node.style.cursor = spacePressedRef.current ? 'grab' : '';
      window.removeEventListener('pointermove', handlePointerMove);
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    node.addEventListener('pointerdown', handlePointerDown, { capture: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    // ملاحظة: حدث `grido:fit-canvas-to-screen` أُزيل — الملاءمة صارت وضعاً
    // في المتجر (fit.ts) يُحدَّد من fitZoomStore/fitWidthZoomStore، فلم يعد
    // هناك قياس DOM موازٍ يعيد اشتقاق حجم لم يتغيّر أصلاً.

    return () => {
      // إيماءة لم تستقر بعد: نُخبزها قبل الخروج بدل أن تضيع بلا أثر
      if (bakeTimer !== null) {
        clearTimeout(bakeTimer);
        if (pendingZoom !== null) {
          setCanvasZoom(pendingZoom);
        }
      }
      if (rafId !== null) cancelAnimationFrame(rafId);
      node.removeEventListener('wheel', handleWheel);
      node.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      // إسقاط أي زوم إيماءة لم يُخبَز — الشاشة ترجع لقيمة المتجر المثبَّتة
      setGestureZoom(null);
    };
  }, [setCanvasZoom, containerRef, innerRef, gestureZoomRef]);

  // محافظة محور الزوم: تعيد المحور (pivot) لموضعه الشاشي بعد تغيّر الزوم
  useLayoutEffect(() => {
    if (canvasZoom !== prevZoomRef.current) {
      if (containerRef.current && innerRef.current) {
        const container = containerRef.current;
        const canvas = innerRef.current;

        const newCanvasRect = canvas.getBoundingClientRect();

        if (zoomPivotRef.current) {
          const { pctX, pctY, screenX, screenY } = zoomPivotRef.current;

          const currentScreenX = newCanvasRect.left + pctX * newCanvasRect.width;
          const currentScreenY = newCanvasRect.top + pctY * newCanvasRect.height;

          container.scrollLeft += currentScreenX - screenX;
          container.scrollTop += currentScreenY - screenY;

          zoomPivotRef.current = null;
        } else {
          // التكبير بدون عجلة (أزرار الشريط واختصارات لوحة المفاتيح والقوائم):
          // يحفظ النقطة البؤرية المعروضة حالياً في مركز مساحة الرؤية بدل إعادة التوسيط القسري للكانفس
          const containerRect = container.getBoundingClientRect();
          const screenX = containerRect.left + containerRect.width / 2;
          const screenY = containerRect.top + containerRect.height / 2;
          const oldCanvasRect = prevCanvasRectRef.current;

          if (oldCanvasRect && oldCanvasRect.width > 0 && oldCanvasRect.height > 0) {
            const pctX = (screenX - oldCanvasRect.left) / oldCanvasRect.width;
            const pctY = (screenY - oldCanvasRect.top) / oldCanvasRect.height;

            const currentScreenX = newCanvasRect.left + pctX * newCanvasRect.width;
            const currentScreenY = newCanvasRect.top + pctY * newCanvasRect.height;

            container.scrollLeft += currentScreenX - screenX;
            container.scrollTop += currentScreenY - screenY;
          } else {
            const newCenterX = newCanvasRect.left + newCanvasRect.width / 2;
            const newCenterY = newCanvasRect.top + newCanvasRect.height / 2;
            container.scrollLeft += newCenterX - screenX;
            container.scrollTop += newCenterY - screenY;
          }
        }
        prevCanvasRectRef.current = newCanvasRect;
      }
      prevZoomRef.current = canvasZoom;
    } else if (innerRef.current && !prevCanvasRectRef.current) {
      prevCanvasRectRef.current = innerRef.current.getBoundingClientRect();
    }
  }, [canvasZoom, containerRef, innerRef]);

  // القيمة الفعلية المعروضة الآن: زوم الإيماءة إن كانت جارية، وإلا المثبَّتة.
  // يقرؤها المحرر لتحديد مقاس الورقة المرئي (المساطر، الشريط، غلاف CSS).
  return { effectiveZoom };
}
