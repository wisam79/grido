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

          {/* Interactive Floating Hotspot Badges (Mobile Responsive) */}
          {/* Badge 1: Top Right */}
          <div className="absolute top-2.5 start-2.5 sm:top-4 sm:start-4 bg-[#1E1E1E]/90 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-[#2C2C2C] shadow-lg flex items-center gap-1.5 sm:gap-2 text-white pointer-events-none">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#10b981] animate-ping" />
            <span className="font-bold text-[9px] sm:text-[11px]">مساطر وتخطيط بيومتري دقيق</span>
          </div>

          {/* Badge 2: Bottom Left */}
          <div className="absolute bottom-2.5 end-2.5 sm:bottom-4 sm:end-4 bg-[#1E1E1E]/90 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-[#2C2C2C] shadow-lg flex items-center gap-1.5 sm:gap-2 text-white pointer-events-none">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#60a5fa]" />
            <span className="font-bold text-[9px] sm:text-[11px]">الواجهة الرسمية المباشرة v2.4</span>
          </div>

          {/* Zoom Overlay Trigger (Always accessible on touch devices) */}
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute top-2.5 end-2.5 sm:top-4 sm:end-4 w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white text-xs transition-all shadow-lg opacity-90 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
            title="تكبير واستعراض الواجهة"
            aria-label="تكبير الواجهة"
          >
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Bottom Feature Strip */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#171717] border-t border-[#2C2C2C] flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-2 sm:gap-4 text-[#9E9E9E] text-[10px] sm:text-[11px]">
            <div className="flex items-center gap-1 sm:gap-1.5 text-white">
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#3b82f6]" />
              <span className="font-semibold">إقلاع فوري وسريع</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 sm:gap-1.5 text-white">
              <Scissors className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#f59e0b]" />
              <span>خطوط قص آلية A4</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5 text-white">
              <Shield className="w-3.5 h-3.5 text-[#10b981]" />
              <span>100% بدون إنترنت</span>
            </div>
          </div>

          <span className="text-[9px] sm:text-[10px] font-bold text-[#60a5fa] bg-[#141414] px-2 py-0.5 rounded border border-[#2C2C2C]">
            معاينة مباشرة
          </span>
        </div>

      </div>

      {/* Lightbox Modal for Full Resolution View */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn cursor-zoom-out"
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
