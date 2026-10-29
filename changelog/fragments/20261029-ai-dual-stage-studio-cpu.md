---
type: feat
scope: ai
related_files:
  - modal_ai/upscaler.py:137
  - modal_ai/test_upscaler.py:23
  - modal_ai/benchmark_upscaler.py:14
  - frontend/src/lib/ai/ai-result-commit.ts:59
  - frontend/src/hooks/use-ai-enhance.ts:375
  - docs/AI_ARCHITECTURE.md:7
---
ترقية الاستوديو إلى تكبير كامل الصورة 2x بنموذج Real-ESRGAN compact ONNX وترميم الوجه بـ CodeFormer على CPU، مع إسقاط هندسي مطابق وPNG يحفظ Alpha وJPEG بجودة 98 وحجز واحد للمرحلتين.
حفظ تأطير الكولاج عند اختلاف مقاس النتيجة، وإضافة اختبارات هندسة/حصص وقياس حقيقي لكل مرحلة؛ الأداء المقاس موثق بلا ضمان زمني شامل أو نشر سحابي.
