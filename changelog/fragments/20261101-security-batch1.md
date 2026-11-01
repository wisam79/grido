---
type: security
scope: infra
related_files:
  - .github/workflows/deploy-pages.yml:43
  - admin-web/src/pages/PhoneCameraPage.tsx:19
  - .github/workflows/ci.yml:328
  - .agents/mcp_config.json:4
---
الدفعة الأمنية الأولى بعد التدقيق الشامل: إغلاق سقوط مفتاح anon المخبوز في صفحة كاميرا الهاتف — القيم تُخبز وقت بناء GitHub Pages من أسرار المستودع القائمة نفسها مع شاشة «إعداد ناقص» صريحة عند غيابها؛ بوابة govulncheck (v1.1.4 مخزّنة بنمط staticcheck) لمسار Go وnpm audit بحفز high لمشروعَي frontend وadmin-web تفشل البناء عند أي ثغرة عالية؛ تحديث خادم MCP للتحقق الحي من الحزمة الرسمية لـ Supabase بأقل امتياز (خاصية database). البوابة الجديدة أمسكت ثغرتي سلسلة الأدوات GO-2026-6809 وGO-2026-6617 فور أول تشغيل ورفعت Go إلى 1.26.10 في CI وRelease. تفاصيل الإغلاق وإجراءات المالك في SECURITY_NOTICE.md (2026-11-01).
