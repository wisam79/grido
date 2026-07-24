import { Download, Check } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const CHECKS = ['مجاني بالكامل', 'بدون تسجيل', 'تحديثات تلقائية'];

export function CtaBanner() {
  return (
    <section id="download" className="relative py-20">
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center border border-white/15 bg-gradient-to-br from-brand-950/80 via-sky-950/50 to-ink-950 shadow-2xl">
          {/* Decorative radial glow (static, no blur filters) */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(59,130,246,0.25), transparent 60%)',
            }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs mb-6 max-w-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">v1.0.37 - متوافق مع Windows 10 & 11 (64-bit)</span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-5 font-display">
              جاهز لتطوير أداء استوديو الصور الخاص بك؟
            </h2>
            <p className="text-neutral-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              حمل النسخة المجانية الآن وابدأ في تجربة أسرع وأحدث طريقة لقص وطباعة الصور بالذكاء الاصطناعي.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full sm:w-auto flex items-center justify-center gap-3 bg-white text-ink-950 hover:bg-neutral-100 px-8 py-4 rounded-xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
                aria-label="تحميل البرنامج للويندوز المباشر"
              >
                <Download className="w-5 h-5 text-brand-600 transition-transform group-hover:translate-y-0.5" />
                <span>تحميل البرنامج للويندوز (.exe)</span>
              </a>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 sm:pt-0">
                {CHECKS.map((check) => (
                  <span key={check} className="inline-flex items-center gap-1.5 text-xs text-neutral-300">
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
