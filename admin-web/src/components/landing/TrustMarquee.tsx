import { WifiOff, Cpu, Droplets, ShieldCheck, Zap, Gauge, Monitor, FileCheck2 } from 'lucide-react';

/**
 * شريط ثقة متحرك (Infinite Marquee) تحت الهيرو.
 * يعرض قدرات النظام الأساسية كعناصر قصيرة بخط monospace بأسلوب شريط الإحصائيات
 * التقني — يضيف حركة حيّة للصفحة دون تشتيت. يتوقف عند hover ويحترم reduced-motion.
 */
const ITEMS = [
  { icon: Zap, label: '3 SECONDS WORKFLOW' },
  { icon: WifiOff, label: 'CORE 100% OFFLINE' },
  { icon: Cpu, label: 'CODEFORMER + REAL-ESRGAN' },
  { icon: Droplets, label: 'CMYK PRESS READY' },
  { icon: ShieldCheck, label: 'K=100% PURE BLACK CUTS' },
  { icon: Gauge, label: '300 DPI EXPORT' },
  { icon: Monitor, label: 'WINDOWS 10 / 11' },
  { icon: FileCheck2, label: 'TIFF + HIGH-JPEG' },
];

function MarqueeRow({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-10 px-5" aria-hidden={ariaHidden || undefined}>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <span key={item.label} className="inline-flex items-center gap-2.5 text-[11px] font-mono font-bold text-tertiary tracking-[2px] uppercase whitespace-nowrap">
            <Icon className="w-3.5 h-3.5 text-white/70 shrink-0" aria-hidden />
            <span dir="ltr">{item.label}</span>
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
