import { describe, it, expect } from 'vitest';

import { computeTargetRasterPx } from '@/features/stickers/lib/print-rerasterize';
import {
  autoFitSheetGrid,
  computeSheetCellLayout,
  DEFAULT_SHEET_MARGIN_MM,
  SHEET_CUT_MARK_COLOR,
} from '@/features/stickers/lib/sheet-generator';
import {
  contrastRatio,
  isLowContrastPair,
  textColorRoles,
} from '@/features/stickers/lib/sticker-a11y';
import {
  mmToPx,
  normalizeArabicQuery,
  namespaceStickerSvgIds,
  postProcessStickerSvg,
} from '@/features/stickers/lib/sticker-text';
import { searchStickerTemplates } from '@/features/stickers/templates';

describe('sticker-quality: Arabic search normalization', () => {
  it('unifies hamza/alef variants', () => {
    expect(normalizeArabicQuery('أحمد')).toBe(normalizeArabicQuery('احمد'));
    expect(normalizeArabicQuery('إسلام')).toBe(normalizeArabicQuery('اسلام'));
  });

  it('unifies taa-marbuta/haa and alef-maqsura/yaa, strips tashkeel + tatweel', () => {
    expect(normalizeArabicQuery('قهوة')).toBe(normalizeArabicQuery('قهوه'));
    expect(normalizeArabicQuery('حلوى')).toBe(normalizeArabicQuery('حلوي'));
    expect(normalizeArabicQuery('مُحمَّصة')).toBe(normalizeArabicQuery('محمصة'));
    expect(normalizeArabicQuery('قهــوة')).toBe(normalizeArabicQuery('قهوة'));
  });

  it('finds templates despite Arabic spelling variance', () => {
    const hits = searchStickerTemplates('قهوه', 'all', 'all');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((t) => t.name.includes('قهوة'))).toBe(true);
  });
});

describe('sticker-quality: SVG id namespacing', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><filter id="badge-shadow"><feDropShadow/></filter><path id="badge-top-curve" d="M0,0"/></defs><circle fill="red" filter="url(#badge-shadow)"/><text font-size="20"><textPath href="#badge-top-curve">نص</textPath></text></svg>`;

  it('prefixes ids + url() + href refs', () => {
    const out = namespaceStickerSvgIds(svg, 'tpl-x');
    expect(out).toContain('id="tpl-x-badge-shadow"');
    expect(out).toContain('url(#tpl-x-badge-shadow)');
    expect(out).toContain('href="#tpl-x-badge-top-curve"');
  });

  it('is idempotent (no double prefix on re-run)', () => {
    const once = namespaceStickerSvgIds(svg, 'tpl-x');
    const twice = namespaceStickerSvgIds(once, 'tpl-x');
    expect(twice).toBe(once);
  });

  it('postProcess applies namespace end-to-end', () => {
    const out = postProcessStickerSvg(svg, { namespace: 'live-y' });
    expect(out).toContain('id="live-y-badge-shadow"');
    expect(out).toContain('direction="rtl"');
  });
});

describe('sticker-quality: Arabic letter-spacing guard', () => {
  it('strips letter-spacing from RTL text but keeps Latin', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><text data-field-id="a" x="250" y="100" font-size="20" letter-spacing="3">مطعم بغداد الأصيل</text><text data-field-id="b" x="250" y="200" font-size="20" letter-spacing="3">PREMIUM</text></svg>`;
    const out = postProcessStickerSvg(svg);
    const arabicEl = out.match(/<text[^>]*data-field-id="a"[^>]*>/)?.[0] ?? '';
    const latinEl = out.match(/<text[^>]*data-field-id="b"[^>]*>/)?.[0] ?? '';
    expect(arabicEl).not.toContain('letter-spacing');
    expect(latinEl).toContain('letter-spacing="3"');
  });
});

describe('sticker-quality: contrast guard (WCAG)', () => {
  it('scores black-on-white at 21 and identical colors at 1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 2);
  });

  it('rejects non-hex input with null', () => {
    expect(contrastRatio('red', '#ffffff')).toBeNull();
    expect(contrastRatio('', '#ffffff')).toBeNull();
  });

  it('flags low-contrast pairs for print warning', () => {
    expect(isLowContrastPair('#f59e0b', '#ffffff')).toBe(true);
    expect(isLowContrastPair('#1e293b', '#ffffff')).toBe(false);
  });

  it('limits the warning to roles that actually paint text', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="#1e293b"><text data-field-id="t">نص</text></g><path d="M0 0h10" fill="#f59e0b"/></svg>`;
    const roles = textColorRoles(svg, { primaryColor: '#1e293b', secondaryColor: '#f59e0b' });
    expect(roles).toEqual(new Set(['primary']));
  });

  it('detects both roles when both carry text, and returns null for broken SVG', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text fill="#1e293b">أ</text><text><tspan fill="#f59e0b">ب</tspan></text></svg>`;
    expect(textColorRoles(svg, { primaryColor: '#1e293b', secondaryColor: '#f59e0b' })).toEqual(
      new Set(['primary', 'secondary']),
    );
    expect(
      textColorRoles('<svg><text>', { primaryColor: '#1e293b', secondaryColor: '#f59e0b' }),
    ).toBeNull();
  });
});

describe('sticker-quality: sheet auto-fit', () => {
  it('fits 50mm stickers on A4 with 4mm gaps (3 cols x 5 rows)', () => {
    const fit = autoFitSheetGrid({
      stickerWidthMm: 50,
      stickerHeightMm: 50,
      sheetWidthMm: 210,
      sheetHeightMm: 297,
      spacingMm: 4,
    });
    expect(fit.cols).toBe(3);
    expect(fit.rows).toBe(5);
    expect(fit.count).toBe(15);
  });

  it('never returns zero cells even for oversized stickers', () => {
    const fit = autoFitSheetGrid({
      stickerWidthMm: 500,
      stickerHeightMm: 500,
      sheetWidthMm: 210,
      sheetHeightMm: 297,
      spacingMm: 4,
    });
    expect(fit.rows).toBeGreaterThanOrEqual(1);
    expect(fit.cols).toBeGreaterThanOrEqual(1);
  });

  it('anchors the default sheet padding to the same 8mm margin as auto-fit', () => {
    // ✂️ علامات القص تمتد 7مم خارج الملصق (2مم إزاحة + 5مم طول) — هامش 8مم
    // يضمن بقاؤها كاملة داخل الورقة عند الخلايا الحدودية.
    expect(DEFAULT_SHEET_MARGIN_MM).toBe(8);
    expect(mmToPx(DEFAULT_SHEET_MARGIN_MM)).toBeGreaterThan(mmToPx(7));
    expect(SHEET_CUT_MARK_COLOR).toBe('#111827');
  });

  it('caps sheet cells at the declared physical sticker size (no stretch)', () => {
    // ✂️ خلية أكبر من الملصق كانت تمدده ليملأها فيكبّره فوق راستر 300DPI
    const A4W = mmToPx(210);
    const A4H = mmToPx(297);
    const stickerW = mmToPx(50);
    const capped = computeSheetCellLayout({
      sheetWidthPx: A4W,
      sheetHeightPx: A4H,
      rows: 3,
      cols: 3,
      gapPx: mmToPx(4),
      paddingPx: mmToPx(8),
      imgAspect: 1,
      stickerWidthPx: stickerW,
      stickerHeightPx: stickerW,
    });
    expect(capped.drawW).toBe(stickerW);
    expect(capped.drawH).toBe(stickerW);

    // بلا سقف: السلوك القديم — التمدد لملء الخلية
    const uncapped = computeSheetCellLayout({
      sheetWidthPx: A4W,
      sheetHeightPx: A4H,
      rows: 3,
      cols: 3,
      gapPx: mmToPx(4),
      paddingPx: mmToPx(8),
      imgAspect: 1,
    });
    expect(uncapped.drawW).toBeGreaterThan(stickerW);
  });

  it('preserves sticker aspect when the cell is narrower than the cap', () => {
    const capped = computeSheetCellLayout({
      sheetWidthPx: mmToPx(210),
      sheetHeightPx: mmToPx(297),
      rows: 6,
      cols: 6,
      gapPx: mmToPx(4),
      paddingPx: mmToPx(8),
      imgAspect: 2, // ملصق عريض 2:1
      stickerWidthPx: mmToPx(100),
      stickerHeightPx: mmToPx(50),
    });
    // الخلية أصغر من السقف → ملاءمة contain داخل الخلية بنسبة 2:1
    expect(capped.drawW / capped.drawH).toBeCloseTo(2, 5);
    expect(capped.drawW).toBeLessThanOrEqual(capped.cellW);
  });

  it('computes print-target raster pixels with the 50MP budget guard', () => {
    expect(computeTargetRasterPx(100, 100, 300)).toEqual({
      width: mmToPx(100, 300),
      height: mmToPx(100, 300),
    });
    // 1000مم عند 300DPI يتجاوز ميزانية 50MP → null بدل انفجار ذاكرة
    expect(computeTargetRasterPx(1000, 1000, 300)).toBeNull();
    expect(computeTargetRasterPx(0, 100, 300)).toBeNull();
    expect(computeTargetRasterPx(100, 100, 0)).toBeNull();
  });
});
