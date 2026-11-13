# خطة إغلاق فجوات الطباعة والتصدير

**التاريخ:** 13 نوفمبر 2026
**المرجع:** `425b14d8` على `main`
**الحالة:** منفذة محلياً؛ CI والقبول الفيزيائي للطابعة معلقان

## الثوابت المحمية

- لا ICC كامل أو soft proof ضمن هذه الخطة.
- `fillPatternImage` يبقى على مشتق العرض 2048px حتى تصميم تحويل هندسي مستقل.
- `cutShapeType` دليل/بيانات مشروع وليس clipping تلقائياً.
- CMYK الحقيقي TIFF فقط، والطباعة الأصلية GDI تبقى RGB/sRGB.
- لا عودة إلى `window.print()` في المسار النشط.
- لا Full Suite أو E2E أو build محلياً؛ البوابات الثقيلة في CI بعد إذن مستقل.

## حالة الموجات

| الموجة | النطاق | الحالة |
|---|---|---|
| P0 | fixture مستقل + عقود IPC + bindings | ✅ |
| P1 | cover/DPI + عقد الفلاتر TS/Go + capture transaction | ✅ |
| P2 | bleed + CMYK + gradient + owner-specific cancellation | ✅ |
| P3 | GDI plan/status/cancel + Windows pure CI + performance baseline | ✅ محلياً |
| P4 | full-sheet parity + real-printer acceptance + docs closure | ⚠️ parity/SOP منجزان؛ تشغيل العتاد Pending |

## بوابات القبول

1. صور الوضع الحر تستخدم cover نفسه في المحرر، preflight، fast path وGo.
2. الفلاتر القانونية لها expected RGBA مستقل يمر في TypeScript وGo.
3. capture يملك كل mutations/readiness/timeout/abort ويعيد الحالة حتمياً.
4. bleed الموجب يفشل صراحة عند أي عجز؛ CMYK fallback لا يحفظ ملفاً فارغاً.
5. gradient المحلي لكل نسخة يتطابق في preview وGo.
6. إلغاء jobID خاص لا يلغي أعمالاً أخرى؛ compose والتوليد وspool قابلة للإلغاء.
7. الورق الصريح لا يسقط إلى A4/default بصمت، والواجهة تعرض الخطة الفعلية.
8. Windows CI يشغل `TestGDIPure_*`، والأداء report-only حتى تثبيت baseline.
9. التوثيق والأرقام من البوابة الفعلية فقط، مع حزمة قبول طابعة حقيقية.

## حدود التسليم

لا commit أو push أو إصدار أثناء موجات التنفيذ. بعد البوابات المحلية يلزم إذن مستقل لفتح PR وتشغيل CI. القبول الفيزيائي للطابعة يبقى بوابة مالك؛ اللون record-only ما دام ICC مؤجلاً.
