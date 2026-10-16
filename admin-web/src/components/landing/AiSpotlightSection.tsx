import { useState, useRef, useCallback } from 'react';
import { Upload, Wand2, FileCheck } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

const STEPS = [
  {
    step: '01',
    title: 'إسقاط الصورة',
    desc: 'مباشرة من الكاميرا أو الهاتف دون تعديل مسبق.',
    icon: Upload,
    tag: 'JPG / PNG / RAW',
  },
  {
    step: '02',
    title: 'عزل وترميم فوري',
    desc: 'إزالة نقية للخلفية وتنعيم طبيعي للبشرة.',
    icon: Wand2,
    tag: 'عزل نقي',
  },
  {
    step: '03',
    title: 'جاهز للطباعة',
    desc: 'مقاسات دولية معتمدة مع خطوط قص 0.5mm.',
    icon: FileCheck,
    tag: 'جاهز للطباعة',
  },
];

export function AiSpotlightSection() {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSliderPos((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSliderPos((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPos(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPos(100);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      setSliderPos((prev) => Math.max(0, prev - 20));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      setSliderPos((prev) => Math.min(100, prev + 20));
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      handlePointerMove(e.clientX);
    }
  };

  /**
   * الخطوة البارزة تتبع ما يعرضه الإطار فعلاً: المقبض على 100 يُظهر الصورة
   * الأصلية كاملة ← «إسقاط الصورة»؛ وعلى 0 تظهر النتيجة المعالجة ← «جاهز للطباعة»؛
   * وبينهما يقع حدّ العزل نفسه ← «عزل وترميم فوري». فيتقدّم المسار مع سحب المقبض.
   */
  const activeStep = sliderPos > 66 ? 0 : sliderPos > 33 ? 1 : 2;

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <section id="ai-engine" className="py-16 md:py-24 relative overflow-hidden scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <SectionHeader title="محرك الذكاء الاصطناعي الثنائي" description="ثلاث خطوات تلقائية تحوّل صورة الزبون الخام إلى طقم طباعة معتمد — دون أي تعديل يدوي" />

        {/* Live Showcase + Step Rail
            كان المعرض سابقاً في بطاقة بعرض كامل بينما الوسائط `max-w-md` (448px) موسّطة،
            فبقي ~330px فراغاً ميتاً على كل جانب والخطوات الثلاث في صف منفصل تحته.
            الآن عمودان متوازنان: الوسائط المتفاعلة بجانب مسار الخطوات العمودي. */}
        <div className="ds-card w-full p-4 sm:p-5 lg:p-6 shadow-xl relative overflow-hidden">
          <div className="pb-3.5 border-b border-border-subtle">
            <h3 className="text-sm sm:text-base font-bold text-white truncate">معاينة حية للمقارنة (1:1)</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center pt-5">
            {/* Media Column */}
            <div className="lg:col-span-5">
              {/* Interactive Split View Container */}
              <div
                ref={containerRef}
                dir="ltr"
                role="slider"
                tabIndex={0}
                aria-label="مقارنة الصورة قبل وبعد المعالجة بالذكاء الاصطناعي"
                aria-valuenow={Math.round(sliderPos)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${Math.round(sliderPos)}% بعد المعالجة`}
                onKeyDown={handleKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="relative w-full max-w-sm mx-auto lg:max-w-none aspect-[3/4] rounded-2xl overflow-hidden border border-border-subtle bg-inset select-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] flex items-center justify-center cursor-ew-resize touch-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-inset focus-visible:outline-none"
              >
                {/* Layer 1: AFTER Image */}
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-inset">
                  <img
                    src="/sample-passport-after.png"
                    alt="بعد معالجة الذكاء الاصطناعي — عزل خلفية نقي"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top pointer-events-none"
                    draggable={false}
                  />
                  <div
                    dir="rtl"
                    className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg border border-border-subtle shadow-lg pointer-events-none z-10"
                  >
                    بعد المعالجة
                  </div>
                </div>

                {/* Layer 2: BEFORE Image */}
                <div
                  className="absolute inset-0 w-full h-full flex items-center justify-center bg-inset pointer-events-none overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <img
                    src="/sample-passport-before.png"
                    alt="الصورة الأصلية قبل المعالجة"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top pointer-events-none"
                    draggable={false}
                  />
                  <div
                    dir="rtl"
                    className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-text-secondary font-semibold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg border border-border-subtle shadow-lg pointer-events-none z-10"
                  >
                    الأصل
                  </div>
                </div>

                {/* Draggable Divider Line */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] z-30 pointer-events-none flex items-center justify-center"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-2xl font-bold text-xs border-2 border-brand-primary">
                    ↔
                  </div>
                </div>
              </div>

              <p className="pt-3 text-[11px] text-text-secondary">اسحب المقبض لمشاهدة دقة العزل.</p>
            </div>

            {/* Step Rail Column — مرتبط بموضع مقبض المقارنة لحظياً */}
            <ol className="lg:col-span-7 flex flex-col gap-3.5">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeStep;
                return (
                  <li
                    key={item.step}
                    aria-current={isActive ? 'step' : undefined}
                    className={`group relative rounded-2xl border p-4 sm:p-5 transition-colors duration-300 ${
                      isActive
                        ? 'bg-sidebar border-brand-primary/50'
                        : 'bg-inset border-border-subtle hover:border-brand-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`ds-icon-tile w-10 h-10 transition-colors ${
                            isActive
                              ? 'bg-card border-brand-primary/50 text-brand-light'
                              : 'text-brand-primary group-hover:border-brand-primary/40'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          {item.title}
                        </h3>
                      </div>
                      <span
                        className={`text-xl font-mono font-black leading-none tabular-nums shrink-0 transition-colors ${
                          isActive ? 'text-brand-light' : 'text-text-muted'
                        }`}
                      >
                        {item.step}
                      </span>
                    </div>

                    <p className="text-text-secondary text-xs leading-relaxed">{item.desc}</p>

                    <div
                      className={`mt-3.5 pt-3 border-t text-[11px] font-semibold transition-colors ${
                        isActive
                          ? 'border-brand-primary/30 text-white'
                          : 'border-border-subtle text-brand-light'
                      }`}
                    >
                      <span className="font-mono">{item.tag}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

      </div>
    </section>
  );
}
