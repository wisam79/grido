import { useState, lazy, Suspense } from 'react';
import { Download, Play, Shield, Zap, Laptop, CheckCircle2 } from 'lucide-react';
import { AppMockup } from './AppMockup';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useAppVersion } from '../../lib/version';

const Hero3DScene = lazy(() => import('./Hero3DScene').then((m) => ({ default: m.Hero3DScene })));

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

export function HeroSection() {
  const [showVideoModal, setShowVideoModal] = useState(false);
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

      {/* Layered Cinematic Glows */}
      <div className="absolute top-0 inset-x-0 h-[650px] bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(59,130,246,0.18),transparent_75%)] pointer-events-none z-0" />
      <div className="absolute top-1/3 inset-x-0 h-[400px] bg-[radial-gradient(ellipse_50%_35%_at_50%_30%,rgba(56,189,248,0.08),transparent_70%)] pointer-events-none z-0" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Header & Conversion Block */}
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto mb-10 sm:mb-12">
          
          {/* Version Badge */}
          <div className="ai-badge mb-4 sm:mb-5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
            <span className="font-semibold">{displayVersion} • محرك ذكاء اصطناعي محلي فوري</span>
          </div>

          {/* Grand Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-black text-white tracking-tight leading-[1.2] mb-5 text-balance max-w-4xl">
            <span className="inline-block">استوديو متكامل لصور الهوية والطباعة</span>
            <span className="block mt-2 sm:mt-3 text-transparent bg-clip-text bg-gradient-to-l from-[#60a5fa] via-[#38bdf8] to-white">
              عزل، تجهيز، وطباعة بـ 3 ثوانٍ فقط
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-sm sm:text-base md:text-lg text-[#A3A3A3] leading-relaxed max-w-2xl mb-8 font-normal text-balance">
            حل هندسي شامل لاستوديوهات ومراكز الطباعة: ضبط تلقائي لمعايير الجوازات والفيزا الدولية (ICAO)، عزل نقي للخلفيات، وتوفير 35% من الورق — يعمل محلياً 100% دون إنترنت.
          </p>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 mb-8 w-full sm:w-auto">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !h-13 !px-8 text-sm sm:text-base font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto justify-center"
            >
              <Download className="w-5 h-5" />
              <span>تحميل مجاني لـ Windows</span>
            </a>

            <button
              onClick={() => setShowVideoModal(true)}
              className="btn-secondary !h-13 !px-6 text-xs sm:text-sm font-semibold hover:scale-105 active:scale-95 transition-all w-full sm:w-auto justify-center"
            >
              <Play className="w-4 h-4 text-[#60a5fa] fill-[#60a5fa]" />
              <span>شاهد العرض السريع (60 ثانية)</span>
            </button>
          </div>

          {/* Unified Trust Strip */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-2 px-4 rounded-2xl bg-[#1A1A1A]/80 backdrop-blur-md border border-[#2C2C2C] text-xs text-[#9E9E9E] shadow-sm">
            <div className="flex items-center gap-1.5 text-white">
              <Shield className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="font-semibold">100% محلي دون إنترنت</span>
            </div>
            <span className="text-[#404040]">•</span>
            <div className="flex items-center gap-1.5 text-white">
              <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span className="font-semibold">3 ثوانٍ فقط للزبون</span>
            </div>
            <span className="text-[#404040] hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5 text-white">
              <Laptop className="w-3.5 h-3.5 text-[#60a5fa]" />
              <span className="font-semibold">خفيف جداً (&lt; 120MB ذاكرة)</span>
            </div>
            <span className="text-[#404040] hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5 text-white">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="font-semibold">مطابق لمعايير ICAO</span>
            </div>
          </div>

        </div>

        {/* Grand Desktop App Showcase */}
        <div className="relative w-full pt-2">
          <AppMockup />
        </div>

      </div>

      {/* Demo Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C] mb-4">
              <h3 className="text-sm font-bold text-white">عرض سريع: كيف يعمل استوديو جريدو؟</h3>
              <button
                onClick={() => setShowVideoModal(false)}
                className="w-7 h-7 rounded-lg bg-[#262626] hover:bg-[#333333] text-white flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center p-6 text-center text-[#9E9E9E]">
              <div className="w-14 h-14 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/50 flex items-center justify-center mb-3 text-[#60a5fa]">
                <Play className="w-6 h-6 fill-current ms-1" />
              </div>
              <p className="text-sm font-bold text-white mb-1">سرعة العمل في الاستوديو</p>
              <p className="text-xs max-w-sm text-[#9E9E9E]">
                عزل الخلفية، ضبط معايير الجوازات، وتوزيع الصور للطباعة بـ 3 ثوانٍ.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
