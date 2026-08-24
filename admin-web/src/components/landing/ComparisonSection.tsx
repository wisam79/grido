import { Check, X, Sparkles, Zap } from 'lucide-react';

const OLD_WAY = [
  {
    title: '5 إلى 8 دقائق للزبون',
    desc: 'قص وتعديل يدوي مجهد في برامج التصميم.',
  },
  {
    title: 'هالات بيضاء وحواف غير دقيقة',
    desc: 'تحديد يدوي قد ترفضه السفارات والجهات الرسمية.',
  },
  {
    title: 'هدر مستمر في ورق الطباعة',
    desc: 'ترتيب يدوي غير محسوب بدون خطوط للمقص.',
  },
  {
    title: 'مخاطر الخصوصية السحابية',
    desc: 'رفع صور عملائك إلى خوادم خارجية غير آمنة.',
  },
  {
    title: 'اشتراكات شهرية متكررة',
    desc: 'فواتير باهظة تستنزف أرباح الاستوديو شهرياً.',
  },
];

const GRIDO_WAY = [
  {
    title: '3 ثوانٍ فقط للزبون',
    desc: 'عزل فوري وتجهيز مصفوفة الطباعة بضغطة زر.',
    highlight: 'أسرع 90%',
  },
  {
    title: 'عزل نقي ومطابقة دولية (ICAO)',
    desc: 'تصفير كامل للهالات البيضاء بمقاسات معتمدة.',
    highlight: 'معتمد 100%',
  },
  {
    title: 'توفير 35% من الورق',
    desc: 'توزيع شبكي آلي مع خطوط قص دقيقة 0.5mm.',
    highlight: 'توفير 35%',
  },
  {
    title: 'خصوصية 100% دون إنترنت',
    desc: 'معالجة وتخزين محلي بالكامل على جهازك.',
    highlight: 'أمان تام',
  },
  {
    title: 'رخصة أصلية لمدى الحياة',
    desc: 'دفع لمرة واحدة مع كافة التحديثات مجاناً للأبد.',
    highlight: 'بدون اشتراك',
  },
];

export function ComparisonSection() {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="ai-badge mb-3">
            <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>مقارنة الأداء</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-2.5 tracking-tight">
            لماذا يختار المحترفون استوديو جريدو؟
          </h2>
          <p className="text-xs sm:text-base text-[#9E9E9E] max-w-2xl mx-auto leading-relaxed">
            مقارنة مباشرة بين الطرق التقليدية وسير العمل الفوري مع Grido Studio.
          </p>
        </div>

        {/* 2-Column Versus Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Column 1: The Old Way */}
          <div className="rounded-2xl bg-[#171717] border border-[#2C2C2C] p-5 sm:p-7 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-[#2C2C2C] mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#ef4444]">
                    <X className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">البرامج والطرق التقليدية</h3>
                    <span className="text-[10px] text-[#666666]">بطيئة وتستهلك الوقت</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#ef4444] bg-[#141414] px-2 py-0.5 rounded border border-[#2C2C2C]">
                  هدر في الوقت
                </span>
              </div>

              <div className="space-y-3">
                {OLD_WAY.map((item) => (
                  <div
                    key={item.title}
                    className="p-3 rounded-xl bg-[#141414]/70 border border-[#242424] flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-md bg-[#1E1E1E] border border-[#2C2C2C] flex items-center justify-center text-[#ef4444] shrink-0 mt-0.5">
                      <X className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-[#D4D4D4] mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#737373] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#242424] text-center text-xs text-[#666666]">
              استنزاف يومي للوقت والمجهود
            </div>
          </div>

          {/* Column 2: Grido Studio */}
          <div className="rounded-2xl bg-[#1E1E1E] border border-[#3b82f6]/40 p-5 sm:p-7 flex flex-col justify-between shadow-xl relative">
            
            <div className="absolute -top-3 start-6 bg-[#3b82f6] text-white text-[10px] sm:text-[11px] font-extrabold px-3 py-0.5 rounded-full border border-white/20 shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>الخيار الأسرع للاستوديوهات</span>
            </div>

            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-[#2C2C2C] mb-5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">استوديو جريدو</h3>
                    <span className="text-[10px] text-[#60a5fa]">إنتاج فوري بـ 3 ثوانٍ</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#10b981] bg-[#141414] px-2 py-0.5 rounded border border-[#2C2C2C]">
                  إنتاجية قصوى
                </span>
              </div>

              <div className="space-y-3">
                {GRIDO_WAY.map((item) => (
                  <div
                    key={item.title}
                    className="p-3 rounded-xl bg-[#141414] border border-[#2C2C2C] hover:border-white/20 transition-all flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-md bg-[#1E1E1E] border border-[#2C2C2C] flex items-center justify-center text-[#10b981] shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-bold text-[#60a5fa] bg-[#1E1E1E] px-2 py-0.5 rounded border border-[#2C2C2C] shrink-0">
                          {item.highlight}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9E9E9E] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#2C2C2C] flex items-center justify-between text-xs text-[#9E9E9E]">
              <span className="text-white font-medium">توفير ساعتين يومياً</span>
              <span className="text-[#10b981] font-bold">جاهز للعمل</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
