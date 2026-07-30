import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Header } from '../components/landing/Header';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesTabs } from '../components/landing/FeaturesTabs';
import { ComparisonSection } from '../components/landing/ComparisonSection';
import { BenefitsGrid } from '../components/landing/BenefitsGrid';
import { TestimonialsSection } from '../components/landing/TestimonialsSection';
import { FaqSection } from '../components/landing/FaqSection';
import { CtaBanner } from '../components/landing/CtaBanner';
import { Footer } from '../components/landing/Footer';

const DESCRIPTION =
  'المنصة المتكاملة الأولى المصممة خصيصاً لأصحاب الاستوديوهات ومحلات التصوير. طباعة صور الهوية، كولاج محترف، واستعادة ملامح الوجه بالذكاء الاصطناعي.';

const GITHUB_RELEASE_DOWNLOAD_URL = '/api/download';

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showFloatingCta, setShowFloatingCta] = useState(false);

  useEffect(() => {
    document.title = 'Grido Studio | استوديو الصور ومعالجة صور الهوية بالذكاء الاصطناعي';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', DESCRIPTION);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = DESCRIPTION;
      document.head.appendChild(meta);
    }
  }, []);

  // Track scroll progress & floating CTA visibility
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      }
      setShowFloatingCta(window.scrollY > 450);
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
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.12 }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-x-hidden bg-[#121214] font-sans text-[#f0f0fa] selection:bg-white/20"
    >
      {/* Top Scroll Progress Bar */}
      <div className="fixed top-0 inset-x-0 h-0.5 bg-[#24242c] z-[60] pointer-events-none">
        <div
          className="h-full bg-white transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* SpaceX Dark Charcoal Canvas Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#121214]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <Header />

      <main className="relative z-10">
        <div className="reveal-on-scroll is-revealed">
          <HeroSection />
        </div>
        <div className="reveal-on-scroll">
          <FeaturesTabs />
        </div>
        <div className="reveal-on-scroll">
          <ComparisonSection />
        </div>
        <div className="reveal-on-scroll">
          <BenefitsGrid />
        </div>
        <div className="reveal-on-scroll">
          <TestimonialsSection />
        </div>
        <div className="reveal-on-scroll">
          <FaqSection />
        </div>
        <div className="reveal-on-scroll">
          <CtaBanner />
        </div>
      </main>

      <Footer />

      {/* Floating Bottom Quick Download SpaceX Pill CTA */}
      {showFloatingCta && (
        <a
          href={GITHUB_RELEASE_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-[#f0f0fa] text-black font-extrabold text-xs tracking-[1px] uppercase transition-all duration-300 hover:scale-105 active:scale-95 border border-white"
          aria-label="تحميل مباشر الآن"
        >
          <Download className="w-4 h-4 text-black shrink-0" />
          <span>تحميل GRIDO STUDIO</span>
        </a>
      )}
    </div>
  );
}
