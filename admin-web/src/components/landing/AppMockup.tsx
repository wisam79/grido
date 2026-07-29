import {
  ShieldCheck,
  LayoutGrid,
  Crop,
  Printer,
  Sparkles,
  Save,
  FileText,
  Sliders,
  Sun,
  Minus,
  Plus,
  RotateCcw,
  ZoomIn,
  Layers,
  ArrowUpLeft,
  ChevronDown,
} from 'lucide-react';

const PASSPORT_IMG = '/sample-passport.png';

export function AppMockup() {
  return (
    <div className="relative mx-auto w-full max-w-6xl perspective-container group select-none py-3 px-1 sm:px-0">
      {/* Soft Ambient Floor & Back Glow for Focal Depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 w-[550px] h-[450px] bg-gradient-to-br from-brand-600/25 via-blue-500/15 to-transparent rounded-full blur-[130px] opacity-90"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -left-8 w-[500px] h-[400px] bg-gradient-to-tr from-brand-500/20 via-indigo-600/15 to-transparent rounded-full blur-[110px] opacity-80"
      />

      {/* Scrollable Wrapper for Mobile Devices */}
      <div className="w-full overflow-x-auto overflow-y-hidden no-scrollbar pb-4 -mb-4">
        {/* 3D Perspective Tilted Window Frame matching Real Grido Studio App */}
        <div
          className="perspective-mockup relative rounded-2xl overflow-hidden border border-white/20 bg-[#1e1e1e] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)] text-right w-full min-w-[768px] ring-1 ring-white/10"
          dir="rtl"
        >
        {/* Top App Titlebar */}
        <div className="h-11 bg-[#242424] border-b border-white/10 px-3 flex items-center justify-between text-neutral-300 text-xs">
          {/* Left Controls & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/90 shadow-xs" />
              <div className="w-3 h-3 rounded-full bg-amber-500/90 shadow-xs" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/90 shadow-xs" />
            </div>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-2 text-neutral-400">
              <Sun className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>

          {/* Center Mode Switcher (Active: كولاج) */}
          <div className="flex items-center bg-[#181818] p-0.5 rounded-xl border border-white/10 text-[11px] font-semibold">
            <button className="px-3 py-1 rounded-lg bg-brand-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/30">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>كولاج</span>
              <span className="text-[9px] bg-white/20 px-1 rounded-xs">88</span>
            </button>
            <button className="px-3 py-1 rounded-lg hover:text-white text-neutral-400 flex items-center gap-1.5 transition-colors">
              <Crop className="w-3.5 h-3.5" />
              <span>تعديل حر</span>
            </button>
          </div>

          {/* Right Header Title & Tools Strip */}
          <div className="flex items-center gap-3">
            {/* Quick Action Tools */}
            <div className="hidden md:flex items-center gap-1 bg-[#181818] px-2 py-1 rounded-lg border border-white/10 text-[10px] text-neutral-400">
              <button className="p-1 hover:text-white"><RotateCcw className="w-3 h-3" /></button>
              <button className="p-1 hover:text-white"><Printer className="w-3 h-3" /></button>
              <button className="p-1 hover:text-white"><Save className="w-3 h-3" /></button>
              <button className="p-1 hover:text-white"><FileText className="w-3 h-3" /></button>
              <button className="p-1 bg-brand-500/20 text-brand-400 rounded"><Sparkles className="w-3 h-3" /></button>
            </div>

            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="truncate">Grido Studio | استوديو الهوية</span>
            </div>
          </div>
        </div>

        {/* Main App Workspace (Left Panel + Center Canvas + Right Panel) */}
        <div className="flex h-[380px] sm:h-[450px] md:h-[500px] relative overflow-hidden bg-[#181818]">
          {/* Left Panel: Properties & Canvas Dimensions */}
          <aside className="w-48 sm:w-56 bg-[#242424] border-l border-white/10 p-2.5 sm:p-3 space-y-3 flex-shrink-0 text-right overflow-y-auto no-scrollbar text-xs">
            {/* Action Buttons Row */}
            <div className="flex items-center gap-1.5">
              <button className="flex-1 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white font-bold flex items-center justify-center gap-1 shadow-md shadow-brand-500/30 text-[11px]">
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>
              <button className="p-1.5 rounded-lg bg-[#2d2d2d] hover:bg-[#383838] border border-white/10 text-neutral-300">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg bg-[#2d2d2d] hover:bg-[#383838] border border-white/10 text-neutral-300">
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Left Tabs: الخصائص / الطبقات */}
            <div className="flex border-b border-white/10 pb-1 text-[11px] font-bold">
              <button className="flex-1 text-center py-1 text-brand-400 border-b-2 border-brand-500 flex items-center justify-center gap-1">
                <Sliders className="w-3 h-3" />
                <span>الخصائص</span>
              </button>
              <button className="flex-1 text-center py-1 text-neutral-400 hover:text-white flex items-center justify-center gap-1">
                <Layers className="w-3 h-3" />
                <span>الطبقات</span>
              </button>
            </div>

            {/* Section: أبعاد مساحة العمل */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                <span>أبعاد مساحة العمل</span>
              </div>

              {/* Unit Toggle */}
              <div className="flex bg-[#181818] p-0.5 rounded-lg border border-white/10 text-[10px] font-semibold text-center">
                <button className="flex-1 py-0.5 rounded text-neutral-400">ملم</button>
                <button className="flex-1 py-0.5 rounded bg-brand-500 text-white font-bold">بكسل</button>
              </div>

              {/* Paper Size Grid */}
              <div className="grid grid-cols-3 gap-1.5 text-[9px] font-semibold text-center">
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border-2 border-brand-500 text-white font-bold shadow-xs">
                  <div>A4</div>
                  <div className="text-[7px] text-neutral-400">2480×3508 px</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>6×4 بوصة</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>A5</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>A3</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>7×5 بوصة</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>أخرى...</div>
                </div>
              </div>

              {/* Width / Height Inputs */}
              <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 pt-1">
                <div className="flex-1 bg-[#181818] px-2 py-1 rounded border border-white/10 flex items-center justify-between">
                  <span className="text-white font-bold">2480</span>
                  <span>W</span>
                </div>
                <span>×</span>
                <div className="flex-1 bg-[#181818] px-2 py-1 rounded border border-white/10 flex items-center justify-between">
                  <span className="text-white font-bold">3508</span>
                  <span>H</span>
                </div>
              </div>
            </div>

            {/* Section: تنسيق الكولاج */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-[10px] font-bold text-brand-400 flex items-center gap-1">
                <Sliders className="w-3 h-3" />
                <span>تنسيق الكولاج</span>
              </span>

              <div className="space-y-1.5 text-[9px] text-neutral-300">
                <div className="flex items-center justify-between">
                  <input type="range" defaultValue={14} className="w-20 accent-brand-500 h-1" />
                  <span>المسافات (14px)</span>
                </div>
                <div className="flex items-center justify-between">
                  <input type="range" defaultValue={0} className="w-20 accent-brand-500 h-1" />
                  <span>الهامش (0px)</span>
                </div>
                <div className="flex items-center justify-between">
                  <input type="range" defaultValue={6} className="w-20 accent-brand-500 h-1" />
                  <span>الإطار (6px)</span>
                </div>
              </div>

              {/* AI Batch Button */}
              <button className="w-full py-2 rounded-xl bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 text-white font-extrabold text-[10px] shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 border border-blue-400/30 mt-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>ترميم وتحسين الكولاج بالكامل (AI Batch)</span>
              </button>
            </div>
          </aside>

          {/* Center Canvas Workspace */}
          <div className="flex-1 flex flex-col relative bg-[#141414] overflow-hidden">
            {/* Viewport Top Ruler Bar (0 to 200 mm) */}
            <div className="h-5 border-b border-white/10 flex items-center justify-between text-[8px] text-neutral-400 font-mono px-6 bg-[#1e1e1e]/90 select-none">
              <span>0</span><span>40</span><span>80</span><span>120</span><span>160</span><span>200</span>
            </div>

            {/* Canvas Area with Blueprint Dots */}
            <div className="flex-1 flex items-center justify-center relative p-3 overflow-hidden">
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
              />

              {/* A4 Paper Sheet Preview matching Real App Screenshot */}
              <div className="w-full max-w-[280px] xs:max-w-[330px] sm:max-w-[380px] md:max-w-[420px] aspect-[1/1.41] bg-white rounded shadow-2xl relative p-3 sm:p-4 flex flex-col justify-start border border-neutral-300 overflow-hidden">
                {/* 4 Rows x 6 Columns Passport Photo Layout (24 Photos Total) */}
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-6 gap-1.5 p-1 bg-white border border-neutral-200 rounded-xs relative">
                      {[1, 2, 3, 4, 5, 6].map((colIdx) => (
                        <div key={colIdx} className="aspect-[3/4] overflow-hidden relative border border-neutral-300 rounded-xs shadow-xs group">
                          <img src={PASSPORT_IMG} alt="User Passport Photo" className="w-full h-full object-cover block" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom App Workspace Status Bar */}
            <div className="h-6 bg-[#1e1e1e] border-t border-white/10 px-3 flex items-center justify-between text-[10px] text-neutral-400 font-mono select-none">
              <div className="flex items-center gap-1.5">
                <ZoomIn className="w-3 h-3 text-neutral-500" />
                <span>100%</span>
              </div>
              <span className="truncate text-neutral-300 font-sans font-medium">مساحة العمل جاهزة</span>
              <span className="text-[9px] text-emerald-400 font-bold">300 DPI</span>
            </div>
          </div>

          {/* Right Panel: Custom Grid & Document Photo Templates */}
          <aside className="w-48 sm:w-56 bg-[#242424] border-r border-white/10 p-2.5 sm:p-3 space-y-3 flex-shrink-0 text-right overflow-y-auto no-scrollbar text-xs">
            {/* Header: لون خلفية مساحة العمل */}
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-[10px]">
              <div className="w-4 h-4 rounded bg-white border border-neutral-400" />
              <span className="font-mono text-white">#FFFFFF</span>
              <span className="text-neutral-400 font-bold">لون خلفية مساحة العمل 🎨</span>
            </div>

            {/* Section: تخصيص الشبكة */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[9px]">نشط</span>
                <span>تخصيص الشبكة</span>
              </div>

              {/* Steppers: الصفوف 1 | الأعمدة 6 */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-center">
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 space-y-1">
                  <div className="text-neutral-400 font-semibold">الصفوف</div>
                  <div className="flex items-center justify-between font-mono font-bold text-white">
                    <button className="text-neutral-500 hover:text-white"><Minus className="w-3 h-3" /></button>
                    <span>1</span>
                    <button className="text-neutral-500 hover:text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 space-y-1">
                  <div className="text-neutral-400 font-semibold">الأعمدة</div>
                  <div className="flex items-center justify-between font-mono font-bold text-white">
                    <button className="text-neutral-500 hover:text-white"><Minus className="w-3 h-3" /></button>
                    <span className="text-brand-400 font-bold">6</span>
                    <button className="text-neutral-500 hover:text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: أبعاد ونوع الصورة للوثائق */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="text-[10px] font-bold text-neutral-300">أبعاد ونوع الصورة للوثائق</div>

              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-semibold text-center">
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>تعدد حر</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>بطاقة وطنية</div>
                  <div className="text-[7px] text-neutral-500">46×35 ملم</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border-2 border-brand-500 text-white font-bold shadow-xs">
                  <div>هوية أحوال</div>
                  <div className="text-[7px] text-brand-400">40×32 ملم</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>هوية عامة</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>متقاعدون</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 text-neutral-400">
                  <div>فيزا سفر</div>
                </div>
              </div>
            </div>

            {/* Section: محاذاة شبكة الخلايا */}
            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <div className="text-[10px] font-bold text-neutral-400">محاذاة شبكة الخلايا على الورقة</div>
              <div className="p-1.5 rounded-lg bg-[#2d2d2d] border border-white/10 flex items-center justify-between text-[10px]">
                <ArrowUpLeft className="w-4 h-4 text-brand-400 bg-brand-500/20 p-0.5 rounded" />
                <span className="text-brand-400 font-bold text-[9px]">أعلى اليسار</span>
              </div>
            </div>

            {/* Primary Blue Button: تخصيص نشط */}
            <button className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-extrabold text-[11px] shadow-lg shadow-brand-500/30 flex items-center justify-center gap-1.5 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>تخصيص نشط</span>
            </button>

            {/* Accordion: قوالب الكولاج والطباعة */}
            <div className="p-2 rounded-xl bg-[#2d2d2d] border border-white/10 flex items-center justify-between text-[10px] font-bold text-neutral-300 cursor-pointer">
              <span>↗</span>
              <span>قوالب الكولاج والطباعة 📁</span>
            </div>
          </aside>
        </div>
      </div>
      </div>
    </div>
  );
}
