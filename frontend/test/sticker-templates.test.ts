import { describe, it, expect } from "vitest";
import {
  ALL_STICKER_TEMPLATES,
  STICKER_CATEGORIES,
  getStickerTemplateById,
  searchStickerTemplates,
  getTemplateShape,
} from "@/features/stickers";
import { findHiddenFieldIds } from "@/features/stickers";
import {
  saveStickerPreset,
  loadStickerPresets,
  deleteStickerPreset,
  getPresetsForTemplate,
  STICKER_PRESETS_STORAGE_KEY,
} from "@/features/stickers/lib/preset-utils";
import { copySvgCodeToClipboard } from "@/features/stickers/lib/clipboard-utils";

describe("Modular Stickers Architecture (features/stickers)", () => {
  it("should have all categories configured with metadata", () => {
    expect(STICKER_CATEGORIES).toHaveLength(13);
    const catIds = STICKER_CATEGORIES.map((c) => c.id);
    expect(catIds).toContain("frames");
    expect(catIds).toContain("badges");
    expect(catIds).toContain("retail");
    expect(catIds).toContain("shipping");
    expect(catIds).toContain("packaging");
    expect(catIds).toContain("safety");
    expect(catIds).toContain("barcodes");
    expect(catIds).toContain("social");
    expect(catIds).toContain("greeting");
    expect(catIds).toContain("cafe");
    expect(catIds).toContain("beauty");
    expect(catIds).toContain("kids");
    expect(catIds).toContain("seasonal");
  });

  it("should provide rich collection of sticker templates across all categories", () => {
    expect(ALL_STICKER_TEMPLATES.length).toBeGreaterThanOrEqual(60);
    const frameTemplates = ALL_STICKER_TEMPLATES.filter((t) => t.category === "frames");
    const badgeTemplates = ALL_STICKER_TEMPLATES.filter((t) => t.category === "badges");
    const retailTemplates = ALL_STICKER_TEMPLATES.filter((t) => t.category === "retail");
    const shippingTemplates = ALL_STICKER_TEMPLATES.filter((t) => t.category === "shipping");
    const packagingTemplates = ALL_STICKER_TEMPLATES.filter((t) => t.category === "packaging");
    const safetyTemplates = ALL_STICKER_TEMPLATES.filter((t) => t.category === "safety");
    const barcodeTemplates = ALL_STICKER_TEMPLATES.filter((t) => t.category === "barcodes");
    const socialTemplates = ALL_STICKER_TEMPLATES.filter((t) => t.category === "social");

    expect(frameTemplates.length).toBeGreaterThanOrEqual(14);
    expect(badgeTemplates.length).toBeGreaterThanOrEqual(6);
    expect(retailTemplates.length).toBeGreaterThanOrEqual(6);
    expect(shippingTemplates.length).toBeGreaterThanOrEqual(4);
    expect(packagingTemplates.length).toBeGreaterThanOrEqual(6);
    expect(safetyTemplates.length).toBeGreaterThanOrEqual(5);
    expect(barcodeTemplates.length).toBeGreaterThanOrEqual(3);
    expect(socialTemplates.length).toBeGreaterThanOrEqual(2);
  });

  it("should provide diverse lifestyle sticker categories with designed templates", () => {
    expect(ALL_STICKER_TEMPLATES.length).toBeGreaterThanOrEqual(50);

    const greeting = ALL_STICKER_TEMPLATES.filter((t) => t.category === "greeting");
    const cafe = ALL_STICKER_TEMPLATES.filter((t) => t.category === "cafe");
    const beauty = ALL_STICKER_TEMPLATES.filter((t) => t.category === "beauty");
    const kids = ALL_STICKER_TEMPLATES.filter((t) => t.category === "kids");
    const seasonal = ALL_STICKER_TEMPLATES.filter((t) => t.category === "seasonal");

    expect(greeting.length).toBeGreaterThanOrEqual(6);
    expect(cafe.length).toBeGreaterThanOrEqual(6);
    expect(beauty.length).toBeGreaterThanOrEqual(3);
    expect(kids.length).toBeGreaterThanOrEqual(5);
    expect(seasonal.length).toBeGreaterThanOrEqual(4);

    // كل قالب جديد يجب أن يحمل عناصر تصميم ثرية وبيانات نصية قابلة للتعديل
    const lifestyle = [...greeting, ...cafe, ...beauty, ...kids, ...seasonal];
    lifestyle.forEach((t) => {
      expect(t.fields.length).toBeGreaterThanOrEqual(2);
      expect(t.description.length).toBeGreaterThan(10);
    });
  });

  it("should make new templates searchable by their Arabic names", () => {
    const thanks = searchStickerTemplates("شكر");
    expect(thanks.some((t) => t.id === "greeting_thanks_bubble")).toBe(true);

    const coffee = searchStickerTemplates("قهوة");
    expect(coffee.some((t) => t.id === "cafe_freshly_brewed")).toBe(true);

    const pizza = searchStickerTemplates("بيتزا");
    expect(pizza.some((t) => t.id === "food_hot_pizza")).toBe(true);

    const shawarma = searchStickerTemplates("شاورما");
    expect(shawarma.some((t) => t.id === "food_shawarma_grill")).toBe(true);

    const honey = searchStickerTemplates("عسل");
    expect(honey.some((t) => t.id === "food_natural_honey")).toBe(true);

    const eid = searchStickerTemplates("عيد");
    expect(eid.some((t) => t.id === "greeting_eid_mubarak")).toBe(true);

    const diploma = searchStickerTemplates("دبلوم");
    expect(diploma.some((t) => t.id === "frame_diploma_scroll")).toBe(true);

    const rx = searchStickerTemplates("صيدلية");
    expect(rx.some((t) => t.id === "medical_rx_pharmacy")).toBe(true);
  });

  it("should let click-editing cover every visible field — hidden fields are only encoded data", () => {
    // لكل قالب: الحقول غير القابلة للنقر يجب أن تكون بيانات مولّدة (QR) فقط
    ALL_STICKER_TEMPLATES.forEach((template) => {
      const defaultFields = Object.fromEntries(template.fields.map((f) => [f.id, f.defaultValue]));
      const svg = template.generateSvg({
        fields: defaultFields,
        primaryColor: template.defaultColors.primary,
        secondaryColor: template.defaultColors.secondary,
        backgroundColor: template.defaultColors.background,
        isTransparent: false,
        fontFamily: "Cairo",
      });
      const hidden = findHiddenFieldIds(svg, template.fields.map((f) => f.id));

      // استثناء وحيد مسموح: رابط QR لأنه مرسوم كمصفوفة نقطية
      hidden.forEach((id) => {
        expect(id, `Unexpected hidden field "${id}" in ${template.id}`).toBe("qrUrl");
      });
    });
  });

  it("should find templates by id correctly", () => {
    const gold = getStickerTemplateById("seal_gold_guarantee");
    expect(gold).toBeDefined();
    expect(gold?.category).toBe("badges");

    const wasNow = getStickerTemplateById("retail_was_now");
    expect(wasNow).toBeDefined();
    expect(wasNow?.category).toBe("retail");

    const fragile = getStickerTemplateById("shipping_fragile");
    expect(fragile).toBeDefined();
    expect(fragile?.category).toBe("shipping");

    const flammable = getStickerTemplateById("safety_flammable");
    expect(flammable).toBeDefined();
    expect(flammable?.category).toBe("safety");

    const pay = getStickerTemplateById("social_pay_accepted");
    expect(pay).toBeDefined();
    expect(pay?.category).toBe("social");
  });

  it("should support instant search across titles, descriptions, and shapes", () => {
    const searchResult = searchStickerTemplates("ضمان");
    expect(searchResult.length).toBeGreaterThan(0);
    expect(searchResult.some((t) => t.id === "seal_gold_guarantee")).toBe(true);

    const shippingResult = searchStickerTemplates("كسر", "shipping");
    expect(shippingResult.length).toBeGreaterThan(0);
    expect(shippingResult[0].id).toBe("shipping_fragile");

    const circularStickers = searchStickerTemplates("", "all", "circle");
    expect(circularStickers.length).toBeGreaterThan(0);
    circularStickers.forEach((t) => {
      expect(getTemplateShape(t)).toBe("circle");
    });
  });

  it("should generate valid SVG vector graphics for each template", () => {
    ALL_STICKER_TEMPLATES.forEach((template) => {
      const defaultFields = Object.fromEntries(template.fields.map((f) => [f.id, f.defaultValue]));
      const svg = template.generateSvg({
        fields: defaultFields,
        primaryColor: template.defaultColors.primary,
        secondaryColor: template.defaultColors.secondary,
        backgroundColor: template.defaultColors.background,
        isTransparent: false,
        fontFamily: "Cairo",
      });

      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain(`viewBox="0 0 ${template.defaultWidth} ${template.defaultHeight}"`);
    });
  });

  it("should parse into a valid XML DOM without any parsererror for all templates", () => {
    const parser = new DOMParser();
    ALL_STICKER_TEMPLATES.forEach((template) => {
      const defaultFields = Object.fromEntries(template.fields.map((f) => [f.id, f.defaultValue]));
      const svg = template.generateSvg({
        fields: defaultFields,
        primaryColor: template.defaultColors.primary,
        secondaryColor: template.defaultColors.secondary,
        backgroundColor: template.defaultColors.background,
        isTransparent: false,
        fontFamily: "Cairo",
      });

      const doc = parser.parseFromString(svg, "image/svg+xml");
      const parseError = doc.querySelector("parsererror");
      expect(parseError?.textContent || null, `Template ${template.id} has XML syntax error in default SVG`).toBeNull();
      expect(doc.documentElement.tagName.toLowerCase()).toBe("svg");
    });
  });

  it("should safely handle XML special characters (&, <, >, \", ') in all fields without XML corruption", () => {
    const parser = new DOMParser();
    ALL_STICKER_TEMPLATES.forEach((template) => {
      const dangerousFields = Object.fromEntries(
        template.fields.map((f) => [f.id, `A & B <tag> "val" 'q' ${f.defaultValue}`])
      );
      const svg = template.generateSvg({
        fields: dangerousFields,
        primaryColor: "#123456",
        secondaryColor: "#654321",
        backgroundColor: "#ffffff",
        isTransparent: false,
        fontFamily: "Cairo",
      });

      const doc = parser.parseFromString(svg, "image/svg+xml");
      const parseError = doc.querySelector("parsererror");
      expect(parseError?.textContent || null, `Template ${template.id} failed with special characters`).toBeNull();
    });
  });

  it("should have authentic Iraqi localizations for templates (currency, country, phone, payment)", () => {
    // 1. Retail: prices in Iraqi Dinars (د.ع) & Iraqi national product
    const wasNow = getStickerTemplateById("retail_was_now")!;
    const wasNowFields = Object.fromEntries(wasNow.fields.map((f) => [f.id, f.defaultValue]));
    expect(wasNowFields.oldPrice).toContain("د.ع");
    expect(wasNowFields.newPrice).toContain("د.ع");
    expect(wasNowFields.oldPrice).not.toContain("ر.س");

    const national = getStickerTemplateById("retail_national_product")!;
    const nationalFields = Object.fromEntries(national.fields.map((f) => [f.id, f.defaultValue]));
    expect(nationalFields.mainText).toBe("صُنع في العراق");
    expect(nationalFields.subText).toBe("منتج عراقي وطني");
    expect(nationalFields.enText).toBe("PROUDLY MADE IN IRAQ");

    // 2. Barcodes: Iraqi company, GS1 621 prefix, Baghdad warehouse
    const code128 = getStickerTemplateById("barcode_code128")!;
    const code128Fields = Object.fromEntries(code128.fields.map((f) => [f.id, f.defaultValue]));
    expect(code128Fields.storeTitle).toBe("شركة الرافدين للتجارة");
    expect(code128Fields.priceTag).toContain("د.ع");

    const ean13 = getStickerTemplateById("barcode_ean13")!;
    const ean13Fields = Object.fromEntries(ean13.fields.map((f) => [f.id, f.defaultValue]));
    expect(ean13Fields.barcodeValue).toMatch(/^621/); // Official Iraq GS1 prefix
    expect(ean13Fields.price).toContain("د.ع");

    const warehouse = getStickerTemplateById("barcode_warehouse_box")!;
    const warehouseFields = Object.fromEntries(warehouse.fields.map((f) => [f.id, f.defaultValue]));
    expect(warehouseFields.shelfLoc).toContain("مستودعات بغداد");

    // 3. Social: Iraqi payment networks (ZainCash, Qi Card, FIB), .iq domains & Tigris/Dijlah WiFi
    const pay = getStickerTemplateById("social_pay_accepted")!;
    const payFields = Object.fromEntries(pay.fields.map((f) => [f.id, f.defaultValue]));
    expect(payFields.payMethods).toContain("زين كاش");
    expect(payFields.payMethods).toContain("كي كارد");
    expect(payFields.payMethods).toContain("FIB");
    expect(payFields.payMethods).not.toContain("مدى");

    const social = getStickerTemplateById("social_follow_us")!;
    const socialFields = Object.fromEntries(social.fields.map((f) => [f.id, f.defaultValue]));
    expect(socialFields.handle).toBe("@GridoStudio.iq");

    const wifi = getStickerTemplateById("social_wifi_access")!;
    const wifiFields = Object.fromEntries(wifi.fields.map((f) => [f.id, f.defaultValue]));
    expect(wifiFields.ssid).toBe("Dijlah_Guest_5G");

    // 4. Packaging: .iq domain
    const packaging = getStickerTemplateById("packaging_thank_you")!;
    const packagingFields = Object.fromEntries(packaging.fields.map((f) => [f.id, f.defaultValue]));
    expect(packagingFields.socialHandle).toBe("@YourStore.iq");

    // 5. Safety: Iraqi international phone code (+964)
    const safety = getStickerTemplateById("safety_lithium_battery")!;
    const safetyFields = Object.fromEntries(safety.fields.map((f) => [f.id, f.defaultValue]));
    expect(safetyFields.contactPhone).toContain("+964");
    expect(safetyFields.contactPhone).not.toContain("+966");

    // Global audit: No template should contain non-Iraqi regional currencies or codes
    ALL_STICKER_TEMPLATES.forEach((template) => {
      const defaultFields = Object.fromEntries(template.fields.map((f) => [f.id, f.defaultValue]));
      const allText = JSON.stringify(defaultFields);
      expect(allText).not.toContain("ر.س");
      expect(allText).not.toContain("+966");
      expect(allText).not.toContain("السعودية");
      expect(allText).not.toContain(".sa\"");
    });
  });

  it("should save, load, filter, and delete user sticker presets in localStorage", () => {
    localStorage.removeItem(STICKER_PRESETS_STORAGE_KEY);
    expect(loadStickerPresets()).toEqual([]);

    const sampleParams = {
      fields: { title: "متجر السعادة", subtitle: "عروض خاصة" },
      primaryColor: "#FF0000",
      secondaryColor: "#00FF00",
      backgroundColor: "#FFFFFF",
      isTransparent: false,
    };

    const saved = saveStickerPreset("قالب تجريبي 1", "retail_was_now", sampleParams);
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe("قالب تجريبي 1");

    const loaded = loadStickerPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("قالب تجريبي 1");

    const filtered = getPresetsForTemplate(loaded, "retail_was_now");
    expect(filtered).toHaveLength(1);

    const otherTemplate = getPresetsForTemplate(loaded, "other_template");
    expect(otherTemplate).toHaveLength(0);

    const afterDelete = deleteStickerPreset(saved.id);
    expect(afterDelete).toHaveLength(0);
    expect(loadStickerPresets()).toHaveLength(0);
  });

  it("should handle copySvgCodeToClipboard gracefully", async () => {
    const ok = await copySvgCodeToClipboard("<svg></svg>");
    expect(typeof ok).toBe("boolean");
  });
});



