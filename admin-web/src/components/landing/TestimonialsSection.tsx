import { useState } from 'react';
import { Clock, Zap, ShieldAlert, Sparkles, CheckCircle2, UserCheck, FileSpreadsheet } from 'lucide-react';

interface StudioScenario {
  id: string;
  badge: string;
  title: string;
  problem: string;
  solution: string;
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
    problem: 'بالطريقة القديمة: فتح الفوتوشوب ➔ قص الوجه يدوياً ➔ إنشاء ملصق A4 ➔ تكرار الطبقات 8 مرات ➔ يستغرق 5 إلى 8 دقائق.',
    solution: 'مع Grido Studio: فتح الصورة ➔ اختيار قالب "هوية أحوال" ➔ الجداول والأبعاد والورقة تتجهز تلقائياً بنقرة واحدة ➔ طباعة فورية.',
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
    problem: 'الصورة غير واضحة والملامح ضائعة، وفلاتر التنعيم العادية تشوه شكل الشخص وتجعل الصورة مرفوضة حكومياً.',
    solution: 'تفعيل محرك CodeFormer المحلي الذكي بضبط معامل (w=0.7) للتحسين دون المساس بملامح الشخصية الأصلية.',
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
    problem: 'صعوبة محاذاة الصور وتفاوت المسافات يؤدي لضياع أجزاء عند التقطيع وهدر كبير في كميات الورق والحبر.',
    solution: 'نظام الشبكة الديناميكي (Dynamic Grid) يوزع الصور بحسابات ميليمترية دقيقة مع فرض خطوط تقطيع سوداء كلياً (K=100%).',
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
    <section className="relative py-24 border-t border-white/10 bg-ink-950">
      {/* Glow background */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold mb-4">
            <UserCheck className="w-3.5 h-3.5" />
            <span>حالات استخدام واقعية اليوم داخل الاستوديو</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black font-display text-white">
            كيف يحل <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-sky-400">Grido Studio</span> مواقف العمل اليومية؟
          </h2>
          <p className="mt-4 text-neutral-400 text-base sm:text-lg">
            بدلاً من الكلام النظري، إليك كيف يتعامل البرنامج مع أبرز تحديات المصورين وأصحاب المطابع يومياً.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-center gap-3 mb-10 overflow-x-auto pb-2 no-scrollbar">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setActiveTab(sc.id)}
              className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2.5 shrink-0 cursor-pointer border ${
                activeTab === sc.id
                  ? 'bg-gradient-to-r from-brand-500 to-sky-500 text-white border-transparent shadow-lg shadow-brand-500/30 scale-105'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-neutral-400'
              }`}
            >
              <span>{sc.badge}</span>
            </button>
          ))}
        </div>

        {/* Scenario Card View */}
        <div className="rounded-3xl border border-white/15 bg-ink-900/60 backdrop-blur-md p-6 sm:p-10 shadow-2xl">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            {/* Left/Main Column: Problem vs Solution */}
            <div className="md:col-span-8 space-y-6 text-right">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${currentScenario.accent} text-white shadow-md`}>
                  <ScenarioIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-brand-400 uppercase tracking-widest block">
                    {currentScenario.badge}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                    {currentScenario.title}
                  </h3>
                </div>
              </div>

              {/* Problem vs Solution Comparison Box */}
              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-400 mb-1">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>المشكلة بالطرق القديمة (فوتوشوب / يدوياً):</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-rose-100/90 pr-6">
                    {currentScenario.problem}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>الحل المباشر بـ Grido Studio:</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-emerald-100/90 pr-6">
                    {currentScenario.solution}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Performance Stats */}
            <div className="md:col-span-4 bg-ink-950 p-6 rounded-2xl border border-white/10 space-y-5 text-center">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                نتيجة الأداء الفعلي
              </div>
              <div className="text-2xl font-black text-emerald-400 bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20 shadow-xs">
                {currentScenario.timeSaved}
              </div>

              <div className="space-y-3 pt-2">
                {currentScenario.stats.map((st) => (
                  <div key={st.label} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                    <span className="text-neutral-400">{st.label}</span>
                    <span className="font-bold text-white font-mono">{st.val}</span>
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
