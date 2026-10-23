---
type: fix
scope: canvas
related_files:
  - frontend/src/features/stickers/lib/sticker-font-embed.ts:25
  - frontend/test/sticker-studio.test.tsx:203
---

إصلاح استخراج قواعد `@font-face` من `ownerNode.textContent` في بيئة JSDOM داخل `sticker-font-embed.ts` لتفادي تجريد خواص `src` و`unicode-range` من قِبل `cssstyle`، واستخدام `findAllByTitle` في اختبارات الإدراج السريع لتفادي مطابقة عدة عناصر تحمل نفس العنوان.
