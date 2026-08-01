import { WifiOff, Cpu, Droplets, ShieldCheck, Zap, Gauge, Monitor, FileCheck2 } from 'lucide-react';

/**
 * شريط ثقة متحرك (Infinite Marquee) تحت الهيرو.
 * يعرض قدرات النظام الأساسية كعناصر قصيرة — يضيف حركة حيّة للصفحة دون تشتيت.
 * يتوقف عند hover ويحترم reduced-motion.
 */
const ITEMS = [
  { icon: Zap, label: 'خطوة كاملة بـ 3 ثوانٍ' },
  { icon: WifiOff, label: 'الأساسيات بدون إنترنت 100%' },
  { icon: Cpu, label: 'ترميم CodeFormer + Real-ESRGAN' },
  { icon: Droplets, label: 'جاهز لمطابع CMYK' },
  { icon: ShieldCheck, label: 'قص بأسود خالص K=100%' },
  { icon: Gauge, label: 'تصدير بدقة 300 DPI' },
  { icon: Monitor, label: 'ويندوز 10 / 11' },
  { icon: FileCheck2, label: 'TIFF + JPEG عالي الجودة' },
];

function MarqueeRow({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-10 px-5" aria-hidden={ariaHidden || undefined}>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <span key={item.label} className="inline-flex items-center gap-2.5 text-[11px] font-bold text-tertiary whitespace-nowrap">
            <Icon className="w-3.5 h-3.5 text-white/70 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function TrustMarquee() {
  return (
    <div className="relative border-y border-subtle bg-secondary/40 overflow-hidden select-none">
      {/* حواف متلاشية يميناً ويساراً لانسيابية الدخول والخروج */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-primary to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-primary to-transparent" />

      <div className="marquee-track flex w-max py-3.5" dir="ltr">
        <MarqueeRow />
        <MarqueeRow ariaHidden />
      </div>
    </div>
  );
}
