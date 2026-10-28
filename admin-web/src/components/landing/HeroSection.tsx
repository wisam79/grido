import { useState } from "react";
import { Download } from "lucide-react";
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
        <div className="max-w-3xl mx-auto mb-8 sm:mb-10 flex flex-col items-center text-center">
          <p className="mb-4 flex min-h-6 items-center gap-3 text-xs font-medium text-text-secondary">
            <span>
              Grido Studio لـ <bdi>Windows</bdi>
            </span>
            {version && (
              <span dir="ltr" className="font-mono text-text-muted">
                v{version}
              </span>
            )}
          </p>

          <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-bold tracking-tight leading-[1.3] text-balance">
            صور الهوية والطباعة،
            <span className="block text-brand-light">في استوديو واحد.</span>
          </h1>

          <p className="mt-5 max-w-xl text-sm sm:text-base text-text-secondary leading-[1.8] text-balance">
            عزل الخلفية، تجهيز صور الجوازات والفيزا، وتوزيعها على ورقة الطباعة —
            بأدوات مصممة لعمل الاستوديو اليومي.
          </p>

          <div className="mt-6 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary h-12 px-6"
            >
              <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>تحميل النسخة التجريبية مجاناً</span>
            </a>
            <button
              type="button"
              onClick={() => setShowTour(true)}
              className="btn-secondary h-12 px-6"
            >
              جولة في 3 خطوات
            </button>
          </div>

          <ul
            className="landing-facts mt-6 justify-center"
            aria-label="معلومات البرنامج"
          >
            <li className="landing-fact">عزل وطباعة محليان</li>
            <li className="landing-fact">ترخيص دائم بدفعة واحدة</li>
          </ul>
        </div>

        <AppMockup paused={showTour} />
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
