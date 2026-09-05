export type RulerUnit = "mm" | "cm" | "in" | "px";

/**
 * حساب التدريج والخطوات التكيفية الذكية لمختلف الوحدات ومستويات الزوم (من 10% إلى 500%+)
 */
export function getRulerSteps(pixelsPerUnit: number, unit: RulerUnit) {
  const minLabelDistancePx = unit === "in" ? 54 : 44;
  const rawLabelStep = minLabelDistancePx / Math.max(pixelsPerUnit, 0.00001);

  let niceSteps: number[];
  if (unit === "cm") {
    niceSteps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  } else if (unit === "in") {
    niceSteps = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 12, 24, 48];
  } else if (unit === "px") {
    niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  } else {
    // mm (الافتراضي للهويات والاستوديو)
    niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  }

  const labelStep = niceSteps.find((s) => s >= rawLabelStep) || niceSteps[niceSteps.length - 1];

  let subStep = 1;
  if (unit === "in") {
    if (labelStep >= 4) subStep = 1;
    else if (labelStep >= 2) subStep = 0.5;
    else if (labelStep >= 1) subStep = 0.25;
    else if (labelStep >= 0.5) subStep = 0.125;
    else if (labelStep >= 0.25) subStep = 0.0625;
    else subStep = 0.03125;
  } else if (unit === "cm") {
    if (labelStep >= 10) subStep = 2;
    else if (labelStep >= 5) subStep = 1;
    else if (labelStep >= 2) subStep = 0.5;
    else if (labelStep >= 1) subStep = 0.1;
    else if (labelStep >= 0.5) subStep = 0.05;
    else subStep = 0.01;
  } else if (unit === "px") {
    if (labelStep >= 1000) subStep = labelStep / 10;
    else if (labelStep >= 500) subStep = labelStep / 5;
    else if (labelStep >= 200) subStep = labelStep / 10;
    else if (labelStep >= 100) subStep = labelStep / 5;
    else if (labelStep >= 50) subStep = 10;
    else if (labelStep >= 20) subStep = 5;
    else if (labelStep >= 10) subStep = 2;
    else subStep = 1;
  } else {
    // mm
    if (labelStep >= 1000) subStep = labelStep / 10;
    else if (labelStep >= 500) subStep = labelStep / 5;
    else if (labelStep >= 200) subStep = labelStep / 10;
    else if (labelStep >= 100) subStep = labelStep / 5;
    else if (labelStep >= 50) subStep = 10;
    else if (labelStep >= 20) subStep = 5;
    else if (labelStep >= 10) subStep = 2;
    else if (labelStep >= 5) subStep = 1;
    else if (labelStep >= 2) subStep = 0.5;
    else if (labelStep >= 1) subStep = 0.2;
    else subStep = 0.1;
  }

  const midStep = labelStep / 2;
  return { labelStep, subStep, midStep };
}

/**
 * حساب المدى الإجمالي للورقة بحسب الوحدة المختارة
 */
export function getUnitSpan(mm: number, px: number | undefined, unit: RulerUnit): number {
  if (unit === "px") return px || (mm * 300) / 25.4;
  if (unit === "cm") return mm / 10;
  if (unit === "in") return mm / 25.4;
  return mm; // mm
}

/**
 * تنسيق الرقم لعرض نقي وموجز على علامات المسطرة
 */
export function formatRulerNumber(val: number, unit: RulerUnit): string {
  if (Math.abs(val) < 0.00001) return "0";
  if (unit === "in") {
    if (Math.abs(val - 0.25) < 0.001) return "¼";
    if (Math.abs(val - 0.5) < 0.001) return "½";
    if (Math.abs(val - 0.75) < 0.001) return "¾";
    if (Math.abs(val - 0.125) < 0.001) return "⅛";
    if (Math.abs(val - 0.375) < 0.001) return "⅜";
    if (Math.abs(val - 0.625) < 0.001) return "⅝";
    if (Math.abs(val - 0.875) < 0.001) return "⅞";
    return Number(val.toFixed(2)).toString();
  }
  if (unit === "cm") {
    return Number(val.toFixed(2)).toString();
  }
  if (unit === "px") {
    return Math.round(val).toString();
  }
  return Number(val.toFixed(1)).toString();
}

/**
 * تنسيق قياس الإحداثي الدقيق
 */
export function formatRulerCoordinate(val: number, unit: RulerUnit): string {
  if (Math.abs(val) < 0.0001) return `0 ${unit}`;
  if (unit === "in") return `${Number(val.toFixed(2))} in`;
  if (unit === "cm") return `${Number(val.toFixed(2))} cm`;
  if (unit === "px") return `${Math.round(val)} px`;
  return `${Number(val.toFixed(1))} mm`;
}
