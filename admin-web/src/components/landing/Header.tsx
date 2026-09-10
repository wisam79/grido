import { useEffect, useState } from 'react';
import { Download, Menu, X, Sparkles, Layers, ShieldCheck, HelpCircle, DollarSign, Award } from 'lucide-react';
import { useAppVersion } from '../../lib/version';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

const NAV_LINKS = [
  { href: '#capabilities', label: 'المميزات', icon: Layers },
  { href: '#ai-engine', label: 'الذكاء الاصطناعي', icon: Sparkles },
  { href: '#windows-experience', label: 'ويندوز 11', icon: ShieldCheck },
  { href: '#roi', label: 'الحاسبة', icon: DollarSign },
  { href: '#testimonials', label: 'الآراء', icon: Award },
  { href: '#pricing', label: 'الأسعار', icon: DollarSign },
  { href: '#faq', label: 'الأسئلة', icon: HelpCircle },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const version = useAppVersion();
  const displayVersion = version ? `v${version}` : 'v2.4';

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
    const ids = ['capabilities', 'ai-engine', 'windows-experience', 'roi', 'testimonials', 'pricing', 'faq'];
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
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#121212]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.65)] py-2 sm:py-2.5'
          : 'bg-transparent border-b border-transparent py-3 sm:py-3.5'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-16 flex items-center justify-between gap-4">

          {/* Clean Responsive Logo & Version Pill */}
          <a href="#top" className="flex items-center gap-3 select-none group shrink-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-inner group-hover:border-[#3b82f6]/60 group-hover:scale-105 transition-all duration-200">
              <img
                src="/logo.png"
                alt="Grido Studio Logo"
                className="w-full h-full object-contain drop-shadow"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/appicon.png';
                }}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-[#60a5fa] transition-colors">
                  Grido Studio
                </span>
                <span className="text-[9px] font-mono font-bold text-[#60a5fa] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded-full border border-[#3b82f6]/25">
                  {displayVersion}
                </span>
              </div>
              <span className="text-[10px] text-[#999] -mt-0.5 hidden sm:block">استوديو الهوية والطباعة</span>
            </div>
          </a>

          {/* Desktop Nav Links — Capsule مصقولة وموجزة */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#1A1A1A]/85 backdrop-blur-xl p-1 rounded-full border border-white/[0.08] shadow-inner shadow-black/40" aria-label="التنقل الرئيسي">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative px-3.5 py-1.5 text-xs rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-[#3b82f6] text-white font-bold shadow-md shadow-[#3b82f6]/30'
                      : 'text-[#9E9E9E] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Actions Column */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Desktop-only Header CTA */}
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-9 px-4 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-md shadow-[#3b82f6]/30 items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
          <div className="lg:hidden mt-2 p-3 rounded-2xl border border-white/10 bg-[#161616]/95 backdrop-blur-2xl shadow-2xl animate-fadeIn">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = activeSection === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors ${
                      isActive ? 'text-white bg-[#3b82f6] shadow-md shadow-[#3b82f6]/30' : 'text-[#9E9E9E] hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#60a5fa]" />
                    <span>{link.label}</span>
                  </a>
                );
              })}
              <div className="pt-2">
                <a
                  href={GITHUB_RELEASE_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 px-4 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-md shadow-[#3b82f6]/30 flex items-center justify-center gap-2 transition-all"
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
