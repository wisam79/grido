/**
 * Utility to rasterize vector SVG strings into high-resolution PNG data URLs (300 DPI target)
 * and trigger direct file downloads.
 */

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Ensures font families used inside an SVG are fully loaded before rasterizing.
 * SVG images rendered inside <img> do not wait for WebFonts — without this,
 * exports can silently fall back to the system font.
 */
async function ensureFontsReady(fontFamilies?: string[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  const loads = (fontFamilies ?? [])
    .map((raw) => {
      const clean = raw.split(",")[0].trim().replace(/['"]/g, "");
      if (!clean || ["sans-serif", "serif", "cursive", "monospace"].includes(clean.toLowerCase())) {
        return null;
      }
      // نطلب أثقل وزن مستخدم في الملصقات — الصف السفلي يُحمّل ضمنياً عند اللزوم
      return document.fonts.load(`900 64px "${clean}"`, "أبجد 123 ABC").catch(() => null);
    })
    .filter(Boolean);

  await Promise.all(loads);
  await document.fonts.ready;
}

export function renderSvgToPngDataUrl(
  svgString: string,
  width: number = 1200,
  height: number = 1200,
  fontFamilies?: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.Blob) {
      resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`);
      return;
    }

    void ensureFontsReady(fontFamilies)
      .catch(() => null)
      .then(() => {
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              URL.revokeObjectURL(url);
              reject(new Error("Cannot create 2D canvas context"));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            const dataUrl = canvas.toDataURL("image/png");
            resolve(dataUrl);
          } catch (err) {
            URL.revokeObjectURL(url);
            reject(err);
          }
        };

        img.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load SVG into image: " + String(e)));
        };

        img.src = url;
      });
  });
}

export function downloadFile(dataUrlOrBlob: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrlOrBlob;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
