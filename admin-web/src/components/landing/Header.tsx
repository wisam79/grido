import { useEffect, useState } from 'react';
import { Download, Menu, X, Sparkles } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const NAV_LINKS = [
  { href: '#features', label: 'المميزات' },
  { href: '#demo', label: 'مقارنة الأداء' },
  { href: '#benefits', label: 'لماذا Grido' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
];

function AnimatedLogo() {
  return (
    <a href="#top" className="flex items-center gap-3 group select-none relative">
      {/* Clean Official Logo Image without any glow or drop shadow */}
      <div className="relative w-9 h-9 flex items-center justify-center">
        <img
          src="/favicon.png"
          alt="Grido Logo"
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-bold font-display text-white tracking-tight group-hover:text-brand-300 transition-colors">
            Grido Studio
          </span>
          <Sparkles className="w-3.5 h-3.5 text-cyan-400/80" />
        </div>
        <span className="mt-1 text-[9px] font-semibold text-brand-400">
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
          ? 'bg-[#0b1120]/90 backdrop-blur-md shadow-lg shadow-black/40 border-b border-white/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="h-20 flex items-center justify-between">
          <AnimatedLogo />

          {/* Clean nav links with hover indicator line */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-neutral-300 hover:text-cyan-300 transition-colors relative py-1 group/link"
              >
                <span>{link.label}</span>
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-brand-500 to-cyan-400 scale-x-0 group-hover/link:scale-x-100 transition-transform origin-right" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Clean download button */}
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold font-display shadow-lg shadow-brand-500/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer relative overflow-hidden group/btn"
              aria-label="تحميل البرنامج"
            >
              <Download className="w-4 h-4 text-white relative z-10" />
              <span className="relative z-10">تحميل البرنامج</span>
            </a>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-[#121826] text-white"
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
                  className="px-4 py-3 text-sm font-semibold text-neutral-200 hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm"
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
