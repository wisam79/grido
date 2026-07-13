import { describe, it, expect } from "vitest";
import {
  serializeEditorState,
  deserializeProjectFile,
  migrateProject,
  domainProjectToProjectFile,
  projectFileToDomainProject,
  ProjectFileV1,
} from "../src/lib/project-serializer";
import { EditorState } from "../src/lib/editor-store";
import { domain } from "../wailsjs/go/models";

describe("project-serializer - Project Serialization and Migration Tests", () => {
  const mockEditorState: Partial<EditorState> = {
    mode: "collage",
    canvasWidth: 1200,
    canvasHeight: 1200,
    backgroundColor: "#FFFFFF",
    elements: [],
    slots: [],
    template: null,
    collageTemplate: null,
    printSettings: {
      paperId: "a4",
      paperWidthMM: 210,
      paperHeightMM: 297,
      marginMM: 5,
      dpi: 300,
      copiesPerSheet: 1,
      showCutLines: true,
      orientation: "portrait",
    },
    showGrid: false,
    gridSize: 50,
    gridColor: "#000000",
    gridOpacity: 0.15,
    gridSubdivisions: 5,
    gridType: "lines",
    snapToGrid: false,
    showColumns: false,
    columnsCount: 12,
    columnsColor: "rgba(239, 68, 68, 0.08)",
    columnsMargin: 20,
    columnsGutter: 12,
    collageGap: 0,
    collageMargin: 0,
    collageRadius: 0,
    collageShowCutLines: false,
    collageStrokeWidth: 0,
    collageStrokeColor: "#000000",
  };

  it("should serialize editor state into ProjectFileV1 structure", () => {
    const serialized = serializeEditorState(mockEditorState as EditorState);
    expect(serialized.version).toBe(1);
    expect(serialized.mode).toBe("collage");
    expect(serialized.canvasWidth).toBe(1200);
    expect(serialized.backgroundColor).toBe("#FFFFFF");
    expect(serialized.showGrid).toBe(false);
  });

  it("should migrate legacy projects without version to current V1 version", () => {
    const legacyProject = {
      mode: "single",
      canvasWidth: 600,
      canvasHeight: 800,
      backgroundColor: "#000000",
      elements: [],
      slots: [],
    };

    const migrated = migrateProject(legacyProject);
    expect(migrated.version).toBe(1);
    expect(migrated.mode).toBe("single");
    expect(migrated.showGrid).toBe(false); // Sensible default provided
    expect(migrated.gridSize).toBe(50); // Sensible default provided
  });

  it("should validate and deserialize valid projects", () => {
    const validFile = {
      version: 1,
      mode: "single",
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: "#FFFFFF",
      elements: [],
      slots: [],
      showGrid: true,
      gridSize: 40,
    } as unknown as ProjectFileV1;

    const deserialized = deserializeProjectFile(validFile);
    expect(deserialized.version).toBe(1);
    expect(deserialized.showGrid).toBe(true);
    expect(deserialized.gridSize).toBe(40);
  });

  it("should map between domain.Project (DB) and ProjectFile DTO", () => {
    // 1. Create a dummy domain.Project
    const dbProj = new domain.Project({
      id: "test-id",
      name: "Test Project",
      mode: "collage",
      canvasWidth: 1000,
      canvasHeight: 1000,
      backgroundColor: "#FF0000",
      elements: "[]",
      slots: "[]",
      template: "null",
      collageTemplate: "null",
      printSettings: "",
      showGrid: true,
      gridSize: 30,
      gridType: "dots",
      updatedAt: "2026-07-09T12:00:00Z",
    });

    const projectFile = domainProjectToProjectFile(dbProj);
    expect(projectFile.mode).toBe("collage");
    expect(projectFile.canvasWidth).toBe(1000);
    expect(projectFile.showGrid).toBe(true);
    expect(projectFile.gridSize).toBe(30);
    expect(projectFile.gridType).toBe("dots");

    // 2. Map back to domain.Project
    const mappedDbProj = projectFileToDomainProject(projectFile, "test-id", "Test Project");
    expect(mappedDbProj.id).toBe("test-id");
    expect(mappedDbProj.name).toBe("Test Project");
    expect(mappedDbProj.canvasWidth).toBe(1000);
    expect(mappedDbProj.showGrid).toBe(true);
    expect(mappedDbProj.gridSize).toBe(30);
    expect(mappedDbProj.gridType).toBe("dots");
  });
});
