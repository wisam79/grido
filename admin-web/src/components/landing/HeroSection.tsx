import { useEffect, useState, useRef } from 'react';
import { Download, Printer, Gauge, Target, Users, Monitor, ShieldCheck, Zap } from 'lucide-react';
import { AppMockup } from './AppMockup';
import { useAppVersion } from '../../lib/version';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const STATS = [
  { icon: Printer, value: 100, suffix: '%', label: 'متوافق مع كل الطابعات' },
  { icon: Gauge, value: 4, suffix: 'x', label: 'أسرع من الطرق اليدوية' },
  { icon: Target, value: 99.9, suffix: '%', isFloat: true, label: 'دقة في النتائج' },
  { icon: Users, value: 50000, suffix: '+', label: 'صورة معالجة يومياً' },
];

const TRUST_TAGS = [
  { icon: ShieldCheck, label: 'أساسيات بدون إنترنت' },
  { icon: Zap, label: 'خفيف وسريع' },
  { icon: Monitor, label: 'يدعم جميع ويندوز' },
];

function AnimatedCounter({ end, suffix = '', isFloat = false }: { end: number, suffix?: string, isFloat?: boolean }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let start = 0;
          const duration = 800; // Count up (kept short to limit rAF work)
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // easeOutExpo for dramatic slowdown at the end
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            const currentCount = start + (end - start) * easeProgress;
            setCount(currentCount);

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  const displayValue = isFloat ? count.toFixed(1) : Math.floor(count).toLocaleString('en-US');

  return <span ref={ref}>{displayValue}{suffix}</span>;
}

export function HeroSection() {
  const version = useAppVersion();

  return (
    <section id="top" className="relative pt-6 pb-20 sm:pt-10 sm:pb-28 lg:pt-12 lg:pb-36 overflow-hidden">
      {/* Decorative Vector SVG Blueprint Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 sm:opacity-25" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <circle cx="36" cy="36" r="1" fill="rgba(255,255,255,0.15)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      {/* Desktop White Glow (Hidden on Mobile to Prevent Overflow) */}
      <div
        aria-hidden
        className="hidden sm:block pointer-events-none absolute top-10 right-0 w-[500px] h-[450px] bg-gradient-to-l from-white/10 via-white/5 to-transparent rounded-full blur-[80px] opacity-50"
      />
      {/* Mobile Subtle Center Glow */}
      <div
        aria-hidden
        className="sm:hidden pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-white/10 rounded-full blur-[40px]"
      />

      {/* جسيمات عائمة (Particles) فوق طبقة الشبكة — عدد أقل وحركة أبطأ لتخفيف الحمل */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden sm:block">
        <span className="particle w-1 h-1 top-[30%] right-[45%]" style={{ ['--dur' as string]: '14s', ['--delay' as string]: '1.2s', ['--drift-y' as string]: '-26px' }} />
        <span className="particle w-1 h-1 top-[60%] right-[70%]" style={{ ['--dur' as string]: '12s', ['--delay' as string]: '0.6s', ['--drift-x' as string]: '-16px' }} />
        <span className="particle w-1.5 h-1.5 top-[12%] right-[80%]" style={{ ['--dur' as string]: '16s', ['--delay' as string]: '0.4s' }} />
      </div>

      {/* خطوط قياس SVG زخرفية (crosshair marks بأسلوب مخطط هندسي) */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 w-full h-full z-0 hidden lg:block" xmlns="http://www.w3.org/2000/svg">
        <g stroke="rgba(255,255,255,0.14)" strokeWidth="1">
          <path d="M 6% 22% h 14 M 6% 22% v 14" transform="translate(-7,-7)" />
          <path d="M 94% 16% h -14 M 94% 16% v 14" />
          <path d="M 8% 84% h 14 M 8% 84% v -14" />
          <path d="M 92% 78% h -14 M 92% 78% v -14" />
        </g>
        <g fill="rgba(255,255,255,0.25)" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="1">
          <text x="6.8%" y="20.5%">+</text>
          <text x="93%" y="14.5%">+</text>
        </g>
      </svg>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Split 2-Column Hero Grid */}
        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Column 1: Hero Text & CTAs */}
          <div className="lg:col-span-5 text-right space-y-4 sm:space-y-6">
            {/* Version Badge */}
            {/* Version Eyebrow */}
            <div className="stagger-1">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none border border-subtle bg-elevated text-xs font-bold text-secondary">
                <span className="text-white font-extrabold">الإصدار {version ?? '…'}</span>
                <span className="text-tertiary">| جاهز للمهمة</span>
              </span>
            </div>

            {/* Headline — كتلة بصرية درامية فوق عمود ضوئي طبقي */}
            <h1 className="stagger-2 title-depth relative text-4xl xs:text-5xl sm:text-6xl lg:text-7xl font-black leading-tight sm:leading-[1.12] font-display text-white">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-10 right-[-15%] w-[420px] h-[340px] rounded-full opacity-60 blur-[60px] bg-gradient-to-l from-white/10 via-white/5 to-transparent"
              />
              <span className="relative block">تنسيق صور المعاملات</span>
              <span className="relative mt-2 block text-secondary">
                في <span className="font-mono tracking-tight text-white inline-block animate-[float_5s_ease-in-out_infinite_alternate]">3</span> ثوانٍ فقط
              </span>
            </h1>

            {/* Subtitle */}
            <p className="stagger-3 text-sm sm:text-base text-secondary leading-relaxed max-w-xl font-sans font-medium">
              توزيع تلقائي للجوازات والبطاقات، دعم ألوان CMYK، وترميم الوجوه بالذكاء الاصطناعي.
            </p>

            {/* SpaceX Pill CTAs with Smart Hover */}
            <div className="stagger-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                }}
                className="group relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2.5 bg-white text-black px-8 py-4 rounded-full font-extrabold text-xs border border-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95 cursor-pointer"
                aria-label="تحميل ملف التثبيت (.EXE)"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'radial-gradient(120px circle at var(--mouse-x) var(--mouse-y), rgba(0,0,0,0.08), transparent 100%)' }} />
                <Download className="w-4 h-4 text-black shrink-0 relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5" />
                <span className="relative z-10">تحميل ملف التثبيت (.EXE)</span>
              </a>
              <a
                href="/api/download?type=portable"
                target="_blank"
                rel="noopener noreferrer"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                }}
                className="group relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2.5 bg-[rgba(240,240,250,0.1)] border border-[#555555] text-secondary px-6 py-4 rounded-full font-extrabold text-xs transition-all duration-300 hover:scale-[1.03] hover:border-white active:scale-95 cursor-pointer"
                aria-label="تحميل النسخة المحمولة"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'radial-gradient(120px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.1), transparent 100%)' }} />
                <Download className="w-4 h-4 text-secondary shrink-0 relative z-10 group-hover:text-white transition-all duration-300 group-hover:-translate-y-0.5" />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">النسخة المحمولة</span>
              </a>
            </div>

            {/* Trust Tags */}
            <div className="stagger-4 flex flex-wrap items-center justify-start gap-4 text-xs text-tertiary font-bold pt-2">
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
            <div className="sm:hidden w-full rounded-none bg-elevated border border-subtle p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs border-b border-subtle pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span className="text-[10px] text-white font-bold">Grido Studio — نسخة الجوال</span>
                </div>
                <span className="text-[10px] text-white bg-elevated/70 px-2 py-0.5 border border-subtle font-bold">
                  <AnimatedCounter end={3} suffix=" ثوانٍ" />
                </span>
              </div>

              {/* Passport Grid Sample Card */}
              <div className="bg-secondary p-3 rounded-none border border-subtle space-y-2">
                <div className="flex items-center justify-between text-[10px] text-tertiary font-bold">
                  <span>ورقة A4</span>
                  <span className="text-white font-bold">6 صور (40×32 ملم)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="aspect-[3/4] bg-white rounded-none overflow-hidden border border-neutral-300 relative shadow-sm">
                      <img src="/sample-passport.png" alt="Passport Sample" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/90 text-[7px] font-bold text-center text-white py-0.5">
                        40×32 ملم
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-tertiary font-bold pt-0.5">
                <span>DPI: 300</span>
                <span>جاهز CMYK</span>
                <span className="text-white font-bold">صفر هدر</span>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Stats Bar */}
        <div className="mt-12 sm:mt-20 border-t border-subtle pt-8 sm:pt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="spotlight-card flex flex-col items-center justify-center gap-1.5 p-5 rounded-xl text-center">
                  <div className="flex items-center gap-2 relative z-10">
                    <Icon className="w-5 h-5 text-white shrink-0" />
                    <span className="text-xl sm:text-3xl font-black font-display text-white tracking-tight">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} isFloat={stat.isFloat} />
                    </span>
                  </div>
                  <span className="relative z-10 text-xs font-bold text-tertiary">
                    {stat.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Supported Photo Printers & Lab Equipment Strip */}
          <div className="mt-8 pt-6 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
            <span className="text-xs font-bold text-tertiary">
              متوافق 100% مع طابعات ومختبرات التصوير الرسمية:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono font-bold text-secondary uppercase tracking-[1px]">
              <span className="px-3 py-1.5 rounded-none bg-elevated border border-subtle">
                EPSON SureLab
              </span>
              <span className="px-3 py-1.5 rounded-none bg-elevated border border-subtle">
                Canon PIXMA / PRO
              </span>
              <span className="px-3 py-1.5 rounded-none bg-elevated border border-subtle">
                DNP DS-Series
              </span>
              <span className="px-3 py-1.5 rounded-none bg-elevated border border-subtle">
                HP DesignJet
              </span>
              <span className="px-3 py-1.5 rounded-none bg-elevated border border-subtle">
                Noritsu QSS
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
