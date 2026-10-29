---
type: feat
scope: ai
related_files:
  - modal_ai/upscaler.py:1
  - docs/AI_ARCHITECTURE.md:10
---

### ملخص التغيير
- تحويل خادم Modal السحابي إلى بوابة تنسيق خفيفة (CPU Orchestrator Gateway) دون الحاجة لبطاقات بنكية أو كروت L4 مقيدة.
- تفويض استدلال نماذج ترميم الوجوه الفائقة (CodeFormer + Real-ESRGAN) لكرت Nvidia GPU على Hugging Face ZeroGPU موثقاً عبر `HF_TOKEN`.
- الحفاظ التام بنسبة 100% على توثيق Supabase JWT، وقفل الحصص الذرية عبر دالة RPC، وقناة ألفا للقص والتفريغ الشفاف.
