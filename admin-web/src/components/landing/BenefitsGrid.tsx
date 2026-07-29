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
    <section id="benefits" className="relative py-12 sm:py-20 border-t border-white/10 bg-gradient-to-b from-[#181818] via-[#1a2130] to-[#181818] overflow-hidden">
      {/* Studio Blue Right Accent Glow */}
      <div aria-hidden className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-sky-500/8 rounded-full blur-[120px] sm:blur-[160px]" />

      {/* Decorative Wave Vector SVG Background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10" xmlns="http://www.w3.org/2000/svg">
        <path d="M 0 100 Q 350 0 700 100 T 1400 100" fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="2" />
        <path d="M 0 180 Q 350 80 700 180 T 1400 180" fill="none" stroke="rgba(37,99,235,0.25)" strokeWidth="1.5" />
      </svg>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black font-display text-white mb-8 sm:mb-14">
          لماذا <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-brand-300">Grido Studio</span> ؟
        </h2>

        {/* 5 Cards Row with Ultra High Quality 3D Renders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {BENEFITS.map((benefit, index) => (
            <div
              key={benefit.title}
              className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#242936] to-[#1c2230] border border-sky-400/15 transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/40 hover:shadow-[0_8px_20px_rgba(56,189,248,0.12)] shadow-md flex flex-row sm:flex-col items-center justify-start sm:justify-between text-right sm:text-center group relative overflow-hidden gap-4 sm:gap-0"
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
