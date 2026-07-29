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
    <section id="top" className="relative pt-4 pb-10 sm:pt-6 sm:pb-14 overflow-hidden">
      {/* Decorative Vector SVG Blueprint Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 sm:opacity-25" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <circle cx="36" cy="36" r="1" fill="rgba(59,130,246,0.3)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      {/* Desktop Blue Glow (Hidden on Mobile to Prevent Overflow) */}
      <div
        aria-hidden
        className="hidden sm:block pointer-events-none absolute top-10 right-0 w-[650px] h-[550px] bg-gradient-to-l from-brand-600/25 via-blue-600/15 to-transparent rounded-full blur-[140px] opacity-80"
      />
      {/* Mobile Subtle Center Glow */}
      <div
        aria-hidden
        className="sm:hidden pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-[240px] bg-brand-500/20 rounded-full blur-[80px]"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Split 2-Column Hero Grid */}
        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Column 1: Hero Text & CTAs */}
          <div className="lg:col-span-5 text-right space-y-4 sm:space-y-6">
            {/* Version Badge */}
            <div>
              <a
                href="#features"
                className="inline-flex items-center gap-2 sm:gap-3 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-white/15 bg-[#242424]/90 backdrop-blur-md text-[10px] sm:text-xs font-semibold text-neutral-200 transition-all hover:border-blue-500/50 shadow-sm"
              >
                <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white font-extrabold text-[10px] sm:text-[11px]">
                  v1.2.3
                </span>
                <span className="text-neutral-300 font-medium">الإصدار الجديد متوفر</span>
                <span className="text-blue-400 font-bold hidden xs:inline">| طباعة بضغطة زر</span>
              </a>
            </div>

            {/* Headline */}
            <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-black leading-snug sm:leading-[1.25] font-display">
              <span className="block text-white">تنسيق وتجهيز صور المعاملات</span>
              <span className="mt-1.5 sm:mt-2 block bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-blue-300 to-indigo-300">
                جاهزة للطباعة والقص في 3 ثوان
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-[#A1A1AA] leading-relaxed max-w-xl font-sans">
              توزيع تلقائي لصور الجوازات والبطاقات، دعم ألوان CMYK، وترميم الوجوه بالذكاء الاصطناعي بضغطة زر واحدة.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-5 sm:px-6 py-3 rounded-xl font-extrabold font-display text-xs sm:text-sm shadow-md border border-blue-400/20 transition-all active:scale-95 cursor-pointer"
                aria-label="تحميل ملف التثبيت (Setup)"
              >
                <Download className="w-4 h-4 text-white" />
                <span>تحميل ملف التثبيت (Setup)</span>
              </a>
              <a
                href="/api/download?type=portable"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#242424]/90 hover:bg-[#2d2d2d] border border-white/15 text-neutral-200 hover:text-white px-4 sm:px-5 py-3 rounded-xl font-bold font-display text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer shadow-sm"
                aria-label="نسخة محمولة (Portable)"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>نسخة محمولة (Portable)</span>
              </a>
            </div>

            {/* Trust Tags */}
            <div className="flex flex-wrap items-center justify-start gap-3 sm:gap-4 text-[11px] sm:text-xs text-[#A1A1AA] font-semibold pt-1">
              {TRUST_TAGS.map((tag) => {
                const Icon = tag.icon;
                return (
                  <span key={tag.label} className="inline-flex items-center gap-1.5 bg-[#1c1c1c] sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border border-white/5 sm:border-0">
                    <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{tag.label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Column 2: App Showcase */}
          <div className="lg:col-span-7 relative w-full pt-2 sm:pt-0">
            {/* Desktop Mockup (Tablet/Desktop) */}
            <div className="hidden sm:block">
              <AppMockup />
            </div>

            {/* Mobile Native Feature Showcase Card (Phone) */}
            <div className="sm:hidden w-full rounded-2xl bg-[#1c1c1c] border border-white/15 p-3.5 shadow-2xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="mr-1.5 font-mono text-[10px] text-white font-bold">Grido Studio Mobile</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                  ⚡ 3 ثوانٍ
                </span>
              </div>

              {/* Passport Grid Sample Card */}
              <div className="bg-[#141414] p-3 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span>A4 Paper Sheet</span>
                  <span className="text-brand-400 font-bold">6 صور هوية (40×32 ملم)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="aspect-[3/4] bg-white rounded overflow-hidden border border-neutral-300 relative shadow-sm">
                      <img src="/sample-passport.png" alt="Passport Sample" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] font-mono text-center text-white py-0.5">
                        40×32mm
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-0.5">
                <span>DPI: 300</span>
                <span>CMYK Ready</span>
                <span className="text-emerald-400 font-bold">0% Paper Waste</span>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Stats Bar */}
        <div className="mt-8 sm:mt-16 border-t border-white/10 pt-6 sm:pt-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-5xl mx-auto">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex flex-col items-center justify-center gap-1 p-3 sm:p-0 rounded-xl bg-[#1a1a1a] sm:bg-transparent border border-white/5 sm:border-0 text-center">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-brand-400 shrink-0" />
                    <span className="text-lg sm:text-3xl font-black font-display text-white tracking-tight">
                      {stat.value}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-[#A1A1AA]">
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
