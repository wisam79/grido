import { Download, Check, Sparkles } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const CHECKS = ['نسخة أساسية مجانية', 'بدون تسجيل', 'تحديثات تلقائية', 'يعمل 100% بدون إنترنت'];

export function CtaBanner() {
  return (
    <section id="download" className="relative py-12 sm:py-24 border-t border-white/10 bg-[#181818] overflow-hidden">
      {/* Soft Ambient Studio Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[180px] sm:h-[300px] bg-brand-500/10 rounded-full blur-[100px] sm:blur-[140px]"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-12 md:p-14 text-center border border-white/10 bg-[#1e1e1e]/90 backdrop-blur-md shadow-2xl">
          {/* Subtle Studio Blueprint Grid Overlay */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />

          <div className="relative z-10 space-y-4 sm:space-y-6">
            {/* Version Badge */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>الإصدار v1.2.3 • متوافق مع أجهزة الويندوز (64-bit)</span>
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-display text-white leading-snug sm:leading-tight">
              جاهز لتطوير أداء استوديو الصور الخاص بك؟
            </h2>

            {/* Description */}
            <p className="text-[#A1A1AA] text-xs sm:text-lg max-w-xl mx-auto font-sans leading-relaxed">
              حمّل البرنامج الآن وجهّز صور المعاملات بالذكاء الاصطناعي في 3 ثوانٍ فقط.
            </p>

            {/* Download Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto group flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-extrabold font-display text-xs sm:text-sm shadow-xl shadow-brand-500/30 transition-all cursor-pointer"
                aria-label="تحميل البرنامج للويندوز المباشر"
              >
                <Download className="w-4 h-4 text-white shrink-0" />
                <span>تحميل ملف التثبيت المباشر (.exe)</span>
              </a>

              <a
                href="/api/download?type=portable"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#282828] hover:bg-[#333333] border border-white/10 text-neutral-200 hover:text-white px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl font-bold font-display text-xs sm:text-sm transition-all cursor-pointer shadow-md"
                aria-label="نسخة محمولة (Portable)"
              >
                <Download className="w-4 h-4 text-blue-400 shrink-0" />
                <span>نسخة محمولة (Portable)</span>
              </a>
            </div>

            {/* Feature Checks */}
            <div className="pt-3 sm:pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-[11px] sm:text-xs text-neutral-400 font-semibold">
              {CHECKS.map((check) => (
                <span key={check} className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
