import { Download } from "lucide-react";
import { GITHUB_RELEASE_DOWNLOAD_URL } from "../../lib/version";
import { SectionHeader } from "./SectionHeader";

export function CtaBanner() {
  return (
    <section className="landing-section">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="landing-card grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <SectionHeader
            title="جرّب جريدو في استوديوك"
            description="حمّل النسخة التجريبية، وجهّز أول ورقة طباعة."
            align="start"
            size="lg"
            gap="none"
          />
          <div className="flex flex-col items-stretch gap-1 sm:items-start lg:items-center">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary h-12 px-6"
            >
              <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>تحميل مباشر لـ Windows</span>
            </a>
            <a href="#pricing" className="landing-text-link justify-center">
              عرض الترخيص والأسعار
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
