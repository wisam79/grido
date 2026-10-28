import { useEffect, useRef, useState } from "react";
import { Download, Menu, X } from "lucide-react";
import { GITHUB_RELEASE_DOWNLOAD_URL } from "../../lib/version";

const NAV_LINKS = [
  { href: "#capabilities", label: "المميزات" },
  { href: "#ai-engine", label: "الذكاء الاصطناعي" },
  { href: "#windows-experience", label: "ويندوز 11" },
  { href: "#roi", label: "الحاسبة" },
  { href: "#testimonials", label: "أمثلة الاستخدام" },
  { href: "#pricing", label: "الأسعار" },
  { href: "#faq", label: "الأسئلة" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Navigation remains usable when IntersectionObserver is unavailable.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const sections = [
      document.getElementById("top"),
      ...NAV_LINKS.map(({ href }) => document.getElementById(href.slice(1))),
    ].filter((element): element is HTMLElement => element !== null);
    const visibleSections = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleSections.add(entry.target);
          else visibleSections.delete(entry.target);
        });
        const current = sections.find((section) =>
          visibleSections.has(section),
        );
        if (current)
          setActiveSection(current.id === "top" ? "" : `#${current.id}`);
      },
      { rootMargin: "-80px 0px 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // A non-modal disclosure: no scrim or focus trap, and no hidden desktop menu state.
  useEffect(() => {
    if (!menuOpen) return;

    const closeOutside = (event: Event) => {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const desktop =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(min-width: 80rem)")
        : null;
    const onDesktopChange = () => {
      if (desktop?.matches) setMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", onKeyDown);
    desktop?.addEventListener("change", onDesktopChange);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", onKeyDown);
      desktop?.removeEventListener("change", onDesktopChange);
    };
  }, [menuOpen]);

  return (
    <header ref={headerRef} className="landing-header">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-18 flex items-center justify-between gap-3">
          <a
            href="#top"
            aria-label="Grido Studio — الرئيسية"
            className="inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-md py-2"
          >
            <img
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              onError={(event) => {
                const image = event.currentTarget;
                if (image.getAttribute("src") !== "/appicon.png")
                  image.src = "/appicon.png";
              }}
            />
            <span
              dir="ltr"
              className="text-base font-semibold tracking-tight text-text-primary"
            >
              Grido Studio
            </span>
          </a>

          <nav
            className="hidden xl:flex items-center gap-0.5"
            aria-label="التنقل الرئيسي"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={
                  activeSection === link.href ? "location" : undefined
                }
                className="landing-nav-link"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={GITHUB_RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary hidden sm:inline-flex"
            >
              <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>تحميل البرنامج</span>
            </a>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="btn-secondary h-11 w-11 p-0 xl:hidden"
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              {menuOpen ? (
                <X aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Menu aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!menuOpen}
        className="landing-mobile-nav xl:hidden"
      >
        <nav className="grid gap-1" aria-label="التنقل للجوال">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                setMenuOpen(false);
                menuButtonRef.current?.focus({ preventScroll: true });
              }}
              aria-current={
                activeSection === link.href ? "location" : undefined
              }
              className="landing-nav-link justify-start"
            >
              {link.label}
            </a>
          ))}
          <a
            href={GITHUB_RELEASE_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setMenuOpen(false);
              menuButtonRef.current?.focus({ preventScroll: true });
            }}
            className="btn-primary mt-2 w-full"
          >
            <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>تحميل مباشر لويندوز</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
