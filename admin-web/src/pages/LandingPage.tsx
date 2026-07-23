import { useEffect } from 'react';
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

export default function LandingPage() {
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

  return (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-x-hidden bg-ink-950 font-sans text-white selection:bg-brand-500/30"
    >
      {/* Clean background with smooth radial gradients (no grain/noise layer) */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(50%_40%_at_10%_30%,rgba(34,211,238,0.12),transparent_55%),radial-gradient(55%_45%_at_50%_100%,rgba(56,189,248,0.10),transparent_60%)]" />
      </div>

      <Header />
      <main className="relative z-10">
        <HeroSection />
        <FeaturesTabs />
        <ComparisonSection />
        <BenefitsGrid />
        <TestimonialsSection />
        <FaqSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
