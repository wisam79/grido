import { Check, Crown, Download } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

interface Plan {
  id: string;
  title: string;
  audience: string;
  features: string[];
  cta: { label: string; href: string; external?: boolean };
  highlighted?: boolean;
}

// الخطط الحقيقية كما في التطبيق — الحصص اليومية مطابقة للخادم (5/15/50)
const PLANS: Plan[] = [
  {
    id: 'trial',
    title: 'التجريبية (7 أيام)',
    audience: 'تجربة مجانية كاملة الميزات',
    features: [
      'تجربة مجانية كاملة لمدة 7 أيام',
      'قص وتنسيق صور الهوية والمعاملات',
      'مصمم كولاج ديناميكي كامل',
      'طباعة عالية الدقة 300DPI مع خطوط القص',
      'الذكاء الاصطناعي لترميم الوجوه والتجميع',
    ],
    cta: { label: 'ابدأ التجربة المجانية (7 أيام)', href: GITHUB_RELEASE_DOWNLOAD_URL, external: true },
  },
  {
    id: 'pro',
    title: 'الاحترافية',
    audience: 'للاستوديوهات العاملة يومياً',
    features: [
      'كل المزايا بدون حد زمني',
      'تصدير نظيف بدون أي علامة مائية',
      'عزل الخلفية بالذكاء الاصطناعي محلياً',
      'ترميم الوجوه بالذكاء الاصطناعي يومياً',
      'ترميم الكولاج دفعة واحدة (AI Batch)',
      'تحديثات تلقائية موقعة وموثوقة',
    ],
    cta: { label: 'تواصل للتفعيل الفوري', href: '#faq' },
    highlighted: true,
  },
  {
    id: 'enterprise',
    title: 'المؤسسات',
    audience: 'للمطابع وسلاسل الاستوديوهات',
    features: [
      'كل مزايا النسخة الاحترافية',
      'ترميم مكثف بالذكاء الاصطناعي يومياً',
      'خيار التفعيل الدائم (مدى الحياة)',
      'أولوية قصوى في الدعم الفني',
    ],
    cta: { label: 'تواصل مع الوكيل المعتمد', href: '#faq' },
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative section-rhythm border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          icon={Crown}
          eyebrow="خطط الترخيص والتجربة"
          title={<>تجربة مجانية لمدة 7 أيام… ثم تفعيل سليم لعملك</>}
          subtitle="جرب جميع الميزات والذكاء الاصطناعي مجاناً لمدة أسبوع كامل، ثم فعّل الباقة المناسبة لمطبعتك."
          index="07"
        />

        <div className="stagger-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto items-stretch">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`spotlight-card rounded-2xl p-6 sm:p-8 flex flex-col text-right relative overflow-hidden bg-secondary transition-transform duration-500 hover:scale-[1.02] ${
                plan.highlighted ? 'border border-white/60' : 'border border-subtle'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white text-black text-[10px] font-extrabold">
                  الأكثر طلباً
                </span>
              )}

              <div className="relative z-10 flex flex-col h-full space-y-5">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black font-display text-white">{plan.title}</h3>
                  <p className="text-tertiary text-xs font-medium">{plan.audience}</p>
                </div>

                <ul className="space-y-3 pt-4 border-t border-subtle flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-secondary">
                      <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.cta.href}
                  {...(plan.cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={`magnetic-pill mt-2 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-extrabold text-sm transition-all duration-300 cursor-pointer ${
                    plan.highlighted
                      ? 'bg-white text-black border border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.35)]'
                      : 'bg-elevated text-secondary border border-subtle hover:border-white hover:text-white'
                  }`}
                >
                  {plan.cta.external && <Download className="w-3.5 h-3.5 shrink-0" />}
                  <span>{plan.cta.label}</span>
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="stagger-5 mt-8 text-center text-[11px] font-extrabold text-tertiary">
          الأسعار عند التفعيل عبر الوكيل المعتمد — بدون اشتراكات شهرية مفروضة
        </p>
      </div>
    </section>
  );
}
