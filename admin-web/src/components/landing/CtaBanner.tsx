import { Download } from "lucide-react";
import { GITHUB_RELEASE_DOWNLOAD_URL } from "../../lib/version";
import { GridoBrandMark } from "../common/GridoBrandMark";
import { SectionHeader } from "./SectionHeader";

export function CtaBanner() {
  return (
    <section
      id="cta-banner"
      className="landing-section landing-section-bordered"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="landing-card-featured relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          {/* Subtle architectural blueprint texture */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              maskImage:
                "radial-gradient(ellipse 75% 80% at 85% 50%, black, transparent 85%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 75% 80% at 85% 50%, black, transparent 85%)",
            }}
          />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-inset shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <GridoBrandMark size={34} />
            </div>
            <SectionHeader
              title="جرّب جريدو في استوديوك اليوم"
              description="حمّل النسخة التجريبية المجانية على ويندوز، وجهّز أول ورقة صور جاهزة للطباعة."
              align="start"
              size="lg"
              gap="none"
            />
          </div>

          <div className="relative flex flex-col items-stretch gap-2 sm:items-start lg:items-center">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary h-12 px-7 text-sm"
            >
              <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>
                تحميل مباشر لنظام <bdi dir="ltr">Windows</bdi>
              </span>
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
