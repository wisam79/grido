import { useCallback, useEffect, useDeferredValue, useMemo, useState } from 'react';

import { createLogger } from '@/lib/logger';
import { sanitizeSvgMarkup } from '@/lib/utils';

import { ALL_STICKER_TEMPLATES } from '../templates';
import { useStickerParamsHistory } from './params-history';
import { buildDefaultStickerParams, buildStickerSvg } from './sticker-design/build-svg';
import { migrateStickerParams } from './sticker-design/schema';
import { findHiddenFieldIds } from '../templates/svg-elements';

import type { StickerCategory, StickerCategoryGroupId, StickerTemplate } from '../types';
import type { StickerElementSource } from '@/lib/store/types';
import type { RefObject } from 'react';

const logger = createLogger('use-sticker-customization');

interface UseStickerCustomizationParams {
  open: boolean;
  initialCategory: StickerCategoryGroupId | StickerCategory | 'all';
  /**
   * وضع إعادة التحرير: عنصر ملصق موجود على الكانفس. عند توفيره يُفتح الاستوديو
   * على قالب العنصر بتخصيصاته المحفوظة.
   */
  editingElement: { id: string; source: StickerElementSource } | null;
  /** حارس الإلغاء المشترك — الحوار يملكه وتشاركه مسارات الإدراج والتصدير */
  cancelledRef: RefObject<boolean>;
}

/**
 * آلة حالة التخصيص في استوديو الملصقات — كانت متمركزة داخل
 * sticker-studio-dialog فتضخّمه إلى ما يقارب 930 سطراً. تملك: حالة المرحلة
 * (معرض/تخصيص)، القالب المحدد مع بذرة إعادة التحرير، سجل معاملات التخصيص
 * القابل للتراجع، وتوليد الـSVG الحي المؤجَّل عن الرسم مع نسخته المُطهَّرة
 * للتصدير ومعرّفات الحقول المخفية.
 */
export function useStickerCustomization({
  open,
  initialCategory,
  editingElement,
  cancelledRef,
}: UseStickerCustomizationParams) {
  // Stage state: "gallery" for picking templates, "customize" for fine-tuning & inserting
  const [view, setView] = useState<'gallery' | 'customize'>('gallery');

  const [selectedTemplate, setSelectedTemplate] = useState<StickerTemplate>(() => {
    if (editingElement) {
      const match = ALL_STICKER_TEMPLATES.find((t) => t.id === editingElement.source.templateId);
      if (match) return match;
    }
    if (initialCategory !== 'all') {
      const match = ALL_STICKER_TEMPLATES.find((t) => t.category === initialCategory);
      if (match) return match;
    }
    return ALL_STICKER_TEMPLATES[0];
  });

  // سجل التراجع/الإعادة — كل تعديل يلتزم كسجل قابل للرجوع مثل أدوات التصميم الاحترافية
  const { params, canUndo, canRedo, setParams, commitParams, resetParams, undo, redo } =
    useStickerParamsHistory(() => {
      // وضع إعادة التحرير: نبدأ بتخصيصات العنصر المحفوظة لا بافتراضيات القالب
      if (editingElement) {
        const template = ALL_STICKER_TEMPLATES.find(
          (t) => t.id === editingElement.source.templateId,
        );
        if (template) {
          setSelectedTemplate(template);
          return migrateStickerParams(editingElement.source.params, template);
        }
      }
      return buildDefaultStickerParams(ALL_STICKER_TEMPLATES[0]);
    });

  // وضع إعادة التحرير: نبدأ مباشرة في وضع التخصيص (لا معنى للمعرض)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && editingElement) setView('customize');
  }, [open, editingElement]);

  // Reset loading state and restore gallery on dialog close (rule: Modal loading state cleanup)
  useEffect(() => {
    if (!open) {
      cancelledRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView('gallery');
    } else {
      cancelledRef.current = false;
    }
  }, [open, cancelledRef]);

  // اختيار قالب: يحدّث الحقول من افتراضيات القالب الجديد وينتقل مباشرة لوضع التخصيص
  const handleSelectTemplate = useCallback(
    (template: StickerTemplate) => {
      setSelectedTemplate(template);
      resetParams(buildDefaultStickerParams(template));
      setView('customize');
    },
    [resetParams],
  );

  // اختصار لوحة المفاتيح: Ctrl+Z تراجع / Ctrl+Y أو Ctrl+Shift+Z إعادة (وضع التخصيص فقط)
  useEffect(() => {
    if (!open || view !== 'customize') return;
    const handleUndoKeys = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        // داخل حقل نص: التراجع الأصلي للحقل له الأولوية
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) redo();
      else undo();
    };
    const handleRedoKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        // 🛡️ نفس حارس التراجع أعلاه: داخل حقل نص الإعادة الأصلية للحقل أولاً
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        redo();
      }
    };
    window.addEventListener('keydown', handleUndoKeys);
    window.addEventListener('keydown', handleRedoKey);
    return () => {
      window.removeEventListener('keydown', handleUndoKeys);
      window.removeEventListener('keydown', handleRedoKey);
    };
  }, [open, view, undo, redo]);

  const handleBackToGallery = useCallback(() => {
    setView('gallery');
  }, []);

  // إعادة الضبط تلتزم كخطوة في السجل — تُتراجع بـ Ctrl+Z بدل أن تمحو العمل نهائياً
  const handleResetDefaults = useCallback(() => {
    commitParams(buildDefaultStickerParams(selectedTemplate));
  }, [selectedTemplate, commitParams]);

  const handleChangeField = useCallback(
    (fieldId: string, value: string) => {
      setParams((prev) => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldId]: value,
        },
      }));
    },
    [setParams],
  );

  const handleChangeColor = useCallback(
    (role: 'primary' | 'secondary' | 'background', color: string) => {
      setParams((prev) => {
        switch (role) {
          case 'primary':
            return { ...prev, primaryColor: color };
          case 'secondary':
            return { ...prev, secondaryColor: color };
          case 'background':
            return { ...prev, backgroundColor: color };
        }
      });
    },
    [setParams],
  );

  const handleResetField = useCallback(
    (fieldId: string) => {
      const field = selectedTemplate.fields.find((f) => f.id === fieldId);
      if (!field) return;
      setParams((prev) => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldId]: field.defaultValue,
        },
      }));
    },
    [selectedTemplate.fields, setParams],
  );

  // الكتابة الحية تُؤجَّل عن الرسم: الحقول تستجيب فوراً بينما يُعاد توليد
  // الـ SVG الثقيل (80+ قالباً بفلاتر) بقيمة مؤجلة فلا يتقطّع الإدخال
  const deferredParams = useDeferredValue(params);

  const svgString = useMemo(() => {
    if (view === 'gallery') return '';
    try {
      // نقطة التوليد الوحيدة: تعقيم + RTL/ملاءمة + فضّ معرّفات
      return buildStickerSvg(selectedTemplate, deferredParams, {
        namespace: `live-${selectedTemplate.id}`,
      });
    } catch (err) {
      logger.error('Failed to generate SVG:', err);
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><text x="200" y="200" text-anchor="middle">Error</text></svg>`;
    }
  }, [view, selectedTemplate, deferredParams]);

  /** نسخة مُطهَّرة للتصدير/النسخ — تُكتب على القرص أو الحافظة فتُفتح خارج التطبيق */
  const exportableSvg = useMemo(
    () => (view === 'customize' ? sanitizeSvgMarkup(svgString) : ''),
    [view, svgString],
  );

  const hiddenFieldIds = useMemo(
    () =>
      view === 'customize'
        ? findHiddenFieldIds(
            svgString,
            selectedTemplate.fields.map((f) => f.id),
          )
        : [],
    [view, svgString, selectedTemplate.fields],
  );

  return {
    view,
    setView,
    selectedTemplate,
    params,
    canUndo,
    canRedo,
    setParams,
    commitParams,
    undo,
    redo,
    handleSelectTemplate,
    handleBackToGallery,
    handleResetDefaults,
    handleChangeField,
    handleChangeColor,
    handleResetField,
    svgString,
    exportableSvg,
    hiddenFieldIds,
  };
}
