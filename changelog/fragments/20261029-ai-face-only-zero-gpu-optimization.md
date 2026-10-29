---
type: perf
scope: ai
related_files:
  - modal_ai/upscaler.py:228
---

### ملخص التغيير
- توجيه استدلال النموذج للتركيز على ترميم وتكبير الوجه فقط (`background_enhance=False`) لتوفير استهلاك الـ GPU ومضاعفة عدد الصور المتاحة.
- إضافة ارتداد تلقائي ذكي (Automatic Public Pool Fallback) عند استنفاد كوتا التوكن الموثق لمنع أي انقطاع في الخدمة.
