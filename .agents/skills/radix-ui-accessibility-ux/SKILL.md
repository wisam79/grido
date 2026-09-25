---
name: radix-ui-accessibility-ux
description: معايير وأصول إمكانية الوصول والتفاعل لنوافذ وقوائم Radix UI (Keyboard Navigation, Focus Trapping, ARIA Semantics, and Dialog/Dropdown Architecture)
---

# ♿ إمكانية الوصول وتجربة المستخدم بـ Radix UI (Radix UI Accessibility & UX)

تحدد هذه المهارة المعايير الرسمية المعتمدة لاستخدام وتخصيص مكتبة **Radix UI Primitives** في Grido Studio بما يتوافق مع معايير الوصول العالمية (WAI-ARIA) وسلوك تطبيقات سطح المكتب الاحترافية.
المرجع الرسمي: [Radix UI Primitives Documentation](https://www.radix-ui.com/primitives).

---

## 🎯 1. المبادئ الهندسية الأساسية (Radix Core Principles)

1. **الوصول بلا تنازل (Accessible by Default):**
   - إدارة التركيز البصري (Focus Management) تلقائياً عند الفتح والإغلاق.
   - حصر التركيز (Focus Trapping) داخل النوافذ المنبثقة التفاعلية (Modals).
   - إغلاق القوائم والنوافذ بزر `Escape` والعودة بالتركيز إلى عنصر الإطلاق (Trigger).
2. **التركيب غير المفروض (Unstyled & Composable):**
   - فصل المنطق وسلوك ARIA تماماً عن التنسيق الجمالي.
   - استخدام خاصية `asChild` لتفادي توليد عناصر DOM زائدة ومطابقة شجرة المكونات بنظام التصميم.

---

## 🪟 2. النوافذ الحوارية والألواح (Dialog & Alert Dialog Architecture)

### التشريح السليم للمكون (Component Anatomy)
كل نافذة `Dialog` أو `AlertDialog` يجب أن تشتمل على الأجزاء الإلزامية لـ ARIA:

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

export function PrintPreviewModal({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-(--z-modal-overlay) backdrop-blur-xs" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card p-6 rounded-xl shadow-2xl z-(--z-modal) focus:outline-none"
          aria-describedby="dialog-desc"
        >
          <Dialog.Title className="text-lg font-semibold text-foreground">
            معاينة وإعدادات الطباعة
          </Dialog.Title>
          
          {/* وصف النافذة إلزامي لمعايير الوصول (يمكن إخفاؤه بصرياً إذا لم تدع الحاجة) */}
          <Dialog.Description id="dialog-desc" className="text-sm text-muted-foreground mt-1">
            حدد خصائص الطابعة وهوامش القص وأبعاد الورق.
          </Dialog.Description>

          <div className="mt-4">
            {/* محتوى النافذة */}
          </div>

          <Dialog.Close asChild>
            <button type="button" aria-label="إغلاق">✕</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

> [!CAUTION]
> **تنبيه ARIA حاسم:** حذف `Dialog.Title` أو `Dialog.Description` يطلق تحذيرات وصول في شجرة المتصفح وقارئات الشاشة. إذا كان التصميم لا يتطلب وصفاً نصياً ظاهراً، استخدم `<VisuallyHidden asChild><Dialog.Description>...</Dialog.Description></VisuallyHidden>` أو مرر صراحة `aria-describedby={undefined}` للمحتوى.

---

## 📋 3. القوائم المنسدلة وسياق العمل (Dropdown & Context Menus)

1. **التنقل عبر لوحة المفاتيح (Desktop Keyboard UX):**
   - السهم لأسفل (`ArrowDown`)/لأعلى (`ArrowUp`): التنقل بين بنود القائمة وتخطي العناصر المعطلة (`disabled`).
   - السهم لليمين/اليسار (`ArrowRight`/`ArrowLeft`): فتح القوائم الفرعية (`SubMenu`) والتنقل بها بحسب اتجاه الواجهة (RTL/LTR).
   - مفتاح الإدخال (`Enter`)/المسافة (`Space`): تفعيل الإجراء وإغلاق القائمة فوراً.
2. **عزل القوائم الحلقية (Focus Loops):**
   - استخدم خاصية `loop={true}` في `DropdownMenu.Content` لضمان الانتقال السلس من آخر عنصر إلى أول عنصر.

---

## 🧱 4. القواعد الحاكمة في Grido Studio

1. **الطبقات ومؤشرات الارتفاع (`z-index`):**
   - استخدم دائماً متغيرات الثيم المعيارية المعتمدة في `@theme` (`z-(--z-modal)` أو `z-(--z-popover)`) ولا تضع أرقاماً عشوائية.
2. **منع التمرير الخارجي (Scroll Locking):**
   - يدير Radix قفل التمرير على عنصر `body` تلقائياً عند فتح الـ Dialog؛ لا تضف كوداً يدوياً يتلاعب بـ `document.body.style.overflow`.
3. **التكامل مع النماذج غير المتزامنة (Async Submissions):**
   - عند الضغط على أزرار التأكيد أو الحفظ غير المتزامن (مثل حفظ المشروع أو إنشاء نسخة احتياطية)، يجب إبقاء النافذة مفتوحة وإظهار حالة الانتظار حتى اكتمال عملية Wails الخلفية بنجاح ثم إغلاقها برمجياً عبر `onOpenChange(false)`.
