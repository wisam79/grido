import { z } from "zod";
import { ProjectSchema } from "./schema";
import { domain } from "../../wailsjs/go/models";
import { EditorState } from "./editor-store";

export const CURRENT_PROJECT_VERSION = 1;

// Project file layout (representing versioned project JSON export and unified DTO)
export const ProjectFileSchema = ProjectSchema.extend({
  version: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === "string" ? parseFloat(val) : val
  ),
  savedAt: z.string().optional(),
});

export type ProjectFileV1 = z.infer<typeof ProjectFileSchema>;

// Serialization from Editor Store state
export function serializeEditorState(state: EditorState): ProjectFileV1 {
  const projectFile: ProjectFileV1 = {
    version: CURRENT_PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    mode: state.mode,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    backgroundColor: state.backgroundColor,
    elements: state.elements,
    slots: state.slots,
    template: state.template,
    collageTemplate: state.collageTemplate,
    printSettings: state.printSettings,
    
    // Grid settings
    showGrid: state.showGrid,
    gridSize: state.gridSize,
    gridColor: state.gridColor,
    gridOpacity: state.gridOpacity,
    gridSubdivisions: state.gridSubdivisions,
    gridType: state.gridType,
    snapToGrid: state.snapToGrid,

    // Layout columns settings
    showColumns: state.showColumns,
    columnsCount: state.columnsCount,
    columnsColor: state.columnsColor,
    columnsMargin: state.columnsMargin,
    columnsGutter: state.columnsGutter,
    
    // Collage settings
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageRadius: state.collageRadius,
    collageShowCutLines: state.collageShowCutLines,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
  };
  return projectFile;
}

// Migration from legacy or unknown structures to current V1
export function migrateProject(raw: any): ProjectFileV1 {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON format");
    }
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid project data format");
  }

  // Normalize legacy format (without version) to v1

  const normalized = {
    ...raw,
    version: CURRENT_PROJECT_VERSION,
    // Provide sensible defaults for missing fields if necessary
    showGrid: raw.showGrid ?? false,
    gridSize: raw.gridSize ?? 50,
    collageGap: raw.collageGap ?? 0,
    collageMargin: raw.collageMargin ?? 0,
    collageRadius: raw.collageRadius ?? 0,
    collageStrokeWidth: raw.collageStrokeWidth ?? 0,
  };

  return normalized as ProjectFileV1;
}

// Validation and parsing
export function deserializeProjectFile(raw: unknown): ProjectFileV1 {
  const migrated = migrateProject(raw);
  const parsed = ProjectFileSchema.safeParse(migrated);
  if (!parsed.success) {
    throw new Error("Project file validation failed: " + parsed.error.message);
  }
  return parsed.data;
}

// Map from Domain (DB) to ProjectFile DTO
export function domainProjectToProjectFile(dbProj: domain.Project): ProjectFileV1 {
	const parseSafely = (data: string | undefined | null, fallback: any) => {
		if (!data) return fallback;
		try {
			return JSON.parse(data);
		} catch (e) {
			console.error("Failed to parse project JSON data", e);
			return fallback;
		}
	};

	const elements = parseSafely(dbProj.elements, []);
	const slots = parseSafely(dbProj.slots, []);
	const template = parseSafely(dbProj.template, null);
	const collageTemplate = parseSafely(dbProj.collageTemplate, null);
	const printSettings = parseSafely(dbProj.printSettings, undefined);

  const projectFile: ProjectFileV1 = {
    version: CURRENT_PROJECT_VERSION,
    savedAt: dbProj.updatedAt || new Date().toISOString(),
    mode: dbProj.mode as "single" | "collage",
    canvasWidth: dbProj.canvasWidth,
    canvasHeight: dbProj.canvasHeight,
    backgroundColor: dbProj.backgroundColor,
    elements,
    slots,
    template,
    collageTemplate,
    printSettings,
    
    // The following properties will be mapped safely
    showGrid: dbProj.showGrid ?? false,
    gridSize: dbProj.gridSize ?? 50,
    gridColor: dbProj.gridColor ?? "#000000",
    gridOpacity: dbProj.gridOpacity ?? 0.15,
    gridSubdivisions: dbProj.gridSubdivisions ?? 5,
    gridType: (dbProj.gridType as "lines" | "dots") ?? "lines",
    snapToGrid: dbProj.snapToGrid ?? false,
    showColumns: dbProj.showColumns ?? false,
    columnsCount: dbProj.columnsCount ?? 12,
    columnsColor: dbProj.columnsColor ?? "rgba(239, 68, 68, 0.08)",
    columnsMargin: dbProj.columnsMargin ?? 20,
    columnsGutter: dbProj.columnsGutter ?? 12,
    collageGap: dbProj.collageGap ?? 0,
    collageMargin: dbProj.collageMargin ?? 0,
    collageRadius: dbProj.collageRadius ?? 0,
    collageShowCutLines: dbProj.collageShowCutLines ?? false,
    collageStrokeWidth: dbProj.collageStrokeWidth ?? 0,
    collageStrokeColor: dbProj.collageStrokeColor ?? "#000000",
  };

  return deserializeProjectFile(projectFile);
}

// Map from ProjectFile DTO to Domain (DB)
export function projectFileToDomainProject(
  file: ProjectFileV1,
  id: string,
  name: string
): domain.Project {
  const source: Partial<domain.Project> = {
    id,
    name,
    mode: file.mode,
    canvasWidth: file.canvasWidth,
    canvasHeight: file.canvasHeight,
    backgroundColor: file.backgroundColor,
    elements: JSON.stringify(file.elements),
    slots: JSON.stringify(file.slots),
    template: file.template ? JSON.stringify(file.template) : "",
    collageTemplate: file.collageTemplate ? JSON.stringify(file.collageTemplate) : "",
    printSettings: file.printSettings ? JSON.stringify(file.printSettings) : "",
    showGrid: file.showGrid ?? false,
    gridSize: file.gridSize ?? 50,
    gridColor: file.gridColor ?? "#000000",
    gridOpacity: file.gridOpacity ?? 0.15,
    gridSubdivisions: file.gridSubdivisions ?? 5,
    gridType: file.gridType ?? "lines",
    snapToGrid: file.snapToGrid ?? false,
    showColumns: file.showColumns ?? false,
    columnsCount: file.columnsCount ?? 12,
    columnsColor: file.columnsColor ?? "rgba(239, 68, 68, 0.08)",
    columnsMargin: file.columnsMargin ?? 20,
    columnsGutter: file.columnsGutter ?? 12,
    collageGap: file.collageGap ?? 0,
    collageMargin: file.collageMargin ?? 0,
    collageRadius: file.collageRadius ?? 0,
    collageShowCutLines: file.collageShowCutLines ?? false,
    collageStrokeWidth: file.collageStrokeWidth ?? 0,
    collageStrokeColor: file.collageStrokeColor ?? "#000000",
  };
  
  return new domain.Project(source);
}
