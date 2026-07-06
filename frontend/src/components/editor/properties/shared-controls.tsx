import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/10 last:border-b-0 text-[11px]">
      <span className="text-muted-foreground font-semibold">{label}</span>
      <span className="font-mono font-bold text-foreground/85 text-left" dir="auto">{value}</span>
    </div>
  );
}

export function SliderControl({
  label,
  icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-[10.5px] font-medium">{label}</span>
        </div>
        <span className="text-[10.5px] text-foreground/80 font-mono font-semibold">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="mt-1"
      />
    </div>
  );
}

export function ColorWheelPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hsl, setHsl] = useState({ h: 0, s: 0, l: 50 });

  // Sync HSL when color prop changes
  useEffect(() => {
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      setHsl(hexToHsl(color));
    }
  }, [color]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    const cx = rect.left + radius;
    const cy = rect.top + radius;
    
    // Relative coordinates from center
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    
    let distance = Math.sqrt(dx * dx + dy * dy);
    distance = Math.min(distance, radius); // Clamp distance
    
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += 2 * Math.PI;
    
    const h = Math.round((angle * 180) / Math.PI);
    const s = Math.round((distance / radius) * 100);
    
    const newHex = hslToHex(h, s, hsl.l);
    setHsl({ h, s, l: hsl.l });
    onChange(newHex);
  };

  // Convert HSL coordinates for handle positioning
  const radius = 52; // w-26 is 104px, so radius is 52px
  const angleRad = (hsl.h * Math.PI) / 180;
  const dist = (hsl.s * radius) / 100;
  
  // Center is radius, so coordinates are offset by radius
  const handleX = radius + dist * Math.cos(angleRad);
  const handleY = radius + dist * Math.sin(angleRad);

  return (
    <div className="p-3 bg-muted/30 dark:bg-muted/10 rounded-xl border border-border/40 mt-3 flex items-center gap-4 w-full">
      {/* Left: The Circular Color Wheel */}
      <div className="relative w-26 h-26 shrink-0 shadow-sm rounded-full">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => {
            if (e.buttons === 1) handlePointerMove(e);
          }}
          className="w-full h-full rounded-full cursor-crosshair relative shadow-inner border border-border/30 overflow-hidden"
          style={{
            background: `radial-gradient(circle, #ffffff 0%, transparent 100%), conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)`
          }}
        />
        {/* Pointer Handle - Styled to stand out on any background */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3),_0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none transition-all duration-75"
          style={{
            left: `${handleX}px`,
            top: `${handleY}px`,
            transform: "translate(-50%, -50%)",
            backgroundColor: color
          }}
        />
      </div>

      {/* Right: Controls (Hex Input & Lightness Slider) */}
      <div className="flex-1 flex flex-col justify-between gap-3 min-w-0">
        {/* Hex input & Active preview circle */}
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground block font-medium">اللون المخصص</span>
          <div className="flex items-center gap-1.5">
            <div 
              className="w-5.5 h-5.5 rounded-md border border-border/50 shadow-xs shrink-0" 
              style={{ backgroundColor: color }} 
            />
            <Input
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="h-7 text-[10.5px] font-mono px-1.5 text-center font-bold"
              placeholder="#HEX"
            />
          </div>
        </div>

        {/* Lightness Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] text-muted-foreground">
            <span>السطوع</span>
            <span className="font-mono text-[9px] font-semibold">{hsl.l}%</span>
          </div>
          <div className="relative w-full h-3 rounded-lg border border-border/30 overflow-hidden shadow-inner">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, #000000, ${hslToHex(hsl.h, hsl.s, 50)}, #ffffff)`
              }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={hsl.l}
              onChange={(e) => {
                const l = Number(e.target.value);
                const newHex = hslToHex(hsl.h, hsl.s, l);
                setHsl({ ...hsl, l });
                onChange(newHex);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {/* Slider thumb representation */}
            <div
              className="absolute top-0 bottom-0 w-2.5 bg-white border border-black/35 shadow-xs pointer-events-none rounded-[2.5px]"
              style={{
                left: `calc(${hsl.l}% - 5px)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: HSL to HEX
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// Helper: HEX to HSL
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  if (hex.length !== 6) return { h: 0, s: 0, l: 100 };
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
