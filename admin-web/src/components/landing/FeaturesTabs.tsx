import { useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  Printer,
  MoveHorizontal,
  Wand2,
  Scan,
  Grid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

type TabId = 'id' | 'collage' | 'ai' | 'cmyk';

interface TabItem {
  id: TabId;
  label: string;
  badge?: string;
  icon: LucideIcon;
}

const TABS: TabItem[] = [
  { id: 'id', label: 'صور الهوية والفيزا', badge: '3 ثوانٍ', icon: Scan },
  { id: 'collage', label: 'مصمم الكولاج والشبكات', badge: 'ديناميكي', icon: Grid },
  { id: 'ai', label: 'ترميم الوجه وعزل الخلفية', badge: 'CodeFormer', icon: Wand2 },
  { id: 'cmyk', label: 'محرك ألوان المطابع CMYK', badge: '300 DPI', icon: Printer },
];

const TAB_CONTENT: Record<
  TabId,
  {
    title: string;
    punch: string;
    metric: { value: string; label: string };
    points: string[];
  }
> = {
  id: {
    title: 'تنسيق صور المعاملات وجوازات السفر في 3 ثوانٍ',
    punch: 'تحديد فوري للمقاسات الرسمية (40×32 ملم، 35×45 ملم، والفيزا) مع تثبيت أبعاد الرأس والأكتاف وفقاً لمعايير ICAO الدولية بدون أي تشويه.',
    metric: { value: '3 ثوانٍ', label: 'زمن تجهيز ورقة المعاملات الكاملة' },
    points: [
      'ضبط بيومتري تلقائي لمحاذاة العينين والأنف والذقن',
      'توزيع ذكي على أوراق A4 و 10×15 و 13×18 بدون أي هدر',
      'توليد تلقائي لعلامات القص والتقصي السريع',
    ],
  },
  collage: {
    title: 'مصمم كولاج ذكي وشبكات طباعة احترافية',
    punch: 'صمم شبكات كولاج متقدمة، ألبومات عريضة، وبوسترات مجمعة بحرية كاملة مع دعم التبديل التلقائي وإعادة التوزيع الفوري للصور بنقرة واحدة.',
    metric: { value: '0% هدر', label: 'استغلال مساحة الورقة بالكامل' },
    points: [
      'قوالب ديناميكية تتكيف مع عدد الصور المرفوعة',
      'تحكم كامل في المسافات الهامشية واستدارة الحواف',
      'معالجة مجمعة وتحسين كافة الصور دفعة واحدة',
    ],
  },
  ai: {
    title: 'ترميم الملامح بالذكاء الاصطناعي مع حفظ مسام البشرة',
    punch: 'مسار معالجة مزدوج يدمج CodeFormer مع Real-ESRGAN بنسبة دمج مدروسة (65% وجه مرمم + 35% مسام أصلية) لمنع الوجه الشمعي الكارتوني.',
    metric: { value: '4K HD', label: 'وضوح فائق لملامح الوجه والعيون' },
    points: [
      'استعادة الصور القديمة والتالفة من الهواتف القديمة',
      'عزل ذكي للخلفية وتطبيق اللون الأبيض أو الأزرق الرسمي',
      'إصلاح فوري للظلال القوية واختلال توازن الإضاءة',
    ],
  },
  cmyk: {
    title: 'محرك ألوان المطابع الحقيقي CMYK بدقة 300 DPI',
    punch: 'تصدير بصيغ TIFF و High-JPEG الجاهزة للطباعة فوراً مع فرض الأسود الخالص (K=100%) على خطوط القص لتفادي تلطخ الحواف عند التقطيع.',
    metric: { value: '300 DPI', label: 'دقة طباعة تجارية حقيقية' },
    points: [
      'مطابقة كاملة لملف الألوان القياسي Coated FOGRA39',
      'علامات تسجيل ليزرية للمطابع والمعامل التجارية',
      'متوافق مع طابعات Epson, Canon, DNP, Noritsu',
    ],
  },
};

const PASSPORT_IMG = '/biometric-cutout-blend.jpg';
const CMYK_PHOTO = '/cmyk-print-lab-macro.jpg';
const STUDIO_CUTTER_SHEET = '/studio-cutter-sheet.jpg';

export function FeaturesTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('id');
  const [idBgColor, setIdBgColor] = useState<'white' | 'blue' | 'gray'>('white');
  const [idPaperSize, setIdPaperSize] = useState<'A4' | '10x15'>('A4');
  const [collageLayout, setCollageLayout] = useState<'hero' | 'grid' | 'album'>('hero');
  const [aiSplitPos, setAiSplitPos] = useState<number>(55);
  const [cmykChannel, setCmykChannel] = useState<'all' | 'c' | 'm' | 'y' | 'k'>('all');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);

  const content = TAB_CONTENT[activeTab];

  const getBgStyle = () => {
    switch (idBgColor) {
      case 'blue': return 'bg-[#1d4ed8]';
      case 'gray': return 'bg-[#4b5563]';
      default: return 'bg-[#ffffff]';
    }
  };

  return (
    <section id="features" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="الأدوات والوظائف"
          title="أدوات استوديو متكاملة في بيئة عمل موحدة"
          subtitle="صُمم كل جزء في البرنامج ليخدم السرعة والدقة الفائقة التي يحتاجها أصحاب الاستوديوهات والمطابع يومياً."
          index="02"
        />

        {/* Tab Navigation Ribbon */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div
            role="tablist"
            aria-label="أدوات المحرر الرئيسية"
            className="p-1 rounded-full bg-[#191b1e] border border-[rgba(214,235,253,0.19)] flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-mono transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#000000] text-[#f0f0f0] border border-[rgba(214,235,253,0.19)]'
                      : 'text-[#a1a4a5] hover:text-[#f0f0f0]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00a3ff]' : 'text-[#a1a4a5]'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive
                          ? 'bg-[#00a3ff] text-white'
                          : 'bg-[#000000] text-[#a1a4a5] border border-[rgba(214,235,253,0.19)]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Editorial Feature Pitch */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)]">
            <div className="space-y-4">
              <span className="resend-badge font-mono">
                {TABS.find((t) => t.id === activeTab)?.label}
              </span>

              <h3 className="text-2xl sm:text-3xl font-normal font-serif text-[#f0f0f0] leading-snug">
                {content.title}
              </h3>

              <p className="text-sm text-[#a1a4a5] leading-relaxed">
                {content.punch}
              </p>

              <div className="space-y-2.5 pt-2">
                {content.points.map((point) => (
                  <div key={point} className="flex items-start gap-2.5 text-sm text-[#f0f0f0]">
                    <CheckCircle2 className="w-4 h-4 text-[#00a3ff] shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metric Card */}
            <div className="mt-8 pt-6 border-t border-[rgba(214,235,253,0.1)] flex items-center justify-between">
              <div>
                <div className="text-3xl sm:text-4xl font-normal font-serif text-[#f0f0f0] tracking-tight">
                  {content.metric.value}
                </div>
                <div className="text-xs text-[#a1a4a5] mt-0.5">
                  {content.metric.label}
                </div>
              </div>
              <span className="resend-badge font-mono">
                جاهز فوراً
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Preview Canvas */}
          <div className="lg:col-span-7 rounded-lg bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
            
            {/* TAB 1: ID PHOTOS PREVIEW WITH PRECISION BIOMETRIC SVG OVERLAYS */}
            {activeTab === 'id' && (
              <div className="space-y-4">
                {/* Controls toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#a1a4a5]">الخلفية:</span>
                    <div className="flex items-center gap-1.5 p-1 rounded-md bg-[#191b1e] border border-[rgba(214,235,253,0.19)]">
                      <button
                        onClick={() => setIdBgColor('white')}
                        className={`w-4 h-4 rounded bg-white cursor-pointer transition-all ${idBgColor === 'white' ? 'ring-2 ring-[#00a3ff]' : 'opacity-70'}`}
                        title="أبيض"
                      />
                      <button
                        onClick={() => setIdBgColor('blue')}
                        className={`w-4 h-4 rounded bg-[#1d4ed8] cursor-pointer transition-all ${idBgColor === 'blue' ? 'ring-2 ring-[#00a3ff]' : 'opacity-70'}`}
                        title="أزرق"
                      />
                      <button
                        onClick={() => setIdBgColor('gray')}
                        className={`w-4 h-4 rounded bg-[#4b5563] cursor-pointer transition-all ${idBgColor === 'gray' ? 'ring-2 ring-[#00a3ff]' : 'opacity-70'}`}
                        title="رمادي"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#a1a4a5]">الورقة:</span>
                    <div className="flex p-0.5 rounded-md bg-[#191b1e] border border-[rgba(214,235,253,0.19)]">
                      <button
                        onClick={() => setIdPaperSize('A4')}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${idPaperSize === 'A4' ? 'bg-[#00a3ff] text-white' : 'text-[#a1a4a5]'}`}
                      >
                        A4
                      </button>
                      <button
                        onClick={() => setIdPaperSize('10x15')}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${idPaperSize === '10x15' ? 'bg-[#00a3ff] text-white' : 'text-[#a1a4a5]'}`}
                      >
                        10×15
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simulated Sheet Canvas with Vector Laser Cutmarks & ICAO Crosshairs */}
                <div className="relative rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] p-4 sm:p-5 flex items-center justify-center min-h-[300px]">
                  <div className={`grid ${idPaperSize === 'A4' ? 'grid-cols-4' : 'grid-cols-2'} gap-2.5 max-w-md w-full bg-white p-3 rounded shadow-lg relative`}>
                    {/* SVG Corner Crop Target */}
                    <svg className="absolute -top-2 -start-2 w-4 h-4 pointer-events-none text-black" viewBox="0 0 16 16">
                      <path d="M0 8h6M8 0v6M8 10v6M10 8h6" stroke="currentColor" strokeWidth="1" />
                    </svg>

                    {Array.from({ length: idPaperSize === 'A4' ? 8 : 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded overflow-hidden aspect-[3/4] ${getBgStyle()} border border-neutral-300 flex items-center justify-center p-0.5`}
                      >
                        <img
                          src={PASSPORT_IMG}
                          alt="Passport Photo Preview"
                          className="w-full h-full object-cover"
                        />

                        {/* First Slot SVG Biometric Calibration HUD */}
                        {idx === 0 && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-[#00a3ff]" viewBox="0 0 100 133" fill="none">
                            {/* Head Crown Guide */}
                            <line x1="20" y1="22" x2="80" y2="22" strokeWidth="0.8" strokeDasharray="2 2" />
                            {/* Eye Axis with crosshair */}
                            <line x1="15" y1="48" x2="85" y2="48" strokeWidth="0.8" />
                            <circle cx="38" cy="48" r="3" strokeWidth="0.8" />
                            <circle cx="62" cy="48" r="3" strokeWidth="0.8" />
                            {/* Nose Centerline */}
                            <line x1="50" y1="35" x2="50" y2="85" strokeWidth="0.8" strokeDasharray="2 2" />
                            {/* Chin baseline */}
                            <line x1="25" y1="88" x2="75" y2="88" strokeWidth="0.8" />
                            {/* Head Oval */}
                            <ellipse cx="50" cy="54" rx="26" ry="34" strokeWidth="0.8" strokeDasharray="3 2" />
                          </svg>
                        )}

                        <span className="absolute bottom-0.5 inset-x-0 bg-black/85 text-[7px] font-mono text-center text-white py-0.5">
                          40×32 ملم
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SMART COLLAGE PREVIEW WITH WORKBENCH SHEET */}
            {activeTab === 'collage' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)]">
                  <span className="text-xs text-[#a1a4a5]">طريقة العرض:</span>
                  <div className="flex p-0.5 rounded-md bg-[#191b1e] border border-[rgba(214,235,253,0.19)]">
                    {(['hero', 'grid', 'album'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setCollageLayout(mode)}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                          collageLayout === mode ? 'bg-[#00a3ff] text-white' : 'text-[#a1a4a5]'
                        }`}
                      >
                        {mode === 'hero' ? 'طاولة القص الفعلية' : mode === 'grid' ? 'شبكي متساوٍ' : 'ألبوم عريض'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] overflow-hidden min-h-[300px] flex items-center justify-center p-2">
                  {collageLayout === 'hero' && (
                    <div className="relative w-full h-[320px] rounded overflow-hidden">
                      <img src={STUDIO_CUTTER_SHEET} alt="Studio Paper Cutter Workbench" className="w-full h-full object-cover rounded" />
                      <div className="absolute bottom-3 start-3 bg-black/85 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded text-xs font-mono text-[#f0f0f0]">
                        دقة التقطيع بالمليمتر: <span className="text-[#00a3ff]">±0.00 mm Zero Error</span>
                      </div>
                    </div>
                  )}

                  {collageLayout === 'grid' && (
                    <div className="grid grid-cols-3 gap-2.5 max-w-md w-full">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-2 aspect-square relative overflow-hidden">
                          <img src={PASSPORT_IMG} alt={`Grid ${i}`} className="w-full h-full object-cover rounded opacity-80" />
                          <span className="absolute bottom-1 start-1 bg-black/80 text-[8px] font-mono text-white px-1 rounded">
                            خلايا متساوية
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {collageLayout === 'album' && (
                    <div className="grid grid-cols-2 gap-3 max-w-md w-full">
                      <div className="rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-3 aspect-[3/4] relative overflow-hidden flex flex-col justify-end">
                        <img src={PASSPORT_IMG} alt="Left page" className="w-full h-full object-cover rounded opacity-85 absolute inset-0" />
                        <span className="relative z-10 bg-black/85 text-[10px] font-mono text-[#00a3ff] px-2 py-1 rounded">
                          صفحة اليمين (A4)
                        </span>
                      </div>
                      <div className="rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-3 aspect-[3/4] relative overflow-hidden flex flex-col justify-end">
                        <img src={PASSPORT_IMG} alt="Right page" className="w-full h-full object-cover rounded opacity-85 absolute inset-0" />
                        <span className="relative z-10 bg-black/85 text-[10px] font-mono text-[#a1a4a5] px-2 py-1 rounded">
                          صفحة اليسار (A4)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: AI RESTORATION PREVIEW WITH INTERACTIVE LOUPE */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] text-xs">
                  <span className="text-[#a1a4a5] flex items-center gap-1.5 font-mono">
                    <Sliders className="w-3.5 h-3.5 text-[#00a3ff]" />
                    معاينة استعادة الملامح الطبيعية:
                  </span>
                  <span className="font-mono text-[#00a3ff] px-2 py-0.5 rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)]">
                    {aiSplitPos}% دقة HD
                  </span>
                </div>

                <div className="relative rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] overflow-hidden select-none min-h-[300px] flex items-center justify-center p-4">
                  <div className="relative w-full max-w-xs aspect-[3/4] rounded overflow-hidden border border-[rgba(214,235,253,0.19)] shadow-2xl">
                    {/* Restored Base */}
                    <img
                      src={PASSPORT_IMG}
                      alt="AI Restored High Quality"
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Raw Layer Clipped */}
                    <div
                      className="absolute inset-0 overflow-hidden border-e border-[#00a3ff]"
                      style={{ width: `${aiSplitPos}%` }}
                    >
                      <img
                        src={PASSPORT_IMG}
                        alt="Raw Blur"
                        className="absolute inset-0 w-full h-full object-cover filter contrast-75 brightness-90 blur-[1px] grayscale-[35%]"
                        style={{ width: '100%', minWidth: '320px' }}
                      />
                      <span className="absolute top-2 start-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-[#a1a4a5] border border-[rgba(214,235,253,0.19)]">
                        الأصلية (قبل)
                      </span>
                    </div>

                    {/* Split Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#00a3ff] pointer-events-none"
                      style={{ left: `${aiSplitPos}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#000000] border-2 border-[#00a3ff] flex items-center justify-center shadow-lg">
                        <MoveHorizontal className="w-3 h-3 text-[#00a3ff]" />
                      </div>
                    </div>

                    <span className="absolute bottom-2 end-2 px-2 py-0.5 rounded bg-[#00a3ff] text-[10px] font-mono text-white">
                      مُرممة (65/35)
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="5"
                  max="95"
                  value={aiSplitPos}
                  onChange={(e) => setAiSplitPos(Number(e.target.value))}
                  className="w-full h-1 bg-[#000000] rounded appearance-none cursor-pointer accent-[#00a3ff]"
                  aria-label="مقارنة الترميم"
                />
              </div>
            )}

            {/* TAB 4: CMYK PRINT ENGINE WITH AUTHENTIC MACRO PRINT-LAB PHOTOGRAPHY */}
            {activeTab === 'cmyk' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#a1a4a5]">قناة اللون:</span>
                    <div className="flex p-0.5 rounded-md bg-[#191b1e] border border-[rgba(214,235,253,0.19)]">
                      {(['all', 'c', 'm', 'y', 'k'] as const).map((ch) => (
                        <button
                          key={ch}
                          onClick={() => setCmykChannel(ch)}
                          className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors cursor-pointer ${
                            cmykChannel === ch ? 'bg-[#00a3ff] text-white' : 'text-[#a1a4a5]'
                          }`}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCropMarks((v) => !v)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                      showCropMarks ? 'bg-[#00a3ff]/20 text-[#00a3ff] border border-[#00a3ff]/40' : 'bg-[#191b1e] text-[#a1a4a5]'
                    }`}
                  >
                    {showCropMarks ? '✓ علامات تسجيل الألوان نشطة' : 'علامات التسجيل معطلة'}
                  </button>
                </div>

                {/* Macro Photographic Print Lab Frame */}
                <div className="relative rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] overflow-hidden min-h-[300px] flex items-center justify-center">
                  <img
                    src={CMYK_PHOTO}
                    alt="CMYK Print Lab Macro Proof"
                    className="w-full h-full object-cover max-h-[340px]"
                  />

                  {/* Laser Registration Calibration HUD Overlay */}
                  {showCropMarks && (
                    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="bg-[#000000]/80 backdrop-blur-sm border border-[#00a3ff]/40 px-2.5 py-1 rounded text-[10px] font-mono text-[#f0f0f0]">
                          PROFILE: <strong className="text-[#00a3ff]">Coated FOGRA39</strong>
                        </div>
                        <div className="bg-[#00a3ff] text-white px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                          300 DPI READY
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-[#a1a4a5]">
                        <div className="bg-[#000000]/80 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
                          CUT LINES: <span className="text-[#00a3ff]">K=100% Pure Black</span>
                        </div>
                        <div className="bg-[#000000]/80 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
                          REGISTRATION: <span className="text-[#00a3ff]">±0.05 mm Precision</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}

