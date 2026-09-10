import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, Scissors, Zap, CheckCircle2, ShieldCheck,
  Minus, Square, X, Plus, Layers, Camera, Save,
  Undo2, Redo2, Printer, LayoutGrid, SlidersHorizontal,
  Folder, Grid3x3, Zap as Lightning, Eye, Paintbrush,
  Image as ImageIcon, Sun, Moon, PanelRight, UserSquare, Wand2,
  ZoomIn, ZoomOut, Expand, ArrowUpRight,
} from 'lucide-react';
import { MOCKUP_PRESETS, type MockupPreset } from '../../data/landing-content';
import { useAppVersion } from '../../lib/version';

// ============================================================================
// App Mockup — نسخة طبق الأصل من واجهة التطبيق الفعلية (frontend/src/App.tsx):
// شريط عنوان GRIDO + قائمة، شريط أدوات h-12 بأوامر التطبيق الحقيقية
// (إضافة صورة، دفعة صور، كاميرا الهاتف، تراجع/إعادة، حفظ/طباعة/تصدير)،
// لوحة قوالب يمين w-[335px]، كانفاس وسط بورقة A4 ومسطرة، لوحة خصائص يسار
// بألسنة التنسيق/الألوان/التأثيرات/الترتيب، وشريط سفلي h-10 بأوامر العرض.
// سير عمل سريع (1.1 ثانية للمرحلة) مع أزرار AI حقيقية الشكل.
// ============================================================================

type WorkflowStage = 'detect' | 'isolate' | 'print';
const STAGE_SEQUENCE: WorkflowStage[] = ['detect', 'isolate', 'print'];
const STAGE_DURATION_MS = 3000;

  const AI_TOOLS = [
    { icon: UserSquare, label: 'تأطير', stage: 'detect' as WorkflowStage, running: 'جاري التأطير ...' },
    { icon: Sparkles, label: 'عزل', stage: 'isolate' as WorkflowStage, running: 'جاري العزل ...' },
    { icon: Wand2, label: 'ترميم', stage: 'print' as WorkflowStage, running: 'جاري التجهيز ...' },
  ];

export function AppMockup() {
  const [activePreset, setActivePreset] = useState<MockupPreset>(MOCKUP_PRESETS[0]);
  const [isZoomed, setIsZoomed] = useState(false);
  const [stage, setStage] = useState<WorkflowStage>('detect');
  const [timerCycle, setTimerCycle] = useState(0);
  const [litSheets, setLitSheets] = useState(0);
  const zoomOpenerRef = useRef<HTMLButtonElement | null>(null);
  const version = useAppVersion();
  const displayVersion = version ? `v${version}` : 'v2.4';

  // دورة سير العمل الهادئة: تأطير (3 ثوانٍ) ← عزل (3 ثوانٍ) ← ترميم/طباعة (3 ثوانٍ)
  useEffect(() => {
    const stageTimer = window.setInterval(() => {
      setStage((current) => {
        const idx = STAGE_SEQUENCE.indexOf(current);
        return STAGE_SEQUENCE[(idx + 1) % STAGE_SEQUENCE.length];
      });
    }, STAGE_DURATION_MS);
    return () => window.clearInterval(stageTimer);
  }, [timerCycle]);

  // ملء خلايا الورقة بتسلسل هادئ وسلس خلال مرحلة الطباعة
  useEffect(() => {
    if (stage !== 'print') {
      setLitSheets(0);
      return;
    }
    const sheetTimer = window.setInterval(() => {
      setLitSheets((n) => Math.min(n + 1, 8));
    }, 240);
    return () => window.clearInterval(sheetTimer);
  }, [stage]);

  const handleStageClick = useCallback((newStage: WorkflowStage) => {
    setStage(newStage);
    setTimerCycle((c) => c + 1);
  }, []);

  const selectPreset = useCallback((preset: MockupPreset) => {
    setActivePreset(preset);
    setStage('detect');
    setTimerCycle((c) => c + 1);
  }, []);

  // a11y: إغلاق الـ Lightbox بـ Escape + قفل تمرير الخلفية + استعادة التركيز
  useEffect(() => {
    if (!isZoomed) return;

    const opener = zoomOpenerRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsZoomed(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, [isZoomed]);

  const isIsolated = stage === 'isolate' || stage === 'print';
  const isUsVisa = activePreset.id === 'us-visa';
  const isA4Sheet = activePreset.id === 'a4-sheet';

  const menuItems = ['ملف', 'تحرير', 'عرض', 'أدوات', 'مساعدة'];

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* ==================== App Window (bg-background #141414) ==================== */}
      <div className="relative h-[490px] xs:h-[530px] sm:h-[600px] lg:h-[640px] rounded-2xl border border-[#333333] bg-[#141414] shadow-[0_24px_70px_rgba(0,0,0,0.85),0_8px_24px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300 flex flex-col select-none">

        {/* ==================== Title Bar (h-9 sm:h-10, bg-sidebar #1A1A1A) ==================== */}
        <div className="h-9 sm:h-10 shrink-0 bg-[#1A1A1A]/95 backdrop-blur-xl border-b border-[#333] px-2.5 sm:px-3.5 flex items-center justify-between" dir="rtl">
          {/* Right: Logo + Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] ring-2 ring-[#3b82f6]/20" />
              <span className="text-xs font-black font-mono tracking-wider text-white">GRIDO</span>
              <span className="text-[10px] font-mono text-[#777] ml-0.5">{displayVersion}</span>
            </div>
            <div className="w-px h-4 bg-[#333]/60 mx-0.5 hidden sm:block" />
            {/* Menu Bar */}
            <div className="hidden md:flex items-center gap-0.5">
              {menuItems.map((item) => (
                <div key={item} className="h-7 px-2.5 text-xs font-semibold text-[#ccc] rounded-md hover:bg-white/10 transition-colors flex items-center cursor-default whitespace-nowrap">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Center: Mode Segmented Control */}
          <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 bg-[#242424] p-0.5 rounded-lg border border-[#333]">
            <div className="h-7 px-3 rounded-md bg-[#333] text-[#3b82f6] font-black text-xs flex items-center gap-1.5 shadow">
              <LayoutGrid className="w-3.5 h-3.5" />
              كولاج
            </div>
            <div className="h-7 px-3 rounded-md text-[#999] font-semibold text-xs flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              تعديل حر
            </div>
          </div>

          {/* Left: Account + Theme + Toggles + Window Controls */}
          <div className="flex items-center gap-1 ml-0.5">
            <div className="hidden sm:flex w-7 h-7 rounded-md items-center justify-center text-emerald-400 hover:bg-white/10 transition-colors" title="الحساب — فعال">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex w-7 h-7 rounded-md items-center justify-center text-[#ccc] hover:bg-white/10 transition-colors" title="الوضع الليلي">
              <Moon className="w-4 h-4" />
            </div>
            <div className="hidden lg:flex w-7 h-7 rounded-md items-center justify-center text-[#ccc] hover:bg-white/10 transition-colors" title="لوحة القوالب (Ctrl+B)">
              <PanelRight className="w-4 h-4" />
            </div>
            <div className="hidden lg:flex w-7 h-7 rounded-md items-center justify-center text-[#ccc] hover:bg-white/10 transition-colors" title="لوحة الخصائص (Ctrl+Shift+B)">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="hidden sm:block w-px h-5 bg-[#333]/60 mx-1" />
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-[#ccc] hover:bg-white/10 transition-colors" title="تصغير">
                <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-[#ccc] hover:bg-white/10 transition-colors" title="تكبير">
                <Square className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-[#ccc] hover:bg-[#c42b1c] hover:text-white transition-colors" title="إغلاق">
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== Toolbar (Responsive, Zero Horizontal Scroll) ==================== */}
        <div className="h-10 sm:h-12 shrink-0 bg-[#1A1A1A]/95 backdrop-blur-xl border-b border-[#333] px-2.5 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-2 overflow-hidden" dir="rtl">
          {/* Right Group: FileOps + AI tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* FileOps capsule */}
            <div className="flex items-center bg-[#242424]/50 border border-[#333]/60 p-0.5 rounded-lg shrink-0">
              <div className="h-7 sm:h-8 px-2 sm:px-3 rounded-md text-xs font-bold text-[#3b82f6] bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 flex items-center gap-1 sm:gap-1.5 cursor-default whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">صورة</span>
              </div>
              <div className="hidden sm:flex w-8 h-8 rounded-md text-xs text-[#ccc] hover:bg-white/10 items-center justify-center cursor-default shrink-0 transition-colors" title="دفعة صور">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div className="hidden sm:flex w-8 h-8 rounded-md text-xs text-[#ccc] hover:bg-white/10 items-center justify-center cursor-default shrink-0 transition-colors" title="كاميرا الهاتف">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="w-px h-4 bg-[#333]/60 shrink-0 hidden xs:block" />

            {/* AI tools — تتفعل تباعاً مع المرحلة وتستجيب للنقر مباشرة */}
            <div className="flex items-center gap-1 shrink-0">
              {AI_TOOLS.map(({ icon: Icon, label, stage: toolStage, running }) => {
                const isRunning = stage === toolStage;
                const isDone = STAGE_SEQUENCE.indexOf(stage) > STAGE_SEQUENCE.indexOf(toolStage);
                return (
                  <button
                    key={label}
                    onClick={() => handleStageClick(toolStage)}
                    title={isRunning ? running : label}
                    className={`h-7 sm:h-8 rounded-md text-xs font-semibold flex items-center gap-1 sm:gap-1.5 shrink-0 transition-all duration-300 cursor-pointer ${
                      isRunning
                        ? 'px-2 sm:px-3 bg-[#3b82f6] text-white shadow-md shadow-[#3b82f6]/30'
                        : isDone
                          ? 'w-7 sm:w-auto px-0 sm:px-2.5 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 justify-center'
                          : 'w-7 sm:w-auto px-0 sm:px-2.5 border border-[#3b82f6]/50 bg-[#3b82f6]/5 text-[#60a5fa] hover:bg-[#3b82f6]/10 justify-center'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isRunning ? 'animate-spin' : ''}`} />
                    )}
                    <span className={isRunning ? 'inline' : 'hidden sm:inline'}>
                      {isRunning ? running : label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-px h-4 bg-[#333]/60 shrink-0 hidden sm:block" />

            {/* History */}
            <div className="hidden sm:flex items-center gap-0.5 shrink-0">
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[#ccc] hover:bg-white/10 transition-colors" title="تراجع">
                <Undo2 className="w-3.5 h-3.5" />
              </div>
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[#999] transition-colors" title="إعادة">
                <Redo2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Left Group: Template Info + Save/Print/Export capsule */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Template Info chip */}
            <div className="hidden xl:flex items-center gap-2 text-xs bg-[#242424]/40 border border-[#333]/40 rounded-md px-2.5 py-1 shrink-0">
              <span className="font-bold text-white">{activePreset.name}</span>
              <span className="font-mono text-[#888] text-[10px]" dir="ltr">{activePreset.dimensions}</span>
            </div>

            {/* Save/Print/Export capsule */}
            <div className="flex items-center bg-[#242424] border border-[#333] p-0.5 rounded-lg shrink-0">
              <div className="hidden sm:flex w-8 h-8 rounded-md text-[#ccc] hover:bg-white/10 items-center justify-center cursor-default transition-colors shrink-0" title="حفظ">
                <Save className="w-3.5 h-3.5" />
              </div>
              <div className="hidden sm:flex w-8 h-8 rounded-md text-[#ccc] hover:bg-white/10 items-center justify-center cursor-default transition-colors shrink-0" title="طباعة">
                <Printer className="w-3.5 h-3.5" />
              </div>
              <div
                className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-md text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all whitespace-nowrap cursor-default ${
                  stage === 'print'
                    ? 'bg-[#2563eb] text-white ring-2 ring-[#60a5fa] shadow-lg shadow-[#2563eb]/50 animate-pulse'
                    : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
                }`}
                title="تصدير صورة"
              >
                <ArrowUpRight className={`w-3.5 h-3.5 shrink-0 ${stage === 'print' ? 'animate-bounce' : ''}`} />
                <span>تصدير</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Presets Bar — تمكين مستخدم الهاتف من التبديل بين القوالب بسلاسة */}
        <div className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-[#171717] border-b border-[#2d2d2d] overflow-x-auto no-scrollbar shrink-0" dir="rtl">
          <span className="text-[10px] font-bold text-[#777] shrink-0 ml-1">القالب:</span>
          {MOCKUP_PRESETS.map((preset) => {
            const isActive = activePreset.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => selectPreset(preset)}
                className={`h-6.5 px-2.5 rounded-md text-[11px] font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#3b82f6] text-white shadow-sm shadow-[#3b82f6]/30 font-bold'
                    : 'bg-[#222] text-[#aaa] hover:text-white border border-[#333]'
                }`}
              >
                <span>{preset.name}</span>
                <span className="text-[9px] font-mono opacity-75" dir="ltr">{preset.dimensions}</span>
              </button>
            );
          })}
        </div>

        {/* ==================== Main 3-Panel Layout ==================== */}
        <div className="flex-1 flex min-h-0" dir="rtl">

          {/* ===== Right Panel: القوالب (w-[335px] → responsive) ===== */}
          <aside className="hidden lg:flex flex-col w-[230px] xl:w-[260px] shrink-0 border-l border-[#333] bg-[#1A1A1A]">
            {/* Panel header */}
            <div className="h-12 px-3.5 flex items-center justify-between border-b border-[#333]/60 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6]">
                  <Grid3x3 className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white">القوالب</span>
              </div>
            </div>

            {/* Panel body — preset cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {MOCKUP_PRESETS.map((preset) => {
                const isActive = activePreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => selectPreset(preset)}
                    className={`w-full text-start rounded-xl border p-2.5 transition-all cursor-pointer ${
                      isActive
                        ? 'border-2 border-[#3b82f6] bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/30'
                        : 'border-[#333] bg-[#242424] hover:border-[#3b82f6]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg border text-[10px] font-mono font-black flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-[#3b82f6]/20 border-[#3b82f6]/50 text-[#60a5fa]'
                          : 'bg-[#1e1e1e] border-[#333] text-[#aaa]'
                      }`}>
                        {preset.id === 'iraq-passport' ? 'IQ' : preset.id === 'us-visa' ? 'US' : preset.id === 'schengen' ? 'EU' : 'A4'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-bold truncate ${isActive ? 'text-[#60a5fa]' : 'text-white'}`}>
                          {preset.name}
                        </div>
                        <div className="text-[10px] font-mono text-[#888]" dir="ltr">
                          {preset.dimensions}
                        </div>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse shrink-0" />}
                    </div>
                  </button>
                );
              })}

              {/* Quick tabs */}
              <div className="flex items-center gap-1 bg-[#242424]/50 p-1 rounded-xl border border-[#333]/60 mt-3">
                <div className="flex-1 h-7 px-2 rounded-lg bg-[#333] text-amber-400 text-[10px] font-bold flex items-center justify-center gap-1">
                  <Lightning className="w-3 h-3" />
                  نماذج سريعة
                </div>
                <div className="flex-1 h-7 px-2 rounded-lg text-[#999] text-[10px] font-semibold flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3" />
                  تخصيص
                </div>
                <div className="flex-1 h-7 px-2 rounded-lg text-[#999] text-[10px] font-semibold flex items-center justify-center gap-1">
                  <Folder className="w-3 h-3" />
                  مكتبتي
                </div>
              </div>
            </div>
          </aside>

          {/* ===== Center: Canvas Workspace ===== */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#1b1b1b]">
            {/* Ruler — بدون تكرار الصفر مع نقطة بداية محددة */}
            <div className="h-4.5 sm:h-5 shrink-0 bg-[#1A1A1A] border-b border-[#333] relative overflow-hidden" dir="ltr">
              {/* Origin zero highlighted */}
              <div className="absolute left-0 inset-y-0 w-6 bg-[#3b82f6]/15 border-r border-[#3b82f6] flex items-center justify-center z-10">
                <span className="text-[8px] font-mono font-bold text-[#60a5fa]">0</span>
              </div>
              <div className="absolute inset-0 flex items-center pl-8 gap-5 sm:gap-8">
                {(isA4Sheet ? [5, 10, 15, 20, 25, 30] : [2, 4, 6, 8, 10, 12, 14, 15]).map((cm) => (
                  <div key={cm} className="flex items-center gap-1.5 shrink-0">
                    <div className="w-px h-1.5 bg-[#555]" />
                    <span className="text-[8px] font-mono text-[#666]">{cm}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Paper canvas area */}
            <div
              className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-2 xs:p-3 sm:p-6"
              style={{ backgroundColor: '#181818' }}
            >
              {/* subtle workspace grid */}
              <div
                className="absolute inset-0 opacity-[0.25]"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              {/* Interactive Stage Stepper Pill (Visible across mobile & desktop) */}
              <div className="mb-2 sm:mb-3 z-20 flex items-center gap-1 sm:gap-1.5 p-1 rounded-full bg-[#161616]/90 backdrop-blur-md border border-[#333] shadow-md" dir="rtl">
                {AI_TOOLS.map(({ icon: Icon, label, stage: toolStage }) => {
                  const isRunning = stage === toolStage;
                  return (
                    <button
                      key={toolStage}
                      onClick={() => handleStageClick(toolStage)}
                      className={`h-5.5 sm:h-6 px-2.5 sm:px-3 rounded-full text-[10px] sm:text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        isRunning
                          ? 'bg-[#3b82f6] text-white shadow-sm shadow-[#3b82f6]/40 font-bold'
                          : 'text-[#888] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Photo Paper Card — مقاس 10×15 سم (150×100 mm) لطباعة 8 صور هوية 35×45 مم بدون أي قص */}
              <div
                className={`relative rounded-[3px] border border-black/30 shadow-2xl shadow-black/80 bg-white overflow-hidden select-none transition-all duration-300 max-w-full ${
                  isA4Sheet
                    ? 'w-[180px] xs:w-[205px] sm:w-[240px] xl:w-[260px] aspect-[210/297]'
                    : 'w-[245px] xs:w-[280px] sm:w-[340px] xl:w-[375px] aspect-[15/10]'
                }`}
              >
                {/* خطوط القص الشبكية الإرشادية الدقيقة (0.5mm) */}
                {!isA4Sheet && !isUsVisa && (
                  <>
                    {/* خط الفصل الأفقي بين الصفين مع مسار مقص آلي */}
                    <div className="absolute top-1/2 inset-x-1 border-t border-dashed border-[#94a3b8]/50 z-2 pointer-events-none" />
                    {/* خطوط الفصل الرأسية بين الأعمدة الأربعة */}
                    {[24.6, 49.6, 74.6].map((x) => (
                      <div
                        key={x}
                        className="absolute inset-y-1 border-l border-dashed border-[#94a3b8]/50 z-2 pointer-events-none"
                        style={{ left: `${x}%` }}
                      />
                    ))}
                  </>
                )}

                {/* شبكة صور الهوية — 8 صور مصفوفة بأبعاد 35×45 مم القياسية الكاملة */}
                {Array.from({ length: isUsVisa ? 6 : 8 }).map((_, i) => {
                  const totalCols = isUsVisa ? 3 : 4;
                  const col = i % totalCols;
                  const row = Math.floor(i / totalCols);
                  const isSelected = i === 0;
                  const showIsolated = stage === 'isolate' ? isSelected : (stage === 'print' ? (isSelected || i < litSheets) : false);

                  // حساب الأبعاد بدقة هندسية:
                  // ورقة 150×100 مم: عرض الصورة 35.4 مم (23.6%)، ارتفاع الصورة 44 مم (44.0%)
                  const cellStyle = isUsVisa
                    ? {
                        width: '30.5%',
                        height: '45.5%',
                        left: `${1.5 + col * 33.0}%`,
                        top: `${3.0 + row * 48.5}%`,
                      }
                    : isA4Sheet
                      ? {
                          width: '22.0%',
                          height: '19.5%',
                          left: `${3.5 + (i % 4) * 23.5}%`,
                          top: `${6.0 + Math.floor(i / 4) * 22.5}%`,
                        }
                      : {
                          width: '23.6%',
                          height: '44.0%',
                          left: `${1.2 + col * 24.6}%`,
                          top: `${4.0 + row * 48.0}%`,
                        };

                  return (
                    <div
                      key={i}
                      className={`absolute rounded-[1.5px] overflow-hidden transition-all duration-500 bg-white border ${
                        isSelected && stage === 'detect'
                          ? 'border-[#3b82f6] ring-1.5 ring-[#3b82f6]/70 z-10'
                          : 'border border-[#94a3b8]/35'
                      }`}
                      style={cellStyle}
                    >
                      <img
                        src={showIsolated ? '/sample-passport-after.png' : '/sample-passport-before.png'}
                        alt="صورة هوية قياسية"
                        aria-hidden="true"
                        className="w-full h-full object-cover object-top transition-all duration-500"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />

                      {/* معالم التأطير الذكية ICAO مع شعاع ليزر المسح في طور الكشف */}
                      {isSelected && stage === 'detect' && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          {/* شعاع ليزر المسح الضوئي الأزرق */}
                          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#60a5fa] to-transparent shadow-[0_0_8px_#3b82f6] animate-mockup-laser z-20" />
                          {/* خط مستوى العينين البيومتري القياسي */}
                          <div className="absolute top-[38%] inset-x-0 border-t border-[#3b82f6]/85 border-dashed" />
                          {/* خط قاعدة الذقن */}
                          <div className="absolute top-[78%] inset-x-0 border-t border-[#3b82f6]/55 border-dashed" />
                          {/* محور التناظر النصفي */}
                          <div className="absolute inset-y-0 left-1/2 border-l border-[#3b82f6]/65 border-dashed" />
                          {/* مقابض زوايا التركيز */}
                          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#3b82f6]" />
                          <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-[#3b82f6]" />
                        </div>
                      )}

                      {/* إشارة نجاح العزل الفوري في طور العزل */}
                      {isSelected && stage === 'isolate' && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-0 border border-emerald-500/60 rounded-[1.5px] z-20" />
                          <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-md z-20 animate-fadeIn">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ===== Left Panel: الخصائص ===== */}
          <aside className="hidden md:flex flex-col w-[220px] xl:w-[240px] shrink-0 border-r border-[#333] bg-[#1A1A1A]">
            {/* Panel header */}
            <div className="h-12 px-3.5 flex items-center justify-between border-b border-[#333]/60 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6]">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white">الخصائص</span>
              </div>
            </div>

            {/* Tabs bar — التنسيق/الألوان/التأثيرات/الترتيب */}
            <div className="grid grid-cols-4 gap-1 p-1 m-3 rounded-xl bg-[#242424]/60" title="التنسيق / الألوان / التأثيرات / الترتيب">
              {[
                { icon: ImageIcon, label: 'التنسيق', active: true },
                { icon: Paintbrush, label: 'الألوان', active: false },
                { icon: Sparkles, label: 'التأثيرات', active: false },
                { icon: Layers, label: 'الترتيب', active: false },
              ].map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  title={label}
                  className={`h-9 rounded-lg flex items-center justify-center transition-all ${
                    active ? 'bg-[#333] text-[#3b82f6] ring-1 ring-[#3b82f6]/30' : 'text-[#888] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              ))}
            </div>

            {/* Properties body — يتغير حسب المرحلة */}
            <div className="flex-1 overflow-y-auto px-3 space-y-3">
              {/* أبعاد الطباعة */}
              <div className="rounded-xl border border-[#333]/80 bg-[#242424] p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#999]">أبعاد الطباعة</span>
                  <span className="font-mono font-bold text-white" dir="ltr">35 × 45 mm</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#999]">دقة الإخراج</span>
                  <span className="font-mono font-bold text-emerald-400" dir="ltr">300 DPI</span>
                </div>
              </div>

              {/* تعديل الألوان والسطوع — sliders */}
              <div className="rounded-xl border border-[#333]/80 bg-[#242424] p-3 space-y-3">
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-[#60a5fa]" />
                  السطوع والتباين
                </div>
                {[
                  { label: 'السطوع', pct: isIsolated ? 88 : 62 },
                  { label: 'التباين', pct: isIsolated ? 76 : 50 },
                  { label: 'التشبع', pct: 54 },
                ].map(({ label, pct }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#aaa]">{label}</span>
                      <span className="font-mono text-[#888]" dir="ltr">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#181818] relative" dir="ltr">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-[#3b82f6]" style={{ width: `${pct}%` }} />
                      <div
                        className="absolute -top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#3b82f6] shadow-sm"
                        style={{ left: `calc(${pct}% - 7px)` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* خلفية الصورة — swatches */}
              <div className="rounded-xl border border-[#333]/80 bg-[#242424] p-3 space-y-2">
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#60a5fa]" />
                  خلفية الصورة
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { c: '#1d4ed8', active: isIsolated, title: 'أزرق ملكي' },
                    { c: '#ffffff', active: !isIsolated, title: 'أبيض نقي' },
                    { c: '#94a3b8', active: false, title: 'رمادي حيادي' },
                    { c: 'transparent', active: false, title: 'شفاف' },
                  ].map(({ c, active, title }, i) => (
                    <div
                      key={i}
                      title={title}
                      className={`w-7 h-7 rounded-lg border-2 transition-all cursor-default ${
                        active ? 'border-[#3b82f6] ring-1 ring-[#3b82f6]/50 scale-105' : 'border-[#444] opacity-75'
                      }`}
                      style={{
                        backgroundColor: c,
                        backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%), linear-gradient(45deg, #444 25%, #222 25%, #222 75%, #444 75%)' : 'none',
                        backgroundSize: c === 'transparent' ? '6px 6px' : 'auto',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* خطوط القص switch */}
              <div className="rounded-xl border border-[#333]/80 bg-[#242424] p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  خطوط القص
                </div>
                <div className="w-8 h-4.5 rounded-full bg-[#3b82f6] relative cursor-default">
                  <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ==================== Bottom Deck (Responsive) ==================== */}
        <div className="h-9 sm:h-10 shrink-0 bg-[#1A1A1A] border-t border-[#333] px-2.5 sm:px-4 flex items-center justify-between gap-2" dir="rtl">
          {/* Right: paper info with dir=ltr on dimensions */}
          <div className="flex items-center gap-1.5 sm:gap-2 h-7 sm:h-7.5 px-2 sm:px-3 rounded-lg bg-[#242424]/90 border border-[#333] backdrop-blur-xl">
            <span className="text-[10px] sm:text-[11px] font-bold text-white">
              {isA4Sheet ? 'A4' : '10×15 سم'}
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-[#888]" dir="ltr">
              {isA4Sheet ? '210 × 297 mm' : '150 × 100 mm'}
            </span>
          </div>

          {/* Center: view toggles */}
          <div className="hidden sm:flex items-center gap-0.5 h-7.5 px-1.5 rounded-lg bg-[#242424]/90 border border-[#333] backdrop-blur-xl">
            {[
              { icon: Grid3x3, title: 'الشبكة', active: true },
              { icon: Zap, title: 'المغناطيس', active: true },
              { icon: SlidersHorizontal, title: 'الخطوط الإرشادية', active: true },
              { icon: Scissors, title: 'خطوط القص', active: true },
              { icon: Eye, title: 'وضع التركيز', active: false },
            ].map(({ icon: Icon, title, active }, i) => (
              <div
                key={i}
                title={title}
                className={`w-6.5 h-6.5 rounded-md flex items-center justify-center transition-colors ${
                  active ? 'text-[#3b82f6] bg-[#3b82f6]/10' : 'text-[#888] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            ))}
          </div>

          {/* Left: Zoom Controls & Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom controls capsule in dir=ltr (hidden on small mobile, visible sm+) */}
            <div className="hidden sm:flex items-center gap-0.5 h-7.5 px-1 rounded-lg bg-[#242424]/90 border border-[#333] backdrop-blur-xl" dir="ltr">
              <div className="w-6 h-6 rounded flex items-center justify-center text-[#888] hover:text-white hover:bg-white/10 transition-colors cursor-default" title="تصغير">
                <ZoomOut className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-white px-1.5 min-w-[38px] text-center select-none">100%</span>
              <div className="w-6 h-6 rounded flex items-center justify-center text-[#888] hover:text-white hover:bg-white/10 transition-colors cursor-default" title="تكبير">
                <ZoomIn className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Fullscreen Expand CTA Button — متاح للموبايل والديسكتوب */}
            <button
              ref={zoomOpenerRef}
              onClick={() => setIsZoomed(true)}
              className="h-7 sm:h-7.5 px-2 sm:px-2.5 rounded-lg bg-[#242424]/90 border border-[#333] hover:border-[#3b82f6]/50 text-[#60a5fa] hover:bg-[#3b82f6]/10 flex items-center gap-1 text-[10px] sm:text-xs font-semibold transition-all cursor-pointer"
              title="عرض الواجهة الفعلية بدقة كاملة"
              aria-label="عرض الواجهة الفعلية"
            >
              <Expand className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">الواجهة الفعلية</span>
            </button>

            {/* Offline badge */}
            <div className="hidden md:flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg bg-[#242424]/90 border border-[#333] backdrop-blur-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">100% محلي</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox — لقطة الواجهة الفعلية */}
      {isZoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`واجهة Grido Studio الفعلية — ${activePreset.name}`}
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-6xl w-full rounded-2xl overflow-hidden border border-[#333] shadow-2xl bg-[#141414] cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 bg-[#1A1A1A] border-b border-[#333] flex items-center justify-between text-xs text-white">
              <span className="font-bold">واجهة Grido Studio الفعلية — {activePreset.name}</span>
              <button
                onClick={() => setIsZoomed(false)}
                aria-label="إغلاق عرض الواجهة"
                className="w-7 h-7 rounded-lg bg-[#262626] hover:bg-[#333] flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3 bg-[#121212]">
              <img
                src="/grido-desktop-ui.png"
                alt={`لقطة الواجهة الفعلية لتطبيق Grido Studio — ${activePreset.name}`}
                className="w-full h-auto object-contain max-h-[78vh] rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* CSS Keyframes */}
      <style>{`
        @keyframes mockup-busy-in {
          0% { transform: translate(-50%, -8px); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
