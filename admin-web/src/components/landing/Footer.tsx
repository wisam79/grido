const NAV_LINKS = [
  { href: '#features', label: 'المميزات الذكية' },
  { href: '#comparison', label: 'مقارنة الأداء' },
  { href: '#benefits', label: 'لماذا Grido' },
  { href: '#scenarios', label: 'حالات العمل' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#141414] py-12">
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

          {/* Links & Trust */}
          <div className="flex flex-col items-center md:items-end gap-3">
            <nav className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2 text-sm text-neutral-400">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-4 text-[11px] text-neutral-500 font-medium">
              <a href="#" className="hover:text-neutral-300 transition-colors">شروط الاستخدام</a>
              <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
              <a href="#" className="hover:text-neutral-300 transition-colors">سياسة الخصوصية</a>
              <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
              <a href="#" className="hover:text-neutral-300 transition-colors">تواصل معنا</a>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col items-center md:items-start text-xs text-neutral-500 mt-4 md:mt-0">
            <p>© {new Date().getFullYear()} Grido Studio. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
