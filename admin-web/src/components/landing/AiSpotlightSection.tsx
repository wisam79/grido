import {
  useState,
  useRef,
  useId,
  useCallback,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  Cloud,
  HardDrive,
  ImagePlus,
  MoveHorizontal,
  Printer,
  Sparkles,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const STEPS = [
  {
    step: "01",
    icon: ImagePlus,
    title: "أضف الصورة",
    desc: "استورد الصورة من جهازك أو عبر كاميرا الهاتف لبدء القص والتأطير فوراً.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "اعزل وحسّن",
    desc: "راجع العزل واضبط لون الخلفية والإضاءة محلياً؛ الترميم السحابي خيار إضافي يتطلب اتصالاً.",
  },
  {
    step: "03",
    icon: Printer,
    title: "جهّز للطباعة",
    desc: "اختر المقاس، وزّع الصور على الورقة وأضف خطوط القص قبل الإرسال إلى الطابعة.",
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
    <section
      id="ai-engine"
      className="landing-section landing-section-bordered relative"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="محرك العزل والتحسين"
          title="أدوات ذكية، والنتيجة تحت تحكمك"
          description="عزل الخلفية وتجهيز صورة الهوية محلياً، مع خيار ترميم سحابي للوجوه عند الحاجة."
        />

        <div className="landing-card grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center p-5 sm:p-8">
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
              className="landing-visual relative w-full max-w-sm mx-auto lg:max-w-none aspect-[3/4] overflow-hidden select-none cursor-ew-resize touch-pan-y shadow-[0_20px_48px_-20px_rgba(0,0,0,0.85)]"
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
                  className="absolute top-3 right-3 rounded-md border border-white/15 bg-black/70 text-white text-xs font-medium px-3 py-1 backdrop-blur-md"
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
                  className="absolute top-3 left-3 rounded-md border border-white/15 bg-black/70 text-white text-xs font-medium px-3 py-1 backdrop-blur-md"
                >
                  الأصل
                </span>
              </div>

              <div
                className="absolute inset-y-0 w-0.5 bg-white/95 shadow-[0_0_10px_rgba(0,0,0,0.6)] pointer-events-none"
                style={{ left: `${sliderPos}%` }}
                aria-hidden="true"
              />
              <div
                className="absolute top-1/2 w-11 h-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-workspace/90 text-white shadow-[0_4px_16px_rgba(0,0,0,0.65)] backdrop-blur-md flex items-center justify-center pointer-events-none"
                style={{
                  left: `clamp(22px, ${sliderPos}%, calc(100% - 22px))`,
                }}
                aria-hidden="true"
              >
                <MoveHorizontal className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
              <div
                role="group"
                aria-label="مواضع سريعة لمقارنة الصورة"
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-inset p-1"
              >
                {[
                  { label: "الأصل", value: 100 },
                  { label: "مقارنة", value: 50 },
                  { label: "النتيجة", value: 0 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={sliderPos === preset.value}
                    onClick={() => setSliderPos(preset.value)}
                    className={`min-h-11 min-w-11 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer ${
                      sliderPos === preset.value
                        ? "bg-card-hover text-text-primary border border-white/15"
                        : "text-text-secondary hover:text-text-primary border border-transparent"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <span
                dir="ltr"
                className="font-mono text-xs tabular-nums text-text-muted"
              >
                {sliderPos}% / {100 - sliderPos}%
              </span>
            </div>

            <figcaption
              id={hintId}
              className="mt-2.5 text-xs text-text-secondary leading-relaxed"
            >
              اسحب المقبض أو استخدم الأسهم للمقارنة. مثال توضيحي؛ النتيجة تختلف
              حسب الصورة.
            </figcaption>
          </figure>

          <div className="lg:col-span-7 flex flex-col justify-between gap-6">
            <ol className="space-y-4">
              {STEPS.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.step}
                    className="landing-metric-tile flex items-start gap-4 p-4 sm:p-5"
                  >
                    <div className="landing-icon-badge mt-0.5">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <bdi
                          dir="ltr"
                          className="font-mono text-xs font-semibold text-brand-light tabular-nums"
                        >
                          {item.step}
                        </bdi>
                        <h3 className="text-base font-semibold text-text-primary leading-snug">
                          {item.title}
                        </h3>
                      </div>
                      <p className="mt-1.5 text-sm text-text-secondary leading-7">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-3 rounded-lg border border-status-success/20 bg-status-success/[0.05] px-4 py-3">
                <HardDrive
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-status-success"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-text-primary">
                    عزل الخلفية محلياً
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    يعمل على جهازك مباشرة دون رفع الصور
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-brand-primary/25 bg-brand-primary/[0.06] px-4 py-3">
                <Cloud
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-brand-light"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-text-primary">
                    ترميم الوجوه السحابي
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    اختياري عند الحاجة وبوجود اتصال
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
