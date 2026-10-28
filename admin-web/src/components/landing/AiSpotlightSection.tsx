import {
  useState,
  useRef,
  useId,
  useCallback,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { SectionHeader } from "./SectionHeader";

const STEPS = [
  {
    step: "01",
    title: "أضف الصورة",
    desc: "استورد الصورة من جهازك لبدء القص والتأطير.",
  },
  {
    step: "02",
    title: "اعزل وحسّن",
    desc: "راجع العزل واضبط الصورة؛ الترميم السحابي خيار إضافي يتطلب اتصالاً.",
  },
  {
    step: "03",
    title: "جهّز للطباعة",
    desc: "اختر المقاس، وزّع الصور وأضف خطوط القص قبل الطباعة.",
  },
];

export function AiSpotlightSection() {
  // The clipped layer is the original image: 100 reveals BEFORE, not AFTER.
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragPointerId = useRef<number | null>(null);
  const hintId = useId();

  const handlePointerMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const percentage = Math.round(((clientX - rect.left) / rect.width) * 100);
    setSliderPos(Math.max(0, Math.min(100, percentage)));
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        setSliderPos((previous) => Math.max(0, previous - 5));
        break;
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        setSliderPos((previous) => Math.min(100, previous + 5));
        break;
      case "Home":
        event.preventDefault();
        setSliderPos(0);
        break;
      case "End":
        event.preventDefault();
        setSliderPos(100);
        break;
      case "PageDown":
        event.preventDefault();
        setSliderPos((previous) => Math.max(0, previous - 20));
        break;
      case "PageUp":
        event.preventDefault();
        setSliderPos((previous) => Math.min(100, previous + 20));
        break;
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragPointerId.current !== null) return;
    dragPointerId.current = event.pointerId;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    handlePointerMove(event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragPointerId.current === event.pointerId) {
      handlePointerMove(event.clientX);
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragPointerId.current !== event.pointerId) return;
    dragPointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section id="ai-engine" className="landing-section relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="أدوات ذكية، والنتيجة تحت تحكمك"
          description="عزل الخلفية وتحسين الصورة، مع ترميم سحابي اختياري عند الحاجة."
        />

        <div className="landing-card grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center p-5 sm:p-8">
          <figure className="lg:col-span-5 min-w-0">
            <div
              ref={containerRef}
              dir="ltr"
              role="slider"
              tabIndex={0}
              aria-label="نسبة ظهور الصورة الأصلية في مقارنة قبل وبعد عزل الخلفية"
              aria-describedby={hintId}
              aria-orientation="horizontal"
              aria-valuenow={sliderPos}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${sliderPos}% من الصورة الأصلية، ${100 - sliderPos}% بعد المعالجة`}
              onKeyDown={handleKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onLostPointerCapture={(event) => {
                if (dragPointerId.current === event.pointerId)
                  dragPointerId.current = null;
              }}
              className="landing-visual relative w-full max-w-sm mx-auto lg:max-w-none aspect-[3/4] overflow-hidden select-none cursor-ew-resize touch-pan-y focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-inset focus-visible:outline-none"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
              >
                <img
                  src="/sample-passport-after.png"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-top"
                  draggable={false}
                />
                <span
                  dir="rtl"
                  className="absolute top-3 right-3 rounded-md bg-inset/95 text-text-primary text-xs font-medium px-3 py-1.5"
                >
                  بعد المعالجة
                </span>
              </div>

              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                aria-hidden="true"
              >
                <img
                  src="/sample-passport-before.png"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-top"
                  draggable={false}
                />
                <span
                  dir="rtl"
                  className="absolute top-3 left-3 rounded-md bg-inset/95 text-text-primary text-xs font-medium px-3 py-1.5"
                >
                  الأصل
                </span>
              </div>

              <div
                className="absolute inset-y-0 w-px bg-white pointer-events-none"
                style={{ left: `${sliderPos}%` }}
                aria-hidden="true"
              />
              <div
                className="absolute top-1/2 w-11 h-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white text-black flex items-center justify-center text-lg pointer-events-none"
                style={{
                  left: `clamp(22px, ${sliderPos}%, calc(100% - 22px))`,
                }}
                aria-hidden="true"
              >
                ↔
              </div>
            </div>
            <figcaption
              id={hintId}
              className="mt-3 text-xs text-text-secondary leading-relaxed"
            >
              اسحب أو استخدم الأسهم للمقارنة. مثال توضيحي؛ النتيجة تختلف حسب
              الصورة.
            </figcaption>
          </figure>

          <ol className="lg:col-span-7 divide-y divide-border-subtle">
            {STEPS.map((item) => (
              <li
                key={item.step}
                className="flex items-start gap-4 py-5 first:pt-0 last:pb-0"
              >
                <bdi
                  dir="ltr"
                  className="font-mono text-sm text-text-muted tabular-nums pt-1 shrink-0"
                >
                  {item.step}
                </bdi>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-text-primary leading-relaxed">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary leading-7">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
