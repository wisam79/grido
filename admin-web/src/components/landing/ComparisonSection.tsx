import { CheckCircle2, X, Sparkles, Zap, ShieldCheck, Cpu, Droplets, WifiOff } from 'lucide-react';

const COMPARISON_ROWS = [
  {
    icon: Zap,
    feature: 'تجهيز ورقة الطباعة والتقطيع',
    grido: 'تلقائي بنقرة واحدة (أقل من ثانية)',
    traditional: 'يدوي محبط يستغرق 5 - 10 دقائق',
  },
  {
    icon: ShieldCheck,
    feature: 'دقة المقاسات الرسمية (الهوية والفيزا)',
    grido: '100% مطابقة للمواصفات الحكومية',
    traditional: 'عرضة للأخطاء البشرية وإعادة الطباعة',
  },
  {
    icon: Cpu,
    feature: 'ترميم ملامح الوجه (AI Restoration)',
    grido: 'محلي فوري بـ CodeFormer + HD',
    traditional: 'يتطلب خبرة فوتوشوب معقدة أو اشتراكات',
  },
  {
    icon: Droplets,
    feature: 'هدر ورق الطباعة (Paper Waste)',
    grido: '0% هدر مع شبكات توزيع الخلايا الذكية',
    traditional: 'هدر متكرر للأوراق والحبر الثمين',
  },
  {
    icon: WifiOff,
    feature: 'العمل بدون إنترنت (Offline 100%)',
    grido: 'سرعة فائقة وخصوصية كاملة للصور',
    traditional: 'بطء في التعامل والاعتماد على سيرفرات خارجية',
  },
];

export function ComparisonSection() {
  return (
    <section id="comparison" className="relative py-16 sm:py-24 lg:py-28 border-t border-[#383842] bg-[#121214] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <span className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-none border border-[#383842] bg-[#1a1a1e] text-xs font-mono font-bold text-[#f0f0fa] tracking-[2px] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>مقارنة الأداء والمقاييس</span>
          </span>
          <h2 className="stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight uppercase leading-tight">
            لماذا يتحول الجميع إلى <span className="text-[#f0f0fa]">GRIDO STUDIO</span>؟
          </h2>
          <p className="stagger-3 mt-4 text-[#f0f0fa] text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">
            وفر 90% من وقت العمل اليومي بفضل الأتمتة المباشرة.
          </p>
        </div>

        {/* Feature VS Cards Stack */}
        <div className="stagger-4 space-y-4">
          {COMPARISON_ROWS.map((row, idx) => {
            const Icon = row.icon;
            return (
              <div 
                key={idx} 
                className="group relative flex flex-col lg:flex-row items-stretch gap-4 lg:gap-0 p-3 rounded-none bg-[#1a1a1e] border border-[#383842] hover:border-white/40 transition-all duration-300"
              >
                {/* 1. Feature Title Column */}
                <div className="lg:w-1/3 flex items-center gap-4 p-4 lg:p-6 bg-transparent">
                  <div className="w-10 h-10 rounded-none bg-[#24242c] border border-[#383842] flex items-center justify-center shrink-0 text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base lg:text-lg font-bold text-white font-display leading-tight">
                    {row.feature}
                  </h3>
                </div>

                {/* 2. VS Split Comparison Column */}
                <div className="lg:w-2/3 flex flex-col sm:flex-row relative rounded-none border border-[#383842] bg-[#121214]">
                  
                  {/* Traditional (Old Way) */}
                  <div className="flex-1 p-5 sm:p-6 flex items-center justify-start sm:justify-center text-right sm:text-center relative overflow-hidden border-b sm:border-b-0 sm:border-l border-[#383842]">
                    <div className="relative z-10 flex flex-col sm:items-center gap-2 w-full">
                      <span className="text-[10px] uppercase tracking-[1.5px] font-mono font-bold text-[#999999]">الطريقة التقليدية</span>
                      <div className="flex items-start sm:items-center gap-2 opacity-60">
                        <X className="w-4 h-4 text-[#999999] shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-[#999999] text-xs sm:text-sm font-medium line-through">{row.traditional}</p>
                      </div>
                    </div>
                  </div>

                  {/* VS Divider Badge */}
                  <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-none bg-[#24242c] border border-[#383842] items-center justify-center z-20">
                    <span className="text-[10px] font-mono font-bold text-[#999999]">VS</span>
                  </div>

                  {/* Grido Studio (New Way) */}
                  <div className="flex-1 p-5 sm:p-6 flex items-center justify-start sm:justify-center text-right sm:text-center bg-[#24242c] relative overflow-hidden">
                    <div className="relative z-10 flex flex-col sm:items-center gap-2 w-full">
                      <span className="text-[10px] uppercase tracking-[1.5px] font-mono font-extrabold text-white">مع GRIDO STUDIO</span>
                      <div className="flex items-start sm:items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-white text-xs sm:text-sm font-bold">{row.grido}</p>
                      </div>
                    </div>
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
