import { HardDrive, LayoutGrid, ScanFace } from "lucide-react";
import { USAGE_EXAMPLES } from "../../data/landing-content";
import { SectionHeader } from "./SectionHeader";

const SCENARIO_META: Record<
  string,
  { icon: typeof ScanFace; index: string; tags: string[] }
> = {
  "test-1": {
    icon: ScanFace,
    index: "01",
    tags: ["35×45 mm", "50×50 mm", "مراجعة التأطير"],
  },
  "test-2": {
    icon: LayoutGrid,
    index: "02",
    tags: ["شبكة منتظمة", "هوامش الأمان", "خطوط القص"],
  },
  "test-3": {
    icon: HardDrive,
    index: "03",
    tags: ["عمل محلي", "ترميم سحابي اختياري"],
  },
};

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="landing-section landing-section-bordered relative"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="سيناريوهات العمل"
          title="أمثلة من استخدامات الاستوديو"
          description="سيناريوهات توضيحية لاستخدام الأدوات، وليست شهادات عملاء موثقة."
        />

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {USAGE_EXAMPLES.map((item, idx) => {
            const meta = SCENARIO_META[item.id] ?? {
              icon: ScanFace,
              index: `0${idx + 1}`,
              tags: [],
            };
            const Icon = meta.icon;

            return (
              <li
                key={item.id}
                className="landing-card landing-card-hoverable flex flex-col justify-between p-5 sm:p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <span className="landing-icon-badge">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span
                      dir="ltr"
                      aria-hidden="true"
                      className="font-mono text-xs font-semibold text-text-muted tabular-nums"
                    >
                      {meta.index}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-text-primary leading-relaxed">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm text-text-secondary leading-7">
                    {item.description}
                  </p>
                </div>

                {meta.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-1.5 border-t border-white/[0.07] pt-4">
                    {meta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-white/[0.08] bg-inset px-2.5 py-1 text-[11px] text-text-secondary"
                      >
                        <bdi>{tag}</bdi>
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
