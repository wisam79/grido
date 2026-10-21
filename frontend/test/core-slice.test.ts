import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';

describe('CoreSlice Unit Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('sets mode correctly and resets selection', () => {
    useEditorStore.setState({ selectedId: 'slot-1', selectedIds: ['el-1', 'el-2'] });
    useEditorStore.getState().setMode('single');
    expect(useEditorStore.getState().mode).toBe('single');
    expect(useEditorStore.getState().selectedId).toBeNull();
    expect(useEditorStore.getState().selectedIds).toEqual([]);

    useEditorStore.setState({ selectedId: 'el-3', selectedIds: ['el-3'] });
    useEditorStore.getState().setMode('collage');
    expect(useEditorStore.getState().mode).toBe('collage');
    expect(useEditorStore.getState().selectedId).toBeNull();
    expect(useEditorStore.getState().selectedIds).toEqual([]);
  });

  it('sets canvas size correctly', () => {
    useEditorStore.getState().setCanvasSize(1200, 800);
    expect(useEditorStore.getState().canvasWidth).toBe(1200);
    expect(useEditorStore.getState().canvasHeight).toBe(800);
  });

  it('sets background color correctly', () => {
    useEditorStore.getState().setBackgroundColor('#FF0000');
    expect(useEditorStore.getState().backgroundColor).toBe('#FF0000');
  });

  it('sets last edited image and aspect ratio', () => {
    useEditorStore.getState().setLastEditedImage('img.png');
    expect(useEditorStore.getState().lastEditedImage).toBe('img.png');

    useEditorStore.getState().setLastEditedImageAspect(1.5);
    expect(useEditorStore.getState().lastEditedImageAspect).toBe(1.5);
  });

  it('resets state to defaults including clipboard and lastEditedImage', () => {
    useEditorStore.getState().setCanvasSize(500, 500);
    useEditorStore.getState().setBackgroundColor('#000000');
    useEditorStore.getState().setLastEditedImage('temp.jpg');
    useEditorStore.getState().setLastEditedImageAspect(1.2);
    useEditorStore.setState({
      clipboardElements: [{ id: '1', type: 'image', x: 0, y: 0, width: 100, height: 100 }] as any,
    });

    useEditorStore.getState().reset();

    expect(useEditorStore.getState().canvasWidth).toBe(2480);
    expect(useEditorStore.getState().backgroundColor).toBe('#FFFFFF');
    expect(useEditorStore.getState().lastEditedImage).toBeNull();
    expect(useEditorStore.getState().lastEditedImageAspect).toBeNull();
    expect(useEditorStore.getState().clipboardElements).toEqual([]);
  });

  it('loadProject clears clipboardElements and lastEditedImage from previous project', () => {
    useEditorStore.getState().setLastEditedImage('projectA.jpg');
    useEditorStore.setState({
      clipboardElements: [{ id: 'el-a' }] as any,
      isDirty: true,
      projectName: 'مشروع قديم',
    });

    useEditorStore.getState().loadProject(
      {
        version: 1,
        canvasWidth: 1920,
        canvasHeight: 1080,
        backgroundColor: '#FAFAFA',
        elements: [],
        slots: [],
      } as any,
      'proj-b',
      'مشروع ب',
    );

    expect(useEditorStore.getState().projectId).toBe('proj-b');
    expect(useEditorStore.getState().projectName).toBe('مشروع ب');
    expect(useEditorStore.getState().isDirty).toBe(false);
    expect(useEditorStore.getState().lastEditedImage).toBeNull();
    expect(useEditorStore.getState().clipboardElements).toEqual([]);
  });

  it('tracks project identity and dirty state across edits, saves, and reset', () => {
    const store = useEditorStore.getState();
    expect(store.projectName).toBeNull();
    expect(store.isDirty).toBe(false);

    // أي تعديل يُمرَّر عبر سجل التراجع يرفع علامة الحفظ
    store.addTextElement('تعديل غير محفوظ');
    expect(useEditorStore.getState().isDirty).toBe(true);

    // الحفظ يثبّت الهوية ويرفع العلامة
    useEditorStore.getState().markProjectSaved('proj-1', 'مشروع الهوية');
    let state = useEditorStore.getState();
    expect(state.projectId).toBe('proj-1');
    expect(state.projectName).toBe('مشروع الهوية');
    expect(state.isDirty).toBe(false);

    // تعديل لاحق يعيد العلامة
    useEditorStore.getState().setBackgroundColor('#111111');
    useEditorStore.getState().pushHistory();
    expect(useEditorStore.getState().isDirty).toBe(true);

    // مستند جديد يمسح الهوية والعلامة معاً
    useEditorStore.getState().reset();
    state = useEditorStore.getState();
    expect(state.projectId).toBeNull();
    expect(state.projectName).toBeNull();
    expect(state.isDirty).toBe(false);
  });

  it('updates zoom level via number or callback function', () => {
    useEditorStore.getState().setCanvasZoom(1.5);
    expect(useEditorStore.getState().canvasZoom).toBe(1.5);

    useEditorStore.getState().setCanvasZoom((prev) => prev * 2);
    expect(useEditorStore.getState().canvasZoom).toBe(3);
  });

  it('يحفظ وضع الملاءمة كتفضيل عرض ويبقى بعد reset (ليس جزءاً من المستند)', () => {
    localStorage.removeItem('grido_canvas_fit_mode_v1');

    useEditorStore.getState().setCanvasFitMode('width');
    expect(useEditorStore.getState().canvasFitMode).toBe('width');
    expect(localStorage.getItem('grido_canvas_fit_mode_v1')).toBe('width');

    // reset يعيد بيانات المستند فقط — تفضيل العرض يبقى كما اختاره المستخدم
    useEditorStore.getState().reset();
    expect(useEditorStore.getState().canvasFitMode).toBe('width');

    useEditorStore.getState().setCanvasFitMode('auto');
    expect(useEditorStore.getState().canvasFitMode).toBe('auto');
  });

  it('preserves elements without data loss when switching to collage mode even with empty slots', () => {
    useEditorStore.getState().setMode('single');
    useEditorStore.getState().addTextElement('Freeform Text Item');
    expect(useEditorStore.getState().elements.length).toBeGreaterThan(0);

    // محاكاة مشروع بخانات فارغة
    useEditorStore.setState({ slots: [] });

    // التبديل لوضع الكولاج
    useEditorStore.getState().setMode('collage');
    expect(useEditorStore.getState().mode).toBe('collage');
    // العناصر لا تُمسح بل تبقى سليمة في الذاكرة
    expect(useEditorStore.getState().elements.length).toBeGreaterThan(0);
    expect(useEditorStore.getState().elements[0].type).toBe('text');

    // العودة للوضع الفردي
    useEditorStore.getState().setMode('single');
    expect(useEditorStore.getState().elements.length).toBeGreaterThan(0);
  });
});
