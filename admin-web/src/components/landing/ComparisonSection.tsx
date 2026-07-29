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
    <section id="comparison" className="relative py-12 sm:py-28 border-t border-white/5 bg-[#121212] overflow-hidden">
      {/* Premium Dark Gradient Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/20 via-[#121212] to-[#121212] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-20">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#1c1c1c] border border-white/5 text-brand-400 text-[11px] sm:text-xs font-bold mb-4 sm:mb-6 shadow-xl">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>مقارنة الأداء والمقاييس</span>
          </span>
          <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black font-display text-white mb-4 sm:mb-6 tracking-tight">
            لماذا يتحول الجميع إلى <span className="bg-clip-text text-transparent bg-gradient-to-l from-blue-400 to-brand-500">Grido Studio</span>؟
          </h2>
          <p className="text-neutral-400 text-sm sm:text-xl font-sans leading-relaxed">
            توقف عن هدر وقتك في المهام الروتينية المتكررة. دع الذكاء الاصطناعي والأتمتة ينجزان العمل في ثوانٍ.
          </p>
        </div>

        {/* Feature VS Cards Stack */}
        <div className="space-y-4 sm:space-y-6">
          {COMPARISON_ROWS.map((row, idx) => {
            const Icon = row.icon;
            return (
              <div 
                key={idx} 
                className="group relative flex flex-col lg:flex-row items-stretch gap-4 lg:gap-0 p-2 rounded-[2rem] bg-[#1a1a1a] border border-white/5 hover:bg-[#1e1e1e] hover:border-white/10 transition-all duration-500 shadow-lg hover:shadow-2xl"
              >
                {/* 1. Feature Title Column */}
                <div className="lg:w-1/3 flex items-center gap-4 p-6 lg:p-8 rounded-3xl bg-transparent">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-brand-500/20 group-hover:border-brand-500/30 group-hover:text-brand-400 transition-all duration-500 text-neutral-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-bold text-white font-display leading-tight">
                    {row.feature}
                  </h3>
                </div>

                {/* 2. VS Split Comparison Column */}
                <div className="lg:w-2/3 flex flex-col sm:flex-row relative rounded-[1.5rem] overflow-hidden border border-white/5 bg-[#141414]">
                  
                  {/* Traditional (Old Way) */}
                  <div className="flex-1 p-6 lg:p-8 flex items-center justify-start sm:justify-center text-right sm:text-center relative overflow-hidden group/trad">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-950/10 to-transparent opacity-0 group-hover/trad:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex flex-col sm:items-center gap-3 w-full">
                      <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-neutral-600">الطريقة التقليدية</span>
                      <div className="flex items-start sm:items-center gap-3 opacity-60">
                        <X className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-neutral-400 text-sm font-medium line-through decoration-rose-500/20">{row.traditional}</p>
                      </div>
                    </div>
                  </div>

                  {/* VS Divider Badge */}
                  <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#242424] border-4 border-[#1a1a1a] items-center justify-center z-20 shadow-xl">
                    <span className="text-[10px] font-black text-neutral-500 font-mono italic">VS</span>
                  </div>
                  {/* Mobile VS Divider */}
                  <div className="sm:hidden flex items-center justify-center -my-2 relative z-20">
                    <span className="bg-[#242424] px-3 py-1 rounded-full text-[10px] font-black text-neutral-500 font-mono italic border border-white/10 shadow-lg">VS</span>
                  </div>

                  {/* Grido Studio (New Way) */}
                  <div className="flex-1 p-6 lg:p-8 flex items-center justify-start sm:justify-center text-right sm:text-center bg-[#1c232e] relative overflow-hidden group-hover:bg-[#1a2b3c] transition-colors duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 blur-[60px] group-hover:bg-brand-400/30 transition-all duration-500" />
                    <div className="relative z-10 flex flex-col sm:items-center gap-3 w-full">
                      <span className="text-[10px] uppercase tracking-widest font-mono font-black text-brand-400">مع Grido Studio</span>
                      <div className="flex items-start sm:items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0 mt-0.5 sm:mt-0 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <p className="text-brand-50 text-sm font-bold text-shadow-sm">{row.grido}</p>
                      </div>
                    </div>
                    {/* Active Edge Highlight */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400/0 via-brand-400 to-brand-400/0 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
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
