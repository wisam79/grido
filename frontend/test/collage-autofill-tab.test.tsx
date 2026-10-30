import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CollageAutofillTab } from '../src/components/editor/panels/collage/collage-autofill-tab';
import { useEditorStore } from '../src/lib/editor-store';

import type { CanvasSlot } from '../src/lib/store/types';

const { openImageFileDialogMock } = vi.hoisted(() => ({
  openImageFileDialogMock: vi.fn(),
}));

vi.mock('../src/lib/io/file-dialog-utils', () => ({
  openImageFileDialog: openImageFileDialogMock,
  openDirectoryImageDialog: vi.fn(),
}));

/**
 * تبويب تعبئة الخانات — الانحدارات التي تحرسها هذه الاختبارات:
 *  1. الترتيب يجب أن يكون هندسياً (x/y) لا بحسب cellIndex.
 *  2. المعاينة يجب أن تعرض ترتيب التعبئة قبل التطبيق، لا أن توزّع أعمى.
 *  3. بلا تكرار: الخانات الناقصة تبقى فارغة بإحصاء صريح بدل تكرار صور.
 *  4. قائمة المصدر: حذف، إعادة ترتيب بلوحة المفاتيح، عرض الكل بعد 24 صورة.
 *  5. إعادة تطبيق نفس التوزيع لا تملأ سجل التراجع.
 */

const store = () => useEditorStore.getState();

const slot = (i: number, x: number, y: number, src?: string): CanvasSlot => ({
  id: `s${i}`,
  cellIndex: i,
  x,
  y,
  w: 0.5,
  h: 0.5,
  imageSrc: src,
});

function setupGrid(sources: (string | undefined)[] = ['A', 'B', undefined, undefined]) {
  store().reset();
  useEditorStore.setState({
    mode: 'collage',
    canvasWidth: 2480,
    canvasHeight: 3508,
    slots: [
      slot(0, 0, 0, sources[0]),
      slot(1, 0.5, 0, sources[1]),
      slot(2, 0, 0.5, sources[2]),
      slot(3, 0.5, 0.5, sources[3]),
    ],
    autofillImages: [],
  });
}

const renderTab = () => render(<CollageAutofillTab />);
const applyButton = () => screen.getByLabelText('توزيع الصور على الخانات');
const imageSrcs = () => store().slots.map((s) => s.imageSrc);

beforeEach(() => {
  store().reset();
  openImageFileDialogMock.mockReset();
});

describe('CollageAutofillTab — خريطة النتيجة', () => {
  it('تعرض ترتيب التعبئة على الخانات المستهدفة وتبقي الممتلئة باهتة', () => {
    setupGrid();
    useEditorStore.setState({ autofillImages: ['X', 'Y'] });
    renderTab();

    expect(screen.getByTestId('autofill-grid-preview').children).toHaveLength(4);
    expect(screen.getByTestId('autofill-cell-s2')).toHaveAttribute('data-order', '1');
    expect(screen.getByTestId('autofill-cell-s3')).toHaveAttribute('data-order', '2');
    expect(screen.getByTestId('autofill-cell-s0')).not.toHaveAttribute('data-order');
    expect(screen.getByText(/تُملأ 2 · تبقى 2/)).toBeInTheDocument();
  });

  it('تحترم الهندسة لا cellIndex عند الترتيب', () => {
    store().reset();
    useEditorStore.setState({
      mode: 'collage',
      slots: [
        { ...slot(0, 0.5, 0), id: 'right', cellIndex: 99 },
        { ...slot(1, 0, 0), id: 'left', cellIndex: 0 },
      ],
      autofillImages: ['X', 'Y'],
    });
    renderTab();

    expect(screen.getByTestId('autofill-cell-left')).toHaveAttribute('data-order', '1');
    expect(screen.getByTestId('autofill-cell-right')).toHaveAttribute('data-order', '2');
  });

  it('تُظهر تحذير الخانات المتبقية بلا صورة عند إيقاف التكرار', () => {
    setupGrid();
    useEditorStore.setState({ autofillImages: ['X'] });
    renderTab();

    fireEvent.click(screen.getByRole('switch', { name: 'تكرار الصور' }));

    expect(screen.getByText(/ستبقى خانة واحدة بلا صورة/)).toBeInTheDocument();
    expect(screen.getByText(/· بلا صورة 1/)).toBeInTheDocument();
    expect(screen.getByTestId('autofill-cell-s3')).toHaveAttribute(
      'aria-label',
      'خانة 4 — بلا صورة',
    );
  });
});

describe('CollageAutofillTab — التطبيق', () => {
  it('يوزّع على الخانات الفارغة فقط ويحفظ الممتلئة', () => {
    setupGrid();
    useEditorStore.setState({ autofillImages: ['X', 'Y'] });
    renderTab();

    const before = store().history.length;
    fireEvent.click(applyButton());

    expect(imageSrcs()).toEqual(['A', 'B', 'X', 'Y']);
    expect(store().history.length).toBe(before + 1);
  });

  it('بلا تكرار: يترك الخانات الزائدة فارغة ولا يكرر الصور', () => {
    setupGrid();
    useEditorStore.setState({ autofillImages: ['X'] });
    renderTab();

    fireEvent.click(screen.getByRole('switch', { name: 'تكرار الصور' }));
    fireEvent.click(applyButton());

    expect(imageSrcs()).toEqual(['A', 'B', 'X', undefined]);
  });

  it('مع التكرار: يوزّع دورياً على كل الخانات الفارغة', () => {
    setupGrid();
    useEditorStore.setState({ autofillImages: ['X'] });
    renderTab();

    fireEvent.click(applyButton());

    expect(imageSrcs()).toEqual(['A', 'B', 'X', 'X']);
  });

  it('إعادة تطبيق نفس التوزيع لا تسجل خطوة تراجع', () => {
    setupGrid(['X', 'X', 'X', 'X']);
    useEditorStore.setState({ autofillImages: ['X'] });
    renderTab();

    fireEvent.click(screen.getByText('كل الخانات'));
    const before = store().history.length;
    fireEvent.click(applyButton());

    expect(store().history.length).toBe(before);
  });
});

describe('CollageAutofillTab — قائمة المصدر', () => {
  it('تحذف صورة من القائمة دون المساس بالخانات', () => {
    setupGrid();
    useEditorStore.setState({ autofillImages: ['X', 'Y'] });
    renderTab();

    fireEvent.click(screen.getByLabelText('حذف صورة 1'));

    expect(store().autofillImages).toEqual(['Y']);
    expect(imageSrcs()).toEqual(['A', 'B', undefined, undefined]);
  });

  it('تعيد الترتيب بلوحة المفاتيح (Alt+سهم)', () => {
    setupGrid();
    useEditorStore.setState({ autofillImages: ['X', 'Y', 'Z'] });
    renderTab();

    fireEvent.keyDown(screen.getByTestId('autofill-image-0'), {
      key: 'ArrowRight',
      altKey: true,
    });

    expect(store().autofillImages).toEqual(['Y', 'X', 'Z']);
  });

  it('تعرض أول 24 صورة فقط ثم «عرض الكل»', () => {
    setupGrid();
    useEditorStore.setState({
      autofillImages: Array.from({ length: 30 }, (_, i) => `img-${i}`),
    });
    renderTab();

    expect(screen.queryByTestId('autofill-image-24')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('عرض الكل (30)'));
    expect(screen.getByTestId('autofill-image-29')).toBeInTheDocument();
  });

  it('تحفظ كل استيراد بما فيه النسخ المتطابقة بدل إسقاطها', async () => {
    setupGrid();
    useEditorStore.setState({ autofillImages: ['X'] });
    openImageFileDialogMock.mockResolvedValue(['X', 'Y', 'Y', 'Z']);
    renderTab();

    fireEvent.click(screen.getByText('إضافة صور'));

    await waitFor(() => {
      expect(store().autofillImages).toEqual(['X', 'X', 'Y', 'Y', 'Z']);
    });
  });

  it('يقيّد القائمة بالسقف ويحوّل الفائض إلى قائمة معلقة قابلة للاستيعاب', () => {
    setupGrid();
    store().setAutofillImages([
      ...Array.from({ length: 500 }, (_, i) => `img-${i}`),
      'new-1',
      'new-2',
    ]);
    expect(store().autofillImages).toHaveLength(500);
    expect(store().autofillImages).not.toContain('new-1');
    expect(store().collagePendingImages).toEqual(['new-1', 'new-2']);

    renderTab();
    expect(screen.getByText('إضافة صور').closest('button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'استيعاب الصور المعلقة' })).toBeDisabled();

    fireEvent.click(screen.getByLabelText('حذف صورة 1'));
    fireEvent.click(screen.getByLabelText('حذف صورة 1'));
    expect(store().autofillImages).toHaveLength(498);

    fireEvent.click(screen.getByRole('button', { name: 'استيعاب الصور المعلقة' }));
    expect(store().autofillImages).toHaveLength(500);
    expect(store().autofillImages.slice(-2)).toEqual(['new-1', 'new-2']);
    expect(store().collagePendingImages).toEqual([]);
  });
});
