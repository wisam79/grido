import { useState } from 'react';
import { Crop, LayoutGrid, Wand2, Printer, CheckCircle2, ArrowLeftRight, Sliders, ShieldCheck, Sparkles } from 'lucide-react';
import { CMYK3DStack } from './Embedded3D';

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
    accentColor: string;
  }
> = {
  id: {
    badge: 'توليد تلقائي 40×32 / 35×45 / فيزا',
    title: 'قص وتوسيط الصورة بنقرة واحدة',
    description:
      'تعرّف تلقائي على الوجه والأكتاف وتوسيط الصورة وفق المعايير الرسمية، مع تغيير الخلفيات فورياً بدون قص يدوية معقدة.',
    points: [
      'توسيط ذكي بالذكاء الاصطناعي مع تثبيت النسب',
      'خلفيات رسمية موحدة بنقرة واحدة (أبيض، أزرق، رمادي)',
      'تجهيز الورقة للطباعة الفورية (A4, 10×15 ملم)',
    ],
    accentColor: 'from-blue-500 to-brand-500',
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
    accentColor: 'from-sky-500 to-blue-600',
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
    accentColor: 'from-indigo-500 to-blue-500',
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
    accentColor: 'from-cyan-500 to-brand-500',
  },
};

const PASSPORT_IMG = '/sample-passport.png';

export function FeaturesTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('collage');
  const content = TAB_CONTENT[activeTab];

  return (
    <section id="features" className="relative py-16 sm:py-24 lg:py-28 border-t border-[#383842] bg-[#121214] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-16 relative z-20">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none border border-[#383842] bg-[#1a1a1e] text-xs font-mono font-bold text-[#f0f0fa] tracking-[2px] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>المميزات الرئيسية</span>
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight uppercase leading-tight">
            استكشف قوة <span className="text-[#f0f0fa]">GRIDO STUDIO</span>
          </h2>
          <p className="mt-4 text-[#f0f0fa] text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">
            أدوات الذكاء الاصطناعي والأتمتة لتضاعف إنتاجية استوديوهات التصوير.
          </p>
        </div>

        {/* SpaceX Sharp Tabs */}
        <div className="flex justify-center mb-8 sm:mb-16 relative z-20">
          <div className="p-1 rounded-none bg-[#1a1a1e] border border-[#383842] flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto justify-start sm:justify-center">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 sm:px-6 sm:py-3.5 rounded-none font-bold text-xs sm:text-sm uppercase tracking-[1px] transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-black font-extrabold'
                      : 'text-[#999999] hover:text-white hover:bg-[#24242c]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-black' : 'text-[#999999]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Studio Canvas App Window Frame */}
        <div className="relative overflow-hidden rounded-none bg-[#1a1a1e] border border-[#383842] group/window">
          {/* Top Window Bar (Chrome UI) */}
          <div className="h-10 sm:h-14 bg-[#24242c] border-b border-[#383842] px-4 sm:px-6 flex items-center justify-between text-xs text-[#999999] relative z-10 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
              <span className="mr-3 font-mono text-[10px] sm:text-[11px] text-[#f0f0fa] font-bold hidden sm:inline tracking-[1px] uppercase">
                Grido Studio WorkSpace — {content.badge}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono uppercase tracking-[1px]">
              <span className="hidden md:flex items-center px-2.5 py-1 rounded-none bg-[#121214] border border-[#383842] text-[#f0f0fa]">
                A4 (210 × 297 mm)
              </span>
              <span className="flex items-center px-2.5 py-1 rounded-none bg-white text-black font-bold">
                300 DPI
              </span>
            </div>
          </div>

          {/* Main Grid Content */}
          <div className="p-4 sm:p-10 grid lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Visual Interactive Preview Column (7 Cols) */}
            <div className="lg:col-span-7 bg-[#121214] rounded-none border border-[#383842] p-3 sm:p-5 relative overflow-hidden min-h-[260px] sm:min-h-[340px] flex items-center justify-center group">
              {/* Studio Canvas Ruler Markers Overlay */}
              <div className="absolute top-0 inset-x-0 h-4 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-2 text-[8px] font-mono text-neutral-500 select-none">
                <span>0mm</span>
                <span>50mm</span>
                <span>100mm</span>
                <span>150mm</span>
                <span>210mm</span>
              </div>
              <div className="absolute top-4 bottom-0 right-0 w-4 bg-[#1a1a1a] border-l border-white/10 flex flex-col justify-between py-2 text-[8px] font-mono text-neutral-500 select-none items-center">
                <span>0</span>
                <span>100</span>
                <span>200</span>
                <span>297</span>
              </div>

              {/* 1. ID Photos Preview */}
              {activeTab === 'id' && (
                <div className="w-full max-w-md pt-3">
                  <div className="bg-[#181818] p-4 rounded-xl border border-white/10 shadow-xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-brand-400" />
                        ورقة معاملة رسمية A4
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-400 cursor-pointer shadow-xs" title="خلفية بيضاء" />
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-600 cursor-pointer" title="خلفية زرقاء" />
                        <span className="w-3.5 h-3.5 rounded-full bg-neutral-400 cursor-pointer" title="خلفية رمادية" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div
                          key={n}
                          className="aspect-[3/4] bg-white rounded border border-neutral-300 overflow-hidden relative group/img shadow-sm"
                        >
                          <img
                            src={PASSPORT_IMG}
                            alt="Passport Preview"
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          />
                          {/* Dimension Overlay */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] font-mono text-center text-white py-0.5 font-bold">
                            40 × 32 mm
                          </div>
                          {/* Face Crop Box overlay on 1st element */}
                          {n === 1 && (
                            <div className="absolute inset-1.5 border border-dashed border-cyan-400 rounded pointer-events-none flex items-center justify-center">
                              <span className="bg-cyan-500 text-black text-[7px] font-bold px-1 rounded-xs opacity-90">Auto Crop</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Collage Preview */}
              {activeTab === 'collage' && (
                <div className="w-full max-w-md pt-3">
                  <div className="bg-[#181818] p-4 rounded-xl border border-brand-500/30 shadow-xl space-y-3 relative">
                    <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                      <span className="font-bold text-brand-300 flex items-center gap-1.5">
                        <LayoutGrid className="w-4 h-4 text-brand-400" />
                        تخطيط كولاج شبكي (Dynamic Grid)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Gap: 3.5mm • Active
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-2.5 pt-1">
                      {/* Hero Collage Slot */}
                      <div className="col-span-12 h-32 bg-[#222222] rounded-xl border border-brand-500/40 overflow-hidden relative group/hero shadow-md">
                        <img
                          src={PASSPORT_IMG}
                          alt="Collage Main"
                          className="w-full h-full object-cover opacity-90 group-hover/hero:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 right-2 px-2.5 py-1 bg-brand-600/90 rounded-md text-[10px] font-bold text-white shadow">
                          الصورة الرئيسية (Hero Slot)
                        </div>
                        {/* Spacing Guide lines */}
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded text-[9px] font-mono text-cyan-300 border border-cyan-500/30">
                          120 × 80 mm
                        </div>
                      </div>

                      {/* Sub-slots */}
                      <div className="col-span-6 h-24 bg-[#222222] rounded-xl border border-white/10 overflow-hidden relative group/sub">
                        <img src={PASSPORT_IMG} alt="Sub slot 1" className="w-full h-full object-cover opacity-80 group-hover/sub:scale-105 transition-transform" />
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 rounded text-[8px] text-neutral-300 font-mono">60 × 40 mm</span>
                      </div>

                      <div className="col-span-6 h-24 bg-[#222222] rounded-xl border border-white/10 overflow-hidden relative group/sub">
                        <img src={PASSPORT_IMG} alt="Sub slot 2" className="w-full h-full object-cover opacity-80 group-hover/sub:scale-105 transition-transform" />
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 rounded text-[8px] text-neutral-300 font-mono">60 × 40 mm</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. AI Restoration Preview */}
              {activeTab === 'ai' && (
                <div className="w-full max-w-md pt-3">
                  <div className="bg-[#181818] p-4 rounded-xl border border-white/10 shadow-xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Wand2 className="w-4 h-4 text-blue-400" />
                        معاينة الترميم المباشر (Before vs After)
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        w=0.85 Fidelity
                      </span>
                    </div>

                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-white/15 bg-[#222222] shadow-inner flex items-center justify-center">
                      <div className="grid grid-cols-2 w-full h-full">
                        {/* Before */}
                        <div className="relative border-l border-white/20 overflow-hidden">
                          <img src={PASSPORT_IMG} alt="Before" className="w-full h-full object-cover blur-[1.8px] grayscale opacity-60" />
                          <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 rounded text-[9px] font-bold text-rose-300">
                            قبل (صورة باهتة)
                          </span>
                        </div>
                        {/* After */}
                        <div className="relative overflow-hidden bg-brand-950/20">
                          <img src={PASSPORT_IMG} alt="After" className="w-full h-full object-cover contrast-[1.08]" />
                          <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 rounded text-[9px] font-extrabold text-white shadow">
                            بعد (CodeFormer HD)
                          </span>
                        </div>
                      </div>

                      {/* Center Split Drag Slider Indicator */}
                      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee] flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. CMYK Preview */}
              {activeTab === 'cmyk' && (
                <div className="w-full max-w-md pt-3">
                  <div className="bg-[#181818] p-4 rounded-xl border border-white/10 shadow-xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-cyan-400" />
                        فاحص قنوات ألوان المطابع ثلاثي الأبعاد (3D CMYK Stack)
                      </span>
                      <span className="text-[10px] font-mono text-brand-300 bg-brand-500/20 px-2 py-0.5 rounded border border-brand-500/30">
                        TIFF 300DPI
                      </span>
                    </div>

                    {/* Interactive 3D CMYK Layer Stack Canvas */}
                    <CMYK3DStack />

                    <div className="space-y-2.5 pt-1">
                      {/* Color Bars */}
                      <div className="space-y-1.5 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-cyan-300">
                          <span>Cyan (C): 45%</span>
                          <div className="w-36 h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 w-[45%]" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-pink-400">
                          <span>Magenta (M): 62%</span>
                          <div className="w-36 h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 w-[62%]" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-amber-300">
                          <span>Yellow (Y): 78%</span>
                          <div className="w-36 h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 w-[78%]" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-white font-bold">
                          <span>Key (K): 100% (Pure Black)</span>
                          <div className="w-36 h-2 bg-neutral-800 rounded-full overflow-hidden border border-white/20">
                            <div className="h-full bg-white w-[100%]" />
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#222222] border border-white/10 text-[10px] text-neutral-300 flex items-center justify-between">
                        <span>علامات تقاطعات أسياخ القص (Crop Marks):</span>
                        <span className="font-mono text-emerald-400 font-bold">+3mm Bleed Applied</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Description & Bullet Highlights (5 Cols) */}
            <div className="lg:col-span-5 space-y-8 text-right pr-0 lg:pr-4 relative z-10">
              {/* Badge */}
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-bold shadow-lg backdrop-blur-sm">
                  <Sliders className="w-4 h-4 text-brand-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="tracking-wide">{content.badge}</span>
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-4">
                <h3 className="text-3xl sm:text-4xl font-black font-display text-white leading-[1.15] drop-shadow-md">
                  {content.title}
                </h3>
                <p className="text-neutral-400 text-base sm:text-lg font-sans leading-relaxed">
                  {content.description}
                </p>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-4 pt-4 border-t border-white/5">
                {content.points.map((point) => (
                  <li key={point} className="flex items-start gap-3.5 text-sm sm:text-base font-bold text-neutral-200">
                    <div className="p-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 shrink-0 mt-0.5 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="leading-relaxed drop-shadow-sm">{point}</span>
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
