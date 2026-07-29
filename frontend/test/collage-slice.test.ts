import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';
import { COLLAGE_TEMPLATES } from '../src/lib/templates/collage-templates';

describe('CollageSlice Unit Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('sets collage template and updates slots', () => {
    const tmpl = COLLAGE_TEMPLATES[0];
    useEditorStore.getState().setCollageTemplate(tmpl);

    expect(useEditorStore.getState().collageTemplate?.id).toBe(tmpl.id);
    expect(useEditorStore.getState().slots.length).toBeGreaterThan(0);
  });

  it('updates slot properties', () => {
    const tmpl = COLLAGE_TEMPLATES[0];
    useEditorStore.getState().setCollageTemplate(tmpl);

    const firstSlot = useEditorStore.getState().slots[0];
    useEditorStore.getState().updateSlot(firstSlot.id, { imageSrc: 'photo.jpg' });

    const updated = useEditorStore.getState().slots.find((s) => s.id === firstSlot.id);
    expect(updated?.imageSrc).toBe('photo.jpg');
  });

  it('sets slot image directly', () => {
    const tmpl = COLLAGE_TEMPLATES[0];
    useEditorStore.getState().setCollageTemplate(tmpl);

    const firstSlot = useEditorStore.getState().slots[0];
    useEditorStore.getState().setSlotImage(firstSlot.id, 'pic.png');

    const updated = useEditorStore.getState().slots.find((s) => s.id === firstSlot.id);
    expect(updated?.imageSrc).toBe('pic.png');
  });

  it('fills all slots with specified image', () => {
    const tmpl = COLLAGE_TEMPLATES[0];
    useEditorStore.getState().setCollageTemplate(tmpl);

    const firstSlot = useEditorStore.getState().slots[0];
    useEditorStore.getState().fillAllSlots('fill.jpg', firstSlot.id);

    const allSlots = useEditorStore.getState().slots;
    expect(allSlots.every((s) => s.imageSrc === 'fill.jpg')).toBe(true);
  });

  it('clears all slots image data', () => {
    const tmpl = COLLAGE_TEMPLATES[0];
    useEditorStore.getState().setCollageTemplate(tmpl);

    const firstSlot = useEditorStore.getState().slots[0];
    useEditorStore.getState().setSlotImage(firstSlot.id, 'pic.png');

    useEditorStore.getState().clearSlots();

    const allSlots = useEditorStore.getState().slots;
    expect(allSlots.every((s) => !s.imageSrc)).toBe(true);
  });
});
