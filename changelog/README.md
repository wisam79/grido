# Changelog — معمارية Fragments (مخصص لمطور واحد + وكيل ذكي)

> هذه المعمارية تُغني عن تعديل `CHANGELOG.md` اليدوي في كل جلسة، وتمنع هلوسة الوكيل عبر تصغير السطح القابل للخطأ.

## الفكرة

- **`CHANGELOG.md` (الجذر)** — ملف مُولَّد وحيد، يحوي **آخر 5 إصدارات + [Unreleased]** فقط (~150 سطر). **لا يعدله الوكيل يدوياً أبداً** — يُبنى تلقائياً بواسطة `scripts/release.mjs` من الـ fragments عند الترفيع.
- **`CHANGELOG_ARCHIVE.md` (الجذر)** — أرشيف تاريخي (ما قبل v1.14.6). مُلحق فقط، لا يُعاد كتابته.
- **`changelog/fragments/*.md`** — كل جلسة وكيل تُنشئ **ملفاً واحداً فقط** (5–15 سطراً) بسكيما صارمة. هذا هو «ذاكرة الوكيل» الحقيقية.

## ماذا يفعل الوكيل في كل جلسة؟

1. ينفذ الكود.
2. ينشئ fragment واحد: `changelog/fragments/YYYYMMDD-<scope>-<slug>.md` (انظر التمبلت).
3. لا يلمس `CHANGELOG.md` — البوابة تفحص وجود الـ fragment.

## ماذا يحدث عند الترفيع؟

```bash
node scripts/release.mjs patch   # يجمع كل fragments → يركب [vX.Y.Z] → يحذف fragments → يكتب CHANGELOG.md
```

ثم يُقصّ `CHANGELOG.md` تلقائياً ليبقي آخر 5 إصدارات، والباقي يُنقل إلى `CHANGELOG_ARCHIVE.md`.

## الأوامر

```bash
node scripts/changelog-collect.mjs              # ملخص التغييرات غير المُصدرة (يقرأه الوكيل عند بدء الجلسة)
node scripts/changelog-collect.mjs --json       # بصيغة JSON
node scripts/release.mjs patch --dry-run        # معاينة ما سيُجمع
node scripts/docs-gate.mjs                      # يفشل إن كان هناك كود بلا fragment مرافق
```

## لماذا أفضل من 361KB في ملف واحد؟

| قبل | بعد |
|---|---|
| الوكيل يقرأ 361KB مقطوعاً → يهلوس | يقرأ 5 أسطر بسكيما → لا يهلوس |
| يعدل `[Unreleased]` يدوياً → يكسر التنسيق | ينشئ ملفاً معزولاً → خطأه لا يكسر التاريخ |
| البحث بطيء | `git log changelog/fragments/` |

## سكيمة الـ Fragment

```yaml
---
type: fix              # feat | fix | perf | refactor | docs | security | removed
scope: print           # print | canvas | ai | build | auth | ui | docs | infra
related_files:         # ملف:سطر — دليل قابل للتحقق
  - internal/service/print_cmyk_tiff.go:42
  - frontend/src/lib/export/export-cmyk.ts:18
---
النص بالعربي — سطر أو سطران يصفان ما تغيّر ولماذا.
```

البوابة تفشل عند: `type` خارج الـ enum، `related_files` فارغ، أو عدم وجود الملف المذكور.
