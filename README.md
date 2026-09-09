<div align="center">

# Grido Studio

**استوديو الهوية — تصميم صور، كولاج، وطباعة احترافية بأدوات ذكاء اصطناعي**

تطبيق سطح مكتب لويندوز لتصميم صور الهوية، تجميع الكولاجات، وعزل الخلفية
وترميم الصور بالذكاء الاصطناعي — مع محرك طباعة عالي الدقة وأبعاد ملمية دقيقة.

**Wails v2 (Go)** × **React + TypeScript** × **Konva Canvas**

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
| **طباعة دقة عالية** | أوراق DPI مخصصة مع خطوط قص، حدود مستديرة، وأبعاد ملمية دقيقة (حتى 144 ميغابكسل) |
| **قوالب جاهزة** | هويات، جوازات سفر، تأشيرات، وكولاجات قابلة للتخصيص |
| **تراخيص سحابية** | مصادقة Supabase (بريد/OTP/Google) مع خطط مجانية واحترافية |
| **خطوط عربية** | 12 عائلة خطوط عربية مدمجة تعمل أوفلاين (woff2) |

---

## 📋 المتطلبات

| الأداة | الإصدار |
|---|---|
| [Go](https://go.dev/dl/) | 1.25+ |
| [Node.js](https://nodejs.org/) | 22+ |
| [Wails CLI](https://wails.io/) | v2.12 |
| NSIS | للبناء على ويندوز فقط |

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

---

## 🚀 التطوير

```bash
# 1. انسخ متغيرات البيئة واملأ القيم
cp .env.example .env

# 2. شغّل وضع التطوير مع Hot Reload
wails dev
```

<details>
<summary><b>متغيرات البيئة (ملف <code>.env</code>)</b></summary>

| المتغير | الوصف |
|---|---|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_ANON_KEY` | مفتاح Supabase العام |
| `MODAL_AI_KEY` | مفتاح مصادقة Modal AI |

> 🔒 المفاتيح لا تُدمج في الكود — تُحقن عبر ldflags عند البناء أو تُقرأ من ملف `.env` المحلي (مستثنى من Git).

</details>

---

## 🛠️ البناء

```bash
# بناء محلي موقّع (يقرأ .env تلقائياً)
./build.ps1

# أو مباشرة
wails build
```

<details>
<summary><b>البناء التلقائي عبر GitHub Actions</b></summary>

يُبنى التطبيق ويُصدَّر كإصدار آلياً عند إضافة Tag بصيغة `v*`.
المتغيرات المطلوبة في **Repository Secrets**:

| Secret | الوصف |
|---|---|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_ANON_KEY` | مفتاح Supabase العام |
| `MODAL_AI_KEY` | مفتاح مصادقة Modal AI |
| `SIGNPATH_API_TOKEN` | توقيع برمجي (اختياري) |
| `SIGNPATH_ORGANIZATION_ID` | معرف منظمة التوقيع (اختياري) |

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
│   ├── test/                  # اختبارات Vitest (55 ملفاً)
│   └── e2e/                   # اختبارات Playwright
├── supabase/                  # Edge functions + SQL migrations
├── modal_ai/                  # خادم Modal AI (CodeFormer + Real-ESRGAN)
├── admin-web/                 # صفحة هبوط + لوحة تحكم (React + Netlify)
└── build/                     # إعدادات NSIS و manifest ويندوز
```

لتفاصيل أعمق: [docs/developer_guide.md](docs/developer_guide.md)

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
npm run test:e2e        # Playwright (chromium + firefox)
npm run typecheck       # فحص الأنواع
npm run lint            # ESLint (صفر تحذيرات)
```

> 🤖 كل الوظائف أعلاه تعمل في CI على كل push وPR.

---

## 📜 الترخيص وسجل التغييرات

- الترخيص: [LICENSE](LICENSE) (MIT)
- سجل التغييرات: [CHANGELOG.md](CHANGELOG.md)
