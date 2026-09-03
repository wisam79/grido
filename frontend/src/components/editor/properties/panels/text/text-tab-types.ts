import { TextElement } from "@/lib/editor-store";

export interface TextTabProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export const WEIGHT_OPTIONS = [
  { value: 100, label: "رفيع 100" },
  { value: 200, label: "خفيف 200" },
  { value: 300, label: "ناعم 300" },
  { value: 400, label: "عادي 400" },
  { value: 500, label: "متوسط 500" },
  { value: 600, label: "شبه عريض 600" },
  { value: 700, label: "عريض 700" },
  { value: 800, label: "ثقيل 800" },
  { value: 900, label: "أسود 900" },
];
