import { Check, X, Sparkles, Zap, ShieldCheck, Scissors, Lock, Clock, Flame, AlertCircle } from 'lucide-react';

const OLD_WAY = [
  {
    title: '5 إلى 8 دقائق للزبون الواحد',
    desc: 'قص يدوي مجهد بالفرشاة والممحاة داخل برامج التصميم المعقدة.',
    icon: Clock,
  },
  {
    title: 'هالات بيضاء وحواف غير دقيقة',
    desc: 'تحديد يدوي يترك أطرافاً بيضاء خشنة قد ترفضها السفارات والجهات الرسمية.',
    icon: AlertCircle,
  },
  {
    title: 'هدر مستمر في ورق الطباعة',
    desc: 'ترتيب وتكرار يدوي للصور يضيع مساحة الورق بدون خطوط إرشادية للمقص.',
    icon: Scissors,
  },
  {
    title: 'مخاطر الخصوصية وتسريب الصور',
    desc: 'مواقع وأدوات سحابية ترفع صور عملائك إلى خوادم خارجية غير موثوقة.',
    icon: Lock,
  },
  {
    title: 'اشتراكات شهرية متكررة',
    desc: 'دفع مستمر وفواتير شهرية باهظة تستنزف أرباح الاستوديو شهراً بعد شهر.',
    icon: Flame,
  },
];

const GRIDO_WAY = [
  {
    title: '3 ثوانٍ فقط بضغطة زر واحدة',
    desc: 'عزل فوري، ضبط معالم الوجه، وتجهيز مصفوفة الطباعة في لحظات.',
    icon: Zap,
    highlight: 'أسرع 90%',
  },
  {
    title: 'عزل نقي ومطابقة دولية معتمدة',
    desc: 'تصفير الهالات البيضاء ومطابقة كاملة لمواصفات الجوازات والفيزا (ICAO).',
    icon: ShieldCheck,
    highlight: 'معتمد 100%',
  },
  {
    title: 'توفير 35% من الورق مع خطوط قص',
    desc: 'حساب ذكي لأقصى استغلال للورقة مع رسم خطوط قص دقيقة 0.5mm للمقص المكتبي.',
    icon: Scissors,
    highlight: 'توفير 35%',
  },
  {
    title: 'خصوصية محلية 100% دون إنترنت',
    desc: 'جميع الصور تُعالج محلياً على جهازك دون إرسال أي بايت خارج حاسوبك.',
    icon: Lock,
    highlight: 'أمان تام',
  },
  {
    title: 'رخصة أصلية لمدى الحياة',
    desc: 'استثمار لمرة واحدة فقط؛ ملكية دائمة مع كافة التحديثات مجاناً للأبد.',
    icon: Sparkles,
    highlight: 'بدون اشتراك',
  },
];

export function ComparisonSection() {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="ai-badge mb-3">
            <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>مقارنة الأداء والإنتاجية</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
            لماذا يختار المحترفون استوديو جريدو؟
          </h2>
          <p className="text-xs sm:text-base text-[#9E9E9E] max-w-2xl mx-auto leading-relaxed">
            مقارنة مباشرة بين عناء الطرق اليدوية القديمة وسرعة الإنتاج مع Grido Studio.
          </p>
        </div>

        {/* 2-Column Versus Grid (Old Way vs Grido Studio) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Column 1: The Old Way (Dimmed & Red Accents) */}
          <div className="rounded-2xl bg-[#171717] border border-[#2C2C2C] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C] mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2C2C2C] flex items-center justify-center text-[#ef4444]">
                    <X className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">الأساليب والبرامج التقليدية</h3>
                    <span className="text-[11px] text-[#666666]">بطيئة، معقدة، وتستهلك الوقت</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#ef4444] bg-[#141414] px-2.5 py-1 rounded border border-[#2C2C2C]">
                  هدر في الوقت
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {OLD_WAY.map((item) => (
                  <div
                    key={item.title}
                    className="p-3.5 rounded-xl bg-[#141414]/70 border border-[#242424] flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-md bg-[#1E1E1E] border border-[#2C2C2C] flex items-center justify-center text-[#ef4444] shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-[#D4D4D4] mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#737373] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#242424] text-center text-xs text-[#666666]">
              استنزاف يومي للوقت والمجهود داخل الاستوديو
            </div>
          </div>

          {/* Column 2: Grido Studio (Signature Blue & Green Accents) */}
          <div className="rounded-2xl bg-[#1E1E1E] border border-[#3b82f6]/40 p-6 sm:p-8 flex flex-col justify-between shadow-xl relative">
            
            {/* Top Recommended Pill */}
            <div className="absolute -top-3 start-6 bg-[#3b82f6] text-white text-[10px] sm:text-[11px] font-extrabold px-3 py-0.5 rounded-full border border-white/20 shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>الخيار الأسرع للاستوديوهات</span>
            </div>

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C] mb-6 pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">استوديو جريدو</h3>
                    <span className="text-[11px] text-[#60a5fa]">سير عمل آلي وفوري بـ 3 ثوانٍ</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#10b981] bg-[#141414] px-2.5 py-1 rounded border border-[#2C2C2C]">
                  إنتاجية قصوى
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {GRIDO_WAY.map((item) => (
                  <div
                    key={item.title}
                    className="p-3.5 rounded-xl bg-[#141414] border border-[#2C2C2C] hover:border-white/20 transition-all flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-md bg-[#1E1E1E] border border-[#2C2C2C] flex items-center justify-center text-[#10b981] shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-bold text-[#60a5fa] bg-[#1E1E1E] px-2 py-0.5 rounded border border-[#2C2C2C] shrink-0">
                          {item.highlight}
                        </span>
                      </div>
                      <p className="text-xs text-[#9E9E9E] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#2C2C2C] flex items-center justify-between text-xs text-[#9E9E9E]">
              <span className="text-white font-medium">وفّر حتى ساعتين يومياً</span>
              <span className="text-[#10b981] font-bold">جاهز للعمل فوراً</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
