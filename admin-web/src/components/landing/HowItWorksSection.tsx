import { FolderOpen, LayoutGrid, Printer, Workflow, ArrowLeft } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

/**
 * قسم «كيف يعمل» — ثلاث خطوات مرقّمة تربط الهيرو بقسم المميزات.
 * يجيب على سؤال الزائر الأول: «ماذا يحدث بعد التحميل؟» بأقل نصوص ممكنة (Icon-Driven).
 */
const STEPS = [
  {
    icon: FolderOpen,
    step: 'STEP 01',
    title: 'أسقِط الصورة',
    desc: 'اسحب صورة الزبون من أي مجلد أو كاميرا — بدون استيراد معقد أو تحضير مسبق.',
  },
  {
    icon: LayoutGrid,
    step: 'STEP 02',
    title: 'اختر المقاس',
    desc: 'هوية أحوال، فيزا، بطاقة وطنية — التوسيط والخلفية والشبكة تُضبط تلقائياً.',
  },
  {
    icon: Printer,
    step: 'STEP 03',
    title: 'اطبع فوراً',
    desc: 'ورقة جاهزة بـ 300DPI وعلامات قص دقيقة — من الاستلام إلى التسليم في ثوانٍ.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-14 sm:py-20 lg:py-24 border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={Workflow}
          eyebrow="خط سير العمل"
          title={<>من الصورة الخام إلى الورقة المطبوعة</>}
          subtitle="ثلاث خطوات فقط — لا قوائم مخفية ولا إعدادات معقدة."
          index="01"
        />

        <div className="stagger-4 relative grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {/* الخط الواصل بين الخطوات (سطح المكتب فقط) */}
          <div aria-hidden className="hidden md:block absolute top-1/2 inset-x-16 h-px border-t border-dashed border-subtle -translate-y-1/2" />

          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="spotlight-card relative rounded-2xl bg-secondary border border-subtle p-6 sm:p-7 text-center overflow-hidden">
                <span className="block text-[10px] font-mono font-extrabold text-tertiary tracking-[2.5px] uppercase" dir="ltr">
                  {s.step}
                </span>
                <div
                  className="benefit-icon relative z-10 mx-auto my-5 w-16 h-16 rounded-2xl bg-elevated border border-subtle flex items-center justify-center"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <Icon className="w-7 h-7 text-white" aria-hidden />
                </div>
                <h3 className="relative z-10 text-lg font-black font-display text-white">{s.title}</h3>
                <p className="relative z-10 mt-2 text-xs sm:text-sm text-tertiary leading-relaxed font-sans font-medium">
                  {s.desc}
                </p>

                {/* سهم اتجاهي بين البطاقات */}
                {i < STEPS.length - 1 && (
                  <ArrowLeft aria-hidden className="hidden md:block absolute top-1/2 -left-3 -translate-y-1/2 w-5 h-5 text-tertiary z-20" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
