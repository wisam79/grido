import type * as React from "react";

export type TemplateCategory =
  | "id"
  | "passport"
  | "visa"
  | "personal"
  | "collage";

export interface PhotoTemplate {
  id: string;
  name: string; // الاسم القياسي (قياس + نوع)
  category: TemplateCategory;
  width: number; // البكسل عند DPI المحدد
  height: number;
  widthMM: number; // المليمتر
  heightMM: number;
  dpi: number;
  headHeightMin?: number; // الحد الأدنى لارتفاع الرأس %
  headHeightMax?: number;
  background: string; // اللون الموصى به للخلفية
  backgroundHint: string;
  notes?: string;
  icon?: React.ComponentType<Record<string, unknown>>;
}

export interface CollageTemplate {
  id: string;
  name: string;
  slots: number;
  cells: {
    x: number;
    y: number;
    w: number;
    h: number;
    presetType?: string;
    label?: string;
    rotation?: number;
  }[];
  icon?: React.ComponentType<Record<string, unknown>>;
  physicalLayout?: {
    type:
      | "iq-national-id"
      | "iq-civil-id"
      | "iq-general-id"
      | "iq-transactions"
      | "passport"
      | "visa"
      | "id"
      | "iq-mixed";
    rows: number;
    cols: number;
    align?:
      | "center"
      | "top-left"
      | "top-center"
      | "top-right"
      | "center-left"
      | "center-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right";
  };
}
