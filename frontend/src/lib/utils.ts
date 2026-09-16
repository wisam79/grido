import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { IMAGE_FILTERS } from "./templates"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface FilterableObject {
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
}

export function buildCSSFilter(el: FilterableObject | undefined): string {
  if (!el) return "none";
  const parts: string[] = [];
  const filterDef = IMAGE_FILTERS.find((f) => f.id === el.filter);
  if (filterDef && filterDef.css) parts.push(filterDef.css);
  if (el.brightness !== undefined && el.brightness !== 100)
    parts.push(`brightness(${el.brightness}%)`);
  if (el.contrast !== undefined && el.contrast !== 100)
    parts.push(`contrast(${el.contrast}%)`);
  if (el.saturation !== undefined && el.saturation !== 100)
    parts.push(`saturate(${el.saturation}%)`);
  if (el.blur && el.blur > 0) parts.push(`blur(${el.blur}px)`);
  return parts.join(" ") || "none";
}

export const uid = () => crypto.randomUUID();

const SVG_FORBIDDEN_ELEMENTS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "handler",
  "audio",
  "video",
  "source",
  "track",
  "form",
  "input",
  "button",
  "textarea",
  "link",
  "meta",
  "base",
]);

const SVG_ALLOWED_URL_SCHEMES = new Set(["http:", "https:", "data:"]);

function isSafeSvgUrl(value: string): boolean {
  const trimmed = value.trim().replace(/[\u0000-\u0020]+/g, "");
  if (!trimmed) return true;
  if (trimmed.startsWith("#")) return true;
  try {
    const parsed = new URL(trimmed, "https://grido.invalid/");
    if (parsed.origin === "https://grido.invalid") return true;
    if (parsed.protocol === "data:") {
      return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(trimmed);
    }
    return SVG_ALLOWED_URL_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

function scrubSvgElement(el: Element): void {
  const tag = el.tagName.toLowerCase();
  if (SVG_FORBIDDEN_ELEMENTS.has(tag)) {
    el.remove();
    return;
  }
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on")) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (
      (name === "href" || name === "xlink:href" || name === "src" || name === "data") &&
      !isSafeSvgUrl(attr.value)
    ) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === "style" && /url\s*\(\s*['"]?\s*javascript:/i.test(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }
  for (const child of Array.from(el.children)) {
    scrubSvgElement(child);
  }
}

export function sanitizeSvgMarkup(svg: string): string {
  if (!svg) return "";
  if (typeof DOMParser === "undefined") {
    return svg.replace(/<\s*script\b[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  }
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (doc.querySelector("parsererror")) return "";
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") return "";
    scrubSvgElement(root);
    return new XMLSerializer().serializeToString(root);
  } catch {
    return "";
  }
}

const SVG_SANITIZE_CACHE = new Map<string, string>();
const SVG_SANITIZE_CACHE_LIMIT = 256;

export function sanitizeSvgMarkupCached(svg: string): string {
  if (!svg) return "";
  const cached = SVG_SANITIZE_CACHE.get(svg);
  if (cached !== undefined) return cached;
  const clean = sanitizeSvgMarkup(svg);
  if (SVG_SANITIZE_CACHE.size >= SVG_SANITIZE_CACHE_LIMIT) {
    const oldest = SVG_SANITIZE_CACHE.keys().next().value;
    if (oldest !== undefined) SVG_SANITIZE_CACHE.delete(oldest);
  }
  SVG_SANITIZE_CACHE.set(svg, clean);
  return clean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
      timeout = null;
    }, delay);
  };
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debounced;
}
