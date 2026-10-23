import { TextColorTab } from './text/text-color-tab';
import { TextEffectsTab } from './text/text-effects-tab';
import { TextTypeTab } from './text/text-type-tab';

import type { TextTabProps } from './text/text-tab-types';

export type TextPropertiesProps = TextTabProps;

/**
 * تبويب التنسيق للنصوص (TextStyleProperties):
 * يركز حصراً على الخط والنمط والقياسات والمحاذاة
 */
export function TextStyleProperties({ element, onUpdate, onNavigateTab }: TextPropertiesProps) {
  return <TextTypeTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />;
}

/**
 * تبويب الألوان للنصوص (TextColorProperties):
 * استوديو متكامل لتعبئة النصوص (تدرجات كاملة/مصمت/صورة)، ألوان الحدود، والشفافية
 */
export function TextColorProperties({ element, onUpdate, onNavigateTab }: TextPropertiesProps) {
  return <TextColorTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />;
}

/**
 * تبويب التأثيرات للنصوص (TextEffectsProperties):
 * الظلال والقوالب المجسمة، التقويس، وتنسيق أبعاد الشارة
 */
export function TextEffectsProperties({ element, onUpdate, onNavigateTab }: TextPropertiesProps) {
  return <TextEffectsTab element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />;
}
