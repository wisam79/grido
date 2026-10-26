---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/canvas/collage-geometry.ts:55
  - frontend/src/lib/store/slices/collage-slice.ts:805
  - frontend/src/components/editor/properties/slot-properties.tsx:115
  - frontend/src/components/editor/properties/collage-settings.tsx:71
  - frontend/src/lib/schema.ts:166
  - frontend/src/hooks/use-workspace-panels.ts:160
  - frontend/src/components/ui/blocks/fluent-section.tsx:140
  - frontend/src/components/editor/properties/layers-list.tsx:821
---

إصلاح أبعاد وهندسة خلايا الكولاج وتجربة التحرير: تقييد فواصل وهوامش الكولاج اليدوي بأصغر خلية لمنع الأبعاد السالبة وحماية مستطيل الخلية بـ `Math.max(0)`، واستخدام `getEffectiveDpi` لمطابقة القياسات الفيزيائية بدقة، ومزامنة مسودات المقاسات في `SlotSizeFields` أثناء الرندر لمنع القيم القديمة عند تغيير الورق أو DPI، وتثبيت مفتاح المكون بـ `key={slot.id}` لمنع فقدان تركيز لوحة المفاتيح عند التنقل بين الحقول، وتصحيح حدود منزلقات المسافات بالمليمتر، وتأمين فضاء الألوان `colorSpace` في `PrintSettingsSchema`، وتبسيط وتحديث لوحة خصائص الخلية وتقصير تسميات الأزرار وفق حارس تقليل النصوص، وتصحيح اتجاه سهم الطي والفتح (Chevron) في نظام RTL ليتجه لليسار (`<`) عند الطي في `FluentSection` و`layers-list`.
