import { useEffect, useState } from 'react';
import { Download, Menu, X, Sparkles, Layers, ShieldCheck, HelpCircle, DollarSign } from 'lucide-react';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const NAV_LINKS = [
  { href: '#capabilities', label: 'القدرات الأساسية', icon: Layers },
  { href: '#ai-engine', label: 'محرك الذكاء الاصطناعي', icon: Sparkles },
  { href: '#windows-experience', label: 'تجربة ويندوز 11', icon: ShieldCheck },
  { href: '#pricing', label: 'الأسعار والتراخيص', icon: DollarSign },
  { href: '#faq', label: 'الأسئلة الشائعة', icon: HelpCircle },
];

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
        const isScrolled = window.scrollY > 16;
        setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scrollspy
  useEffect(() => {
    const ids = ['capabilities', 'ai-engine', 'windows-experience', 'pricing', 'faq'];
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
      className={`sticky top-0 z-50 transition-all duration-250 ${
        scrolled
          ? 'bg-[#121212]/90 backdrop-blur-[24px] border-b border-[#2C2C2C] shadow-lg shadow-black/60'
          : 'bg-[#121212]/50 backdrop-blur-md border-b border-white/[0.04]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-16 flex items-center justify-between">
          
          {/* Clean Responsive Logo (Zero PRO badge) */}
          <a href="#top" className="flex items-center gap-2.5 sm:gap-3 select-none group">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shrink-0">
              <img
                src="/logo.png"
                alt="Grido Studio Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/appicon.png';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-white group-hover:text-[#60a5fa] transition-colors">
                Grido Studio
              </span>
              <span className="text-[10px] text-[#9E9E9E] -mt-0.5 hidden sm:block">استوديو الهوية والطباعة</span>
            </div>
          </a>

          {/* Desktop Nav Links (hidden on mobile) */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#1E1E1E] p-1 rounded-full border border-[#2C2C2C]" aria-label="التنقل الرئيسي">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'true' : undefined}
                  className={`px-3.5 py-1.5 text-xs rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-[#262626] text-white font-bold border border-white/10'
                      : 'text-[#9E9E9E] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Actions Column */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Desktop-only Header CTA (Strictly hidden on mobile) */}
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex btn-primary text-xs !py-2 !px-4 !h-9"
              aria-label="تحميل البرنامج"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل البرنامج</span>
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-[#1E1E1E] text-white border border-[#2C2C2C] cursor-pointer hover:bg-[#262626] transition-colors"
              aria-label="القائمة"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {menuOpen && (
          <div className="lg:hidden pb-5 pt-2 border-t border-[#2C2C2C] bg-[#121212] animate-fadeIn">
            <nav className="flex flex-col gap-1.5">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-[#9E9E9E] hover:text-white hover:bg-[#1E1E1E] rounded-xl transition-colors"
                  >
                    <Icon className="w-4 h-4 text-[#60a5fa]" />
                    <span>{link.label}</span>
                  </a>
                );
              })}
              <div className="pt-2 px-1">
                <a
                  href={GITHUB_RELEASE_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full text-center justify-center !py-2.5 text-xs font-bold"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل مباشر لويندوز</span>
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
