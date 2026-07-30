const NAV_LINKS = [
  { href: '#features', label: 'المميزات الذكية' },
  { href: '#comparison', label: 'مقارنة الأداء' },
  { href: '#benefits', label: 'لماذا Grido' },
  { href: '#scenarios', label: 'حالات العمل' },
  { href: '#pricing', label: 'الخطط' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
];

export function Footer() {
  return (
    <footer className="relative border-t border-subtle bg-transparent py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 overflow-hidden border border-subtle bg-elevated">
              <img src="/favicon.png" alt="Grido Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-base text-white uppercase tracking-tight font-display">Grido Studio</span>
              <span className="mt-1 text-[10px] text-tertiary font-mono uppercase tracking-[1px]">استوديو الصور الذكي</span>
            </div>
          </div>

          {/* Links & Trust */}
          <div className="flex flex-col items-center md:items-end gap-3">
            <nav className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2 text-xs text-tertiary font-mono uppercase tracking-[1.5px]">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>
            <p className="text-[11px] text-tertiary font-mono uppercase tracking-[1px]">
              للتفعيل والدعم: الوكيل المعتمد لديك
            </p>
          </div>

          {/* Copyright */}
          <div className="flex flex-col items-center md:items-start text-xs font-mono text-tertiary tracking-[1px] uppercase">
            <p>© {new Date().getFullYear()} GRIDO STUDIO. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
