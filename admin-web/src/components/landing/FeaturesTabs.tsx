import { useState } from 'react';
import { Crop, LayoutGrid, Wand2, Printer, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

type TabId = 'id' | 'collage' | 'ai' | 'cmyk';

const TABS: { id: TabId; label: string; icon: typeof Crop; accent: string }[] = [
  { id: 'id', label: 'صور الهوية والرسميات', icon: Crop, accent: 'brand' },
  { id: 'collage', label: 'تصميم الكولاج والشبكات', icon: LayoutGrid, accent: 'sky' },
  { id: 'ai', label: 'ترميم الوجوه (AI)', icon: Wand2, accent: 'amber' },
  { id: 'cmyk', label: 'ألوان المطابع (CMYK)', icon: Printer, accent: 'emerald' },
];

const TAB_CONTENT: Record<
  TabId,
  {
    badge: string;
    badgeIcon: typeof Sparkles;
    title: string;
    description: string;
    points: string[];
    pointColor: string;
  }
> = {
  id: {
    badge: 'توليد تلقائي مقاس 40×32 / 35×45 / فيزا / passport',
    badgeIcon: Sparkles,
    title: 'قص واختيار خلفية صورة الهوية بضغطة واحدة',
    description:
      'يقوم البرنامج بالتعرف التلقائي على الوجه والأكتاف وتوسيط الصورة وفق المعايير الرسمية، مع إمكانية تغيير الخلفية إلى الأبيض أو الأزرق فورياً بدون عناء.',
    points: [
      'توسيط ذكي للوجه بالذكاء الاصطناعي',
      'خلفيات رسمية موحدة بنقرة واحدة',
      'تجهيز الورقة للطباعة الفورية (A4, 10×15, A5)',
    ],
    pointColor: 'text-brand-400',
  },
  collage: {
    badge: 'تنسيق وتوزيع شبكي محترف',
    badgeIcon: LayoutGrid,
    title: 'قوالب كولاج ديناميكية قابلة للتخصيص الكامل',
    description:
      'أنشئ ألبومات وكروت ومجموعات صور متعددة بسهولة. يتيح لك نظام الشبكة الديناميكي التحكم في الحدود، المسافات، ونسب الارتفاع بدون فقدان الجودة.',
    points: ['دعم السحب والإسقاط للصور', 'استنباط الأبعاد التلقائي (Dynamic Collage)', 'محاذاة الكائنات والمساطر الذكية'],
    pointColor: 'text-sky-400',
  },
  ai: {
    badge: 'دمج خوارزميات CodeFormer + Real-ESRGAN',
    badgeIcon: Wand2,
    title: 'استعادة تفاصيل الوجه وإزالة الضوضاء والأخطاء',
    description:
      'يعالج النواقص والإضاءة الضعيفة في الصور القديمة أو الملتقطة بالهواتف، ويمنحك نتائج ناعمة ودقيقة مع الحفاظ التام على ملامح الشخصية الأصلية (Fidelity w=0.7).',
    points: ['معالجة مزدوجة Dual-Pipeline مخصصة للهوية', 'تحسين الإضاءة والظلال التلقائي (CLAHE)', 'الحفاظ على ملامح الوجه الأصلية دقيقة 100%'],
    pointColor: 'text-amber-400',
  },
  cmyk: {
    badge: 'تصدير TIFF CMYK احترافي للمطابع التجارية',
    badgeIcon: Printer,
    title: 'دعم نمط الألوان CMYK والأسود الخالص (K=100%)',
    description:
      'تحويل دقيق لقنوات الألوان sRGB ➔ CMYK يضمن تطابق الألوان المطبوعة مع الشاشة، مع فرض الأسود الخالص على خطوط التقطيع لضمان أقصى حدة أثناء القص.',
    points: [
      'تحويل ألوان حقيقي (Cyan, Magenta, Yellow, Key)',
      'تصدير بصيغة TIFF و JPEG للمطابع المباشرة',
      'منع تلطخ وتداخل أحبار القص بفرض K=100%',
    ],
    pointColor: 'text-emerald-400',
  },
};

const PASSPORT_IMG = '/sample-passport.png';

export function FeaturesTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('id');
  const content = TAB_CONTENT[activeTab];
  const BadgeIcon = content.badgeIcon;

  return (
    <section id="demo" className="relative py-24 border-t border-white/10 bg-ink-900/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        {/* Section heading */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-400">المميزات</span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-black font-display">استكشف قوة Grido Studio</h2>
          <p className="mt-4 text-neutral-400 text-base sm:text-lg">
            تم بناء الأدوات بعناية فائقة لتسريع وتيرة العمل داخل الاستوديو وتقليل الأخطاء البشرية.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center justify-start sm:justify-center gap-2 mb-8 sm:mb-10 overflow-x-auto pb-2 w-full no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab panel */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-800/60 backdrop-blur-sm p-6 md:p-10 shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-500 via-sky-400 to-accent-400" />

          <div key={activeTab} className="grid md:grid-cols-2 gap-10 items-center text-right">
            <div className="space-y-5">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold ${content.pointColor}`}>
                <BadgeIcon className="w-3.5 h-3.5" />
                <span>{content.badge}</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold leading-tight font-display">{content.title}</h3>
              <p className="text-neutral-300 leading-relaxed">{content.description}</p>
              <ul className="space-y-3">
                {content.points.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-neutral-200 font-medium">
                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${content.pointColor}`} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual preview per tab */}
            <div className="bg-[#0f0f12] p-5 rounded-2xl border border-white/10 flex items-center justify-center">
              {activeTab === 'id' && (
                <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="aspect-[3/4] bg-white rounded-sm border border-neutral-300 overflow-hidden relative group">
                      <img src={PASSPORT_IMG} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] font-mono text-center text-white py-0.5">40 × 32 mm</div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'collage' && (
                <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm">
                  <div className="col-span-2 h-28 bg-gradient-to-br from-brand-900/40 to-sky-950/60 rounded-xl border border-sky-500/30 overflow-hidden relative group">
                    <img src={PASSPORT_IMG} alt="" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform" loading="lazy" />
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-[9px] font-bold text-sky-300">صورة رئيسية</span>
                  </div>
                  <div className="h-20 bg-neutral-900 rounded-xl border border-white/10 overflow-hidden">
                    <img src={PASSPORT_IMG} alt="" className="w-full h-full object-cover opacity-70" loading="lazy" />
                  </div>
                  <div className="h-20 bg-neutral-900 rounded-xl border border-white/10 overflow-hidden">
                    <img src={PASSPORT_IMG} alt="" className="w-full h-full object-cover opacity-70" loading="lazy" />
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="flex items-center gap-3 w-full max-w-sm">
                  <div className="flex-1 aspect-[3/4] bg-neutral-900 rounded-xl border border-rose-500/30 overflow-hidden relative shadow-md">
                    <img src={PASSPORT_IMG} alt="" className="w-full h-full object-cover blur-[1.5px] grayscale opacity-70" loading="lazy" />
                    <div className="absolute bottom-2 inset-x-0 text-center bg-black/80 py-1 text-[9px] text-rose-300 font-bold">قبل التحسين (صورة قديمة)</div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-neutral-500 rotate-180 flex-shrink-0" />
                  <div className="flex-1 aspect-[3/4] bg-neutral-900 rounded-xl border border-emerald-500/50 overflow-hidden relative shadow-lg shadow-emerald-500/20">
                    <img src={PASSPORT_IMG} alt="" className="w-full h-full object-cover contrast-[1.08]" loading="lazy" />
                    <div className="absolute bottom-2 inset-x-0 text-center bg-emerald-600/90 py-1 text-[9px] text-white font-extrabold flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-200" />
                      <span>CodeFormer HD</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cmyk' && (
                <div className="w-full max-w-sm space-y-3">
                  <div className="p-4 rounded-2xl bg-neutral-900 border border-emerald-500/30">
                    <div className="text-xs font-bold text-emerald-400 mb-3 flex items-center justify-between">
                      <span>قنوات ألوان المطابع المباشرة</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px]">TIFF 300DPI</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                      <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold">
                        <div className="text-sm">C</div>
                        <div>Cyan</div>
                      </div>
                      <div className="p-2 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 font-bold">
                        <div className="text-sm">M</div>
                        <div>Magenta</div>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 font-bold">
                        <div className="text-sm">Y</div>
                        <div>Yellow</div>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-800 border border-neutral-600 text-white font-bold">
                        <div className="text-sm">K</div>
                        <div>Key 100%</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-white/10 text-[11px] text-neutral-400 flex items-center justify-between">
                    <span>خطوط التقطيع لأسلحة التقصي:</span>
                    <span className="font-mono text-emerald-400 font-bold">Black K=100% (No Bleed)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
