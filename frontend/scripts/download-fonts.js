import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontDir = path.join(__dirname, "../src/assets/fonts");
if (!fs.existsSync(fontDir)) {
  fs.mkdirSync(fontDir, { recursive: true });
}

const fonts = [
  { name: "Cairo", family: "Cairo" },
  { name: "Tajawal", family: "Tajawal" },
  { name: "IBM Plex Sans Arabic", family: "IBM Plex Sans Arabic" },
  { name: "Almarai", family: "Almarai" },
  { name: "Alexandria", family: "Alexandria" },
  { name: "Changa", family: "Changa" },
  { name: "El Messiri", family: "El Messiri" },
  { name: "Amiri", family: "Amiri" },
  { name: "Lemonada", family: "Lemonada" },
  { name: "Noto Naskh Arabic", family: "Noto Naskh Arabic" },
  { name: "Reem Kufi", family: "Reem Kufi" },
  { name: "Rubik", family: "Rubik" },
];

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
        }
        let data = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => resolve(Buffer.concat(data)));
      })
      .on("error", reject);
  });
}

const cssRules = [];

async function downloadFonts() {
  console.log("Starting offline Arabic font downloads...");
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  for (const font of fonts) {
    const formatted = font.family.replace(/ /g, "+");
    const cssUrl = `https://fonts.googleapis.com/css2?family=${formatted}:wght@400;700&display=swap`;

    try {
      const cssBuffer = await fetchUrl(cssUrl, { "User-Agent": userAgent });
      const cssText = cssBuffer.toString("utf8");

      // Extract woff2 URLs and weight matches
      const blocks = cssText.split("@font-face");
      let count = 0;

      for (const block of blocks) {
        if (!block.includes("url(")) continue;
        const woff2Match = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
        const weightMatch = block.match(/font-weight:\s*(\d+)/);
        const styleMatch = block.match(/font-style:\s*(\w+)/);

        if (woff2Match) {
          const fontUrl = woff2Match[1];
          const weight = weightMatch ? weightMatch[1] : "400";
          const style = styleMatch ? styleMatch[1] : "normal";
          const cleanFileName = `${font.name.replace(/ /g, "_")}_${weight}.woff2`;
          const savePath = path.join(fontDir, cleanFileName);

          console.log(`Downloading ${font.name} (${weight})...`);
          const fontData = await fetchUrl(fontUrl);
          fs.writeFileSync(savePath, fontData);

          cssRules.push(`
@font-face {
  font-family: '${font.family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('./assets/fonts/${cleanFileName}') format('woff2');
}`);
          count++;
        }
      }
      console.log(`✓ Downloaded ${count} variants for ${font.name}`);
    } catch (err) {
      console.error(`❌ Failed to download ${font.name}:`, err.message);
    }
  }

  const fontsCssPath = path.join(__dirname, "../src/offline-fonts.css");
  fs.writeFileSync(fontsCssPath, cssRules.join("\n"));
  console.log(`🎉 Success! Saved all local fonts and generated offline-fonts.css at ${fontsCssPath}`);
}

downloadFonts();
