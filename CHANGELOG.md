# Changelog — Grido Studio

> **معمارية Fragments (2026-10-14):** هذا الملف مُولَّد تلقائياً — آخر 5 إصدارات + [Unreleased] فقط. لا يُعدَّل يدوياً أبداً.
> الأرشيف التاريخي (ما قبل v1.14.6): [`CHANGELOG_ARCHIVE.md`](CHANGELOG_ARCHIVE.md) — كل جلسة وكيل تُنشئ fragment واحد في `changelog/fragments/` والترفيع يجمعها هنا عبر `scripts/release.mjs`. المرجع: [`changelog/README.md`](changelog/README.md).

All notable changes to Grido Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **تصحيح توثيقي (سبتمبر 2026 — مثبت من الكود):** إدخال `v1.2.11` ادعى أن `build.ps1` يفشل عند غياب `MODAL_AI_KEY`، لكن `build.ps1` يبني بمفتاح فارغ دون فشل. يُترك الإدخال الأصلي لسجل التاريخ. **تحديث 2026-09-25:** أُزيلت آلية `MODAL_AI_KEY` من البناء والكود بالكامل (تدقيق `C-02`) — لم يعد للموضوع وجود.

## [Unreleased]

## [v1.31.1] - 2026-11-05

### Fixed
- import missing useEffect hook in workspace panel rail
## [v1.31.0] - 2026-11-05

### Added
- make default collage state for new projects a single top-left cell of civil id dimensions
- transform tool launcher into a direct-access floating command palette with dedicated top toolbar trigger
- promote freeform collage to top-level rail section, streamline presets to user-saved only, and relocate launcher and zen controls

### Fixed
- handle escape key to dismiss floating command palette modal and adjust e2e assertions
- enlarge rows and columns counter buttons and typography for effortless clicking
- soften vector shape glyph contrast and adjust thumbnail dimensions for visual comfort
- sync e2e and unit tests with promoted freeform rail, bottom quick bar zen toggle, toolbar launcher, and user-saved presets
## [v1.30.2] - 2026-11-05

### Fixed
- verification patch for silent background update flow
## [v1.30.1] - 2026-11-05

### Fixed
- allow checksum-verified updates without requiring pinned Ed25519 public key
## [v1.30.0] - 2026-11-05

### Added
- تحديث قواعد الوكلاء وخطافات الأمان للسماح بتشغيل الاختبارات المستهدفة الفردية محلياً (`npx --prefix frontend vitest run --root frontend <path>` أو `go test -run <Name> ./...`) مع الحفاظ التام على حظر الحزم الشاملة الثقيلة واختبارات E2E لحماية موارد الجهاز.
- إعادة تصميم شاشة التهيئة بشعار SVG مورّد من المالك، مع رسم متتابع لزوايا الإطار وتجميع الأجزاء بإزاحة ودوران قصيرين ولمعة مقصوصة داخل الشعار ومؤشر انتظار ثنائي النبضة؛ دعم المظهرين وتقليل الحركة وحالة وصولية واحدة، دون صورة نقطية أو مكتبة حركة جديدة.
ربط اختفاء الشاشة بنتيجة فحص الترخيص لا بمهلة الأربع ثواني؛ تنبيه للتأخر وإعادة محاولة محروسة عند الفشل التقني مع إغلاق آمن، وتمييز النتيجة القديمة عن الحالية وملكية طلب واحدة، مع الحفاظ على سياسة العمل دون اتصال؛ اختبارات الإقلاع والترخيص المستهدفة تغطي التأخر والأخطاء وسباقات الجلسة.

### Fixed
- إعادة صقل وتوحيد قائمة الإعدادات (RailSettingsMenu) وفق لغة Fluent 2: بطاقة ملف تعريفي أنيقة للمستخدم، استبدال الرموز النصية بأيقونات فوسفور متناسقة، تصحيح اتجاه كبسولات الاختصارات LTR عبر FluentKbd، وإزالة البقع الخضراء الزائدة من أيقونة الكولاج وأيقونة الترس في الشريط الجانبي. بالإضافة إلى مزامنة أبعاد خطوط الإرشاد فورياً أثناء الزوم واستعادة اللون الأبيض المحايد للمنـزلق، واستعادة كلاسات أبعاد أزرار شريط الأدوات ومطابقة عناوين الملصقات ورفع مهلة اختبار المحرر الحر لضمان اجتياز CI.
- إصلاح سباق فحص الترخيص وشاشة التهيئة (Splash Screen): انتظار التحقق من الترخيص والجلسة تحت حماية شاشة التهيئة قبل إخفائها بمهلة أمان، لمنع وميض الشاشة وظهور نافذة إدارة الحساب خطأً أمام المستخدمين المرخصين أثناء الإقلاع.
- صقل شكلي للواجهة: تسميات وحقول أوضح، تباين أفضل للأزرار التعبوية، ومعاينات ملصقات وأشكال أكبر بأسطح محايدة وإطارات أقل. تبسيط حوار التصدير وجمع النزيف والقص مع الحفاظ على التحذيرات ومنطق التطبيق والبيانات.
توحيد طرفي شريط الأدوات: إدراج منقسم بحد مشترك، وأيقونات مشاريع وتراجع وإعادة متناسقة مع الحفظ والتصدير والطباعة؛ مقاس موحد 32×32 للأزرار الأيقونية، وخانة «المزيد» بمحاذاة عرض وحدّ الشريط الجانبي، دون تغيير الأوامر أو الاختصارات.
تحسين لوح إعدادات الورقة: تسميات عربية للعرض والارتفاع، حقول وحدود أوضح، وفصل هادئ بين المقاس والخلفية؛ تبسيط الشبكة والأعمدة والقص وإخراج التسميات فوق الحقول مع الحفاظ على القيم والتحويلات ومنتقي الألوان.
إبقاء خطاف ما قبل الالتزام فعالاً باستدعاء lint-staged المحلي مع `--cwd frontend` بدلاً من تغيير مجلد الصدفة، دون تجاوز ESLint أو Prettier.
- صقل تبويبات الشريط الجانبي في وضعي الكولاج والتعديل الحر: معاينات قوالب أكبر وأوضح، مدخل مختصر للمحرر الحر يعرض التخطيط المطبّق بدلاً من رسم افتراضي، وتعبئة مضغوطة بخانات فارغة واضحة ودليل حالات شرطي.
فصل النزيف وشكل القص مع خيارات مرئية وتجميع عداد النسخ، وفي الوضع الحر صارت صفوف النصوص معاينات مطبعية حقيقية (خط ووزن كل نمط، قوس للختم، وخلفية للشارة والتاريخ) بأسطح محايدة للأشكال والملصقات وشريط أدوات طبقات مسطّح، مع إبقاء المعالجات والتحذيرات وحدود الاستيراد والطباعة دون تغيير وإضافة حالات انحدار داخل الاختبارات القائمة.
