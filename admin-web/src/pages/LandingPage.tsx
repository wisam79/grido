import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Header } from '../components/landing/Header';
import { HeroSection } from '../components/landing/HeroSection';
import { TrustMarquee } from '../components/landing/TrustMarquee';
import { FutureStudioSection } from '../components/landing/FutureStudioSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { FeaturesTabs } from '../components/landing/FeaturesTabs';
import { StudioEcosystemSection } from '../components/landing/StudioEcosystemSection';
import { ComparisonSection } from '../components/landing/ComparisonSection';
import { BenefitsGrid } from '../components/landing/BenefitsGrid';
import { RoiCalculator } from '../components/landing/RoiCalculator';
import { QuotesSection } from '../components/landing/QuotesSection';
import { PricingSection } from '../components/landing/PricingSection';
import { FaqSection } from '../components/landing/FaqSection';
import { CtaBanner } from '../components/landing/CtaBanner';
import { Footer } from '../components/landing/Footer';
import { WhatsAppFloatingButton } from '../components/landing/WhatsAppButton';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showFloatingCta, setShowFloatingCta] = useState(false);

  // Global mousemove tracker for Spotlight Card Glow Effect
  useEffect(() => {
    let rafId: number | null = null;
    let lastEvent: MouseEvent | null = null;

    const flush = () => {
      rafId = null;
      const e = lastEvent;
      lastEvent = null;
      if (!e) return;
      const card = (e.target as Element | null)?.closest?.('.spotlight-card') as HTMLElement | null;
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

  // Track scroll progress & floating CTA visibility
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const scrollY = window.scrollY;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;

        if (totalHeight > 0) {
          const progress = Math.round((scrollY / totalHeight) * 100);
          setScrollProgress((prev) => (prev !== progress ? progress : prev));
        }

        const shouldShow = scrollY > 450;
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
            entry.target.classList.add('is-revealed', 'is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-x-hidden bg-[#000000] font-sans text-[#f0f0f0] selection:bg-[#00a3ff]/30 selection:text-white"
    >
      <a href="#features" className="skip-link">
        تخطَّ إلى المحتوى
      </a>

      {/* Top Scroll Progress Bar */}
      <div className="fixed top-0 inset-x-0 h-0.5 bg-[#191b1e] z-[60] pointer-events-none">
        <div
          className="absolute top-0 start-0 h-full bg-[#00a3ff] transition-all duration-150 ease-out shadow-[0_0_8px_#00a3ff]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <Header />

      <main id="main-content" className="relative z-10">
        <div className="reveal-on-scroll is-revealed is-visible">
          <HeroSection />
        </div>

        <TrustMarquee />

        <div className="reveal-on-scroll section-content-visibility">
          <HowItWorksSection />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <FeaturesTabs />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <FutureStudioSection />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <ComparisonSection />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <StudioEcosystemSection />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <RoiCalculator />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <BenefitsGrid />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <QuotesSection />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <PricingSection />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <FaqSection />
        </div>

        <div className="reveal-on-scroll section-content-visibility">
          <CtaBanner />
        </div>
      </main>

      <Footer />
      <WhatsAppFloatingButton />

      {/* Floating Bottom Quick Download Pill */}
      {showFloatingCta && (
        <a
          href={GITHUB_RELEASE_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 end-6 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00a3ff] hover:bg-[#008fe0] text-white font-medium text-xs shadow-[0_4px_20px_rgba(0,163,255,0.4)] transition-all duration-200"
          aria-label="تحميل مباشر الآن"
        >
          <Download className="w-4 h-4 text-white shrink-0" />
          <span>تحميل Grido Studio Pro</span>
        </a>
      )}
    </div>
  );
}

