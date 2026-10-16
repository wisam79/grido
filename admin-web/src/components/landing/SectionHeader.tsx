import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: ReactNode;
  /**
   * `center` (افتراضي) للأقسام المستقلة بعرض الصفحة،
   * و`start` للعناوين داخل عمود شبكة (الأسئلة الشائعة/ويندوز 11).
   */
  align?: 'center' | 'start';
  /** `xl` للأقسام الرئيسية، و`lg` للأعمدة الضيقة حيث يكسر الحجم الأكبر السطر */
  size?: 'xl' | 'lg';
  /** التباعد أسفل رأس القسم */
  gap?: 'md' | 'lg' | 'none';
}

const TITLE_SIZES = {
  xl: 'text-2xl sm:text-4xl lg:text-5xl',
  lg: 'text-2xl sm:text-4xl lg:text-[40px] leading-[1.2]',
} as const;

const GAPS = {
  md: 'mb-10 sm:mb-14',
  lg: 'mb-12 sm:mb-16',
  none: '',
} as const;

/**
 * عنوان القسم الموحّد — عنوان أبيض كبير واحد فقط.
 * أُلغيت الشارة (eyebrow) والوصف: كانت ثلاث طبقات نصية متنافسة في رأس كل قسم.
 */
export function SectionHeader({ title, align = 'center', size = 'xl', gap = 'md' }: SectionHeaderProps) {
  const isCentered = align !== 'start';

  return (
    <h2
      className={`${TITLE_SIZES[size]} font-black text-white tracking-tight ${GAPS[gap]} ${
        isCentered ? 'text-center max-w-3xl mx-auto' : ''
      }`}
    >
      {title}
    </h2>
  );
}
