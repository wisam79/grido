---
name: opencv-mediapipe-ai-tuner
description: دليل مهارة ضبط وتكامل خوارزميات الذكاء الاصطناعي وترميم صور الهوية في Grido Studio (CodeFormer + Real-ESRGAN + MediaPipe)
---

# 🤖 مهارة معالجة وتعديل صور الهوية بالذكاء الاصطناعي (AI & Face Restoration Tuner)

استخدم هذه المهارة لإدارة وضبط خوارزميات الذكاء الاصطناعي المحلية والسحابية الخاصة بـ Grido Studio.

---

## 🎭 1. مسار المعالجة المزدوج لصور الهوية (Dual-Pipeline Protocol)

عند ترميم وتحسين صور الهوية، اتبع هذا المسار المزدوج لضمان أعلى جودة بدون استنزاف ذاكرة الـ GPU:

1. **استعادة الوجه (Face Restoration):**
   - استخدام نموذج `CodeFormer` مع تثبيت المعامل `w=0.85` وتعطيل التنعيم الكارتوني (`adain=False`) للحفاظ على ملامح الوجه الأصلية وملمس الجلد الحقيقي.
   - تخصيص نسبة الدمج بـ **65% وجه مرمم + 35% وجه أصلي** لإعادة ملمس الجلد الطبيعي ومسام البشرة ومنع التأثير الشمعي.
2. **رفع دقة الخلفية (Background Upscaling):**
   - استخدام `Real-ESRGAN x2` (`outscale=2`) مع تفعيل `torch.autocast(device_type='cuda', dtype=torch.float16)` لتخفيف الضغط على ذاكرة VRAM وتسريع المعالجة.

---

## 💡 2. المعالجة المسبقة للإضاءة بـ OpenCV CLAHE

قبل تمرير أي وجه مستخرج إلى CodeFormer:
- طبق خوارزمية **Contrast Limited Adaptive Histogram Equalization (CLAHE)** من مكتبة OpenCV بمعامل هادئ:
  ```python
  clahe = cv2.createCLAHE(clipLimit=1.0, tileGridSize=(8, 8))
  lab = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2LAB)
  l, a, b = cv2.split(lab)
  cl = clahe.apply(l)
  limg = cv2.merge((cl, a, b))
  fixed_cropped_face = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
  ```
- الهدف: إزالة الظلال القوية الناتجة عن إضاءة الاستوديو غير المتوازنة وتوحيد درجة لون البشرة دون خلق تباين اصطناعي حاد على العينين والحواجب.

---

## ⚡ 3. تشغيل نماذج MediaPipe المحلية أوفلاين (Local Offline WASM)

- يتم تحميل نماذج MediaPipe (Selfie Segmenter & Face Detector) وتخزينها محلياً في `frontend/public/models/`.
- يُمنع الاتصال بـ CDN خارجي لتحميل نماذج المعالجة الحية أثناء العمل دون إنترنت.

---

## 📇 4. ماسح المستندات وتوريث نوع الوثيقة الدلالي (Document Scanner Aspect Preservation)

عند شطر أو تقسيم الكتل المرشحة لبطاقات الهوية المكدسة (Stacked Cards) في خوارزميات المسح (`splitStackedCards` في OpenCV أو محركات الكشف):
1. **توريث الحقل الدلالي إجبارياً:** يجب دائماً تمرير وتفضيل `cand.aspectType` (مثل `id_card`) للمستندات الناتجة عن التقسيم.
2. **حظر الاستدلال الهندسي المنفرد عند الشطر:** يُمنع إعادة حساب نوع الوثيقة اعتماداً على النسبة الهندسية المجردة للقص (`cand.w / cand.h`) وحدها، لأن الشطر الأفقي أو الرأسي يقلب الأبعاد العرضية والطولية مما يقود لتصنيف خاطئ كـ `custom` أو `a4_p` وتشويه نسبة التصدير بنسبة ~11%.
