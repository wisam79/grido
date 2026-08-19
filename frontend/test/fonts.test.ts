import { describe, it, expect, vi, beforeEach } from "vitest";
import { ARABIC_FONTS, FONT_CATEGORIES, loadGoogleFont, isFontLoaded } from "../src/lib/io/fonts";

describe("Font Engine Tests", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("contains comprehensive curated fonts categorized properly", () => {
    expect(ARABIC_FONTS.length).toBeGreaterThanOrEqual(20);
    expect(FONT_CATEGORIES.length).toBeGreaterThanOrEqual(6);

    const kufiFonts = ARABIC_FONTS.filter((f) => f.category === "kufi");
    const naskhFonts = ARABIC_FONTS.filter((f) => f.category === "naskh");
    const calligraphyFonts = ARABIC_FONTS.filter((f) => f.category === "calligraphy");
    const modernFonts = ARABIC_FONTS.filter((f) => f.category === "modern");

    expect(kufiFonts.length).toBeGreaterThan(0);
    expect(naskhFonts.length).toBeGreaterThan(0);
    expect(calligraphyFonts.length).toBeGreaterThan(0);
    expect(modernFonts.length).toBeGreaterThan(0);
  });

  it("dynamically loads Google Fonts for non-offline fonts", () => {
    loadGoogleFont("Readex Pro, sans-serif");

    const link = document.querySelector("link[id^='google-font-']");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toContain("Readex+Pro");
  });

  it("skips loading for preloaded offline fonts", () => {
    loadGoogleFont("Cairo, sans-serif");
    const link = document.querySelector("link[id^='google-font-cairo']");
    expect(link).toBeNull();
  });
});
