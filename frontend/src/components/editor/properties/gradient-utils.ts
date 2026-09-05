// حساب زاوية التدرج الخطي من نقطتي البداية/النهاية (0° = يسار→يمين، وتدور مع عقارب الساعة نزولاً)
export function gradientAngleFromPoints(
  start?: { x: number; y: number },
  end?: { x: number; y: number }
): number {
  const s = start || { x: 0, y: 0 };
  const e = end || { x: 1, y: 1 };
  const deg = (Math.atan2(e.y - s.y, e.x - s.x) * 180) / Math.PI;
  return Math.round(((deg + 360) % 360) * 10) / 10;
}

// توليد نقطتي البداية/النهاية حول مركز العنصر من زاوية معطاة (إحداثيات نسبية 0-1 كما في Konva)
export function gradientPointsFromAngle(deg: number): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const rad = (deg * Math.PI) / 180;
  const dx = Math.cos(rad) * 0.5;
  const dy = Math.sin(rad) * 0.5;
  return {
    start: { x: 0.5 - dx, y: 0.5 - dy },
    end: { x: 0.5 + dx, y: 0.5 + dy },
  };
}

/** تحويل مصفوفة Color Stops إلى صيغة CSS صالحة للعرض المباشر */
export function formatGradientCss(
  stops: Array<number | string>,
  type: "linear" | "radial" = "linear",
  angle: number = 135
): string {
  if (!stops || stops.length < 4) return "#3b82f6";
  const stopParts: string[] = [];
  for (let i = 0; i < stops.length; i += 2) {
    const pos = Math.round(Number(stops[i]) * 100);
    const color = stops[i + 1];
    stopParts.push(`${color} ${pos}%`);
  }
  if (type === "radial") {
    return `radial-gradient(circle, ${stopParts.join(", ")})`;
  }
  return `linear-gradient(${angle}deg, ${stopParts.join(", ")})`;
}

export interface GradientPreset {
  id: string;
  name: string;
  category: "luxury" | "aurora" | "neon" | "pastel";
  stops: Array<number | string>;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  // 🌟 استوديو ملكي ومعادن فاخرة
  { id: "gold", name: "ذهب ملكي", category: "luxury", stops: [0, "#D4AF37", 0.5, "#FFF2B2", 1, "#AA771C"] },
  { id: "silver", name: "تيتانيوم فضي", category: "luxury", stops: [0, "#E2E8F0", 0.5, "#FFFFFF", 1, "#94A3B8"] },
  { id: "bronze", name: "برونز إمبراطوري", category: "luxury", stops: [0, "#B45309", 0.5, "#FDE68A", 1, "#78350F"] },
  { id: "obsidian", name: "أوبسيديان أسود", category: "luxury", stops: [0, "#3F3F46", 0.5, "#18181B", 1, "#09090B"] },
  { id: "navy", name: "كحلي دبلوماسي", category: "luxury", stops: [0, "#1E40AF", 0.5, "#1E3A8A", 1, "#0F172A"] },
  { id: "emerald", name: "زمرد ملكي", category: "luxury", stops: [0, "#059669", 0.5, "#34D399", 1, "#064E3B"] },

  // 🌅 شفق وطبيعة
  { id: "sunrise", name: "شفق الشروق", category: "aurora", stops: [0, "#F59E0B", 1, "#EF4444"] },
  { id: "northern", name: "شفق قطبي", category: "aurora", stops: [0, "#06B6D4", 0.5, "#3B82F6", 1, "#8B5CF6"] },
  { id: "sunset", name: "غروب دافئ", category: "aurora", stops: [0, "#EA580C", 1, "#E11D48"] },
  { id: "ocean", name: "محيط عميق", category: "aurora", stops: [0, "#0284C7", 1, "#1E3A8A"] },
  { id: "forest", name: "غابة استوائية", category: "aurora", stops: [0, "#10B981", 1, "#047857"] },
  { id: "velvet-sky", name: "سماء مخملية", category: "aurora", stops: [0, "#6366F1", 1, "#A855F7"] },

  // ⚡ عصري ونيون
  { id: "cyber", name: "سايبر ويف", category: "neon", stops: [0, "#06B6D4", 1, "#EC4899"] },
  { id: "solar", name: "توهج شمسي", category: "neon", stops: [0, "#FACC15", 0.5, "#F97316", 1, "#DC2626"] },
  { id: "cosmic", name: "كوني نيون", category: "neon", stops: [0, "#8B5CF6", 1, "#EC4899"] },
  { id: "electric", name: "طاقة كهربائية", category: "neon", stops: [0, "#3B82F6", 1, "#10B981"] },
  { id: "berry", name: "توت نيون", category: "neon", stops: [0, "#D946EF", 1, "#8B5CF6"] },
  { id: "fire", name: "لهب ناري", category: "neon", stops: [0, "#EF4444", 1, "#F59E0B"] },

  // 🌸 باستيل هادئ
  { id: "peach", name: "خوخ هادئ", category: "pastel", stops: [0, "#FED7AA", 1, "#F472B6"] },
  { id: "mint", name: "نعناع منعش", category: "pastel", stops: [0, "#A7F3D0", 1, "#60A5FA"] },
  { id: "lavender", name: "لافندر ناعم", category: "pastel", stops: [0, "#E9D5FF", 1, "#FBCFE8"] },
  { id: "cloud", name: "سحاب قطني", category: "pastel", stops: [0, "#BAE6FD", 1, "#DDD6FE"] },
  { id: "sand", name: "رمال ذهبية", category: "pastel", stops: [0, "#FEF08A", 1, "#FDE68A"] },
  { id: "dew", name: "ندى الصباح", category: "pastel", stops: [0, "#CFFAFE", 1, "#A7F3D0"] },
];
