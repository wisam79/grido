import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let fonts: typeof import('../src/lib/io/fonts');

function installFontFaceSet() {
  const load = vi.fn().mockResolvedValue([{}]);
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { load, ready: Promise.resolve() },
  });
  return load;
}

function googleLink() {
  return document.querySelector<HTMLLinkElement>('link[id^="google-font-"]');
}

describe('Font Engine Tests', () => {
  beforeEach(async () => {
    document.head.innerHTML = '';
    vi.resetModules();
    fonts = await import('../src/lib/io/fonts');
  });

  afterEach(() => {
    delete (document as unknown as Record<string, unknown>).fonts;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('contains comprehensive curated fonts categorized properly', () => {
    expect(fonts.ARABIC_FONTS.length).toBeGreaterThanOrEqual(20);
    for (const category of ['kufi', 'naskh', 'calligraphy', 'modern']) {
      expect(fonts.ARABIC_FONTS.some((font) => font.category === category)).toBe(true);
    }
  });

  it('declares sorted supported weights and actual bundled weights for every font', () => {
    for (const font of fonts.ARABIC_FONTS) {
      expect(font.weights.length).toBeGreaterThan(0);
      expect(font.weights).toEqual([...new Set(font.weights)].sort((a, b) => a - b));
      if (font.isOffline) {
        expect(font.offlineWeights?.length).toBeGreaterThan(0);
        for (const weight of font.offlineWeights!) expect(font.weights).toContain(weight);
      }
    }
    expect(fonts.getSupportedFontWeights('IBM Plex Sans Arabic')).toEqual([400, 500, 600, 700]);
    expect(fonts.getSupportedFontWeights('Cairo')).toEqual([400, 700]);
    expect(fonts.getSupportedFontWeights('Lalezar')).toEqual([400]);
  });

  it('matches full family names or catalog aliases without substring collisions', () => {
    expect(fonts.findFontOption('"ibm plex sans arabic", sans-serif')?.id).toBe('ibm-plex');
    expect(fonts.findFontOption('noto-naskh')?.englishName).toBe('Noto Naskh Arabic');
    expect(fonts.findFontOption('Sans')).toBeUndefined();
    expect(fonts.findFontOption('Arial')).toBeUndefined();
  });

  it('resolves unsupported weights to the nearest available face, preferring lighter ties', () => {
    expect(fonts.resolveSupportedFontWeight('Cairo', 800)).toBe(700);
    expect(fonts.resolveSupportedFontWeight('Cairo', 600)).toBe(700);
    expect(fonts.resolveSupportedFontWeight('Cairo', 550)).toBe(400);
    expect(fonts.resolveSupportedFontWeight('IBM Plex Sans Arabic', 600)).toBe(600);
    expect(fonts.resolveSupportedFontWeight('Lalezar', 900)).toBe(400);
    expect(fonts.resolveSupportedFontWeight('Arial', 800)).toBe(800);
    expect(fonts.resolveSupportedFontWeight('Cairo', Number.NaN)).toBe(400);
  });

  it('backs every advertised offline face with a local WOFF2 asset and CSS declaration', () => {
    const sourceDir = resolve(__dirname, '../src');
    const css = readFileSync(resolve(sourceDir, 'offline-fonts.css'), 'utf8');
    const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map((match) => {
      const family = match[1].match(/font-family:\s*['"]([^'"]+)['"]/)?.[1];
      const weight = Number(match[1].match(/font-weight:\s*(\d+)\s*;/)?.[1]);
      const src = match[1].match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];
      expect(src).toMatch(/^\.\/assets\/fonts\/.+\.woff2$/);
      expect(readFileSync(resolve(sourceDir, src!)).subarray(0, 4).toString('ascii')).toBe('wOF2');
      return { family, weight };
    });
    for (const font of fonts.ARABIC_FONTS.filter((font) => font.isOffline)) {
      for (const weight of font.offlineWeights!) {
        expect(faces, `${font.englishName} ${weight}`).toContainEqual({
          family: font.englishName,
          weight,
        });
      }
    }
  });

  it.each([
    ['Lalezar', [400]],
    ['Katibeh', [400]],
    ['Gulzar', [400]],
    ['Aref Ruqaa', [400, 700]],
    ['Scheherazade New', [400, 500, 600, 700]],
    ['Lateef', [200, 300, 400, 500, 600, 700, 800]],
    ['Marhey', [300, 400, 500, 600, 700]],
    ['Baloo Bhaijaan 2', [400, 500, 600, 700, 800]],
    ['Oswald', [200, 300, 400, 500, 600, 700]],
  ])('requests only supported Google weights for %s', async (family, weights) => {
    const load = installFontFaceSet();
    const pending = fonts.loadGoogleFont(family, 800);
    const link = googleLink();
    expect(link).not.toBeNull();
    expect(new URL(link!.href).searchParams.get('family')).toBe(
      `${family}:wght@${weights.join(';')}`,
    );
    expect(load).not.toHaveBeenCalled();
    link!.dispatchEvent(new Event('load'));
    expect(await pending).toBe(true);
    expect(load).toHaveBeenCalledWith(
      `${fonts.resolveSupportedFontWeight(family, 800)} 16px "${family}"`,
      expect.stringContaining('Grido'),
    );
  });

  it('does not inject Google CSS for bundled Latin or Arabic fonts', async () => {
    const load = installFontFaceSet();
    for (const family of ['Readex Pro', 'Inter', 'Outfit', 'Montserrat', 'Playfair Display']) {
      expect(await fonts.loadGoogleFont(family, 700)).toBe(true);
      expect(load).toHaveBeenCalledWith(`700 16px "${family}"`, expect.stringContaining('Grido'));
    }
    expect(googleLink()).toBeNull();
  });

  it('waits for the resolved offline weight and preserves the requested style', async () => {
    const load = installFontFaceSet();
    const ready = vi.fn();
    const unsubscribe = fonts.onFontReady(ready);
    expect(await fonts.loadGoogleFont('"Readex Pro", sans-serif', 800, 'italic')).toBe(true);
    unsubscribe();
    expect(load).toHaveBeenCalledWith(
      'italic 700 16px "Readex Pro"',
      expect.stringContaining('أبجد'),
    );
    expect(ready).toHaveBeenCalledWith('Readex Pro', 700);
  });

  it('deduplicates a resolved face but keeps weights and styles separate', async () => {
    const load = installFontFaceSet();
    await Promise.all([
      fonts.loadGoogleFont('Cairo', 800),
      fonts.loadGoogleFont('Cairo, sans-serif', 700),
      fonts.loadGoogleFont('Cairo', 400),
      fonts.loadGoogleFont('Cairo', 700, 'italic'),
    ]);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('shares stylesheet readiness across concurrent Google weights', async () => {
    const load = installFontFaceSet();
    const first = fonts.loadGoogleFont('Scheherazade New', 400);
    const second = fonts.loadGoogleFont('Scheherazade New', 700);
    expect(document.querySelectorAll('link[id^="google-font-"]')).toHaveLength(1);
    expect(load).not.toHaveBeenCalled();
    googleLink()!.dispatchEvent(new Event('load'));
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not cache stylesheet failures as ready and retries with a fresh stylesheet', async () => {
    const load = installFontFaceSet();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = fonts.loadGoogleFont('Lalezar');
    const failedLink = googleLink()!;
    failedLink.dispatchEvent(new Event('error'));
    expect(await first).toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(failedLink.isConnected).toBe(false);
    const retry = fonts.loadGoogleFont('Lalezar');
    expect(googleLink()).not.toBe(failedLink);
    googleLink()!.dispatchEvent(new Event('load'));
    expect(await retry).toBe(true);
  });

  it('recreates a cloud stylesheet after its binary font face fails', async () => {
    const load = installFontFaceSet();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let failedSheet: HTMLLinkElement | null = null;
    load.mockImplementation(async () => {
      if (!failedSheet) failedSheet = googleLink();
      if (googleLink() === failedSheet) throw new Error('FontFace remains in error state');
      return [{}];
    });
    const first = fonts.loadGoogleFont('Poppins', 700);
    googleLink()!.dispatchEvent(new Event('load'));
    expect(await first).toBe(false);
    expect(failedSheet!.isConnected).toBe(false);
    const retry = fonts.loadGoogleFont('Poppins', 700);
    expect(googleLink()).not.toBe(failedSheet);
    googleLink()!.dispatchEvent(new Event('load'));
    expect(await retry).toBe(true);
  });

  it('retries an empty face result instead of declaring fallback text ready', async () => {
    const load = installFontFaceSet().mockResolvedValueOnce([]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await fonts.loadGoogleFont('Inter', 400)).toBe(false);
    expect(await fonts.loadGoogleFont('Inter', 400)).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('cleans up a stylesheet timeout and permits another attempt', async () => {
    vi.useFakeTimers();
    const load = installFontFaceSet();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pending = fonts.loadGoogleFont('Gulzar');
    await vi.advanceTimersByTimeAsync(3000);
    expect(await pending).toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(googleLink()).toBeNull();
    const retry = fonts.loadGoogleFont('Gulzar');
    googleLink()!.dispatchEvent(new Event('load'));
    expect(await retry).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('only requests the requested weight for an unknown cloud family', async () => {
    installFontFaceSet();
    const pending = fonts.loadGoogleFont('Example Custom Font', 600);
    const link = googleLink()!;
    expect(new URL(link.href).searchParams.get('family')).toBe('Example Custom Font:wght@600');
    link.dispatchEvent(new Event('load'));
    expect(await pending).toBe(true);
  });

  it('treats system and generic fonts as ready without a network request', async () => {
    const load = installFontFaceSet();
    for (const family of ['Arial, sans-serif', 'Segoe UI', 'sans-serif', 'ui-sans-serif']) {
      expect(await fonts.loadGoogleFont(family, 700)).toBe(true);
    }
    expect(load).not.toHaveBeenCalled();
    expect(googleLink()).toBeNull();
  });
});
