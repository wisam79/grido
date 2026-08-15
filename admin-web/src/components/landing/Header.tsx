import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const NAV_LINKS = [
  { href: '#top', label: 'مساحة العمل' },
  { href: '#features', label: 'المقاسات' },
  { href: '#how-it-works', label: 'مسار الإنتاج' },
  { href: '#pricing', label: 'الأسعار' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    // Ensure document root is always dark
    document.documentElement.classList.remove('light');
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const isScrolled = window.scrollY > 12;
        setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scrollspy
  useEffect(() => {
    const ids = ['top', 'features', 'how-it-works', 'pricing'];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(`#${entry.target.id}`);
        });
      },
      { rootMargin: '-35% 0px -50% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? 'bg-[#000000]/95 backdrop-blur-md border-b border-[rgba(214,235,253,0.19)]'
          : 'bg-[#000000] border-b border-[rgba(214,235,253,0.08)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-[64px] flex items-center justify-between">
          {/* Logo with wide tracking */}
          <a href="#top" className="flex items-center gap-2 select-none">
            <span className="font-mono text-sm tracking-[0.25em] font-semibold text-[#f0f0f0] uppercase">
              GRIDO STUDIO
            </span>
          </a>

          {/* Centered Technical Nav Links */}
          <nav className="hidden md:flex items-center gap-8" aria-label="التنقل الرئيسي">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'true' : undefined}
                  className={`text-xs font-mono tracking-[0.15em] uppercase transition-colors ${
                    isActive
                      ? 'text-[#00a3ff]'
                      : 'text-[#a1a4a5] hover:text-[#f0f0f0]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Right Action: Boxed 4px Blue Button "OPEN STUDIO" */}
          <div className="flex items-center gap-3">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center justify-center border border-[#00a3ff] text-[#00a3ff] hover:bg-[#00a3ff]/10 text-xs font-mono tracking-wider uppercase px-5 py-2 rounded-[4px] transition-all"
              aria-label="فتح الاستوديو"
            >
              فتح الاستوديو
            </a>


            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-[4px] bg-[#191b1e] text-[#f0f0f0] border border-[rgba(214,235,253,0.19)] cursor-pointer"
              aria-label="القائمة"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-[rgba(214,235,253,0.19)] bg-[#000000]">
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 text-xs font-mono tracking-[0.15em] uppercase text-[#a1a4a5] hover:text-[#f0f0f0] hover:bg-[#191b1e] transition-colors rounded"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2">
                <a
                  href={GITHUB_RELEASE_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center border border-[#00a3ff] text-[#00a3ff] hover:bg-[#00a3ff]/10 text-xs font-mono tracking-[0.15em] uppercase py-2.5 rounded-[4px]"
                >
                  OPEN STUDIO
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}


