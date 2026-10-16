---
type: refactor
scope: infra
related_files:
  - frontend/src/lib/store/history-snapshot.ts:25
  - frontend/src/lib/store/slices/history-slice.ts:39
  - internal/core/domain/runtime.go:10
  - internal/service/runtime_wails.go:18
  - app.go:57
---
**سجل اللقطات الموحّد (واجهة):** حقول لقطة التراجع كانت تُعدَّد يدوياً في خمسة مواضع (`HistoryCross`، الافتراضيات، الالتقاط، الاستعادة، المقارنة) — أي حقل جديد يعني خمسة تعديلات وإلا انحرفت البذرة أو المقارنة بصمت (صنف Bug#1/H4). تُعلن الآن مرة واحدة في `history-snapshot.ts` (`SNAPSHOT_KEYS` + `SNAPSHOT_FIELDS`) وتُشتق منها كل العمليات، مع قفل نوعي في `history-slice.test.ts` يمنع سقوط أي حقل من `HistoryEntry`. وبُذرت لقطة `loadProject` عبر `seedHistorySnapshot(get())` بعد التسويات فصارت تغطي الشبكة وإعدادات الطباعة وآخر صورة محررة (كانت خارج البذرة فلا يعكسها أول Undo).

**جسر الرنتايم (خلفية):** خدمات الأعمال (الترخيص/جسر الهاتف/المحدّث) كانت تستدعي `application.Get()` مباشرة — فُصلت عبر منفذ `domain.RuntimeBridge` (بث الأحداث/فتح المتصفح/الإغلاق النظيف) يجسّره `WailsRuntimeBridge` وحده، ويُحقن افتراضياً في المُنشئات ويُستبدل في الاختبارات (`SetRuntimeBridge`/`SetBrowserOpener` — nil يُتجاهل). استمرارية للقرار المحمي MAINT-06 بلا نقض: منفذ فتح المتصفح المحقون في `LicenseService` صامد، تغيّر ربطه الافتراضي فقط.
