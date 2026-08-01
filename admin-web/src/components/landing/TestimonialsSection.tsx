import { useState } from 'react';
import { ArrowLeft, Check, FileSpreadsheet, Sparkles, UserCheck, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

/**
 * قسم «حالات الاستخدام الواقعية» — إعادة تصميم خاطفة للانتباه (Attention-First):
 * بدل الشرائح النصية الطويلة، تباين جريء بين رقم «قبل» مشطوب ورقم «بعد» عملاق
 * بخط Monospace (design.md §6.3) — الفكرة تُفهم في ثانيتين قبل أن يمرر الزائر.
 */
interface Scenario {
  id: string;
  badge: string;
  icon: LucideIcon;
  title: string;
  before: { label: string; value: string; note: string };
  after: { label: string; value: string; note: string };
  saving: { value: string; label: string };
  stats: { label: string; val: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'passport',
    badge: 'معاملات مستعجلة',
    icon: Zap,
    title: 'زبون واقف ينتظر… والمعاملة مستعجلة',
    before: { label: 'الطريقة التقليدية', value: '10 دقائق', note: 'قص يدوي وتكرار طبقات' },
    after: { label: 'مع GRIDO STUDIO', value: '3 ثوانٍ', note: 'صورة واحدة ← ورقة جاهزة' },
    saving: { value: '7 دقائق', label: 'توفير لكل زبون' },
    stats: [
      { label: 'دقة الحساب', val: '300 DPI' },
      { label: 'الخطأ البشري', val: '0%' },
      { label: 'هدر الورق', val: '0%' },
    ],
  },
  {
    id: 'restoration',
    badge: 'صور قديمة / هواتف',
    icon: Sparkles,
    title: 'صورة قديمة باهتة… تُرفض رسمياً؟',
    before: { label: 'فلاتر تنعيم عادية', value: 'مرفوضة', note: 'ملامح مشوهة وتفاصيل ضائعة' },
    after: { label: 'ترميم CODEFORMER', value: 'وجه HD', note: 'تفاصيل حقيقية بلا وجه شمعي' },
    saving: { value: '100%', label: 'حفاظ على الملامح' },
    stats: [
      { label: 'المعالجة', val: 'معالجة مزدوجة' },
      { label: 'الإنترنت', val: '0%' },
      { label: 'الجودة', val: '4K HD' },
    ],
  },
  {
    id: 'bulk',
    badge: 'طباعة تجارية',
    icon: FileSpreadsheet,
    title: 'مئات الصور… وكل ملّيمتر يُحسب',
    before: { label: 'توزيع يدوي', value: 'هدر كبير', note: 'مسافات متفاوتة وأطراف تُقص' },
    after: { label: 'شبكات ذكية + CMYK', value: 'صفر هدر', note: 'استغلال كامل للورقة بعلامات قص دقيقة' },
    saving: { value: '0%', label: 'هدر الورق والحبر' },
    stats: [
      { label: 'استغلال A4', val: 'استغلال كامل' },
      { label: 'نمط الألوان', val: 'CMYK TIFF' },
      { label: 'وضوح القص', val: 'K=100%' },
    ],
  },
];

export function TestimonialsSection() {
  const [activeTab, setActiveTab] = useState<string>('passport');
  const current = SCENARIOS.find((s) => s.id === activeTab) || SCENARIOS[0];

  return (
    <section id="scenarios" className="relative section-rhythm border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={UserCheck}
          eyebrow="حالات استخدام واقعية من داخل الاستوديو"
          title={<>كيف يحل <span className="text-secondary">GRIDO STUDIO</span> مواقف العمل اليومية؟</>}
          subtitle="مشاهد من أرض العمل — والفرق الحقيقي يُقاس بالثواني."
          index="05"
        />

        {/* Scenario Selector Pill Bar */}
        <div className="stagger-4 flex justify-center mb-8 sm:mb-12">
          <div role="tablist" aria-label="سيناريوهات الاستخدام" className="p-1.5 rounded-full bg-elevated border border-subtle flex items-center gap-1 max-w-full overflow-x-auto no-scrollbar">
            {SCENARIOS.map((sc) => {
              const isActive = activeTab === sc.id;
              const TabIcon = sc.icon;
              return (
                <button
                  key={sc.id}
                  role="tab"
                  id={`scenario-tab-${sc.id}`}
                  aria-selected={isActive}
                  aria-controls="scenario-tabpanel"
                  onClick={() => setActiveTab(sc.id)}
                  className={`px-5 py-2.5 rounded-full font-extrabold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive ? 'bg-white text-black shadow-md' : 'text-tertiary hover:text-white hover:bg-elevated/70'
                  }`}
                >
                  <TabIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-black' : 'text-tertiary'}`} />
                  <span>{sc.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Contrast Display Card — keyed remount replays the mini cinematic reveal */}
        <div
          key={activeTab}
          role="tabpanel"
          id="scenario-tabpanel"
          aria-labelledby={`scenario-tab-${current.id}`}
          className="tab-content-reveal"
        >
          <div className="spotlight-card rounded-3xl overflow-hidden">
            {/* Slim Window Chrome Bar */}
            <div className="h-10 bg-elevated/80 border-b border-subtle px-4 sm:px-6 flex items-center justify-between text-xs text-tertiary font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-white/40 shrink-0" />
                <span className="text-[10px] sm:text-[11px] text-white font-bold truncate">
                  {current.badge}
                </span>
                <span className="text-[10px] sm:text-[11px] text-tertiary font-bold truncate hidden sm:inline">
                  — {current.title}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-secondary bg-primary px-2.5 py-0.5 rounded-md border border-subtle font-bold hidden xs:inline shrink-0">
                اختبار ميداني
              </span>
            </div>

            {/* Main Contrast Split: قبل → بعد */}
            <div className="relative grid lg:grid-cols-[1fr_auto_1fr] items-center">
              {/* Before (Dimmed) */}
              <div className="relative p-8 sm:p-12 text-center">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-tertiary">
                  <X className="w-3.5 h-3.5" />
                  {current.before.label}
                </span>
                <div
                  className="mt-4 text-5xl sm:text-7xl font-black font-mono text-tertiary/70 line-through decoration-tertiary/60 decoration-4 tracking-tight whitespace-nowrap"
                >
                  {current.before.value}
                </div>
                <p className="mt-4 text-xs sm:text-sm text-tertiary font-sans font-medium max-w-[260px] mx-auto">
                  {current.before.note}
                </p>
              </div>

              {/* Direction Arrow (Desktop) */}
              <div className="hidden lg:flex items-center justify-center z-10">
                <span className="w-12 h-12 rounded-full bg-elevated border border-subtle flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-white" aria-hidden />
                </span>
              </div>

              {/* After (Hero) */}
              <div className="relative bg-elevated/70 border-t lg:border-t-0 lg:border-s border-subtle p-8 sm:p-12 text-center overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[320px] rounded-full bg-white/10 blur-[90px]"
                />
                <span className="relative z-10 inline-flex items-center gap-1.5 text-[10px] font-extrabold text-white">
                  <Check className="w-3.5 h-3.5" />
                  {current.after.label}
                </span>
                <div
                  className="relative z-10 mt-4 text-6xl sm:text-8xl font-black font-mono text-white tracking-tight whitespace-nowrap"
                >
                  {current.after.value}
                </div>
                <p className="relative z-10 mt-4 text-xs sm:text-sm text-secondary font-sans font-medium max-w-[260px] mx-auto">
                  {current.after.note}
                </p>
              </div>
            </div>

            {/* Bottom Metric Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-x lg:divide-y-0 border-t border-subtle">
              <div className="p-5 sm:p-6 text-center">
                <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                  {current.saving.value}
                </div>
                <div className="mt-1 text-[10px] font-extrabold text-tertiary">
                  {current.saving.label}
                </div>
              </div>
              {current.stats.map((st) => (
                <div key={st.label} className="p-5 sm:p-6 text-center">
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                    {st.val}
                  </div>
                  <div className="mt-1 text-[10px] font-extrabold text-tertiary">
                    {st.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
