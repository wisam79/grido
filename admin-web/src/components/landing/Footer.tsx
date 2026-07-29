const NAV_LINKS = [
  { href: '#features', label: 'المميزات الذكية' },
  { href: '#comparison', label: 'مقارنة الأداء' },
  { href: '#benefits', label: 'لماذا Grido' },
  { href: '#scenarios', label: 'حالات العمل' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
];

export function Footer() {
  return (
    <footer className="relative border-t border-sky-400/20 bg-[#10141d] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 overflow-hidden rounded-xl shadow-md border border-sky-400/30">
              <img src="/favicon.png" alt="Grido Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-base text-white">Grido Studio</span>
              <span className="mt-0.5 text-[10px] text-sky-400 font-bold">استوديو الصور الذكي</span>
            </div>
          </div>

          {/* Links & Trust */}
          <div className="flex flex-col items-center md:items-end gap-2.5">
            <nav className="flex flex-wrap items-center justify-center md:justify-end gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-300 font-semibold">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-sky-300 transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              <a href="#" className="hover:text-slate-200 transition-colors">شروط الاستخدام</a>
              <span className="w-1 h-1 rounded-full bg-sky-500/40"></span>
              <a href="#" className="hover:text-slate-200 transition-colors">سياسة الخصوصية</a>
              <span className="w-1 h-1 rounded-full bg-sky-500/40"></span>
              <a href="#" className="hover:text-slate-200 transition-colors">تواصل معنا</a>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col items-center md:items-start text-[11px] sm:text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Grido Studio. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
