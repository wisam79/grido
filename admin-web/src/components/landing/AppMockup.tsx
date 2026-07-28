import { ShieldCheck, LayoutGrid, Crop, Printer, Sparkles } from 'lucide-react';

const PASSPORT_IMG = '/sample-passport.png';

export function AppMockup() {
  return (
    <div className="relative mx-auto w-full max-w-4xl perspective-container group select-none py-2 px-1 sm:px-0">
      {/* Blue Platform Floor Light beneath the 3D window */}
      <div
        aria-hidden
        className="absolute -bottom-8 inset-x-4 sm:inset-x-8 h-28 bg-gradient-to-t from-brand-500/40 via-cyan-500/20 to-transparent rounded-full blur-3xl opacity-80 pointer-events-none"
      />

      {/* 3D Perspective Tilted App Window Frame (Responsive on mobile & desktop) */}
      <div className="perspective-mockup relative rounded-2xl overflow-hidden border border-white/20 bg-[#121826] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] text-right w-full" dir="rtl">
        {/* Windows Title Bar */}
        <div className="h-10 bg-[#1a2336] border-b border-white/10 px-3 sm:px-4 flex items-center justify-between text-neutral-300">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
            </div>
            <div className="h-4 w-px bg-white/10 mx-1 hidden xs:block" />
            <div className="hidden xs:flex items-center gap-2 text-xs font-bold text-white">
              <div className="w-4 h-4 overflow-hidden rounded-md">
                <img src="/favicon.png" alt="Grido Logo" className="w-full h-full object-cover" />
              </div>
              <span className="truncate">Grido Studio</span>
            </div>
          </div>

          {/* Mode Selector matching Grido App */}
          <div className="flex items-center bg-[#0b1120] p-0.5 sm:p-1 rounded-xl border border-white/10 text-[10px] sm:text-xs font-semibold">
            <button className="px-2.5 sm:px-3 py-0.5 rounded-lg bg-brand-500 text-white font-bold text-[10px] sm:text-[11px] flex items-center gap-1 shadow-md shadow-brand-500/30">
              <LayoutGrid className="w-3 h-3" />
              <span>استوديو الهوية</span>
            </button>
            <button className="px-2.5 sm:px-3 py-0.5 rounded-lg hover:text-white text-neutral-400 text-[10px] sm:text-[11px] flex items-center gap-1">
              <Crop className="w-3 h-3" />
              <span>تعديل حر</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline text-[11px]">300 DPI جاهز</span>
          </div>
        </div>

        {/* Window Main Content (Canvas + Right Sidebar) */}
        <div className="flex h-[290px] sm:h-[360px] md:h-[420px] relative overflow-hidden bg-[#0b1120]">
          {/* Main Workspace (Canvas on left/center in RTL) */}
          <div className="flex-1 flex flex-col relative bg-[#090e1a] p-2.5 sm:p-4 overflow-hidden">
            {/* Grid dot pattern background */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />

            {/* Viewport Top Ruler Bar */}
            <div className="h-5 border-b border-white/10 flex items-center justify-between text-[8px] sm:text-[9px] text-neutral-400 font-mono px-3 sm:px-6 mb-2 sm:mb-3 bg-[#121826]/80 rounded-lg select-none">
              <span>200</span><span>160</span><span>120</span><span>80</span><span>40</span><span>0</span>
            </div>

            {/* A4 Paper Sheet Preview inside the window */}
            <div className="flex-1 flex items-center justify-center relative p-1">
              <div className="w-full max-w-[240px] xs:max-w-[280px] sm:max-w-[330px] md:max-w-[380px] bg-white rounded-lg p-2 sm:p-2.5 shadow-2xl relative flex flex-col justify-start">
                <div className="grid grid-cols-2 xs:grid-cols-4 gap-1 sm:gap-1.5 p-0.5 sm:p-1 bg-white border border-neutral-300 rounded-md">
                  {[1, 2, 3, 4].map((idx) => (
                    <div key={idx} className="aspect-[3/4] overflow-hidden relative border border-neutral-300 rounded-xs shadow-xs">
                      <img src={PASSPORT_IMG} alt="" className="w-full h-full object-cover block" loading="lazy" />
                      <div className="absolute bottom-0.5 inset-x-0 text-center bg-black/70 text-[6px] sm:text-[7px] text-white font-mono py-0.5">
                        40 × 32 mm
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex items-center justify-between text-[7px] sm:text-[9px] text-neutral-500 font-mono border-t border-neutral-200 pt-1 px-0.5">
                  <span className="truncate">Grido Studio A4</span>
                  <span className="font-bold text-brand-600 truncate">CMYK 300DPI</span>
                  <span className="hidden xs:inline">A4 Canvas</span>
                </div>
              </div>
            </div>

            {/* Window Status Footer */}
            <div className="h-6 bg-[#121826] border-t border-white/10 px-2.5 -mx-2.5 -mb-2.5 sm:-mx-4 sm:-mb-4 flex items-center justify-between text-[8px] sm:text-[9px] text-neutral-400 font-mono">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-emerald-400 font-bold">● متصل بالذكاء الاصطناعي</span>
                <span>•</span>
                <span>100%</span>
              </div>
              <span className="hidden sm:inline">أبعاد الصفحة المعتمدة للطباعة (210×297 ملم)</span>
            </div>
          </div>

          {/* Right Sidebar Panel (Responsive on Mobile) */}
          <aside className="w-36 xs:w-44 sm:w-56 bg-[#121826] border-r border-white/10 p-2 sm:p-3.5 space-y-2 sm:space-y-3 flex-shrink-0 text-right">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-white/10 text-[10px] sm:text-xs font-extrabold text-white">
                <span className="truncate">إعدادات الورقة</span>
                <span className="text-[9px] sm:text-[10px] text-brand-400 font-mono">A4</span>
              </div>

              <div className="space-y-1 text-[10px] sm:text-xs">
                <div className="flex items-center justify-between p-1 sm:p-1.5 rounded-lg bg-[#1a2336] border border-white/5">
                  <span className="text-neutral-400 text-[9px] sm:text-[11px]">مقاس الورقة</span>
                  <span className="font-bold text-white">A4</span>
                </div>

                <div className="flex items-center justify-between p-1 sm:p-1.5 rounded-lg bg-[#1a2336] border border-white/5">
                  <span className="text-neutral-400 text-[9px] sm:text-[11px]">المصفوفة</span>
                  <span className="font-bold text-brand-400 font-mono">2x4</span>
                </div>

                <div className="flex items-center justify-between p-1 sm:p-1.5 rounded-lg bg-[#1a2336] border border-white/5">
                  <span className="text-neutral-400 text-[9px] sm:text-[11px]">عدد النسخ</span>
                  <span className="font-bold text-white font-mono">2</span>
                </div>
              </div>

              {/* Primary Action Blue Button matching reference mockup */}
              <button className="w-full py-2 sm:py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-extrabold font-display text-[10px] sm:text-xs shadow-lg shadow-brand-500/40 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all hover:scale-[1.02]">
                <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>بدء المعالجة</span>
              </button>

              <div className="text-center text-[8px] sm:text-[9px] text-neutral-400 flex items-center justify-center gap-1 font-semibold pt-0.5 truncate">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                <span className="truncate">جودة عالية للطباعة</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
