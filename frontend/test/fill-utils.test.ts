import { describe, expect, it } from 'vitest';
import type { CanvasElement, ShapeElement, TextElement } from '../src/lib/editor-store';
import { getFillProps } from '../src/components/editor/konva/elements/fill-utils';

function textElement(patch: Partial<TextElement>): CanvasElement {
  return {
    id: 't1',
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    text: 'hello',
    fontSize: 20,
    ...patch,
  } as CanvasElement;
}

function shapeElement(patch: Partial<ShapeElement>): CanvasElement {
  return {
    id: 's1',
    type: 'shape',
    shape: 'rect',
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    ...patch,
  } as CanvasElement;
}

describe('getFillProps', () => {
  it('resets fill priority for solid text fills', () => {
    expect(getFillProps(textElement({ color: '#112233' }), 100, 50)).toMatchObject({
      fillPriority: 'color',
      fill: '#112233',
    });
  });

  it('declares linear gradients explicitly so a previous pattern priority cannot win', () => {
    const props = getFillProps(
      textElement({
        fillType: 'linear',
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: 1, y: 1 },
      }),
      200,
      100,
    );
    expect(props.fillPriority).toBe('linear-gradient');
    expect(props.fillLinearGradientStartPoint).toEqual({ x: 0, y: 0 });
    expect(props.fillLinearGradientEndPoint).toEqual({ x: 200, y: 100 });
  });

  it('falls back to the element color until the fill image is loaded', () => {
    expect(
      getFillProps(
        shapeElement({ fillType: 'image', fillImageSrc: 'photo.png', fill: '#abcdef' }),
        100,
        50,
      ),
    ).toMatchObject({ fillPriority: 'color', fill: '#abcdef' });
  });
});
