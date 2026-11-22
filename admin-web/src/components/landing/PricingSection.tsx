import {
  Check,
  Download,
  Headphones,
  MessageCircle,
  MonitorCheck,
  RefreshCw,
} from "lucide-react";
import { CURRENCIES, type CurrencyCode } from "../../data/landing-content";
import { GITHUB_RELEASE_DOWNLOAD_URL } from "../../lib/version";
import { GridoBrandMark } from "../common/GridoBrandMark";
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
    icon: MonitorCheck,
    title: "جرّب على معداتك قبل الشراء",
    desc: "اختبر القص والتأطير والطباعة على جهازك وطابعتك الفعلية مجاناً قبل الترقية.",
  },
  {
    icon: RefreshCw,
    title: "تحديثات مجانية للأبد",
    desc: "ترخيص مدى الحياة يشمل تحديثات البرنامج دون أي اشتراك شهري أو رسوم متكررة.",
  },
  {
    icon: Headphones,
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
    <section
      id="pricing"
      className="landing-section landing-section-bordered relative"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="الترخيص والأسعار"
          title="رخصة دائمة، بدفعة واحدة"
          description="بلا اشتراكات دورية، مع تجربة مجانية كاملة قبل الشراء."
        />

        {onCurrencyChange && (
          <div className="flex justify-center mb-9">
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
                  className="min-h-11 min-w-11 px-3.5 py-2 text-sm font-medium leading-relaxed"
                  aria-pressed={currentCurr.code === code}
                >
                  <bdi>{CURRENCIES[code].symbol}</bdi> {CURRENCIES[code].name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-7 landing-card-featured p-6 sm:p-8">
            <div className="pb-6 border-b border-white/[0.08]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <GridoBrandMark size={28} />
                  <div>
                    <h3 className="text-xl font-bold text-text-primary leading-tight">
                      <bdi dir="ltr">Grido Studio</bdi>
                    </h3>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      النسخة الكاملة — ترخيص مدى الحياة
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-brand-primary/35 bg-brand-primary/12 px-3 py-1 text-xs font-semibold text-brand-light">
                  {currentCurr.note}
                </span>
              </div>

              <div
                className="mt-6 flex flex-wrap items-baseline gap-3"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
                  <span className="sr-only">السعر الحالي </span>
                  <bdi dir="ltr" className="font-mono tabular-nums">
                    {currentCurr.priceFormatted}
                  </bdi>
                </span>
                <bdi className="text-base font-medium text-text-secondary">
                  {currentCurr.unit}
                </bdi>
                <span className="text-sm text-text-muted ms-1">
                  <span className="sr-only">السعر السابق </span>
                  <del>
                    <bdi dir="ltr" className="font-mono tabular-nums">
                      {currentCurr.originalPriceFormatted}
                    </bdi>
                  </del>
                </span>
              </div>
            </div>

            <ul className="space-y-3.5 py-6">
              {FEATURES.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-text-primary leading-7"
                >
                  <span className="mt-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-brand-light">
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-3 pt-1">
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

          <dl className="lg:col-span-5 space-y-4">
            {GUARANTEES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="landing-card p-5 flex items-start gap-4"
                >
                  <span className="landing-icon-badge mt-0.5">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-sm sm:text-base font-semibold text-text-primary leading-relaxed">
                      {item.title}
                    </dt>
                    <dd className="mt-1.5 text-sm text-text-secondary leading-7">
                      {item.desc}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}
