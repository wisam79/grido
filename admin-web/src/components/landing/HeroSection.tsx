import { useState } from 'react';
import { Download, Play, Shield, Zap, Laptop } from 'lucide-react';
import { AppMockup } from './AppMockup';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

export function HeroSection() {
  const [showVideoModal, setShowVideoModal] = useState(false);

  return (
    <section id="top" className="relative pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden">
      {/* Unified Ambient Glow */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(59,130,246,0.12),transparent_70%)] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Content Column (Right in RTL) */}
          <div className="lg:col-span-6 flex flex-col items-start text-start">
            
            {/* Version Badge */}
            <div className="ai-badge mb-5">
              <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
              <span>إصدار 2026 • محرك الوجوه الذكي</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[50px] font-black text-white tracking-tight leading-[1.18] mb-5">
              استوديو جريدو برو
              <span className="block mt-1.5 text-transparent bg-clip-text bg-gradient-to-l from-[#60a5fa] via-[#3b82f6] to-white">
                عزل، تجهيز، وطباعة بـ 3 ثوانٍ
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="text-sm sm:text-base text-[#9E9E9E] leading-relaxed max-w-lg mb-7 font-normal">
              البرنامج المكتبي الأسرع لتجهيز صور الجوازات والفيزا العالمية، عزل الخلفيات، وتوفير الورق لاستوديوهات ومراكز الطباعة.
            </p>

            {/* CTA Buttons Row */}
            <div className="flex flex-wrap items-center gap-3.5 mb-8 w-full sm:w-auto">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary !h-12 !px-7 text-sm sm:text-base w-full sm:w-auto justify-center font-bold tracking-wide"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>تحميل مجاني لويندوز</span>
              </a>

              <button
                onClick={() => setShowVideoModal(true)}
                className="btn-secondary !h-12 !px-5 text-xs sm:text-sm w-full sm:w-auto justify-center font-semibold"
              >
                <Play className="w-3.5 h-3.5 text-[#60a5fa] fill-[#60a5fa]" />
                <span>شاهد العرض السريع</span>
              </button>
            </div>

            {/* Trust Capsules (Punchy & Clean) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full pt-4 border-t border-[#2C2C2C]">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1E1E1E] border border-[#2C2C2C]">
                <Shield className="w-4 h-4 text-[#10b981] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">100% دون إنترنت</span>
                  <span className="text-[10px] text-[#9E9E9E]">خصوصية محلية تامة</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1E1E1E] border border-[#2C2C2C]">
                <Zap className="w-4 h-4 text-[#60a5fa] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">3 ثوانٍ فقط</span>
                  <span className="text-[10px] text-[#9E9E9E]">بدل قص الفوتوشوب</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1E1E1E] border border-[#2C2C2C]">
                <Laptop className="w-4 h-4 text-[#60a5fa] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">خفيف وسريع</span>
                  <span className="text-[10px] text-[#9E9E9E]">&lt; 150MB ذاكرة RAM</span>
                </div>
              </div>
            </div>
          </div>

          {/* App Showcase Column */}
          <div className="lg:col-span-6 relative flex justify-center">
            <div className="relative w-full">
              <AppMockup />
            </div>
          </div>
        </div>
      </div>

      {/* Demo Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C] mb-4">
              <h3 className="text-sm font-bold text-white">عرض سريع: Grido Studio Pro</h3>
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
                عزل الخلفية، ضبط مقاسات الجوازات الدولية، وتوزيع الصور على ورق A4 مع خطوط القص في 3 ثوانٍ.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
