import { describe, it, expect } from 'vitest';

import { Layer } from '../src/components/ui/icons';
import { useEditorStore } from '../src/lib/editor-store';
import {
  COLLAGE_SECTIONS,
  COLLAGE_TOOLS,
  STUDIO_SECTIONS,
  STUDIO_TOOLS,
  WORKSPACE_COMMANDS,
  WORKSPACE_STATE_COMMANDS,
  MAX_TOOL_SHORTCUTS,
  getCollageSectionForTab,
  getCollageTool,
  getDefaultStudioTab,
  getSectionsForWorkflow,
  getStateCommandGroups,
  getStudioSectionForTab,
  getStudioTool,
  getStudioSectionsForWorkflow,
  groupCommands,
  isCollageTab,
  isStudioTab,
  migrateLegacyStudioTab,
  selectStateCommandInput,
  toolShortcut,
} from '../src/lib/workspace-tools';

describe('سجل تبويبات الشريط الجانبي', () => {
  it('يحتفظ بمعرّفات فريدة في كل وضع', () => {
    for (const tools of [COLLAGE_TOOLS, STUDIO_TOOLS]) {
      const ids = tools.map((tool) => tool.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('يمنح كل تبويب تسمية قصيرة وعنواناً ووصفاً وأيقونة واختباراً', () => {
    for (const tool of [...COLLAGE_TOOLS, ...STUDIO_TOOLS]) {
      expect(tool.label.trim().length).toBeGreaterThan(0);
      expect(tool.title.trim().length).toBeGreaterThan(0);
      expect(tool.subtitle.trim().length).toBeGreaterThan(0);
      expect(tool.testId.startsWith('tab-')).toBe(true);
      expect(tool.icon).toBeTruthy();
    }
  });

  it('يبقى عدد التبويبات داخل حدود اختصارات Alt+1..Alt+9', () => {
    expect(COLLAGE_TOOLS.length).toBeLessThanOrEqual(9);
    expect(STUDIO_TOOLS.length).toBeLessThanOrEqual(9);
  });

  it('يُبني اختصار كل وجهة من ترتيبها في السجل', () => {
    expect(toolShortcut(0)).toBe('Alt+1');
    expect(toolShortcut(8)).toBe('Alt+9');
  });

  it('يعرض «الملصقات» أولاً في الاستوديو و«الشبكة» أولاً في الكولاج', () => {
    expect(STUDIO_TOOLS[0].id).toBe('stickers');
    expect(COLLAGE_TOOLS[0].id).toBe('custom');
  });

  it('يرجع التبويب المطابق، ويسقط على الأول عند معرّف غير معروف', () => {
    expect(getCollageTool('paper').id).toBe('paper');
    expect(getStudioTool('layers').id).toBe('layers');
    // @ts-expect-error معرّف غير موجود فعلاً — يتأكد السلوك الاحتياطي
    expect(getCollageTool('nope').id).toBe(COLLAGE_TOOLS[0].id);
    // @ts-expect-error «القوالب» حُذفت من الاستوديو — تسقط على «الملصقات»
    expect(getStudioTool('presets').id).toBe(STUDIO_TOOLS[0].id);
  });
});

describe('سجل وجهات الشريط الجانبي', () => {
  it('يعرّف وجهات دائمة بمعرّفات فريدة لكل وضع', () => {
    expect(STUDIO_SECTIONS).toHaveLength(4);
    expect(COLLAGE_SECTIONS).toHaveLength(3);
    for (const sections of [COLLAGE_SECTIONS, STUDIO_SECTIONS]) {
      const ids = sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(sections.length);
      expect(sections.every((section) => section.testId.startsWith('rail-'))).toBe(true);
      expect(sections.every((section) => section.label.trim().length > 0)).toBe(true);
      expect(sections.every((section) => section.title.trim().length > 0)).toBe(true);
    }
  });

  it('يحتوي كل وجهة على تبويبات غير فارغة وتبويب افتراضي منها', () => {
    for (const section of [...COLLAGE_SECTIONS, ...STUDIO_SECTIONS]) {
      expect(section.tabs.length).toBeGreaterThan(0);
      expect(section.tabs.some((tab) => tab.id === section.defaultTab)).toBe(true);
    }
  });

  it('يوزّع كل تبويب على وجهة واحدة بلا فقدان أو تكرار', () => {
    for (const [tools, sections] of [
      [COLLAGE_TOOLS, COLLAGE_SECTIONS],
      [STUDIO_TOOLS, STUDIO_SECTIONS],
    ] as const) {
      const sectionTabIds = sections.flatMap((section) => section.tabs.map((tab) => tab.id));
      // ترتيب الوجهات مختلف عن ترتيب السجل، فالمقارنة بالمجموعة لا بالتسلسل
      expect([...sectionTabIds].sort()).toEqual(tools.map((tool) => tool.id).sort());
    }
  });

  it('يمنح كل أداة إدراج وجهة مستقلة في شريط الأيقونات', () => {
    expect(STUDIO_SECTIONS.map((section) => section.id)).toEqual([
      'layers',
      'stickers',
      'shapes',
      'text',
    ]);
    // أيقونة الطبقات في الشريط هي نفسها المستخدمة داخل اللوح
    expect(STUDIO_SECTIONS[0].icon).toBe(Layer);
    expect(STUDIO_SECTIONS.map((section) => section.testId)).toEqual([
      'rail-studio-layers',
      'rail-studio-stickers',
      'rail-studio-shapes',
      'rail-studio-text',
    ]);
    for (const section of STUDIO_SECTIONS) {
      expect(section.tabs.map((tab) => tab.id)).toEqual([section.id]);
      expect(section.defaultTab).toBe(section.id);
    }
  });

  it('يرتّب وجهات الكولاج: الشبكة ← الخانات ← القص', () => {
    expect(COLLAGE_SECTIONS.map((section) => section.id)).toEqual(['grid', 'slots', 'paper']);
    expect(COLLAGE_SECTIONS[0].tabs.map((tab) => tab.id)).toEqual([
      'custom',
      'presets',
      'freeform',
    ]);
    expect(COLLAGE_SECTIONS[1].tabs.map((tab) => tab.id)).toEqual(['autofill', 'arrange']);
    expect(COLLAGE_SECTIONS[2].tabs.map((tab) => tab.id)).toEqual(['paper']);
  });

  it('يُبقي زر الوجهة مضاءً حسب التبويب النشط', () => {
    expect(getStudioSectionForTab('layers').id).toBe('layers');
    expect(getStudioSectionForTab('stickers').id).toBe('stickers');
    expect(getStudioSectionForTab('shapes').id).toBe('shapes');
    expect(getStudioSectionForTab('text').id).toBe('text');
    expect(getCollageSectionForTab('freeform').id).toBe('grid');
    expect(getCollageSectionForTab('arrange').id).toBe('slots');
    expect(getCollageSectionForTab('paper').id).toBe('paper');
  });

  it('يبدأ مسار الإنتاج السريع من «الطبقات» مع إبقاء أدوات الإدراج متاحة', () => {
    const quickSections = getStudioSectionsForWorkflow('quick');
    expect(quickSections).toBe(STUDIO_SECTIONS);
    expect(quickSections.map((section) => section.id)).toEqual([
      'layers',
      'stickers',
      'shapes',
      'text',
    ]);
    expect(getDefaultStudioTab('quick')).toBe('layers');
    expect(getDefaultStudioTab('studio')).toBe('stickers');
    for (const tool of ['stickers', 'shapes', 'text']) {
      expect(quickSections.some((section) => section.id === tool)).toBe(true);
    }
  });

  it('لا يغيّر مسار العمل وجهات الكولاج', () => {
    expect(getSectionsForWorkflow('collage', 'quick')).toBe(COLLAGE_SECTIONS);
    expect(getSectionsForWorkflow('collage', 'studio')).toBe(COLLAGE_SECTIONS);
    expect(getSectionsForWorkflow('single', 'studio')).toBe(STUDIO_SECTIONS);
  });
});

describe('سجل الأوامر العامة (WORKSPACE_COMMANDS)', () => {
  it('يحتفظ بمعرفات فريدة لجميع الأوامر', () => {
    const ids = WORKSPACE_COMMANDS.map((cmd) => cmd.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('يحتوي كل أمر على عنوان ووصف ومجموعة وحدث grido:* سليم', () => {
    for (const cmd of WORKSPACE_COMMANDS) {
      expect(cmd.title.trim().length).toBeGreaterThan(0);
      expect(cmd.subtitle.trim().length).toBeGreaterThan(0);
      expect(cmd.group.trim().length).toBeGreaterThan(0);
      expect(cmd.event.startsWith('grido:')).toBe(true);
      if (cmd.shortcut) {
        expect(cmd.shortcut.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('أوامر الحالة الحية (WORKSPACE_STATE_COMMANDS)', () => {
  it('يحتفظ بمعرفات فريدة لجميع أوامر الحالة', () => {
    const ids = WORKSPACE_STATE_COMMANDS.map((cmd) => cmd.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('يحتوي كل أمر على عنوان ومجموعة ودالة getSnapshot صالحة', () => {
    for (const cmd of WORKSPACE_STATE_COMMANDS) {
      expect(cmd.title.trim().length).toBeGreaterThan(0);
      expect(cmd.group.trim().length).toBeGreaterThan(0);
      const snapshot = cmd.getSnapshot();
      expect(snapshot).toHaveProperty('subtitle');
      expect(snapshot).toHaveProperty('run');
      expect(typeof snapshot.run).toBe('function');
    }
  });

  it('يحسب خطوات التراجع بدقة ويعطل الأمر عند انعدام خطوات التراجع', () => {
    const undoCmd = WORKSPACE_STATE_COMMANDS.find((c) => c.id === 'undo')!;
    expect(undoCmd).toBeDefined();

    // الحالة 1: لا توجد خطوات تراجع
    useEditorStore.setState({ historyIndex: 0 });
    let snapshot = undoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(true);
    expect(snapshot.subtitle).toBe('لا شيء للتراجع عنه');

    // الحالة 2: خطوة واحدة
    useEditorStore.setState({ historyIndex: 1 });
    snapshot = undoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe('خطوة واحدة محفوظة');

    // الحالة 3: أكثر من خطوة
    useEditorStore.setState({ historyIndex: 3 });
    snapshot = undoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe('3 خطوات محفوظة');
  });

  it('يحسب خطوات الإعادة بدقة ويعطل الأمر عندما نكون عند أحدث حالة', () => {
    const redoCmd = WORKSPACE_STATE_COMMANDS.find((c) => c.id === 'redo')!;
    expect(redoCmd).toBeDefined();

    // تاريخ من 4 حالات، ونحن في آخر حالة (historyIndex = 3) -> لا إعادة ممكنة
    useEditorStore.setState({
      history: [{} as any, {} as any, {} as any, {} as any],
      historyIndex: 3,
    });
    let snapshot = redoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(true);
    expect(snapshot.subtitle).toBe('لا شيء لإعادته');

    // نحن في الحالة 2 -> خطوة إعادة واحدة
    useEditorStore.setState({ historyIndex: 2 });
    snapshot = redoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe('تستعيد خطوة واحدة');

    // نحن في الحالة 1 -> خطوتان للإعادة
    useEditorStore.setState({ historyIndex: 1 });
    snapshot = redoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe('تستعيد 2 خطوات');
  });

  it('يعطل إعادة الضبط عند 100% ويفعلها عند اختلاف الزوم', () => {
    const resetCmd = WORKSPACE_STATE_COMMANDS.find((c) => c.id === 'zoom-reset')!;
    expect(resetCmd).toBeDefined();

    useEditorStore.setState({ canvasZoom: 1 });
    let snapshot = resetCmd.getSnapshot();
    expect(snapshot.disabled).toBe(true);
    expect(snapshot.subtitle).toBe('أنت عند 100%');

    // فحص التقريب الآمن للفاصلة العائمة
    useEditorStore.setState({ canvasZoom: 1.001 });
    snapshot = resetCmd.getSnapshot();
    expect(snapshot.disabled).toBe(true);

    useEditorStore.setState({ canvasZoom: 1.5 });
    snapshot = resetCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe('الحالي 150%');
  });

  it('يتقيد بحدود الزوم الدنيا والقصوى (0.1 و 5.0)', () => {
    const zoomIn = WORKSPACE_STATE_COMMANDS.find((c) => c.id === 'zoom-in')!;
    const zoomOut = WORKSPACE_STATE_COMMANDS.find((c) => c.id === 'zoom-out')!;

    useEditorStore.setState({ canvasZoom: 5.0 });
    expect(zoomIn.getSnapshot().disabled).toBe(true);
    expect(zoomOut.getSnapshot().disabled).toBe(false);

    useEditorStore.setState({ canvasZoom: 0.1 });
    expect(zoomIn.getSnapshot().disabled).toBe(false);
    expect(zoomOut.getSnapshot().disabled).toBe(true);
  });

  it('يستخرج قيم الحالة المشتركة التي تبني عليها اللوحة لقطاتها', () => {
    useEditorStore.setState({ canvasZoom: 2, showRuler: true, showGrid: true });
    const state = useEditorStore.getState();
    expect(selectStateCommandInput(state)).toEqual({
      historyIndex: state.historyIndex,
      historyLength: state.history.length,
      canvasZoom: 2,
      canvasFitMode: state.canvasFitMode,
      showRuler: true,
      showGrid: true,
      mode: state.mode,
      workflow: state.workflow,
    });
  });

  it('يبني مجموعات أوامر الحالة بلقطاتها الحالية بلا فقدان أي أمر', () => {
    useEditorStore.setState({ canvasZoom: 1.5 });
    const groups = getStateCommandGroups();
    expect(groups.map((group) => group.name)).toEqual([
      'تحرير',
      'عرض الكانفاس',
      'إدراج',
      'وضع الكانفاس',
      'مسار العمل',
    ]);

    const items = groups.flatMap((group) => group.items);
    expect(items).toHaveLength(WORKSPACE_STATE_COMMANDS.length);
    const zoomInItem = items.find((item) => item.command.id === 'zoom-in');
    expect(zoomInItem?.snapshot.subtitle).toBe('الحالي 150%');
  });

  it('يقرأ القيم الممرّرة (input) بدل المتجر فتتبع اللقطة الحالة الحقيقية', () => {
    useEditorStore.setState({ showRuler: false, showGrid: false });
    const rulers = WORKSPACE_STATE_COMMANDS.find((c) => c.id === 'toggle-rulers')!;
    const grid = WORKSPACE_STATE_COMMANDS.find((c) => c.id === 'toggle-grid')!;
    const input = {
      historyIndex: 0,
      historyLength: 1,
      canvasZoom: 1,
      canvasFitMode: 'auto' as const,
      showRuler: true,
      showGrid: true,
      mode: 'single' as const,
      workflow: 'studio' as const,
    };

    expect(rulers.getSnapshot(input).subtitle).toBe('ظاهرة الآن — للإخفاء');
    expect(grid.getSnapshot(input).subtitle).toBe('ظاهرة الآن — للإخفاء');

    // بلا input يعود الأمر للقراءة من المتجر مباشرة
    expect(rulers.getSnapshot().subtitle).toBe('مخفية الآن — للإظهار');
    expect(grid.getSnapshot().subtitle).toBe('مخفية الآن — للإظهار');
  });
});

describe('قائمة الوجهات الموحّدة حسب وضع الكانفاس', () => {
  it('يرجع وجهات الكولاج الكاملة عند وضع collage', () => {
    expect(getSectionsForWorkflow('collage')).toBe(COLLAGE_SECTIONS);
    expect(getSectionsForWorkflow('collage', 'quick')).toBe(COLLAGE_SECTIONS);
  });

  it('يرجع وجهات التعديل الحر الأربعة نفسها في مساري العمل', () => {
    expect(getSectionsForWorkflow('single', 'studio')).toBe(STUDIO_SECTIONS);
    expect(getSectionsForWorkflow('single', 'quick')).toBe(STUDIO_SECTIONS);
  });

  it('لا يمنح اختصاراً لأداة تتجاوز حد Alt+9', () => {
    expect(MAX_TOOL_SHORTCUTS).toBe(9);
    expect(toolShortcut(MAX_TOOL_SHORTCUTS - 1)).toBe('Alt+9');
    expect(toolShortcut(MAX_TOOL_SHORTCUTS)).toBe('');
    expect(toolShortcut(-1)).toBe('');
  });

  it('يرفض تبويباً محذوفاً أو قيمة محفوظة قديمة', () => {
    expect(isCollageTab('paper')).toBe(true);
    expect(isStudioTab('layers')).toBe(true);
    expect(isStudioTab('stickers')).toBe(true);
    expect(isStudioTab('shapes')).toBe(true);
    expect(isStudioTab('text')).toBe(true);
    expect(isCollageTab('elements')).toBe(false);
    expect(isStudioTab('elements')).toBe(false);
    expect(isStudioTab('presets')).toBe(false);
    expect(isCollageTab('backdrop')).toBe(false);
    expect(isStudioTab(undefined)).toBe(false);
    expect(isCollageTab(null)).toBe(false);
    expect(isStudioTab(7)).toBe(false);
  });

  it('يرحّل التبويبات الموحّدة والمحذوفة إلى «الملصقات» ويُبقي الصالحة', () => {
    expect(migrateLegacyStudioTab('elements')).toBe('stickers');
    expect(migrateLegacyStudioTab('presets')).toBe('stickers');
    expect(migrateLegacyStudioTab('stickers')).toBeNull();
    expect(migrateLegacyStudioTab('shapes')).toBeNull();
    expect(migrateLegacyStudioTab('text')).toBeNull();
    expect(migrateLegacyStudioTab('layers')).toBeNull();
  });
});

describe('تجميع أوامر لوحة الأوامر', () => {
  /** لا أمر مفقود ولا مكرّر، والعناوين متجاورة بترتيب أول ظهور لها */
  function expectGroupingKeepsEveryItem<T extends { group: string }>(items: T[]) {
    const groups = groupCommands(items);
    expect(groups.flatMap((group) => group.items)).toEqual(items);

    const names = groups.map((group) => group.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([...new Set(items.map((item) => item.group))]);
  }

  it('يعرض أوامر الحالة تحت عناوين مجموعاتها الحقيقية', () => {
    expectGroupingKeepsEveryItem(WORKSPACE_STATE_COMMANDS);
    expect(groupCommands(WORKSPACE_STATE_COMMANDS).map((group) => group.name)).toEqual([
      'تحرير',
      'عرض الكانفاس',
      'إدراج',
      'وضع الكانفاس',
      'مسار العمل',
    ]);
  });

  it('يجمع الأوامر العالمية بلا فقدان أي أمر', () => {
    expectGroupingKeepsEveryItem(WORKSPACE_COMMANDS);
  });
});

describe('أوامر اللوحة الجديدة — لا أمر ميت ولا تنفيذ موازٍ', () => {
  const stateCommand = (id: string) => {
    const command = WORKSPACE_STATE_COMMANDS.find((c) => c.id === id);
    expect(command, `الأمر ${id} غير مسجّل في سجل أوامر الحالة`).toBeDefined();
    return command!;
  };

  it('أوامر الإدراج والوضع مسجّلة هنا بمعرّفات صحيحة', () => {
    // السلوك الفعلي (كتابة المتجر) مُختبر في workspace-commands.test.ts بعزل
    // كامل للمتجر؛ وهنا يُقفل العقد السطحي فقط: المعرّف موجود وله لقطة صالحة.
    for (const id of [
      'insert-text',
      'insert-rect',
      'insert-ellipse',
      'mode-collage',
      'mode-single',
    ]) {
      const snapshot = stateCommand(id).getSnapshot();
      expect(snapshot.subtitle.trim().length).toBeGreaterThan(0);
      expect(typeof snapshot.run).toBe('function');
    }
  });

  it('أوامر النظام تُنفَّذ بأحداث grido الحقيقية بلا اختصارات مُدّعاة', () => {
    const theme = WORKSPACE_COMMANDS.find((c) => c.id === 'toggle-theme');
    expect(theme?.event).toBe('grido:toggle-theme');
    expect(theme?.shortcut).toBeUndefined();

    const account = WORKSPACE_COMMANDS.find((c) => c.id === 'account');
    expect(account?.event).toBe('grido:open-account');
    expect(account?.shortcut).toBeUndefined();

    const library = WORKSPACE_COMMANDS.find((c) => c.id === 'projects-library');
    expect(library?.event).toBe('grido:open-projects-dialog');
    expect(library?.detail).toEqual({ tab: 'list' });
  });

  it('معرّفات الأوامر فريدة عبر السجلين', () => {
    const ids = [
      ...WORKSPACE_COMMANDS.map((c) => c.id),
      ...WORKSPACE_STATE_COMMANDS.map((c) => c.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
