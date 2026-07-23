import {
  ShieldCheck,
  LayoutGrid,
  Crop,
  Printer,
  Download,
  Wand2,
  Undo2,
  Redo2,
  Sparkles,
  Maximize2,
  SquareDashed,
  IdCard,
  RectangleHorizontal,
  Square,
  RectangleVertical,
  ArrowRight,
  Frame,
  SlidersHorizontal,
} from 'lucide-react';

const PASSPORT_IMG = '/sample-passport.png';

const DOC_PRESETS = [
  { icon: Maximize2, label: 'تمدد حر', sub: 'ملء الخلية', active: false },
  { icon: SquareDashed, label: 'بطاقة وطنية', sub: '45×35 ملم', active: false },
  { icon: IdCard, label: 'هوية أحوال', sub: '40×32 ملم', active: true },
  { icon: RectangleHorizontal, label: 'هوية عامة', sub: '60×40 ملم', active: false },
  { icon: Square, label: 'فيزا سفر', sub: '50×50 ملم', active: false },
  { icon: RectangleVertical, label: 'متقاعدون', sub: '40×30 ملم', active: false },
];

const ALIGN_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function AppMockup() {
  return (
    <div className="relative mx-auto max-w-5xl group">
      {/* Ambient glow behind the window */}
      <div
        aria-hidden
        className="absolute -inset-x-8 -top-6 -bottom-6 rounded-[2rem] bg-gradient-to-r from-brand-500/30 via-sky-500/20 to-accent-400/25 opacity-40 blur-3xl transition-opacity duration-700 group-hover:opacity-70"
      />

      {/* Floating badge: top-left */}
      <div className="absolute -top-10 -right-4 md:-right-12 z-30 hidden sm:flex animate-float-slow items-center gap-3 px-4 py-3 rounded-2xl bg-[#2d2d2d] border border-[#3a3a3a] shadow-2xl shadow-black/60 backdrop-blur-md">
        <div className="w-9 h-9 rounded-lg bg-brand-500/20 border border-brand-400/40 flex items-center justify-center text-lg">
          ⚡
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-white">معالجة 300DPI فائقة</div>
          <div className="text-[10px] text-brand-300 mt-0.5">طباعة رسمية بدون تشتت</div>
        </div>
      </div>

      {/* Floating badge: bottom-left */}
      <div
        className="absolute -bottom-10 -left-4 md:-left-12 z-30 hidden sm:flex animate-float-slow items-center gap-3 px-4 py-3 rounded-2xl bg-[#2d2d2d] border border-[#3a3a3a] shadow-2xl shadow-black/60 backdrop-blur-md"
        style={{ animationDelay: '1.5s' }}
      >
        <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-lg">
          🤖
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-white">CodeFormer + Real-ESRGAN</div>
          <div className="text-[10px] text-sky-300 mt-0.5">ذكاء اصطناعي محلي 100%</div>
        </div>
      </div>

      {/* App window frame - Matching Grido Studio Desktop Identity (#1e1e1e & #2d2d2d) */}
      <div className="relative rounded-2xl overflow-hidden border border-[#3a3a3a] bg-[#1e1e1e] shadow-2xl shadow-black/70 transition-transform duration-500 group-hover:-translate-y-1">
        <div className="bg-[#1e1e1e] text-neutral-200 text-xs select-none font-sans text-right" dir="rtl">
          {/* Windows Title Bar */}
          <div className="h-11 bg-[#252528] border-b border-[#3a3a3a] px-4 flex items-center justify-between text-neutral-300">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 cursor-pointer" />
              </div>
              <div className="h-4 w-px bg-[#3a3a3a] mx-1" />
              <div className="flex items-center gap-2 text-neutral-400">
                <span className="text-sm">☀️</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Mode Selector matching Grido App */}
            <div className="flex items-center bg-[#18181b] p-1 rounded-xl border border-[#3a3a3a]">
              <button className="px-4 py-1 rounded-lg bg-brand-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md shadow-brand-500/30">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>كولاج</span>
              </button>
              <button className="px-4 py-1 rounded-lg hover:text-white text-neutral-400 text-[11px] flex items-center gap-1.5 transition-colors">
                <Crop className="w-3.5 h-3.5" />
                <span>تعديل حر</span>
              </button>
            </div>

            {/* App Brand Header */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center text-white font-black text-[10px]">
                  G
                </div>
                <span className="font-extrabold text-white text-sm">Grido Studio</span>
                <span className="text-neutral-500 text-[10px]">| استوديو الهوية</span>
              </div>
              <div className="h-4 w-px bg-[#3a3a3a] hidden sm:block" />
              <div className="hidden sm:flex items-center gap-1.5 text-neutral-400">
                <button className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white" aria-label="طباعة"><Printer className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white" aria-label="تصدير"><Download className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white" aria-label="ترميم"><Wand2 className="w-4 h-4 text-sky-400" /></button>
                <div className="h-4 w-px bg-[#3a3a3a] mx-1" />
                <button className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white" aria-label="تراجع"><Undo2 className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white" aria-label="إعادة"><Redo2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Body: 3-column layout (#2d2d2d sidebar, #09090b canvas) */}
          <div className="flex h-[520px] relative overflow-hidden bg-[#18181b]">
            {/* Right sidebar (properties - #2d2d2d) */}
            <aside className="w-64 bg-[#2d2d2d] border-l border-[#3a3a3a] p-3.5 overflow-y-auto space-y-4 flex-shrink-0 hidden md:block">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1e1e1e] border border-[#3a3a3a]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-white border border-neutral-400 shadow-xs" />
                  <span className="text-[11px] font-mono text-neutral-300">#FFFFFF</span>
                </div>
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-400" /> لون الخلفية
                </span>
              </div>

              <button className="w-full py-1.5 rounded-xl bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20">
                <span>تخصيص الشبكة</span>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'الصفوف', value: '1' },
                  { label: 'الأعمدة', value: '6', active: true },
                ].map((row) => (
                  <div key={row.label} className="p-2 bg-[#1e1e1e] rounded-xl text-center border border-[#3a3a3a]">
                    <div className="text-[10px] text-neutral-400 mb-1">{row.label}</div>
                    <div className="flex items-center justify-between px-2">
                      <button className="text-neutral-500 hover:text-white font-bold text-sm" aria-label="تقليل">-</button>
                      <span className={`font-extrabold text-sm ${row.active ? 'text-brand-400' : 'text-neutral-200'}`}>{row.value}</span>
                      <button className="text-neutral-500 hover:text-white font-bold text-sm" aria-label="زيادة">+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[10px] font-bold text-neutral-400 mb-2">أبعاد الوثائق الرسمية</div>
                <div className="grid grid-cols-2 gap-2">
                  {DOC_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <div
                        key={preset.label}
                        className={`p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
                          preset.active
                            ? 'bg-[#1e1e1e] border-brand-500 text-brand-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                            : 'bg-[#1e1e1e] border-[#3a3a3a] hover:bg-[#3a3a3a]/40'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${preset.active ? 'text-brand-400' : 'text-neutral-400'}`} />
                        <div>
                          <div className={`text-[10px] font-bold ${preset.active ? 'text-brand-400' : 'text-neutral-300'}`}>{preset.label}</div>
                          <div className={`text-[8px] ${preset.active ? 'text-brand-400/80' : 'text-neutral-500'}`}>{preset.sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-neutral-400 mb-2">محاذاة الخلايا</div>
                <div className="grid grid-cols-3 gap-1 p-2 bg-[#1e1e1e] border border-[#3a3a3a] rounded-xl w-36 mx-auto">
                  {ALIGN_CELLS.map((i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg flex items-center justify-center ${
                        i === 0 ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 'hover:bg-[#3a3a3a] cursor-pointer'
                      }`}
                    >
                      {i === 0 && <ArrowRight className="w-3.5 h-3.5 rotate-45" />}
                      {i !== 0 && i !== 4 && <div className="w-1 h-1 rounded-full bg-neutral-600" />}
                      {i === 4 && <Frame className="w-3.5 h-3.5 text-neutral-500" />}
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30">
                <LayoutGrid className="w-4 h-4" />
                <span>تخصيص نشط</span>
              </button>
            </aside>

            {/* Center canvas (#09090b dot workspace) */}
            <div className="flex-1 flex flex-col relative bg-[#09090b] overflow-hidden">
              <div className="flex-1 relative flex items-center justify-center bg-[#09090b]">
                <div
                  className="absolute inset-0 opacity-25"
                  style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                />
                <div className="absolute top-0 inset-x-0 h-5 border-b border-[#3a3a3a]/40 flex items-center justify-between text-[8px] text-neutral-500 font-mono px-8 select-none z-10 bg-[#09090b]/80">
                  <span>200</span><span>180</span><span>160</span><span>140</span><span>120</span><span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
                </div>
                <div className="absolute top-0 right-0 bottom-0 w-3 bg-[#18181b] border-l border-[#3a3a3a]/40 flex flex-col items-center">
                  <div className="w-1.5 h-24 bg-neutral-700/50 rounded-full mt-10" />
                </div>

                {/* A4 paper sheet with passport grid */}
                <div className="w-[380px] h-[520px] bg-white rounded-sm shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] pt-2.5 pb-2 px-2.5 relative flex flex-col justify-start z-10">
                  <div className="grid grid-cols-6 gap-1.5 p-1 bg-white rounded-sm border border-neutral-200">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div key={idx} className="aspect-[3/4] overflow-hidden relative border border-neutral-300 rounded-[1px]">
                        <img src={PASSPORT_IMG} alt="" className="w-full h-full object-cover block" loading="lazy" />
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center text-[9px] text-neutral-400 font-mono select-none pointer-events-none">
                    Grido Studio - A4 Canvas Paper (210 × 297 mm)
                  </div>
                </div>
              </div>

              <div className="h-7 bg-[#1e1e1e] border-t border-[#3a3a3a] px-4 flex items-center justify-between text-[10px] text-neutral-400">
                <div className="flex items-center gap-3 font-mono">
                  <span className="hover:text-white cursor-pointer">Ctrl+Z تراجع</span>
                  <span>•</span>
                  <span className="hover:text-white cursor-pointer">Delete حذف العنصر</span>
                </div>
                <div className="text-neutral-500 hidden sm:block">اضغط على عنصر لتحديده - سحب لتغيير الموضع</div>
                <div className="flex items-center gap-2 font-mono text-brand-400 font-bold"><span>🔍 100%</span></div>
              </div>
            </div>

            {/* Left sidebar (#2d2d2d) */}
            <aside className="w-56 bg-[#2d2d2d] border-r border-[#3a3a3a] p-3.5 overflow-y-auto space-y-4 flex-shrink-0 hidden lg:block">
              <div>
                <div className="text-xs font-extrabold text-white mb-2">أبعاد مساحة العمل</div>
                <div className="grid grid-cols-2 gap-1 p-1 bg-[#1e1e1e] rounded-xl border border-[#3a3a3a] mb-3 text-center">
                  <button className="py-1 rounded-lg text-neutral-400 hover:text-white text-[10px]">ملم</button>
                  <button className="py-1 rounded-lg bg-brand-500 text-white font-bold text-[10px]">بكسل</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {[
                    { icon: RectangleHorizontal, label: '6×4 بوصة', sub: '1200×1800 px', active: false },
                    { icon: RectangleVertical, label: 'A4', sub: '2480×3508 px', active: true },
                    { icon: RectangleHorizontal, label: '7×5 بوصة', sub: '1500×2100 px', active: false },
                    { icon: RectangleVertical, label: 'A5', sub: '1748×2480 px', active: false },
                  ].map((size) => {
                    const Icon = size.icon;
                    return (
                      <div
                        key={size.label}
                        className={`p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          size.active
                            ? 'bg-[#1e1e1e] border-brand-500 text-brand-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                            : 'bg-[#1e1e1e] border-[#3a3a3a] hover:bg-[#3a3a3a]/40'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${size.active ? 'text-brand-400' : 'text-neutral-500'}`} />
                        <div className={`text-[10px] font-bold mt-1 ${size.active ? 'text-brand-400' : 'text-neutral-300'}`}>{size.label}</div>
                        <div className={`text-[8px] ${size.active ? 'text-brand-400/70' : 'text-neutral-500'}`}>{size.sub}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 mb-5">
                  {[
                    { label: 'H', value: '3508' },
                    { label: 'W', value: '2480' },
                  ].map((dim) => (
                    <div key={dim.label} className="flex-1 bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg py-1.5 px-2 flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 font-mono">{dim.label}</span>
                      <span className="font-mono font-bold text-white text-[11px]">{dim.value}</span>
                      <span className="text-[9px] text-neutral-500 font-mono">px</span>
                    </div>
                  ))}
                  <button className="w-6 h-6 rounded-md bg-brand-500/20 text-brand-400 flex items-center justify-center hover:bg-brand-500/30" aria-label="تبديل الأبعاد">🔄</button>
                </div>
              </div>

              <div className="border-t border-[#3a3a3a] pt-3 space-y-3">
                <div className="text-xs font-bold text-brand-400 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>تنسيق الكولاج</span>
                </div>
                {['المسافات', 'الهامش', 'الزوايا', 'الإطار'].map((slider) => (
                  <div key={slider} className="space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>{slider}</span>
                      <span className="font-mono text-white">0 px</span>
                    </div>
                    <div className="h-1.5 bg-[#1e1e1e] border border-[#3a3a3a] rounded-full overflow-hidden">
                      <div className="w-0 h-full bg-brand-500 rounded-full" />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-[#3a3a3a] pt-2">
                  <span className="text-[10px] text-neutral-300">خطوط القص والمحاذاة</span>
                  <div className="w-7 h-4 rounded-full bg-[#1e1e1e] border border-[#3a3a3a] p-0.5 cursor-pointer">
                    <div className="w-3 h-3 rounded-full bg-neutral-500" />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
