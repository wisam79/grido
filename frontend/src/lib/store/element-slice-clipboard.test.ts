import { describe, it, expect, beforeEach } from 'vitest';
import { createElementSlice } from './slices/element-slice';
import { create } from 'zustand';

describe('element-slice clipboard', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: ReturnType<typeof create<any>>;

  beforeEach(() => {
    store = create((set, get, api) => ({
      ...createElementSlice(set, get, api),
      canvasWidth: 1000,
      canvasHeight: 1000,
      lastEditedImage: null,
      lastEditedImageAspect: null,
      pushHistory: () => {},
    }));
  });

  it('should copy selected elements to clipboardElements', () => {
    store.getState().addTextElement("نص للتجربة");
    const el = store.getState().elements[0];
    expect(el).toBeDefined();

    store.getState().copySelectedElements([el.id]);
    expect(store.getState().clipboardElements.length).toBe(1);
    expect(store.getState().clipboardElements[0].id).toBe(el.id);
  });

  it('should cut selected elements and remove them from canvas', () => {
    store.getState().addTextElement("نص للقص");
    const el = store.getState().elements[0];

    store.getState().cutSelectedElements([el.id]);
    expect(store.getState().clipboardElements.length).toBe(1);
    expect(store.getState().elements.length).toBe(0);
  });

  it('should paste copied elements onto canvas with new IDs', () => {
    store.getState().addTextElement("نص للصق");
    const originalEl = store.getState().elements[0];

    store.getState().copySelectedElements([originalEl.id]);
    store.getState().pasteCopiedElements();

    const elements = store.getState().elements;
    expect(elements.length).toBe(2);
    const pastedEl = elements[1];
    expect(pastedEl.id).not.toBe(originalEl.id);
    expect(pastedEl.x).toBeGreaterThan(originalEl.x);
    expect(store.getState().selectedIds).toEqual([pastedEl.id]);
  });
});
