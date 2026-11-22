import { useState } from "react";
import { Download, KeyRound, Play, Printer, ShieldCheck } from "lucide-react";
import { AppMockup } from "./AppMockup";
import { TourModal } from "../common/TourModal";
import { useAppVersion, GITHUB_RELEASE_DOWNLOAD_URL } from "../../lib/version";

const QUICK_TOUR_STEPS = [
  {
    title: "افتح صورة الزبون",
    description:
      "استورد الصورة من الكاميرا أو الجوال، ثم اختر مقاس الجواز أو الفيزا واضبط التأطير.",
  },
  {
    title: "اعزل الخلفية محلياً",
    description:
      "استخدم أداة عزل الخلفية، ثم راجع النتيجة وعدّل اللون قبل الطباعة.",
  },
  {
    title: "جهّز ورقة الطباعة",
    description:
      "اختر توزيع الصور ومقاس الورقة وخطوط القص، ثم أرسل التصميم إلى الطابعة.",
  },
];

export function HeroSection() {
  const [showTour, setShowTour] = useState(false);
  const version = useAppVersion();

  return (
    <section id="top" className="landing-hero">
      <div aria-hidden="true" className="landing-hero-light" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto mb-0 md:mb-12 flex flex-col items-center text-center">
          <p className="mb-6 inline-flex flex-wrap items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-brand-primary"
            />
            <span>
              تطبيق سطح مكتب لنظام{" "}
              <bdi dir="ltr" className="font-semibold text-text-primary">
                Windows 10 / 11
              </bdi>
            </span>
            {version && (
              <>
                <span aria-hidden="true" className="h-3 w-px bg-white/15" />
                <span
                  dir="ltr"
                  className="font-mono text-[11px] font-semibold text-brand-light"
                >
                  v{version}
                </span>
              </>
            )}
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-bold tracking-tight leading-[1.2] text-balance text-text-primary">
            صور الهوية والطباعة،
            <span className="landing-headline-accent block mt-1">
              في استوديو واحد.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-sm sm:text-base lg:text-[17px] text-text-secondary leading-[1.85] text-balance">
            عزل الخلفية، تجهيز صور الجوازات والفيزا، وتوزيعها بدقة على ورقة
            الطباعة مع خطوط القص — في برنامج سطح مكتب مصمم لعمل الاستوديو اليومي.
          </p>

          <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary h-12 px-7 text-sm"
            >
              <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>تحميل النسخة التجريبية مجاناً</span>
            </a>
            <button
              type="button"
              onClick={() => setShowTour(true)}
              className="btn-secondary h-12 px-6 text-sm"
            >
              <Play
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-brand-light"
              />
              <span>جولة في 3 خطوات</span>
            </button>
          </div>

          <ul
            className="landing-facts mt-7 justify-center"
            aria-label="معلومات البرنامج"
          >
            <li className="landing-fact">
              <ShieldCheck
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-status-success"
              />
              <span>عزل وطباعة محليان</span>
            </li>
            <li className="landing-fact">
              <Printer
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-brand-light"
              />
              <span>
                إخراج طباعة <bdi dir="ltr">300 DPI</bdi>
              </span>
            </li>
            <li className="landing-fact">
              <KeyRound
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-text-secondary"
              />
              <span>ترخيص دائم بدفعة واحدة</span>
            </li>
          </ul>
        </div>

        <div className="hidden md:block">
          <AppMockup paused={showTour} />
        </div>
      </div>

      <TourModal
        open={showTour}
        onClose={() => setShowTour(false)}
        title="جولة سريعة: كيف يعمل استوديو جريدو؟"
        steps={QUICK_TOUR_STEPS}
      />
    </section>
  );
}
