import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Header } from '../components/landing/Header';
import { HeroSection } from '../components/landing/HeroSection';
import { TrustMarquee } from '../components/landing/TrustMarquee';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { FeaturesTabs } from '../components/landing/FeaturesTabs';
import { ComparisonSection } from '../components/landing/ComparisonSection';
import { BenefitsGrid } from '../components/landing/BenefitsGrid';
import { TestimonialsSection } from '../components/landing/TestimonialsSection';
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

  // Global mousemove tracker for Spotlight Card Glow Effect (design.md Section 4.2)
  // الأداء: التوهج يظهر فقط على البطاقة تحت المؤشر — نحدّث متغيرات البطاقة المستهدفة وحدها
  // (closest) بدل حساب getBoundingClientRect لكل البطاقات في كل حدث، مع كبح بـ rAF.
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

  // Track scroll progress & floating CTA visibility (throttled with rAF + state guards)
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

  // Intersection Observer for smooth scroll reveal animations (unobserve once revealed)
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
      { threshold: 0.2 }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);



  return (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-x-hidden bg-primary font-sans text-secondary selection:bg-white/20"
    >
      <a href="#features" className="skip-link">
        تخطَّ إلى المحتوى
      </a>

      {/* Top Scroll Progress Bar (grows from inline-start = right in RTL) */}
      <div className="fixed top-0 inset-x-0 h-0.5 bg-elevated/70 z-[60] pointer-events-none">
        <div
          className="absolute top-0 start-0 h-full bg-white transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* SpaceX Dark Charcoal Canvas Background & Aurora */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div className="aurora-bg fixed" aria-hidden />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <Header />

      <main id="main-content" className="relative z-10">
        <div className="reveal-on-scroll is-revealed is-visible">
          <HeroSection />
        </div>
        <TrustMarquee />
        <div className="reveal-on-scroll">
          <BenefitsGrid />
        </div>
        <div className="reveal-on-scroll">
          <HowItWorksSection />
        </div>
        <div className="reveal-on-scroll">
          <FeaturesTabs />
        </div>
        <div className="reveal-on-scroll">
          <ComparisonSection />
        </div>
        <div className="reveal-on-scroll">
          <TestimonialsSection />
        </div>
        <div className="reveal-on-scroll">
          <QuotesSection />
        </div>
        <div className="reveal-on-scroll">
          <PricingSection />
        </div>
        <div className="reveal-on-scroll">
          <FaqSection />
        </div>
        <div className="reveal-on-scroll">
          <CtaBanner />
        </div>
      </main>

      <Footer />
      <WhatsAppFloatingButton />

      {/* Floating Bottom Quick Download SpaceX Pill CTA */}
      {showFloatingCta && (
        <a
          href={GITHUB_RELEASE_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="magnetic-pill fixed bottom-6 end-6 z-50 flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-[#f0f0fa] text-black font-extrabold text-xs transition-all duration-300 hover:scale-105 active:scale-95 border border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          aria-label="تحميل مباشر الآن"
        >
          <Download className="w-4 h-4 text-black shrink-0" />
          <span>تحميل GRIDO STUDIO</span>
        </a>
      )}
    </div>
  );
}
