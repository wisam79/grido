import { describe, it, expect, beforeEach } from 'vitest';

import { useEditorStore } from '../src/lib/editor-store';
import { hydrateProjectState, makeUniqueId } from '../src/lib/io/project-hydrator';
import {
  serializeEditorState,
  deserializeProjectFile,
  migrateProject,
  domainProjectToProjectFile,
  projectFileToDomainProject,
} from '../src/lib/io/project-serializer';
import { DEFAULT_GRID_STATE } from '../src/lib/store/slices/grid-slice';
import { COLLAGE_TEMPLATES } from '../src/lib/templates/collage-templates';
import { domain } from '../wailsjs/go/models';

import type { EditorState } from '../src/lib/editor-store';
import type { ProjectFileV1 } from '../src/lib/io/project-serializer';

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

  it('should persist autofill images and pending overflow through file and DB round-trips', () => {
    // التكرار مقصود: القائمتان تحفظان الاستيراد كما هو دون إزالة نسخ متطابقة.
    const state = {
      ...mockEditorState,
      autofillImages: ['/local-image/a.jpg', '/local-image/a.jpg'],
      collagePendingImages: ['/local-image/b.jpg'],
    } as EditorState;

    const serialized = serializeEditorState(state);
    expect(serialized.autofillImages).toEqual(['/local-image/a.jpg', '/local-image/a.jpg']);
    expect(serialized.collagePendingImages).toEqual(['/local-image/b.jpg']);

    const hydrated = hydrateProjectState(serialized);
    expect(hydrated?.autofillImages).toEqual(['/local-image/a.jpg', '/local-image/a.jpg']);
    expect(hydrated?.collagePendingImages).toEqual(['/local-image/b.jpg']);

    const dbProject = projectFileToDomainProject(serialized, 'p-round-trip', 'Round Trip');
    const backToFile = domainProjectToProjectFile(dbProject);
    expect(backToFile.autofillImages).toEqual(['/local-image/a.jpg', '/local-image/a.jpg']);
    expect(backToFile.collagePendingImages).toEqual(['/local-image/b.jpg']);
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

  it('should cleanly map all 9 guide and ruler fields bidirectionally between domain.Project and ProjectFile', () => {
    const rawGuides = [
      { id: 'g-h1', type: 'h' as const, pos: 0.33 },
      { id: 'g-v1', type: 'v' as const, pos: 0.67 },
    ];
    const dbProj = new domain.Project({
      id: 'proj-guides-9',
      name: 'Guides Project',
      mode: 'single',
      canvasWidth: 2000,
      canvasHeight: 1500,
      backgroundColor: '#FFFFFF',
      elements: '[]',
      slots: '[]',
      template: '',
      collageTemplate: '',
      printSettings: '',
      showRuler: false,
      rulerUnit: 'cm',
      userGuides: JSON.stringify(rawGuides),
      showUserGuides: false,
      lockUserGuides: true,
      showBleedGuides: true,
      bleedMarginMM: 3.5,
      safeMarginMM: 1.5,
      cutShapeType: 'rounded-rect',
    });

    const file = domainProjectToProjectFile(dbProj);
    expect(file.showRuler).toBe(false);
    expect(file.rulerUnit).toBe('cm');
    expect(file.userGuides).toEqual(rawGuides);
    expect(file.showUserGuides).toBe(false);
    expect(file.lockUserGuides).toBe(true);
    expect(file.showBleedGuides).toBe(true);
    expect(file.bleedMarginMM).toBe(3.5);
    expect(file.safeMarginMM).toBe(1.5);
    expect(file.cutShapeType).toBe('rounded-rect');

    const mappedBack = projectFileToDomainProject(file, 'proj-guides-9', 'Guides Project');
    expect(mappedBack.showRuler).toBe(false);
    expect(mappedBack.rulerUnit).toBe('cm');
    expect(JSON.parse(mappedBack.userGuides)).toEqual(rawGuides);
    expect(mappedBack.showUserGuides).toBe(false);
    expect(mappedBack.lockUserGuides).toBe(true);
    expect(mappedBack.showBleedGuides).toBe(true);
    expect(mappedBack.bleedMarginMM).toBe(3.5);
    expect(mappedBack.safeMarginMM).toBe(1.5);
    expect(mappedBack.cutShapeType).toBe('rounded-rect');
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

  describe('hydrateProjectState and makeUniqueId unit tests', () => {
    it('makeUniqueId generates a candidate not in seen set and preserves base', () => {
      const seen = new Set<string>(['elem-dup-0-abc']);
      const id = makeUniqueId('elem', 0, seen);
      expect(id.startsWith('elem-dup-0-')).toBe(true);
      expect(seen.has(id)).toBe(false);
    });

    it('returns null on invalid or non-object project payload', () => {
      expect(hydrateProjectState(null as unknown as ProjectFileV1)).toBeNull();
      expect(hydrateProjectState(undefined as unknown as ProjectFileV1)).toBeNull();
      expect(hydrateProjectState('invalid' as unknown as ProjectFileV1)).toBeNull();
    });

    it('preserves a saved manual conversion of a built-in physical collage template', () => {
      const { physicalLayout: _physicalLayout, ...manualTemplate } = COLLAGE_TEMPLATES[0];
      const cells = [
        { x: 0.1, y: 0.15, w: 0.25, h: 0.3 },
        { x: 0.5, y: 0.15, w: 0.3, h: 0.3 },
      ];
      const project = {
        version: 1,
        mode: 'collage',
        canvasWidth: 1200,
        canvasHeight: 1600,
        backgroundColor: '#FFFFFF',
        elements: [],
        collageTemplate: { ...manualTemplate, slots: cells.length, cells },
        slots: cells.map((cell, cellIndex) => ({
          id: `manual-slot-${cellIndex}`,
          cellIndex,
          ...cell,
          filter: 'none',
          brightness: 100,
          contrast: 100,
          saturation: 100,
          zoom: 1,
          dragX: 0,
          dragY: 0,
        })),
      };

      const hydrated = hydrateProjectState(project as unknown as ProjectFileV1);

      expect(hydrated?.collageTemplate).toMatchObject({
        id: COLLAGE_TEMPLATES[0].id,
        slots: cells.length,
        cells,
      });
      expect(hydrated?.collageTemplate?.physicalLayout).toBeUndefined();
      expect(hydrated?.slots.map(({ x, y, w, h }) => ({ x, y, w, h }))).toEqual(cells);
    });

    it('preserves a zero saturation/brightness when reconciling legacy slots', () => {
      const tmpl = COLLAGE_TEMPLATES[0]; // قالب فيزيائي بـ 8 خلايا — العدد المحفوظ مختلف عمداً
      const project = {
        version: 1,
        mode: 'collage',
        canvasWidth: 2480,
        canvasHeight: 3508,
        backgroundColor: '#FFFFFF',
        elements: [],
        collageTemplate: tmpl,
        slots: [
          {
            id: 'legacy-slot',
            cellIndex: 0,
            x: 0,
            y: 0,
            w: 0.2,
            h: 0.2,
            filter: 'none',
            brightness: 0,
            contrast: 100,
            saturation: 0,
            zoom: 1,
            dragX: 0,
            dragY: 0,
          },
        ],
      };

      const hydrated = hydrateProjectState(project as unknown as ProjectFileV1);

      // القيمة الصفرية مشروعة (رمادي كامل/سطوع معدوم) — `|| 100` كان يمحوها إلى 100
      expect(hydrated?.slots[0]?.saturation).toBe(0);
      expect(hydrated?.slots[0]?.brightness).toBe(0);
      expect(hydrated?.slots[0]?.contrast).toBe(100);
    });

    it('deduplicates element IDs, slot IDs, and user guide IDs', () => {
      const project = {
        version: 1,
        mode: 'single',
        canvasWidth: 2480,
        canvasHeight: 3508,
        backgroundColor: '#FFFFFF',
        elements: [
          {
            id: 'dup-id',
            type: 'text',
            x: 0.1,
            y: 0.1,
            width: 0.2,
            height: 0.1,
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            text: 'A',
            fontSize: 20,
          },
          {
            id: 'dup-id',
            type: 'text',
            x: 0.3,
            y: 0.3,
            width: 0.2,
            height: 0.1,
            rotation: 0,
            opacity: 1,
            zIndex: 2,
            text: 'B',
            fontSize: 20,
          },
        ],
        slots: [
          {
            id: 'slot-dup',
            cellIndex: 0,
            x: 0,
            y: 0,
            w: 100,
            h: 100,
            filter: 'none',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            zoom: 1,
            dragX: 0,
            dragY: 0,
          },
          {
            id: 'slot-dup',
            cellIndex: 1,
            x: 100,
            y: 0,
            w: 100,
            h: 100,
            filter: 'none',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            zoom: 1,
            dragX: 0,
            dragY: 0,
          },
        ],
        userGuides: [
          { id: 'guide-dup', type: 'h', pos: 0.2 },
          { id: 'guide-dup', type: 'v', pos: 0.8 },
        ],
      };

      const hydrated = hydrateProjectState(project as unknown as ProjectFileV1, {
        projectId: 'test-p1',
      });
      expect(hydrated).not.toBeNull();
      expect(hydrated!.projectId).toBe('test-p1');
      expect(hydrated!.elements).toHaveLength(2);
      expect(hydrated!.elements[0].id).toBe('dup-id');
      expect(hydrated!.elements[1].id).not.toBe('dup-id');
      expect(hydrated!.elements[1].id.startsWith('dup-id-dup-1-')).toBe(true);

      expect(hydrated!.slots).toHaveLength(2);
      expect(hydrated!.slots[0].id).toBe('slot-dup');
      expect(hydrated!.slots[1].id).not.toBe('slot-dup');
      expect(hydrated!.slots[1].id.startsWith('slot-dup-dup-1-')).toBe(true);

      expect(hydrated!.userGuides).toHaveLength(2);
      expect(hydrated!.userGuides[0].id).toBe('guide-dup');
      expect(hydrated!.userGuides[1].id).not.toBe('guide-dup');
      expect(hydrated!.userGuides[1].id.startsWith('guide-dup-dup-1-')).toBe(true);
    });

    it('discards malformed elements, slots, and invalid user guides', () => {
      const project = {
        version: 1,
        mode: 'single',
        canvasWidth: -50,
        canvasHeight: 30000,
        backgroundColor: '#000000',
        elements: [
          {
            id: 'valid-el',
            type: 'text',
            x: 0.1,
            y: 0.1,
            width: 0.2,
            height: 0.1,
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            text: 'OK',
            fontSize: 16,
          },
          {
            id: 'nan-el',
            type: 'text',
            x: NaN,
            y: 0.1,
            width: 0.2,
            height: 0.1,
            rotation: 0,
            opacity: 1,
            zIndex: 2,
            text: 'Bad',
            fontSize: 16,
          },
          {
            id: 'zero-w-el',
            type: 'text',
            x: 0.1,
            y: 0.1,
            width: 0,
            height: 0.1,
            rotation: 0,
            opacity: 1,
            zIndex: 3,
            text: 'Bad',
            fontSize: 16,
          },
        ],
        slots: [
          {
            id: 'valid-slot',
            cellIndex: 0,
            x: 0,
            y: 0,
            w: 100,
            h: 100,
            filter: 'none',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            zoom: 1,
            dragX: 0,
            dragY: 0,
          },
          {
            id: 'neg-w-slot',
            cellIndex: 1,
            x: 0,
            y: 0,
            w: -50,
            h: 100,
            filter: 'none',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            zoom: 1,
            dragX: 0,
            dragY: 0,
          },
        ],
        userGuides: [
          { id: 'g-ok', type: 'h', pos: 0.4 },
          { id: 'g-bad-type', type: 'diag' as unknown as 'h', pos: 0.4 },
          { id: 'g-bad-pos', type: 'v', pos: 1.2 },
          { id: 'g-neg-pos', type: 'v', pos: -0.1 },
        ],
      };

      const hydrated = hydrateProjectState(project as unknown as ProjectFileV1);
      expect(hydrated).not.toBeNull();
      // Canvas dimensions clamped to defaults
      expect(hydrated!.canvasWidth).toBe(2480);
      expect(hydrated!.canvasHeight).toBe(3508);

      expect(hydrated!.elements).toHaveLength(1);
      expect(hydrated!.elements[0].id).toBe('valid-el');

      expect(hydrated!.slots).toHaveLength(1);
      expect(hydrated!.slots[0].id).toBe('valid-slot');

      expect(hydrated!.userGuides).toHaveLength(1);
      expect(hydrated!.userGuides[0].id).toBe('g-ok');
    });

    it('reconciles flipped paper width/height in legacy printSettings', () => {
      const project = {
        version: 1,
        mode: 'single',
        canvasWidth: 2480,
        canvasHeight: 3508,
        backgroundColor: '#FFFFFF',
        elements: [],
        slots: [],
        printSettings: {
          paperId: 'a4',
          paperWidthMM: 297,
          paperHeightMM: 210,
          marginMM: 5,
          dpi: 300,
          copiesPerSheet: 1,
          showCutLines: false,
          orientation: 'landscape',
        },
      };

      const hydrated = hydrateProjectState(project as unknown as ProjectFileV1);
      expect(hydrated).not.toBeNull();
      expect(hydrated!.printSettings.paperWidthMM).toBe(210);
      expect(hydrated!.printSettings.paperHeightMM).toBe(297);
    });
  });
});
