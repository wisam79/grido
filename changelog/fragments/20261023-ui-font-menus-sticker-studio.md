---
type: refactor
scope: ui
related_files:
  - frontend/src/components/ui/font-selector.tsx:41
  - frontend/src/components/editor/properties/panels/text/text-font-selector.tsx:15
  - frontend/src/features/stickers/components/sticker-font-selector.tsx:11
  - frontend/src/lib/io/fonts.ts:19
  - frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:74
  - frontend/src/features/stickers/components/sticker-properties.tsx:194
  - frontend/src/features/stickers/components/sticker-studio-dialog.tsx:603
  - frontend/src/features/stickers/components/sticker-preview.tsx:349
  - frontend/src/components/editor/properties/element-properties.tsx:65
  - frontend/src/components/editor/panels/properties-panel.tsx:178
  - frontend/src/components/editor/properties/panels/text-properties.tsx:74
  - frontend/test/font-selector.test.tsx:54
  - frontend/test/setup.ts:9
---
وُحِّد منتقي الخطوط في مكوّن واحد `FontSelector` بلا تصنيفات ولا أشرطة فلاتر: قائمة مسطّحة بصفوف 32px وبحث عربي/لاتيني وتنقّل بلوحة المفاتيح ومفضّلة داخل الصف، واستُبدلت به نسختا منتقي النص والملصق. وتحوّلت قوائم الوزن والحجم وارتفاع السطر والتباعد من `<select>` أصلي إلى `Select` بـ Radix بتنسيق Fluent موحّد.

كذلك أُزيل تكرار استوديو الملصقات (اسم القالب مرة واحدة في ترويسة الحوار، والمقاس مرة واحدة في مسرح المعاينة، والقيم اللونية في التلميحات لا في التخطيط) وانتقل زر «استعادة الافتراضي» إلى شريط العنوان، وحُذفت أيقونات شرائط التبويبات الأربع كلها (خصائص العنصر · الورقة/الكولاج · تبويبات النص · استوديو الملصقات) التزاماً بقاعدة «صفر حشو بصري».
