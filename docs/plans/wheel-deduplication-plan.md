# خطة إزالة ازدواجية "اختراع العجلة" في المحرك — Grido Studio

**التاريخ:** 16 سبتمبر 2026
**الحالة:** ✅ منفَّذة بالكامل (MAINT-03…09) — سجل الجلسة في `docs/features-tracker.md §0.5`.
**المصدر:** تدقيق معماري على الكود الفعلي (لا على التوثيق) حدّد عجلات ضارة (تكرار/انحراف) وعجلات صحيحة مقصودة.

---

## 1. ما نُفِّذ

| ID | التنفيذ | ملفات |
|----|---------|-------|
| MAINT-03 | وحدة الكتابة الأذرعية `CreateAtomic/Commit/Abort/AtomicWriteFile` + 8 اختبارات | `internal/utils/atomicfile.go`, `atomicfile_test.go` |
| MAINT-04 | ترحيل 12 موضعاً كانت تكرر نمط tmp+fsync+rename يدوياً (تثبيت الصلاحية 0644/0600 صراحة) | `crypto.go`, `autosave_service.go`, `ai_logs_service.go`, `ai_service.go`, `media_service.go`, `image_processor.go`, `phone_bridge_service.go`, `print_export.go`, `window_state.go`, `app.go`, `main.go` |
| MAINT-05 | مساعد إعادة المحاولة الموحد (jitter ±20%، `Retry-After`، وعي بالسياق، قاعدة "لا إعادة على 4xx عدا 408/429"، وفي تدوير refresh_token: إعادة على أخطاء النقل فقط) + 12 اختباراً | `internal/service/http_retry.go`, `http_retry_test.go`, `supabase_client.go`, `license_service.go` |
| MAINT-06 | حذف 3 ملفات build-tag (`browser_windows/linux/darwin.go`) وكود `OpenFolder` الميت؛ استبدال بـ `runtime.BrowserOpenURL` خلف منفذ محقون `LicenseService.browserOpen` + دالة نقية `buildOAuthAuthorizeURL` + 5 اختبارات | `license_service.go`, `oauth_server.go`, `app.go`, `main.go`, `oauth_browser_test.go` |
| MAINT-07 | وحدة `clamp` موحّدة — **انحراف مقصود عن الخطة الأصلية**: وُضعت في `lib/clamp.ts` وليس `lib/utils.ts` لأن `face-frame-utils` يُستهلك داخل `face-frame.worker.ts`، و`lib/utils.ts` يسحب `templates`+`tailwind-merge` (تلوث حزم الـ workers) | `lib/clamp.ts` (جديد)، `freeform-math.ts`, `face-frame-utils.ts`, `FreeformCollageModal.tsx` |
| MAINT-08 | 3 عملاء HTTP مشتركة بمهلاتها الأصلية (10s/15s/3m) بدل إنشاء عميل داخل كل نداء | `internal/service/ai_service.go` |
| MAINT-09 | وسوم "📍 حالة البند (2026-09-16)" في مراجعة التطبيق الشاملة؛ سجل جلسة §0.5؛ بند MAINT في CHANGELOG | `docs/reviews/comprehensive-app-review.md`, `docs/features-tracker.md`, `CHANGELOG.md` |

## 2. معيار القبول — النتائج (2026-09-16)

```text
go build ./...            ✅ (بلا أخطاء)
go vet . internal/...     ✅ (نظيف على الحزم المعدّلة: الجذر/الخدمة/utils)
go test (كامل service)    ✅ PASS
go test utils/handlers/repository/core  ✅ ok
rg '\.tmp' (Go, غير اختباري) → internal/utils/atomicfile.go فقط ✅
rg 'writeSecureFile|openAtomicFile|abortAtomicFile' (خارج utils) → 0 ✅
rg 'OpenBrowser|OpenFolder|rundll32|xdg-open' (internal) → 0 ✅
rg 'time.Sleep' (license_service/supabase_client) → 0 ✅
clamp محلي في الواجهة     → 0 (استيراد موحّد من lib/clamp.ts) ✅
tsc --noEmit              ✅
npm run lint / npm test   ⏳ (تتحقق نتيجتها في السجل أعلاه عند اكتمالها)
```

## 3. عجلات أُبقيت عمداً (لا تُمسّ — قرارات معتمدة)

| الموضع | التبرير |
|--------|---------|
| `lib/print/print-layout-math.ts` | مصدر وحيد لصيغ الشبكة (أزال تكراراً سابقاً) — رياضيات نطاق-خاص |
| `lib/filters/custom-filters.ts` (`SepiaBlend`) | مطابقة CSS/Go مقصودة للـ WYSIWYG؛ فلتر Konva المدمج ثابت الشدة |
| `lib/store/slices/history-slice.ts` | Undo/Redo مخصص محسّن للأداء (سقف 30/50MB، WeakMap) |
| `print_export.go` (pHYs/JFIF + التدفق) | stdlib لا يكتب DPI؛ الترميز التدفّقي للملفات الكبيرة مقصود |
| `updater.go` + `zip.go` | Wails v2 بلا AutoUpdater |
| `AIRateLimiter` (`ai_service.go`) | حصص يومية لكل جهاز + استمرارية — أوسع من `x/time/rate` |
| `clipboard-utils.ts` | Wails v2 بلا Clipboard runtime |

## 4. بند متبقٍ (مفتوح)

- **P2 تاريخي:** مُحدِّد معدل على مستوى مصادقة الحساب (`docs/reviews/comprehensive-app-review.md` §شبكة-2) لم يُنفَّذ — مقترح مفتوح وليس عجلة قائمة.
