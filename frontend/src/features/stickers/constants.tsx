import React from "react";
import {
  SealCheck,
  Package,
  Tag,
  Barcode,
  Sparkle,
  Warning,
  ShareNetwork,
  SquaresFour,
  Circle,
  Rectangle,
  Square,
  Heart,
  Coffee,
  Star,
  Sun,
  Flower,
} from "@phosphor-icons/react";
import { ARABIC_FONTS } from "@/lib/io/fonts";
import { StickerCategory, StickerShape } from "./types";

export interface StickerCategoryItem {
  id: StickerCategory | "all";
  title: string;
  icon: React.ReactNode;
}

/** المصدر الوحيد لترتيب وأيقونات التصنيفات (لا يوجد شريط تصنيفات آخر) */
export const CATEGORY_ITEMS: StickerCategoryItem[] = [
  { id: "all", title: "الكل", icon: <SquaresFour className="w-4 h-4" /> },
  { id: "badges", title: "شارات وأختام", icon: <SealCheck className="w-4 h-4" weight="duotone" /> },
  { id: "retail", title: "عروض وتجارة", icon: <Sparkle className="w-4 h-4" weight="duotone" /> },
  { id: "shipping", title: "شحن وتوصيل", icon: <Package className="w-4 h-4" weight="duotone" /> },
  { id: "packaging", title: "تغليف وهوية", icon: <Tag className="w-4 h-4" weight="duotone" /> },
  { id: "safety", title: "تحذير وأمان", icon: <Warning className="w-4 h-4" weight="duotone" /> },
  { id: "barcodes", title: "باركود وQR", icon: <Barcode className="w-4 h-4" weight="duotone" /> },
  { id: "social", title: "تواصل ومواقع", icon: <ShareNetwork className="w-4 h-4" weight="duotone" /> },
  { id: "greeting", title: "تهاني وشكر", icon: <Heart className="w-4 h-4" weight="duotone" /> },
  { id: "cafe", title: "كافيهات ومخابز", icon: <Coffee className="w-4 h-4" weight="duotone" /> },
  { id: "beauty", title: "تجميل وعناية", icon: <Flower className="w-4 h-4" weight="duotone" /> },
  { id: "kids", title: "أطفال وحفلات", icon: <Star className="w-4 h-4" weight="duotone" /> },
  { id: "seasonal", title: "مواسم وأعياد", icon: <Sun className="w-4 h-4" weight="duotone" /> },
];

export interface StickerShapeFilterItem {
  id: StickerShape | "all";
  label: string;
  icon: React.ReactNode;
}

export const SHAPE_ITEMS: StickerShapeFilterItem[] = [
  { id: "all", label: "الكل", icon: <SquaresFour className="w-3.5 h-3.5" /> },
  { id: "circle", label: "دائري", icon: <Circle className="w-3.5 h-3.5" /> },
  { id: "rect", label: "مستطيل", icon: <Rectangle className="w-3.5 h-3.5" /> },
  { id: "square", label: "مربع", icon: <Square className="w-3.5 h-3.5" /> },
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
];

/**
 * خيارات خطوط الملصقات — مشتقة من مصدر الخطوط الموحد للمشروع.
 * التسمية تعرض اسم الخط نفسه (معاينة عائلية)، والقيمة هي family الفعلي المستخدم في SVG.
 */
export const FONT_OPTIONS = ARABIC_FONTS.map((f) => ({
  label: f.arabicName,
  value: f.family.split(",")[0].trim().replace(/['"]/g, ""),
}));
