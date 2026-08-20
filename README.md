# Grido Studio (استوديو قريدو)

استوديو ذكي لتصميم الصور وتجميعها (Collage) مدمج بأدوات ذكاء اصطناعي وأدوات طباعة عالية الدقة وتعديل متطور للمظهر والشبكات الإرشادية.

تطبيق سطح مكتب (Desktop App) مبني باستخدام **Wails v2** (Go backend + React/TypeScript frontend) ومُحسّن للأداء مع Konva للرسم على Canvas.

---

## ✨ الميزات الرئيسية

- **محرر كولاج وتعديل حر:** وضعان للعمل — كولاج بخانات ثابتة أو تصميم حر مع عناصر (صور، نصوص، أشكال).
- **عزل خلفية بالذكاء الاصطناعي:** نموذج `selfie_multiclass` عبر MediaPipe في Web Worker (يعمل أوفلاين بعد أول تحميل، مع إلغاء فوري).
- **ترميم وتحسين الصور:** خط أنابيب مزدوج (CodeFormer للوجوه + Real-ESRGAN للخلفية) عبر Modal AI على GPU.
- **طباعة عالية الدقة:** توليد أوراق طباعة DPI مخصصة مع خطوط قطع وحدود وأبعاد ملمية دقيقة.
- **قوالب جاهزة:** قوالب هويات، جوازات سفر، تأشيرات، وكولاجات قابلة للتخصيص.
- **تراخيص وسحابة:** مصادقة Supabase (بريد/OTP/Google) مع خطط مجانية واحترافية.
- **خطوط عربية أوفلاين:** 12 عائلة خطوط مدمجة (woff2).

---

## 📋 المتطلبات (Prerequisites)

| الأداة | الإصدار |
|---|---|
| Go | 1.25+ |
| Node.js | 20+ |
| Wails CLI | v2.12+ |
| NSIS | (للبناء على Windows) |

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

---

## 🚀 التطوير (Live Development)

```bash
# انسخ .env.example إلى .env واملأ القيم
cp .env.example .env

# تشغيل وضع التطوير مع Hot Reload
wails dev
```

### متغيرات البيئة المطلوبة (.env)
| المتغير | الوصف |
|---|---|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_ANON_KEY` | مفتاح Supabase العام |
| `GRIDO_AI_SECRET_KEY` | مفتاح مصادقة Modal AI |

> **تنبيه أمني:** لا تُدمج المفاتيح في الكود. يتم حقنها عبر ldflags عند البناء أو من ملف `.env` المحلي.

---

## 🛠️ بناء التطبيق (Building)

```bash
# البناء المحلي (يتطلب .env بقيم صحيحة)
./build.ps1

# أو البناء المباشر
wails build
```

### البناء التلقائي عبر GitHub Actions (CI/CD)

يتم بناء التطبيق وتصدير الإصدارات آلياً عند إضافة Tag جديد (`v*`). المتغيرات المطلوبة في **GitHub Repository Secrets**:

| Secret | الوصف |
|---|---|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_ANON_KEY` | مفتاح الواجهة البرمجية العام لـ Supabase |
| `GRIDO_AI_SECRET_KEY` | مفتاح مصادقة خادم الذكاء الاصطناعي (Modal AI) |
| `WINDOWS_CERTIFICATE_BASE64` | (اختياري) لتوقيع البرنامج برمجياً |
| `WINDOWS_CERTIFICATE_PASSWORD` | (اختياري) كلمة مرور شهادة التوقيع |

---

## 🏗️ المعمارية (Architecture)

```
Grido Studio
├── main.go / app.go          # Wails entry point + bindings
├── internal/
│   ├── core/domain/          # الكيانات وواجهات الـ repository
│   ├── repository/           # طبقة Persistence (SQLite via GORM)
│   ├── service/              # منطق الأعمال (License, Print, Backup, Updater)
│   ├── handlers/             # واجهة Wails المعرّضة للـ Frontend
│   └── utils/                # أدوات مساعدة (Crypto, Logger, Device, Browser)
├── frontend/
│   ├── src/
│   │   ├── components/editor/  # مكونات المحرر (Konva, Properties, Toolbar)
│   │   ├── components/ui/      # مكونات UI (shadcn/ui + Radix)
│   │   ├── hooks/              # Custom hooks (autosave, bg-removal, AI enhance)
│   │   ├── lib/store/          # Zustand store مع slices (7 slices)
│   │   └── lib/templates/      # قوالب الصور والكولاج
│   └── test/ + e2e/            # اختبارات Vitest + Playwright
├── supabase/                  # Edge functions + SQL migrations
├── modal_ai/                  # Modal AI upscaler (CodeFormer + Real-ESRGAN)
├── admin-web/                 # صفحة هبوط + لوحة تحكم (React + Netlify)
└── build/                     # إعدادات البناء (NSIS, Windows manifest)
```

لتفاصيل أعمق، راجع `docs/developer_guide.md`.

---

## 🧠 استراتيجية الذكاء الاصطناعي

### عزل الخلفية (Background Removal)
- النموذج: **selfie_multiclass.tflite** عبر `@mediapipe/tasks-vision` داخل Web Worker حقيقي (إلغاء قسري فوري).
- التحميل: عند أول استخدام (~16MB)، ثم يُخزن محلياً للعمل أوفلاين.
- حماية الذاكرة: تصغير الصور لـ 1024px قبل الاستدلال، ثم تكبير القناع للأبعاد الأصلية.

### تحسين الصور (AI Enhancement)
- النموذج: **CodeFormer** (ترميم الوجوه) + **Real-ESRGAN x2** (ترقية الخلفية) على GPU A10G.
- المعالجة: CLAHE pre-processing على الوجوه، FP16 autocast.
- النشر: خادم Modal AI serverless (`modal_ai/upscaler.py`).
- الحصص: حدود يومية تُشتق خادمياً من خطة المستخدم (free: 5، pro: 15، enterprise: 50) عبر Supabase RPC.

---

## 🧪 الاختبارات (Testing)

### Go Backend
```bash
go test -v ./internal/...
```

### Frontend
```bash
cd frontend
npm run test          # اختبارات الوحدة (Vitest)
npm run test:coverage  # مع التغطية
npm run test:e2e       # اختبارات Playwright (chromium + firefox)
npm run typecheck      # فحص توافق الأنواع
npm run lint           # ESLint (--max-warnings 250)
```

---

## 📜 الترخيص (License)

راجع ملف [LICENSE](./LICENSE) (MIT).

---

## 📝 سجل التغييرات (Changelog)

راجع ملف [CHANGELOG.md](./CHANGELOG.md).
