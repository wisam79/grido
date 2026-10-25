import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Header } from '../components/landing/Header';
import { HeroSection } from '../components/landing/HeroSection';
import { BentoGrid } from '../components/landing/BentoGrid';
import { AiSpotlightSection } from '../components/landing/AiSpotlightSection';
import { Windows11Section } from '../components/landing/Windows11Section';
import { RoiCalculator } from '../components/landing/RoiCalculator';
import { ComparisonSection } from '../components/landing/ComparisonSection';
import { TestimonialsSection } from '../components/landing/TestimonialsSection';
import { PricingSection } from '../components/landing/PricingSection';
import { FaqSection } from '../components/landing/FaqSection';
import { CtaBanner } from '../components/landing/CtaBanner';
import { Footer } from '../components/landing/Footer';
import { WhatsAppFloatingButton } from '../components/landing/WhatsAppButton';
import type { CurrencyCode } from '../data/landing-content';
import { GITHUB_RELEASE_DOWNLOAD_URL } from '../lib/version';

export default function LandingPage() {
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('IQD');

  // Global mousemove tracker for Spotlight Card Glow Effect
  useEffect(() => {
    let rafId: number | null = null;
    let lastEvent: MouseEvent | null = null;

    const flush = () => {
      rafId = null;
      const e = lastEvent;
      lastEvent = null;
      if (!e) return;
      const card = (e.target as Element | null)?.closest?.('.spotlight-card, .spotlight-hover') as HTMLElement | null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastEvent = e;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // إظهار زر التحميل العائم بعد تجاوز الهيرو (شريط التقدم يقع في الهيدر)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const shouldShow = window.scrollY > 500;
        setShowFloatingCta((prev) => (prev !== shouldShow ? shouldShow : prev));
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for smooth scroll reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '40px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div
      dir="rtl"
      className="landing-shell relative min-h-screen overflow-x-hidden bg-workspace font-sans text-text-primary selection:bg-brand-primary/30 selection:text-white"
    >
      {/* رابط التخطي — يظهر لمستخدمي لوحة المفاتيح قبل التنقل */}
      <a href="#main-content" className="skip-to-content">
        تخطَّ إلى المحتوى الرئيسي
      </a>

      {/* Navigation Header */}
      <Header />

      <main id="main-content" className="relative z-10">
        {/* Section 1: Hero */}
        <div className="reveal-on-scroll is-visible">
          <HeroSection />
        </div>

        {/* Section 2: Core Capabilities (Bento Grid) */}
        <div className="reveal-on-scroll">
          <BentoGrid />
        </div>

        {/* Section 3: AI Engine Spotlight */}
        <div className="reveal-on-scroll">
          <AiSpotlightSection />
        </div>

        {/* Section 4: Windows 11 Native Experience */}
        <div className="reveal-on-scroll">
          <Windows11Section />
        </div>

        {/* Interactive ROI Calculator */}
        <div className="reveal-on-scroll">
          <RoiCalculator currency={currency} onCurrencyChange={setCurrency} />
        </div>

        {/* Speed & Legacy Comparison */}
        <div className="reveal-on-scroll">
          <ComparisonSection />
        </div>

        {/* Section: Studio Testimonials & Social Proof */}
        <div className="reveal-on-scroll">
          <TestimonialsSection />
        </div>

        {/* Section 6: Lifetime Pricing & Licensing */}
        <div className="reveal-on-scroll">
          <PricingSection currency={currency} onCurrencyChange={setCurrency} />
        </div>

        {/* FAQ Accordion */}
        <div className="reveal-on-scroll">
          <FaqSection />
        </div>

        {/* High-Impact Closing CTA Banner */}
        <div className="reveal-on-scroll">
          <CtaBanner />
        </div>
      </main>

      {/* Footer */}
      <Footer />
      <WhatsAppFloatingButton />

      {/* Floating Bottom Quick Download Pill */}
      {showFloatingCta && (
        <a
          href={GITHUB_RELEASE_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-50 flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full bg-brand-primary hover:bg-brand-hover text-white font-semibold text-[11px] sm:text-xs ds-elevate-overlay transition-all duration-200 hover:scale-105 active:scale-95 animate-fadeIn"
          aria-label="تحميل مباشر الآن"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
          <span>تحميل Grido Studio</span>
        </a>
      )}
    </div>
  );
}
