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
    feature: 'هدر وررق الطباعة (Paper Waste)',
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
    <section className="relative py-24 border-t border-white/10 bg-ink-900/60 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>مقارنة الأداء الفعلي</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black font-display text-white">
            لماذا يتحول أصحاب الاستوديوهات إلى <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-accent-400">Grido Studio</span>؟
          </h2>
          <p className="mt-4 text-neutral-400 text-base sm:text-lg">
            فارق هائل في سرعة الإنتاجية ودقة العمل مقارنة بالطرق التقليدية القديمة.
          </p>
        </div>

        {/* Comparison Table / Cards */}
        <div className="rounded-3xl border border-white/15 bg-ink-950/80 backdrop-blur-md overflow-hidden shadow-2xl">
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-white/[0.03] border-b border-white/10 p-5 md:p-6 text-sm font-bold text-neutral-300">
            <div className="col-span-5 md:col-span-4 flex items-center gap-2 text-white">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>الميزة / المعيار</span>
            </div>
            <div className="col-span-4 md:col-span-4 text-center text-brand-400 font-extrabold text-base flex items-center justify-center gap-1.5 bg-brand-500/10 py-2 rounded-xl border border-brand-500/20">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Grido Studio</span>
            </div>
            <div className="col-span-3 md:col-span-4 text-center text-neutral-400 py-2">
              <span>الطريقة التقليدية</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/5">
            {COMPARISON_ROWS.map((row, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-12 p-4 md:p-6 items-center text-xs md:text-sm transition-colors hover:bg-white/[0.02] ${
                  row.highlight ? 'bg-brand-500/[0.02]' : ''
                }`}
              >
                <div className="col-span-5 md:col-span-4 font-bold text-white pr-2">
                  {row.feature}
                </div>

                <div className="col-span-4 md:col-span-4 text-center font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-3 px-2 rounded-xl flex items-center justify-center gap-2 mx-1 md:mx-4 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{row.grido}</span>
                </div>

                <div className="col-span-3 md:col-span-4 text-center text-neutral-400 py-2 px-2 flex items-center justify-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-500/70 flex-shrink-0 hidden sm:inline-block" />
                  <span>{row.traditional}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
