import { Link } from "react-router-dom";
import { useAppVersion } from "../../lib/version";
import { GridoBrandMark } from "../common/GridoBrandMark";
import { WHATSAPP_URL } from "./WhatsAppButton";

export function Footer() {
  const version = useAppVersion();

  return (
    <footer className="landing-footer text-sm text-text-secondary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-white/[0.07] pb-10 md:grid-cols-12">
          <div className="col-span-2 md:col-span-5">
            <a
              href="#top"
              className="inline-flex min-h-11 items-center gap-2.5 rounded-md"
            >
              <GridoBrandMark size={28} />
              <span
                dir="ltr"
                className="text-base font-bold tracking-tight text-text-primary"
              >
                Grido Studio
              </span>
            </a>
            <p className="mt-2.5 max-w-sm leading-relaxed">
              أدوات صور الهوية والكولاج والطباعة، المصممة لاستوديوهات التصوير
              ومراكز الطباعة.
            </p>
            <p className="mt-4 inline-flex items-center gap-2.5 rounded-md border border-white/[0.08] bg-card/70 px-3 py-1.5 text-xs text-text-secondary">
              <span>
                لنظام <bdi dir="ltr">Windows 10 / 11</bdi>
              </span>
              {version && (
                <>
                  <span aria-hidden="true" className="h-3 w-px bg-white/15" />
                  <span dir="ltr" className="font-mono text-brand-light">
                    v{version}
                  </span>
                </>
              )}
            </p>
          </div>

          <nav
            className="md:col-span-3"
            aria-labelledby="footer-navigation-heading"
          >
            <h2
              id="footer-navigation-heading"
              className="mb-2.5 text-sm font-semibold text-text-primary"
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
              className="mb-2.5 text-sm font-semibold text-text-primary"
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

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 text-xs leading-relaxed text-text-muted">
          <p>
            جميع الحقوق محفوظة © {new Date().getFullYear()}{" "}
            <bdi dir="ltr">Grido Studio</bdi>.
          </p>
          <p>تصميم محلي لسطح المكتب</p>
        </div>
      </div>
    </footer>
  );
}
