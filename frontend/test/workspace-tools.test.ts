import { describe, it, expect } from "vitest";
import {
  COLLAGE_TOOLS,
  STUDIO_TOOLS,
  QUICK_COLLAGE_TOOLS,
  WORKSPACE_COMMANDS,
  WORKSPACE_STATE_COMMANDS,
  MAX_TOOL_SHORTCUTS,
  getCollageTool,
  getStudioTool,
  getToolsForWorkflow,
  getCollageToolsForWorkflow,
  getStateCommandGroups,
  groupCommands,
  groupTools,
  isCollageTab,
  isStudioTab,
  selectStateCommandInput,
  toolShortcut,
  type WorkspaceTool,
} from "../src/lib/workspace-tools";
import { useEditorStore } from "../src/lib/editor-store";

describe("سجل أدوات الشريط الجانبي", () => {
  it("يحتفظ بمعرّفات فريدة في كل وضع", () => {
    for (const tools of [COLLAGE_TOOLS, STUDIO_TOOLS]) {
      const ids = tools.map((tool) => tool.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("يمنح كل أداة عنواناً ووصفاً وأيقونة واختباراً — لا أدوات ناقصة الوصف", () => {
    for (const tool of [...COLLAGE_TOOLS, ...STUDIO_TOOLS]) {
      expect(tool.label.trim().length).toBeGreaterThan(0);
      expect(tool.title.trim().length).toBeGreaterThan(0);
      expect(tool.subtitle.trim().length).toBeGreaterThan(0);
      expect(tool.testId.startsWith("rail-")).toBe(true);
      expect(tool.icon).toBeTruthy();
    }
  });

  it("يبقى عدد الأدوات داخل حدود اختصارات Alt+1..Alt+9", () => {
    expect(COLLAGE_TOOLS.length).toBeLessThanOrEqual(9);
    expect(STUDIO_TOOLS.length).toBeLessThanOrEqual(9);
  });

  it("يُبني اختصار كل أداة من ترتيبها في السجل", () => {
    expect(toolShortcut(0)).toBe("Alt+1");
    expect(toolShortcut(8)).toBe("Alt+9");
  });

  it("يمنح كل أداة مجموعة غير فارغة", () => {
    expect(COLLAGE_TOOLS.every((tool) => tool.group.trim().length > 0)).toBe(true);
    expect(STUDIO_TOOLS.every((tool) => tool.group.trim().length > 0)).toBe(true);
  });

  /** التجميع لا يُسقط أداة ولا يغيّر ترتيبها، والإزاحة تحفظ رقم اختصار Alt */
  function expectGroupingPreservesOrder<T extends string>(tools: WorkspaceTool<T>[]) {
    const groups = groupTools(tools);
    // لا أدوات مفقودة ولا مكرّرة عند التجميع
    expect(groups.flatMap((group) => group.tools)).toEqual(tools);

    // لكل مجموعة اسم واحد فقط، والأسماء متجاورة بلا تكرار متقطّع
    const names = groups.map((group) => group.name);
    expect(new Set(names).size).toBe(names.length);

    // الإزاحة تحفظ رقم اختصار Alt لكل أداة بعد التجميع
    for (const group of groups) {
      for (const tool of group.tools) {
        expect(tools.indexOf(tool)).toBeGreaterThanOrEqual(group.offset);
      }
    }
  }

  it("يجمّع الأدوات تباعاً بلا فقدان أي أداة أو تغيير ترتيبها", () => {
    expectGroupingPreservesOrder(COLLAGE_TOOLS);
    expectGroupingPreservesOrder(STUDIO_TOOLS);
  });

  it("يرجع الأداة المطابقة، ويسقط على الأولى عند معرّف غير معروف", () => {
    expect(getCollageTool("paper").id).toBe("paper");
    expect(getStudioTool("library").id).toBe("library");
    // @ts-expect-error معرّف غير موجود فعلاً — يتأكد السلوك الاحتياطي
    expect(getCollageTool("nope").id).toBe(COLLAGE_TOOLS[0].id);
  });
});

describe("سجل الأوامر العامة (WORKSPACE_COMMANDS)", () => {
  it("يحتفظ بمعرفات فريدة لجميع الأوامر", () => {
    const ids = WORKSPACE_COMMANDS.map((cmd) => cmd.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("يحتوي كل أمر على عنوان ووصف ومجموعة وحدث grido:* سليم", () => {
    for (const cmd of WORKSPACE_COMMANDS) {
      expect(cmd.title.trim().length).toBeGreaterThan(0);
      expect(cmd.subtitle.trim().length).toBeGreaterThan(0);
      expect(cmd.group.trim().length).toBeGreaterThan(0);
      expect(cmd.event.startsWith("grido:")).toBe(true);
      if (cmd.shortcut) {
        expect(cmd.shortcut.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("أوامر الحالة الحية (WORKSPACE_STATE_COMMANDS)", () => {
  it("يحتفظ بمعرفات فريدة لجميع أوامر الحالة", () => {
    const ids = WORKSPACE_STATE_COMMANDS.map((cmd) => cmd.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("يحتوي كل أمر على عنوان ومجموعة ودالة getSnapshot صالحة", () => {
    for (const cmd of WORKSPACE_STATE_COMMANDS) {
      expect(cmd.title.trim().length).toBeGreaterThan(0);
      expect(cmd.group.trim().length).toBeGreaterThan(0);
      const snapshot = cmd.getSnapshot();
      expect(snapshot).toHaveProperty("subtitle");
      expect(snapshot).toHaveProperty("run");
      expect(typeof snapshot.run).toBe("function");
    }
  });

  it("يحسب خطوات التراجع بدقة ويعطل الأمر عند انعدام خطوات التراجع", () => {
    const undoCmd = WORKSPACE_STATE_COMMANDS.find((c) => c.id === "undo")!;
    expect(undoCmd).toBeDefined();

    // الحالة 1: لا توجد خطوات تراجع
    useEditorStore.setState({ historyIndex: 0 });
    let snapshot = undoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(true);
    expect(snapshot.subtitle).toBe("لا شيء للتراجع عنه");

    // الحالة 2: خطوة واحدة
    useEditorStore.setState({ historyIndex: 1 });
    snapshot = undoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe("خطوة واحدة محفوظة");

    // الحالة 3: أكثر من خطوة
    useEditorStore.setState({ historyIndex: 3 });
    snapshot = undoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe("3 خطوات محفوظة");
  });

  it("يحسب خطوات الإعادة بدقة ويعطل الأمر عندما نكون عند أحدث حالة", () => {
    const redoCmd = WORKSPACE_STATE_COMMANDS.find((c) => c.id === "redo")!;
    expect(redoCmd).toBeDefined();

    // تاريخ من 4 حالات، ونحن في آخر حالة (historyIndex = 3) -> لا إعادة ممكنة
    useEditorStore.setState({
      history: [{} as any, {} as any, {} as any, {} as any],
      historyIndex: 3,
    });
    let snapshot = redoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(true);
    expect(snapshot.subtitle).toBe("لا شيء لإعادته");

    // نحن في الحالة 2 -> خطوة إعادة واحدة
    useEditorStore.setState({ historyIndex: 2 });
    snapshot = redoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe("تستعيد خطوة واحدة");

    // نحن في الحالة 1 -> خطوتان للإعادة
    useEditorStore.setState({ historyIndex: 1 });
    snapshot = redoCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe("تستعيد 2 خطوات");
  });

  it("يعطل إعادة الضبط عند 100% ويفعلها عند اختلاف الزوم", () => {
    const resetCmd = WORKSPACE_STATE_COMMANDS.find((c) => c.id === "zoom-reset")!;
    expect(resetCmd).toBeDefined();

    useEditorStore.setState({ canvasZoom: 1 });
    let snapshot = resetCmd.getSnapshot();
    expect(snapshot.disabled).toBe(true);
    expect(snapshot.subtitle).toBe("أنت عند 100%");

    // فحص التقريب الآمن للفاصلة العائمة
    useEditorStore.setState({ canvasZoom: 1.001 });
    snapshot = resetCmd.getSnapshot();
    expect(snapshot.disabled).toBe(true);

    useEditorStore.setState({ canvasZoom: 1.5 });
    snapshot = resetCmd.getSnapshot();
    expect(snapshot.disabled).toBe(false);
    expect(snapshot.subtitle).toBe("الحالي 150%");
  });

  it("يتقيد بحدود الزوم الدنيا والقصوى (0.1 و 5.0)", () => {
    const zoomIn = WORKSPACE_STATE_COMMANDS.find((c) => c.id === "zoom-in")!;
    const zoomOut = WORKSPACE_STATE_COMMANDS.find((c) => c.id === "zoom-out")!;

    useEditorStore.setState({ canvasZoom: 5.0 });
    expect(zoomIn.getSnapshot().disabled).toBe(true);
    expect(zoomOut.getSnapshot().disabled).toBe(false);

    useEditorStore.setState({ canvasZoom: 0.1 });
    expect(zoomIn.getSnapshot().disabled).toBe(false);
    expect(zoomOut.getSnapshot().disabled).toBe(true);
  });

  it("يستخرج قيم الحالة المشتركة التي تبني عليها اللوحة لقطاتها", () => {
    useEditorStore.setState({ canvasZoom: 2, showRuler: true, showGrid: true });
    const state = useEditorStore.getState();
    expect(selectStateCommandInput(state)).toEqual({
      historyIndex: state.historyIndex,
      historyLength: state.history.length,
      canvasZoom: 2,
      canvasFitMode: state.canvasFitMode,
      showRuler: true,
      showGrid: true,
    });
  });

  it("يبني مجموعات أوامر الحالة بلقطاتها الحالية بلا فقدان أي أمر", () => {
    useEditorStore.setState({ canvasZoom: 1.5 });
    const groups = getStateCommandGroups();
    expect(groups.map((group) => group.name)).toEqual(["تحرير", "عرض الكانفاس"]);

    const items = groups.flatMap((group) => group.items);
    expect(items).toHaveLength(WORKSPACE_STATE_COMMANDS.length);
    const zoomInItem = items.find((item) => item.command.id === "zoom-in");
    expect(zoomInItem?.snapshot.subtitle).toBe("الحالي 150%");
  });

  it("يقرأ القيم الممرّرة (input) بدل المتجر فتتبع اللقطة الحالة الحقيقية", () => {
    useEditorStore.setState({ showRuler: false, showGrid: false });
    const rulers = WORKSPACE_STATE_COMMANDS.find((c) => c.id === "toggle-rulers")!;
    const grid = WORKSPACE_STATE_COMMANDS.find((c) => c.id === "toggle-grid")!;
    const input = {
      historyIndex: 0,
      historyLength: 1,
      canvasZoom: 1,
      canvasFitMode: "auto" as const,
      showRuler: true,
      showGrid: true,
    };

    expect(rulers.getSnapshot(input).subtitle).toBe("ظاهرة الآن — للإخفاء");
    expect(grid.getSnapshot(input).subtitle).toBe("ظاهرة الآن — للإخفاء");

    // بلا input يعود الأمر للقراءة من المتجر مباشرة
    expect(rulers.getSnapshot().subtitle).toBe("مخفية الآن — للإظهار");
    expect(grid.getSnapshot().subtitle).toBe("مخفية الآن — للإظهار");
  });
});

describe("قائمة الأدوات الموحّدة ومسار الإنتاج السريع", () => {
  it("يستثني أدوات الإنتاج السريع المتقدمة ويحفظ ترتيب السجل", () => {
    const ids = QUICK_COLLAGE_TOOLS.map((tool) => tool.id);
    expect(ids).toEqual(["custom", "presets", "paper", "autofill", "backdrop"]);
    // القائمة الفرعية تبقى بالترتيب نفسه، فأرقام Alt+الرقم لا تتغيّر
    expect(COLLAGE_TOOLS.filter((tool) => ids.includes(tool.id))).toEqual(QUICK_COLLAGE_TOOLS);
  });

  it("يختار القائمة حسب وضع الكانفاس ويبسّط الكولاج في مسار الإنتاج السريع فقط", () => {
    expect(getToolsForWorkflow("collage", "quick")).toBe(QUICK_COLLAGE_TOOLS);
    expect(getToolsForWorkflow("collage", "studio")).toBe(COLLAGE_TOOLS);
    expect(getToolsForWorkflow("collage", null)).toBe(COLLAGE_TOOLS);
    // وضع التعديل الحر يتبع الكانفاس دائماً ولا يُستبدل بأدوات الكولاج
    expect(getToolsForWorkflow("single", "quick")).toBe(STUDIO_TOOLS);
    expect(getCollageToolsForWorkflow("quick")).toBe(QUICK_COLLAGE_TOOLS);
    expect(getCollageToolsForWorkflow(null)).toBe(COLLAGE_TOOLS);
  });

  it("لا يمنح اختصاراً لأداة تتجاوز حد Alt+9", () => {
    expect(MAX_TOOL_SHORTCUTS).toBe(9);
    expect(toolShortcut(MAX_TOOL_SHORTCUTS - 1)).toBe("Alt+9");
    expect(toolShortcut(MAX_TOOL_SHORTCUTS)).toBe("");
    expect(toolShortcut(-1)).toBe("");
  });

  it("يرفض تبويباً محذوفاً أو قيمة محفوظة قديمة", () => {
    expect(isCollageTab("paper")).toBe(true);
    expect(isStudioTab("layers")).toBe(true);
    expect(isCollageTab("elements")).toBe(false);
    expect(isStudioTab("elements")).toBe(false);
    expect(isStudioTab(undefined)).toBe(false);
    expect(isCollageTab(null)).toBe(false);
    expect(isStudioTab(7)).toBe(false);
  });
});

describe("تجميع أوامر لوحة الأوامر", () => {
  /** لا أمر مفقود ولا مكرّر، والعناوين متجاورة بترتيب أول ظهور لها */
  function expectGroupingKeepsEveryItem<T extends { group: string }>(items: T[]) {
    const groups = groupCommands(items);
    expect(groups.flatMap((group) => group.items)).toEqual(items);

    const names = groups.map((group) => group.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([...new Set(items.map((item) => item.group))]);
  }

  it("يعرض أوامر الحالة تحت عناوين مجموعاتها الحقيقية", () => {
    expectGroupingKeepsEveryItem(WORKSPACE_STATE_COMMANDS);
    expect(groupCommands(WORKSPACE_STATE_COMMANDS).map((group) => group.name)).toEqual([
      "تحرير",
      "عرض الكانفاس",
    ]);
  });

  it("يجمع الأوامر العالمية بلا فقدان أي أمر", () => {
    expectGroupingKeepsEveryItem(WORKSPACE_COMMANDS);
  });
});
