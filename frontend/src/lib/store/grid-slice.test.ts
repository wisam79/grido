import { describe, it, expect, beforeEach } from 'vitest';

import { useEditorStore } from '../editor-store';

// تدقيق 2026-11-03 (Bug#2): الأدلة اليدوية ضمن SNAPSHOT_KEYS لكن إجراءاتها
// كانت لا تدفع السجل — فكان التراجع عن عملية لا صلة لها بالأدلة يمحوها أو
// يعيدها (خطوة إعادة إضافية). الإجراءات الأربعة تدفع السجل الآن.
describe('grid-slice user guides history', () => {
  beforeEach(() => {
    // reset يُفرغ الأدلة مباشرة بلا دفع سجل (core-slice reset يضبط userGuides: [])
    useEditorStore.getState().reset();
  });

  it('addUserGuide pushes history so undo removes the guide', () => {
    const guidesCountBefore = useEditorStore.getState().history.length;

    useEditorStore.getState().addUserGuide({ type: 'h', pos: 0.25 });
    expect(useEditorStore.getState().userGuides).toHaveLength(1);
    expect(useEditorStore.getState().history.length).toBe(guidesCountBefore + 1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().userGuides).toHaveLength(0);
  });

  it('updateUserGuide pushes history so undo restores the previous position', () => {
    useEditorStore.getState().addUserGuide({ type: 'v', pos: 0.3 });
    const guideId = useEditorStore.getState().userGuides[0].id;
    const historyAfterAdd = useEditorStore.getState().history.length;

    useEditorStore.getState().updateUserGuide(guideId, 0.7);
    expect(useEditorStore.getState().userGuides[0].pos).toBeCloseTo(0.7);
    expect(useEditorStore.getState().history.length).toBe(historyAfterAdd + 1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().userGuides[0].pos).toBeCloseTo(0.3);
  });

  it('removeUserGuide pushes history so undo restores the guide', () => {
    useEditorStore.getState().addUserGuide({ type: 'h', pos: 0.5 });
    const guideId = useEditorStore.getState().userGuides[0].id;
    const historyAfterAdd = useEditorStore.getState().history.length;

    useEditorStore.getState().removeUserGuide(guideId);
    expect(useEditorStore.getState().userGuides).toHaveLength(0);
    expect(useEditorStore.getState().history.length).toBe(historyAfterAdd + 1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().userGuides).toHaveLength(1);
    expect(useEditorStore.getState().userGuides[0].id).toBe(guideId);
  });

  it('clearUserGuides pushes history so undo restores all guides', () => {
    useEditorStore.getState().addUserGuide({ type: 'h', pos: 0.2 });
    useEditorStore.getState().addUserGuide({ type: 'v', pos: 0.8 });
    const historyAfterAdds = useEditorStore.getState().history.length;

    useEditorStore.getState().clearUserGuides();
    expect(useEditorStore.getState().userGuides).toHaveLength(0);
    expect(useEditorStore.getState().history.length).toBe(historyAfterAdds + 1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().userGuides).toHaveLength(2);
  });

  it('undoing an unrelated guide action leaves grid display flags untouched (Bug#2)', () => {
    // علامات عرض الشبكة أُخرجت من اللقطة: التراجع لا يعكسها
    useEditorStore.getState().setShowGrid(true);
    useEditorStore.getState().addUserGuide({ type: 'h', pos: 0.4 });

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().userGuides).toHaveLength(0);
    expect(useEditorStore.getState().showGrid).toBe(true);
  });
});
