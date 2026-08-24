import { Download, Sparkles, ShieldCheck } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

export function CtaBanner() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="w-full rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-6 sm:p-12 text-center shadow-xl relative overflow-hidden">
          
          <div className="ai-badge mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>ابدأ الآن</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
            سرّع عمل استوديو التصوير اليوم
          </h2>

          <p className="text-sm sm:text-base text-[#9E9E9E] max-w-lg mx-auto mb-7 leading-relaxed">
            وفّر ساعات من القص اليدوي يومياً، قلل هدر الورق، وقدّم لعملائك صور هوية وفيزا بجودة فورية.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-5">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !h-13 !px-8 text-sm sm:text-base font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>تحميل مباشر لـ Windows (64-bit)</span>
            </a>
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] text-[#666666]">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
              <span>آمن ومفحوص 100%</span>
            </div>
            <span>•</span>
            <span>حجم البرنامج (~45 MB)</span>
          </div>
        </div>

      </div>
    </section>
  );
}
