import { describe, it, expect } from 'vitest';
import { 
  migrateProject, 
  deserializeProjectFile, 
  serializeEditorState,
  CURRENT_PROJECT_VERSION 
} from './project-serializer';

describe('project-serializer', () => {
  it('should migrate legacy project data without version', () => {
    const legacyData = {
      canvasWidth: 800,
      canvasHeight: 600,
      mode: 'select',
      backgroundColor: '#ffffff',
      elements: [],
      slots: [],
      // missing version and grid settings
    };

    const migrated = migrateProject(legacyData);
    expect(migrated.version).toBe(CURRENT_PROJECT_VERSION);
    expect(migrated.showGrid).toBe(false);
    expect(migrated.gridSize).toBe(50);
  });

  it('should throw an error for corrupt JSON string', () => {
    expect(() => {
      migrateProject('{ corrupt: json');
    }).toThrow('Invalid JSON format');
  });

  it('should validate correctly and round-trip successfully', () => {
    const mockState: any = {
      mode: 'single',
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#ffffff',
      elements: [{ 
        id: '1', 
        type: 'shape', 
        x: 10, y: 10, width: 100, height: 100,
        rotation: 0,
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
        maintainAspectRatio: false
      }],
      slots: [],
      template: null,
      collageTemplate: null,
      printSettings: {
        dpi: 300,
        colorSpace: 'cmyk',
        jpegQuality: 90,
        paperId: 'a4',
        paperWidthMM: 210,
        paperHeightMM: 297,
        marginMM: 0,
        copiesPerSheet: 1,
        showCutLines: false,
        orientation: 'portrait'
      },
      showGrid: true,
      gridSize: 20,
      gridColor: '#000000',
      gridOpacity: 0.5,
      gridSubdivisions: 5,
      gridType: 'lines',
      snapToGrid: true,
      showColumns: false,
      columnsCount: 12,
      columnsColor: '#ff0000',
      columnsMargin: 10,
      columnsGutter: 10,
      collageGap: 5,
      collageMargin: 5,
      collageRadius: 0,
      collageShowCutLines: false,
      collageStrokeWidth: 0,
      collageStrokeColor: '#000000',
    };

    const serialized = serializeEditorState(mockState);
    expect(serialized.version).toBe(CURRENT_PROJECT_VERSION);
    expect(serialized.savedAt).toBeDefined();
    
    const deserialized = deserializeProjectFile(serialized);
    expect(deserialized.canvasWidth).toBe(800);
    expect(deserialized.elements.length).toBe(1);
    expect(deserialized.elements[0].id).toBe('1');
    expect(deserialized.printSettings?.dpi).toBe(300);
    expect(deserialized.showGrid).toBe(true);
    expect(deserialized.gridSize).toBe(20);
  });

  it('should throw on validation failure', () => {
    const invalidData = {
      version: CURRENT_PROJECT_VERSION,
      canvasWidth: "this-should-be-a-number", // This will trigger zod validation failure
    };
    
    expect(() => {
      deserializeProjectFile(invalidData);
    }).toThrow(/Project file validation failed/);
  });
});
