# خطة الاستقرار والإصلاح الشامل — Grido Studio

**التاريخ:** 12 نوفمبر 2026
**المرجع:** `5e01c7e7` على `main`
**الحالة:** قيد التنفيذ
**النطاق المستبعد:** CodeFormer/Modal، وسياسة التحديث الحالية غير الموقعة إلى حين وصول SignPath

## 1. الهدف والثوابت

تهدف الخطة إلى حماية بيانات المستخدم، تقليص سطح IPC، إلغاء الأعمال الثقيلة فعليًا، تثبيت انتقالات المصادقة والموارد الأصلية، توحيد التقاط Konva، تحسين الوصول والأداء، ورفع جودة بوابات CI. التنفيذ تراكمي داخل Wails + Go + React + Konva، بلا إعادة كتابة وبلا نشر أو migration حي أو إصدار ضمن هذه الجلسة.

قرارات محمية:

- يبقى مشتق 2048px مخصصًا للعرض، ولا تُرقّى `fillPatternImage` إلى الأصل قبل تصميم تحويل هندسي يحفظ موضع وحجم النقش.
- يبقى `cutShapeType` دليل قص وبيانات مشروع، وليس clipping فعليًا، إلى أن يُعتمد عقد die-cut مستقل.
- يبقى مسار التحديث HTTPS + SHA-256، ويصبح Ed25519 إلزاميًا فقط عند حقن مفتاح عام. لا يُفرض SignPath قبل تفعيله.
- لا تشغيل محلي للحزم الشاملة أو Playwright أو البناء؛ الاختبارات المستهدفة فقط، والباقي في CI بعد دفع مأذون.

## 2. حالة البنود

| الرمز | الأولوية | البند | الحالة | دليل/حدود |
|---|---:|---|---|---|
| S0 | P0 | تنظيف Git وأرشفة الـstash وتصفية فروع Dependabot وتثبيت سجل حي | ✅ محليًا | stash مؤرشف خارج المشروع ببصمات ثم حُذف؛ PRs #20/#21/#29/#30 مغلقة وفروعها محذوفة؛ لا commit/push |
| S1 | P0 | الاحتفاظ ببيانات المشاريع والوسائط عند uninstall | ✅ كود/فحص | uninstall الجديد يحفظ البيانات؛ الترحيل يحميها من uninstaller القديم بنقل/استعادة ذرية؛ policy + ترجمة NSIS خضراء؛ Windows VM متبقٍ |
| S2 | P0 | إزالة أغلفة دورة الحياة من IPC وتثبيت عقد الربطات | ✅ | الربطات 88→86؛ drift 5/5، typecheck/lint وGo مستهدف أخضر |
| S3 | P0 | إلغاء حقيقي وحد قبول للماسح والكشف الأصلي | ✅ | AbortSignal→HTTP context؛ بوابة عمليتين؛ Golden/Go/HTTP/typecheck/lint أخضر |
| S4 | P0 | تسلسل انتقالات المصادقة وتنقيح سجلاتها | ✅ | generation + commit محلي؛ stale/logout وrefresh وlogger مع Race Detector أخضر |
| S5 | P1 | مالك موحد لـONNX وإغلاق أصلي + validators توافقية | ✅ | مالك process-wide وإغلاق App؛ service/handler/vet أخضر؛ legacy محفوظ |
| S6 | P1 | منسق التقاط Stage واحد وتسلسل الالتقاط وتحسين السحب | ✅ | capture queue + fonts/preview + cleanup/index؛ 71/71 وtypecheck/lint |
| S7 | P1 | Tab/Focus/Context Menu/بطاقات المشاريع/UI Zoom | ✅ كود/وحدة | Radix Dialog، `mod+period`، 200%؛ GUI WebView2 عند CI/قبول يدوي |
| S8 | P2 | bundle/async/حدود الطبقات/CI الدوري وإعادة الإنتاج | 🟡 جزئي | Race+coverage أسبوعي وإزالة waits؛ bundle/gateway/hashes مؤجلة لدفعة مستقلة |

## 3. ترتيب التنفيذ

1. **S0–S2:** تنظيف المستودع، حماية بيانات الإزالة، وإغلاق سطح lifecycle قبل توسيع بقية العقود.
2. **S3–S5:** إصلاح ملكية العمليات والهوية والموارد الأصلية، ثم validators دون كسر الملفات القديمة.
3. **S6–S7:** توحيد الالتقاط وإصلاح الوصول بعد تثبيت دورة الحياة والإلغاء.
4. **S8:** تحسينات الأداء والمعمارية وCI بعد استقرار العقود؛ السحابة والهجرات تحتاج موافقة مستقلة.

## 4. بوابات كل دفعة

- اختبار Vitest أو Go مستهدف لكل سبب جذري متغير.
- `npm --prefix frontend run typecheck` و`npm --prefix frontend run lint` عند تعديل الواجهة.
- `gofmt` و`go vet` للحزم المتأثرة عند تعديل Go.
- إعادة توليد Wails bindings واختبار drift عند أي تغيير IPC.
- `npm --prefix frontend run format:check`، `git diff --check`، و`node scripts/docs-gate.mjs --strict-refs` قبل الإغلاق.
- CI الكامل وWindows/WebView2 والطباعة الأصلية بعد دفع مأذون فقط.

## 5. نتائج التحقق المحلي وحدوده

- Go: `go test ./internal/service ./internal/server ./internal/handlers` ناجح؛ و`go test -race` للحزم الثلاث ناجح؛ `go vet ./internal/... .` ناجح.
- Frontend: 169/169 اختباراً مستهدفاً في 14 ملفاً، ثم اختبارا Tab/UI zoom 16/16؛ `typecheck` وESLint وPrettier ناجحة.
- البوابات: فحص سياسة NSIS، اتساق الإصدار، `docs-gate --strict-refs` و`git diff --check` ناجحة.
- لم تُشغّل Full Vitest أو Playwright/E2E أو build محلياً حسب دستور المشروع. Windows installer VM، WebView2 GUI، الطباعة الأصلية، والوظيفة السحابية الأسبوعية تبقى قبول CI/يدوي بعد دفع مأذون.
- S8 بقيت جزئية عمداً: bundle budget، ترحيل IPC gateway، وبصمات نماذج MediaPipe تحتاج baseline/hash موثوقاً ودُفعات أصغر.

## 6. التوثيق والتسليم

يُحدّث هذا الجدول و`docs/features-tracker.md` بعد كل دفعة، مع fragment واحد للجلسة. تغييرات Go/IPC تُزامن مع `docs/developer_guide.md`، وتغييرات الاختبارات مع `docs/testing_guide.md` وأرقام `docs/DOCUMENTATION_MAP.md` من أوامر فعلية فقط. لا يُعدّل `CHANGELOG.md` يدويًا، ولا commit أو push أو نشر دون إذن المالك.
