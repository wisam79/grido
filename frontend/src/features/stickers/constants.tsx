import React from "react";
import {
  Package,
  Barcode,
  Sparkle,
  Warning,
  SquaresFour,
  Circle,
  Rectangle,
  Square,
  Heart,
  Coffee,
  FrameCorners,
} from "@phosphor-icons/react";
import { ARABIC_FONTS } from "@/lib/io/fonts";
import { StickerCategory, StickerCategoryGroupId, StickerShape } from "./types";

export interface StickerCategoryItem {
  id: StickerCategoryGroupId | StickerCategory | "all";
  title: string;
  icon: React.ReactNode;
  categories?: StickerCategory[];
}

/** قائمة التصنيفات المدمجة والمركزة */
export const CATEGORY_ITEMS: StickerCategoryItem[] = [
  {
    id: "all",
    title: "الكل",
    icon: <SquaresFour className="w-5 h-5" />,
  },
  {
    id: "frames",
    title: "إطارات وبراويز",
    icon: <FrameCorners className="w-5 h-5" weight="duotone" />,
    categories: ["frames"],
  },
  {
    id: "commercial",
    title: "تجاري",
    icon: <Sparkle className="w-5 h-5" weight="duotone" />,
    categories: ["badges", "retail"],
  },
  {
    id: "packaging",
    title: "شحن وتغليف",
    icon: <Package className="w-5 h-5" weight="duotone" />,
    categories: ["shipping", "packaging"],
  },
  {
    id: "codes",
    title: "رموز وتواصل",
    icon: <Barcode className="w-5 h-5" weight="duotone" />,
    categories: ["barcodes", "social"],
  },
  {
    id: "stores",
    title: "كافيه ومتاجر",
    icon: <Coffee className="w-5 h-5" weight="duotone" />,
    categories: ["cafe", "beauty"],
  },
  {
    id: "occasions",
    title: "مناسبات",
    icon: <Heart className="w-5 h-5" weight="duotone" />,
    categories: ["greeting", "kids", "seasonal"],
  },
  {
    id: "safety",
    title: "سلامة",
    icon: <Warning className="w-5 h-5" weight="duotone" />,
    categories: ["safety"],
  },
];

export interface StickerShapeFilterItem {
  id: StickerShape | "all";
  label: string;
  icon: React.ReactNode;
}

export const SHAPE_ITEMS: StickerShapeFilterItem[] = [
  { id: "all", label: "الكل", icon: <SquaresFour className="w-4 h-4" /> },
  { id: "circle", label: "دائري", icon: <Circle className="w-4 h-4" /> },
  { id: "rect", label: "مستطيل", icon: <Rectangle className="w-4 h-4" /> },
  { id: "square", label: "مربع", icon: <Square className="w-4 h-4" /> },
];

export interface StickerCuratedPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
}

export const CURATED_PALETTES: StickerCuratedPalette[] = [
  {
    id: "gold",
    name: "ذهبي ملكي",
    primary: "#1e293b",
    secondary: "#d97706",
    background: "#ffffff",
  },
  {
    id: "sale",
    name: "عروض وتخفيضات",
    primary: "#dc2626",
    secondary: "#f59e0b",
    background: "#ffffff",
  },
  {
    id: "corp",
    name: "أزرق مؤسسي",
    primary: "#1e40af",
    secondary: "#0284c7",
    background: "#f8fafc",
  },
  {
    id: "eco",
    name: "طبيعي وعضوي",
    primary: "#166534",
    secondary: "#84cc16",
    background: "#f0fdf4",
  },
  {
    id: "neon",
    name: "سايبر نيون",
    primary: "#7c3aed",
    secondary: "#06b6d4",
    background: "#0f172a",
  },
  {
    id: "luxury",
    name: "مونوكروم فاخر",
    primary: "#09090b",
    secondary: "#71717a",
    background: "#f4f4f5",
  },
  {
    id: "sunset",
    name: "غروب دافئ",
    primary: "#ea580c",
    secondary: "#f59e0b",
    background: "#fffbeb",
  },
  {
    id: "pastel",
    name: "باستيل ناعم",
    primary: "#db2777",
    secondary: "#8b5cf6",
    background: "#fdf4ff",
  },
  {
    id: "emerald",
    name: "زمردي ملكي",
    primary: "#064e3b",
    secondary: "#10b981",
    background: "#f0fdf4",
  },
  {
    id: "rosegold",
    name: "وردي وذهبي",
    primary: "#831843",
    secondary: "#f59e0b",
    background: "#fff1f2",
  },
];

/**
 * خيارات خطوط الملصقات — مشتقة من مصدر الخطوط الموحد للمشروع.
 * التسمية تعرض اسم الخط نفسه (معاينة عائلية)، والقيمة هي family الفعلي المستخدم في SVG.
 */
export const FONT_OPTIONS = ARABIC_FONTS.map((f) => ({
  label: f.arabicName,
  value: f.family.split(",")[0].trim().replace(/['"]/g, ""),
}));
