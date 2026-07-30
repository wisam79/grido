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
    <section id="top" className="relative pt-6 pb-14 sm:pt-10 sm:pb-20 lg:pt-12 lg:pb-24 overflow-hidden">
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
        className="hidden sm:block pointer-events-none absolute top-10 right-0 w-[500px] h-[450px] bg-gradient-to-l from-brand-600/15 via-blue-600/10 to-transparent rounded-full blur-[120px] opacity-50"
      />
      {/* Mobile Subtle Center Glow */}
      <div
        aria-hidden
        className="sm:hidden pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-brand-500/10 rounded-full blur-[60px]"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Split 2-Column Hero Grid */}
        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Column 1: Hero Text & CTAs */}
          <div className="lg:col-span-5 text-right space-y-4 sm:space-y-6">
            {/* Version Badge */}
            {/* Version Eyebrow */}
            <div className="stagger-1">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none border border-[#383842] bg-[#1a1a1e] text-xs font-mono font-bold text-[#f0f0fa] tracking-[2px] uppercase">
                <span className="text-white font-extrabold">VERSION 1.2.3</span>
                <span className="text-[#999999]">| MISSION READY</span>
              </span>
            </div>

            {/* Headline */}
            <h1 className="stagger-2 text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black leading-tight sm:leading-[1.15] font-display uppercase tracking-tight text-white">
              <span>تنسيق صور المعاملات</span>
              <span className="mt-2 block text-[#f0f0fa]">
                في 3 ثوانٍ فقط
              </span>
            </h1>

            {/* Subtitle */}
            <p className="stagger-3 text-sm sm:text-base text-[#f0f0fa] leading-relaxed max-w-xl font-sans font-medium">
              توزيع تلقائي للجوازات والبطاقات، دعم ألوان CMYK، وترميم الوجوه بالذكاء الاصطناعي.
            </p>

            {/* SpaceX Pill CTAs */}
            <div className="stagger-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-white hover:bg-[#f0f0fa] text-black px-8 py-4 rounded-full font-extrabold text-xs uppercase tracking-[1px] border border-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="تحميل ملف التثبيت (Setup)"
              >
                <Download className="w-4 h-4 text-black shrink-0" />
                <span>تحميل ملف التثبيت (.EXE)</span>
              </a>
              <a
                href="/api/download?type=portable"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-[rgba(240,240,250,0.1)] hover:bg-[rgba(240,240,250,0.2)] border border-[#555555] text-[#f0f0fa] hover:text-white px-6 py-4 rounded-full font-extrabold text-xs uppercase tracking-[1px] transition-all cursor-pointer"
                aria-label="نسخة محمولة (Portable)"
              >
                <Download className="w-4 h-4 text-[#f0f0fa] shrink-0" />
                <span>نسخة محمولة (PORTABLE)</span>
              </a>
            </div>

            {/* Trust Tags */}
            <div className="stagger-4 flex flex-wrap items-center justify-start gap-4 text-xs text-[#999999] font-mono tracking-[1px] uppercase pt-2">
              {TRUST_TAGS.map((tag) => {
                const Icon = tag.icon;
                return (
                  <span key={tag.label} className="inline-flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>{tag.label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Column 2: App Showcase */}
          <div className="stagger-5 lg:col-span-7 relative w-full pt-2 sm:pt-0">
            {/* Desktop Mockup (Tablet/Desktop) */}
            <div className="hidden sm:block">
              <AppMockup />
            </div>

            {/* Mobile Native Feature Showcase Card (Phone) */}
            <div className="sm:hidden w-full rounded-none bg-[#1a1a1e] border border-[#383842] p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs border-b border-[#383842] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span className="font-mono text-[10px] text-white font-bold tracking-[1.5px] uppercase">Grido Studio Mobile</span>
                </div>
                <span className="text-[10px] font-mono text-white bg-[#24242c] px-2 py-0.5 border border-[#383842] font-bold uppercase tracking-[1px]">
                  3 SECONDS
                </span>
              </div>

              {/* Passport Grid Sample Card */}
              <div className="bg-[#121214] p-3 rounded-none border border-[#383842] space-y-2">
                <div className="flex items-center justify-between text-[10px] text-[#999999] font-mono uppercase tracking-[1px]">
                  <span>A4 Paper Sheet</span>
                  <span className="text-white font-bold">6 PHOTOS (40×32mm)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="aspect-[3/4] bg-white rounded-none overflow-hidden border border-neutral-300 relative shadow-sm">
                      <img src="/sample-passport.png" alt="Passport Sample" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/90 text-[7px] font-mono text-center text-white py-0.5 uppercase tracking-[0.5px]">
                        40×32mm
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#999999] uppercase tracking-[1px] pt-0.5">
                <span>DPI: 300</span>
                <span>CMYK READY</span>
                <span className="text-white font-bold">0% WASTE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Stats Bar */}
        <div className="mt-12 sm:mt-20 border-t border-[#383842] pt-8 sm:pt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex flex-col items-center justify-center gap-1.5 p-5 rounded-none bg-[#1a1a1e] border border-[#383842] text-center">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-white shrink-0" />
                    <span className="text-xl sm:text-3xl font-black font-display text-white tracking-tight">
                      {stat.value}
                    </span>
                  </div>
                  <span className="text-xs font-mono uppercase tracking-[1px] text-[#999999]">
                    {stat.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Supported Photo Printers & Lab Equipment Strip */}
          <div className="mt-8 pt-6 border-t border-[#383842] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
            <span className="text-xs font-mono font-bold text-[#999999] uppercase tracking-[1.5px]">
              متوافق 100% مع طابعات ومختبرات التصوير الرسمية:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono font-bold text-[#f0f0fa] uppercase tracking-[1px]">
              <span className="px-3 py-1.5 rounded-none bg-[#1a1a1e] border border-[#383842]">
                EPSON SureLab
              </span>
              <span className="px-3 py-1.5 rounded-none bg-[#1a1a1e] border border-[#383842]">
                Canon PIXMA / PRO
              </span>
              <span className="px-3 py-1.5 rounded-none bg-[#1a1a1e] border border-[#383842]">
                DNP DS-Series
              </span>
              <span className="px-3 py-1.5 rounded-none bg-[#1a1a1e] border border-[#383842]">
                HP DesignJet
              </span>
              <span className="px-3 py-1.5 rounded-none bg-[#1a1a1e] border border-[#383842]">
                Noritsu QSS
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
