import { Download, ShieldCheck, ArrowUp } from 'lucide-react';
import { WHATSAPP_URL } from './WhatsAppButton';

const PRODUCT_LINKS = [
  { href: '#features', label: 'المميزات الذكية' },
  { href: '#roi-calculator', label: 'حاسبة التوفير' },
  { href: '#comparison', label: 'مقارنة الأداء' },
  { href: '#benefits', label: 'لماذا Grido' },
  { href: '#scenarios', label: 'حالات العمل' },
];

const SUPPORT_LINKS = [
  { href: '#pricing', label: 'الخطط والأسعار' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
  { href: WHATSAPP_URL, label: 'دعم واتساب المباشر', external: true },
  { href: 'mailto:support@grido.cloud-ip.cc', label: 'البريد الإلكتروني' },
];

const DOWNLOAD_LINKS = [
  { href: '/api/download', label: 'ملف التثبيت (.EXE)' },
  { href: '/api/download?type=portable', label: 'النسخة المحمولة (Portable)' },
];

export function Footer() {
  return (
    <footer className="border-t border-[rgba(214,235,253,0.19)] bg-[#000000] pt-12 pb-8 sm:pt-16 text-[#a1a4a5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-6 pb-10 border-b border-[rgba(214,235,253,0.19)]">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 space-y-4">
            <a href="#top" className="flex items-center gap-2.5 select-none">
              <div className="w-8 h-8 rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)] p-1 flex items-center justify-center">
                <img src="/favicon.png" alt="Grido Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-serif font-normal text-base text-[#f0f0f0]">Grido Studio</span>
                <span className="mt-0.5 text-[10px] font-mono text-[#a1a4a5]">استوديو الصور الذكي</span>
              </div>
            </a>
            <p className="text-xs text-[#a1a4a5] leading-relaxed max-w-xs">
              تطبيق سطح مكتب لأصحاب الاستوديوهات ومحلات التصوير: تنسيق صور المعاملات في 3 ثوانٍ، طباعة CMYK، وترميم وجوه بالذكاء الاصطناعي — يعمل محلياً بدون إنترنت.
            </p>
            <span className="inline-flex items-center gap-2 text-[10px] font-mono text-[#a1a4a5] bg-[#191b1e] px-2.5 py-1 rounded border border-[rgba(214,235,253,0.19)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00a3ff]" />
              <span>بدون إنترنت 100% • ويندوز 10 / 11 64-بت</span>
            </span>
          </div>

          {/* Product Links */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-mono text-[#f0f0f0]">المنتج</h3>
            <nav className="flex flex-col gap-2" aria-label="روابط المنتج">
              {PRODUCT_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-xs text-[#a1a4a5] hover:text-[#f0f0f0] transition-colors w-fit">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Support Links */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-mono text-[#f0f0f0]">الدعم والتفعيل</h3>
            <nav className="flex flex-col gap-2" aria-label="روابط الدعم">
              {SUPPORT_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  className="text-xs text-[#a1a4a5] hover:text-[#f0f0f0] transition-colors w-fit"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Download Links */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-mono text-[#f0f0f0]">التحميل المباشر</h3>
            <div className="flex flex-col gap-2">
              {DOWNLOAD_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-[#a1a4a5] hover:text-[#00a3ff] transition-colors w-fit"
                >
                  <Download className="w-3.5 h-3.5 text-[#00a3ff]" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-[#52595b]">
          <p>
            © {new Date().getFullYear()} Grido Studio — جميع الحقوق محفوظة.
          </p>
          <p className="font-mono text-[11px] text-[#a1a4a5]">
            للتفعيل والدعم: الوكيل المعتمد لديك
          </p>
          <a
            href="#top"
            className="flex items-center justify-center w-8 h-8 rounded bg-[#191b1e] border border-[rgba(214,235,253,0.19)] text-[#a1a4a5] hover:text-[#f0f0f0] transition-colors cursor-pointer"
            aria-label="العودة إلى الأعلى"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}

