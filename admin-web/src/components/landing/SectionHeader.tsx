import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: ReactNode;
  /**
   * سطر دعم واحد خافت تحت العنوان — يحسّن قابلية المسح البصري للقسم
   * دون إعادة طبقات 0.87 المحذوفة (لا شارة eyebrow ولا أيقونة ولا وصف ثانٍ).
   */
  description?: ReactNode;
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
 * عنوان القسم الموحّد — عنوان أبيض كبير واحد (نفس دستور 0.87: بلا شارة eyebrow)
 * مع سطر دعم خافت اختياري لتحسين قابلية المسح دون منافسة العنوان.
 */
export function SectionHeader({ title, description, align = 'center', size = 'xl', gap = 'md' }: SectionHeaderProps) {
  const isCentered = align !== 'start';

  return (
    <div className={`${GAPS[gap]} ${isCentered ? 'text-center' : ''}`}>
      <h2
        className={`${TITLE_SIZES[size]} font-black text-white tracking-tight ${
          isCentered ? 'max-w-3xl mx-auto' : ''
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-3 text-xs sm:text-sm text-text-secondary leading-relaxed text-balance ${
            isCentered ? 'max-w-2xl mx-auto' : 'max-w-md'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
