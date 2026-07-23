import { Cpu, Printer, FileCheck, Lock, Gauge, Layers } from 'lucide-react';

const BENEFITS = [
  {
    icon: Cpu,
    title: 'سرعة ومعالجة محلية 100%',
    description: 'تتم جميع العمليات والقص والحسابات مباشرة على جهازك بسرعة فائقة وبدون الحاجة لانتظار الرفع عبر الإنترنت للحفاظ على خصوصية الصور.',
    accent: 'brand',
    span: 'md:col-span-2',
  },
  {
    icon: Printer,
    title: 'توافق تام مع الطابعات',
    description: 'تصدير وطباعة مباشرة بأبعاد ومقاسات دقيقة بالميليمتر مطابقة للواقع لتجنب إهدار الورق والحبر.',
    accent: 'sky',
    span: '',
  },
  {
    icon: FileCheck,
    title: 'دعم الخطوط العربية',
    description: 'واجهة عربية بسيطة ومريحة تدعم كافة الخطوط والأبعاد لتسهيل العمل على الموظفين داخل الاستوديو.',
    accent: 'cyan',
    span: '',
  },
  {
    icon: Lock,
    title: 'خصوصية وأمان تام',
    description: 'لا يتم رفع أي صورة إلى الإنترنت. كل المعالجة تتم محلياً على جهازك الخاص.',
    accent: 'emerald',
    span: '',
  },
  {
    icon: Gauge,
    title: 'أداء فائق السرعة',
    description: 'محرك معالجة محسّن يتعامل مع آلاف الصور في وقت قياسي بدون تأخير.',
    accent: 'amber',
    span: '',
  },
];

const ACCENT_STYLES: Record<string, { iconBg: string; iconColor: string; border: string; glow: string }> = {
  brand: { iconBg: 'bg-brand-500/10', iconColor: 'text-brand-400', border: 'hover:border-brand-500/50', glow: 'bg-brand-500/10' },
  sky: { iconBg: 'bg-sky-500/10', iconColor: 'text-sky-400', border: 'hover:border-sky-500/50', glow: 'bg-sky-500/10' },
  cyan: { iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400', border: 'hover:border-cyan-500/50', glow: 'bg-cyan-500/10' },
  emerald: { iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', border: 'hover:border-emerald-500/50', glow: 'bg-emerald-500/10' },
  amber: { iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400', border: 'hover:border-amber-500/50', glow: 'bg-amber-500/10' },
};

export function BenefitsGrid() {
  return (
    <section id="benefits" className="relative py-24 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-400">لماذا Grido</span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-black font-display">لماذا يختار المحترفون Grido Studio؟</h2>
          <p className="mt-4 text-neutral-400 text-lg">صمم خصيصاً ليحل مشاكل الاستوديوهات اليومية بسرعة وكفاءة.</p>
        </div>

        {/* Bento grid */}
        <div className="grid md:grid-cols-3 gap-4 text-right">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            const accent = ACCENT_STYLES[benefit.accent];
            return (
              <div
                key={benefit.title}
                className={`group relative overflow-hidden p-7 rounded-2xl bg-ink-800/50 border border-white/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${accent.border} ${benefit.span}`}
              >
                <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${accent.glow}`} />
                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 ${accent.iconBg} border border-white/10`}>
                  <Icon className={`w-6 h-6 ${accent.iconColor}`} />
                </div>
                <h3 className="relative text-lg font-bold mb-2">{benefit.title}</h3>
                <p className="relative text-neutral-400 text-sm leading-relaxed">{benefit.description}</p>
              </div>
            );
          })}

          {/* Feature highlight card */}
          <div className="relative overflow-hidden p-7 rounded-2xl bg-gradient-to-br from-brand-500/15 to-sky-500/10 border border-brand-500/30 backdrop-blur-sm flex flex-col justify-between">
            <Layers className="w-8 h-8 text-brand-400 mb-4" />
            <div>
              <h3 className="text-lg font-bold mb-2">حلول متكاملة في مكان واحد</h3>
              <p className="text-neutral-300 text-sm leading-relaxed">
                من قص الهوية إلى الكولاج والترميم بالذكاء الاصطناعي — كل ما يحتاجه استوديو الصور في تطبيق واحد.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
