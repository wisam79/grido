export interface FontOption {
  id: string;
  name: string;
  family: string;
  category: "sans-serif" | "serif" | "cursive" | "display";
}

export const ARABIC_FONTS: FontOption[] = [
  { id: "cairo", name: "كايرو (Cairo)", family: "'Cairo', sans-serif", category: "sans-serif" },
  { id: "tajawal", name: "تاجوال (Tajawal)", family: "'Tajawal', sans-serif", category: "sans-serif" },
  { id: "ibm-plex", name: "ديواني (IBM Plex Arabic)", family: "'IBM Plex Sans Arabic', sans-serif", category: "sans-serif" },
  { id: "almarai", name: "المراعي (Almarai)", family: "'Almarai', sans-serif", category: "sans-serif" },
  { id: "alexandria", name: "الإسكندرية (Alexandria)", family: "'Alexandria', sans-serif", category: "sans-serif" },
  { id: "changa", name: "شانغا (Changa)", family: "'Changa', sans-serif", category: "display" },
  { id: "el-messiri", name: "المسيري (El Messiri)", family: "'El Messiri', sans-serif", category: "display" },
  { id: "amiri", name: "أميري النسخي (Amiri)", family: "'Amiri', serif", category: "serif" },
  { id: "lemonada", name: "ليمونادة (Lemonada)", family: "'Lemonada', cursive", category: "cursive" },
  { id: "noto-naskh", name: "النسخ (Noto Naskh)", family: "'Noto Naskh Arabic', serif", category: "serif" },
  { id: "reem-kufi", name: "الكوفي (Reem Kufi)", family: "'Reem Kufi', sans-serif", category: "display" },
  { id: "rubik", name: "روبيك (Rubik Arabic)", family: "'Rubik', sans-serif", category: "sans-serif" },
];

const loadedFonts = new Set<string>();

/**
 * Loads Google Font dynamically on demand when selected by the user
 */
export function loadGoogleFont(fontFamily: string) {
  if (typeof document === "undefined" || !fontFamily) return;

  // Extract clean font name from CSS family string, e.g. "'Alexandria', sans-serif" -> "Alexandria"
  const match = fontFamily.match(/'([^']+)'/);
  const cleanName = match ? match[1] : fontFamily.split(",")[0].trim();

  // All 12 Arabic fonts are bundled and loaded offline in index.css
  const isPreloadedOffline = ARABIC_FONTS.some((f) => f.family.includes(cleanName));

  if (isPreloadedOffline || loadedFonts.has(cleanName) || cleanName === "sans-serif" || cleanName === "serif" || cleanName === "cursive") {
    return;
  }

  try {
    const formattedName = cleanName.replace(/ /g, "+");
    const linkId = `google-font-${formattedName.toLowerCase()}`;
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@300;400;600;700;800&display=swap`;
    document.head.appendChild(link);
    loadedFonts.add(cleanName);
  } catch (err) {
    console.warn("Failed to load Google Font:", cleanName, err);
  }
}
