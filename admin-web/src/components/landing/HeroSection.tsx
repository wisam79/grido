import { useState, lazy, Suspense } from 'react';
import { Download, Play, Shield, Zap, Laptop, CheckCircle2 } from 'lucide-react';
import { AppMockup } from './AppMockup';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { TourModal } from '../common/TourModal';
import { useAppVersion } from '../../lib/version';

const Hero3DScene = lazy(() => import('./Hero3DScene').then((m) => ({ default: m.Hero3DScene })));

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

/** جولة الخطوات الثلاث — تحل محل مودال الفيديو الوهمي بمحتوى حقيقي ملموس */
const QUICK_TOUR_STEPS = [
  {
    title: 'اسحب صورة الزبون وأفلتها',
    description: 'افتح الصورة من الكاميرا أو الجوال — Grido يكتشف الوجه ويقصّه تلقائياً وفق معيار الجواز المختار (عراقي، أمريكي، شينغن).',
  },
  {
    title: 'عزل الخلفية بضغطة واحدة',
    description: 'محرك الذكاء الاصطناعي المحلي يعزل الخلفية فورياً — أدق حواف للشعر والأطراف بلا هالات بيضاء، دون إنترنت تماماً.',
  },
  {
    title: 'ورقة طباعة جاهزة في ثوانٍ',
    description: 'توزيع آلي على ورقة A4 بخطوط قص دقيقة وحدود مستديرة — مطابقة تامة لمعايير الطباعة الرسمية، جاهزة للطابعة مباشرة.',
  },
];

export function HeroSection() {
  const [showTour, setShowTour] = useState(false);
  const version = useAppVersion();
  const displayVersion = version ? `إصدار v${version}` : 'إصدار 2026';

  return (
    <section id="top" className="relative pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden">
      {/* 3D Atmospheric Three.js Scene */}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <Hero3DScene />
        </Suspense>
      </ErrorBoundary>

      {/* Subtle Ambient Top Vignette — إضاءة خافتة جداً ونظيفة بأعلى الصفحة بلا ضبابية */}
      <div className="absolute top-0 inset-x-0 h-[400px] bg-[radial-gradient(ellipse_60%_35%_at_50%_0%,rgba(59,130,246,0.06),transparent_70%)] pointer-events-none z-0" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Top Header & Conversion Block */}
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto mb-10 sm:mb-12">

          {/* Version Badge — نسخة مميزة بنقطة نابضة */}
          <div className="ai-badge ai-badge-pulse mb-4 sm:mb-5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#60a5fa] animate-pulse" />
            <span className="font-semibold">{displayVersion} • محرك ذكاء اصطناعي محلي فوري</span>
          </div>

          {/* Grand Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-black text-white tracking-tight leading-[1.15] mb-5 text-balance max-w-4xl">
            <span className="inline-block">استوديو متكامل لصور الهوية والطباعة</span>
            <span className="block mt-2 sm:mt-3 text-gradient-brand">
              عزل، تجهيز، وطباعة في ثوانٍ معدودة
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-sm sm:text-base md:text-lg text-[#A3A3A3] leading-relaxed max-w-2xl mb-8 font-normal text-balance">
            حل هندسي شامل لاستوديوهات ومراكز الطباعة: ضبط تلقائي لمعايير الجوازات والفيزا الدولية (ICAO)، عزل نقي للخلفيات، وتوزيع شبكي يقلل هدر الورق — يعمل محلياً 100% دون إنترنت.
          </p>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 mb-8 w-full sm:w-auto">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !h-13 !px-8 text-sm sm:text-base font-bold shadow-xl shadow-[#3b82f6]/25 hover:shadow-[#3b82f6]/40 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto justify-center"
            >
              <Download className="w-5 h-5" />
              <span>تحميل مجاني لـ Windows</span>
            </a>

            <button
              onClick={() => setShowTour(true)}
              className="btn-secondary !h-13 !px-6 text-xs sm:text-sm font-semibold hover:scale-105 active:scale-95 transition-all w-full sm:w-auto justify-center"
            >
              <Play className="w-4 h-4 text-[#60a5fa] fill-[#60a5fa]" />
              <span>جولة سريعة: 3 خطوات فقط</span>
            </button>
          </div>

          {/* Unified Trust Strip — فواصل نقطية أنظف */}
          <div className="ds-card-inset flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-2.5 px-5 backdrop-blur-md text-xs text-[#9E9E9E] shadow-sm rounded-2xl border border-[#2C2C2C]/70">
            {[
              { icon: Shield, color: 'text-[#10b981]', label: '100% محلي دون إنترنت' },
              { icon: Zap, color: 'text-[#3b82f6]', label: 'سير عمل أسرع بخطوات أقل' },
              { icon: Laptop, color: 'text-[#60a5fa]', label: 'خفيف جداً (<120MB ذاكرة)' },
              { icon: CheckCircle2, color: 'text-[#10b981]', label: 'مطابق لمعايير ICAO' },
            ].map(({ icon: Icon, color, label }, i) => (
              <div key={label} className="flex items-center gap-1.5 text-white">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-[#3b82f6]/50 mx-0.5" aria-hidden="true" />}
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="font-semibold">{label}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Grand Desktop App Showcase */}
        <div className="relative w-full pt-2">
          <AppMockup />
        </div>

      </div>

      {/* Interactive Quick Tour Modal — بديل حقيقي متاح لمودال الفيديو الوهمي */}
      <TourModal
        open={showTour}
        onClose={() => setShowTour(false)}
        title="جولة سريعة: كيف يعمل استوديو جريدو؟"
        steps={QUICK_TOUR_STEPS}
      />
    </section>
  );
}
