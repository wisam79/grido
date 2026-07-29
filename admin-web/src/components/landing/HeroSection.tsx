import { Download, Printer, Gauge, Target, Users, Monitor, ShieldCheck, Zap } from 'lucide-react';
import { AppMockup } from './AppMockup';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const STATS = [
  { icon: Printer, value: '100%', label: 'متوافق مع كل الطابعات' },
  { icon: Gauge, value: '4x', label: 'أسرع من الطرق التنفيذية' },
  { icon: Target, value: '99.9%', label: 'دقة في النتائج' },
  { icon: Users, value: '50,000+', label: 'صورة معالجة يومياً' },
];

const TRUST_TAGS = [
  { icon: ShieldCheck, label: 'لا يحتاج إنترنت' },
  { icon: Zap, label: 'خفيف وسريع' },
  { icon: Monitor, label: 'يدعم جميع ويندوز' },
];

export function HeroSection() {
  return (
    <section id="top" className="relative pt-6 pb-14 overflow-hidden">
      {/* Decorative Vector SVG Blueprint Grid & Animated Laser Scan Line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <circle cx="48" cy="48" r="1.5" fill="rgba(59,130,246,0.4)" />
          </pattern>
          <linearGradient id="laser-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(59,130,246,0)" />
            <stop offset="50%" stopColor="rgba(59,130,246,0.8)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
        
        {/* Animated Laser Scan Beam */}
        <line x1="0" y1="20" x2="100%" y2="20" stroke="url(#laser-grad)" strokeWidth="2" className="animate-laser-scan" />

        {/* Constellation Vector Lines */}
        <g stroke="rgba(37,99,235,0.3)" strokeWidth="1" strokeDasharray="3 3">
          <line x1="120" y1="80" x2="300" y2="180" />
          <line x1="300" y1="180" x2="220" y2="340" />
          <line x1="850" y1="100" x2="1050" y2="220" />
        </g>
        <g fill="rgba(59,130,246,0.7)">
          <circle cx="120" cy="80" r="3" />
          <circle cx="300" cy="180" r="4" />
          <circle cx="220" cy="340" r="3" />
          <circle cx="850" cy="100" r="4" />
          <circle cx="1050" cy="220" r="3" />
        </g>

        {/* Tech Corner Brackets */}
        <g stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" fill="none">
          <path d="M 40,40 L 40,65 M 40,40 L 65,40" />
          <path d="M 1200,40 L 1200,65 M 1200,40 L 1175,40" />
        </g>
      </svg>

      {/* Main Blue Glow Behind Right Side Mockup */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-10 right-0 w-[650px] h-[550px] bg-gradient-to-l from-brand-600/25 via-blue-600/15 to-transparent rounded-full blur-[140px] opacity-80"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6">
        {/* Split 2-Column Hero Grid with Enlarged Mockup Column */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-6 items-center pt-2">
          {/* Column 1: Hero Text & CTAs (5 Columns) */}
          <div className="lg:col-span-5 text-right space-y-6">
            {/* Version Badge */}
            <div>
              <a
                href="#features"
                className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/15 bg-[#242424]/90 backdrop-blur-md text-xs font-semibold text-neutral-200 transition-all hover:border-blue-500/50 shadow-sm"
              >
                <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white font-extrabold text-[11px]">
                  v1.2.3
                </span>
                <span className="text-neutral-300 font-medium">الإصدار الجديد متوفر</span>
                <span className="text-blue-400 font-bold">| طباعة بضغطة زر</span>
              </a>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.25] font-display">
              <span className="block text-white">تنسيق وتجهيز صور المعاملات</span>
              <span className="mt-2 block bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-blue-300 to-indigo-300">
                جاهزة للطباعة والقص في 3 ثوان
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed max-w-xl font-sans">
              توزيع تلقائي لصور الجوازات والبطاقات، دعم ألوان CMYK، وترميم الوجوه بالذكاء الاصطناعي بضغطة زر واحدة.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 bg-brand-500 hover:bg-brand-400 text-white px-6 py-3 rounded-xl font-extrabold font-display text-xs sm:text-sm shadow-md border border-blue-400/20 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                aria-label="تحميل ملف التثبيت (Setup)"
              >
                <Download className="w-4 h-4 text-white" />
                <span>تحميل ملف التثبيت (Setup)</span>
              </a>
              <a
                href="/api/download?type=portable"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#242424]/90 hover:bg-[#2d2d2d] border border-white/15 text-neutral-200 hover:text-white px-5 py-3 rounded-xl font-bold font-display text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer shadow-sm"
                aria-label="نسخة محمولة (Portable)"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>نسخة محمولة (Portable)</span>
              </a>
            </div>

            {/* Trust Tags */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#A1A1AA] font-semibold pt-1">
              {TRUST_TAGS.map((tag) => {
                const Icon = tag.icon;
                return (
                  <span key={tag.label} className="inline-flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-blue-400" />
                    <span>{tag.label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Column 2: 3D App Mockup Perspective Window (7 Columns) */}
          <div className="lg:col-span-7 relative w-full">
            <AppMockup />
          </div>
        </div>

        {/* Horizontal Stats Bar (Full Width) */}
        <div className="mt-16 border-t border-white/10 pt-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex flex-col items-center justify-center gap-1.5 text-center">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-7 h-7 text-brand-400" />
                    <span className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
                      {stat.value}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#A1A1AA]">
                    {stat.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
