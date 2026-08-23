// ربط مطابقة jest-axe بنظام تأكيدات Vitest
// (الاستيراد يجعل declare module هنا Augmentation وليس حجباً للوحدة)
import type {} from 'vitest';

declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations: () => void;
  }
}
