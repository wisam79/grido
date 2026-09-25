<div align="center">

# Grido Studio

**استوديو الهوية — تصميم صور، كولاج، وطباعة احترافية بأدوات ذكاء اصطناعي**

تطبيق سطح مكتب لويندوز لتصميم صور الهوية، تجميع الكولاجات، وعزل الخلفية
وترميم الصور بالذكاء الاصطناعي — مع محرك طباعة عالي الدقة وأبعاد ملمية دقيقة.

**Wails v3 (Go)** × **React + TypeScript** × **Konva Canvas**

</div>

---

## المحتويات

- [الميزات](#-الميزات)
- [المتطلبات](#-المتطلبات)
- [التطوير](#-التطوير)
- [البناء](#-البناء)
- [المعمارية](#-المعمارية)
- [استراتيجية الذكاء الاصطناعي](#-استراتيجية-الذكاء-الاصطناعي)
- [الاختبارات](#-الاختبارات)
- [الترخيص وسجل التغييرات](#-الترخيص-وسجل-التغييرات)

---

## ✨ الميزات

| الميزة | التفاصيل |
|---|---|
| **محرر مزدوج** | وضع كولاج بخانات ثابتة + وضع تعديل حر (صور، نصوص، أشكال) مع تحكم كامل بالطبقات |
| **عزل خلفية أوفلاين** | نموذج `selfie_multiclass` عبر MediaPipe داخل Web Worker — يعمل بدون إنترنت بعد أول تحميل، مع إلغاء فوري |
| **ترميم وتحسين AI** | خط أنابيب مزدوج: CodeFormer للوجوه + Real-ESRGAN x2 للخلفية (GPU L4 عبر Modal AI) |
| **طباعة دقة عالية** | أوراق DPI مخصصة مع خطوط قص، حدود مستديرة، وأبعاد ملمية دقيقة (حتى 144 ميغابكسل) + **تصدير PDF بخطوط قص متجهة** |
| **قوالب جاهزة** | هويات، جوازات سفر، تأشيرات، وكولاجات قابلة للتخصيص |
| **ملصقات وبطاقات تجارية** | مقاسات كروت وبادجات وهوامش نزيف وقص (Bleed Guides)، وتوليد رموز QR وباركود متجهة، ومونتاج ورقي ذكي |
| **تراخيص سحابية** | مصادقة Supabase (بريد/OTP/Google) مع خطط مجانية واحترافية |
| **خطوط عربية** | 29 عائلة في مُنتقي الخطوط (16 منها معدّة للعمل أوفلاين؛ 12 تُنزَّل آلياً عبر `scripts/download-fonts.js`) |

---

## 📋 المتطلبات

| الأداة | الإصدار |
|---|---|
| [Go](https://go.dev/dl/) | 1.25+ |
| [Node.js](https://nodejs.org/) | 22+ |
| [Wails CLI](https://v3.wails.io/) | `wails3` v3.0.0-beta.25 |
| NSIS | للبناء على ويندوز فقط |

```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0-beta.25
```

> 🧱 **مطلوب قبل أي بناء/فحص نوعي:** ربطات الواجهة تُولَّد إلى `frontend/bindings/` (مُستثناة من Git):
> `wails3 generate bindings -ts -clean=true` — ملفات `frontend/wailsjs/**` هي **جسور يدوية مُتتبَّعة** تعيد التصدير منها ولا تُولَّد بالأمر السابق.
> (خطافات `prebuild`/`pretypecheck`/`pretest` في `frontend/package.json` تُعطي رسالة صريحة إذا غابت الربطات.)
>
> 🧠 **أصول الذكاء الاصطناعي (`frontend/public/models/`) مُستثناة من Git وتُهيّأ آلياً:**
> نموذج ماسح المستندات (scanic) يُنسخ عبر `frontend/scripts/copy-models.mjs` في `postinstall` و`prebuild`،
> ونماذج MediaPipe (عزل الخلفية/تأطير الوجه) عبر `frontend/scripts/download-models.ps1`.
> أي غياب يُفشل البناء برسالة صريحة بدل التراجع الصامت لميزة معطّلة.

---

## 🚀 التطوير

```bash
# 1. انسخ متغيرات البيئة واملأ القيم
cp .env.example .env

# 2. شغّل وضع التطوير مع Hot Reload (منفذ Vite الافتراضي 9245)
wails3 task dev
```

<details>
<summary><b>متغيرات البيئة (ملف <code>.env</code>)</b></summary>

| المتغير | الوصف |
|---|---|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_ANON_KEY` | مفتاح Supabase العام |
| `MODAL_AI_URL` | *(اختياري)* تجاوز عنوان نقطة نهاية خادم الذكاء الاصطناعي — لا مفتاح مطلوب |

> 🔒 مفاتيح Supabase لا تُدمج في الكود — تُحقن عبر ldflags عند البناء أو تُقرأ من ملف `.env` المحلي (مستثنى من Git).
> 🔒 **لا يوجد مفتاح لخادم Modal:** التوثيق يتم عبر JWT المستخدم (`Authorization: Bearer`) الذي يتحقق منه الخادم مع Supabase.

</details>

---

## 🛠️ البناء

```bash
# بناء محلي موقّع (يقرأ .env تلقائياً) — Wails v3 Taskfile
./build.ps1

# أو مباشرة
wails3 task build
```

<details>
<summary><b>البناء التلقائي عبر GitHub Actions</b></summary>

يُبنى التطبيق ويُصدَّر كإصدار آلياً عند إضافة Tag بصيغة `v*`.
المتغيرات المطلوبة في **Repository Secrets**:

| Secret | الوصف |
|---|---|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_ANON_KEY` | مفتاح Supabase العام |
| `SIGNPATH_API_TOKEN` | توقيع برمجي (اختياري) |
| `SIGNPATH_ORGANIZATION_ID` | معرف منظمة التوقيع (اختياري) |

> 🔒 لا يقرأ البناء أي مفتاح لخادم الذكاء الاصطناعي (Modal) — التوثيق عبر JWT المستخدم فقط.

</details>

---

## 🏗️ المعمارية

```
Grido Studio
├── main.go / app.go           # Wails entry point + bindings
├── internal/
│   ├── core/domain/           # الكيانات وواجهات الـ repository
│   ├── repository/            # Persistence (SQLite via GORM)
│   ├── service/               # منطق الأعمال (License, Print, AI, Backup, Updater)
│   ├── handlers/              # واجهة Wails المعرّضة للـ Frontend
│   └── utils/                 # Crypto, Logger, Device, Browser
├── frontend/
│   ├── src/
│   │   ├── components/editor/ # مكونات المحرر (Konva, Properties, Toolbar)
│   │   ├── components/ui/     # مكونات UI (shadcn/ui + Radix)
│   │   ├── hooks/             # Custom hooks (autosave, bg-removal, AI enhance)
│   │   ├── lib/store/         # Zustand store — 7 slices
│   │   └── lib/templates/     # قوالب الصور والكولاج
│   ├── test/                  # اختبارات Vitest (84 ملف اختبار — العدد المرجعي في docs/DOCUMENTATION_MAP.md)
│   └── e2e/                   # اختبارات Playwright (25 ملف مواصفة / 165 حالة)
├── supabase/                  # Edge functions + SQL migrations
├── modal_ai/                  # خادم Modal AI (CodeFormer + Real-ESRGAN)
├── admin-web/                 # صفحة هبوط + لوحة تحكم (React + Netlify)
├── build/                     # إعدادات NSIS و manifest ويندوز
├── scripts/                   # سكربتات المستودع (بوابة التوثيق، إعداد خطافات Git)
└── .agents/                   # القواعد الحاكمة للوكلاء + المهارات (SKILL.md)
```

لتفاصيل أعمق: [docs/developer_guide.md](docs/developer_guide.md) · خريطة التوثيق الإلزامية: [docs/DOCUMENTATION_MAP.md](docs/DOCUMENTATION_MAP.md)

---

## 🧠 استراتيجية الذكاء الاصطناعي

### عزل الخلفية (Background Removal)

- النموذج: `selfie_multiclass.tflite` عبر `@mediapipe/tasks-vision` داخل Web Worker حقيقي مع إلغاء قسري فوري.
- التحميل عند أول استخدام (~16MB) ثم يُخزن محلياً للعمل أوفلاين.
- تصغير الصور إلى 1024px قبل الاستدلال، ثم تكبير القناع للأبعاد الأصلية.

### تحسين الصور (AI Enhancement)

- **CodeFormer** لترميم الوجوه + **Real-ESRGAN x2plus** لترقية الخلفية، على GPU L4 عبر خادم Modal AI serverless ([modal_ai/upscaler.py](modal_ai/upscaler.py)).
- معالجة CLAHE مسبقة للوجوه + FP16 autocast لسرعة أعلى وذاكرة أقل.
- الحصص اليومية تُفرض خادمياً من خطة المستخدم: **free: 5 / pro: 15 / enterprise: 50** طلباً يومياً (Supabase RPC).

---

## 🧪 الاختبارات

```bash
# Go Backend
go test ./internal/...

# Frontend
cd frontend
npm run test            # Vitest
npm run test:coverage   # مع تقرير التغطية
npm run test:e2e        # Playwright (محلياً chromium + firefox، وفي CI chromium فقط)
npm run typecheck       # فحص الأنواع
npm run lint            # ESLint (صفر تحذيرات)
```

> 🤖 كل الوظائف أعلاه تعمل في CI على كل push وPR.

---

## 📚 التوثيق

| المستند | المحتوى |
|---|---|
| [docs/DOCUMENTATION_MAP.md](docs/DOCUMENTATION_MAP.md) | **خريطة التوثيق الإلزامية:** الجرد، مصفوفة المزامنة، الأرقام المرجعية، وبوابات ما قبل العمل/الكومت/الدفع |
| [docs/developer_guide.md](docs/developer_guide.md) | المعمارية التفصيلية ودورة الحالة ومحرك الكانفس والبناء |
| [docs/testing_guide.md](docs/testing_guide.md) | هرم الاختبارات وجسر Wails v3 والأوامر والأرقام المرجعية |
| [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) | مسار الذكاء الاصطناعي (Modal + Supabase) والحصص والتوثيق |
| [docs/features-tracker.md](docs/features-tracker.md) | حالة الميزات والفجوات المتبقية وسجل الجلسات |
| [docs/reviews/](docs/reviews/) | تقارير التدقيق المؤرَّخة ومتابعة إصلاح بنودها |

> 🔒 **بوابة التوثيق مُلزمة:** أي تعديل كود بلا تحديث توثيق مرافق يُوقف الكومت والدفع — `node scripts/docs-gate.mjs` (التفاصيل: `.agents/skills/grido-docs-sync-guard/SKILL.md`).

---

## 📜 الترخيص وسجل التغييرات

- الترخيص: [LICENSE](LICENSE) (MIT)
- سجل التغييرات: [CHANGELOG.md](CHANGELOG.md)
