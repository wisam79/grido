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
});

export const ProjectSchema = z.object({
  mode: z.enum(["single", "collage"]).catch("single"),
  canvasWidth: z.number().catch(413),
  canvasHeight: z.number().catch(531),
  backgroundColor: z.string().catch("#FFFFFF"),
  elements: z.array(CanvasElementSchema).catch([]),
  slots: z.array(CanvasSlotSchema).catch([]),
  template: z.any().nullable().catch(null),
  collageTemplate: z.any().nullable().catch(null),
  printSettings: PrintSettingsSchema.optional(),
});

export type ProjectData = z.infer<typeof ProjectSchema>;
