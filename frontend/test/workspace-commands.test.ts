import { describe, it, expect, beforeEach } from 'vitest';

import { useEditorStore } from '../src/lib/editor-store';
import { WORKSPACE_STATE_COMMANDS } from '../src/lib/workspace-tools';

/**
 * سلوك أوامر لوحة الأدوات التي تكتب في المتجر مباشرة.
 *
 * ملف منفصل عن workspace-tools.test.ts عمداً: ذاك الملف يقيس العقود السطحية
 * للسجل ويغيّر حالة المتجر (تاريخ تراجع مصطنع) بلا استرجاع، وهذه الأوامر
 * تستدعي pushHistory فتنهار على تاريخ غير مكتمل. هنا نلتقط حالة المتجر
 * الأولى مرة واحدة ونعيدها قبل كل اختبار — عزل حقيقي بلا تسلسل هش.
 */
const pristineState = useEditorStore.getState();

const command = (id: string) => {
  const found = WORKSPACE_STATE_COMMANDS.find((c) => c.id === id);
  expect(found, `الأمر ${id} غير مسجّل في WORKSPACE_STATE_COMMANDS`).toBeDefined();
  return found!;
};

describe('أوامر لوحة الأدوات — كتابة حقيقية في المتجر', () => {
  beforeEach(() => {
    useEditorStore.setState(pristineState, true);
  });

  it('إدراج النص يضيف عنصراً نصياً ويحدّده ويفتح التحرير المباشر', () => {
    const before = useEditorStore.getState().elements.length;

    command('insert-text').getSnapshot().run();

    const elements = useEditorStore.getState().elements;
    const inserted = elements[elements.length - 1];
    expect(elements.length).toBe(before + 1);
    expect(inserted.type).toBe('text');
    expect(useEditorStore.getState().selectedId).toBe(inserted.id);
    expect(useEditorStore.getState().editingTextId).toBe(inserted.id);
  });

  it('إدراج المستطيل والدائرة يضيف شكلين بالنوع المطلوب', () => {
    const before = useEditorStore.getState().elements.length;

    command('insert-rect').getSnapshot().run();
    command('insert-ellipse').getSnapshot().run();

    const shapes = useEditorStore
      .getState()
      .elements.filter((el) => el.type === 'shape')
      .map((el) => (el as { shape?: string }).shape);
    expect(useEditorStore.getState().elements.length).toBe(before + 2);
    expect(shapes).toContain('rect');
    expect(shapes).toContain('ellipse');
  });

  it('أوامر الوضع تُحوّل فعلاً وتُعطّل نفسها في الوضع المفعّل', () => {
    const collage = command('mode-collage');
    const single = command('mode-single');

    useEditorStore.setState({ mode: 'single' });
    expect(single.getSnapshot().disabled).toBe(true);
    expect(single.getSnapshot().subtitle).toBe('هو الوضع الحالي');
    expect(collage.getSnapshot().disabled).toBe(false);

    collage.getSnapshot().run();
    expect(useEditorStore.getState().mode).toBe('collage');
    expect(collage.getSnapshot().disabled).toBe(true);
    expect(single.getSnapshot().disabled).toBe(false);

    single.getSnapshot().run();
    expect(useEditorStore.getState().mode).toBe('single');
    expect(single.getSnapshot().disabled).toBe(true);
  });
});
