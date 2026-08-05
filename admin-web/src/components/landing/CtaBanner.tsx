import { Download, Check, Sparkles } from 'lucide-react';
import { useAppVersion } from '../../lib/version';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const CHECKS = ['تجربة مجانية لمدة 7 أيام', 'بدون تسجيل أوتوماتيكي', 'تحديثات تلقائية', 'أساسيات 100% بدون إنترنت'];

export function CtaBanner() {
  const version = useAppVersion();

  const handleMagneticMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    e.currentTarget.style.transform = `translate(${relX * 0.15}px, ${relY * 0.15}px)`;
  };

  const handleMagneticMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = 'translate(0px, 0px)';
  };

  return (
    <section id="download" className="relative section-rhythm border-t border-subtle bg-transparent overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl p-8 sm:p-14 text-center border border-subtle bg-elevated spotlight-card shadow-2xl">
          <div className="relative z-10 space-y-6">
            {/* Eyebrow Badge */}
            <div className="stagger-1">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary border border-subtle text-secondary text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-white shrink-0" />
                <span>الإصدار {version ?? '…'} • ويندوز 64-بت</span>
              </span>
            </div>

            {/* Headline */}
            <h2 className="stagger-2 text-3xl sm:text-4xl md:text-5xl font-black font-display text-white leading-tight">
              جاهز لتضاعف سرعة إنتاجية استوديوهاتك؟
            </h2>

            {/* Description */}
            <p className="stagger-3 text-secondary text-sm sm:text-lg max-w-xl mx-auto font-sans leading-relaxed font-medium">
              حمّل تطبيق Grido Studio وابدأ المعالجة الفورية وتوزيع صور الهوية الآن.
            </p>

            {/* SpaceX Monochromatic Download Actions with Magnetic Hover */}
            <div className="stagger-4 pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                onMouseMove={handleMagneticMouseMove}
                onMouseLeave={handleMagneticMouseLeave}
                className="magnetic-pill group relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2.5 bg-white text-black px-8 py-4 rounded-full font-extrabold text-xs border border-white transition-shadow duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] cursor-pointer"
                aria-label="تحميل ملف التثبيت المباشر (.EXE)"
              >
                <Download className="w-4 h-4 text-black shrink-0 relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5" />
                <span className="relative z-10">تحميل ملف التثبيت (.EXE)</span>
              </a>

              <a
                href="/api/download?type=portable"
                target="_blank"
                rel="noopener noreferrer"
                onMouseMove={handleMagneticMouseMove}
                onMouseLeave={handleMagneticMouseLeave}
                className="magnetic-pill group relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2.5 bg-primary border border-subtle text-secondary px-6 py-4 rounded-full font-extrabold text-xs transition-colors duration-300 hover:border-white hover:text-white cursor-pointer"
                aria-label="تحميل النسخة المحمولة"
              >
                <Download className="w-4 h-4 text-tertiary shrink-0 relative z-10 group-hover:text-white transition-all duration-300 group-hover:-translate-y-0.5" />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">النسخة المحمولة</span>
              </a>
            </div>

            {/* Feature Checks */}
            <div className="pt-4 border-t border-subtle flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-tertiary font-bold">
              {CHECKS.map((check) => (
                <span key={check} className="inline-flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-white shrink-0" />
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
