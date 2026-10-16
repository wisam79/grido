import { describe, it, expect, beforeEach } from 'vitest';
import {
  serializeEditorState,
  deserializeProjectFile,
  migrateProject,
  domainProjectToProjectFile,
  projectFileToDomainProject,
  ProjectFileV1,
} from '../src/lib/io/project-serializer';
import { EditorState, useEditorStore } from '../src/lib/editor-store';
import { DEFAULT_GRID_STATE } from '../src/lib/store/slices/grid-slice';
import { domain } from '../wailsjs/go/models';

describe('project-serializer - Project Serialization and Migration Tests', () => {
  const mockEditorState: Partial<EditorState> = {
    mode: 'collage',
    canvasWidth: 1200,
    canvasHeight: 1200,
    backgroundColor: '#FFFFFF',
    elements: [],
    slots: [],
    template: null,
    collageTemplate: null,
    printSettings: {
      paperId: 'a4',
      paperWidthMM: 210,
      paperHeightMM: 297,
      marginMM: 5,
      dpi: 300,
      copiesPerSheet: 1,
      showCutLines: true,
      orientation: 'portrait',
    },
    showGrid: false,
    gridSize: 50,
    gridColor: '#000000',
    gridOpacity: 0.15,
    gridSubdivisions: 5,
    gridType: 'lines',
    snapToGrid: false,
    showColumns: false,
    columnsCount: 12,
    columnsColor: 'rgba(239, 68, 68, 0.08)',
    columnsMargin: 20,
    columnsGutter: 12,
    collageGap: 0,
    collageMargin: 0,
    collageRadius: 0,
    collageShowCutLines: false,
    collageStrokeWidth: 0,
    collageStrokeColor: '#000000',
  };

  it('should serialize editor state into ProjectFileV1 structure', () => {
    const serialized = serializeEditorState(mockEditorState as EditorState);
    expect(serialized.version).toBe(1);
    expect(serialized.mode).toBe('collage');
    expect(serialized.canvasWidth).toBe(1200);
    expect(serialized.backgroundColor).toBe('#FFFFFF');
    expect(serialized.showGrid).toBe(false);
  });

  it('should migrate legacy projects without version to current V1 version', () => {
    const legacyProject = {
      mode: 'single',
      canvasWidth: 600,
      canvasHeight: 800,
      backgroundColor: '#000000',
      elements: [],
      slots: [],
    };

    const migrated = migrateProject(legacyProject);
    expect(migrated.version).toBe(1);
    expect(migrated.mode).toBe('single');
    expect(migrated.showGrid).toBe(false); // Sensible default provided
    expect(migrated.gridSize).toBe(48); // Sensible default provided (4px grid)
  });

  it('should validate and deserialize valid projects', () => {
    const validFile = {
      version: 1,
      mode: 'single',
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#FFFFFF',
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

  it('should map between domain.Project (DB) and ProjectFile DTO', () => {
    // 1. Create a dummy domain.Project
    const dbProj = new domain.Project({
      id: 'test-id',
      name: 'Test Project',
      mode: 'collage',
      canvasWidth: 1000,
      canvasHeight: 1000,
      backgroundColor: '#FF0000',
      elements: '[]',
      slots: '[]',
      template: 'null',
      collageTemplate: 'null',
      printSettings: '',
      showGrid: true,
      gridSize: 30,
      gridType: 'dots',
      collageShowEndCutLine: true,
      updatedAt: '2026-07-09T12:00:00Z',
    });

    const projectFile = domainProjectToProjectFile(dbProj);
    expect(projectFile.mode).toBe('collage');
    expect(projectFile.canvasWidth).toBe(1000);
    expect(projectFile.showGrid).toBe(true);
    expect(projectFile.gridSize).toBe(30);
    expect(projectFile.gridType).toBe('dots');
    expect(projectFile.collageShowEndCutLine).toBe(true);

    // 2. Map back to domain.Project
    const mappedDbProj = projectFileToDomainProject(projectFile, 'test-id', 'Test Project');
    expect(mappedDbProj.id).toBe('test-id');
    expect(mappedDbProj.name).toBe('Test Project');
    expect(mappedDbProj.canvasWidth).toBe(1000);
    expect(mappedDbProj.showGrid).toBe(true);
    expect(mappedDbProj.gridSize).toBe(30);
    expect(mappedDbProj.gridType).toBe('dots');
    expect(mappedDbProj.collageShowEndCutLine).toBe(true);
  });

  describe('Project Guides and Ruler Persistence Parity', () => {
    beforeEach(() => {
      useEditorStore.getState().reset();
    });

    it('resets ruler, userGuides, and bleed margin fields to DEFAULT_GRID_STATE in reset()', () => {
      const store = useEditorStore.getState();

      store.setShowRuler(false);
      store.setRulerUnit('in');
      store.addUserGuide({ type: 'v', pos: 0.35 });
      store.setShowUserGuides(false);
      store.setLockUserGuides(true);
      store.setShowBleedGuides(true);
      store.setBleedMarginMM(5);
      store.setSafeMarginMM(4);
      store.setCutShapeType('circle');

      expect(useEditorStore.getState().showRuler).toBe(false);
      expect(useEditorStore.getState().rulerUnit).toBe('in');
      expect(useEditorStore.getState().userGuides.length).toBe(1);
      expect(useEditorStore.getState().lockUserGuides).toBe(true);

      useEditorStore.getState().reset();

      const afterReset = useEditorStore.getState();
      expect(afterReset.showRuler).toBe(DEFAULT_GRID_STATE.showRuler);
      expect(afterReset.rulerUnit).toBe(DEFAULT_GRID_STATE.rulerUnit);
      expect(afterReset.userGuides).toEqual([]);
      expect(afterReset.showUserGuides).toBe(DEFAULT_GRID_STATE.showUserGuides);
      expect(afterReset.lockUserGuides).toBe(DEFAULT_GRID_STATE.lockUserGuides);
      expect(afterReset.showBleedGuides).toBe(DEFAULT_GRID_STATE.showBleedGuides);
      expect(afterReset.bleedMarginMM).toBe(DEFAULT_GRID_STATE.bleedMarginMM);
      expect(afterReset.safeMarginMM).toBe(DEFAULT_GRID_STATE.safeMarginMM);
      expect(afterReset.cutShapeType).toBe(DEFAULT_GRID_STATE.cutShapeType);
    });

    it('serializes all 9 guide and ruler fields via serializeEditorState', () => {
      const store = useEditorStore.getState();
      store.setShowRuler(false);
      store.setRulerUnit('cm');
      store.addUserGuide({ id: 'guide-1', type: 'h', pos: 0.25 });
      store.addUserGuide({ id: 'guide-2', type: 'v', pos: 0.75 });
      store.setShowUserGuides(false);
      store.setLockUserGuides(true);
      store.setShowBleedGuides(true);
      store.setBleedMarginMM(3.5);
      store.setSafeMarginMM(1.5);
      store.setCutShapeType('rounded-rect');

      const projectFile = serializeEditorState(useEditorStore.getState());

      expect(projectFile.showRuler).toBe(false);
      expect(projectFile.rulerUnit).toBe('cm');
      expect(projectFile.userGuides).toEqual([
        { id: 'guide-1', type: 'h', pos: 0.25 },
        { id: 'guide-2', type: 'v', pos: 0.75 },
      ]);
      expect(projectFile.showUserGuides).toBe(false);
      expect(projectFile.lockUserGuides).toBe(true);
      expect(projectFile.showBleedGuides).toBe(true);
      expect(projectFile.bleedMarginMM).toBe(3.5);
      expect(projectFile.safeMarginMM).toBe(1.5);
      expect(projectFile.cutShapeType).toBe('rounded-rect');
    });

    it('restores guides and ruler fields via loadProject and sanitizes invalid guides', () => {
      const rawProject = {
        version: 1,
        mode: 'collage' as const,
        canvasWidth: 2480,
        canvasHeight: 3508,
        backgroundColor: '#FFFFFF',
        elements: [],
        slots: [],
        template: null,
        collageTemplate: null,
        showRuler: false,
        rulerUnit: 'px' as const,
        userGuides: [
          { id: 'valid-h', type: 'h', pos: 0.5 },
          { id: 'valid-v', type: 'v', pos: 0.8 },
          { id: 'invalid-type', type: 'diagonal', pos: 0.5 },
          { id: 'negative-pos', type: 'h', pos: -0.1 },
          { id: 'overflow-pos', type: 'v', pos: 1.5 },
          null,
          'not-an-object',
        ],
        showUserGuides: true,
        lockUserGuides: true,
        showBleedGuides: true,
        bleedMarginMM: 4,
        safeMarginMM: 3,
        cutShapeType: 'circle' as const,
      };

      useEditorStore.getState().loadProject(rawProject as unknown as ProjectFileV1);

      const loadedState = useEditorStore.getState();
      expect(loadedState.showRuler).toBe(false);
      expect(loadedState.rulerUnit).toBe('px');
      expect(loadedState.showUserGuides).toBe(true);
      expect(loadedState.lockUserGuides).toBe(true);
      expect(loadedState.showBleedGuides).toBe(true);
      expect(loadedState.bleedMarginMM).toBe(4);
      expect(loadedState.safeMarginMM).toBe(3);
      expect(loadedState.cutShapeType).toBe('circle');

      expect(loadedState.userGuides).toHaveLength(2);
      expect(loadedState.userGuides[0]).toMatchObject({ id: 'valid-h', type: 'h', pos: 0.5 });
      expect(loadedState.userGuides[1]).toMatchObject({ id: 'valid-v', type: 'v', pos: 0.8 });
    });

    it('applies default values for legacy project files lacking guide fields', () => {
      const legacyProject = {
        version: 1,
        mode: 'collage',
        canvasWidth: 2480,
        canvasHeight: 3508,
        backgroundColor: '#FFFFFF',
        elements: [],
        slots: [],
      };

      const deserialized = deserializeProjectFile(legacyProject);
      expect(deserialized.showRuler).toBe(true);
      expect(deserialized.rulerUnit).toBe('mm');
      expect(deserialized.userGuides).toEqual([]);
      expect(deserialized.showUserGuides).toBe(true);
      expect(deserialized.lockUserGuides).toBe(false);
      expect(deserialized.showBleedGuides).toBe(false);
      expect(deserialized.bleedMarginMM).toBe(2);
      expect(deserialized.safeMarginMM).toBe(2);
      expect(deserialized.cutShapeType).toBe('rectangle');

      useEditorStore.getState().loadProject(deserialized);

      const state = useEditorStore.getState();
      expect(state.showRuler).toBe(true);
      expect(state.rulerUnit).toBe('mm');
      expect(state.userGuides).toEqual([]);
      expect(state.showUserGuides).toBe(true);
      expect(state.lockUserGuides).toBe(false);
      expect(state.showBleedGuides).toBe(false);
      expect(state.bleedMarginMM).toBe(2);
      expect(state.safeMarginMM).toBe(2);
      expect(state.cutShapeType).toBe('rectangle');
    });
  });
});
