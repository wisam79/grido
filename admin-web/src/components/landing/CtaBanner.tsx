import { Download, Check, Sparkles } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const CHECKS = ['نسخة أساسية مجانية', 'بدون تسجيل', 'تحديثات تلقائية', 'يعمل 100% بدون إنترنت'];

export function CtaBanner() {
  return (
    <section id="download" className="relative py-16 sm:py-24 lg:py-28 border-t border-[#383842] bg-[#121214] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto relative overflow-hidden rounded-none p-8 sm:p-14 text-center border border-[#383842] bg-[#1a1a1e]">
          <div className="relative z-10 space-y-6">
            {/* Eyebrow Badge */}
            <div className="stagger-1">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none bg-[#24242c] border border-[#383842] text-[#f0f0fa] text-xs font-mono font-bold tracking-[2px] uppercase">
                <Sparkles className="w-3.5 h-3.5 text-white shrink-0" />
                <span>VERSION 1.2.3 • WINDOWS 64-BIT</span>
              </span>
            </div>

            {/* Headline */}
            <h2 className="stagger-2 text-3xl sm:text-4xl md:text-5xl font-black font-display text-white uppercase tracking-tight leading-tight">
              جاهز لتضاعف سرعة إنتاجيتك؟
            </h2>

            {/* Description */}
            <p className="stagger-3 text-[#f0f0fa] text-sm sm:text-lg max-w-xl mx-auto font-sans leading-relaxed font-medium">
              حمّل البرنامج وابدأ المعالجة الفورية الآن.
            </p>

            {/* SpaceX Download Actions */}
            <div className="stagger-4 pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto group flex items-center justify-center gap-2.5 bg-white hover:bg-[#f0f0fa] text-black px-8 py-4 rounded-full font-extrabold text-xs uppercase tracking-[1px] border border-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="تحميل البرنامج للويندوز المباشر"
              >
                <Download className="w-4 h-4 text-black shrink-0" />
                <span>تحميل ملف التثبيت المباشر (.EXE)</span>
              </a>

              <a
                href="/api/download?type=portable"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-[rgba(240,240,250,0.1)] hover:bg-[rgba(240,240,250,0.2)] border border-[#555555] text-[#f0f0fa] hover:text-white px-6 py-4 rounded-full font-extrabold text-xs uppercase tracking-[1px] transition-all cursor-pointer"
                aria-label="نسخة محمولة (Portable)"
              >
                <Download className="w-4 h-4 text-[#f0f0fa] shrink-0" />
                <span>نسخة محمولة (PORTABLE)</span>
              </a>
            </div>

            {/* Feature Checks */}
            <div className="pt-4 border-t border-[#383842] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#999999] font-mono uppercase tracking-[1px]">
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
