import {
  Cloud,
  HardDrive,
  Monitor,
  Palette,
  Printer,
  Save,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const PERKS = [
  {
    icon: Monitor,
    title: "واجهة داكنة، تفاصيل واضحة",
    desc: "لوحات مرتبة بدرجات رمادي محايدة تمنحك مساحة صافية للصورة دون إجهاد أو تشويه للألوان.",
  },
  {
    icon: Save,
    title: "حفظ تلقائي للمسودة",
    desc: "يساعدك على استعادة مسودة العمل عند الإغلاق المفاجئ، مع إمكانية حفظ نسخ المشاريع المهمة.",
  },
  {
    icon: Printer,
    title: "إعدادات طباعة مرنة",
    desc: "اضبط مقاس الورق والهوامش واختر الطابعة المثبتة من نظام ويندوز مباشرة.",
  },
];

const ARCHITECTURE_PILLARS = [
  {
    icon: HardDrive,
    badge: "على جهازك",
    badgeClass:
      "border-status-success/25 bg-status-success/10 text-status-success",
    title: "التحرير والتخطيط والطباعة",
    desc: "تعمل محلياً على جهازك دون انتظار رفع الملفات أو الاعتماد على اتصال دائم.",
  },
  {
    icon: Cloud,
    badge: "عند الطلب",
    badgeClass: "border-brand-primary/30 bg-brand-primary/10 text-brand-light",
    title: "أدوات الذكاء الاصطناعي السحابية",
    desc: "اختيارية بالكامل للترميم والتحسين المتقدم، وتتطلب اتصالاً عند تشغيلها فقط.",
  },
  {
    icon: Palette,
    badge: "معايرة واقعية",
    badgeClass: "border-white/12 bg-white/[0.04] text-text-secondary",
    title: "ألوان الطباعة والورق",
    desc: "تعتمد النتيجة على ملف الألوان والورق والطابعة، وقد تختلف عن الشاشة. جرّب إعداداتك الفعلية قبل اعتماد النتائج.",
  },
];

export function Windows11Section() {
  return (
    <section
      id="windows-experience"
      className="landing-section landing-section-bordered relative"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-6 text-start">
            <SectionHeader
              eyebrow="تجربة سطح المكتب"
              title="مساحة عمل مريحة على ويندوز"
              description="أدوات سطح مكتب تجمع التحرير والتخطيط والطباعة في برنامج واحد متناغم مع بيئة ويندوز."
              align="start"
              size="lg"
              gap="none"
            />

            <dl className="mt-8 space-y-5">
              {PERKS.map((perk) => {
                const Icon = perk.icon;
                return (
                  <div
                    key={perk.title}
                    className="flex items-start gap-4 border-t border-white/[0.07] pt-5 first:border-t-0 first:pt-0"
                  >
                    <span className="landing-icon-badge mt-0.5">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-sm font-semibold text-text-primary leading-relaxed">
                        {perk.title}
                      </dt>
                      <dd className="mt-1 text-sm text-text-secondary leading-7">
                        {perk.desc}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="lg:col-span-6 landing-card p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-semibold text-text-primary leading-relaxed">
                  على جهازك، وباختيارك
                </h3>
                <p className="text-xs text-text-secondary">
                  توازن واضح بين الأداء المحلي والقدرات السحابية الاختيارية
                </p>
              </div>
              <span
                dir="ltr"
                className="rounded-md border border-white/10 bg-inset px-2.5 py-1 font-mono text-[11px] text-text-secondary shrink-0"
              >
                Windows 10 / 11
              </span>
            </div>

            <dl className="mt-5 space-y-3.5">
              {ARCHITECTURE_PILLARS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="landing-metric-tile p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <dt className="flex items-center gap-2.5 text-sm font-semibold text-text-primary">
                        <Icon
                          aria-hidden="true"
                          className="h-4 w-4 text-brand-light shrink-0"
                        />
                        <span>{item.title}</span>
                      </dt>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${item.badgeClass}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <dd className="mt-2 text-sm text-text-secondary leading-7">
                      {item.desc}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
