import { describe, it, expect } from 'vitest';
import {
  AI_DAILY_LIMITS,
  aiPlanDailyLimit,
  aiUtcDayKey,
  countEnhanceUsageForDay,
  parseQuotaSnapshotFromResponse,
  resolveAiQuota,
  type AiUsageLogLike,
} from '@/lib/ai/quota';

const enhanceLog = (overrides: Partial<AiUsageLogLike> = {}): AiUsageLogLike => ({
  serviceName: 'ترميم الوجوه بالذكاء الاصطناعي (CodeFormer)',
  status: 'success',
  email: 'user@example.com',
  timestamp: '2026-09-28 21:00:00',
  ...overrides,
});

describe('ai quota — day key', () => {
  it('uses the UTC day (matches the server timezone(utc, now()) counter)', () => {
    // 2026-01-01T23:30Z ⇒ اليوم UTC هو 2026-01-01 (محلياً في UTC+3 يكون 01-02)
    expect(aiUtcDayKey(new Date('2026-01-01T23:30:00.000Z'))).toBe('2026-01-01');
    expect(aiUtcDayKey(new Date('2026-01-02T00:00:02.000Z'))).toBe('2026-01-02');
  });
});

describe('ai quota — plan limits', () => {
  it('maps the three plans and falls back to free', () => {
    expect(aiPlanDailyLimit('free')).toBe(AI_DAILY_LIMITS.free);
    expect(aiPlanDailyLimit('pro')).toBe(AI_DAILY_LIMITS.pro);
    expect(aiPlanDailyLimit('enterprise')).toBe(AI_DAILY_LIMITS.enterprise);
    expect(aiPlanDailyLimit(null)).toBe(AI_DAILY_LIMITS.free);
    expect(aiPlanDailyLimit('unknown-plan')).toBe(AI_DAILY_LIMITS.free);
  });

  it('ignores inherited Object prototype keys', () => {
    expect(aiPlanDailyLimit('constructor')).toBe(AI_DAILY_LIMITS.free);
    expect(aiPlanDailyLimit('toString')).toBe(AI_DAILY_LIMITS.free);
  });
});

describe('ai quota — local fallback counting', () => {
  it('counts only successful enhance logs for the requested UTC day', () => {
    const logs: AiUsageLogLike[] = [
      enhanceLog({ utcDay: '2026-09-28' }),
      enhanceLog({ utcDay: '2026-09-28' }),
      enhanceLog({ utcDay: '2026-09-27' }),
      enhanceLog({ utcDay: '2026-09-28', status: 'failed' }),
      enhanceLog({ utcDay: '2026-09-28', serviceName: 'عزل الخلفية الذكي' }),
      enhanceLog({ utcDay: '2026-09-28', email: 'other@example.com' }),
    ];

    expect(countEnhanceUsageForDay(logs, '2026-09-28', 'user@example.com')).toBe(2);
  });

  it('falls back to the stored timestamp for legacy logs without utcDay', () => {
    const logs: AiUsageLogLike[] = [enhanceLog({ timestamp: '2026-09-28 23:50:00' })];
    expect(countEnhanceUsageForDay(logs, '2026-09-28')).toBe(1);
  });
});

describe('ai quota — resolution (server first)', () => {
  const now = new Date('2026-09-28T12:00:00.000Z');

  it('prefers the server snapshot for the current UTC day', () => {
    const quota = resolveAiQuota({
      snapshot: { used: 14, limit: 15, at: now.getTime() },
      plan: 'pro',
      logs: [],
      now,
    });

    expect(quota).toEqual({ used: 14, limit: 15, remaining: 1, source: 'server' });
  });

  it('ignores a stale snapshot from a previous UTC day and uses the local fallback', () => {
    const quota = resolveAiQuota({
      snapshot: { used: 14, limit: 15, at: new Date('2026-09-27T12:00:00.000Z').getTime() },
      plan: 'pro',
      logs: [enhanceLog({ utcDay: '2026-09-28' })],
      userEmail: 'user@example.com',
      now,
    });

    expect(quota).toEqual({ used: 1, limit: 15, remaining: 14, source: 'local' });
  });

  it('never reports negative remaining quota', () => {
    const quota = resolveAiQuota({
      snapshot: { used: 99, limit: 50, at: now.getTime() },
      now,
    });
    expect(quota.remaining).toBe(0);
  });

  it('does not let a locally counted stale-log drift below zero remaining', () => {
    const logs = Array.from({ length: 6 }, () => enhanceLog({ utcDay: '2026-09-28' }));
    const quota = resolveAiQuota({ plan: 'free', logs, userEmail: 'user@example.com', now });
    expect(quota).toEqual({ used: 6, limit: 5, remaining: 0, source: 'local' });
  });

  it('rejects a snapshot when the user upgraded their plan (e.g. from 5 to 15)', () => {
    // اللقطة القديمة سُجلت عندما كان الحساب free (limit=5, used=5)
    const staleSnapshot = { used: 5, limit: 5, at: now.getTime(), userEmail: 'user@example.com' };
    // تمت الترقية إلى pro (الحد المتوقع 15)
    const quota = resolveAiQuota({
      snapshot: staleSnapshot,
      plan: 'pro',
      logs: [],
      userEmail: 'user@example.com',
      now,
    });
    // تسقط اللقطة وتعود النتيجة إلى local على باقة pro مع كامل الرصيد المتبقي
    expect(quota).toEqual({ used: 0, limit: 15, remaining: 15, source: 'local' });
  });

  it('rejects a snapshot belonging to another user email', () => {
    const quota = resolveAiQuota({
      snapshot: { used: 5, limit: 5, at: now.getTime(), userEmail: 'alice@example.com' },
      plan: 'free',
      logs: [],
      userEmail: 'bob@example.com',
      now,
    });
    expect(quota).toEqual({ used: 0, limit: 5, remaining: 5, source: 'local' });
  });
});

describe('ai quota — snapshot parsing', () => {
  it('parses the server quota fields from an enhance response', () => {
    const snapshot = parseQuotaSnapshotFromResponse(
      { used_today: 3, daily_limit: 15 },
      123,
      'user@example.com',
    );
    expect(snapshot).toEqual({ used: 3, limit: 15, at: 123, userEmail: 'user@example.com' });
  });

  it('returns null when the server did not send the fields', () => {
    expect(parseQuotaSnapshotFromResponse({ image: 'data:image/jpeg;base64,x' })).toBeNull();
    expect(parseQuotaSnapshotFromResponse(null)).toBeNull();
    expect(parseQuotaSnapshotFromResponse({ used_today: '3', daily_limit: 15 })).toBeNull();
    expect(parseQuotaSnapshotFromResponse({ used_today: 3, daily_limit: 0 })).toBeNull();
    // NaN/Infinity لا تُقبل كلقطة صالحة
    expect(parseQuotaSnapshotFromResponse({ used_today: Number.NaN, daily_limit: 15 })).toBeNull();
  });
});
