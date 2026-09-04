import { useState } from 'react';
import { Sparkles, Scissors, Maximize2, Zap, CheckCircle2, ShieldCheck, Minus, Square, X } from 'lucide-react';
import { MOCKUP_PRESETS, type MockupPreset } from '../../data/landing-content';
import { useAppVersion } from '../../lib/version';

export function AppMockup() {
  const [activePreset, setActivePreset] = useState<MockupPreset>(MOCKUP_PRESETS[0]);
  const [isZoomed, setIsZoomed] = useState(false);
  const version = useAppVersion();
  const displayVersion = version ? `v${version}` : 'v2.4';

  return (
    <div className="relative w-full max-w-5xl mx-auto group">
      
      {/* Dynamic Ambient Glow Behind Showcase */}
      <div className="absolute -inset-2 bg-gradient-to-r from-[#3b82f6]/25 via-[#60a5fa]/15 to-[#3b82f6]/25 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Main Authentic Windows 11 Window Frame */}
      <div className="relative rounded-2xl border border-[#333333] bg-[#141414] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)] overflow-hidden fluent-specular transition-all duration-300">
        
        {/* Windows 11 Title Bar */}
        <div className="h-10 bg-[#1A1A1A] border-b border-[#2C2C2C] px-3.5 flex items-center justify-between select-none" dir="ltr">
          {/* Left: App Brand & Session File */}
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Grido Logo"
              className="w-4 h-4 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/appicon.png';
              }}
            />
            <div className="flex items-center gap-1.5 text-xs text-[#9E9E9E]">
              <span className="font-bold text-white">Grido Studio</span>
              <span className="text-[#666666]">•</span>
              <span className="font-mono text-[11px] text-[#A3A3A3]">session_{activePreset.id}.grido</span>
            </div>
          </div>

          {/* Center: Live Preset Switcher Tabs inside Window Toolbar */}
          <div className="hidden sm:flex items-center gap-1 bg-[#141414] p-1 rounded-xl border border-[#2C2C2C]" dir="rtl">
            {MOCKUP_PRESETS.map((preset) => {
              const isActive = activePreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setActivePreset(preset)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#262626] text-white border border-white/10 shadow-xs'
                      : 'text-[#9E9E9E] hover:text-white hover:bg-white/[0.04]'
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{preset.countryFlag}</span>
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Windows 11 Window Controls */}
          <div className="flex items-center text-[#9E9E9E]">
            <div className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors cursor-default" title="Minimize">
              <Minus className="w-3.5 h-3.5" />
            </div>
            <div className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors cursor-default" title="Maximize">
              <Square className="w-3 h-3" />
            </div>
            <div className="w-8 h-8 flex items-center justify-center hover:bg-[#c42b1c] hover:text-white transition-colors cursor-default" title="Close">
              <X className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Mobile-only Preset Bar */}
        <div className="sm:hidden p-2 bg-[#171717] border-b border-[#2C2C2C] flex items-center justify-between gap-1 overflow-x-auto">
          {MOCKUP_PRESETS.map((preset) => {
            const isActive = activePreset.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setActivePreset(preset)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap ${
                  isActive ? 'bg-[#3b82f6] text-white' : 'text-[#9E9E9E] bg-[#141414]'
                }`}
              >
                <span>{preset.countryFlag}</span>
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>

        {/* Real App Interface Canvas Viewport */}
        <div className="relative w-full aspect-[16/10] max-h-[520px] overflow-hidden bg-[#121212] select-none">
          <img
            src="/grido-desktop-ui.png"
            alt={`واجهة تطبيق Grido Studio - قالب ${activePreset.name}`}
            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.01]"
            draggable={false}
          />

          {/* Biometric Interactive HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none transition-all duration-300">
            {/* Top-End Zoom Button */}
            <button
              onClick={() => setIsZoomed(true)}
              className="absolute top-3.5 end-3.5 w-8 h-8 rounded-xl bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/10 flex items-center justify-center text-white text-xs transition-all shadow-xl pointer-events-auto cursor-pointer"
              title="تكبير واستعراض الواجهة بدقة فائقة"
              aria-label="تكبير الواجهة"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Bottom Floating Guidelines Capsule */}
            <div className="absolute bottom-3.5 start-3.5 max-w-[90%] bg-[#141414]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#2C2C2C] shadow-xl flex flex-wrap items-center gap-2.5 text-xs text-[#F5F5F5]">
              <div className="flex items-center gap-1.5 text-[#10b981]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold">{activePreset.specStandard}</span>
              </div>
              <span className="text-[#666666] hidden sm:inline">•</span>
              <span className="text-[#9E9E9E] hidden sm:inline">{activePreset.headRatio}</span>
              <span className="text-[#666666] hidden md:inline">•</span>
              <span className="text-[#60a5fa] font-mono font-semibold hidden md:inline">{activePreset.eyeLine}</span>
            </div>

            {/* Bottom-End Live Version Capsule */}
            <div className="absolute bottom-3.5 end-3.5 bg-[#141414]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#2C2C2C] shadow-xl flex items-center gap-1.5 text-white">
              <Sparkles className="w-3.5 h-3.5 text-[#60a5fa]" />
              <span className="font-bold text-xs font-mono text-white">
                {displayVersion}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Status & Capability Bar */}
        <div className="px-4 py-3 bg-[#171717] border-t border-[#2C2C2C] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 sm:gap-5 text-[#9E9E9E] text-xs">
            <div className="flex items-center gap-1.5 text-white">
              <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span className="font-semibold">{activePreset.sheetCount}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-white">
              <Scissors className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="font-semibold">{activePreset.cutMargins}</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5 text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="font-semibold">100% دون إنترنت</span>
            </div>
          </div>

          <span className="text-xs font-bold text-[#60a5fa] bg-[#141414] px-2.5 py-1 rounded-lg border border-[#2C2C2C]">
            محاذاة مغناطيسية فورية
          </span>
        </div>

      </div>

      {/* Lightbox Modal for Full Resolution View */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-6xl w-full rounded-2xl overflow-hidden border border-[#2C2C2C] shadow-2xl bg-[#141414]">
            <div className="p-3 bg-[#171717] border-b border-[#2C2C2C] flex items-center justify-between text-xs text-white">
              <span className="font-bold">واجهة Grido Studio الكاملة — {activePreset.name}</span>
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
