---
name: grido-ui-system
description: نظام واجهة وتصميم Grido Studio الموحد (Fluent 2 المحلي، متغيرات Tailwind CSS v4، وصولية Radix UI، الاختصارات، وبنية الحوارات)
---

# 🎨 نظام واجهة وتصميم Grido Studio (UI System & Accessibility)

يوحّد هذا الدليل معايير الواجهة المحلية المستلهمة من [Microsoft Fluent 2](https://fluent2.microsoft.design/) و[Radix Primitives](https://www.radix-ui.com/primitives) مع محرك **Tailwind CSS v4** في `frontend/src/index.css`. الأولوية دائماً للسلامة وصدق الحالة والوضوح وإمكانية الوصول على الاختصار والحركة.

---

## 1. التوكنز وطبقات العرض (`@theme inline` في `frontend/src/index.css`)

- **CSS-First:** لا يوجد `tailwind.config.js`؛ كل الألوان والطبقات والخطوط تُعرّف في `@theme inline` داخل `frontend/src/index.css` وتُستخرج برمجياً لـ Konva عبر `getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()`.
- **مقياس الطبقات (`--z-*`):** `--z-panel: 40` · `--z-canvas-overlay: 45` · `--z-canvas-guides: 60` · `--z-canvas-text-overlay: 70` · `--z-ruler: 100` · `--z-print-toolbar: 150` · `--z-quick-bar: 500` · `--z-menu: 1000` · `--z-popover: 1500` · `--z-dialog: 2000` · `--z-dialog-popover: 2500` · `--z-toast: 3000`.
  - يُمنع `z-[N]` و`z-50` الخام. القوائم والتلميحات المشتركة (`SelectContent`, `PopoverContent`, `DropdownMenuContent`, `TooltipContent`) ترث `--z-dialog-popover` كي لا تختفي خلف الحوارات؛ غلاف `sonner.tsx` يثبت `var(--z-toast)` على `style.zIndex`.
- **توكنز الألوان والحالات:**
  - أزرار الإجراء التعبوية: `bg-primary-action hover:bg-primary-action-hover text-primary-foreground` و`bg-destructive-action hover:bg-destructive-action-hover text-destructive-foreground` (تباين `>= 4.5:1`)، لا `bg-primary` أو `bg-destructive` الخام مع نص أبيض.
  - توكنز الحالة: `--success`, `--warning`, `--info`, `--destructive` مع `*-foreground`، لا ألوان Tailwind الخام (`emerald`/`amber`/`rose`/`sky`/`indigo`/`violet`/`cyan`) ولا قيم hex في JSX.
  - هوية العلامة `GridoBrandMark` موحدة (`#3b82f6` / `#2563eb` / `#1d4ed8` / `#60a5fa`) عبر الإقلاع والقفل وشريط المحرر وصفحة الهبوط/الإدارة.

---

## 2. الاستدارة، أهداف النقر، والتركيز

- **هرمية الاستدارة (`--radius: 0.375rem` = 6px):**
  - التحكم والبطاقات الداخلية: `rounded-md` (4px، بلا ظل داخلي).
  - الأسطح العائمة (`Popover`/`DropdownMenu`/`CommandPalette`): `rounded-lg shadow-fluent-16` (6px).
  - الحوارات (`Dialog`/`AlertDialog`): `rounded-xl shadow-fluent-16` (10px). يُمنع `rounded-2xl` و`rounded-3xl`.
  - لوح المفتش: `rounded-none` بصفوف متتابعة تفصلها خطوط شعرية (`border-b border-border/55`). `FluentSection` و`FluentSliderField` و`FluentSettingRow` بلا خاصية `icon`.
- **أهداف النقر:** `h-7 w-7` (`28×28px` لسطح المكتب `compact`)، `44×44px` (`coarse` للمس)، `h-8` (`32px`) للحقول والأزرار القياسية، `h-9` للإجراءات البارزة، `h-12` / `min-h-12` لأشرطة الأوامر ورأس اللوح.
- **حلقة التركيز المزدوجة:** `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none`.

---

## 3. الأيقونات، الحوارات، والوصولية (Radix & Portals)

- **الأيقونات:** تُستورد حصراً من `@/components/ui/icons` (المبنية على `@fluentui/react-icons`)؛ يُمنع استيراد `@phosphor-icons/react`، وتستخدم `admin-web/` حزمة `lucide-react`. الزر الأيقوني يحمل `aria-label`، والأيقونة الزخرفية `aria-hidden`.
- **الحوارات وPortals:** استخدم Radix Portal / أغلفة المشروع المشتركة (`DialogContent` مع `showCloseButton={false}` + `DialogCloseButton` داخل `DialogHeader`). كل حوار يحمل `DialogTitle` (ولو `sr-only`)، وإذا لم يحتج وصفاً يُضبط `aria-describedby={undefined}` صراحةً لا معرّف مفقود. لا Portal مزدوج ولا فرض `document.body`.
- **الانتظار وملكية المحاولة:** `<1s` بلا وميض، `1–3s` spinner، `>3s` أو مدة مجهولة `indeterminate` افتراضياً (`progress` فقط مع `measured` عبر `pickWaitComponent`). كل عملية غير متزامنة في الحوار محروسة بمعرّف محاولة/جيل جلسة في النتيجة و`catch` و`finally`.
- **الحركة والاختصارات:** الألواح تستخدم `motion-safe:animate-in motion-safe:fade-in motion-safe:duration-100` و`motion-reduce:transition-none`. الاختصارات العامة في `frontend/src/hooks/use-keyboard-shortcuts.ts` وأوامر اللوحة الوحيدة `WorkspacePanelRail` (`Ctrl+K`) في `frontend/src/lib/workspace-tools.ts` بلا `grido:*` ميت.

---

## 4. أمثلة قياسية ملتزمة بالتوكنز

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogCloseButton,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    showCloseButton={false}
    aria-describedby={undefined}
    className="w-[95vw] sm:max-w-[700px] border border-border/60 bg-background/95 backdrop-blur-xl rounded-xl shadow-fluent-16 p-5 z-(--z-dialog)"
    dir="rtl"
  >
    <DialogHeader className="border-b border-border/40 pb-3.5">
      <div className="flex items-center justify-between gap-3">
        <DialogTitle className="text-base font-bold text-foreground">عنوان النافذة</DialogTitle>
        <DialogCloseButton className="h-7 w-7 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none" />
      </div>
    </DialogHeader>
    <div className="py-4 space-y-4">{/* محتوى واضح بذاته */}</div>
    <DialogFooter className="border-t border-border/40 pt-4 flex justify-end gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        إلغاء
      </Button>
      <Button className="bg-primary-action hover:bg-primary-action-hover text-primary-foreground">
        تنفيذ
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

```tsx
import { FluentSegmentedControl } from '@/components/ui/blocks/fluent-segmented-control';

<div className="flex items-center gap-2 border-b border-border/40 bg-background p-2">
  <FluentSegmentedControl {...segmentedProps} />
</div>;
```
