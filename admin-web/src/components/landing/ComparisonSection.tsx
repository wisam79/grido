import { CheckCircle2, XCircle, Sparkles, Zap, ShieldCheck } from 'lucide-react';

const COMPARISON_ROWS = [
  {
    feature: 'تجهيز ورقة الطباعة والتقطيع',
    grido: 'تلقائي بنقرة واحدة (أقل من ثانية)',
    traditional: 'يدوي محبط يستغرق 5 - 10 دقائق',
    highlight: true,
  },
  {
    feature: 'دقة المقاسات الرسمية (الهوية والفيزا)',
    grido: '100% مطابقة للمواصفات الحكومية',
    traditional: 'عرضة للأخطاء البشرية وإعادة الطباعة',
    highlight: false,
  },
  {
    feature: 'ترميم ملامح الوجه (AI Restoration)',
    grido: 'محلي فوري بـ CodeFormer + Real-ESRGAN',
    traditional: 'يتطلب خبرة فوتوشوب معقدة أو اشتراكات',
    highlight: true,
  },
  {
    feature: 'هدر ور ورق الطباعة (Paper Waste)',
    grido: '0% هدر مع شبكات توزيع الخلايا الذكية',
    traditional: 'هدر متكرر للأوراق والحبر الثمين',
    highlight: false,
  },
  {
    feature: 'العمل بدون إنترنت (Offline 100%)',
    grido: 'سرعة فائقة وخصوصية كاملة للصور',
    traditional: 'بطء في التعامل والاعتماد على سيرفرات خارجية',
    highlight: false,
  },
];

export function ComparisonSection() {
  return (
    <section className="relative py-24 border-t border-white/10 bg-[#0b1120] overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-cyan-400 text-xs font-bold mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>مقارنة الأداء الفعلي</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black font-display text-white">
            لماذا يتحول أصحاب الاستوديوهات إلى <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-cyan-400">Grido Studio</span>؟
          </h2>
          <p className="mt-4 text-[#A1A1AA] text-base sm:text-lg">
            فارق هائل في سرعة الإنتاجية ودقة العمل مقارنة بالطرق التقليدية القديمة.
          </p>
        </div>

        {/* Comparison Desktop Table & Mobile Cards */}
        <div className="rounded-3xl border border-white/15 bg-[#121826]/90 backdrop-blur-md overflow-hidden shadow-2xl">
          {/* Table Header (Desktop) */}
          <div className="hidden md:grid grid-cols-12 bg-white/[0.03] border-b border-white/10 p-6 text-sm font-bold text-neutral-300">
            <div className="col-span-4 flex items-center gap-2 text-white font-display">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>الميزة / المعيار</span>
            </div>
            <div className="col-span-4 text-center text-cyan-300 font-extrabold font-display text-base flex items-center justify-center gap-1.5 bg-brand-500/15 py-2.5 rounded-xl border border-brand-500/30">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Grido Studio</span>
            </div>
            <div className="col-span-4 text-center text-neutral-400 font-display py-2.5">
              <span>الطريقة التقليدية</span>
            </div>
          </div>

          {/* Rows (Desktop Grid & Mobile Stacked Cards) */}
          <div className="divide-y divide-white/10">
            {COMPARISON_ROWS.map((row, idx) => (
              <div key={idx} className="p-4 sm:p-6 transition-colors hover:bg-white/[0.02]">
                {/* Desktop Grid Layout */}
                <div className="hidden md:grid grid-cols-12 items-center text-sm">
                  <div className="col-span-4 font-bold text-white font-display pr-2">
                    {row.feature}
                  </div>
                  <div className="col-span-4 text-center font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 py-3 px-3 rounded-xl flex items-center justify-center gap-2 mx-4 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{row.grido}</span>
                  </div>
                  <div className="col-span-4 text-center text-neutral-400 py-2 px-2 flex items-center justify-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{row.traditional}</span>
                  </div>
                </div>

                {/* Mobile Responsive Stacked Card */}
                <div className="md:hidden space-y-3">
                  <div className="font-extrabold text-white text-sm flex items-center gap-2 font-display">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{row.feature}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2 text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-emerald-400/80 uppercase block font-mono mb-0.5">Grido Studio</span>
                        <span>{row.grido}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2 text-xs text-neutral-400">
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block font-mono mb-0.5">الطريقة التقليدية</span>
                        <span>{row.traditional}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
