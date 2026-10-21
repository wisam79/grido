import { describe, expect, it } from 'vitest';

import { hexToHsv, hsvToHex, normalizeHexColor, wheelPointToHsv } from '../src/lib/color-wheel';

describe('lib/color-wheel', () => {
  it('يطبّع صيغ HEX الثلاثية والست عشرية', () => {
    expect(normalizeHexColor('fff')).toBe('#FFFFFF');
    expect(normalizeHexColor('#0f08')).toBeNull();
    expect(normalizeHexColor('  #2563eb ')).toBe('#2563EB');
  });

  it('يحوّل الأحمر والأخضر والأزرق إلى HSV صحيح', () => {
    expect(hexToHsv('#FF0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv('#00FF00')).toEqual({ h: 120, s: 1, v: 1 });
    expect(hexToHsv('#0000FF')).toEqual({ h: 240, s: 1, v: 1 });
  });

  it('يحافظ على تدرّج الرمادي دون فقدان درجة اللون السابقة', () => {
    expect(hexToHsv('#808080', 210)).toEqual({ h: 210, s: 0, v: 128 / 255 });
  });

  it('يعيد تحويل HSV إلى نفس HEX', () => {
    for (const hex of ['#FFFFFF', '#000000', '#2563EB', '#DC2626', '#14B8A6']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });

  it('يحسب درجة اللون والتشبع من نقطة داخل العجلة', () => {
    expect(wheelPointToHsv(50, 50, 100)).toMatchObject({ h: 0, s: 0, v: 1 });
    expect(wheelPointToHsv(50, 0, 100)).toMatchObject({ h: 0, s: 1 });
    expect(wheelPointToHsv(100, 50, 100)).toMatchObject({ h: 90, s: 1 });
    expect(wheelPointToHsv(50, 100, 100)).toMatchObject({ h: 180, s: 1 });
    expect(wheelPointToHsv(0, 50, 100)).toMatchObject({ h: 270, s: 1 });
  });

  it('يقصّ النقاط خارج العجلة عند أقصى تشبع', () => {
    expect(wheelPointToHsv(500, 500, 100).s).toBe(1);
    expect(wheelPointToHsv(50, 50, 100, 0.4).v).toBe(0.4);
  });
});
