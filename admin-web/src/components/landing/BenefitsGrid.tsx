import { Sparkles } from 'lucide-react';

const BENEFITS: {
  img: string;
  title: string;
  description: string;
}[] = [
  {
    img: '/3d-monitor.png',
    title: 'يدعم كل الأجهزة',
    description: 'يعمل على جميع إصدارات ويندوز، خفيف ولا يستهلك موارد الجهاز.',
  },
  {
    img: '/3d-edit.png',
    title: 'سهولة الاستخدام',
    description: 'واجهة هندسية نظيفة تناسب الجميع بدون الحاجة لخبرة فوتوشوب.',
  },
  {
    img: '/3d-shield.png',
    title: 'جودة احترافية HD',
    description: 'تحسين تلقائي لملامح الوجه وتوازن الألوان والإضاءة بالذكاء الاصطناعي.',
  },
  {
    img: '/3d-zap.png',
    title: 'توفير الوقت والجهد',
    description: 'أتمتة كاملة في توزيع الصور والقص والحفظ بنقرة واحدة خلال 3 ثوانٍ.',
  },
  {
    img: '/3d-printer.png',
    title: 'جاهز للطباعة فوراً',
    description: 'إعدادات احترافية تدعم CMYK و Dpi عالية تناسب جميع المطابع والمعامل.',
  },
];

export function BenefitsGrid() {
  return (
    <section id="benefits" className="relative py-16 sm:py-24 lg:py-28 border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-16">
          <span className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-subtle bg-elevated text-xs font-mono font-bold text-secondary tracking-[2px] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>المزايا المتقدمة</span>
          </span>
          <h2 className="stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white uppercase leading-tight">
            لماذا يختار أصحاب الاستوديوهات <span className="text-secondary">GRIDO STUDIO</span>؟
          </h2>
          <p className="stagger-3 mt-4 text-secondary text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">
            سرعة فائقة، دقة عالية، وبدون تعقيد.
          </p>
        </div>

        {/* 5 Cards Row adhering to design.md Section 6.4 */}
        <div className="stagger-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {BENEFITS.map((benefit, index) => (
            <div
              key={benefit.title}
              className="spotlight-card rounded-2xl p-6 sm:p-7 flex flex-row sm:flex-col items-center justify-start sm:justify-between text-right sm:text-center group relative overflow-hidden gap-4 sm:gap-0 cursor-default bg-secondary border border-subtle hover:scale-[1.03] transition-transform duration-500"
            >
              {/* High Resolution 3D Studio Graphic Asset with Float Animation */}
              <div 
                className="benefit-icon relative w-16 h-16 sm:w-28 sm:h-28 sm:mb-5 shrink-0 flex items-center justify-center"
                style={{ animationDelay: `${index * 0.25}s` }}
              >
                <img
                  src={benefit.img}
                  alt={benefit.title}
                  className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-transform duration-500"
                />
              </div>

              <div className="relative z-10 space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold font-display text-white transition-colors duration-300">
                  {benefit.title}
                </h3>
                <p className="text-tertiary group-hover:text-secondary transition-colors duration-300 text-xs leading-relaxed font-sans font-medium">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
