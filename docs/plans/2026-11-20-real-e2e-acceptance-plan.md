# قبول E2E شامل — قرار وتنفيذ 2026-11-20

## القرار والنطاق

المستخدم اعتمد بناء بوابة E2E تحاكي تجربة المستخدم الفعلية وتشغيلها كاملة وإصلاح الفشل، مع فرع اختبار مؤقت وcommit/push وتشغيل CI دون دمج `main` أو نشر لوحة الإدارة أو إصدار. البيئة اصطناعية معزولة؛ لا حسابات أو صور عملاء أو بيانات إنتاج.

**الحالة الحالية: IN PROGRESS، لا PASS قبول نهائي.** الفرع `test/e2e-acceptance-20261120`. لقطة الإصلاحات السابقة `0acc51e684d113175109a38d95c763442720bce1` رُفعت، وبدأ CI التأسيسي [44802717734](https://github.com/wisam79/grido/actions/runs/44802717734). هذا تشغيل للحزمة الحالية، لا لمسار real-backend/native الجديد. النتائج ستُلحق بعد وصولها، ولا تُفترض من حالة run aggregate.

## مستويات الإثبات

| المسار | ما يعمل فعلياً | الحدود |
|---|---|---|
| browser-integration | React/Konva GUI الفعلية مع Wails/service fixtures معلنة | لا يثبت Go أو SQLite أو cloud/OS |
| real-server | نفس `main.go` والخدمات وSQLite/ميديا/تصدير عبر Wails server وواجهة الإنتاج | adapter اختباري لحوار الملف لا يثبت OS file picker |
| actual-local-supabase | Auth/RLS/Storage/Realtime محلية مؤقتة + مستخدم/أدمن اصطناعيان | ليست مشروع production أو بريد/Google OAuth/Modal حي |
| native-webview2 | binary اختبار Windows + Go الحقيقي وWebView2 بCDP محصور build tag | auth contract loopback معلن إن استُعمل؛ video من attached context قد يكون unsupported |
| physical/live-external | كاميرا/طابعة/Google/Modal/updater على بيئة مخصصة | BLOCKED عند غياب العتاد/الموارد؛ لا تحولها إلى skip ناجح |

كل مسار يثبت مدخلاً وأفعال GUI وأثراً فعلياً ومخرجات/بيانات، مع إعادة فتح/تراجع حيث ينطبق. لا تغير store أو dispatch للقيام بالإجراء قيد الاختبار، لا force click لتجاوز خلل، ولا عبارات أقوى من التأكيدات.

## مصفوفة الرحلات الحاكمة

| المعرف | الرحلة | نهاية مطلوبة | حالة التنفيذ الأولية |
|---|---|---|---|
| J-01 | الإقلاع/workflow/licensing/login/logout/relaunch | الجلسة/الترخيص الفعليان عبر backend، لا fixture frontend unlock | قيد التنفيذ |
| J-02 | image input/EXIF/alpha/crop/filter/flip/rotate/undo | هندسة وrender + المصدر محفوظ + output صحيح | قيد التنفيذ |
| J-03 | Arabic/Latin text/fonts/shapes/fills/shadows/group/lock/layers | الأثر المرسوم والتراجع والأقفال وعدم فقد geometry | قيد التنفيذ |
| J-04 | actual named saved template/custom grid/fill/overflow/cell edit | تطبيق القالب المطلوب فعلياً وترتيب الصور وحفظ/إعادة فتح | قيد التنفيذ |
| J-05 | freeform collage add/move/resize/apply/save/import | قفل النسبة/المجموعات ومعاملة save/import/reopen | قيد التنفيذ |
| J-06 | project save/update/restart/open/delete/autosave/recovery/quit | نفس project ID/content/media بعد process restart | قيد التنفيذ |
| J-07 | backup export/import merge/overwrite/fresh root | archive حقيقي وround-trip مستقل | قيد التنفيذ |
| J-08 | stickers catalog/customize/insert/re-edit/VDP/QR/barcode | مخرج حقيقي وقراءة حمولة/مطابقة الصفوف | قيد التنفيذ |
| J-09 | scanner detect/warp/preview/apply/undo/export | تشغيل المحرك المتاح الحقيقي لا mocked corners | قيد التنفيذ |
| J-10 | admin login/search/edit/keys/confirm/cancel/logout/authz | DB/Auth حقيقيان في Supabase محلية معزولة | قيد التنفيذ |
| J-11 | phone permission/photo/pair/upload/desktop arrival | storage/realtime ووصول صورة، hardware مسجل منفصلاً | قيد التنفيذ/قدرات خارجية |
| J-12 | PNG/JPEG/PDF/CMYK TIFF/DPI/bleed/cut-lines/cancel | file bytes/metadata/pixels/hash وصفحات PDF وTIFF flags | قيد التنفيذ |
| J-13 | theme/RTL/compact/wide/200%/keyboard/focus/menu occlusion | إتاحة الأفعال وhit testing وfocus/reversal | قيد التنفيذ |
| J-14 | AI/quota/Google/mail/live printer/camera/updater | خدمة/عتاد sandbox حقيقيان ودليل مستقل | يتطلب قدرات منفصلة؛ لا قبول ضمني |

لكل رحلة يسجل idle/empty/loading/run/cancel/success/partial/error/retry/focus/undo/locked/stale-result أو not-applicable مع سبب. لا علامة نجاح قبل تشغيل نقطة النهاية ودليلها.

## شروط التشغيل الكامل

- تقرير المتوقع/المختار/المنفذ/pass/fail/skipped/flaky من discovery/runtime، لا من عدد static وحده.
- manual workflow يُفعّل الوظائف المطلوبة دون path filter؛ كامل Chromium/Firefox/WebKit في نطاق browser suite المعلن، ثم real/native/admin مستقلة.
- JSON/JUnit/blob/HTML وtrace/screenshots/video المتاح وملفات خرج وfixture hashes وcommit SHA. نقص capability يُعلن، ولا يُختلق artifact.
- retry-pass يظل flaky؛ لا حذف assertion أو تغيير tolerance/skip لإخفاء العيب. إعادة كاملة أخيرة على SHA واحد بعد الإصلاحات.
- hosted native/server على loopback و`GRIDO_APP_DIR` مؤقت، بلا إنتاج أو tunnel عام أو أسرار role في frontend/binary/artifacts.
- Native adapter/tag `e2e` منفصل عن إصدار production، بلا auth bypass وبلا اختبار API في release؛ الميديا/project/export تمر بالخدمات الفعلية.
- Supabase fixture تنسخ migrations byte-for-byte وتعالج prerequisite auth principal ضمن DB مؤقت فقط، لا history rewrite أو نسخ حساب production.
- لا E2E/fullsuite/build ثقيل محلي حسب قواعد المشروع؛ الفحوص الخفيفة وملف اختبار وحدة متأثر فقط مسموحان.

## سجل التشغيل التأسيسي

- أول branch snapshot مُجهَّز ببوابات docs/fragment/lint-staged/Conventional Commits ناجحة؛ `main` لم يتغير.
- CI 44802717734 @0acc51e6 بدأ بوظائف docs/changes/admin/frontend/Chromium shards/WebKit smoke/Windows/print report/race coverage.
- `Backend Quality & Tests` ظهر **SKIPPED** بسبب شرط تغير المسارات؛ هذا سبب تقوية manual full-run، لا قبول شامل.
- كل نتائج الوظائف النهائية والعيوب/retries تُلحق هنا بعد اكتمال run.

## فجوات القدرات المتوقعة — ليست نتائج اختبارات

لا physical printer أو camera أو sandbox Modal/Google مخصص مثبت في البيئة الحالية. يُشغّل الممكن حقيقةً، ويُسجّل الباقي BLOCKED مستقلًا. لا عبارة «كل التطبيق passed» إذا بقيت الرحلات الإلزامية محجوبة. الشمولية هدف ومصفوفة عمل، وليست وعداً باجتياز بيئة غير متاحة.
