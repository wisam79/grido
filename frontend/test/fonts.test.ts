import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ARABIC_FONTS, loadGoogleFont, onFontReady } from '../src/lib/io/fonts';

describe('Font Engine Tests', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  afterEach(() => {
    delete (document as unknown as Record<string, unknown>).fonts;
    vi.restoreAllMocks();
  });

  it('contains comprehensive curated fonts categorized properly', () => {
    expect(ARABIC_FONTS.length).toBeGreaterThanOrEqual(20);

    const kufiFonts = ARABIC_FONTS.filter((f) => f.category === 'kufi');
    const naskhFonts = ARABIC_FONTS.filter((f) => f.category === 'naskh');
    const calligraphyFonts = ARABIC_FONTS.filter((f) => f.category === 'calligraphy');
    const modernFonts = ARABIC_FONTS.filter((f) => f.category === 'modern');

    expect(kufiFonts.length).toBeGreaterThan(0);
    expect(naskhFonts.length).toBeGreaterThan(0);
    expect(calligraphyFonts.length).toBeGreaterThan(0);
    expect(modernFonts.length).toBeGreaterThan(0);
  });

  it('dynamically loads Google Fonts for non-offline fonts', async () => {
    const pending = loadGoogleFont('"Scheherazade New", serif');

    const link = document.querySelector("link[id^='google-font-']") as HTMLLinkElement | null;
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toContain('Scheherazade+New');
    link?.dispatchEvent(new Event('load'));
    await pending;
  });

  it('skips loading for preloaded offline fonts', () => {
    loadGoogleFont('Readex Pro, sans-serif');
    const link = document.querySelector("link[id^='google-font-readex-pro']");
    expect(link).toBeNull();
  });

  it('waits for the exact offline weight and notifies listeners with it', async () => {
    const load = vi.fn().mockResolvedValue([]);
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { load, ready: Promise.resolve(), check: () => true },
    });
    const ready = vi.fn();
    const unsubscribe = onFontReady(ready);

    const ok = await loadGoogleFont('"Readex Pro", sans-serif', 800, 'italic');
    unsubscribe();

    expect(ok).toBe(true);
    // الوزن والنمط المطلوبان تحديداً — لا مجرد document.fonts.ready
    expect(load).toHaveBeenCalledWith('italic 800 16px "Readex Pro"');
    expect(ready).toHaveBeenCalledWith('Readex Pro', 800);
  });

  it('loads the exact Google weight and notifies after the face is ready', async () => {
    const load = vi.fn().mockResolvedValue([]);
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { load, ready: Promise.resolve(), check: () => true },
    });
    const ready = vi.fn();
    const unsubscribe = onFontReady(ready);

    const pending = loadGoogleFont('"Scheherazade New", serif', 700);
    // وجه الخط لا يكون معلناً قبل تفعيل ورقة الأنماط — لا يُطلب قبل ذلك
    expect(load).not.toHaveBeenCalled();
    const link = document.querySelector("link[id^='google-font-scheherazade']") as HTMLLinkElement;
    expect(link).not.toBeNull();
    link.dispatchEvent(new Event('load'));
    await pending;
    unsubscribe();

    expect(load).toHaveBeenCalledWith('700 16px "Scheherazade New"');
    expect(ready).toHaveBeenCalledWith('Scheherazade New', 700);
    expect(document.querySelectorAll("link[id^='google-font-scheherazade']").length).toBe(1);
  });

  it('treats common system fonts as always ready and never requests them from Google', async () => {
    const load = vi.fn().mockResolvedValue([]);
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { load, ready: Promise.resolve(), check: () => true },
    });

    const ok = await loadGoogleFont('Arial, sans-serif', 700);

    expect(ok).toBe(true);
    expect(load).not.toHaveBeenCalled();
    expect(document.querySelector("link[id^='google-font-']")).toBeNull();
  });
});
