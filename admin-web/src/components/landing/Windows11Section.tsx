import { SectionHeader } from "./SectionHeader";

const PERKS = [
  {
    title: "واجهة داكنة، تفاصيل واضحة",
    desc: "لوحات مرتبة ومساحة للصورة أثناء التحرير.",
  },
  {
    title: "حفظ تلقائي للمسودة",
    desc: "يساعدك على استعادة المسودة؛ احفظ نسخة من المشاريع المهمة.",
  },
  {
    title: "إعدادات طباعة مرنة",
    desc: "اضبط مقاس الورق والهوامش واختر الطابعة من إعدادات ويندوز.",
  },
];

export function Windows11Section() {
  return (
    <section id="windows-experience" className="landing-section relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 text-start">
            <SectionHeader
              title="مساحة عمل مريحة على ويندوز"
              description="أدوات سطح مكتب تجمع التحرير والتخطيط والطباعة في برنامج واحد."
              align="start"
              size="lg"
              gap="none"
            />

            <dl className="mt-6 divide-y divide-border-subtle">
              {PERKS.map((perk) => (
                <div key={perk.title} className="py-4 first:pt-0 last:pb-0">
                  <dt className="text-sm font-semibold text-text-primary leading-relaxed">
                    {perk.title}
                  </dt>
                  <dd className="mt-1 text-sm text-text-secondary leading-7">
                    {perk.desc}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-6 landing-card p-5 sm:p-8">
            <h3 className="text-base font-semibold text-text-primary leading-relaxed">
              على جهازك، وباختيارك
            </h3>
            <dl className="mt-5 divide-y divide-border-subtle">
              <div className="py-4 first:pt-0">
                <dt className="text-sm font-medium text-text-primary">
                  التحرير والتخطيط والطباعة
                </dt>
                <dd className="mt-2 text-sm text-text-secondary leading-7">
                  تعمل محلياً على جهازك.
                </dd>
              </div>
              <div className="py-4">
                <dt className="text-sm font-medium text-text-primary">
                  أدوات الذكاء الاصطناعي السحابية
                </dt>
                <dd className="mt-2 text-sm text-text-secondary leading-7">
                  اختيارية وتتطلب اتصالاً عند استخدامها.
                </dd>
              </div>
              <div className="py-4 last:pb-0">
                <dt className="text-sm font-medium text-text-primary">
                  ألوان الطباعة
                </dt>
                <dd className="mt-2 text-sm text-text-secondary leading-7">
                  تعتمد على ملف الألوان والورق والطابعة، وقد تختلف عن الشاشة.
                  جرّب إعداداتك الفعلية قبل اعتماد النتائج.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
