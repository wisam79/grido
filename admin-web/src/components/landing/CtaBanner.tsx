import { Download, Check } from 'lucide-react';
import { useAppVersion } from '../../lib/version';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const CHECKS = [
  'تجربة مجانية كاملة لمدة 7 أيام',
  'بدون أي تسجيل أو بطاقة ائتمانية',
  'تحديثات تلقائية مجانية وموقعة',
  'الأساسيات تعمل محلياً 100% بدون إنترنت',
];

export function CtaBanner() {
  const version = useAppVersion();

  return (
    <section id="download" className="section-band border-t border-[rgba(214,235,253,0.19)] bg-[#000000] text-[#f0f0f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-lg p-8 sm:p-14 text-center border border-[rgba(214,235,253,0.19)] bg-[#191b1e]">
          <div className="space-y-6">
            {/* Eyebrow Badge */}
            <div>
              <span className="resend-badge font-mono">
                الإصدار {version ?? 'v1.0'} • ويندوز 10 / 11 64-بت
              </span>
            </div>

            {/* Master Headline */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal font-serif text-[#f0f0f0] leading-tight">
              جاهز لتضاعف سرعة وأرباح استوديوك ومطبعتك؟
            </h2>

            {/* Description */}
            <p className="text-[#a1a4a5] text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
              حمّل تطبيق Grido Studio الآن وابدأ المعالجة الفورية وتنسيق صور المعاملات في ثوانٍ.
            </p>

            {/* Download Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="button-primary text-sm"
                aria-label="تحميل ملف التثبيت المباشر (.EXE)"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>تحميل ملف التثبيت (.EXE)</span>
              </a>

              <a
                href="/api/download?type=portable"
                target="_blank"
                rel="noopener noreferrer"
                className="button-secondary text-xs"
                aria-label="تحميل النسخة المحمولة"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>تحميل النسخة المحمولة (Portable)</span>
              </a>
            </div>

            {/* Feature Checks */}
            <div className="pt-4 border-t border-[rgba(214,235,253,0.19)] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#a1a4a5]">
              {CHECKS.map((check) => (
                <span key={check} className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#00a3ff] shrink-0" />
                  <span>{check}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

