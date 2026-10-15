import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  isArabicText,
  TEXT_MAX_LENGTH,
  TEXT_LABEL_PREVIEW,
} from '@/lib/canvas/text-helpers';

describe('text-helpers', () => {
  describe('constants', () => {
    it('defines TEXT_MAX_LENGTH as 2000', () => {
      expect(TEXT_MAX_LENGTH).toBe(2000);
    });

    it('defines TEXT_LABEL_PREVIEW as 30', () => {
      expect(TEXT_LABEL_PREVIEW).toBe(30);
    });
  });

  describe('sanitizeText', () => {
    it('returns empty string for falsy inputs', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as unknown as string)).toBe('');
      expect(sanitizeText(undefined as unknown as string)).toBe('');
    });

    it('normalizes CRLF and CR to LF', () => {
      const input = 'سطر أول\r\nسطر ثان\rسطر ثالث';
      expect(sanitizeText(input)).toBe('سطر أول\nسطر ثان\nسطر ثالث');
    });

    it('preserves tab and newline while stripping control characters', () => {
      const input = 'كلمة\x00\x08\tبينها\x1B\x7Fمحارف\x0Cتحكم\nوسطر جديد';
      expect(sanitizeText(input)).toBe('كلمة\tبينهامحارفتحكم\nوسطر جديد');
    });

    it('normalizes Unicode strings to NFC form', () => {
      // 'e' + combining acute accent -> 'é' in NFC
      const decomposed = 'e\u0301cole';
      const sanitized = sanitizeText(decomposed);
      expect(sanitized).toBe('école');
      expect(sanitized.length).toBe(5);
    });

    it('caps text at TEXT_MAX_LENGTH by default', () => {
      const longText = 'أ'.repeat(2500);
      const sanitized = sanitizeText(longText);
      expect(sanitized.length).toBe(TEXT_MAX_LENGTH);
    });

    it('respects custom maxLen parameter', () => {
      const text = 'نص تجريبي للاختبار';
      expect(sanitizeText(text, 5)).toBe('نص تج');
    });
  });

  describe('isArabicText', () => {
    it('identifies Arabic text correctly', () => {
      expect(isArabicText('مرحبا بكم')).toBe(true);
      expect(isArabicText('استوديو غريدو')).toBe(true);
      expect(isArabicText('٠١٢٣٤٥٦٧٨٩')).toBe(true);
    });

    it('identifies mixed Arabic and Latin text', () => {
      expect(isArabicText('Grido استوديو')).toBe(true);
      expect(isArabicText('Cairo 2026 م')).toBe(true);
    });

    it('returns false for Latin text and symbols only', () => {
      expect(isArabicText('Hello World')).toBe(false);
      expect(isArabicText('1234567890')).toBe(false);
      expect(isArabicText('!@#$%^&*()')).toBe(false);
    });

    it('returns false for empty or nullish input', () => {
      expect(isArabicText('')).toBe(false);
      expect(isArabicText(null)).toBe(false);
      expect(isArabicText(undefined)).toBe(false);
    });
  });
});
