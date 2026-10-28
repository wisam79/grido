import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Header } from "../components/landing/Header";
import { HeroSection } from "../components/landing/HeroSection";
import { BentoGrid } from "../components/landing/BentoGrid";
import { AiSpotlightSection } from "../components/landing/AiSpotlightSection";
import { Windows11Section } from "../components/landing/Windows11Section";
import { RoiCalculator } from "../components/landing/RoiCalculator";
import { ComparisonSection } from "../components/landing/ComparisonSection";
import { TestimonialsSection } from "../components/landing/TestimonialsSection";
import { PricingSection } from "../components/landing/PricingSection";
import { FaqSection } from "../components/landing/FaqSection";
import { CtaBanner } from "../components/landing/CtaBanner";
import { Footer } from "../components/landing/Footer";
import { WhatsAppFloatingButton } from "../components/landing/WhatsAppButton";
import type { CurrencyCode } from "../data/landing-content";
import { GITHUB_RELEASE_DOWNLOAD_URL } from "../lib/version";

export default function LandingPage() {
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("IQD");
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let rafId: number | null = null;
    const update = () => {
      rafId = null;
      const shouldShow = window.scrollY > 500;
      setShowFloatingCta((previous) =>
        previous === shouldShow ? previous : shouldShow,
      );
    };
    const onScroll = () => {
      if (rafId === null) rafId = requestAnimationFrame(update);
    };

    // Also handle a restored scroll position without waiting for another scroll event.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Optional card-only fades. Nothing is hidden while waiting for this enhancement.
  useEffect(() => {
    const main = mainRef.current;
    if (
      !main ||
      typeof IntersectionObserver === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cards = Array.from(
      main.querySelectorAll<HTMLElement>(".landing-section .landing-card"),
    );
    const revealed = new WeakSet<Element>();
    let observer: IntersectionObserver | null = null;
    let disposed = false;

    const syncMotion = () => {
      observer?.disconnect();
      observer = null;
      cards.forEach((card) => card.classList.remove("landing-reveal-enter"));
      if (motion.matches) return;

      observer = new IntersectionObserver(
        (entries) => {
          if (disposed || motion.matches) return;
          entries.forEach((entry) => {
            if (!entry.isIntersecting || revealed.has(entry.target)) return;
            revealed.add(entry.target);
            entry.target.classList.add("landing-reveal-enter");
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0.05 },
      );
      cards.forEach((card) => {
        if (!revealed.has(card)) observer?.observe(card);
      });
    };

    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => {
      disposed = true;
      observer?.disconnect();
      motion.removeEventListener("change", syncMotion);
      cards.forEach((card) => card.classList.remove("landing-reveal-enter"));
    };
  }, []);

  return (
    <div
      dir="rtl"
      className="landing-shell relative min-h-screen font-sans selection:bg-brand-primary/30 selection:text-white"
    >
      <a href="#main-content" className="skip-to-content">
        تخطَّ إلى المحتوى الرئيسي
      </a>

      <Header />

      <main ref={mainRef} id="main-content" tabIndex={-1}>
        <HeroSection />
        <BentoGrid />
        <AiSpotlightSection />
        <Windows11Section />
        <RoiCalculator currency={currency} onCurrencyChange={setCurrency} />
        <ComparisonSection />
        <TestimonialsSection />
        <PricingSection currency={currency} onCurrencyChange={setCurrency} />
        <FaqSection />
        <CtaBanner />
      </main>

      <Footer />
      <WhatsAppFloatingButton />

      {showFloatingCta && (
        <a
          href={GITHUB_RELEASE_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary landing-floating-download"
          aria-label="تحميل Grido Studio لويندوز"
        >
          <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>تحميل Grido Studio</span>
        </a>
      )}
    </div>
  );
}
