import { describe, it, expect } from "vitest";
import {
  COLLAGE_TOOLS,
  STUDIO_TOOLS,
  getCollageTool,
  getStudioTool,
  groupTools,
  toolShortcut,
  type WorkspaceTool,
} from "../src/lib/workspace-tools";

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
