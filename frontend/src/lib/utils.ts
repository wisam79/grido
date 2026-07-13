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
