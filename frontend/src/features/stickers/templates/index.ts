import { StickerCategory, StickerCategoryGroupId, StickerCategoryInfo, StickerShape, StickerTemplate } from "../types";
import { CATEGORY_ITEMS } from "../constants";
import { BADGE_TEMPLATES } from "./badges";
import { SHIPPING_TEMPLATES } from "./shipping";
import { PACKAGING_TEMPLATES } from "./packaging";
import { BARCODE_TEMPLATES } from "./barcodes";
import { RETAIL_TEMPLATES } from "./retail";
import { SAFETY_TEMPLATES } from "./safety";
import { SOCIAL_TEMPLATES } from "./social";
import { GREETING_TEMPLATES } from "./greeting";
import { CAFE_TEMPLATES } from "./cafe";
import { BEAUTY_TEMPLATES } from "./beauty";
import { KIDS_TEMPLATES } from "./kids";
import { SEASONAL_TEMPLATES } from "./seasonal";

export * from "./badges";
export * from "./shipping";
export * from "./packaging";
export * from "./barcodes";
export * from "./retail";
export * from "./safety";
export * from "./social";
export * from "./greeting";
export * from "./cafe";
export * from "./beauty";
export * from "./kids";
export * from "./seasonal";
export * from "./svg-elements";

export const STICKER_CATEGORIES: StickerCategoryInfo[] = [
  {
    id: "badges",
    title: "أختام",
    titleEn: "Badges",
    iconName: "SealCheck",
    description: "أختام وضمانات الجودة",
  },
  {
    id: "retail",
    title: "عروض",
    titleEn: "Retail",
    iconName: "Sparkle",
    description: "تخفيضات وبطاقات أسعار",
  },
  {
    id: "shipping",
    title: "شحن",
    titleEn: "Shipping",
    iconName: "Package",
    description: "ملصقات الشحن والمناولة",
  },
  {
    id: "packaging",
    title: "تغليف",
    titleEn: "Packaging",
    iconName: "Tag",
    description: "بطاقات التعبئة والإنتاج",
  },
  {
    id: "safety",
    title: "سلامة",
    titleEn: "Safety",
    iconName: "Warning",
    description: "تحذيرات السلامة والمخاطر",
  },
  {
    id: "barcodes",
    title: "باركود",
    titleEn: "Barcodes",
    iconName: "Barcode",
    description: "رموز QR والباركود",
  },
  {
    id: "social",
    title: "تواصل",
    titleEn: "Social",
    iconName: "ShareNetwork",
    description: "الدفع والشبكات الاجتماعية",
  },
  {
    id: "greeting",
    title: "تهاني",
    titleEn: "Greeting",
    iconName: "Heart",
    description: "شكر وتهنئة ومبروك",
  },
  {
    id: "cafe",
    title: "كافيهات",
    titleEn: "Cafe",
    iconName: "Coffee",
    description: "قهوة ومخبز ومشروبات",
  },
  {
    id: "beauty",
    title: "تجميل",
    titleEn: "Beauty",
    iconName: "Sparkle",
    description: "مستحضرات وعناية طبيعية",
  },
  {
    id: "kids",
    title: "أطفال",
    titleEn: "Kids",
    iconName: "Star",
    description: "حفلات وأوسمة إنجاز",
  },
  {
    id: "seasonal",
    title: "مواسم",
    titleEn: "Seasonal",
    iconName: "Sun",
    description: "رمضان وأعياد ومواسم",
  },
];

export const ALL_STICKER_TEMPLATES: StickerTemplate[] = [
  ...BADGE_TEMPLATES,
  ...RETAIL_TEMPLATES,
  ...SHIPPING_TEMPLATES,
  ...PACKAGING_TEMPLATES,
  ...SAFETY_TEMPLATES,
  ...BARCODE_TEMPLATES,
  ...SOCIAL_TEMPLATES,
  ...GREETING_TEMPLATES,
  ...CAFE_TEMPLATES,
  ...BEAUTY_TEMPLATES,
  ...KIDS_TEMPLATES,
  ...SEASONAL_TEMPLATES,
];

export function getTemplateShape(template: StickerTemplate): StickerShape {
  if (template.shape) return template.shape;
  if (template.category === "badges") return "circle";
  if (template.aspectRatio === 1) return "square";
  return "rect";
}

export function getStickerTemplateById(id: string): StickerTemplate | undefined {
  return ALL_STICKER_TEMPLATES.find((t) => t.id === id);
}

export function getStickerTemplatesByCategory(category: StickerCategory): StickerTemplate[] {
  return ALL_STICKER_TEMPLATES.filter((t) => t.category === category);
}

export function searchStickerTemplates(
  query: string,
  category?: StickerCategoryGroupId | StickerCategory | "all",
  shape?: StickerShape | "all"
): StickerTemplate[] {
  const q = query.trim().toLowerCase();

  let targetCategories: StickerCategory[] | null = null;
  if (category && category !== "all") {
    const group = CATEGORY_ITEMS.find((c) => c.id === category);
    if (group?.categories) {
      targetCategories = group.categories;
    } else {
      targetCategories = [category as StickerCategory];
    }
  }

  return ALL_STICKER_TEMPLATES.filter((template) => {
    if (targetCategories && !targetCategories.includes(template.category)) return false;
    if (shape && shape !== "all" && getTemplateShape(template) !== shape) return false;
    if (!q) return true;
    return (
      template.name.toLowerCase().includes(q) ||
      template.nameEn.toLowerCase().includes(q) ||
      template.description.toLowerCase().includes(q)
    );
  });
}
