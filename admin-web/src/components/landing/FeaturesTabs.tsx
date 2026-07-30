import { useState } from 'react';
import { Crop, LayoutGrid, Wand2, Printer, CheckCircle2, ArrowLeftRight, Sliders, ShieldCheck, Sparkles, MoveHorizontal } from 'lucide-react';

type TabId = 'id' | 'collage' | 'ai' | 'cmyk';

const TABS: { id: TabId; label: string; icon: typeof Crop }[] = [
  { id: 'id', label: 'صور الهوية والرسميات', icon: Crop },
  { id: 'collage', label: 'تصميم الكولاج والشبكات', icon: LayoutGrid },
  { id: 'ai', label: 'ترميم الوجوه (AI)', icon: Wand2 },
  { id: 'cmyk', label: 'ألوان المطابع (CMYK)', icon: Printer },
];

const TAB_CONTENT: Record<
  TabId,
  {
    badge: string;
    title: string;
    description: string;
    points: string[];
  }
> = {
  id: {
    badge: 'توليد تلقائي 40×32 / 35×45 / فيزا',
    title: 'قص وتوسيط الصورة بنقرة واحدة',
    description:
      'تعرّف تلقائي على الوجه والأكتاف وتوسيط الصورة وفق المعايير الرسمية، مع تغيير الخلفيات فورياً بدون قص يدوي معقد.',
    points: [
      'توسيط ذكي بالذكاء الاصطناعي مع تثبيت النسب الرسمية',
      'خلفيات رسمية موحدة بنقرة واحدة (أبيض، أزرق، رمادي)',
      'تجهيز الورقة للطباعة الفورية (A4, 10×15 ملم)',
    ],
  },
  collage: {
    badge: 'تنسيق شبكي محترف (Dynamic Collage)',
    title: 'قوالب كولاج ديناميكية قابلة للتخصيص',
    description:
      'تنسيق ألبومات وكروت ومجموعات صور بسهولة، مع تحكم كامل بالمسافات والأبعاد وحساب المساطر التلقائي.',
    points: [
      'دعم السحب والإسقاط مع استنباط الأبعاد الفوري',
      'محاذاة الكائنات ومساطر الشاشة الذكية (Figma-like)',
      'توزيع تلقائي يمنع هدر أوراق الطباعة بنسبة 100%',
    ],
  },
  ai: {
    badge: 'محرك CodeFormer + Real-ESRGAN',
    title: 'استعادة تفاصيل الوجه وضبط الإضاءة',
    description:
      'ترميم الصور القديمة وضبط الظلال والإضاءة محلياً، مع الحفاظ التام على ملامح الشخصية الأصلية بدون تأثير شمعي.',
    points: [
      'معالجة مزدوجة Dual-Pipeline مخصصة لصور الهوية',
      'تحسين الإضاءة التلقائي ورسم تفاصيل المسام (CLAHE)',
      'عمل محلي 100% بدون إرسال الصور لخوادم خارجية',
    ],
  },
  cmyk: {
    badge: 'تصدير CMYK للمطابع التجارية',
    title: 'نمط ألوان CMYK والأسود الخالص (K=100%)',
    description:
      'تحويل دقيق إلى CMYK يضمن تطابق ألوان الشاشة مع المطبوعات وفرض الأسود الخالص على خطوط القص لتفادي التلطخ.',
    points: [
      'تحويل ألوان مطابع حقيقي ومطابقة بروفات الطباعة',
      'تصدير بصيغ عالية الدقة (TIFF & High-JPEG 300DPI)',
      'فرض K=100% لعلامات وخطوط أسياخ التقصي',
    ],
  },
};

const PASSPORT_IMG = '/sample-passport.png';

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
    <section id="features" className="relative py-16 sm:py-24 lg:py-28 border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-16 relative z-20">
          <span className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-subtle bg-elevated text-xs font-mono font-bold text-secondary tracking-[2px] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>المميزات الرئيسية</span>
          </span>
          <h2 className="stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white uppercase leading-tight">
            استكشف قوة <span className="text-secondary">GRIDO STUDIO</span>
          </h2>
          <p className="stagger-3 mt-4 text-secondary text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">
            أدوات الذكاء الاصطناعي والأتمتة لتضاعف إنتاجية استوديوهات التصوير.
          </p>
        </div>

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
                  className={`px-5 py-2.5 rounded-full font-mono font-extrabold text-xs sm:text-sm uppercase tracking-[1px] transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
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
          <div className="h-10 sm:h-14 bg-elevated/90 border-b border-subtle px-4 sm:px-6 flex items-center justify-between text-xs text-tertiary relative z-10 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
              <span className="mr-3 font-mono text-[10px] sm:text-[11px] text-secondary font-bold hidden sm:inline tracking-[1px] uppercase" dir="ltr">
                GRIDO STUDIO WORKSPACE — {content.badge}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono uppercase tracking-[1px]">
              <span className="hidden md:flex items-center px-3 py-1 rounded-md bg-secondary border border-subtle text-secondary font-bold">
                {idPaperSize === 'A4' ? 'A4 (210 × 297 mm)' : '10 × 15 cm'}
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
            {/* Visual Interactive Preview Column Card (7 Cols) */}
            <div className="lg:col-span-7 bg-secondary rounded-xl border border-subtle p-3 sm:p-5 relative overflow-hidden min-h-[380px] sm:min-h-[440px] flex items-center justify-center group">
              
              {/* Studio Canvas Ruler Markers Overlay */}
              <div className="absolute top-0 inset-x-0 h-5 bg-[#141414] border-b border-subtle flex items-center justify-between px-6 text-[8px] font-mono text-tertiary select-none pointer-events-none z-20">
                <span>0mm</span>
                <span>50mm</span>
                <span>100mm</span>
                <span>150mm</span>
                <span>210mm</span>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* 1. ID Photos Interactive Studio Sheet Preview */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'id' && (
                <div className="w-full max-w-lg pt-4 space-y-4">
                  {/* Interactive Control Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-elevated border border-subtle text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-tertiary text-[10px] font-bold uppercase">الخلفية الموحدة:</span>
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
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${idPaperSize === 'A4' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        ورقة A4 (8 صور)
                      </button>
                      <button
                        onClick={() => setIdPaperSize('10x15')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${idPaperSize === '10x15' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        10×15 سم (4 صور)
                      </button>
                    </div>
                  </div>

                  {/* Studio Canvas Paper Sheet */}
                  <div className="bg-elevated p-4 sm:p-5 rounded-xl border border-subtle shadow-xl space-y-3 relative">
                    <div className="flex items-center justify-between text-xs border-b border-subtle pb-2.5 font-mono">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-white" />
                        ورقة طباعة معاملات {idPaperSize}
                      </span>
                      <span className="text-[10px] font-mono text-white bg-primary px-2.5 py-0.5 rounded-md border border-subtle">
                        40 × 32 mm • 300DPI
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
                            className="w-full h-full object-contain transition-transform duration-300 group-hover/img:scale-105"
                          />

                          {/* Dimension Overlay */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/90 text-[7px] font-mono text-center text-white py-0.5 font-bold">
                            40 × 32 mm
                          </div>

                          {/* Auto Crop Guide box overlay on 1st photo slot */}
                          {n === 1 && (
                            <div className="absolute inset-1 border border-dashed border-white rounded pointer-events-none flex items-center justify-center">
                              <span className="bg-white text-black text-[7px] font-mono font-extrabold px-1 py-0.5 uppercase rounded shadow">
                                Auto Center
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
                <div className="w-full max-w-lg pt-4 space-y-4">
                  {/* Layout Preset Selector Buttons */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-elevated border border-subtle text-xs font-mono">
                    <span className="text-tertiary text-[10px] font-bold uppercase px-1">تخطيط الكولاج:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCollageLayout('hero')}
                        className={`px-3 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${collageLayout === 'hero' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        رئيسية HERO + 2
                      </button>
                      <button
                        onClick={() => setCollageLayout('grid')}
                        className={`px-3 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${collageLayout === 'grid' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        شبكة 4X4 متساوية
                      </button>
                      <button
                        onClick={() => setCollageLayout('album')}
                        className={`px-3 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${collageLayout === 'album' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
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
                        تنسيق شبكي ديناميكي (Dynamic Grid)
                      </span>
                      <span className="text-[10px] font-mono text-white bg-secondary px-2.5 py-0.5 rounded-md border border-subtle">
                        Gap: 3.5mm • Margin: 5mm
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
                          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-white text-black text-[9px] font-mono font-extrabold uppercase z-20">
                            HERO SLOT (120 × 80 MM)
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
                                Snap Align
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
                <div className="w-full max-w-lg pt-4 space-y-4" dir="ltr">
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
                        معاينة الترميم المباشر (Before vs After)
                      </span>
                      <span className="text-[10px] font-mono text-white bg-primary px-2.5 py-0.5 rounded-md border border-subtle">
                        Dual-Pipeline AI
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
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white text-black font-mono text-[9px] font-extrabold uppercase shadow z-30">
                          بعد (CodeFormer HD)
                        </span>
                      </div>

                      {/* Layer 2: Before Image Layer (Old/Damaged) - Exactly Identical Coordinates, Clipped by Polygon */}
                      <div
                        className="absolute inset-0 flex items-center justify-center p-2 z-20 pointer-events-none"
                        style={{
                          clipPath: `polygon(0 0, ${aiSplitPos}% 0, ${aiSplitPos}% 100%, 0 100%)`,
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
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/90 font-mono text-[9px] font-bold text-tertiary uppercase shadow z-30">
                          قبل (صورة قديمة/تالفة)
                        </span>
                      </div>

                      {/* Center Split Drag Handle Line */}
                      <div
                        className="absolute inset-y-0 w-0.5 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,1)] z-40 pointer-events-none"
                        style={{ left: `${aiSplitPos}%` }}
                      >
                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-2xl border border-black/20">
                          <ArrowLeftRight className="w-4 h-4 text-black" />
                        </div>
                      </div>
                    </div>

                    {/* Interactive Slider Input */}
                    <div className="pt-2 flex items-center gap-3 font-mono text-xs text-tertiary" dir="rtl">
                      <span>قبل (Old)</span>
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
                <div className="w-full max-w-lg pt-4 space-y-4">
                  {/* Channel Selector Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-elevated border border-subtle text-xs font-mono">
                    <span className="text-tertiary text-[10px] font-bold uppercase">قناة الألوان:</span>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        onClick={() => setCmykChannel('all')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${cmykChannel === 'all' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        CMYK كامل
                      </button>
                      <button
                        onClick={() => setCmykChannel('c')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${cmykChannel === 'c' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        Cyan (C)
                      </button>
                      <button
                        onClick={() => setCmykChannel('m')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${cmykChannel === 'm' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        Magenta (M)
                      </button>
                      <button
                        onClick={() => setCmykChannel('y')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${cmykChannel === 'y' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        Yellow (Y)
                      </button>
                      <button
                        onClick={() => setCmykChannel('k')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-colors ${cmykChannel === 'k' ? 'bg-white text-black' : 'text-tertiary hover:text-white'}`}
                      >
                        Key (K=100%)
                      </button>
                    </div>
                  </div>

                  {/* CMYK Preview Sheet */}
                  <div className="bg-elevated p-4 sm:p-5 rounded-xl border border-subtle space-y-3 relative shadow-xl">
                    <div className="flex items-center justify-between text-xs border-b border-subtle pb-2.5 font-mono">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-white" />
                        فاحص قنوات ألوان المطابع (CMYK Inspection)
                      </span>
                      <button
                        onClick={() => setShowCropMarks((v) => !v)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${showCropMarks ? 'bg-white text-black border-white' : 'text-tertiary border-subtle'}`}
                      >
                        +3mm Bleed Marks: {showCropMarks ? 'ON' : 'OFF'}
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
                              <span>+3mm Crop Line</span>
                              <span>K=100% Bleed</span>
                            </div>
                            <div className="flex justify-between text-[8px] font-mono text-white">
                              <span>TIFF 300DPI</span>
                              <span>Press Ready</span>
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
                        <span>Cyan (C): 45%</span>
                        <div className="w-36 h-2 bg-secondary rounded-full border border-subtle overflow-hidden">
                          <div className="h-full bg-white/70 w-[45%]" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span>Magenta (M): 62%</span>
                        <div className="w-36 h-2 bg-secondary rounded-full border border-subtle overflow-hidden">
                          <div className="h-full bg-white/85 w-[62%]" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span>Yellow (Y): 78%</span>
                        <div className="w-36 h-2 bg-secondary rounded-full border border-subtle overflow-hidden">
                          <div className="h-full bg-white/90 w-[78%]" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>Key (K): 100% (Pure Black)</span>
                        <div className="w-36 h-2 bg-secondary rounded-full border border-white overflow-hidden">
                          <div className="h-full bg-white w-[100%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Description & Bullet Highlights (5 Cols) */}
            <div className="lg:col-span-5 space-y-6 text-right pr-0 lg:pr-4 relative z-10">
              {/* System Badge */}
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-elevated border border-subtle text-white text-xs font-mono font-bold uppercase tracking-[1px]">
                  <Sliders className="w-3.5 h-3.5 text-white" />
                  <span>{content.badge}</span>
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h3 className="text-2xl sm:text-4xl font-black font-display text-white leading-tight">
                  {content.title}
                </h3>
                <p className="text-secondary text-sm sm:text-base font-sans leading-relaxed font-medium">
                  {content.description}
                </p>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-3.5 pt-4 border-t border-subtle">
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
