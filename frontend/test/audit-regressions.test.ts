import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';
import { ProjectSchema } from '../src/lib/schema';
import { COLLAGE_TEMPLATES } from '../src/lib/templates/collage-templates';

/**
 * اختبارات انحدار لدفعة إصلاحات التدقيق (40 ملاحظة).
 * كل اختبار يثبت عيباً مُصلَحاً حتى لا يعود صامتاً:
 *  - إسقاط إعدادات الطباعة/الشبكة عند الحفظ (zod)
 *  - افتراضيات مناقضة لافتراضيات المتجر
 *  - فقدان حقول الخلية عند تبديل قالب الكولاج
 *  - ربط الخلايا بالفهرس بدل الموضع عند تغيّر الفجوة
 *  - بقاء zoom الاقتصاص بعد تدوير الخلية
 *  - عدم عودة القالب عند التراجع بعد setCollageTemplate
 */

const store = () => useEditorStore.getState();

beforeEach(() => {
  store().reset();
});

describe('ProjectSchema — إعدادات لا تُسقط عند الحفظ/الفتح', () => {
  it('يحفظ cutLineStyle و gridAlign (كانا يُحذفان كمفاتيح غير معلنة)', () => {
    const parsed = ProjectSchema.parse({
      printSettings: {
        paperId: 'a4',
        paperWidthMM: 210,
        paperHeightMM: 297,
        marginMM: 0,
        dpi: 300,
        copiesPerSheet: 4,
        showCutLines: true,
        orientation: 'portrait',
        cutLineStyle: 'dotted',
        gridAlign: 'center',
      },
    });

    expect(parsed.printSettings?.cutLineStyle).toBe('dotted');
    expect(parsed.printSettings?.gridAlign).toBe('center');
  });

  it('افتراضيات الملف الفارغ تطابق DEFAULT_CORE_STATE / DEFAULT_GRID_STATE / DEFAULT_COLLAGE_STATE', () => {
    const parsed = ProjectSchema.parse({});

    // 413×531 (مقاس جواز) كانت تُحمَّل على ملف قديم بلا أبعاد
    expect(parsed.canvasWidth).toBe(2480);
    expect(parsed.canvasHeight).toBe(3508);
    // snapToGrid الافتراضي في المتجر true — false كان يطفئ المغناطيس صامتاً
    expect(parsed.snapToGrid).toBe(true);
    expect(parsed.collageShowEndCutLine).toBe(true);
  });

  it('يمرّر تدرج خلفية الورقة ذهاباً وإياباً', () => {
    const parsed = ProjectSchema.parse({
      backgroundColor: '#FFFFFF',
      backgroundGradientColor2: '#1E3A8A',
      backgroundGradientAngle: 90,
    });

    expect(parsed.backgroundGradientColor2).toBe('#1E3A8A');
    expect(parsed.backgroundGradientAngle).toBe(90);
  });

  it('تطبيع الزاوية يقبل قيماً خارج 0-360', () => {
    store().setBackgroundGradientAngle(450);
    expect(store().backgroundGradientAngle).toBe(90);

    store().setBackgroundGradientAngle(-90);
    expect(store().backgroundGradientAngle).toBe(270);
  });
});

describe('collage-slice — سلامة بيانات الخلايا', () => {
  it('setCollageTemplate يحتفظ بـ bgColor/القلب/الصورة الأصلية', () => {
    const target = COLLAGE_TEMPLATES.find((t) => t.id !== COLLAGE_TEMPLATES[0].id) ?? COLLAGE_TEMPLATES[0];
    store().setCollageTemplate(COLLAGE_TEMPLATES[0]);

    const slot = store().slots[0];
    store().updateSlot(slot.id, {
      imageSrc: 'photo.png',
      originalImageSrc: 'original.png',
      bgColor: '#123456',
      flipX: true,
      flipY: true,
    });

    store().setCollageTemplate(target);

    const carried = store().slots.find((s) => s.imageSrc === 'photo.png');
    expect(carried).toBeDefined();
    expect(carried?.originalImageSrc).toBe('original.png');
    expect(carried?.bgColor).toBe('#123456');
    expect(carried?.flipX).toBe(true);
    expect(carried?.flipY).toBe(true);
  });

  it('تغيير الفجوة يُبقي الصورة في أقرب خلية لموضعها السابق لا بفهرس المصفوفة', () => {
    const dynamicTemplate = COLLAGE_TEMPLATES.find((t) => t.physicalLayout);
    if (!dynamicTemplate) return; // لا قالب ديناميكي — الفحوص التالية لا تنطبق

    store().setCollageTemplate(dynamicTemplate);
    const before = store().slots;
    const last = before[before.length - 1];
    const oldCenter = { x: last.x + last.w / 2, y: last.y + last.h / 2 };
    store().setSlotImage(last.id, 'photo.png');

    store().setCollageGap(28);
    const after = store().slots;
    const holder = after.find((s) => s.imageSrc === 'photo.png');
    expect(holder).toBeDefined();

    const distance = (s: { x: number; y: number; w: number; h: number }) =>
      Math.hypot(s.x + s.w / 2 - oldCenter.x, s.y + s.h / 2 - oldCenter.y);
    const nearest = Math.min(...after.map(distance));
    expect(distance(holder!)).toBeCloseTo(nearest, 5);
  });

  it('rotateSlot يُصفّر zoom الاقتصاص مع الإزاحات', () => {
    store().setCollageTemplate(COLLAGE_TEMPLATES[0]);
    const id = store().slots[0].id;
    store().updateSlot(id, { zoom: 2.5, dragX: 12, dragY: -8 });

    store().rotateSlot(id, 90);

    const rotated = store().slots.find((s) => s.id === id)!;
    expect(rotated.rotation).toBe(90);
    expect(rotated.zoom).toBe(1);
    expect(rotated.dragX).toBe(0);
    expect(rotated.dragY).toBe(0);
  });
});

describe('history-slice — القالب جزء من اللقطة', () => {
  it('التراجع بعد setCollageTemplate يعيد القالب السابق لا يتركه معلّقاً', () => {
    const next = COLLAGE_TEMPLATES[1] ?? COLLAGE_TEMPLATES[0];
    const initialId = store().collageTemplate?.id;

    store().setCollageTemplate(next);
    expect(store().collageTemplate?.id).toBe(next.id);

    store().undo();
    expect(store().collageTemplate?.id).toBe(initialId);
  });
});
