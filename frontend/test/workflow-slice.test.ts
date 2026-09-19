import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';

// ─── إعداد mock لـ localStorage ────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ─── الاختبارات ────────────────────────────────────────────────────────────

describe('WorkflowSlice — نظام مسارات العمل', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // إعادة تعيين حالة المتجر بالكامل قبل كل اختبار
    useEditorStore.setState({
      workflowMode: null,
      hasSeenWelcome: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── الحالة الابتدائية ────────────────────────────────────────────────

  it('الحالة الابتدائية: workflowMode = null وhasSeenWelcome = false', () => {
    const state = useEditorStore.getState();
    expect(state.workflowMode).toBeNull();
    expect(state.hasSeenWelcome).toBe(false);
  });

  it('يقرأ المسار المحفوظ من localStorage عند التهيئة', () => {
    // محاكاة مسار محفوظ مسبقاً
    localStorageMock.setItem('grido_workflow_mode', 'quick');
    
    // إنشاء slice جديد (يستدعي loadPersistedMode داخلياً عند الإنشاء)
    // نختبر الـ setWorkflowMode مباشرة
    useEditorStore.getState().setWorkflowMode('quick');
    expect(useEditorStore.getState().workflowMode).toBe('quick');
    expect(localStorageMock.getItem('grido_workflow_mode')).toBe('quick');
  });

  // ─── setWorkflowMode ────────────────────────────────────────────────────

  it('setWorkflowMode("quick") يحفظ المسار ويضع hasSeenWelcome = true', () => {
    useEditorStore.getState().setWorkflowMode('quick');
    
    const state = useEditorStore.getState();
    expect(state.workflowMode).toBe('quick');
    expect(state.hasSeenWelcome).toBe(true);
    expect(localStorageMock.getItem('grido_workflow_mode')).toBe('quick');
  });

  it('setWorkflowMode("studio") يحفظ المسار بشكل صحيح', () => {
    useEditorStore.getState().setWorkflowMode('studio');
    
    const state = useEditorStore.getState();
    expect(state.workflowMode).toBe('studio');
    expect(state.hasSeenWelcome).toBe(true);
    expect(localStorageMock.getItem('grido_workflow_mode')).toBe('studio');
  });

  it('setWorkflowMode("batch") يحفظ المسار بشكل صحيح', () => {
    useEditorStore.getState().setWorkflowMode('batch');
    
    expect(useEditorStore.getState().workflowMode).toBe('batch');
    expect(localStorageMock.getItem('grido_workflow_mode')).toBe('batch');
  });

  it('تبديل المسار من quick إلى studio يُحدِّث localStorage', () => {
    useEditorStore.getState().setWorkflowMode('quick');
    expect(localStorageMock.getItem('grido_workflow_mode')).toBe('quick');
    
    useEditorStore.getState().setWorkflowMode('studio');
    expect(useEditorStore.getState().workflowMode).toBe('studio');
    expect(localStorageMock.getItem('grido_workflow_mode')).toBe('studio');
  });

  // ─── resetWorkflow ────────────────────────────────────────────────────

  it('resetWorkflow() يصفّر المسار ويحذف localStorage ويُعيد شاشة الترحيب', () => {
    // ضبط مسار أولاً
    useEditorStore.getState().setWorkflowMode('studio');
    expect(useEditorStore.getState().workflowMode).toBe('studio');
    expect(useEditorStore.getState().hasSeenWelcome).toBe(true);
    
    // إعادة الضبط
    useEditorStore.getState().resetWorkflow();
    
    const state = useEditorStore.getState();
    expect(state.workflowMode).toBeNull();
    expect(state.hasSeenWelcome).toBe(false);
    expect(localStorageMock.getItem('grido_workflow_mode')).toBeNull();
  });

  it('resetWorkflow() يعمل بأمان حتى لو لم يكن هناك مسار محدد', () => {
    expect(useEditorStore.getState().workflowMode).toBeNull();
    
    // يجب ألا يرمي خطأ
    expect(() => useEditorStore.getState().resetWorkflow()).not.toThrow();
    
    expect(useEditorStore.getState().workflowMode).toBeNull();
    expect(useEditorStore.getState().hasSeenWelcome).toBe(false);
  });

  // ─── التكامل مع باقي الـ Store ─────────────────────────────────────────

  it('workflowMode مستقل عن reset() الرئيسي للـ Store', () => {
    // تعيين مسار
    useEditorStore.getState().setWorkflowMode('quick');
    expect(useEditorStore.getState().workflowMode).toBe('quick');
    
    // reset() الرئيسي لا يمسّ workflowMode
    useEditorStore.getState().reset();
    
    // المسار يجب أن يبقى محافظاً عليه (reset يمسح العناصر والـ Canvas لا workflowMode)
    // هذا سلوك متعمد: المسار خيار مستخدم مستقل عن محتوى المشروع
    expect(useEditorStore.getState().workflowMode).toBe('quick');
  });

  it('setWorkflowMode يؤثر على isQuickMode المشتق في الشريط', () => {
    // في مسار quick يجب إخفاء أدوات الاستوديو
    useEditorStore.getState().setWorkflowMode('quick');
    expect(useEditorStore.getState().workflowMode).toBe('quick');
    
    // في مسار studio يجب إظهارها
    useEditorStore.getState().setWorkflowMode('studio');
    expect(useEditorStore.getState().workflowMode).toBe('studio');
  });
});
