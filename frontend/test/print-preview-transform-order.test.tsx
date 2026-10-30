import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SheetPreview } from '../src/components/editor/print/print-preview';

import type { CanvasSlot } from '../src/lib/store/types';
import type { ComponentProps } from 'react';

/* ═══════════════════════════════════════════════════════════════
   ترتيب تحويل صورة الخانة في معاينة الطباعة — WYSIWYG مع Konva
   (مصفوفة المجموعة T·R·S: القلب قبل التدوير). في CSS تُطبَّق الدالة
   الأقصى يميناً أولاً، لذا يجب أن يسبق rotate دوالَّ scaleX/scaleY.
   كان العكس — فينقلب الاتجاه 180° عن المحرر عند 90/270 مع أي قلب.
   ═══════════════════════════════════════════════════════════════ */

const baseSlot: CanvasSlot = {
  id: 'slot-1',
  cellIndex: 0,
  x: 0.1,
  y: 0.1,
  w: 0.8,
  h: 0.8,
  imageSrc: 'data:image/png;base64,AAAA',
  filter: 'none',
  brightness: 100,
  contrast: 100,
  saturation: 100,
  zoom: 1,
  dragX: 0,
  dragY: 0,
  flipX: true,
  flipY: false,
  rotation: 90,
};

const grid = {
  safeCols: 1,
  actualRows: 1,
  gridWidth: 100,
  gridHeight: 150,
  offsetX: 0,
  offsetY: 0,
  cellWidth: 100,
  cellHeight: 150,
};

function renderSheet(
  slots: CanvasSlot[],
  overrides: Partial<ComponentProps<typeof SheetPreview>> = {},
) {
  return render(
    <SheetPreview
      grid={grid}
      count={1}
      imageWidthMM={100}
      imageHeightMM={150}
      gapMM={0}
      zoom={1}
      showCutLines={false}
      mode="collage"
      backgroundColor="#FFFFFF"
      previewImageSrc=""
      slots={slots}
      {...overrides}
    />,
  );
}

function renderPreview(slot: CanvasSlot): HTMLImageElement {
  const { container } = renderSheet([slot]);
  const img = container.querySelector('img');
  if (!img) throw new Error('slot preview image not rendered');
  return img as HTMLImageElement;
}

describe('Decorative collage print preview', () => {
  it('renders an imageless fill at the slot size with its radius and no image placeholder', () => {
    const { container } = renderSheet(
      [{ ...baseSlot, imageSrc: undefined, bgColor: '#224466', filter: 'pixelate' }],
      {
        canvasWidth: 1000,
        canvasHeight: 1500,
        paperWidthMM: 100,
        paperHeightMM: 150,
        collageRadius: 12,
        scaleFactor: 2,
      },
    );
    const box = container.querySelector<HTMLDivElement>('div.shadow-xs');
    expect(box).not.toBeNull();
    expect(box).toHaveStyle({
      left: '10%',
      top: '10%',
      width: '80%',
      height: '80%',
      backgroundColor: '#224466',
    });
    expect(parseFloat(box!.style.borderRadius)).toBeCloseTo(2.4);
    expect(box!.style.transform).toBe('');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('renders a border-only slot without inventing a background or image', () => {
    const { container } = renderSheet([{ ...baseSlot, imageSrc: '', bgColor: 'transparent' }], {
      collageStrokeWidth: 5,
      collageStrokeColor: '#112233',
      canvasWidth: 1000,
      scaleFactor: 2,
    });
    const box = container.querySelector<HTMLDivElement>('div.shadow-xs');
    expect(box).not.toBeNull();
    expect(box).toHaveStyle({ borderWidth: '1px', borderStyle: 'solid', borderColor: '#112233' });
    expect(box!.style.backgroundColor).toBe('');
    expect(container.querySelector('img')).toBeNull();
  });

  it('repeats mixed images and fills while omitting genuinely empty slots', () => {
    const { container } = renderSheet(
      [
        baseSlot,
        { ...baseSlot, id: 'fill', imageSrc: undefined, bgColor: '#224466' },
        { ...baseSlot, id: 'empty', imageSrc: undefined },
      ],
      { count: 2 },
    );
    expect(container.querySelectorAll('div.shadow-xs')).toHaveLength(4);
    expect(container.querySelectorAll('img')).toHaveLength(2);
    expect(
      [...container.querySelectorAll<HTMLDivElement>('div.shadow-xs')].filter(
        (box) => box.style.backgroundColor === 'rgb(34, 68, 102)',
      ),
    ).toHaveLength(2);
  });

  it.each([
    { bgColor: undefined, collageStrokeWidth: 0, collageStrokeColor: '#112233' },
    { bgColor: ' TRANSPARENT ', collageStrokeWidth: 2, collageStrokeColor: 'transparent' },
    { bgColor: '', collageStrokeWidth: 2, collageStrokeColor: '' },
  ])('omits an unstyled empty slot ($bgColor, $collageStrokeColor)', (style) => {
    const { container } = renderSheet(
      [{ ...baseSlot, imageSrc: undefined, bgColor: style.bgColor }],
      style,
    );
    expect(container.querySelector('div.shadow-xs')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('Print preview slot transform order (flip before rotate)', () => {
  it('quarter rotation lists rotate before the flip scales', () => {
    const img = renderPreview({ ...baseSlot, rotation: 90 });
    expect(img.style.transform).toBe('scale(1) rotate(90deg) scaleX(-1) scaleY(1)');
    expect(img.style.transform.indexOf('rotate')).toBeLessThan(
      img.style.transform.indexOf('scaleX'),
    );
  });

  it('non-quarter rotation keeps the same order', () => {
    const img = renderPreview({ ...baseSlot, rotation: 0 });
    expect(img.style.transform).toBe(
      'translate(0%, 0%) scale(1) rotate(0deg) scaleX(-1) scaleY(1)',
    );
    expect(img.style.transform.indexOf('rotate')).toBeLessThan(
      img.style.transform.indexOf('scaleX'),
    );
  });
});
