/**
 * Utility for drawing curved text along an arc on standard HTML5 Canvas 2D / Konva
 */
import { TEXT_COLOR_DEFAULT } from "./canvas-colors";
import { ensureTextStrokeFilter } from "./text-stroke-filter";

export interface CurvedTextOptions {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: number;
  fontStyle?: string;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  textAlign?: "left" | "center" | "right";
  curve: number; // -100 to 100
  letterSpacing?: number;
}

export function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  options: CurvedTextOptions
) {
  const {
    text,
    width,
    height,
    fontSize,
    fontFamily,
    fontWeight = 400,
    fontStyle = "normal",
    color = TEXT_COLOR_DEFAULT,
    stroke,
    strokeWidth = 0,
    textAlign = "center",
    curve,
    letterSpacing = 0,
  } = options;

  if (!text || curve === 0) return;

  ctx.save();
  const fontStylePrefix = fontStyle === "italic" ? "italic " : "";
  ctx.font = `${fontStylePrefix}${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const numChars = text.length;
  if (numChars === 0) {
    ctx.restore();
    return;
  }

  // Calculate arc parameters
  // Positive curve: center below, arches upward ⌢
  // Negative curve: center above, arches downward ⌣
  const normalizedCurve = Math.max(-100, Math.min(100, curve));
  const curvatureRatio = Math.abs(normalizedCurve) / 100;
  const isUpward = normalizedCurve > 0;

  // Arc radius based on width and curvature
  const minRadius = Math.max(fontSize * 1.5, width * 0.4);
  const maxRadius = width * 3.5;
  const radius = maxRadius - curvatureRatio * (maxRadius - minRadius);

  // Measure character widths
  const charWidths: number[] = [];
  let totalTextWidth = 0;
  for (let i = 0; i < numChars; i++) {
    const charW = ctx.measureText(text[i]).width + letterSpacing;
    charWidths.push(charW);
    totalTextWidth += charW;
  }

  // Calculate total angular span
  const maxAngle = Math.PI * 1.6;
  const angularSpan = Math.min(maxAngle, totalTextWidth / radius);

  // Center of curvature
  const centerX = width / 2;
  const centerY = isUpward ? height / 2 + radius - fontSize / 2 : height / 2 - radius + fontSize / 2;

  // Start angle
  let startAngle: number;
  if (isUpward) {
    // Top of circle is -PI/2
    startAngle = -Math.PI / 2 - (angularSpan / 2);
  } else {
    // Bottom of circle is PI/2
    startAngle = Math.PI / 2 + (angularSpan / 2);
  }

  let currentAngle = startAngle;
  interface CharTransform {
    char: string;
    charX: number;
    charY: number;
    rotation: number;
  }
  const charTransforms: CharTransform[] = [];

  for (let i = 0; i < numChars; i++) {
    const char = text[i];
    const charW = charWidths[i];
    const charAngle = charW / radius;

    // Center of this character on the arc
    const midAngle = isUpward ? currentAngle + charAngle / 2 : currentAngle - charAngle / 2;

    const charX = centerX + Math.cos(midAngle) * radius;
    const charY = centerY + Math.sin(midAngle) * radius;
    const rotation = isUpward ? midAngle + Math.PI / 2 : midAngle - Math.PI / 2;

    charTransforms.push({ char, charX, charY, rotation });

    if (isUpward) {
      currentAngle += charAngle;
    } else {
      currentAngle -= charAngle;
    }
  }

  // تطبيق الحدود الموحدة عبر فلتر التمدد لمنع تشوه تقاطعات الحروف
  const filterId = stroke && strokeWidth > 0 ? ensureTextStrokeFilter(strokeWidth, stroke) : "";
  if (filterId) {
    ctx.filter = `url(#${filterId})`;
  }

  // رسم تعبئة النص فوق الخلفية مع الحدود الموحدة
  ctx.fillStyle = color;
  for (let i = 0; i < charTransforms.length; i++) {
    const { char, charX, charY, rotation } = charTransforms[i];
    ctx.save();
    ctx.translate(charX, charY);
    ctx.rotate(rotation);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }

  if (filterId) {
    ctx.filter = "none";
  }

  ctx.restore();
}
