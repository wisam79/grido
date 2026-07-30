import { useState } from 'react';
import { Clock, Zap, ShieldAlert, Sparkles, CheckCircle2, UserCheck, FileSpreadsheet, ArrowLeft } from 'lucide-react';

interface StudioScenario {
  id: string;
  badge: string;
  title: string;
  problemTitle: string;
  problemSteps: string[];
  solutionTitle: string;
  solutionSteps: string[];
  timeSaved: string;
  icon: typeof Clock;
  stats: { label: string; val: string }[];
}

const SCENARIOS: StudioScenario[] = [
  {
    id: 'passport',
    badge: 'معاملات مستعجلة',
    title: 'طلب 8 صور معاملة (40×32 ملم) خلفية بيضاء لزبون ينتظر في الاستوديو',
    problemTitle: 'الطريقة التقليدية (فوتوشوب / يدوياً):',
    problemSteps: ['فتح الفوتوشوب', 'قص الوجه يدوياً', 'إنشاء ملصق A4', 'تكرار الطبقات (5-8 دقائق)'],
    solutionTitle: 'مع Grido Studio (بنقرة واحدة):',
    solutionSteps: ['فتح الصورة', 'اختيار قالب "هوية أحوال"', 'توليد ومحاذاة الشبكة تلقائياً (3 ثوانٍ)'],
    timeSaved: 'وفرت 7 دقائق لكل زبون',
    icon: Zap,
    stats: [
      { label: 'الوقت المستغرق', val: '3 SECONDS' },
      { label: 'الدقة الحسابية', val: '300 DPI' },
      { label: 'نسبة الخطأ البشرية', val: '0%' },
    ],
  },
  {
    id: 'restoration',
    badge: 'صور قديمة / هواتف',
    title: 'ترميم صورة قديمة باهتة مأخوذة من هاتف لإلحاقها بمعاملة رسمية',
    problemTitle: 'الطريقة التقليدية (فلاتر تنعيم عادية):',
    problemSteps: ['تنعيم يدوي معقد', 'فقدان تفاصيل المسام والوجه', 'تشوه الملامح الأصلية', 'رفض المعاملة حكومياً'],
    solutionTitle: 'مع Grido Studio (CodeFormer HD):',
    solutionSteps: ['استدعاء محرك CodeFormer', 'ضبط معامل (w=0.85)', 'ترميم مسام الوجه والحفاظ 100% على الملامح'],
    timeSaved: 'استعادة تفاصيل الوجه بدقة HD',
    icon: Sparkles,
    stats: [
      { label: 'الحفاظ على الملامح', val: '100% FIDELITY' },
      { label: 'نوع المعالجة', val: 'DUAL-PIPELINE' },
      { label: 'الاعتماد على الإنترنت', val: '0% (OFFLINE)' },
    ],
  },
  {
    id: 'bulk',
    badge: 'طباعة تجارية',
    title: 'تجهيز وطباعة صور المدارس والمؤسسات على أوراق A4 و 10×15 ملم',
    problemTitle: 'الطريقة التقليدية (توزيع يدوي غير دقيق):',
    problemSteps: ['توزيع يدوي بطيء', 'تفاوت المسافات والقياسات', 'ضياع الأطراف عند القص', 'هدر أوراق وحبر ثمين'],
    solutionTitle: 'مع Grido Studio (Dynamic Grid & CMYK):',
    solutionSteps: ['حساب الأبعاد ميليمترياً', 'فرض الأسود الخالص (K=100%)', 'تصدير TIFF جاهز للقص بدون أي هدر'],
    timeSaved: 'صفر هدر في الورق والحبر',
    icon: FileSpreadsheet,
    stats: [
      { label: 'استغلال مساحة A4', val: '100% FULL' },
      { label: 'نمط الألوان', val: 'CMYK TIFF' },
      { label: 'وضوح التقطيع', val: 'K=100%' },
    ],
  },
];

export function TestimonialsSection() {
  const [activeTab, setActiveTab] = useState<string>('passport');
  const currentScenario = SCENARIOS.find((s) => s.id === activeTab) || SCENARIOS[0];
  const ScenarioIcon = currentScenario.icon;

  return (
    <section id="scenarios" className="relative py-16 sm:py-24 lg:py-28 border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title Header */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-16">
          <span className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-subtle bg-elevated text-xs font-mono font-bold text-secondary tracking-[2px] uppercase mb-4">
            <UserCheck className="w-3.5 h-3.5 text-white" />
            <span>حالات استخدام واقعية من داخل الاستوديو</span>
          </span>
          <h2 className="stagger-2 text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white uppercase leading-tight">
            كيف يحل <span className="text-secondary">GRIDO STUDIO</span> مواقف العمل اليومية؟
          </h2>
          <p className="stagger-3 mt-4 text-secondary text-sm sm:text-base lg:text-lg max-w-2xl mx-auto font-sans leading-relaxed font-medium">
            حلول فورية لمواقف العمل اليومية داخل الاستوديو والمطبعة.
          </p>
        </div>

        {/* Scenario Selector Pill Bar */}
        <div className="stagger-4 flex justify-center mb-8 sm:mb-10">
          <div className="p-1.5 rounded-full bg-elevated border border-subtle flex items-center gap-1 max-w-full overflow-x-auto no-scrollbar">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setActiveTab(sc.id)}
                className={`px-5 py-2.5 rounded-full font-mono font-extrabold text-xs sm:text-sm uppercase tracking-[1px] transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeTab === sc.id
                    ? 'bg-white text-black shadow-md'
                    : 'text-tertiary hover:text-white hover:bg-elevated/70'
                }`}
              >
                <span>{sc.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Display Window Card */}
        <div className="stagger-5 rounded-2xl border border-subtle bg-elevated overflow-hidden shadow-2xl">
          {/* Top Window Chrome Bar */}
          <div className="h-10 bg-elevated/80 border-b border-subtle px-4 sm:px-5 flex items-center justify-between text-xs text-tertiary font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
              <span className="mr-2 font-mono text-[10px] sm:text-[11px] text-white font-bold uppercase tracking-[1px]">
                {currentScenario.badge}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-secondary bg-primary px-2.5 py-0.5 rounded-md border border-subtle font-bold uppercase tracking-[1px] hidden xs:inline">
              BENCHMARK TEST
            </span>
          </div>

          <div className="p-4 sm:p-10 grid lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            {/* Main Content Column: Problem vs Solution Cards (8 Cols) */}
            <div className="lg:col-span-8 space-y-6 text-right flex flex-col justify-between">
              {/* Scenario Title Header */}
              <div className="flex items-center gap-3.5">
                <div className="p-3.5 rounded-xl bg-white text-black font-bold shrink-0 shadow-md">
                  <ScenarioIcon className="w-6 h-6 text-black" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-tertiary uppercase tracking-[1px] block mb-0.5">
                    موقف عمل واقعي #{currentScenario.id}
                  </span>
                  <h3 className="text-lg sm:text-2xl font-black font-display text-white leading-tight">
                    {currentScenario.title}
                  </h3>
                </div>
              </div>

              {/* Step-by-Step Flow Cards */}
              <div className="grid grid-cols-1 gap-4 pt-1">
                {/* Problem Flow Box */}
                <div className="p-5 rounded-xl bg-secondary border border-subtle">
                  <div className="flex items-center justify-between text-xs font-bold text-tertiary mb-3 pb-2 border-b border-subtle">
                    <span className="flex items-center gap-2 font-display text-sm text-white">
                      <ShieldAlert className="w-4 h-4 text-tertiary" />
                      {currentScenario.problemTitle}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-elevated text-tertiary border border-subtle text-[10px] font-mono uppercase tracking-[1px]">
                      بطء وهدر في الوقت
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {currentScenario.problemSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-elevated border border-subtle text-tertiary font-medium font-mono">
                          {idx + 1}. {step}
                        </span>
                        {idx < currentScenario.problemSteps.length - 1 && (
                          <ArrowLeft className="w-3.5 h-3.5 text-tertiary shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Solution Flow Box */}
                <div className="p-5 rounded-xl bg-elevated border border-white/30">
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-3 pb-2 border-b border-subtle">
                    <span className="flex items-center gap-2 font-display text-sm font-extrabold text-white">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      {currentScenario.solutionTitle}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white text-black text-[10px] font-extrabold font-mono uppercase tracking-[1px]">
                      ⚡ 3 SECONDS
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {currentScenario.solutionSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-primary border border-subtle text-white font-extrabold font-mono">
                          {step}
                        </span>
                        {idx < currentScenario.solutionSteps.length - 1 && (
                          <ArrowLeft className="w-3.5 h-3.5 text-white shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Benchmark Sidebar Column (4 Cols) */}
            <div className="lg:col-span-4 bg-primary p-6 rounded-xl border border-subtle flex flex-col justify-between text-center space-y-5">
              <div>
                <span className="text-[11px] font-bold text-tertiary uppercase tracking-[1px] block mb-3 font-mono">
                  نتيجة الأداء الفعلي
                </span>
                <div className="text-xl sm:text-2xl font-black text-white bg-elevated py-4 px-3 rounded-lg border border-subtle font-display">
                  {currentScenario.timeSaved}
                </div>
              </div>

              <div className="space-y-3">
                {currentScenario.stats.map((st) => (
                  <div
                    key={st.label}
                    className="flex items-center justify-between p-3.5 rounded-lg bg-secondary border border-subtle text-xs"
                  >
                    <span className="text-tertiary font-medium">{st.label}</span>
                    <span className="font-extrabold text-white font-mono text-sm">{st.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
