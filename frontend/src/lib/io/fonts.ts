export type FontCategory = "all" | "kufi" | "naskh" | "calligraphy" | "modern" | "display" | "latin";

export interface FontCategoryInfo {
  id: FontCategory;
  name: string;
  icon?: string;
}

export const FONT_CATEGORIES: FontCategoryInfo[] = [
  { id: "all", name: "كل الخطوط" },
  { id: "kufi", name: "كوفي وهندسي" },
  { id: "naskh", name: "نسخي وكلاسيكي" },
  { id: "calligraphy", name: "رقعة وديواني وحر" },
  { id: "modern", name: "عصري وشركات" },
  { id: "display", name: "عناوين وشعارات" },
  { id: "latin", name: "خطوط لاتينية" },
];

export interface FontOption {
  id: string;
  name: string;
  arabicName: string;
  englishName: string;
  family: string;
  googleFontName?: string;
  category: FontCategory;
  isOffline?: boolean;
  sampleText?: string;
}

export const ARABIC_FONTS: FontOption[] = [
  // 🏛️ كوفي وهندسي (Kufi & Geometric)
  {
    id: "cairo",
    name: "كايرو (Cairo)",
    arabicName: "كايرو",
    englishName: "Cairo",
    family: "Cairo, sans-serif",
    category: "kufi",
    isOffline: true,
    sampleText: "أبجد هوز 123",
  },
  {
    id: "tajawal",
    name: "تاجوال (Tajawal)",
    arabicName: "تاجوال",
    englishName: "Tajawal",
    family: "Tajawal, sans-serif",
    category: "kufi",
    isOffline: true,
    sampleText: "استوديو تصوير فخم",
  },
  {
    id: "alexandria",
    name: "الإسكندرية (Alexandria)",
    arabicName: "الإسكندرية",
    englishName: "Alexandria",
    family: "Alexandria, sans-serif",
    category: "kufi",
    isOffline: true,
    sampleText: "تصميم عصري هندسي",
  },
  {
    id: "reem-kufi",
    name: "الكوفي (Reem Kufi)",
    arabicName: "ريم الكوفي",
    englishName: "Reem Kufi",
    family: "Reem Kufi, sans-serif",
    category: "kufi",
    isOffline: true,
    sampleText: "خط كوفي أصيل",
  },
  {
    id: "readex-pro",
    name: "ريديكس برو (Readex Pro)",
    arabicName: "ريديكس برو",
    englishName: "Readex Pro",
    family: "\"Readex Pro\", sans-serif",
    googleFontName: "Readex+Pro",
    category: "kufi",
    sampleText: "وضوح فائق ومقروئية",
  },

  // 📜 نسخي وكلاسيكي (Naskh & Classical)
  {
    id: "noto-naskh",
    name: "النسخ العربي (Noto Naskh)",
    arabicName: "النسخ العربي",
    englishName: "Noto Naskh Arabic",
    family: "\"Noto Naskh Arabic\", serif",
    category: "naskh",
    isOffline: true,
    sampleText: "بسم الله الرحمن الرحيم",
  },
  {
    id: "amiri",
    name: "أميري النسخي (Amiri)",
    arabicName: "أميري",
    englishName: "Amiri",
    family: "Amiri, serif",
    category: "naskh",
    isOffline: true,
    sampleText: "خط الطباعة الكلاسيكي",
  },
  {
    id: "scheherazade",
    name: "شهرزاد (Scheherazade)",
    arabicName: "شهرزاد الجديد",
    englishName: "Scheherazade New",
    family: "\"Scheherazade New\", serif",
    googleFontName: "Scheherazade+New",
    category: "naskh",
    sampleText: "وثائق ومطبوعات رسمية",
  },
  {
    id: "lateef",
    name: "لطيف (Lateef)",
    arabicName: "لطيف",
    englishName: "Lateef",
    family: "Lateef, serif",
    googleFontName: "Lateef",
    category: "naskh",
    sampleText: "انسيابية نسخي جميلة",
  },

  // ✍️ رقعة وديواني وحر (Calligraphy, Ruq'ah & Freestyle)
  {
    id: "aref-ruqaa",
    name: "عارف رقعة (Aref Ruqaa)",
    arabicName: "عارف رقعة",
    englishName: "Aref Ruqaa",
    family: "\"Aref Ruqaa\", cursive, serif",
    googleFontName: "Aref+Ruqaa",
    category: "calligraphy",
    sampleText: "خط الرقعة التراثي",
  },
  {
    id: "ibm-plex",
    name: "ديواني عصري (IBM Plex Arabic)",
    arabicName: "آي بي إم بلكس",
    englishName: "IBM Plex Sans Arabic",
    family: "\"IBM Plex Sans Arabic\", sans-serif",
    category: "calligraphy",
    isOffline: true,
    sampleText: "فخامة وأناقة الخط",
  },
  {
    id: "marhey",
    name: "مرحي (Marhey)",
    arabicName: "مرحي",
    englishName: "Marhey",
    family: "Marhey, cursive, sans-serif",
    googleFontName: "Marhey",
    category: "calligraphy",
    sampleText: "حيوي ومناسب للمناسبات",
  },
  {
    id: "lemonada",
    name: "ليمونادة (Lemonada)",
    arabicName: "ليمونادة",
    englishName: "Lemonada",
    family: "Lemonada, cursive",
    category: "calligraphy",
    isOffline: true,
    sampleText: "نص بهيج ولطيف",
  },
  {
    id: "katibeh",
    name: "كتيبة (Katibeh)",
    arabicName: "كتيبة",
    englishName: "Katibeh",
    family: "Katibeh, cursive, serif",
    googleFontName: "Katibeh",
    category: "calligraphy",
    sampleText: "عناوين مزخرفة نادرة",
  },
  {
    id: "lalezar",
    name: "لاليزار (Lalezar)",
    arabicName: "لاليزار",
    englishName: "Lalezar",
    family: "Lalezar, cursive, display",
    googleFontName: "Lalezar",
    category: "calligraphy",
    sampleText: "عريض جداً للشعارات",
  },

  // 💼 عصري وشركات (Modern Sans & Corporate)
  {
    id: "almarai",
    name: "المراعي (Almarai)",
    arabicName: "المراعي",
    englishName: "Almarai",
    family: "Almarai, sans-serif",
    category: "modern",
    isOffline: true,
    sampleText: "هوية مؤسسية وبطاقات",
  },
  {
    id: "rubik",
    name: "روبيك (Rubik Arabic)",
    arabicName: "روبيك",
    englishName: "Rubik",
    family: "Rubik, sans-serif",
    category: "modern",
    isOffline: true,
    sampleText: "حواف ناعمة دائرية",
  },
  {
    id: "vazirmatn",
    name: "وزير متن (Vazirmatn)",
    arabicName: "وزير متن",
    englishName: "Vazirmatn",
    family: "Vazirmatn, sans-serif",
    googleFontName: "Vazirmatn",
    category: "modern",
    sampleText: "واضح جداً في الطباعة",
  },
  {
    id: "baloo-bhaijaan",
    name: "بالو بهيجان (Baloo Bhaijaan 2)",
    arabicName: "بالو بهيجان",
    englishName: "Baloo Bhaijaan 2",
    family: "\"Baloo Bhaijaan 2\", sans-serif",
    googleFontName: "Baloo+Bhaijaan+2",
    category: "modern",
    sampleText: "شارات وعناوين مرحة",
  },

  // 🏷️ عناوين وشعارات (Display & Headlines)
  {
    id: "changa",
    name: "شانغا (Changa)",
    arabicName: "شانغا",
    englishName: "Changa",
    family: "Changa, sans-serif",
    category: "display",
    isOffline: true,
    sampleText: "عنوان عريض وقوي",
  },
  {
    id: "el-messiri",
    name: "المسيري (El Messiri)",
    arabicName: "المسيري",
    englishName: "El Messiri",
    family: "\"El Messiri\", sans-serif",
    category: "display",
    isOffline: true,
    sampleText: "أناقة وزخرفة مميزة",
  },
  {
    id: "gulzar",
    name: "جلزار النسعليق (Gulzar)",
    arabicName: "جلزار",
    englishName: "Gulzar",
    family: "Gulzar, serif",
    googleFontName: "Gulzar",
    category: "display",
    sampleText: "شعر واقتباسات فخمة",
  },

  // 🔤 خطوط لاتينية (Latin & Global Typography)
  {
    id: "inter",
    name: "إنتر (Inter - Modern)",
    arabicName: "إنتر",
    englishName: "Inter",
    family: "Inter, sans-serif",
    category: "latin",
    isOffline: true,
    sampleText: "Grido Studio Pro Design",
  },
  {
    id: "outfit",
    name: "أوتفت (Outfit - Geometric)",
    arabicName: "أوتفت",
    englishName: "Outfit",
    family: "Outfit, sans-serif",
    category: "latin",
    isOffline: true,
    sampleText: "Modern Geometry 2026",
  },
  {
    id: "montserrat",
    name: "مونتسيرات (Montserrat)",
    arabicName: "مونتسيرات",
    englishName: "Montserrat",
    family: "Montserrat, sans-serif",
    category: "latin",
    isOffline: true,
    sampleText: "HEADLINE & POSTERS",
  },
  {
    id: "playfair",
    name: "بليفيل (Playfair Display)",
    arabicName: "بليفيل",
    englishName: "Playfair Display",
    family: "\"Playfair Display\", serif",
    category: "latin",
    isOffline: true,
    sampleText: "Luxury Photography",
  },
  {
    id: "poppins",
    name: "بوبينز (Poppins)",
    arabicName: "بوبينز",
    englishName: "Poppins",
    family: "Poppins, sans-serif",
    googleFontName: "Poppins",
    category: "latin",
    sampleText: "Clean Minimalist Look",
  },
  {
    id: "oswald",
    name: "أوزوالد (Oswald - Condensed)",
    arabicName: "أوزوالد",
    englishName: "Oswald",
    family: "Oswald, sans-serif",
    googleFontName: "Oswald",
    category: "latin",
    sampleText: "BOLD STUDIO STAMP",
  },
];

const loadedFonts = new Set<string>();

/**
 * Loads Google Font dynamically on demand with full weight range (100-900)
 */
export function loadGoogleFont(fontFamily: string) {
  if (typeof document === "undefined" || !fontFamily) return;

  // Extract clean font name from CSS family string, e.g. "Cairo, sans-serif" -> "Cairo"
  const cleanName = fontFamily.split(",")[0].trim().replace(/['"]/g, "");

  // Offline fonts bundled in assets/fonts:
  const offlineMatch = ARABIC_FONTS.find(
    (f) => f.isOffline && (f.family.includes(cleanName) || f.englishName.toLowerCase() === cleanName.toLowerCase())
  );

  if (offlineMatch || loadedFonts.has(cleanName) || ["sans-serif", "serif", "cursive", "monospace"].includes(cleanName.toLowerCase())) {
    return;
  }

  try {
    const fontObj = ARABIC_FONTS.find(
      (f) => f.family.includes(cleanName) || f.englishName.toLowerCase() === cleanName.toLowerCase() || f.id === cleanName.toLowerCase()
    );
    const googleName = fontObj?.googleFontName || cleanName.replace(/ /g, "+");
    const linkId = `google-font-${googleName.toLowerCase().replace(/\s+/g, "-")}`;
    if (document.getElementById(linkId)) {
      loadedFonts.add(cleanName);
      return;
    }

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${googleName}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
    loadedFonts.add(cleanName);
  } catch (err) {
    console.warn("Failed to load Google Font:", cleanName, err);
  }
}

/**
 * Checks if font is currently ready or loading
 */
export function isFontLoaded(fontFamily: string): boolean {
  if (typeof document === "undefined" || !document.fonts) return true;
  const cleanName = fontFamily.split(",")[0].trim().replace(/['"]/g, "");
  return document.fonts.check(`16px "${cleanName}"`);
}
