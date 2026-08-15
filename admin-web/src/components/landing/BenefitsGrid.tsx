import { Monitor, LayoutGrid, Sparkles, Zap, Printer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const BENEFITS: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Monitor,
    title: 'خفيف ويدعم كل الأجهزة',
    description: 'يعمل بسلاسة فائقة على جميع إصدارات ويندوز، خفيف ولا يستهلك الرام والمعالج.',
  },
  {
    icon: LayoutGrid,
    title: 'واجهة هندسية فائقة السهولة',
    description: 'واجهة نظيفة قائمة على الأيقونات تناسب الجميع بدون الحاجة لأي خبرة سابقة في فوتوشوب.',
  },
  {
    icon: Sparkles,
    title: 'جودة استوديو وترميم HD',
    description: 'استعادة ملامح الوجه ومسام البشرة الطبيعية وتوازن الإضاءة بالذكاء الاصطناعي.',
  },
  {
    icon: Zap,
    title: 'توفير الوقت والأرباح',
    description: 'أتمتة كاملة لقص وتوزيع الصور والحفظ بنقرة واحدة خلال 3 ثوانٍ فقط.',
  },
  {
    icon: Printer,
    title: 'جاهز للطباعة فوراً',
    description: 'دعم كامل لمعايير CMYK و 300 DPI الاحترافية المتوافقة مع جميع طابعات الاستوديوهات.',
  },
];

export function BenefitsGrid() {
  return (
    <section id="benefits" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <SectionHeading
          eyebrow="المزايا والقدرات"
          title="لماذا يختار أصحاب الاستوديوهات Grido Studio؟"
          subtitle="سرعة خارقة، دقة متناهية، وتوفير حقيقي للوقت والجهد والمصروفات."
          index="05"
        />

        {/* 5 Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="rounded-lg p-6 flex flex-col items-start justify-between text-start relative bg-[#191b1e] border border-[rgba(214,235,253,0.19)] transition-colors min-h-[220px]"
              >
                {/* Header Icon + Number */}
                <div className="w-full flex items-center justify-between">
                  <div className="w-10 h-10 rounded-md bg-[#000000] border border-[rgba(214,235,253,0.19)] flex items-center justify-center text-[#00a3ff]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-[#52595b]" dir="ltr">
                    0{index + 1}
                  </span>
                </div>

                <div className="space-y-1.5 mt-6">
                  <h3 className="text-base font-normal font-serif text-[#f0f0f0]">
                    {benefit.title}
                  </h3>
                  <p className="text-xs text-[#a1a4a5] leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


