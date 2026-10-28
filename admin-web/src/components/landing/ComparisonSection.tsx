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
    <section id="comparison" className="landing-section relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="من أدوات متفرقة إلى سير عمل واحد"
          description="مقارنة خطوات العمل، دون افتراض نتائج ثابتة للسرعة أو استهلاك الورق."
        />

        <div className="landing-card p-5 sm:p-8">
          <div
            className="hidden md:grid grid-cols-12 gap-6 pb-4 border-b border-border-subtle text-sm font-semibold text-text-primary"
            aria-hidden="true"
          >
            <span className="col-span-2">المهمة</span>
            <span className="col-span-5">أدوات منفصلة</span>
            <span className="col-span-5">استوديو جريدو</span>
          </div>
          <ul className="divide-y divide-border-subtle">
            {COMPARISON_ROWS.map((item) => (
              <li
                key={item.title}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 py-5 first:pt-0 md:first:pt-5 last:pb-0"
              >
                <h3 className="md:col-span-2 text-sm font-semibold text-text-primary leading-7">
                  {item.title}
                </h3>
                <p className="md:col-span-5 text-sm text-text-secondary leading-7">
                  <span className="block text-xs font-medium text-text-muted md:sr-only">
                    أدوات منفصلة
                  </span>
                  {item.separate}
                </p>
                <p className="md:col-span-5 text-sm text-text-primary leading-7">
                  <span className="block text-xs font-medium text-text-secondary md:sr-only">
                    استوديو جريدو
                  </span>
                  {item.grido}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
