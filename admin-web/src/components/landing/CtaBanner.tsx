import { Download } from 'lucide-react';
import { GITHUB_RELEASE_DOWNLOAD_URL } from '../../lib/version';

export function CtaBanner() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* هالة ختامية محيطة — تعطي شريط الدعوة الأخير ثقلاً بصرياً بدل صندوق مسطّح */}
      <div aria-hidden="true" className="aurora-bg" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="ds-card card-specular-edge w-full p-6 sm:p-12 text-center shadow-xl relative overflow-hidden">
          
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-2.5 tracking-tight">
            سرّع عمل استوديو التصوير اليوم
          </h2>

          <p className="text-sm sm:text-base text-text-secondary max-w-lg mx-auto mb-6 leading-relaxed">
            وفّر ساعات من العمل، قلل هدر الورق، وقدّم صور هوية فورية بجودة معتمدة.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-5">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !h-12 !px-8 text-sm sm:text-base font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>تحميل مباشر لـ Windows</span>
            </a>
          </div>

          <div className="flex items-center justify-center text-[11px] text-text-muted">
            <span>حجم البرنامج ~45 MB</span>
          </div>
        </div>

      </div>
    </section>
  );
}
