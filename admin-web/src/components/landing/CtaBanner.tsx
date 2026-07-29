import { Download, Check, Sparkles } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const CHECKS = ['نسخة أساسية مجانية', 'بدون تسجيل', 'تحديثات تلقائية', 'يعمل 100% بدون إنترنت'];

export function CtaBanner() {
  return (
    <section id="download" className="relative py-12 sm:py-24 border-t border-white/10 bg-gradient-to-b from-[#141414] via-[#1a2130] to-[#181818] overflow-hidden">
      {/* Soft Ambient Studio Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[650px] h-[200px] sm:h-[350px] bg-sky-500/20 rounded-full blur-[120px] sm:blur-[160px]"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-12 md:p-14 text-center border border-sky-400/30 bg-gradient-to-b from-[#1e2536]/95 to-[#141923]/95 backdrop-blur-md shadow-[0_0_50px_rgba(56,189,248,0.2)]">
          {/* Subtle Studio Blueprint Grid Overlay */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />

          <div className="relative z-10 space-y-4 sm:space-y-6">
            {/* Version Badge */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] sm:text-xs font-bold shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>الإصدار v1.2.3 • متوافق مع أجهزة الويندوز (64-bit)</span>
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-display text-white leading-snug sm:leading-tight drop-shadow-[0_2px_15px_rgba(56,189,248,0.3)]">
              جاهز لتطوير أداء استوديو الصور الخاص بك؟
            </h2>

            {/* Description */}
            <p className="text-slate-300 text-xs sm:text-lg max-w-xl mx-auto font-sans leading-relaxed font-medium">
              حمّل البرنامج الآن وجهّز صور المعاملات بالذكاء الاصطناعي في 3 ثوانٍ فقط.
            </p>

            {/* Download Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto group flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 via-brand-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-extrabold font-display text-xs sm:text-sm shadow-[0_0_25px_rgba(56,189,248,0.5)] border border-sky-300/40 transition-all active:scale-95 cursor-pointer"
                aria-label="تحميل البرنامج للويندوز المباشر"
              >
                <Download className="w-4 h-4 text-white shrink-0 group-hover:translate-y-0.5 transition-transform" />
                <span>تحميل ملف التثبيت المباشر (.exe)</span>
              </a>

              <a
                href="/api/download?type=portable"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#242936] hover:bg-[#2d3548] border border-sky-400/25 text-slate-200 hover:text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl font-bold font-display text-xs sm:text-sm transition-all cursor-pointer shadow-md"
                aria-label="نسخة محمولة (Portable)"
              >
                <Download className="w-4 h-4 text-sky-400 shrink-0" />
                <span>نسخة محمولة (Portable)</span>
              </a>
            </div>

            {/* Feature Checks */}
            <div className="pt-3 sm:pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-[11px] sm:text-xs text-slate-300 font-semibold">
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
