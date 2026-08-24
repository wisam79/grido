import { useState, useRef, useCallback } from 'react';
import { Sparkles, Upload, Wand2, FileCheck, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'إسقاط الصورة',
    desc: 'اسحب أي صورة مباشرة من الهاتف أو الكاميرا دون معالجة مسبقة.',
    icon: Upload,
    tag: 'JPG / PNG / RAW',
  },
  {
    step: '02',
    title: 'العزل وترميم الوجه',
    desc: 'عزل نقي وتنعيم طبيعي لمسام البشرة بنسبة 65/35 المتوازنة دون مظهر كارتوني.',
    icon: Wand2,
    tag: 'عزل فائق ونقاء للبشرة',
  },
  {
    step: '03',
    title: 'جاهز للطباعة والتصدير',
    desc: 'تطبيق مقاسات الجوازات الدولية وتوزيع الصور مع خطوط القص بدقة 0.5mm.',
    icon: FileCheck,
    tag: 'طباعة فورية جاهزة',
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

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <section id="ai-engine" className="py-16 md:py-24 relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="ai-badge mb-3">
            <Wand2 className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>مسار المعالجة الفوري</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
            محرك الذكاء الاصطناعي الثنائي
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E]">
            ثلاث خطوات سريعة تفصلك عن صورة هوية مثالية مطابقة للمواصفات الدولية.
          </p>
        </div>

        {/* Interactive Before / After Live Slider Showcase */}
        <div className="max-w-3xl mx-auto mb-12 sm:mb-16 rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-4 sm:p-7 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#2C2C2C] mb-4 sm:mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6]">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">معاينة حية للمقارنة (1:1)</h3>
            </div>
            <span className="text-[11px] font-bold text-[#10b981] bg-[#141414] px-2.5 py-0.5 rounded border border-[#2C2C2C]">
              نتائج حقيقية
            </span>
          </div>

          {/* Interactive Split View Container */}
          <div
            ref={containerRef}
            dir="ltr"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[420px] rounded-xl overflow-hidden border border-[#2C2C2C] bg-[#141414] select-none shadow-inner flex items-center justify-center cursor-ew-resize touch-none"
          >
            {/* Layer 1: AFTER Image */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#141414]">
              <img
                src="/sample-passport-after.png"
                alt="After AI Processing"
                className="w-full h-full object-contain object-center pointer-events-none"
                draggable={false}
              />
              <div
                dir="rtl"
                className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg border border-[#2C2C2C] shadow-lg pointer-events-none z-10"
              >
                ✨ بعد المعالجة
              </div>
            </div>

            {/* Layer 2: BEFORE Image */}
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#141414] pointer-events-none overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <img
                src="/sample-passport-before.png"
                alt="Before AI Processing"
                className="w-full h-full object-contain object-center pointer-events-none"
                draggable={false}
              />
              <div
                dir="rtl"
                className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-[#9E9E9E] font-semibold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg border border-[#2C2C2C] shadow-lg pointer-events-none z-10"
              >
                📷 الأصل (قبل)
              </div>
            </div>

            {/* Draggable Divider Line */}
            <div
              className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] z-30 pointer-events-none flex items-center justify-center"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-2xl font-bold text-[10px] border-2 border-[#3b82f6]">
                ↔
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 text-[11px] text-[#9E9E9E]">
            <span>اسحب المقبض لملاحظة دقة العزل وترميم تفاصيل الوجه</span>
            <span className="font-semibold text-[#60a5fa]">دقة طباعة فائقة</span>
          </div>
        </div>

        {/* 3-Step Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative flex flex-col">
                <div className="rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-5 sm:p-6 flex-1 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#3b82f6] shadow-xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xl font-mono font-black text-[#666666]">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-[#9E9E9E] text-xs leading-relaxed mb-4">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#2C2C2C] flex items-center justify-between text-[11px] font-mono text-[#60a5fa] font-semibold">
                    <span>{item.tag}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
