import { useState } from 'react';
import { Crop, LayoutGrid, Wand2, Printer, CheckCircle2, ArrowLeftRight, Sliders, ShieldCheck, Sparkles, MoveHorizontal, MousePointer2, RotateCcw, Layers, ZoomIn } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

type TabId = 'id' | 'collage' | 'ai' | 'cmyk';

const TABS: { id: TabId; label: string; icon: typeof Crop }[] = [
  { id: 'id', label: 'الهوية والرسميات', icon: Crop },
  { id: 'collage', label: 'الكولاج والشبكات', icon: LayoutGrid },
  { id: 'ai', label: 'ترميم الوجوه', icon: Wand2 },
  { id: 'cmyk', label: 'ألوان المطابع', icon: Printer },
];

const TAB_CONTENT: Record<
  TabId,
  {
    badge: string;
    title: string;
    punch: string;
    metric: { value: string; label: string };
    points: string[];
  }
> = {
  id: {
    badge: 'توليد تلقائي 40×32 / 35×45 / فيزا',
    title: 'قص وتوسيط الصورة بنقرة واحدة',
    punch: 'تعرّف تلقائي على الوجه والأكتاف، ثم تُجهَّز الورقة كاملة للطباعة فوراً.',
    metric: { value: '8 صور', label: 'في ورقة A4 واحدة جاهزة للطباعة' },
    points: [
      'توسيط ذكي مع تثبيت النسب الرسمية',
      'خلفيات رسمية موحدة بنقرة واحدة',
      'تجهيز فوري للطباعة (A4 / 10×15)',
    ],
  },
  collage: {
    badge: 'تنسيق شبكي محترف',
    title: 'قوالب كولاج ديناميكية قابلة للتخصيص',
    punch: 'ألبومات وكروت بمحاذاة ذكية ومساطر تلقائية — وكل ملّيمتر في الورقة مستثمر.',
    metric: { value: '0%', label: 'هدر ورق الطباعة مع التوزيع الذكي' },
    points: [
      'سحب وإسقاط مع استنباط الأبعاد فورياً',
      'محاذاة ومساطر شاشة ذكية (Figma-like)',
      'توزيع تلقائي بلا هدر — 100%',
    ],
  },
  ai: {
    badge: 'محرك CodeFormer + Real-ESRGAN',
    title: 'استعادة تفاصيل الوجه وضبط الإضاءة',
    punch: 'ترميم فوري يحافظ على ملامح الشخصية — بدون تأثير شمعي وبدون رفع الصور.',
    metric: { value: '100%', label: 'معالجة محلية على جهازك — بلا سحابة' },
    points: [
      'معالجة مزدوجة مخصصة لصور الهوية',
      'تحسين الإضاءة ورسم تفاصيل المسام',
      'خصوصية كاملة — الصور لا تغادر جهازك',
    ],
  },
  cmyk: {
    badge: 'تصدير CMYK للمطابع التجارية',
    title: 'نمط ألوان CMYK والأسود الخالص',
    punch: 'تحويل دقيق يطابق الشاشة بالمطبوع، مع أسود خالص على خطوط القص.',
    metric: { value: 'K=100%', label: 'أسود خالص على خطوط القص — بلا تلطخ' },
    points: [
      'تحويل مطابع حقيقي ومطابقة البروفات',
      'تصدير TIFF و High-JPEG بدقة 300DPI',
      'فرض الأسود الخالص على أسياخ التقصي',
    ],
  },
};

const PASSPORT_IMG = '/sample-passport.png';

const TOOLS: { icon: typeof Crop; label: string; active?: boolean }[] = [
  { icon: MousePointer2, label: 'تحديد', active: true },
  { icon: Crop, label: 'قص' },
  { icon: RotateCcw, label: 'تدوير' },
  { icon: Layers, label: 'الطبقات' },
];

export function FeaturesTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('id');
  const [tabKey, setTabKey] = useState<number>(0);

  // Tab 1 (ID Photos) Interactive States
  const [idBgColor, setIdBgColor] = useState<'white' | 'blue' | 'gray'>('white');
  const [idPaperSize, setIdPaperSize] = useState<'A4' | '10x15'>('A4');

  // Tab 2 (Collage) Interactive State
  const [collageLayout, setCollageLayout] = useState<'hero' | 'grid' | 'album'>('hero');

  // Tab 3 (AI Restoration) Interactive Split Slider State
  const [aiSplitPos, setAiSplitPos] = useState<number>(50);

  // Tab 4 (CMYK) Interactive Channel State
  const [cmykChannel, setCmykChannel] = useState<'all' | 'c' | 'm' | 'y' | 'k'>('all');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setTabKey((prev) => prev + 1);
  };

  const content = TAB_CONTENT[activeTab];

  // Helper for background color mapping in ID photos preview
  const getBgStyle = () => {
    switch (idBgColor) {
      case 'blue': return 'bg-[#1d4ed8]';
      case 'gray': return 'bg-[#6b7280]';
      default: return 'bg-[#ffffff]';
    }
  };

  return (
    <section id="features" className="relative section-rhythm border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <SectionHeading
          icon={Sparkles}
          eyebrow="المميزات الرئيسية"
          title={<>استكشف قوة <span className="text-secondary">GRIDO STUDIO</span></>}
          subtitle="أدوات الذكاء الاصطناعي والأتمتة لتضاعف إنتاجية استوديوهات التصوير."
          index="02"
        />

        {/* SpaceX Monochromatic Pill Tabs Bar */}
        <div className="stagger-4 flex justify-center mb-8 sm:mb-16 relative z-20">
          <div role="tablist" aria-label="ميزات Grido Studio" className="p-1.5 rounded-full bg-elevated border border-subtle flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto justify-start sm:justify-center">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`feature-tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls="features-tabpanel"
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-5 py-2.5 rounded-full font-extrabold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-black shadow-md'
                      : 'text-tertiary hover:text-white hover:bg-elevated/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-black' : 'text-tertiary'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Studio Canvas App Window Frame Card */}
        <div className="relative overflow-hidden rounded-2xl bg-elevated border border-subtle shadow-2xl group/window">
          {/* Top Window Bar (Chrome UI) */}
          <div className="h-11 sm:h-14 bg-elevated/90 border-b border-subtle px-4 sm:px-6 flex items-center justify-between gap-3 text-xs text-tertiary relative z-10 font-mono">
            <div className="flex items-center gap-3 min-w-0">
              {/* OS Traffic Lights */}
              <div className="flex items-center gap-1.5 shrink-0" aria-hidden>
                <span className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[inset_0_0_2px_rgba(0,0,0,0.35)]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[inset_0_0_2px_rgba(0,0,0,0.35)]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840] shadow-[inset_0_0_2px_rgba(0,0,0,0.35)]" />
              </div>

              <span className="ms-2 sm:ms-3 text-[10px] sm:text-[11px] text-secondary font-bold truncate">
                مساحة عمل GRIDO STUDIO — {content.badge}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-bold shrink-0">
              <span className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md bg-secondary border border-subtle text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
                {content.metric.value}
              </span>
              <span className="hidden lg:flex items-center px-3 py-1 rounded-md bg-secondary border border-subtle text-secondary">
                {idPaperSize === 'A4' ? 'A4 (210 × 297 ملم)' : '10 × 15 سم'}
              </span>
              <span className="flex items-center px-3 py-1 rounded-md bg-white text-black font-extrabold">
                300 DPI
              </span>
            </div>
          </div>

          {/* Main Grid Content with tab reveal animation key */}
          <div
            key={tabKey}
            role="tabpanel"
            id="features-tabpanel"
            aria-labelledby={`feature-tab-${activeTab}`}
            className="tab-content-reveal p-4 sm:p-8 grid lg:grid-cols-12 gap-6 sm:gap-8 items-center"
          >
            {/* Visual Interactive Preview Column Card (7 Cols) — Workspace UI */}
            <div className="lg:col-span-7 bg-secondary rounded-xl border border-subtle relative overflow-hidden min-h-[420px] sm:min-h-[480px] group flex flex-col">
              {/* Workspace Ruler Bar */}
              <div className="relative h-6 shrink-0 bg-[#141414] border-b border-subtle select-none pointer-events-none z-20">
                <div className="ruler-ticks absolute inset-x-3 top-1 bottom-1.5" aria-hidden />
                <div className="absolute inset-0 flex items-end justify-between px-4 sm:px-6 pb-1 text-[8px] font-mono text-tertiary" dir="ltr" aria-hidden>
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                  <span>150</span>
                  <span>210</span>
                </div>
              </div>

              {/* Workspace Canvas Body: Blueprint Grid + Tab Panels */}
              <div className="flex-1 flex min-h-0 editor-grid-bg">

              {/* ------------------------------------------------------------- */}
              {/* 1. ID Photos Interactive Studio Sheet Preview */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'id' && (
                <div className="w-full max-w-lg mx-auto space-y-4">
                  {/* Interactive Control Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-elevated border border-subtle text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-tertiary text-[10px] font-bold">الخلفية الموحدة:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setIdBgColor('white')}
                          className={`w-5 h-5 rounded-full bg-white border cursor-pointer transition-transform ${idBgColor === 'white' ? 'scale-125 border-white ring-2 ring-white/50' : 'border-neutral-400 opacity-70'}`}
                          title="خلفية بيضاء رسمية"
                        />
                        <button
                          onClick={() => setIdBgColor('blue')}
                          className={`w-5 h-5 rounded-full bg-[#1d4ed8] border cursor-pointer transition-transform ${idBgColor === 'blue' ? 'scale-125 border-white ring-2 ring-white/50' : 'border-neutral-400 opacity-70'}`}
                          title="خلفية زرقاء رسمية"
                        />
                        <button
                          onClick={() => setIdBgColor('gray')}
                          className={`w-5 h-5 rounded-full bg-[#6b7280] border cursor-pointer transition-transform ${idBgColor === 'gray' ? 'scale-125 border-white ring-2 ring-white/50' : 'border-neutral-400 opacity-70'}`}
                          title="خلفية رمادية رسمية"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg border border-subtle">
                      <button
                        onClick={() => setIdPaperSize('A4')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${idPaperSize === 'A4' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        ورقة A4 (8 صور)
                      </button>
                      <button
                        onClick={() => setIdPaperSize('10x15')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${idPaperSize === '10x15' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        10×15 سم (4 صور)
                      </button>
                    </div>
                  </div>

                  {/* Studio Canvas Paper Sheet — ورقة بيضاء حقيقية للطباعة */}
                  <div className="relative bg-white p-4 sm:p-5 rounded-xl shadow-[0_24px_60px_-16px_rgba(0,0,0,0.9)] space-y-3">
                    {/* Print Crop Marks on Sheet Corners */}
                    <span aria-hidden className="absolute -top-1 -start-1 w-3 h-3 border-t-2 border-s-2 border-black/50 rounded-tr" />
                    <span aria-hidden className="absolute -top-1 -end-1 w-3 h-3 border-t-2 border-e-2 border-black/50 rounded-tl" />
                    <span aria-hidden className="absolute -bottom-1 -start-1 w-3 h-3 border-b-2 border-s-2 border-black/50 rounded-br" />
                    <span aria-hidden className="absolute -bottom-1 -end-1 w-3 h-3 border-b-2 border-e-2 border-black/50 rounded-bl" />

                    <div className="flex items-center justify-between text-xs border-b border-neutral-200 pb-2.5 font-mono">
                      <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-neutral-900" />
                        ورقة طباعة معاملات {idPaperSize}
                      </span>
                      <span className="text-[10px] font-mono text-white bg-neutral-900 px-2.5 py-0.5 rounded-md">
                        40 × 32 ملم • 300DPI
                      </span>
                    </div>

                    {/* Photos Grid with Unclipped Photo Framing */}
                    <div className={`grid gap-3 pt-1 ${idPaperSize === 'A4' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2'}`}>
                      {(idPaperSize === 'A4' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4]).map((n) => (
                        <div
                          key={n}
                          className={`aspect-[3/4] ${getBgStyle()} rounded-lg border border-neutral-300 overflow-hidden relative group/img shadow-md transition-colors duration-300 flex items-center justify-center p-0.5 laser-bleed-wrapper`}
                        >
                          <img
                            src={PASSPORT_IMG}
                            alt="Passport Preview"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain transition-transform duration-300 group-hover/img:scale-105"
                          />

                          {/* Dimension Overlay */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/90 text-[7px] font-mono text-center text-white py-0.5 font-bold">
                            40 × 32 ملم
                          </div>

                          {/* Auto Crop Guide box overlay on 1st photo slot */}
                          {n === 1 && (
                            <div className="absolute inset-1 border border-dashed border-white rounded pointer-events-none flex items-center justify-center">
                              <span className="bg-white text-black text-[7px] font-mono font-extrabold px-1 py-0.5 rounded shadow">
                                توسيط تلقائي
                              </span>
                            </div>
                          )}

                          {/* Laser Bleed Lines */}
                          <div className="laser-bleed-line laser-bleed-top" style={{ top: '2px' }} />
                          <div className="laser-bleed-line laser-bleed-bottom" style={{ bottom: '12px' }} />
                          <div className="laser-bleed-line laser-bleed-left" style={{ left: '2px' }} />
                          <div className="laser-bleed-line laser-bleed-right" style={{ right: '2px' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 2. Collage Interactive Layout Preview (Unclipped Framing) */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'collage' && (
                <div className="w-full max-w-lg mx-auto space-y-4">
                  {/* Layout Preset Selector Buttons */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-elevated border border-subtle text-xs font-mono">
                    <span className="text-tertiary text-[10px] font-bold px-1">تخطيط الكولاج:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCollageLayout('hero')}
                        className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-colors ${collageLayout === 'hero' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        رئيسية + 2
                      </button>
                      <button
                        onClick={() => setCollageLayout('grid')}
                        className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-colors ${collageLayout === 'grid' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        شبكة 4X4 متساوية
                      </button>
                      <button
                        onClick={() => setCollageLayout('album')}
                        className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-colors ${collageLayout === 'album' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        ألبوم أفقي
                      </button>
                    </div>
                  </div>

                  {/* Collage Editor Sheet Canvas */}
                  <div className="bg-elevated p-4 sm:p-5 rounded-xl border border-subtle space-y-3 relative shadow-xl">
                    <div className="flex items-center justify-between text-xs border-b border-subtle pb-2.5 font-mono">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <LayoutGrid className="w-4 h-4 text-white" />
                        تنسيق شبكي ديناميكي
                      </span>
                      <span className="text-[10px] font-mono text-white bg-secondary px-2.5 py-0.5 rounded-md border border-subtle">
                        Gap: 3.5مم • الهامش: 5مم
                      </span>
                    </div>

                    {/* Layout Variant Renderers with Ambient Blur Background + Full Unclipped Photo Framing */}
                    {collageLayout === 'hero' && (
                      <div className="grid grid-cols-12 gap-3 pt-1">
                        {/* Hero Main Slot (120 x 80 mm) */}
                        <div className="col-span-12 h-40 bg-primary rounded-xl border border-subtle overflow-hidden relative group/hero shadow-md flex items-center justify-center p-2 laser-bleed-wrapper">
                          <img
                            src={PASSPORT_IMG}
                            alt="Collage Main Blur BG"
                            className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-125 pointer-events-none"
                          />
                          <img
                            src={PASSPORT_IMG}
                            alt="Collage Main"
                            className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-300 group-hover/hero:scale-105 drop-shadow-md rounded"
                          />
                          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-white text-black text-[9px] font-mono font-extrabold z-20">
                            الفتحة الرئيسية (120 × 80 ملم)
                          </div>
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/90 text-[8px] font-mono text-white border border-subtle z-20">
                            DPI: 300
                          </div>
                          <div className="laser-bleed-line laser-bleed-top" style={{ top: '8px' }} />
                          <div className="laser-bleed-line laser-bleed-bottom" style={{ bottom: '8px' }} />
                          <div className="laser-bleed-line laser-bleed-left" style={{ left: '8px' }} />
                          <div className="laser-bleed-line laser-bleed-right" style={{ right: '8px' }} />
                        </div>

                        {/* Sub Slots */}
                        <div className="col-span-6 h-28 bg-primary rounded-xl border border-subtle overflow-hidden relative group/sub flex items-center justify-center p-2 laser-bleed-wrapper">
                          <img src={PASSPORT_IMG} alt="Sub slot 1 blur" className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25 scale-125 pointer-events-none" />
                          <img src={PASSPORT_IMG} alt="Sub slot 1" className="relative z-10 max-h-full max-w-full object-contain group-hover/sub:scale-105 transition-transform drop-shadow" />
                          <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/90 text-[8px] text-white font-mono z-20">60 × 40 mm</span>
                          <div className="laser-bleed-line laser-bleed-top" style={{ top: '8px' }} />
                          <div className="laser-bleed-line laser-bleed-bottom" style={{ bottom: '8px' }} />
                          <div className="laser-bleed-line laser-bleed-left" style={{ left: '8px' }} />
                          <div className="laser-bleed-line laser-bleed-right" style={{ right: '8px' }} />
                        </div>
                        <div className="col-span-6 h-28 bg-primary rounded-xl border border-subtle overflow-hidden relative group/sub flex items-center justify-center p-2 laser-bleed-wrapper">
                          <img src={PASSPORT_IMG} alt="Sub slot 2 blur" className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25 scale-125 pointer-events-none" />
                          <img src={PASSPORT_IMG} alt="Sub slot 2" className="relative z-10 max-h-full max-w-full object-contain group-hover/sub:scale-105 transition-transform drop-shadow" />
                          <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/90 text-[8px] text-white font-mono z-20">60 × 40 mm</span>
                          <div className="laser-bleed-line laser-bleed-top" style={{ top: '8px' }} />
                          <div className="laser-bleed-line laser-bleed-bottom" style={{ bottom: '8px' }} />
                          <div className="laser-bleed-line laser-bleed-left" style={{ left: '8px' }} />
                          <div className="laser-bleed-line laser-bleed-right" style={{ right: '8px' }} />
                        </div>
                      </div>
                    )}

                    {collageLayout === 'grid' && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {[1, 2, 3, 4].map((slot) => (
                          <div key={slot} className="h-32 bg-primary rounded-xl border border-subtle overflow-hidden relative group/slot shadow-sm flex items-center justify-center p-2 laser-bleed-wrapper">
                            <img src={PASSPORT_IMG} alt={`Grid slot ${slot} blur`} className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25 scale-125 pointer-events-none" />
                            <img src={PASSPORT_IMG} alt={`Grid slot ${slot}`} className="relative z-10 max-h-full max-w-full object-contain group-hover/slot:scale-105 transition-transform duration-300 drop-shadow" />
                            <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/90 text-[8px] text-white font-mono z-20">90 × 60 mm</span>
                            {slot === 1 && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 bg-white text-black text-[8px] font-mono font-extrabold rounded z-20">
                                محاذاة ذكية
                              </div>
                            )}
                            <div className="laser-bleed-line laser-bleed-top" style={{ top: '8px' }} />
                            <div className="laser-bleed-line laser-bleed-bottom" style={{ bottom: '8px' }} />
                            <div className="laser-bleed-line laser-bleed-left" style={{ left: '8px' }} />
                            <div className="laser-bleed-line laser-bleed-right" style={{ right: '8px' }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {collageLayout === 'album' && (
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        {[1, 2, 3].map((slot) => (
                          <div key={slot} className="h-44 bg-primary rounded-xl border border-subtle overflow-hidden relative group/album shadow-sm flex items-center justify-center p-2 laser-bleed-wrapper">
                            <img src={PASSPORT_IMG} alt={`Album slot ${slot} blur`} className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25 scale-125 pointer-events-none" />
                            <img src={PASSPORT_IMG} alt={`Album slot ${slot}`} className="relative z-10 max-h-full max-w-full object-contain group-hover/album:scale-105 transition-transform duration-300 drop-shadow" />
                            <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/90 text-[8px] text-white font-mono z-20">100 × 150 mm</span>
                            <div className="laser-bleed-line laser-bleed-top" style={{ top: '8px' }} />
                            <div className="laser-bleed-line laser-bleed-bottom" style={{ bottom: '8px' }} />
                            <div className="laser-bleed-line laser-bleed-left" style={{ left: '8px' }} />
                            <div className="laser-bleed-line laser-bleed-right" style={{ right: '8px' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 3. AI Restoration Pixel-Perfect Split Polygon Slider Preview */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'ai' && (
                <div className="w-full max-w-lg mx-auto space-y-4" dir="ltr">
                  {/* Instruction Bar */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-elevated border border-subtle text-xs font-mono" dir="rtl">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <MoveHorizontal className="w-4 h-4 text-white" />
                      اسحب الشريط لملاحظة الفرق الفوري:
                    </span>
                    <span className="text-[10px] font-mono text-tertiary bg-secondary px-2 py-0.5 rounded border border-subtle">
                      CodeFormer w=0.85
                    </span>
                  </div>

                  {/* Interactive Before / After Split Slider Container */}
                  <div className="bg-elevated p-4 sm:p-5 rounded-xl border border-subtle space-y-3 relative shadow-xl select-none">
                    <div className="flex items-center justify-between text-xs border-b border-subtle pb-2.5 font-mono" dir="rtl">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Wand2 className="w-4 h-4 text-white" />
                        معاينة الترميم المباشر (قبل / بعد)
                      </span>
                      <span className="text-[10px] font-mono text-white bg-primary px-2.5 py-0.5 rounded-md border border-subtle">
                        معالجة مزدوجة AI
                      </span>
                    </div>

                    {/* Interactive 100% Pixel-Aligned Split View Container */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-subtle bg-primary">
                      
                      {/* Layer 1: After Image Layer (HD Restored) - Always Positioned at Inset 0 */}
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <img
                          src={PASSPORT_IMG}
                          alt="After HD Blur BG"
                          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-125 pointer-events-none"
                        />
                        <img
                          src={PASSPORT_IMG}
                          alt="After HD"
                          className="relative z-10 max-h-full max-w-full object-contain contrast-[1.12] brightness-[1.05]"
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white text-black font-mono text-[9px] font-extrabold shadow z-30">
                          بعد (CodeFormer HD)
                        </span>
                      </div>

                      {/* Layer 2: Before Image Layer (Old/Damaged) - Clipped from the inline-start (right in RTL) */}
                      <div
                        className="absolute inset-0 flex items-center justify-center p-2 z-20 pointer-events-none"
                        style={{
                          clipPath: `polygon(${aiSplitPos}% 0, 100% 0, 100% 100%, ${aiSplitPos}% 100%)`,
                        }}
                      >
                        <img
                          src={PASSPORT_IMG}
                          alt="Before Old Blur BG"
                          className="absolute inset-0 w-full h-full object-cover blur-2xl grayscale opacity-30 scale-125 pointer-events-none"
                        />
                        <img
                          src={PASSPORT_IMG}
                          alt="Before Old"
                          className="relative z-10 max-h-full max-w-full object-contain blur-[2px] grayscale contrast-75 opacity-70"
                        />
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/90 font-mono text-[9px] font-bold text-tertiary shadow z-30">
                          قبل (صورة قديمة/تالفة)
                        </span>
                      </div>

                      {/* Center Split Drag Handle Line */}
                      <div
                        className="absolute inset-y-0 w-0.5 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,1)] z-40 pointer-events-none"
                        style={{ right: `${aiSplitPos}%` }}
                      >
                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-2xl border border-black/20">
                          <ArrowLeftRight className="w-4 h-4 text-black" />
                        </div>
                      </div>
                    </div>

                    {/* Interactive Slider Input */}
                    <div className="pt-2 flex items-center gap-3 font-mono text-xs text-tertiary" dir="rtl">
                      <span>قبل</span>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={aiSplitPos}
                        onChange={(e) => setAiSplitPos(Number(e.target.value))}
                        aria-label="المقارنة قبل وبعد الترميم بالذكاء الاصطناعي"
                        aria-valuetext={`قبل ${aiSplitPos}% / بعد ${100 - aiSplitPos}%`}
                        className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-white"
                      />
                      <span>بعد (HD)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 4. CMYK Interactive Channels Inspection Preview */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'cmyk' && (
                <div className="w-full max-w-lg mx-auto space-y-4">
                  {/* Channel Selector Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-elevated border border-subtle text-xs font-mono">
                    <span className="text-tertiary text-[10px] font-bold">قناة الألوان:</span>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        onClick={() => setCmykChannel('all')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${cmykChannel === 'all' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        CMYK كامل
                      </button>
                      <button
                        onClick={() => setCmykChannel('c')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${cmykChannel === 'c' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        سماوي (C)
                      </button>
                      <button
                        onClick={() => setCmykChannel('m')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${cmykChannel === 'm' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        أرجواني (M)
                      </button>
                      <button
                        onClick={() => setCmykChannel('y')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${cmykChannel === 'y' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        أصفر (Y)
                      </button>
                      <button
                        onClick={() => setCmykChannel('k')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${cmykChannel === 'k' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        أسود (K=100%)
                      </button>
                    </div>
                  </div>

                  {/* CMYK Preview Sheet */}
                  <div className="bg-elevated p-4 sm:p-5 rounded-xl border border-subtle space-y-3 relative shadow-xl">
                    <div className="flex items-center justify-between text-xs border-b border-subtle pb-2.5 font-mono">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-white" />
                        فاحص قنوات ألوان المطابع
                      </span>
                      <button
                        onClick={() => setShowCropMarks((v) => !v)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${showCropMarks ? 'bg-white text-black border-white' : 'text-tertiary border-subtle'}`}
                      >
                        علامات القص +3مم: {showCropMarks ? 'تشغيل' : 'إيقاف'}
                      </button>
                    </div>

                    {/* Channel Simulation Filtered Photo with Ambient Blur BG */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-subtle bg-primary flex items-center justify-center p-3 laser-bleed-wrapper">
                      <img
                        src={PASSPORT_IMG}
                        alt="CMYK Channel Blur BG"
                        className={`absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-125 pointer-events-none transition-all duration-500 ${
                          cmykChannel === 'c'
                            ? 'hue-rotate-180'
                            : cmykChannel === 'm'
                            ? 'hue-rotate-270'
                            : cmykChannel === 'y'
                            ? 'sepia-100'
                            : cmykChannel === 'k'
                            ? 'grayscale-100'
                            : ''
                        }`}
                      />
                      <img
                        src={PASSPORT_IMG}
                        alt="CMYK Channel Inspection"
                        className={`relative z-10 max-h-full max-w-full object-contain transition-all duration-500 rounded ${
                          cmykChannel === 'c'
                            ? 'hue-rotate-180 saturate-200'
                            : cmykChannel === 'm'
                            ? 'hue-rotate-270 saturate-200'
                            : cmykChannel === 'y'
                            ? 'sepia-100 saturate-200'
                            : cmykChannel === 'k'
                            ? 'grayscale-100 contrast-150'
                            : 'contrast-105'
                        }`}
                      />

                      {/* Optional Bleed & Crop Lines Overlay */}
                      {showCropMarks && (
                        <>
                          <div className="absolute inset-4 border border-dashed border-white/60 pointer-events-none flex flex-col justify-between p-1 z-20">
                            <div className="flex justify-between text-[8px] font-mono text-white">
                              <span>خط القص +3مم</span>
                              <span>امتداد K=100%</span>
                            </div>
                            <div className="flex justify-between text-[8px] font-mono text-white">
                              <span>TIFF 300DPI</span>
                              <span>جاهز للمطبعة</span>
                            </div>
                          </div>
                          
                          {/* Animated Laser Bleed Lines */}
                          <div className="laser-bleed-line laser-bleed-top" style={{ top: '16px' }} />
                          <div className="laser-bleed-line laser-bleed-bottom" style={{ bottom: '16px' }} />
                          <div className="laser-bleed-line laser-bleed-left" style={{ left: '16px' }} />
                          <div className="laser-bleed-line laser-bleed-right" style={{ right: '16px' }} />
                        </>
                      )}
                    </div>

                    <div className="space-y-2 pt-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-secondary">
                        <span>سماوي (C): 45%</span>
                        <div className="w-36 h-2 bg-secondary rounded-full border border-subtle overflow-hidden">
                          <div className="h-full bg-white/70 w-[45%]" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span>أرجواني (M): 62%</span>
                        <div className="w-36 h-2 bg-secondary rounded-full border border-subtle overflow-hidden">
                          <div className="h-full bg-white/85 w-[62%]" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span>أصفر (Y): 78%</span>
                        <div className="w-36 h-2 bg-secondary rounded-full border border-subtle overflow-hidden">
                          <div className="h-full bg-white/90 w-[78%]" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>أسود (K): 100% خالص</span>
                        <div className="w-36 h-2 bg-secondary rounded-full border border-white overflow-hidden">
                          <div className="h-full bg-white w-[100%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                {/* Vertical Tool Rail (على حافة الكانفاس) */}
                <aside className="hidden sm:flex flex-col items-center gap-1 p-2 border-s border-subtle bg-elevated/70 shrink-0" aria-label="شريط الأدوات">
                  {TOOLS.map((tool) => {
                    const ToolIcon = tool.icon;
                    return (
                      <button
                        key={tool.label}
                        type="button"
                        aria-label={tool.label}
                        title={tool.label}
                        className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                          tool.active ? 'bg-white text-black' : 'text-tertiary hover:bg-elevated hover:text-white'
                        }`}
                      >
                        <ToolIcon className="w-4 h-4" />
                      </button>
                    );
                  })}
                  <span className="w-6 h-px bg-white/10 my-1" aria-hidden />
                  <button
                    type="button"
                    aria-label="تكبير العرض"
                    title="تكبير العرض"
                    className="w-8 h-8 flex items-center justify-center rounded-md text-tertiary hover:bg-elevated hover:text-white transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </aside>
              </div>

              {/* Workspace Bottom Status Bar */}
              <div className="h-7 shrink-0 bg-elevated/90 border-t border-subtle flex items-center justify-between px-3 sm:px-4 text-[9px] font-mono text-tertiary relative z-10">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
                  توليد تلقائي مفعّل
                </span>
                <span className="flex items-center gap-3" dir="ltr">
                  <span className="hidden sm:inline">X: 210مم</span>
                  <span className="hidden sm:inline">Y: 297مم</span>
                  <span>Zoom 100%</span>
                </span>
              </div>
            </div>

            {/* Feature Description & Big System Metric (5 Cols) */}
            <div className="lg:col-span-5 space-y-6 text-right ps-0 lg:ps-4 relative z-10">
              {/* System Badge */}
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-elevated border border-subtle text-white text-xs font-bold">
                <Sliders className="w-3.5 h-3.5 text-white" />
                <span>{content.badge}</span>
              </span>

              {/* Title */}
              <h3 className="text-2xl sm:text-4xl font-black font-display text-white leading-tight">
                {content.title}
              </h3>

              {/* Big System Metric — مرساة بصرية تُقرأ قبل أي نص */}
              <div className="border-y border-subtle py-6">
                <div className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                  {content.metric.value}
                </div>
                <div className="mt-1.5 text-xs sm:text-sm font-bold text-tertiary">
                  {content.metric.label}
                </div>
              </div>

              {/* One-Line Punch */}
              <p className="text-secondary text-sm sm:text-base font-sans leading-relaxed font-medium">
                {content.punch}
              </p>

              {/* Bullet Points */}
              <ul className="space-y-3.5">
                {content.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-xs sm:text-sm font-bold text-white">
                    <div className="p-1 rounded-full bg-elevated border border-subtle text-white shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
