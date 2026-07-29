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
      className="relative min-h-screen overflow-x-hidden bg-[#141414] font-sans text-white selection:bg-brand-500/30"
    >
      {/* Top Scroll Progress Bar */}
      <div className="fixed top-0 inset-x-0 h-1 bg-[#1e1e1e] z-[60] pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-brand-600 via-blue-500 to-indigo-500 transition-all duration-150 ease-out shadow-[0_0_12px_rgba(59,130,246,0.6)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Dominant Dark Gray Foundation with Subtle Ambient Accent Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Deep Charcoal / Neutral Dark Gray Base */}
        <div className="absolute inset-0 bg-[#121212]" />
        
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Controlled, soft blue accent glows that don't overpower the gray */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_80%_10%,rgba(37,99,235,0.08),transparent_60%),radial-gradient(50%_35%_at_15%_45%,rgba(59,130,246,0.05),transparent_55%),radial-gradient(55%_40%_at_50%_85%,rgba(29,78,216,0.06),transparent_60%)]" />
      </div>

      <Header />

      <main className="relative z-10 space-y-4">
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

      {/* Floating Bottom Quick Download CTA Button - Converts Users on Scroll */}
      {showFloatingCta && (
        <a
          href={GITHUB_RELEASE_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-extrabold font-display text-sm shadow-lg shadow-black/40 transition-all hover:scale-105 active:scale-95 border border-blue-400/30 backdrop-blur-md animate-bounce-slow"
          aria-label="تحميل مباشر الآن"
        >
          <Download className="w-4 h-4 text-white" />
          <span>تحميل Grido Studio</span>
        </a>
      )}
    </div>
  );
}
