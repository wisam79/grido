import { WifiOff, Cpu, Droplets, ShieldCheck, Zap, Gauge, Monitor, FileCheck2 } from 'lucide-react';

const ITEMS = [
  { icon: Zap, label: 'خطوة كاملة بـ 3 ثوانٍ فقط' },
  { icon: WifiOff, label: 'الأساسيات بدون إنترنت 100%' },
  { icon: Cpu, label: 'ترميم CodeFormer + Real-ESRGAN' },
  { icon: Droplets, label: 'جاهز لمطابع ألوان CMYK' },
  { icon: ShieldCheck, label: 'قص بأسود خالص K=100%' },
  { icon: Gauge, label: 'تصدير بدقة 300 DPI' },
  { icon: Monitor, label: 'ويندوز 10 / 11 64-بت' },
  { icon: FileCheck2, label: 'TIFF + High-JPEG عالي الجودة' },
];

function MarqueeRow({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-8 px-4" aria-hidden={ariaHidden || undefined}>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <span key={item.label} className="inline-flex items-center gap-2 text-xs font-mono text-[#a1a4a5] whitespace-nowrap">
            <Icon className="w-3.5 h-3.5 text-[#00a3ff] shrink-0" aria-hidden />
            <span>{item.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function TrustMarquee() {
  return (
    <div className="relative border-y border-[rgba(214,235,253,0.19)] bg-[#000000] overflow-hidden select-none">
      {/* Edge fades */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-[#000000] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-[#000000] to-transparent" />

      <div className="marquee-track flex w-max py-3" dir="ltr">
        <MarqueeRow />
        <MarqueeRow ariaHidden />
      </div>
    </div>
  );
}

