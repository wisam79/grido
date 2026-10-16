import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Menu, X } from 'lucide-react';
import { useAppVersion, GITHUB_RELEASE_DOWNLOAD_URL } from '../../lib/version';

const NAV_LINKS = [
  { href: '#capabilities', label: 'المميزات' },
  { href: '#ai-engine', label: 'الذكاء الاصطناعي' },
  { href: '#windows-experience', label: 'ويندوز 11' },
  { href: '#roi', label: 'الحاسبة' },
  { href: '#testimonials', label: 'الآراء' },
  { href: '#pricing', label: 'الأسعار' },
  { href: '#faq', label: 'الأسئلة' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const pillRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const progressRef = useRef<HTMLSpanElement>(null);
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
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
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

  // موضع مؤشر التنقل المنزلق (Magic Pill) المتزامن مع Scrollspy
  useEffect(() => {
    const updatePill = () => {
      const pill = pillRef.current;
      if (!pill) return;
      const activeLink = linkRefs.current[activeSection];
      if (!activeLink) {
        pill.style.opacity = '0';
        return;
      }
      pill.style.width = `${activeLink.offsetWidth}px`;
      pill.style.left = `${activeLink.offsetLeft}px`;
      pill.style.opacity = '1';
    };
    updatePill();
    window.addEventListener('resize', updatePill);
    document.fonts?.ready.then(updatePill).catch(() => {});
    return () => window.removeEventListener('resize', updatePill);
  }, [activeSection]);

  // إغلاق قائمة الجوال بمفتاح Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#121212]/80 backdrop-blur-2xl border-b border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_24px_rgba(0,0,0,0.45)] py-2 sm:py-2.5'
          : 'bg-transparent border-b border-transparent py-3 sm:py-3.5'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative z-40 h-14 sm:h-16 flex items-center justify-between gap-4">

          {/* Clean Responsive Logo & Version Pill */}
          <a href="#top" className="flex items-center gap-3 select-none group shrink-0">
            <img
              src="/logo.png"
              alt="Grido Studio Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/appicon.png';
              }}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-[#60a5fa] transition-colors">
                  Grido Studio
                </span>
                <span className="text-[9px] font-mono font-bold text-[#60a5fa] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded-full border border-[#3b82f6]/25">
                  {displayVersion}
                </span>
              </div>
              <span className="text-[10px] text-[#8A8A8A] -mt-0.5 hidden sm:block">استوديو الهوية والطباعة</span>
            </div>
          </a>

          {/* Desktop Nav Links — Capsule مصقولة مع مؤشر منزلق (Magic Pill) */}
          <nav className="relative hidden lg:flex items-center gap-1 bg-[#171717]/85 backdrop-blur-xl p-1 rounded-full border border-white/[0.08] shadow-inner shadow-black/40" aria-label="التنقل الرئيسي">
            <span
              ref={pillRef}
              aria-hidden="true"
              className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/30 opacity-0 transition-[left,width,opacity] duration-300 ease-out"
            />
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  ref={(el) => {
                    linkRefs.current[link.href] = el;
                  }}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative z-10 px-3.5 py-1.5 text-xs rounded-full transition-colors duration-200 ${
                    isActive ? 'text-white font-bold' : 'text-[#9E9E9E] hover:text-white'
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
              className="cta-shine hidden sm:inline-flex h-9 px-4 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold ds-elevate-raised items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              aria-label="تحميل البرنامج"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل البرنامج</span>
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-[#171717]/80 text-white border border-white/[0.08] cursor-pointer hover:bg-[#262626] hover:border-white/[0.16] transition-colors"
              aria-label="القائمة"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* خلفية معتمة خلف قائمة الجوال — Portal إلى body: الهيدر الملتصق يستعمل backdrop-blur عند التمرير
            فيصير الحاوية المرجعية لعناصر fixed ويسجن الخلفية داخل شريط الهيدر؛ الإغلاق بالنقر */}
        {menuOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-30 bg-black/55 backdrop-blur-sm animate-fadeIn lg:hidden"
              aria-hidden="true"
              onClick={() => setMenuOpen(false)}
            />,
            document.body,
          )}

        {/* Mobile Dropdown Menu Drawer */}
        {menuOpen && (
          <div id="mobile-nav" className="relative z-50 lg:hidden mt-2 p-3 rounded-2xl border border-white/[0.08] bg-[#171717]/95 backdrop-blur-2xl ds-elevate-dialog animate-fadeIn">
            <nav className="flex flex-col gap-1" aria-label="التنقل للجوال">
              {NAV_LINKS.map((link, index) => {
                const isActive = activeSection === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    style={{ animationDelay: `${60 + index * 35}ms` }}
                    className={`animate-dropIn flex items-center gap-3 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                      isActive ? 'text-white bg-[#3b82f6]/15 border-[#3b82f6]/30' : 'border-transparent text-[#9E9E9E] hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <span>{link.label}</span>
                  </a>
                );
              })}
              <div className="pt-2 animate-dropIn" style={{ animationDelay: `${60 + NAV_LINKS.length * 35}ms` }}>
                <a
                  href={GITHUB_RELEASE_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-shine w-full h-9 px-4 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold ds-elevate-raised flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل مباشر لويندوز</span>
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* شريط تقدم التمرير — أسفل الهيدر، من اليمين لليسار */}
      <span
        ref={progressRef}
        aria-hidden="true"
        style={{ transform: 'scaleX(0)' }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-right bg-gradient-to-l from-[#3b82f6] via-[#38bdf8] to-[#3b82f6] will-change-transform"
      />
    </header>
  );
}
