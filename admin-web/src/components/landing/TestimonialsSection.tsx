import { useState } from 'react';
import { ArrowLeft, Check, FileSpreadsheet, Sparkles, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

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
    before: { label: 'الطريقة التقليدية', value: '10 دقائق', note: 'قص يدوي وتكرار طبقات فوتوشوب' },
    after: { label: 'مع Grido Studio', value: '3 ثوانٍ', note: 'صورة واحدة ← ورقة A4 جاهزة' },
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
    after: { label: 'ترميم CodeFormer', value: 'وجه HD', note: 'تفاصيل حقيقية بلا وجه شمعي' },
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
    <section id="scenarios" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="حالات استخدام واقعية"
          title="كيف يحل Grido Studio مواقف العمل اليومية؟"
          subtitle="مشاهد حية من أرض العمل — والفرق الحقيقي يُقاس بالثواني الموفرة ورضا الزبائن."
          index="07"
        />

        {/* Scenario Selector Pill Bar */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div role="tablist" aria-label="سيناريوهات الاستخدام" className="p-1 rounded-full bg-[#191b1e] border border-[rgba(214,235,253,0.19)] flex items-center gap-1">
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
                  className={`px-4 py-1.5 rounded-full text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-[#000000] text-[#f0f0f0] border border-[rgba(214,235,253,0.19)]'
                      : 'text-[#a1a4a5] hover:text-[#f0f0f0]'
                  }`}
                >
                  <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00a3ff]' : 'text-[#a1a4a5]'}`} />
                  <span>{sc.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contrast Display Card */}
        <div
          key={activeTab}
          role="tabpanel"
          id="scenario-tabpanel"
          aria-labelledby={`scenario-tab-${current.id}`}
          className="max-w-5xl mx-auto"
        >
          <div className="rounded-lg overflow-hidden bg-[#191b1e] border border-[rgba(214,235,253,0.19)]">
            {/* Window Chrome Bar */}
            <div className="h-10 bg-[#000000] border-b border-[rgba(214,235,253,0.19)] px-4 flex items-center justify-between text-xs text-[#a1a4a5] font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00a3ff]" />
                <span className="text-xs text-[#f0f0f0]">
                  {current.badge} — {current.title}
                </span>
              </div>
              <span className="text-[10px] text-[#00a3ff] bg-[#191b1e] px-2 py-0.5 rounded border border-[rgba(214,235,253,0.19)]">
                اختبار عملي
              </span>
            </div>

            {/* Main Contrast Split: قبل → بعد */}
            <div className="grid lg:grid-cols-[1fr_auto_1fr] items-center">
              {/* Before */}
              <div className="p-8 sm:p-10 text-center bg-[#000000]">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#52595b]">
                  <X className="w-3.5 h-3.5 text-[#52595b]" />
                  {current.before.label}
                </span>
                <div className="mt-3 text-4xl sm:text-6xl font-normal font-serif text-[#52595b] line-through">
                  {current.before.value}
                </div>
                <p className="mt-3 text-xs text-[#52595b] max-w-[240px] mx-auto">
                  {current.before.note}
                </p>
              </div>

              {/* Direction Arrow */}
              <div className="hidden lg:flex items-center justify-center z-10">
                <span className="w-8 h-8 rounded-full bg-[#191b1e] border border-[rgba(214,235,253,0.19)] flex items-center justify-center text-[#f0f0f0]">
                  <ArrowLeft className="w-4 h-4 text-[#00a3ff]" aria-hidden />
                </span>
              </div>

              {/* After */}
              <div className="bg-[#191b1e] border-t lg:border-t-0 lg:border-s border-[rgba(214,235,253,0.19)] p-8 sm:p-10 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#00a3ff]">
                  <Check className="w-3.5 h-3.5 text-[#00a3ff]" />
                  {current.after.label}
                </span>
                <div className="mt-3 text-5xl sm:text-7xl font-normal font-serif text-[#f0f0f0] tracking-tight">
                  {current.after.value}
                </div>
                <p className="mt-3 text-xs text-[#a1a4a5] max-w-[240px] mx-auto">
                  {current.after.note}
                </p>
              </div>
            </div>

            {/* Bottom Metric Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-x lg:divide-y-0 border-t border-[rgba(214,235,253,0.19)] bg-[#000000]">
              <div className="p-4 text-center">
                <div className="text-xl font-normal font-serif text-[#00a3ff]">
                  {current.saving.value}
                </div>
                <div className="mt-1 text-[11px] font-mono text-[#a1a4a5]">
                  {current.saving.label}
                </div>
              </div>
              {current.stats.map((st) => (
                <div key={st.label} className="p-4 text-center">
                  <div className="text-xl font-normal font-serif text-[#f0f0f0]">
                    {st.val}
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-[#a1a4a5]">
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

