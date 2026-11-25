---
type: refactor
scope: infra
related_files:
  - frontend/src/lib/abort.ts:1
  - frontend/src/lib/workspace-events.ts:1
  - frontend/src/lib/export/export-bleed.ts:6
  - frontend/src/lib/filters/custom-filters.ts:60
  - frontend/src/components/editor/properties/panels/text/text-controls.tsx:12
  - frontend/src/features/stickers/lib/field-builders.ts:1
  - frontend/src/features/stickers/lib/randomize-params.ts:1
  - frontend/src/features/stickers/lib/sticker-text.ts:1
  - frontend/src/features/stickers/templates/svg-elements.ts:196
  - frontend/src/features/stickers/templates/business_cards.ts:1
  - frontend/src/hooks/use-canvas-zoom.ts:20
  - internal/service/scanner_warp_filters.go:55
  - internal/service/print_compose.go:99
---
توحيد أدوات الإلغاء (abortError/throwIfAborted/isAbortError) في `lib/abort.ts` بدل أربع نسخ محلية،
واستبدال كل نسخ `FOCUS_RING` و`clamp` المحلية بالتوكنات المشتركة، وتجميع قراءة خصائص عقد Konva في قارئ واحد.
أسماء 28 حدث نافذة (`grido:*`) انتقلت إلى `lib/workspace-events.ts` بعد أن كانت 145 نصاً صريحاً في 21 ملفاً،
مع إبقاء الوحدات التي تُطلق الحدث تصدّره باسمها الدلالي (`RESET_CANVAS_PAN_EVENT` وغيره) — لا تعقيد إضافي: كل الأسماء
البديلة الخمسة مستهلكة فعلياً، وكل مفاتيح الخريطة الـ28 لها مستخدم.
في قوالب الملصقات: لوحة الأيقونة المكرّرة ثلاث مرات صارت `badgePlateMarkup` في `svg-elements.ts`،
ومُنشئات الحقول صارت `textField`/`selectField`، وذيل التوزيع العشوائي (حقول ثم لوحة لونية) صار
`randomizeSurfaceParams` مع الحفاظ على ترتيب نداءات `Math.random` وترتيب مفاتيح الكائنات.
في Go حُذفت `jsRoundF` المطابقة لـ`jsRound` وأصبح `25.4` ثابتاً واحداً (`mmPerInch`).
بلا أي تغيير في الوظائف أو الميزات أو الشكل النهائي: 210 قوالب أُعيد توليد SVG لها قبل/بعد وقوبلت بالبصمة (متطابقة).
