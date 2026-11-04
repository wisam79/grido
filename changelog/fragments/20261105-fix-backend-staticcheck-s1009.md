---
type: fix
scope: infra
related_files:
  - internal/service/backup_service.go:36
---
إصلاح تحذير staticcheck S1009 في كاتب النسخ الاحتياطي المتدفق: `len(nil)==0` يغطي حالة nil أصلاً فأُسقط فحص الـnil المكرر من الشرط الخارجي، مع إبقاء الفحص الداخلي الذي يفصل ترميز "null" التاريخي عن "[]" للتوافق البايتي (التقاطه CI؛ staticcheck v0.8.2 نظيف محلياً على كامل الحزم).
