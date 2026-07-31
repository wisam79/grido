import { useEffect, useState } from 'react';
import { Download, Menu, X } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const NAV_LINKS = [
  { href: '#features', label: 'المميزات', num: '02' },
  { href: '#comparison', label: 'المقارنة', num: '03' },
  { href: '#benefits', label: 'لماذا Grido', num: '04' },
  { href: '#scenarios', label: 'حالات العمل', num: '05' },
  { href: '#pricing', label: 'الخطط', num: '07' },
  { href: '#faq', label: 'الأسئلة', num: '08' },
];

function AnimatedLogo() {
  return (
    <a href="#top" className="flex items-center gap-3 group select-none relative">
      <div className="relative w-9 h-9 flex items-center justify-center">
        <img
          src="/favicon.png"
          alt="Grido Logo"
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold font-display text-white tracking-tight transition-colors">
            Grido Studio
          </span>
        </div>
        <span className="mt-1 text-[9px] font-mono font-bold text-tertiary uppercase tracking-[1px]">
          استوديو الصور الذكي
        </span>
      </div>
    </a>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

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

  // Scrollspy: تظليل رابط القسم الظاهر حالياً في الشاشة
  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
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
      // نطاق ضيّق وسط الشاشة حتى لا يتبدّل التظليل إلا عند توسّط القسم فعلياً
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const handleMagneticMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    e.currentTarget.style.transform = `translate(${relX * 0.12}px, ${relY * 0.12}px)`;
  };

  const handleMagneticMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = 'translate(0px, 0px)';
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-secondary/95 backdrop-blur-md border-b border-subtle'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="h-20 flex items-center justify-between">
          <AnimatedLogo />

          {/* Clean nav links with SpaceX monospace tracking + scrollspy */}
          <nav className="hidden md:flex items-center gap-8" aria-label="التنقل الرئيسي">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'true' : undefined}
                  className={`text-xs font-mono font-bold tracking-[1.5px] uppercase transition-colors relative py-1 group/link ${
                    isActive ? 'text-white' : 'text-secondary hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-[9px] text-tertiary" dir="ltr" aria-hidden>{link.num}</span>
                    <span>{link.label}</span>
                  </span>
                  <span
                    className={`absolute bottom-0 inset-x-0 h-0.5 bg-white transition-transform origin-right ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover/link:scale-x-100'
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* SpaceX Pill CTA Download button */}
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              onMouseMove={handleMagneticMouseMove}
              onMouseLeave={handleMagneticMouseLeave}
              className="magnetic-pill hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-[#f0f0fa] text-black text-xs font-mono font-extrabold uppercase tracking-[1px] transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] cursor-pointer relative border border-white"
              aria-label="تحميل البرنامج"
            >
              <Download className="w-3.5 h-3.5 text-black relative z-10" />
              <span className="relative z-10">تحميل التطبيق</span>
            </a>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-none bg-elevated text-secondary border border-subtle cursor-pointer"
              aria-label="القائمة"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-subtle bg-secondary">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 text-xs font-mono font-bold tracking-[1.5px] uppercase text-secondary hover:bg-elevated transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={GITHUB_RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-mono font-extrabold text-xs uppercase tracking-[1px]"
              >
                <Download className="w-4 h-4 text-black" />
                تحميل التطبيق
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
