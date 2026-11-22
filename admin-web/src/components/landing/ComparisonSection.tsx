import { Check, Minus } from "lucide-react";
import { GridoBrandMark } from "../common/GridoBrandMark";
import { SectionHeader } from "./SectionHeader";

const COMPARISON_ROWS = [
  {
    title: "إعداد الصورة",
    separate: "تنتقل بين أدوات القص والعزل وترتيب الورقة.",
    grido: "قص وضبط المقاسات وتوزيع الصور في مساحة عمل واحدة.",
  },
  {
    title: "المقاسات",
    separate: "تدخل المقاس وتراجع متطلبات الجهة يدوياً.",
    grido:
      "قوالب للمقاسات الشائعة مع إمكانية الضبط؛ راجع متطلبات الجهة المستلمة.",
  },
  {
    title: "تخطيط الورق",
    separate: "ترتب الصور وتضبط المسافات لكل ورقة.",
    grido: "توزيع شبكي وهوامش وخطوط قص قابلة للضبط.",
  },
  {
    title: "مكان المعالجة",
    separate: "يتحدد حسب الأدوات والخدمات التي تختارها.",
    grido:
      "تحرير وتخطيط وطباعة محلية؛ أدوات الذكاء الاصطناعي السحابية اختيارية.",
  },
  {
    title: "الترخيص",
    separate: "تختلف شروط الشراء أو الاشتراك حسب البرنامج.",
    grido: "رخصة دائمة بدفعة واحدة، مع تحديثات مجانية للأبد.",
  },
];

export function ComparisonSection() {
  return (
    <section
      id="comparison"
      className="landing-section landing-section-bordered relative"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="مقارنة سير العمل"
          title="من أدوات متفرقة إلى سير عمل واحد"
          description="مقارنة خطوات العمل اليومية، دون افتراض نتائج ثابتة للسرعة أو استهلاك الورق."
        />

        <div className="landing-card overflow-hidden">
          <div
            className="hidden md:grid grid-cols-12 border-b border-white/[0.08] text-sm font-semibold"
            aria-hidden="true"
          >
            <div className="col-span-2 px-6 py-4 text-text-secondary">
              المهمة
            </div>
            <div className="col-span-5 px-6 py-4 text-text-secondary border-s border-white/[0.06]">
              أدوات منفصلة
            </div>
            <div className="col-span-5 px-6 py-4 text-text-primary border-s border-brand-primary/20 bg-brand-primary/[0.07] flex items-center gap-2">
              <GridoBrandMark size={18} />
              <span>استوديو جريدو</span>
            </div>
          </div>

          <ul className="divide-y divide-white/[0.07]">
            {COMPARISON_ROWS.map((item) => (
              <li
                key={item.title}
                className="grid grid-cols-1 md:grid-cols-12"
              >
                <div className="md:col-span-2 px-5 pt-5 pb-2 md:px-6 md:py-5 flex items-start">
                  <h3 className="text-sm font-semibold text-text-primary leading-7">
                    {item.title}
                  </h3>
                </div>

                <div className="md:col-span-5 px-5 py-2.5 md:px-6 md:py-5 md:border-s md:border-white/[0.06]">
                  <span className="mb-1 block text-xs font-medium text-text-muted md:sr-only">
                    أدوات منفصلة
                  </span>
                  <p className="flex items-start gap-2.5 text-sm text-text-secondary leading-7">
                    <Minus
                      aria-hidden="true"
                      className="mt-1.5 h-4 w-4 shrink-0 text-text-muted/70"
                    />
                    <span>{item.separate}</span>
                  </p>
                </div>

                <div className="md:col-span-5 px-5 pt-2.5 pb-5 md:px-6 md:py-5 md:border-s md:border-brand-primary/20 bg-brand-primary/[0.04]">
                  <span className="mb-1 block text-xs font-medium text-brand-light md:sr-only">
                    استوديو جريدو
                  </span>
                  <p className="flex items-start gap-2.5 text-sm text-text-primary leading-7">
                    <span className="mt-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-brand-light">
                      <Check aria-hidden="true" className="h-3 w-3" />
                    </span>
                    <span>{item.grido}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
