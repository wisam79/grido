import { Download, Sparkles, ArrowLeft, Play } from 'lucide-react';
import { AppMockup } from './AppMockup';

const GITHUB_RELEASE_DOWNLOAD_URL =
  'https://github.com/wisam79/grido/releases/latest/download/GridoStudio-installer.exe';

const STATS = [
  { value: '+50,000', label: 'صورة مُعالَة يومياً', gradient: 'from-brand-400 to-sky-400' },
  { value: '99.9%', label: 'دقة قص الأبعاد', gradient: 'from-sky-400 to-accent-400' },
  { value: '4x', label: 'تكبير الجودة بالذكاء الاصطناعي', gradient: 'from-accent-400 to-rose-400' },
  { value: '100%', label: 'متوافق مع كل الطابعات', gradient: 'from-emerald-400 to-brand-500' },
];

const TRUST_TAGS = ['بدون إنترنت', 'خصوصية كاملة', 'يعمل على الويندوز'];

export function HeroSection() {
  return (
    <section id="top" className="relative pt-12 pb-16 md:pt-24 md:pb-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        {/* Eyebrow / Announcement pill */}
        <div className="flex justify-center">
          <a
            href="#demo"
            className="group inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm text-xs font-medium text-neutral-300 transition-colors hover:border-brand-500/40 hover:text-white"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            <span>الجيل الجديد لبرامج الاستوديو والطباعة الفورية</span>
            <span className="text-brand-400 font-semibold">v2.5</span>
            <ArrowLeft className="w-3.5 h-3.5 text-neutral-500 transition-transform group-hover:-translate-x-1 group-hover:text-brand-400" />
          </a>
        </div>

        {/* Headline */}
        <h1 className="mt-8 text-center text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.15] font-display">
          <span className="block text-white">تنسيق وتجهيز صور المعاملات</span>
          <span className="mt-2 block bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-sky-300 to-accent-400">
            جاهزة للطباعة والقص في 3 ثوانٍ
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-center text-base md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          برنامج الاستوديو الذكي لتوزيع صور الجوازات والبطاقات الرسمية، تحسين جودة الوجوه، وإنشاء الكولاج بضغطة زر واحدة بدون تعقيدات الفوتوشوب.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={GITHUB_RELEASE_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-brand-500 to-sky-500 hover:from-brand-400 hover:to-sky-400 text-white px-7 py-3.5 rounded-xl font-semibold shadow-lg shadow-brand-500/30 transition-all hover:shadow-brand-500/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            aria-label="تحميل نسخة الويندوز المجانية"
          >
            <Download className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
            <span>تحميل نسخة الويندوز المجانية</span>
          </a>
          <a
            href="#demo"
            className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-7 py-3.5 rounded-xl font-medium backdrop-blur-sm transition-all hover:border-white/20"
          >
            <Play className="w-4 h-4 text-brand-400 fill-brand-400" />
            <span>استكشاف المميزات</span>
          </a>
        </div>

        {/* Trust tags */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-500">
          {TRUST_TAGS.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400/70" />
              {tag}
            </span>
          ))}
        </div>

        {/* 3D App Mockup */}
        <div className="mt-16">
          <AppMockup />
        </div>

        {/* Stats bar */}
        <dl className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-ink-950/40 px-6 py-7 text-center transition-colors hover:bg-white/[0.04]"
            >
              <dd
                className={`text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r ${stat.gradient}`}
              >
                {stat.value}
              </dd>
              <dt className="mt-1.5 text-xs text-neutral-400 font-medium">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
