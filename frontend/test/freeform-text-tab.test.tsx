import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { FreeformTextTab } from '../src/components/editor/panels/freeform/freeform-text-tab';
import { useEditorStore } from '../src/lib/editor-store';

describe('FreeformTextTab', () => {
  beforeEach(() => {
    useEditorStore.setState({
      elements: [],
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
      canvasWidth: 1000,
      canvasHeight: 1000,
    });
  });

  it('renders only the professional typography and studio groups', () => {
    render(<FreeformTextTab />);

    expect(screen.getByText('أنماط النص')).toBeInTheDocument();
    expect(screen.getByText('توثيق الاستوديو')).toBeInTheDocument();
    expect(screen.getByTestId('element-add-text-heading')).toBeInTheDocument();
    expect(screen.getByTestId('element-add-text-watermark')).toBeInTheDocument();

    for (const label of [
      'عنوان رئيسي',
      'عنوان فرعي',
      'فقرة نصية',
      'تسمية',
      'تاريخ اليوم',
      'حقوق المصور',
      'علامة مائية',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    // لا نص معاينة ولا بيانات خط تقنية تحت التسميات — التسمية وحدها هي الصف
    expect(screen.queryByText('عنوان التصميم')).not.toBeInTheDocument();
    expect(screen.queryByText(/48px/)).not.toBeInTheDocument();
    expect(screen.queryByText('الكل')).not.toBeInTheDocument();
    expect(screen.queryByText('تأثيرات')).not.toBeInTheDocument();
    expect(screen.queryByTestId('element-add-preset-neon-glow')).not.toBeInTheDocument();
  });

  it('adds a plain text box and starts editing it immediately', () => {
    render(<FreeformTextTab />);

    fireEvent.click(screen.getByTestId('element-add-text-plain'));

    const state = useEditorStore.getState();
    expect(state.elements).toHaveLength(1);
    expect(state.elements[0]).toMatchObject({ type: 'text', text: 'نص جديد' });
    expect(state.editingTextId).toBe(state.elements[0].id);
  });

  it('inserts a typography preset when nothing is selected', () => {
    render(<FreeformTextTab />);

    fireEvent.click(screen.getByTestId('element-add-text-heading'));

    const state = useEditorStore.getState();
    expect(state.elements).toHaveLength(1);
    expect(state.elements[0]).toMatchObject({
      type: 'text',
      text: 'عنوان رئيسي',
      fontSize: 48,
      fontWeight: 800,
    });
    expect(state.editingTextId).toBeNull();
  });

  it('applies the style to the selected text without replacing its content', () => {
    useEditorStore.getState().addTextElement('نصي الحالي');
    render(<FreeformTextTab />);

    expect(screen.getByText('سيُطبَّق النمط على المحدد')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('element-add-text-body'));

    const state = useEditorStore.getState();
    expect(state.elements).toHaveLength(1);
    expect(state.elements[0]).toMatchObject({
      type: 'text',
      text: 'نصي الحالي',
      fontSize: 18,
      fontWeight: 400,
    });
  });

  it('inserts a new element from the plus action while a text is selected', () => {
    useEditorStore.getState().addTextElement('نصي الحالي');
    render(<FreeformTextTab />);

    fireEvent.click(screen.getByTestId('element-add-text-heading-new'));

    const state = useEditorStore.getState();
    expect(state.elements).toHaveLength(2);
    expect(state.elements[1]).toMatchObject({ type: 'text', text: 'عنوان رئيسي' });
    expect(state.elements[0]).toMatchObject({ type: 'text', text: 'نصي الحالي' });
  });

  it('always inserts studio blocks as new elements', () => {
    useEditorStore.getState().addTextElement('نصي الحالي');
    render(<FreeformTextTab />);

    fireEvent.click(screen.getByTestId('element-add-text-watermark'));

    const state = useEditorStore.getState();
    expect(state.elements).toHaveLength(2);
    expect(state.elements[1]).toMatchObject({ type: 'text', rotation: -35, opacity: 0.25 });
    expect(state.elements[0]).toMatchObject({ type: 'text', text: 'نصي الحالي' });
  });
});
