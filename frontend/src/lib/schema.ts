import { z } from "zod";

export const CanvasElementSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "text", "shape"]),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  zIndex: z.number(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  
  imageSrc: z.string().optional(),
  filter: z.string().optional(),
  brightness: z.number().optional(),
  contrast: z.number().optional(),
  saturation: z.number().optional(),
  blur: z.number().optional(),
  
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.number().optional(),
  color: z.string().optional(),
  fontFamily: z.string().optional(),
  textAlign: z.enum(["right", "center", "left"]).optional(),
  textBgColor: z.string().optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  
  shape: z.enum(["rect", "ellipse", "line", "star"]).optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  radius: z.number().optional(),
  
  // خصائص متقدمة
  shadowColor: z.string().optional(),
  shadowBlur: z.number().optional(),
  shadowOffsetX: z.number().optional(),
  shadowOffsetY: z.number().optional(),
  shadowOpacity: z.number().optional(),
  cornerRadius: z.number().optional(),
  globalCompositeOperation: z.string().optional(),
  flipX: z.boolean().optional(),
});

export const CanvasSlotSchema = z.object({
  id: z.string(),
  cellIndex: z.number(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  imageSrc: z.string().optional(),
  filter: z.string().optional(),
  brightness: z.number().optional(),
  contrast: z.number().optional(),
  saturation: z.number().optional(),
});

export const PrintSettingsSchema = z.object({
  paperId: z.string(),
  paperWidthMM: z.number(),
  paperHeightMM: z.number(),
  marginMM: z.number(),
  gapMM: z.number().optional(),
  dpi: z.number(),
  copiesPerSheet: z.number(),
  showCutLines: z.boolean(),
  orientation: z.enum(["portrait", "landscape"]),
  fitToPage: z.boolean().optional(),
});

export const ProjectSchema = z.object({
  mode: z.enum(["single", "collage"]).default("single"),
  canvasWidth: z.number().default(413),
  canvasHeight: z.number().default(531),
  backgroundColor: z.string().default("#FFFFFF"),
  elements: z.array(CanvasElementSchema).default([]),
  slots: z.array(CanvasSlotSchema).default([]),
  template: z.any().nullable().default(null),
  collageTemplate: z.any().nullable().default(null),
  printSettings: PrintSettingsSchema.optional(),
  
  // إعدادات شبكة الإرشاد
  showGrid: z.boolean().optional().default(false),
  gridSize: z.number().optional().default(50),
  gridColor: z.string().optional().default("#000000"),
  gridOpacity: z.number().optional().default(0.15),
  gridSubdivisions: z.number().optional().default(5),
  gridType: z.enum(["lines", "dots"]).optional().default("lines"),
  snapToGrid: z.boolean().optional().default(false),
  
  // إعدادات أعمدة التخطيط
  showColumns: z.boolean().optional().default(false),
  columnsCount: z.number().optional().default(12),
  columnsColor: z.string().optional().default("rgba(239, 68, 68, 0.08)"),
  columnsMargin: z.number().optional().default(20),
  columnsGutter: z.number().optional().default(12),
  
  // تخصيصات الكولاج
  collageGap: z.number().optional().default(0),
  collageMargin: z.number().optional().default(0),
  collageRadius: z.number().optional().default(0),
  collageShowCutLines: z.boolean().optional().default(false),
  collageStrokeWidth: z.number().optional().default(0),
  collageStrokeColor: z.string().optional().default("#000000"),
});

export type ProjectData = z.infer<typeof ProjectSchema>;
