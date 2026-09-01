---
name: grido-ui-designer-guide
description: دليل تصميم الواجهات وتجربة المستخدم في Grido Studio (Icon-Driven UI + Figma-like Aesthetic + React Portals)
---

# 🎨 دليل واجهات وتجربة المستخدم (UI/UX Designer Guide)

استخدم هذا الدليل لإنشاء أو تعديل أجزاء واجهة المستخدم في Grido Studio وفقاً لأعلى معايير التصميم والتفاعل الاحترافي.

---

## 🎨 1. المبادئ التصميمية الأساسية (Design Principles)

1. **الاعتماد على الأيقونات (Icon-Driven UI):**
   - بدلاً من الجمل الطويلة والعديدة، اعمد دائماً لاستخدام أيقونات بسيطة واضحة وموحدة مع تغليفها بـ `Tooltip` توضيحي عند التمرير.
   - **حزمة الأيقونات الرسمية:**
     - تطبيق سطح المكتب (`frontend/`): يعتمد حصرياً على **`@phosphor-icons/react`** مع مزود `PhosphorProvider` و `weight="regular"`.
     - موقع الويب ولوحة الإدارة (`admin-web/`): يعتمد على `lucide-react`.
   - مثال (تطبيق سطح المكتب): استخدم أيقونة `<Wand className="w-4 h-4" />` لإزالة الخلفية مع Tooltip "إزالة الخلفية بالذكاء الاصطناعي".

2. **طابع عصري ومحترف (Figma-like Aesthetic):**
   - تصميم مضغوط، حواف ناعمة (`rounded-xl` أو `rounded-2xl`)، وظلال ناعمة خفيفة.
   - خلفيات شبه شفافة متدرجة بزجاجية (Glassmorphism): `bg-background/80 backdrop-blur-xl border border-border/50`.

3. **لوحة الألوان والتباين (Curated HSL Palette):**
   - تجنب الألوان البدائية الفاقعة (الأحمر/الأزرق الصريح). استخدم درجات HSL المتناسقة مع نظام Dark/Light Mode عبر المتغيرات: `bg-primary`, `text-muted-foreground`, `border-border/40`.

---

## 🛑 2. قاعدة React Portal الإلزامية للقوائم العائمة (React Portal Rule)

> [!CRITICAL]
> **قاعدة حاسمة:** أي قائمة عائمة (مثل Context Menu أو DropdownMenu أو Popover) تُعرض فوق أو داخل عنصر يحتوي على خاصية `transform: scale()` أو `transform: translate()` (مثل مساحة العمل Konva Paper Wrapper)، **يجب زراعتها إجبارياً باستخدام `React.createPortal(..., document.body)`**.
> 
> السبب: خاصية `transform` في CSS تُنشئ Containing Block جديد يكسر سلوك `position: fixed` في القوائم العائمة وتجعل القائمة تظهر في مكان غير صحيح أو تختفي تحت الحاوية.

---

## 📐 3. المساطر الثابتة بنمط Viewport والتصميم القياسي (Viewport-Fixed Standard Rulers)

- المساطر (Rulers) لا تُلصق بحاوية الورقة (Canvas Paper) مباشرة؛ بل تُثبت في الحواف الثابتة للشاشة (الأعلى واليسار/اليمين) خارج منطقة التمرير (Scroll Area).
- **أبعاد وتدرج المسطرة القياسي:**
  - ارتفاع المسطرة الأفقية وعرض الرأسية: `20px`.
  - تدرج هندسي ثلاثي المستويات: Major Ticks (طول 10px للأرقام)، Mid Ticks (طول 6px للأنصاف)، Minor Ticks (طول 3px للتقسيمات).
  - تمييز نقطة الأصل `(0,0)` وأطراف الورقة بخطوط إرشادية ولون أساسي مميز (`stroke-primary` و `fill-primary font-bold`).

---

## 🧩 4. هيكل النوافذ والحوارات القياسي (Standard Dialog Template)

عند بناء أو تعديل أي نافذة حوار (Dialog / Modal) في التطبيق، اتبع الهيكل القياسي التالي (حيث يوضع زر الإغلاق إجبارياً داخل شريط العنوان `DialogHeader`):

```tsx
import { Sparkle, Check } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent showCloseButton={false} className="w-[95vw] sm:max-w-[700px] border border-border/60 bg-background/95 backdrop-blur-2xl rounded-2xl shadow-2xl p-5 sm:p-6" dir="rtl">
    {/* 1. Header with integrated Close Button in title bar */}
    <DialogHeader className="border-b border-border/40 pb-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Sparkle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base font-bold text-foreground truncate">عنوان النافذة</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/80 mt-0.5 truncate">شرح مختصر ومباشر للوظيفة</DialogDescription>
          </div>
        </div>
        <DialogCloseButton />
      </div>
    </DialogHeader>

    {/* 2. Content */}
    <div className="py-4 space-y-4">
      {/* عناصر التحكم والإعدادات */}
    </div>

    {/* 3. Footer */}
    <DialogFooter className="border-t border-border/40 pt-4 flex justify-end gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
      <Button className="bg-primary text-primary-foreground gap-2">
        <Check className="w-4 h-4" /> تنفيذ
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 4. معايير الاختصار والتركيز النصي (Concise Professional UI Terminology)
يجب دائماً صياغة نصوص القوائم والأزرار وألسنة التبويب بكلمة أو كلمتين مركزتين مثل برامج التصميم العالمية، ونقل التفاصيل إلى الـ Tooltip:

| السياق | النص القديم (المرفوض) | النص المعتمد المختصر |
| :--- | :--- | :--- |
| **ملف** | إضافة صورة... / مكتبة المشاريع... / مسح مساحة العمل | **فتح صورة... / المشاريع... / تفريغ العمل** |
| **تحرير** | تكرار العناصر المحددة / حذف العنصر | **تكرار / حذف** |
| **عرض** | إظهار وإخفاء المساطر / لوحة الخصائص | **المساطر / الشبكة / الخصائص** |
| **تبويبات الخصائص** | التنسيق والأدوات / تعديل الألوان والسطوع / التأثيرات والظلال | **التنسيق / الألوان / التأثيرات / الترتيب** |
| **أدوات وتعبئة** | تعبئة الورقة بالكامل / تعبئة الخانات الفارغة | **تعبئة الكل / تعبئة الفارغ / تعبئة الصف** |

