import { USAGE_EXAMPLES } from "../../data/landing-content";
import { SectionHeader } from "./SectionHeader";

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="landing-section relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="أمثلة من استخدامات الاستوديو"
          description="سيناريوهات توضيحية لاستخدام الأدوات، وليست شهادات عملاء موثقة."
        />

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {USAGE_EXAMPLES.map((item) => (
            <li key={item.id} className="landing-card p-5 sm:p-6">
              <h3 className="text-base font-semibold text-text-primary leading-relaxed">
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-text-secondary leading-7">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
