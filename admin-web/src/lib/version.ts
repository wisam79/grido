import { useEffect, useState } from 'react';

/**
 * جلب إصدار التطبيق الحالي من Netlify Function (/api/version)
 * مع كاش على مستوى الوحدة لمنع تكرار الطلب بين المكونات (Hero + CTA).
 * الاستجابة: { tag_name: "v1.2.10", ... } — نعرض الرقم بدون السابقة v.
 */

let cachedVersion: string | null = null;
let inflight: Promise<string | null> | null = null;

async function fetchAppVersion(): Promise<string | null> {
  if (cachedVersion) return cachedVersion;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/api/version', { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = (await res.json()) as { tag_name?: string };
      const tag = typeof data.tag_name === 'string' ? data.tag_name.replace(/^v/i, '').trim() : '';
      if (tag) {
        cachedVersion = tag;
        return tag;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Hook: يعيد رقم الإصدار الحالي (بدون v) أو null أثناء التحميل/عند الفشل */
export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(cachedVersion);

  useEffect(() => {
    let mounted = true;
    void fetchAppVersion().then((v) => {
      if (mounted && v) setVersion(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return version;
}
