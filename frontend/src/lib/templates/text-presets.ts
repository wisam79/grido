export type TextPresetType =
  | "heading"
  | "subheading"
  | "body"
  | "badge"
  | "watermark"
  | "studio-date"
  | "gold-luxury"
  | "neon-glow"
  | "stamp-circle"
  | "3d-title"
  | "outline-modern"
  | "photographer-tag"
  | "caption-card";

export interface TextPresetConfig {
  getText: () => string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  color: string;
  height: number;
  opacity?: number;
  rotation?: number;
  textBgColor?: string;
  textBgRadius?: number;
  textBgPadding?: number;
  textBgBorderColor?: string;
  textBgBorderWidth?: number;
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowGlow?: boolean;
  curve?: number;
  fillType?: "solid" | "linear" | "radial";
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?: { x: number; y: number };
  fillLinearGradientColorStops?: Array<number | string>;
}

export const TEXT_PRESETS: Record<TextPresetType, TextPresetConfig> = {
  heading: {
    getText: () => "عنوان رئيسي",
    fontSize: 48,
    fontWeight: 800,
    fontFamily: "Cairo, sans-serif",
    color: "#0f172a",
    height: 0.07,
  },
  subheading: {
    getText: () => "عنوان فرعي للتصميم",
    fontSize: 28,
    fontWeight: 600,
    fontFamily: "Almarai, sans-serif",
    color: "#334155",
    height: 0.05,
  },
  body: {
    getText: () => "اكتب هنا وصفاً أو ملاحظات إضافية للتصميم...",
    fontSize: 18,
    fontWeight: 400,
    fontFamily: '"IBM Plex Sans Arabic", sans-serif',
    color: "#475569",
    height: 0.04,
  },
  badge: {
    getText: () => "استوديو احترافي",
    fontSize: 20,
    fontWeight: 700,
    fontFamily: "Tajawal, sans-serif",
    color: "#ffffff",
    textBgColor: "#2563eb",
    textBgRadius: 999,
    textBgPadding: 10,
    height: 0.045,
  },
  watermark: {
    getText: () => "GRIDO STUDIO · مسودة",
    fontSize: 36,
    fontWeight: 800,
    fontFamily: "Alexandria, sans-serif",
    color: "#94a3b8",
    opacity: 0.25,
    rotation: -35,
    height: 0.06,
  },
  "studio-date": {
    getText: () =>
      new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }),
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "Cairo, sans-serif",
    color: "#1e293b",
    textBgColor: "rgba(241, 245, 249, 0.95)",
    textBgRadius: 8,
    textBgPadding: 8,
    height: 0.04,
  },
  "gold-luxury": {
    getText: () => "استوديو الفخامة للتصوير",
    fontSize: 42,
    fontWeight: 800,
    fontFamily: "Cairo, sans-serif",
    color: "#d97706",
    fillType: "linear",
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: 1, y: 1 },
    fillLinearGradientColorStops: [0, "#f59e0b", 0.5, "#fbbf24", 1, "#b45309"],
    shadowColor: "rgba(180, 83, 9, 0.45)",
    shadowBlur: 14,
    shadowOffsetY: 4,
    shadowOpacity: 0.6,
    height: 0.065,
  },
  "neon-glow": {
    getText: () => "GRIDO STUDIO",
    fontSize: 38,
    fontWeight: 800,
    fontFamily: "Alexandria, sans-serif",
    color: "#38bdf8",
    shadowColor: "#0284c7",
    shadowBlur: 20,
    shadowGlow: true,
    shadowOpacity: 0.9,
    stroke: "#0284c7",
    strokeWidth: 1.5,
    height: 0.06,
  },
  "stamp-circle": {
    getText: () => "استوديو التصوير المعتمد · 2026",
    fontSize: 26,
    fontWeight: 700,
    fontFamily: "Reem Kufi, sans-serif",
    color: "#dc2626",
    curve: 60,
    stroke: "#dc2626",
    strokeWidth: 0.8,
    height: 0.08,
  },
  "3d-title": {
    getText: () => "إصدار خاص وحصري",
    fontSize: 36,
    fontWeight: 900,
    fontFamily: "Changa, sans-serif",
    color: "#6366f1",
    shadowColor: "#312e81",
    shadowBlur: 0,
    shadowOffsetX: 4,
    shadowOffsetY: 4,
    shadowOpacity: 1,
    stroke: "#1e1b4b",
    strokeWidth: 1.2,
    height: 0.06,
  },
  "outline-modern": {
    getText: () => "MODERN DESIGN",
    fontSize: 44,
    fontWeight: 900,
    fontFamily: "Montserrat, sans-serif",
    color: "transparent",
    stroke: "#0f172a",
    strokeWidth: 2.5,
    height: 0.065,
  },
  "photographer-tag": {
    getText: () => "تصوير: استوديو الإبداع",
    fontSize: 22,
    fontWeight: 600,
    fontFamily: '"IBM Plex Sans Arabic", sans-serif',
    color: "#475569",
    opacity: 0.9,
    height: 0.045,
  },
  "caption-card": {
    getText: () => "استوديو التصوير · 2026",
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "Tajawal, sans-serif",
    color: "#1e293b",
    textBgColor: "#f8fafc",
    textBgRadius: 8,
    textBgPadding: 8,
    textBgBorderColor: "#cbd5e1",
    textBgBorderWidth: 1.5,
    height: 0.04,
  },
};
