---
type: docs
scope: docs
related_files:
  - .agents/skills/radix-ui-accessibility-ux/SKILL.md:92
  - .agents/skills/konva-text-typography-fx/SKILL.md:60
  - .agents/skills/grido-qa-security-auditor/SKILL.md:63
---

توثيق الدروس المستفادة من فحص واختبارات نصوص الكانفاس والـ CI السحابي:
1. معيار تحرير قفل المؤشر (`pointer-events: none`) عند إغلاق قوائم Radix Select قبل إرسال نقرات أو سحب على الكانفاس في Playwright E2E.
2. توثيق ثابت سقف عرض النص التلقائي (`AUTO_TEXT_MAX_WIDTH_RATIO = 0.95`) وتأثيره على قياسات الأسطر في الاختبارات.
3. بروتوكول إعادة تشغيل المهام الفاشلة المعزولة (`gh run rerun --failed`) عند تعليق خطوة شبكة عابرة دون إلغاء بقية مهام الـ CI.
