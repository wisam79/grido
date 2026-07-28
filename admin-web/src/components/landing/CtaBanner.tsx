import { Download, Check } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const CHECKS = ['مجاني بالكامل', 'بدون تسجيل', 'تحديثات تلقائية'];

export function CtaBanner() {
  return (
    <section id="download" className="relative py-20 overflow-hidden">
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center border border-white/15 bg-gradient-to-br from-[#121826] via-[#0b1120] to-[#121826] shadow-2xl">
          {/* Rotating Camera Aperture Lens SVG Graphics Background */}
          <svg className="absolute -top-24 -right-24 w-96 h-96 pointer-events-none opacity-20 animate-rotate-slow" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(34,211,238,0.8)" strokeWidth="1" strokeDasharray="8 8" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(37,99,235,0.8)" strokeWidth="1.5" />
            <polygon points="100,20 120,60 80,60" fill="rgba(34,211,238,0.3)" />
            <polygon points="180,100 140,120 140,80" fill="rgba(37,99,235,0.3)" />
            <polygon points="100,180 80,140 120,140" fill="rgba(34,211,238,0.3)" />
            <polygon points="20,100 60,80 60,120" fill="rgba(37,99,235,0.3)" />
          </svg>

          <svg className="absolute -bottom-24 -left-24 w-96 h-96 pointer-events-none opacity-15 animate-rotate-reverse" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(34,211,238,0.6)" strokeWidth="1" strokeDasharray="4 6" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="rgba(37,99,235,0.6)" strokeWidth="2" />
          </svg>

          {/* Glowing radial backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(37,99,235,0.3), transparent 60%)',
            }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs mb-6 max-w-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
              <span className="truncate">v1.2.2 - متوافق مع Windows 10 & 11 (64-bit)</span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-5 font-display text-white">
              جاهز لتطوير أداء استوديو الصور الخاص بك؟
            </h2>
            <p className="text-[#A1A1AA] text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed font-sans">
              حمل النسخة المباشرة الآن وابدأ في تجربة أسرع وأحدث طريقة لقص وطباعة الصور بالذكاء الاصطناعي.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full sm:w-auto flex items-center justify-center gap-3 bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-xl font-bold font-display shadow-xl shadow-brand-500/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="تحميل البرنامج للويندوز المباشر"
              >
                <Download className="w-5 h-5 text-white transition-transform group-hover:translate-y-0.5" />
                <span>تحميل البرنامج للويندوز (.exe)</span>
              </a>

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2 sm:pt-0">
                {CHECKS.map((check) => (
                  <span key={check} className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] font-semibold">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    {check}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
