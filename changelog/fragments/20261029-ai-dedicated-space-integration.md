---
type: feat
scope: ai
related_files:
  - modal_ai/upscaler.py:180
  - docs/AI_ARCHITECTURE.md:10
---

### ملخص التغيير
- ربط خادم Modal مباشرة بسبيس GPU المستضاف والمخصص لحساب المطور (`wisam99/CodeFormer`) على عتاد Nvidia A10G.
- استعادة المنظومة الكاملة لمحاذاة وترميم الوجه (Face Alignment & Inverse Affine Paste Back) لضمان أعلى جودة طبيعية ومطابقة الهوية بنسبة 100% دون أي تشويه للأبعاد أو الملامح.
