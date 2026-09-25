# تقرير التدقيق الشامل — الأمان والاكتمال — 2026-09-25

> **النطاق:** Grido Studio كاملاً — خلفية Go (Wails v3)، واجهة React/TS، لوحة `admin-web`، `modal_ai`، وهجرات `supabase`.
> **المنهجية:** قراءة الكود الحالي + تشغيل الأدوات الفعلية. لا اعتماد على تقارير سابقة.
> **ما شُغّل فعلاً في هذه الجولة:**
> - `go vet ./...` → نظيف.
> - `go test ./internal/...` → كل الحزم ناجحة.
> - `npx tsc --noEmit` → 0 أخطاء.
> - `npm run lint` (`eslint src test e2e --max-warnings 0`) → 0 تحذيرات.
> - `npx vitest run` → **82 ملف اختبار / 645 اختباراً ناجحاً**.

---

## 1. الخلاصة التنفيذية

التطبيق في حالة هندسية جيدة جداً على محور «البوابات الآلية»: صفر أخطاء أنواع، صفر تحذيرات lint، وكل الاختبارات تمر.
العيوب المتبقية ليست في المسارات المُختبَرة، بل في **مسارات غير مغطاة باختبارات** و**ميزات إدارية تبدو فعّالة وهي ليست كذلك**، و**أسرار مبنية بلا مستهلك**.

| الخطورة | العدد | الفئة المهيمنة |
|---|---|---|
| 🔴 حرجة | 0 | — |
| 🟠 عالية | 2 | ميزة إدارية وهمية (facade)، سر ميت مُدمج في النسخة |
| 🟡 متوسطة | 4 | قبول محتوى غير صورة، حجر صحي بلا نافذة، تكلفة GPU خاطئة، تسجيل حصة صامت |
| ⚪ منخفضة | 4 | تناسق واجهة، ملفات ضخمة، سجلات، تدويل |

**لا توجد ثغرة حرجة قابلة للاستغلال المباشر.** الدفاعات الجوهرية (تقييد المسارات، الكتابة الذرية، بصمة التحديث، RLS، انتحال الصلاحيات) مُنفَّذة وتم التحقق منها في الكود.

---

## 2. العيوب المؤكدة (كل بند: الدليل ← الأثر ← الإصلاح)

### 🟠 [C-01] «إعدادات النظام الحية» في لوحة الإدارة واجهة وهمية (Local-only Facade)

**الدليل:**
- `admin-web/src/pages/AdminDashboard.tsx:503-512` — `handleSaveSettings` يكتب فقط:
  `localStorage.setItem('grido_sys_notice' | 'grido_sys_maint' | 'grido_free_ai_limit' | 'grido_pro_ai_limit', ...)`
  ثم يعرض «تم حفظ إعدادات النظام الحية بنجاح!».
- لا يوجد أي `INSERT/UPDATE/RPC` إلى Supabase في هذا المسار.
- بحث كامل في المستودع عن مستهلك لهذه المفاتيح (`sys_notice`, `maintenance`, `sys_maint`) → **لا وجود لأي قارئ** في تطبيق سطح المكتب ولا في الخادم.

**الأثر:** التبويب يُعلن «Live System Settings & AI Quotas: global broadcast announcements + maintenance mode + live AI daily quota adjustments» (موثّق في `CHANGELOG.md`)، لكن:
- الإعلان العام (Broadcast) لا يصل لأي مستخدم.
- وضع الصيانة (Maintenance) لا يفعل شيئاً — لا في التطبيق ولا في الـ API.
- تعديل الحصص لا يغيّر الحصص المفروضة فعلاً.

**الإصلاح:** إمّا ربطه بجدول `system_config` حقيقي + RPC يقرأه `license_service.go`/`upscaler.py` فعلاً، أو إعادة تسمية التبويب إلى «مسودة محلية» وإزالة ادعاء «الحية». خيار ثالث مقبول: حذف التبويب بالكامل.

---

### 🟠 [C-02] سرّ مُدمج في كل بناء بلا أي مستهلك (`ModalAIKey` / `GRIDO_AI_SECRET_KEY`)

**الدليل:**
- `internal/service/license_service.go:75,109-113,130-134,142-155` — يُقرأ المتغير ويُعرض عبر `GetModalAIKey()`.
- بحث كامل: `GetModalAIKey` مُستدعى **فقط** من `license_service_test.go`. لا مسار إنتاجي.
- مسار الذكاء الاصطناعي الحقيقي يعتمد توثيق المستخدم: `ai_service.go` يرسل `Authorization: Bearer <user JWT>`، و`upscaler.py` يتحقق من الـJWT مع Supabase.
- يُحقن إجبارياً في كل بناء: `build/windows/Taskfile.yml:63-64`, `build.ps1:22,52`, `.github/workflows/release.yml:128`.
- `.agents/AGENTS.md:89` يوجب «دائماً» تضمينه لتفادي خطأ 401 — **وهذا غير صحيح حالياً**؛ لا يوجد أي مسار يقرأه.

**الأثر:** مفتاح سري مشترك داخل ملف تنفيذي عام (قابل للاستخراج بـ`strings`) بلا حاجة، مع توثيق يدفع الوكلاء والقادمين لتكرار الحقن تستمرّ به المشكلة. مخاطرة أمنية صامتة + دين توثيقي.

**الإصلاح:** إمّا حذف `ModalAIKey`/`GetModalAIKey` وسطر `ldflags` وقراءة `build.ps1` والإشارات في `README`/`AGENTS.md`، أو تفعيله فعلاً كبوابة `X-API-Key` في `upscaler.py` إن كان ذلك هو المقصود الأصلي.

---

### 🟡 [C-03] مخزن الوسائط يقبل محتوى غير صورة وSVG بفحص فضفاض

**الدليل:** `internal/service/media_service.go` (`SaveImageFromBase64` + `isOpaqueBinaryContent` + `looksLikeSvg`):
- `isOpaqueBinaryContent` يقبل `application/octet-stream` (أي بايتات غير معروفة).
- الامتداد يُشتق من **نوع MIME المُعلن** (`GetExtensionFromMime(mimeType)`) لا من المحتوى، وافتراضيه `.jpg`.
- `looksLikeSvg` يكفي فيه وجود `<?xml` مع ادّعاء svg.
- الملفات تُخدَم عبر `/local-image/` في `main.go` بنوع مبني من الامتداد.

**الأثر:** يستطيع المسار كتابة بايتات عشوائية/ملف نصي داخل مجلد يُخدَم (كـ`.jpg`)، ورفع SVG يحتوي `<style>@import url(...)</style>` يُحدث طلبات خارجية عند عرضه في مسار لا يمرّ على منظّف HTML (`sanitizeSvgMarkup` يحمي مسار الملصقات فقط، لا الملف المخزّن).

**الإصلاح:** قائمة بيضاء لتوقيعات صور حقيقية فقط (magic bytes)، إسقاط `octet-stream`، واشتقاق الامتداد من المحتوى لا من ادّعاء العميل.

---

### 🟡 [C-04] الحجر الصحي (`MediaTrash`) بلا نافذة استرداد فعليّة

**الدليل:** `internal/repository/db.go`:
- `moveUnreferencedToTrash` (L) → `time.Since(info.ModTime()) < 7*24h` ثم `os.Rename` إلى `MediaTrash`.
- `purgeOldTrash` (L) → يحذف ما `ModTime` أقدم من `30*24h`.
- `runCleanupMedia` يستدعي الاثنين **في الدورة نفسها**.
- `os.Rename` **يحافظ على mtime** الأصلي.

**الأثر:** ملف غير مرجعي عمره > 30 يوماً يُنقل إلى الحجر ثم يُحذف نهائياً في نفس دورة التنظيف — أي أن «نافذة الاسترداد 30 يوماً» المذكورة في التعليق لا وجود لها عملياً في الحالة التي بُنيت من أجلها.

**الإصلاح:** تحديث mtime بعد النقل (`os.Chtimes(trashPath, now, now)`) أو تخزين طابع حذف في اسم/ملف منفصل.

---

### 🟡 [C-05] تكلفة الـGPU المسجَّلة غير صحيحة (سعر خاطئ)

**الدليل:** `modal_ai/upscaler.py`:
- الفئة تعمل على `gpu="L4"` (`@app.cls(..., gpu="L4")`).
- حساب التكلفة يستخدم سعر A10G وثابتاً تعسفياً:
  `cost_usd = exec_seconds * (1.10/3600)` و`total_cost_usd = (exec_seconds + 2) * (1.10/3600)` مع تعليق يسمّي A10G.

**الأثر:** `public.ai_usage.cost_usd` مضخّم/خاطئ بشكل نظامي، فتصبح إحصاءات التكلفة وMRR في لوحة الإدارة غير موثوقة (وهي أصلاً تقرأ آخر 100 سجل فقط: `AdminDashboard.tsx` `limit(100)`).

**الإصلاح:** استخدام سعر L4 الحقيقي وتمرير `gpu` كمصدر واحد للحقيقة، أو حذف الـ`+2s` إن لم يكن مبرَّراً.

---

### 🟡 [C-06] فشل تسجيل الحصة يُبتلع ⇒ استهلاك فوق الحد

**الدليل:** `modal_ai/upscaler.py` (بلوك التسجيل النهائي):
```python
except Exception as e:
    print(f"Failed to record usage in Supabase DB: {e}")   # يتجاهل الخطأ ويكمل
```
كما أن الفحص المسبق `except Exception: ... (continuing)` يتجاهل أي فشل غير-HTTP.
و`ai_service.go` يُسجّل تحذيراً فقط عند فشل `callAIUsageRPC` للمسار الاحتياطي.

**الأثر:** انقطاع شبكي لحظي أثناء التسجيل يعني أن العملية المكلَّفة بالأجهزة تُنفَّذ ولا تُحتسب، فيحصل المستخدم على طلبات إضافية فوق نصيبه. (مقايضة مقصودة بين التوفّر والصحة، لكنها غير موثّقة كسياسة.)

**الإصلاح:** تأجيل/إعادة محاولة محلية للتسجيل الفاشل (طابور في القرص) بدل الإسقاط، أو رفض الرد للمستخدم عند فشل التسجيل.

---

### ⚪ [C-07] حقل تراجع التاريخ في `loadProject` ناقص الحقول

**الدليل:** `frontend/src/lib/store/slices/core-slice.ts` — بذرة `history[0]` تُنشأ بحقول:
`mode, elements, slots, canvasWidth, canvasHeight, backgroundColor, collage*` **فقط**، وتُهمل
`backgroundGradientColor2`, `backgroundGradientAngle`, `template`, `collageTemplate`, `lastEditedImage`, `lastEditedImageAspect`.
بينما `restoreEntry` في `history-slice.ts` يستعيد فقط المفاتيح **غير undefined**.

**الأثر:** منخفض/بنّاء — التسلسل يحتوي مفتاحين متجاوزين لنفس المنطق (البذرة هنا، و`DEFAULT_HISTORY_ENTRY_EXTRAS` هناك)، فأي حقل مؤثر جديد في اللقطة قد يُهمل في أحد الموضعين ويُنتج تراجعاً لا يعيد الحالة كاملة.

**الإصلاح:** بناء البذرة من نفس مصدر `captureSnapshot`/`DEFAULT_HISTORY_ENTRY_EXTRAS` بدل تكرار الحقول يدوياً.

---

### ⚪ [C-08] تناسق واجهة وتجربة

- **محاذاة الشريط ناقصة:** القائمة المنسدلة في `toolbar-selection-tools.tsx` تعرض 3 محاذيات فقط (يسار/توسيط/يمين)، بينما المتجر يدعم 6 (`top|middle|bottom`) — متاحة في `arrange-tab.tsx` و`freeform-layers-tab.tsx` فقط. يعمل لكنه غير متناسق.
- **23 `alert()/confirm()` أصلية** في `AdminDashboard.tsx` (1608 سطراً) بدل مكونات الواجهة — أدوات داخلية، لكن تجربة غير مصقولة ومصدر إزاحات ولا يمكن اختبارها.
- **ملفات ضخمة:** `element-slice.ts` (937)، `FreeformCollageModal.tsx` (867)، `App.tsx` (659)، `AdminDashboard.tsx` (1608).
- **لا طبقة تدويل:** كل النصوص العربية مثبّتة داخل المكونات.
- **رصد:** `console.error/warn` منتشرة بلا طبقة تسجيل واحدة أو تقارير أخطاء.

---

## 3. ما تم التحقق من سلامته (لا يُعاد العمل عليه)

هذه ليست فرضيات — قُرئت في الكود:

| المحور | الدليل |
|---|---|
| تقييد المسارات والروابط الرمزية | `main.go` (`/local-image/`, `/api/save-file`), `media_service.go:GetImageDimensions`, `image_processor.go:ApplyMaskRaw` — كلها `EvalSymlinks` + فحص بادئة قاعدة |
| الكتابة الذرية | `internal/utils/atomicfile.go` (tmp + `fsync` + `Rename` + أقفال مسار لكل هدف) مُستخدمة في autosave/media/print/logs/tokens |
| بصمة التحديث | `updater.go` — رفض بلا SHA-256 صالح، منع هبوط HTTPS، `O_EXCL` بأذونات 0700، سقف 200MB، فحص نوع المحتوى |
| إشعار صحة السجل الزمني | `crypto.go:VerifyTime` يفشل مغلقاً عند غياب ملف الوقت مع وجود توقيع |
| خادم OAuth المحلي | `oauth_server.go` — منفذ عشوائي، `state` لمرة واحدة (`CompareAndSwap`), قائمة أصول مسموحة، مهلات |
| جسر الهاتف | `phone_bridge_service.go` — `ConstantTimeCompare`، `MaxBytesReader`، فحص MIME، ولا يسجّل التوكن أبداً |
| خصم الحصة المزدوج | `ai_service.go` يستدعي RPC بـ`check_only=true`؛ التسجيل الفعلي في `upscaler.py` فقط — لا خصم مزدوج |
| RLS وSupabase | منع تصعيد الباقة/الحالة/`expires_at`/`license_key` في `update_own_profile`؛ `activate_license` بـ`FOR UPDATE SKIP LOCKED`؛ `is_admin()` لم يعد يثق بباقة enterprise |
| تنقية SVG | `frontend/src/lib/utils.ts` يحجب عناصر الخطر و`on*` و`javascript:`/`data:svg` |

---

## 4. خطة العمل بالأولوية

**فوري (أقل من ساعة):**
1. حسم `ModalAIKey` — حذف أو تفعيل فعلي (C-02).
2. تصحيح ادعاء «الحية» في تبويب إعدادات الإدارة، أو ربطه (C-01).

**قصير (1–3 أيام):**
3. تشديد `SaveImageFromBase64` إلى توقيعات صور حقيقية (C-03).
4. `os.Chtimes` عند النقل إلى الحجر الصحي (C-04).
5. تصحيح سعر GPU وتسجيل `gpu` كمصدر واحد (C-05).
6. طابور إعادة تسجيل الحصة عند الفشل (C-06).

**متوسط:**
7. توحيد بذرة التاريخ مع `captureSnapshot` (C-07).
8. إكمال قائمة المحاذاة في الشريط، وإزالة `alert()` من لوحة الإدارة، وتفكيك الملفات الضخمة، وإضافة طبقة رصد موحّدة (C-08).

---

## 5. حدود هذا التقرير

- لم تُشغَّل اختبارات E2E/Playwright في هذه الجولة (تتطلب متصفحات مثبّتة ومنافذ)، ولا اختبارات مسارات ويندوز الأصلية (تحتاج بناء Wails كاملاً).
- لم تُراجَع سطور `admin-web` كلها (1608 سطراً) سطراً بسطر — رُكّز على مسارات المصادقة والإعدادات وجلب البيانات.
- `remove_bg.py` / `remove_bg_simple.py` في `admin-web/` لم تُراجَع (تبدو سكربتات مساعدة خارج نطاق التطبيق).
