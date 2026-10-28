import { Check, Download, MessageCircle } from "lucide-react";
import { CURRENCIES, type CurrencyCode } from "../../data/landing-content";
import { GITHUB_RELEASE_DOWNLOAD_URL } from "../../lib/version";
import { WHATSAPP_NUMBER } from "./WhatsAppButton";
import { SectionHeader } from "./SectionHeader";

const FEATURES = [
  "تحرير وتخطيط وطباعة محلية على جهازك",
  "ترميم سحابي اختياري يحتاج إلى اتصال عند استخدامه",
  <>
    تصدير بدقة <bdi dir="ltr">300 DPI</bdi> ودعم <bdi dir="ltr">CMYK</bdi>
  </>,
  "قوالب لمقاسات صور الجوازات والفيزا الشائعة",
  "كولاج وشبكات حرة ومحاذاة مغناطيسية",
  "هوامش وخطوط قص قابلة للضبط",
];

const GUARANTEES = [
  {
    title: "جرّب على معداتك قبل الشراء",
    desc: "اختبر القص والتأطير والطباعة على جهازك وطابعتك الفعلية مجاناً.",
  },
  {
    title: "تحديثات مجانية للأبد",
    desc: "ترخيص مدى الحياة يشمل تحديثات البرنامج دون اشتراك دوري.",
  },
  {
    title: "تفعيل ودعم مباشر",
    desc: "مفتاح رقمي دائم، مع مساعدة في الإعداد ونقل التفعيل عند تغيير الجهاز.",
  },
];

interface PricingSectionProps {
  currency?: CurrencyCode;
  onCurrencyChange?: (c: CurrencyCode) => void;
}

export function PricingSection({
  currency = "IQD",
  onCurrencyChange,
}: PricingSectionProps) {
  const currentCurr = CURRENCIES[currency] || CURRENCIES.IQD;
  const purchaseUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `مرحباً، أود طلب مفتاح ترخيص Grido Studio النسخة الكاملة (${currentCurr.priceFormatted} ${currentCurr.unit})`,
  )}`;

  return (
    <section id="pricing" className="landing-section relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="رخصة دائمة، بدفعة واحدة"
          description="بلا اشتراكات دورية، مع تجربة مجانية قبل الشراء."
        />

        {onCurrencyChange && (
          <div className="flex justify-center mb-8">
            <div
              className="landing-switch"
              role="group"
              aria-label="عملة الترخيص"
            >
              {(["IQD", "SAR", "USD"] as CurrencyCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onCurrencyChange(code)}
                  className="min-h-11 min-w-11 px-3 py-2 text-sm font-medium leading-relaxed"
                  aria-pressed={currentCurr.code === code}
                >
                  <bdi>{CURRENCIES[code].symbol}</bdi> {CURRENCIES[code].name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7 landing-card p-5 sm:p-8">
            <div className="pb-6 border-b border-border-subtle">
              <h3 className="text-xl font-semibold text-text-primary">
                <bdi dir="ltr">Grido Studio</bdi>
              </h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                النسخة الكاملة — ترخيص مدى الحياة
              </p>

              <div
                className="mt-5 flex flex-wrap items-baseline gap-3"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="text-sm text-text-muted">
                  <span className="sr-only">السعر السابق </span>
                  <del>
                    <bdi dir="ltr" className="font-mono tabular-nums">
                      {currentCurr.originalPriceFormatted}
                    </bdi>
                  </del>
                </span>
                <span className="text-4xl sm:text-5xl font-semibold text-text-primary">
                  <span className="sr-only">السعر الحالي </span>
                  <bdi dir="ltr" className="font-mono tabular-nums">
                    {currentCurr.priceFormatted}
                  </bdi>
                </span>
                <bdi className="text-sm font-medium text-text-secondary">
                  {currentCurr.unit}
                </bdi>
              </div>
            </div>

            <ul className="space-y-3 py-6">
              {FEATURES.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-text-primary leading-7"
                >
                  <Check
                    className="w-4 h-4 mt-1.5 text-text-secondary shrink-0"
                    aria-hidden="true"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-3">
              <a
                href={purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full min-h-12 justify-center gap-2 text-sm leading-relaxed"
              >
                <MessageCircle
                  className="w-4 h-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  طلب مفتاح الترخيص (
                  <bdi dir="ltr">{currentCurr.priceFormatted}</bdi>{" "}
                  <bdi>{currentCurr.unit}</bdi>)
                </span>
              </a>
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full min-h-11 justify-center gap-2 text-sm leading-relaxed"
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>حمّل وجرّب مجاناً</span>
              </a>
            </div>
          </div>

          <dl className="lg:col-span-5 divide-y divide-border-subtle">
            {GUARANTEES.map((item) => (
              <div key={item.title} className="py-6 first:pt-0 last:pb-0">
                <dt className="text-base font-semibold text-text-primary leading-relaxed">
                  {item.title}
                </dt>
                <dd className="mt-2 text-sm text-text-secondary leading-7">
                  {item.desc}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
