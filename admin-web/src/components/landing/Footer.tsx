const NAV_LINKS = [
  { href: '#features', label: 'المميزات' },
  { href: '#demo', label: 'المعاينة' },
  { href: '#benefits', label: 'لماذا Grido' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-ink-950 py-12">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 overflow-hidden rounded-xl">
              <img src="/favicon.png" alt="Grido Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-base">Grido Studio</span>
              <span className="mt-0.5 text-[10px] text-neutral-500">استوديو الصور الذكي</span>
            </div>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-400">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Grido Studio Pro. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}
