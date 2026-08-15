import { useState } from 'react';
import { Clock, Droplets, TrendingUp, Users, ArrowLeft } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

export function RoiCalculator() {
  const [dailyCustomers, setDailyCustomers] = useState<number>(35);

  const minutesSavedDaily = Math.round(dailyCustomers * 7.75);
  const hoursSavedDaily = (minutesSavedDaily / 60).toFixed(1);
  const monthlySheetsSaved = Math.round(dailyCustomers * 0.4 * 30);
  const speedMultiplier = 20;

  return (
    <section id="roi-calculator" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="حاسبة توفير الوقت والأرباح"
          title="كم توفر مطبعتك واستوديوك شهرياً مع Grido Studio؟"
          subtitle="حرّك المؤشر بحسب متوسط زبائنك اليومي واكتشف عدد الساعات وأوراق الطباعة الموفرة فورياً."
          index="03"
        />

        <div className="max-w-4xl mx-auto rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-6 sm:p-8">
          <div className="space-y-8">
            {/* Slider Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs sm:text-sm text-[#f0f0f0] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00a3ff]" />
                  عدد زبائن الصور والمعاملات يومياً:
                </span>
                <span className="text-xl sm:text-2xl font-normal font-serif text-[#00a3ff] bg-[#000000] px-3.5 py-1 rounded border border-[rgba(214,235,253,0.19)]">
                  {dailyCustomers} <span className="text-xs font-mono text-[#a1a4a5]">زبون/يوم</span>
                </span>
              </div>

              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={dailyCustomers}
                onChange={(e) => setDailyCustomers(Number(e.target.value))}
                aria-label="عدد الزبائن اليومي"
                className="w-full h-1.5 bg-[#000000] rounded appearance-none cursor-pointer accent-[#00a3ff]"
              />

              <div className="flex justify-between text-[11px] font-mono text-[#a1a4a5]">
                <span>5 زبائن (استوديو ناشئ)</span>
                <span>75 زبون (استوديو متوسط)</span>
                <span>150+ زبون (مطبعة ومعمل نشط)</span>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[rgba(214,235,253,0.19)]">
              {/* Card 1: Time Saved */}
              <div className="p-4 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] text-center space-y-2">
                <div className="w-8 h-8 rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)] mx-auto flex items-center justify-center text-[#00a3ff]">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-3xl font-normal font-serif text-[#f0f0f0] tracking-tight">
                  {hoursSavedDaily} <span className="text-sm font-sans text-[#00a3ff]">ساعة</span>
                </div>
                <p className="text-xs text-[#a1a4a5]">توفير حقيقي في وقت العمل يومياً</p>
              </div>

              {/* Card 2: Paper & Ink Waste Eliminated */}
              <div className="p-4 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] text-center space-y-2">
                <div className="w-8 h-8 rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)] mx-auto flex items-center justify-center text-[#00a3ff]">
                  <Droplets className="w-4 h-4" />
                </div>
                <div className="text-3xl font-normal font-serif text-[#00a3ff] tracking-tight">
                  {monthlySheetsSaved} <span className="text-sm font-sans text-[#00a3ff]">ورقة</span>
                </div>
                <p className="text-xs text-[#a1a4a5]">ورق وحبر ثمين موفر شهرياً</p>
              </div>

              {/* Card 3: Instant Customer Delivery */}
              <div className="p-4 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] text-center space-y-2">
                <div className="w-8 h-8 rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)] mx-auto flex items-center justify-center text-[#00a3ff]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-3xl font-normal font-serif text-[#f0f0f0] tracking-tight">
                  3 <span className="text-sm font-sans text-[#a1a4a5]">ثوانٍ</span>
                </div>
                <p className="text-xs text-[#a1a4a5]">تسليم الزبون والطلب جاهز وهو واقف</p>
              </div>
            </div>

            {/* Bottom summary statement */}
            <div className="p-4 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
              <span className="text-[#f0f0f0] flex items-center gap-2 text-center sm:text-start">
                <span className="w-2 h-2 rounded-full bg-[#00a3ff]" />
                النتيجة: خدمة زبائن أكثر بنسبة {speedMultiplier}X دون طوابير انتظار أو إرهاق!
              </span>
              <a
                href="#pricing"
                className="button-primary text-xs !py-1.5 !px-3 shrink-0 flex items-center gap-1.5"
              >
                <span>جرّب مجاناً الآن</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

