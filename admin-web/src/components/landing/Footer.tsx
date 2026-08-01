import { Download, ShieldCheck, ArrowUp } from 'lucide-react';

const PRODUCT_LINKS = [
  { href: '#features', label: 'المميزات الذكية' },
  { href: '#comparison', label: 'مقارنة الأداء' },
  { href: '#benefits', label: 'لماذا Grido' },
  { href: '#scenarios', label: 'حالات العمل' },
];

const SUPPORT_LINKS = [
  { href: '#pricing', label: 'خطط الترخيص' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
  { href: 'mailto:support@grido.cloud-ip.cc', label: 'الدعم الفني' },
];

const DOWNLOAD_LINKS = [
  { href: '/api/download', label: 'ملف التثبيت (.EXE)' },
  { href: '/api/download?type=portable', label: 'النسخة المحمولة' },
];

export function Footer() {
  return (
    <footer className="relative border-t border-subtle bg-transparent pt-12 pb-8 sm:pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* الصف العلوي: الشعار + أعمدة الروابط */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-6 pb-10 border-b border-subtle">
          {/* العلامة التجارية */}
          <div className="col-span-2 md:col-span-4 space-y-4">
            <a href="#top" className="flex items-center gap-3 select-none">
              <div className="relative w-9 h-9 overflow-hidden border border-subtle bg-elevated">
                <img src="/favicon.png" alt="Grido Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-extrabold text-base text-white uppercase tracking-tight font-display">Grido Studio</span>
                <span className="mt-1 text-[10px] text-tertiary font-bold">استوديو الصور الذكي</span>
              </div>
            </a>
            <p className="text-xs text-tertiary font-sans font-medium leading-relaxed max-w-xs">
              تطبيق سطح مكتب لاستوديوهات التصوير والمطابع: تنسيق صور المعاملات في 3 ثوانٍ، طباعة CMYK، وترميم وجوه بالذكاء الاصطناعي — بدون إنترنت.
            </p>
            <span className="inline-flex items-center gap-2 text-[10px] font-bold text-tertiary">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>بدون إنترنت 100% • ويندوز 10/11</span>
            </span>
          </div>

          {/* عمود المنتج */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-[11px] font-extrabold text-white">المنتج</h3>
            <nav className="flex flex-col gap-2" aria-label="روابط المنتج">
              {PRODUCT_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-xs font-medium text-tertiary hover:text-white transition-colors w-fit">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* عمود الدعم */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-[11px] font-extrabold text-white">الدعم</h3>
            <nav className="flex flex-col gap-2" aria-label="روابط الدعم">
              {SUPPORT_LINKS.map((link) => (
                <a key={link.label} href={link.href} className="text-xs font-medium text-tertiary hover:text-white transition-colors w-fit">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* عمود التحميل */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-[11px] font-extrabold text-white">التحميل</h3>
            <div className="flex flex-col gap-2">
              {DOWNLOAD_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-secondary hover:text-white transition-colors w-fit group/dl"
                >
                  <Download className="w-3.5 h-3.5 text-tertiary group-hover/dl:text-white transition-colors" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* الشريط السفلي: الحقوق + العودة للأعلى */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
          <p className="text-[11px] text-tertiary">
            © {new Date().getFullYear()} GRIDO STUDIO — جميع الحقوق محفوظة.
          </p>
          <p className="text-[10px] text-tertiary font-bold">
            للتفعيل والدعم: الوكيل المعتمد لديك
          </p>
          <a
            href="#top"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-elevated border border-subtle text-tertiary hover:text-white hover:border-white transition-all"
            aria-label="العودة إلى الأعلى"
          >
            <ArrowUp className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
