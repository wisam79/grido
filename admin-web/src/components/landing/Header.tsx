import { useEffect, useState } from 'react';
import { Download, Menu, X } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const NAV_LINKS = [
  { href: '#features', label: 'المميزات' },
  { href: '#demo', label: 'معاينة الأداء' },
  { href: '#benefits', label: 'لماذا Grido' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
];

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-3 group">
      <div className="relative w-10 h-10 overflow-hidden rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105">
        <img src="/favicon.png" alt="Grido Logo" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight">Grido Studio</span>
        <span className="mt-0.5 text-[10px] font-medium tracking-[0.2em] text-brand-400 uppercase">
          استوديو الصور الذكي
        </span>
      </div>
    </a>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-ink-950/80 backdrop-blur-lg'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="h-16 sm:h-20 flex items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-neutral-300 rounded-lg hover:text-white hover:bg-white/5 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-ink-950 text-sm font-semibold shadow-lg shadow-black/20 transition-all hover:bg-neutral-100 hover:shadow-brand-500/20 active:scale-95"
              aria-label="تحميل البرنامج للويندوز"
            >
              <Download className="w-4 h-4" />
              <span>تحميل البرنامج</span>
            </a>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white"
              aria-label="القائمة"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-white/10">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-neutral-200 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-ink-950 text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                تحميل البرنامج
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
