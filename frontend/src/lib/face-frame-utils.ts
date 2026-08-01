/**
 * face-frame-utils.ts — محرك قرار المصور الخبير لتأطير صور الهوية (Human-Expert Photography Engine)
 *
 * يعتمد المعايرة الأنثروبومترية المتقدمة مع الربط الدقيق بنسبة أبعاد الصورة المصدر (imageAspectRatio = origW / origH):
 * 1. الربط المطلق بين نسبة أبعاد الصورة المصدر ونسبة الخلية الهدف (Image Aspect Ratio Parity):
 *    يضمن أن الناتج المقصوص يملك نسبة أبعاد بكسلية تدمج وتطابق الخلية الهدف 100% بدون أي قص أو تقليص ثانوي في Konva.
 * 2. إدراك ميلان وتحديق الرأس بالثلاثية الأبعاد (3D Head Pitch & Roll Compensation):
 *    يتحقق من زوايا النظر (التحديق للأعلى/الأسفل والميل الجانبي في الفضاء الفيزيائي) ويعدّل خط العينين تلقائياً.
 * 3. التمييز الذكي بين حجم الجمجمة الأنثروبومتري وحجم الشعر/الغطاء العالي (Hair Volume Disambiguation):
 *    يضمن حماية مسافة الأمان العلوية (Headroom) من أي اقتطاع بكسلي ثانوي.
 * 4. التوازن البصري لحجم الكتفين وياقة الملابس (Collar & Shoulder Visual Balance).
 */

export interface DetailedFaceBox {
  /** نقطة منتصف العينين — normalized x */
  eyeCenterX: number;
  /** نقطة منتصف العينين — normalized y */
  eyeCenterY: number;
  /** زاوية الميلان الجانبي (Roll Angle θ) بالراديان */
  rollAngle: number;
  /** زاوية التحديق/الإمالة للأعلى والأسفل (Pitch Angle φ) بالراديان */
  pitchAngle: number;
  /** ارتفاع الجمجمة الأنثروبومتري الحقيقي (Crown to Chin) — normalized */
  headHeight: number;
  /** قمة الشعر أو غطاء الرأس في نظام الإحداثيات المستقيم — normalized y */
  hairTopY: number;
  /** قمة الجمجمة الهيكلية الحقيقية — normalized y */
  skullTopY: number;
  /** نقطة الذقن في نظام الإحداثيات المستقيم — normalized y */
  chinY: number;
  /** عرض الرأس والجوانب شاملة الأذنين — normalized width */
  headWidth: number;
  /** نسبة عرض الوجه إلى طوله (Face Aspect Ratio) */
  faceAspectRatio: number;
  /** معامل حجم الشعر/الغطاء بالنسبة للجمجمة */
  hairVolumeRatio: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** نسبة موقع خط العينين المعياري الافتراضي من أعلى الإطار (38% وفق ICAO) */
export const ICAO_BASE_EYE_LEVEL = 0.38;

/** أقصى تكبير مسموح (2.5×) لحماية جودة الطباعة */
export const MAX_ZOOM = 2.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * تدوير نقطة (x, y) في الفضاء الفيزيائي المصحح بنسبة أبعاد الصورة
 */
function rotatePointPhysical(
  x: number,
  y: number,
  cx: number,
  cy: number,
  angleRad: number,
  imageAspect: number
): { x: number; y: number } {
  const physX = x * imageAspect;
  const physCx = cx * imageAspect;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = physX - physCx;
  const dy = y - cy;
  const rx = physCx + dx * cos - dy * sin;
  const ry = cy + dx * sin + dy * cos;
  return {
    x: rx / imageAspect,
    y: ry,
  };
}

/**
 * استخراج أبعاد الوجه المعيارية ونظام الإحداثيات المصحح بنسبة أبعاد الصورة المصدر (imageAspectRatio)
 */
export function faceBoxFromLandmarks(
  landmarks: Array<{ x: number; y: number; z?: number }>,
  imageAspectRatio: number = 1
): DetailedFaceBox {
  if (!landmarks || landmarks.length < 455) {
    throw new Error("بيانات وجه غير مكتملة. يلزم وجود نقاط كاشف الوجه الذكي.");
  }

  const aspect = imageAspectRatio > 0 ? imageAspectRatio : 1;

  // 1. حساب مراكز البؤبؤين والعينين
  const leftEyeX = (landmarks[33].x + landmarks[133].x + landmarks[159].x + landmarks[145].x) / 4;
  const leftEyeY = (landmarks[33].y + landmarks[133].y + landmarks[159].y + landmarks[145].y) / 4;

  const rightEyeX = (landmarks[263].x + landmarks[362].x + landmarks[386].x + landmarks[374].x) / 4;
  const rightEyeY = (landmarks[263].y + landmarks[362].y + landmarks[386].y + landmarks[374].y) / 4;

  const eyeCenterX = (leftEyeX + rightEyeX) / 2;
  const eyeCenterY = (leftEyeY + rightEyeY) / 2;

  // 2. حساب زاوية الميلان الجانبي بالاعتبار الفيزيائي لأبعاد الصورة (Roll Angle θ)
  const dxPhys = (rightEyeX - leftEyeX) * aspect;
  const dyPhys = rightEyeY - leftEyeY;
  const rollAngle = Math.atan2(dyPhys, dxPhys);

  // 3. تدوير النقاط الاستراتيجية في الفضاء الفيزيائي المصحح
  const chinRotated = rotatePointPhysical(landmarks[152].x, landmarks[152].y, eyeCenterX, eyeCenterY, -rollAngle, aspect);
  const foreheadRotated = rotatePointPhysical(landmarks[10].x, landmarks[10].y, eyeCenterX, eyeCenterY, -rollAngle, aspect);
  const leftCheekRotated = rotatePointPhysical(landmarks[234].x, landmarks[234].y, eyeCenterX, eyeCenterY, -rollAngle, aspect);
  const rightCheekRotated = rotatePointPhysical(landmarks[454].x, landmarks[454].y, eyeCenterX, eyeCenterY, -rollAngle, aspect);

  // 4. تقدير زاوية التحديق للأعلى/الأسفل (3D Pitch Angle φ)
  const noseBridgeZ = landmarks[6]?.z ?? 0;
  const chinZ = landmarks[152]?.z ?? 0;
  const pitchAngle = Math.atan2(chinZ - noseBridgeZ, Math.abs(chinRotated.y - eyeCenterY));

  // 5. الحساب الأنثروبومتري لارتفاع الجمجمة (Crown-to-Chin)
  const eyeToChinH = chinRotated.y - eyeCenterY;
  if (eyeToChinH <= 0) {
    throw new Error("بيانات معالم الوجه غير صالحة للحسابات الأنثروبومترية.");
  }

  const headHeight = eyeToChinH / 0.505;
  const skullTopY = eyeCenterY - 0.495 * headHeight;

  // 6. المسح البصري الذكي لأعلى حافة ظاهرية للشعر/غطاء الرأس
  let minHairY = foreheadRotated.y;
  const topLandmarkIndices = [10, 338, 297, 332, 284, 251, 109, 67, 103, 54, 21, 162];
  for (const idx of topLandmarkIndices) {
    const pt = landmarks[idx];
    if (!pt) continue;
    const rPt = rotatePointPhysical(pt.x, pt.y, eyeCenterX, eyeCenterY, -rollAngle, aspect);
    if (rPt.y < minHairY) minHairY = rPt.y;
  }

  const hairTopY = Math.min(skullTopY, minHairY - 0.12 * headHeight);
  const hairVolumeRatio = (skullTopY - hairTopY) / headHeight;

  // 7. حساب عرض الرأس والخدين ونسبة الوجه الفيزيائية
  const cheekWidthPhys = Math.abs(rightCheekRotated.x - leftCheekRotated.x) * aspect;
  const headWidthPhys = Math.max(cheekWidthPhys * 1.16, headHeight * 0.72);
  const headWidth = headWidthPhys / aspect;
  const faceAspectRatio = headWidthPhys / headHeight;

  return {
    eyeCenterX,
    eyeCenterY,
    rollAngle,
    pitchAngle,
    headHeight,
    hairTopY,
    skullTopY,
    chinY: chinRotated.y,
    headWidth,
    faceAspectRatio,
    hairVolumeRatio,
  };
}

/**
 * حساب مستطيل القص المعياري مع الدمج المطلق بين نسبة الخلية الهدف (targetAspectRatio) ونسبة الصورة المصدر (imageAspectRatio)
 */
export function computeIdCropRect(
  face: DetailedFaceBox,
  targetAspectRatio: number,
  imageAspectRatio: number = 1
): NormalizedRect {
  if (!(targetAspectRatio > 0) || !Number.isFinite(targetAspectRatio)) {
    throw new Error("نسبة أبعاد غير صالحة");
  }

  const imgAspect = imageAspectRatio > 0 ? imageAspectRatio : 1;
  // نسبة الأبعاد المحولة لنظام الإحداثيات Normalized (0..1)
  const normalizedTargetAspect = targetAspectRatio / imgAspect;

  const {
    eyeCenterX,
    eyeCenterY,
    headHeight,
    hairTopY,
    skullTopY,
    faceAspectRatio,
    hairVolumeRatio,
    pitchAngle,
  } = face;

  // 1. التكيف مع زاوية النظرة والتحديق (Pitch Angle Compensation)
  const pitchShift = clamp(Math.sin(pitchAngle) * 0.03, -0.02, 0.02);
  const targetEyeLevel = clamp(ICAO_BASE_EYE_LEVEL + pitchShift, 0.36, 0.40);

  // 2. التمييز الذكي لحجم الشعر/الغطاء العالي
  const effectiveHairTopY = hairVolumeRatio > 0.15
    ? skullTopY - 0.65 * (skullTopY - hairTopY)
    : hairTopY;

  // 3. التكيف مع تركيبة الجسم والكتفين بحسب نسبة الوجه
  const adaptiveShoulderRatio = clamp(0.35 + (faceAspectRatio - 0.7) * 0.22, 0.35, 0.42);
  const totalSpanH = headHeight * (1 + adaptiveShoulderRatio);

  // 4. حساب ارتفاع القص المباشر بقرار المصور الخبير
  let cropH = Math.max(
    (eyeCenterY - effectiveHairTopY) / (targetEyeLevel - 0.09),
    totalSpanH / 0.90,
    1 / MAX_ZOOM
  );

  // 5. تطبيق موقع قمة الإطار مع ضمان مسافة أمان علوية لا تقل عن 9% فوق أعلى نقطة شعر حقيقية
  let cropY = eyeCenterY - cropH * targetEyeLevel;
  if (hairTopY - cropY < cropH * 0.09) {
    cropY = hairTopY - cropH * 0.09;
    cropH = (eyeCenterY - cropY) / targetEyeLevel;
  }

  // 6. حساب العرض والتأكد من عدم قص الأكتاف أو الأذنين
  const minWPhys = (face.headWidth * imgAspect) / 0.78;
  let cropW = Math.max(
    cropH * normalizedTargetAspect,
    minWPhys / imgAspect
  );

  // إعادة التوزيع للحفاظ المطلق على نسبة الأبعاد بدون مطّ
  cropH = cropW / normalizedTargetAspect;
  cropY = eyeCenterY - cropH * targetEyeLevel;

  // 7. الحصر الذكي والتثبيت داخل حدود الصورة الأصلية ([0, 1])
  if (cropW > 1 || cropH > 1) {
    const scale = Math.min(1 / cropW, 1 / cropH);
    cropW *= scale;
    cropH *= scale;
  }

  // التمركز الأفقي مع الإزاحة للبقاء داخل حدود الصورة
  const cropX = clamp(eyeCenterX - cropW / 2, 0, 1 - cropW);

  // الإزاحة العمودية الحافظة للأبعاد عند الحواف
  if (cropY < 0) {
    cropY = 0;
  } else if (cropY + cropH > 1) {
    cropY = 1 - cropH;
  }

  return {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
  };
}



