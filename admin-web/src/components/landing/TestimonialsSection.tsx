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
  accent: string;
  stats: { label: string; val: string }[];
}

const SCENARIOS: StudioScenario[] = [
  {
    id: 'passport',
    badge: 'معاملات مستعجلة',
    title: 'طلب 8 صور معاملة (40×32 ملم) خلفية بيضاء لزبون ينتظر في الاستوديو',
    problemTitle: 'الطريقة التقليدية (فوتوشوب / يدوياً):',
    problemSteps: ['فتح الفوتوشوب', 'قص الوجه يدوياً', 'إنشاء ملصق A4', 'تكرار الطبقات 8 مرات (5-8 دقائق)'],
    solutionTitle: 'مع Grido Studio (بنقرة واحدة):',
    solutionSteps: ['فتح الصورة', 'اختيار قالب "هوية أحوال"', 'توليد ومحاذاة الشبكة تلقائياً (3 ثوانٍ)'],
    timeSaved: 'وفرت 7 دقائق لكل زبون',
    icon: Zap,
    accent: 'from-brand-500 to-sky-500',
    stats: [
      { label: 'الوقت المستغرق', val: '3 ثوانٍ' },
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
    accent: 'from-sky-500 to-amber-500',
    stats: [
      { label: 'الحفاظ على الملامح', val: '100% Fidelity' },
      { label: 'نوع المعالجة', val: 'Dual-Pipeline' },
      { label: 'الاعتماد على الإنترنت', val: '0% (محلي)' },
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
    accent: 'from-emerald-500 to-brand-500',
    stats: [
      { label: 'استغلال مساحة A4', val: '100% كاملة' },
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
    <section id="scenarios" className="relative py-12 sm:py-24 border-t border-white/10 bg-[#141414] overflow-hidden">
      {/* Studio Ambient Glow Accent */}
      <div className="absolute top-1/3 right-1/4 w-[300px] sm:w-[550px] h-[300px] sm:h-[550px] bg-brand-600/10 rounded-full blur-[120px] sm:blur-[160px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Title Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] sm:text-xs font-extrabold mb-3">
            <UserCheck className="w-3.5 h-3.5" />
            <span>حالات استخدام واقعية من داخل الاستوديو</span>
          </span>
          <h2 className="text-2xl sm:text-5xl font-black font-display text-white">
            كيف يحل <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-blue-300">Grido Studio</span> مواقف العمل اليومية؟
          </h2>
          <p className="mt-3 text-neutral-400 text-xs sm:text-base max-w-xl mx-auto font-sans leading-relaxed">
            مقارنة بين بطء الطرق القديمة وسرعة أتمتة Grido Studio المباشرة داخل استوديوهات التصوير.
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="flex justify-center mb-8 sm:mb-10">
          <div className="p-1.5 rounded-2xl bg-[#1e1e1e] border border-white/10 shadow-xl flex items-center gap-1 max-w-full overflow-x-auto no-scrollbar">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setActiveTab(sc.id)}
                className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-bold font-display text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeTab === sc.id
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-[1.02]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span>{sc.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Display Window */}
        <div className="rounded-2xl sm:rounded-3xl border border-white/15 bg-[#1a1a1a] shadow-2xl overflow-hidden">
          {/* Top Window Chrome Bar */}
          <div className="h-10 bg-[#222222] border-b border-white/10 px-4 sm:px-5 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="mr-2 font-mono text-[10px] sm:text-[11px] text-neutral-300 font-semibold truncate">
                {currentScenario.badge}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold hidden xs:inline">
              Real Studio Benchmark
            </span>
          </div>

          <div className="p-4 sm:p-10 grid lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            {/* Main Content Column: Problem vs Solution Cards (8 Cols) */}
            <div className="lg:col-span-8 space-y-6 text-right flex flex-col justify-between">
              {/* Scenario Title Header */}
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${currentScenario.accent} text-white shadow-md shrink-0`}>
                  <ScenarioIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-brand-400 uppercase tracking-widest block mb-0.5">
                    موقف عمل واقعي #{currentScenario.id}
                  </span>
                  <h3 className="text-lg sm:text-2xl font-black font-display text-white leading-tight">
                    {currentScenario.title}
                  </h3>
                </div>
              </div>

              {/* Step-by-Step Flow Cards */}
              <div className="grid grid-cols-1 gap-4 pt-1">
                {/* Problem Flow Box (Subtle Gray) */}
                <div className="p-5 rounded-2xl bg-[#1c1c1c] border border-white/5 shadow-none">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-400 mb-3 pb-2 border-b border-white/5">
                    <span className="flex items-center gap-2 font-display text-sm">
                      <ShieldAlert className="w-4 h-4 text-rose-500/70" />
                      {currentScenario.problemTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/10 text-[10px] font-mono">
                      بطء وهدر في الوقت
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {currentScenario.problemSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-[#242424] border border-white/5 text-neutral-400 font-medium">
                          {idx + 1}. {step}
                        </span>
                        {idx < currentScenario.problemSteps.length - 1 && (
                          <ArrowLeft className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Solution Flow Box (Subtle Brand Blue Accent) */}
                <div className="p-5 rounded-2xl bg-[#242424] border border-brand-500/20 shadow-md">
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-3 pb-2 border-b border-white/5">
                    <span className="flex items-center gap-2 font-display text-sm">
                      <CheckCircle2 className="w-4 h-4 text-brand-400" />
                      {currentScenario.solutionTitle}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[10px] font-bold font-mono">
                      ⚡ سرعة فائقة 100%
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {currentScenario.solutionSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-100 font-extrabold">
                          {step}
                        </span>
                        {idx < currentScenario.solutionSteps.length - 1 && (
                          <ArrowLeft className="w-3.5 h-3.5 text-brand-400/50 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Benchmark Sidebar Column (4 Cols) */}
            <div className="lg:col-span-4 bg-[#121212] p-6 rounded-2xl border border-white/10 flex flex-col justify-between text-center shadow-inner space-y-5">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-3 font-mono">
                  نتيجة الأداء الفعلي
                </span>
                <div className="text-xl sm:text-2xl font-black text-white bg-[#242424] py-4 px-3 rounded-xl border border-white/10 shadow-md font-display">
                  {currentScenario.timeSaved}
                </div>
              </div>

              <div className="space-y-3">
                {currentScenario.stats.map((st) => (
                  <div
                    key={st.label}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#1c1c1c] border border-white/10 text-xs"
                  >
                    <span className="text-neutral-300 font-medium">{st.label}</span>
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
