import { Link } from "react-router-dom";
import { useAppVersion } from "../../lib/version";
import { WHATSAPP_URL } from "./WhatsAppButton";

export function Footer() {
  const version = useAppVersion();

  return (
    <footer className="landing-footer text-sm text-text-secondary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-border-subtle pb-8 md:grid-cols-12">
          <div className="col-span-2 md:col-span-5">
            <a
              href="#top"
              className="inline-flex min-h-11 items-center gap-2.5 rounded-md"
            >
              <img
                src="/logo.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <span
                dir="ltr"
                className="text-base font-semibold text-text-primary"
              >
                Grido Studio
              </span>
            </a>
            <p className="mt-2 max-w-sm leading-relaxed">
              أدوات صور الهوية والكولاج والطباعة، لاستوديوهات التصوير ومراكز
              الطباعة.
            </p>
            <p className="mt-4 flex items-center gap-3 text-xs text-text-muted">
              <span>
                لنظام <bdi>Windows</bdi>
              </span>
              {version && (
                <span dir="ltr" className="font-mono">
                  v{version}
                </span>
              )}
            </p>
          </div>

          <nav
            className="md:col-span-3"
            aria-labelledby="footer-navigation-heading"
          >
            <h2
              id="footer-navigation-heading"
              className="mb-2 text-sm font-semibold"
            >
              استكشف
            </h2>
            <ul>
              <li>
                <a href="#capabilities" className="landing-text-link">
                  المميزات
                </a>
              </li>
              <li>
                <a href="#ai-engine" className="landing-text-link">
                  الذكاء الاصطناعي
                </a>
              </li>
              <li>
                <a href="#windows-experience" className="landing-text-link">
                  ويندوز 11
                </a>
              </li>
              <li>
                <a href="#pricing" className="landing-text-link">
                  الأسعار والتراخيص
                </a>
              </li>
            </ul>
          </nav>

          <nav
            className="md:col-span-4"
            aria-labelledby="footer-support-heading"
          >
            <h2
              id="footer-support-heading"
              className="mb-2 text-sm font-semibold"
            >
              المساعدة والخصوصية
            </h2>
            <ul>
              <li>
                <a href="#faq" className="landing-text-link">
                  الأسئلة الشائعة
                </a>
              </li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="landing-text-link"
                >
                  تواصل معنا
                </a>
              </li>
              <li>
                <Link to="/privacy" className="landing-text-link">
                  سياسة الخصوصية
                </Link>
              </li>
              <li>
                <Link to="/terms" className="landing-text-link">
                  شروط الخدمة
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="pt-5 text-xs leading-relaxed text-text-muted">
          جميع الحقوق محفوظة © {new Date().getFullYear()} Grido Studio.
        </p>
      </div>
    </footer>
  );
}
