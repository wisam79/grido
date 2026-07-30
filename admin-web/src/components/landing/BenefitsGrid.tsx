import { Sparkles } from 'lucide-react';

const BENEFITS: {
  img: string;
  title: string;
  description: string;
}[] = [
  {
    img: '/3d-monitor.png',
    title: 'يدعم كل الأجهزة',
    description: 'يعمل على جميع إصدارات ويندوز خفيف ولا يستهلك موارد عالية.',
  },
  {
    img: '/3d-edit.png',
    title: 'سهولة الاستخدام',
    description: 'واجهة بسيطة تناسب الجميع بدون الحاجة لخبرة تقنية.',
  },
  {
    img: '/3d-shield.png',
    title: 'جودة احترافية',
    description: 'تحسين تلقائي لجودة الوجه وتوازن الألوان والإضاءة.',
  },
  {
    img: '/3d-zap.png',
    title: 'توفير الوقت والجهد',
    description: 'أتمتة كاملة في توزيع الصور والقص والحفظ بضغطة واحدة.',
  },
  {
    img: '/3d-printer.png',
    title: 'جاهز للطباعة فوراً',
    description: 'إعدادات احترافية تدعم CMYK و Dpi عالية تناسب جميع المطبوعات.',
  },
];

export function BenefitsGrid() {
  return (
    <section id="benefits" className="relative py-16 sm:py-24 lg:py-28 border-t border-[#383842] bg-[#121214] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-16">
          <span className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-none border border-[#383842] bg-[#1a1a1e] text-xs font-mono font-bold text-[#f0f0fa] tracking-[2px] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>المزايا المتقدمة</span>
          </span>
          <h2 className="stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight uppercase leading-tight">
            لماذا يختار أصحاب الاستوديوهات <span className="text-[#f0f0fa]">GRIDO STUDIO</span>؟
          </h2>
          <p className="stagger-3 mt-4 text-[#f0f0fa] text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">
            سرعة، دقة عالية، وبدون تعقيد.
          </p>
        </div>

        {/* 5 Cards Row */}
        <div className="stagger-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {BENEFITS.map((benefit, index) => (
            <div
              key={benefit.title}
              className="p-5 sm:p-6 rounded-none bg-[#1a1a1e] border border-[#383842] hover:border-white/40 transition-all duration-300 flex flex-row sm:flex-col items-center justify-start sm:justify-between text-right sm:text-center group relative overflow-hidden gap-4 sm:gap-0"
            >
              {/* Top Inner Light Flare Overlay */}
              <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-sky-400/10 to-transparent pointer-events-none" />

              {/* High Resolution 3D Studio Graphic Asset with Float Animation */}
              <div 
                className="relative w-16 h-16 sm:w-28 sm:h-28 sm:mb-5 shrink-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-125 animate-float"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <img
                  src={benefit.img}
                  alt={benefit.title}
                  className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                />
              </div>

              <div className="relative z-10">
                <h3 className="text-base sm:text-lg font-bold font-display text-white mb-1 sm:mb-2 drop-shadow-xs">
                  {benefit.title}
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed font-sans font-medium">
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
