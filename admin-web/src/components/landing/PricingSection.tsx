import { Check, Download, MessageCircle } from 'lucide-react';
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

const PLANS: Plan[] = [
  {
    id: 'trial',
    title: 'التجريبية (7 أيام)',
    audience: 'تجربة مجانية كاملة الميزات بدون قيود',
    features: [
      'تجربة مجانية كاملة لمدة 7 أيام',
      'قص وتنسيق صور الهوية والمعاملات في 3 ثوانٍ',
      'مصمم كولاج شبكي ديناميكي كامل',
      'طباعة عالية الدقة 300DPI مع علامات القص',
      'ترميم الوجوه بالذكاء الاصطناعي',
      'يعمل محلياً بالكامل بدون إنترنت',
    ],
    cta: { label: 'ابدأ التجربة المجانية', href: GITHUB_RELEASE_DOWNLOAD_URL, external: true },
  },
  {
    id: 'pro',
    title: 'الاحترافية (PRO)',
    audience: 'للاستوديوهات ومحلات التصوير العاملة يومياً',
    features: [
      'تفعيل دائم بدون أي حد زمني',
      'تصدير نظيف بدون أي علامة مائية',
      'عزل الخلفية بالذكاء الاصطناعي محلياً وبنقرة واحدة',
      'ترميم ملامح الوجه بالذكاء الاصطناعي يومياً',
      'ترميم الكولاج دفعة واحدة (AI Batch)',
      'تحديثات تلقائية مجانية وموقعة رقمياً',
      'دعم فني مباشر عبر واتساب',
    ],
    cta: {
      label: 'تفعيل النسخة الاحترافية',
      href: 'https://wa.me/9647811942002?text=' + encodeURIComponent('مرحباً، أود تفعيل النسخة الاحترافية (Pro) لتطبيق Grido Studio'),
      external: true,
    },
    highlighted: true,
  },
  {
    id: 'enterprise',
    title: 'المؤسسات والمطابع',
    audience: 'للمطابع التجارية وسلاسل الاستوديوهات',
    features: [
      'كل مزايا النسخة الاحترافية بالكامل',
      'ترميم مكثف بالذكاء الاصطناعي مع حصص موسعة',
      'تراخيص متعددة لعدة أجهزة بنفس المعمل',
      'خيار التفعيل الدائم (مدى الحياة)',
      'أولوية قصوى في الدعم الفني والتخصيص',
    ],
    cta: {
      label: 'تواصل مع الوكيل المعتمد',
      href: 'https://wa.me/9647811942002?text=' + encodeURIComponent('مرحباً، أود الاستفسار عن باقة المؤسسات والمطابع (Enterprise) لتطبيق Grido Studio'),
      external: true,
    },
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="خطط الترخيص والتفعيل"
          title="تجربة مجانية لمدة 7 أيام… ثم تفعيل دائم لمطبعتك"
          subtitle="جرّب كافة الميزات والذكاء الاصطناعي مجاناً لمدة أسبوع كامل، ثم اختر الباقة المناسبة لحجم عملك."
          index="06"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-lg p-6 sm:p-8 flex flex-col text-right relative bg-[#191b1e] border ${
                plan.highlighted
                  ? 'border-[#00a3ff]'
                  : 'border-[rgba(214,235,253,0.19)]'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute top-4 left-4 px-2.5 py-0.5 rounded bg-[#00a3ff] text-white text-[10px] font-mono">
                  الأكثر طلباً
                </span>
              )}

              <div className="flex flex-col h-full space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-normal font-serif text-[#f0f0f0]">{plan.title}</h3>
                  <p className="text-[#a1a4a5] text-xs">{plan.audience}</p>
                </div>

                <ul className="space-y-3 pt-4 border-t border-[rgba(214,235,253,0.19)] flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs sm:text-sm text-[#a1a4a5]">
                      <Check className="w-4 h-4 text-[#00a3ff] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.cta.href}
                  {...(plan.cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={`mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer ${
                    plan.highlighted
                      ? 'button-primary !w-full'
                      : 'button-secondary !w-full'
                  }`}
                >
                  {plan.highlighted ? (
                    <MessageCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <Download className="w-4 h-4 shrink-0" />
                  )}
                  <span>{plan.cta.label}</span>
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs font-mono text-[#a1a4a5]">
          تفعيل فوري عبر الوكيل المعتمد • بدون أي اشتراكات إجبارية أو رسوم خفية
        </p>
      </div>
    </section>
  );
}

