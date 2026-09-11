import type { PhotoPresetType } from "../types";

/** تسميات مقاسات الاستوديو المعتمدة — تُستخدم في الإدراج المباشر والمفتش */
export const PHOTO_PRESET_LABELS: Record<PhotoPresetType, string> = {
  passport: "جواز سفر (5×5)",
  id: "هوية قياسية (3.5×4.5)",
  visa: "فيزا شنغن (3.5×4.5)",
  "iq-national-id": "بطاقة موحدة (3.5×4.5)",
  "iq-civil-id": "هوية أحوال (3.5×4.5)",
  "iq-general-id": "هوية عامة (4×6)",
  "iq-transactions": "معاملة سريعة (3×4)",
  "portrait-4x6": "بورتريه (4×6)",
  "photo-10x15": "استوديو (10×15)",
  wallet: "كارت محفظة (5.4×8.6)",
  photobooth: "فوتوبوث (4.5×3.5)",
  custom: "مخصص",
};
