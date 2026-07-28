import { Monitor, Edit3, ShieldCheck, Zap, Image } from 'lucide-react';

const BENEFITS = [
  {
    icon: Monitor,
    title: 'يدعم كل الأجهزة',
    description: 'يعمل على جميع إصدارات ويندوز خفيف ولا يستهلك موارد عالية.',
  },
  {
    icon: Edit3,
    title: 'سهولة الاستخدام',
    description: 'واجهة بسيطة تناسب الجميع بدون الحاجة لخبرة تقنية.',
  },
  {
    icon: ShieldCheck,
    title: 'جودة احترافية',
    description: 'تحسين تلقائي لجودة الوجه وتوازن الألوان والإضاءة.',
  },
  {
    icon: Zap,
    title: 'توفير الوقت والجهد',
    description: 'أتمتة كاملة في توزيع الصور والقص والحفظ بضغطة واحدة.',
  },
  {
    icon: Image,
    title: 'جاهز للطباعة فوراً',
    description: 'إعدادات احترافية تدعم CMYK و Dpi عالية تناسب جميع المطبوعات.',
  },
];

export function BenefitsGrid() {
  return (
    <section id="benefits" className="relative py-20 border-t border-white/10 bg-[#0b1120] overflow-hidden">
      {/* Decorative Wave Vector SVG Background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10" xmlns="http://www.w3.org/2000/svg">
        <path d="M 0 100 Q 350 0 700 100 T 1400 100" fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth="2" />
        <path d="M 0 180 Q 350 80 700 180 T 1400 180" fill="none" stroke="rgba(37,99,235,0.5)" strokeWidth="1.5" />
      </svg>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-5xl font-black font-display text-white mb-14">
          لماذا <span className="text-brand-400">Grido Studio</span> ؟
        </h2>

        {/* 5 Cards Row matching exact reference mockup design with decorative SVG icon rings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="p-7 rounded-2xl bg-[#121826] border border-white/10 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-brand-500/50 shadow-xl flex flex-col items-center justify-between text-center group relative overflow-hidden"
              >
                {/* Decorative Icon Glow & Inner SVG Ring */}
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-brand-500/20 to-cyan-500/10 border border-brand-400/40 flex items-center justify-center mb-6 shadow-md shadow-brand-500/20 transition-transform group-hover:scale-110">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="1" strokeDasharray="4 4" />
                  </svg>
                  <Icon className="w-7 h-7 text-cyan-400 relative z-10" />
                </div>

                <div>
                  <h3 className="text-lg font-bold font-display text-white mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-[#A1A1AA] text-xs leading-relaxed font-sans">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
