import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CollageArrangeTab } from '../src/components/editor/panels/collage/collage-arrange-tab';
import { useEditorStore } from '../src/lib/editor-store';
import type { CanvasSlot } from '../src/lib/store/types';

/**
 * تبويب فرز وترتيب الخانات — الانحدارات التي تحرسها هذه الاختبارات:
 *  1. «لفّ كل الصور» يجب أن يكون **تزايدياً**: الضغط مرتين = 180° لا 90°.
 *  2. اللفّ والتصفير يجب أن يُسجَّلا في سجل التراجع (كانا بلا تسجيل أصلاً
 *     مع toast يوهم بالعكس).
 *  3. «تبديل الصفوف بالأعمدة» يجب أن ينقل الصورة من (صف، عمود) إلى
 *     (عمود، صف)، لا أن يربطها بالفهرس.
 *  4. «عكس الصفوف» على شبكة غير ممتلئة لا يكرّر صورة.
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

/** شبكة 2×2 بمصادر A/B/C/D بترتيب الصفوف */
function setupGrid(sources: (string | undefined)[] = ['A', 'B', 'C', 'D']) {
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
    collageTemplate: {
      id: 'tpl-2x2',
      name: 'كولاج 2×2',
      slots: 4,
      cells: [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ],
    },
  });
}

const renderTab = () => render(<CollageArrangeTab />);

const imageSrcs = () => store().slots.map((s) => s.imageSrc);

beforeEach(() => {
  store().reset();
});

describe('CollageArrangeTab — مخطط الشبكة', () => {
  it('يعرض خانة لكل موضع مع رقمها', () => {
    setupGrid();
    renderTab();

    const preview = screen.getByTestId('collage-grid-preview');
    expect(preview.children).toHaveLength(4);
    for (const index of ['1', '2', '3', '4']) {
      expect(within(preview).getByText(index)).toBeInTheDocument();
    }
    // الصفوف × الأعمدة وعدد الصور في عنوان القسم
    expect(screen.getByText(/2×2 · 4 صورة · 0 فارغة/)).toBeInTheDocument();
  });

  it('يميّز الخانات الفارغة في العنوان', () => {
    setupGrid(['A', undefined, undefined, undefined]);
    renderTab();
    expect(screen.getByText(/1 صورة · 3 فارغة/)).toBeInTheDocument();
  });
});

describe('CollageArrangeTab — اللفّ الجماعي', () => {
  it('تزايدي: ضغطتان تعطيان 180 درجة لا 90', () => {
    setupGrid();
    renderTab();

    const rotateCw = screen.getByText('لفّ 90° يميناً');
    fireEvent.click(rotateCw);
    expect(store().slots.every((s) => (s.rotation ?? 0) === 90)).toBe(true);

    fireEvent.click(rotateCw);
    expect(store().slots.every((s) => (s.rotation ?? 0) === 180)).toBe(true);
  });

  it('اللفّ يساراً يخصم من التدوير الحالي ويلفّه داخل 0..360', () => {
    setupGrid();
    renderTab();

    fireEvent.click(screen.getByText('لفّ 90° يساراً'));
    expect(store().slots.every((s) => (s.rotation ?? 0) === 270)).toBe(true);
  });

  it('كل ضغطة نقلة تراجع واحدة', () => {
    setupGrid();
    renderTab();

    const before = store().history.length;
    fireEvent.click(screen.getByText('لفّ 90° يميناً'));
    expect(store().history.length).toBe(before + 1);
  });

  it('التصفير يُسجَّل في سجل التراجع أيضاً', () => {
    setupGrid();
    renderTab();

    const before = store().history.length;
    fireEvent.click(screen.getByText('تصفير التعديلات'));
    expect(store().history.length).toBe(before + 1);
    expect(store().slots.every((s) => (s.rotation ?? 0) === 0)).toBe(true);
  });
});

describe('CollageArrangeTab — إعادة الترتيب', () => {
  it('تبديل الصفوف بالأعمدة ينقل الصورة هندسياً (صف،عمود) → (عمود،صف)', () => {
    setupGrid();
    renderTab();

    fireEvent.click(screen.getByText('تبديل الصفوف بالأعمدة'));

    // A B     A C
    // C D  ⇒  B D
    expect(imageSrcs()).toEqual(['A', 'C', 'B', 'D']);
  });

  it('عكس الصفوف على شبكة نصف ممتلئة لا يكرّر أي صورة', () => {
    // الصف الأول فيه صورة واحدة فقط — العطب القديم ينتج A,A
    setupGrid(['A', undefined, 'C', undefined]);
    renderTab();

    fireEvent.click(screen.getByText('عكس الصفوف'));

    expect(imageSrcs()).toEqual(['A', undefined, 'C', undefined]);
  });

  it('الخلط لا يكرّر ولا يفقد أي صورة', () => {
    setupGrid();
    renderTab();

    fireEvent.click(screen.getByText('خلط عشوائي'));

    expect([...imageSrcs()].sort()).toEqual(['A', 'B', 'C', 'D']);
  });
});
