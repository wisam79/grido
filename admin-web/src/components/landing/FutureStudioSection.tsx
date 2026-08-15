import { useState } from 'react';
import { CheckCircle2, Download, Sparkles, SlidersHorizontal } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';
const PASSPORT_SAMPLE = '/biometric-cutout-blend.jpg';

const CHECKLIST = [
  {
    title: 'تحليل وتوسيط بيومتري ذكي للوجه والأكتاف',
    desc: 'خوارزميات ذكية تقيس زاوية الرأس والأكتاف وتضبط إطار الصورة طبقاً لمعايير وثائق السفر الدولية ICAO بدون تشويه.',
  },
  {
    title: 'معالجة مجمعة فائقة السرعة بـ 3 ثوانٍ فقط',
    desc: 'تجهيز وطباعة أوراق المعاملات في ثوانٍ معدودة، مما يتيح لك خدمة أكثر من 150 زبوناً يومياً بدون طوابير انتظار.',
  },
  {
    title: 'أحدث محركات ترميم الملامح وحفظ مسام البشرة الطبيعية',
    desc: 'تقنية دمج متطورة 65% وجه مرمم + 35% بشرة أصلية لمنع التأثير الشمعي الكارتوني وضمان قبول الصور رسمياً.',
  },
];

export function FutureStudioSection() {
  const [sliderPos, setSliderPos] = useState<number>(55);

  return (
    <section className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column (Right in RTL): Checklist */}
          <div className="lg:col-span-7 space-y-8 text-start">
            <div className="space-y-3">
              <span className="resend-badge font-mono">
                الجيل القادم لمعامل التصوير
              </span>

              <h2 className="text-3xl sm:text-5xl font-normal font-serif text-[#f0f0f0] tracking-tight leading-tight">
                مستقبل معالجة وطباعة صور المعاملات والوثائق
              </h2>
            </div>

            {/* Checklist Items */}
            <div className="space-y-5">
              {CHECKLIST.map((item) => (
                <div key={item.title} className="flex items-start gap-3.5 group">
                  <div className="w-6 h-6 rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)] flex items-center justify-center shrink-0 mt-0.5 text-[#00a3ff]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-normal font-serif text-[#f0f0f0]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#a1a4a5] leading-relaxed max-w-xl">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action CTA */}
            <div className="pt-2">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="button-primary"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>تحميل البرنامج وتجربته مجاناً</span>
              </a>
            </div>
          </div>

          {/* Right Column: Interactive Before / After AI Restoration Slider */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="w-full max-w-[400px] rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-4 overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[rgba(214,235,253,0.19)] text-xs font-mono text-[#a1a4a5]">
                <span className="flex items-center gap-1.5 text-[#f0f0f0]">
                  <Sparkles className="w-3.5 h-3.5 text-[#00a3ff]" />
                  محرك الترميم المزدوج HD
                </span>
                <span className="text-[10px] bg-[#000000] px-2 py-0.5 rounded border border-[rgba(214,235,253,0.19)] text-[#00a3ff]">
                  65% مرمم + 35% مسام
                </span>
              </div>

              {/* Split View Container */}
              <div className="relative aspect-[3/4] rounded bg-[#000000] border border-[rgba(214,235,253,0.19)] overflow-hidden select-none">
                {/* Restored Layer (Full Base) */}
                <img
                  src={PASSPORT_SAMPLE}
                  alt="Restored HD Portrait"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute top-2 start-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-[#00a3ff] border border-[#00a3ff]/30">
                  ترميم AI فائق الدقة
                </div>

                {/* Raw/Unrestored Layer (Clipped) */}
                <div
                  className="absolute inset-0 overflow-hidden border-e border-[#00a3ff]"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={PASSPORT_SAMPLE}
                    alt="Raw Portrait"
                    className="absolute inset-0 w-full h-full object-cover filter contrast-75 brightness-90 blur-[0.8px] grayscale-[40%]"
                    style={{ width: '100%', minWidth: '368px' }}
                  />
                  <div className="absolute top-2 start-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-[#a1a4a5] border border-[rgba(214,235,253,0.19)]">
                    الصورة الخام (قبل)
                  </div>
                </div>

                {/* Slider Handle Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#00a3ff] cursor-ew-resize pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#000000] border-2 border-[#00a3ff] flex items-center justify-center shadow-lg">
                    <SlidersHorizontal className="w-3 h-3 text-[#00a3ff]" />
                  </div>
                </div>
              </div>

              {/* Slider Control Bar */}
              <div className="mt-3 space-y-1.5">
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="w-full h-1 bg-[#000000] rounded appearance-none cursor-pointer accent-[#00a3ff]"
                  aria-label="مقارنة قبل وبعد الترميم"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#52595b]">
                  <span>اسحب للمقارنة الحية</span>
                  <span className="text-[#00a3ff]">نسبة الدمج: 65%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


