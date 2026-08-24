import { useState } from 'react';
import { Sparkles, Shield, Scissors, Maximize2, Zap } from 'lucide-react';

export function AppMockup() {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="relative w-full max-w-[760px] mx-auto group">
      
      {/* Glow Backdrop */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#3b82f6]/20 via-[#60a5fa]/10 to-[#3b82f6]/20 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Main Authentic Windows 11 Window Frame */}
      <div className="relative rounded-2xl border border-[#2C2C2C] bg-[#141414] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden fluent-specular transition-all duration-300">
        
        {/* Real App Screenshot Showcase */}
        <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#121212] select-none">
          <img
            src="/grido-desktop-ui.png"
            alt="Grido Studio Real UI Application"
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
            draggable={false}
          />

          {/* Subtle Corner Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/40 via-transparent to-transparent pointer-events-none" />

          {/* Interactive Floating Hotspot Badges */}
          {/* Badge 1: AI Engine & Rulers */}
          <div className="absolute top-4 start-4 bg-[#1E1E1E]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#2C2C2C] shadow-xl flex items-center gap-2 text-xs text-white pointer-events-none animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            <span className="font-bold text-[11px]">مساطر وتخطيط بيومتري دقيق</span>
          </div>

          {/* Badge 2: Real Passport Output */}
          <div className="absolute bottom-4 end-4 bg-[#1E1E1E]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#2C2C2C] shadow-xl flex items-center gap-2 text-xs text-white pointer-events-none animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5 text-[#60a5fa]" />
            <span className="font-bold text-[11px]">الواجهة الرسمية المباشرة v2.4</span>
          </div>

          {/* Zoom Overlay Trigger */}
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute top-4 end-4 w-9 h-9 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white text-xs transition-all shadow-lg opacity-0 group-hover:opacity-100 cursor-pointer"
            title="تكبير واستعراض الواجهة"
            aria-label="تكبير الواجهة"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Feature Strip */}
        <div className="px-4 py-3 bg-[#171717] border-t border-[#2C2C2C] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-[#9E9E9E] text-[11px]">
            <div className="flex items-center gap-1.5 text-white">
              <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span className="font-semibold">إقلاع فوري وسريع</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-white">
              <Scissors className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>خطوط قص آلية A4</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5 text-white">
              <Shield className="w-3.5 h-3.5 text-[#10b981]" />
              <span>100% بدون إنترنت</span>
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#60a5fa] bg-[#141414] px-2.5 py-0.5 rounded border border-[#2C2C2C]">
            معاينة مباشرة
          </span>
        </div>

      </div>

      {/* Lightbox Modal for Full Resolution View */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-6xl w-full rounded-2xl overflow-hidden border border-[#2C2C2C] shadow-2xl bg-[#141414]">
            <div className="p-3 bg-[#171717] border-b border-[#2C2C2C] flex items-center justify-between text-xs text-white">
              <span className="font-bold">واجهة Grido Studio الحقيقية الكاملة</span>
              <span className="text-[#9E9E9E]">انقر في أي مكان للإغلاق ✕</span>
            </div>
            <img
              src="/grido-desktop-ui.png"
              alt="Grido Studio Full Interface"
              className="w-full h-auto object-contain max-h-[85vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
