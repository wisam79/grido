---
name: grido-ui-designer-guide
description: دليل تصميم الواجهات وتجربة المستخدم في Grido Studio (Icon-Driven UI + Zero Visual Filler + Figma-like Aesthetic + React Portals)
---

# دليل واجهات وتجربة المستخدم (UI/UX Designer Guide)

## المصدر وأولوية التعارض

[Microsoft Fluent 2](https://fluent2.microsoft.design/) و[Radix Primitives](https://www.radix-ui.com/primitives) مراجع خارجية، لا إثبات لكل قرار تنفيذي هنا. لم تُنفّذ مراجعة شبكية للمراجع في موجة 0 بتاريخ 2026-11-13. كثافة سطح المكتب والمينيمالية والاستدارة وتنظيم المفتش **سياسة Grido المحلية** في `.agents/rules/ui-ux-fluent.md` والكود المشترك.

السلامة وصدق الحالة والوضوح وإمكانية الوصول تسبق الاختصار والزخرفة والحركة. لا يُخفّف حارس قائم أو دليل في `scripts/docs-gate.mjs` لإخفاء تعارض؛ هذه الموجة لا تغيّر التوثيق الرسمي أو `.agents/AGENTS.md` ولا تثبت baseline GUI.

## 1. المبادئ التصميمية الأساسية

1. **أيقونات وظيفية، لا فرض ولا زينة:**
   - تُستخدم للأفعال أو الحالات ذات معنى مستقل، لا استبدال تعليمات لازمة أو حشر أيقونة بجوار تسمية واضحة.
   - صفوف `FluentSliderField` و`FluentSettingRow` ورأس `FluentSection` بلا خاصية `icon`؛ ميزانية منخفضة تجعل أيقونات الأفعال مقروءة.
   - الزر الأيقوني يحمل اسماً وصولياً على الزر نفسه؛ الأيقونة الزخرفية `aria-hidden`. Tooltip تفصيل ثانوي يدعم التركيز، وليس بديلاً للاسم أو شرح عاقبة خطرة.
   - تطبيق سطح المكتب يستورد حصراً من `@/components/ui/icons` فوق `@fluentui/react-icons` عبر `createIcon({ R, F })` و`FluentIconProvider` و`weight="regular"`. أسماء بأسلوب Phosphor (`Check`, `Sparkle`, `MagicWand`)، لكن `@phosphor-icons/react` غير مثبتة وممنوع استيرادها. `icons.tsx` مولّد (`/* GENERATED FILE */`) ولا يُعدّل يدوياً.
   - `admin-web/` يستخدم `lucide-react`؛ لا خلط حزم دون مبرر منصة.

2. **طابع سطح المكتب المحلي (معتمد 21 أكتوبر 2026):**
   - أسطح مسطّحة وحدود شعرية وكثافة ملائمة للمؤشر الدقيق.
   - `rounded-md` (4px) للتحكم/الأسطح الداخلية، `rounded-lg` (6px) للعائمة، `rounded-xl` (10px) للحوارات. لا `rounded-2xl`/`rounded-3xl` في المحرر أو أمثلته؛ أي استثناء يحتاج مبرر نطاق وموافقة صريحة، لا تخفيف الحراس في هذه الموجة.
   - المفتش سطح واحد وصفوف بفواصل؛ الظلال `shadow-fluent-16` للعائمة فقط، وblur اختياري للعائمة لا لكل بطاقة.
   - لا حد مطلق لمستويين في شجرة React؛ يُزال التعشيش الزخرفي لا السياق والدلالات وإدارة التركيز اللازمة.
   - حد التفاعل الفعلي الأدنى `compact` 28×28px للمؤشر الدقيق و`coarse` 44×44px للمس. تُقاس المساحة القابلة للنقر بعد التحويل والقص والتداخل، لا glyph أو فراغ غير قابل للنقر. المقاسات سياسة المنتج لا حد WCAG موحّد؛ العقود القديمة الأصغر تُراجع ولا تُحذف أدلتها صامتاً.

3. **ألوان وتباين من الثيم:**
   - `bg-background`/`bg-card` و`text-foreground`/`text-muted-foreground` و`border-border/40`.
   - الأزرار التعبوية: `bg-primary-action hover:bg-primary-action-hover text-primary-foreground`، لا `bg-primary` الخام مع نص أبيض. معنى الحالة وتباينها يسبقان «هدوء» اللون.

4. **صفر حشو بصري، مع حفظ المعلومات المطلوبة:**
   - لا أيقونة زخرفية أو وصف مكرر افتراضي.
   - الوصف مطلوب إن يشرح خطوة أو قيداً أو عاقبة/خطر لا يفهم من العنوان؛ لا يُدفن في Tooltip ولا يُخفى بصرياً إن يحتاجه الجميع.
   - عنوان بطاقة مكرر قابل للحذف، لكن `DialogTitle` يبقى ولو `sr-only`. تسميات الحقول والوحدات اللازمة والأسماء الوصولية والتعليمات والتحذيرات ورسائل الخطأ/التحقق لا تُحذف بالمينيمالية.
   - **اختبار الحذف:** يُحذف عنصر فقط بعد إثبات عدم فقدان معلومة/وظيفة/اسم وصولي. عند الشك في السلامة أو الفهم تُحفظ المعلومة حتى تتضح الحاجة.
   - **Text Minimalism Gate:** لا تكرار لاسم القسم أو قيمة مرئية أو شرح فعل واضح؛ الاختصار لا يتقدم على الوضوح. كل نص إضافي له معنى غير مكرر، ولا تُختصر الأزرار الخطرة لدرجة غموض العاقبة.

## 2. Portal والتموضع ونطاق الحوار

`transform` قد ينشئ containing block، و`overflow` قد يقص القوائم؛ تُفصل القوائم المتأثرة عن الحاوية المسببة. يُستخدم **Portal Radix الأصلي** أو الغلاف المشترك (`DialogContent`/`SelectContent`/`PopoverContent`)، ولا يضاف Portal مزدوج حوله.

للمكونات المخصصة يمكن `React.createPortal` إلى حاوية مناسبة خارج التحويل/القص. لا يُفرض `document.body` لكل حالة: يُحافظ على نطاق الحوار وإدارة التركيز والاتجاه والثيم، بما فيها الحوارات المتداخلة والنوافذ المتعددة. رفع `z-index` وحده لا يصلح containing block أو القص. يُختبر موضع الطبقة وإمكانية الوصول إليها عند تعديلها؛ النص وحده ليس تحقق DOM/GUI.

## 3. المساطر الثابتة

- المساطر خارج Scroll Area وحاوية الورقة، مثبتة في حواف الشاشة.
- الحجم 20px. Major/Mid/Minor ticks بطول 10/6/3px عبر هندسة مجمعة.
- أصل `(0,0)` وأطراف الورقة مميزة بلون `primary` دون قلب إحداثيات الكانفاس.

## 4. هيكل الحوار القياسي

الغلاف المشترك يدير Portal Radix؛ زر الإغلاق داخل `DialogHeader` و`showCloseButton={false}` لمنع التكرار. المثال التالي بلا وصف لأن محتواه لا يحتاج تعليمات إضافية؛ إن وجدت عاقبة أو قيد يبقى `DialogDescription` مرتبطاً وصريحاً.

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
    className="w-[95vw] sm:max-w-[700px] border border-border/60 bg-background/95 backdrop-blur-xl rounded-xl shadow-fluent-16 p-5"
    dir="rtl"
  >
    <DialogHeader className="border-b border-border/40 pb-3.5">
      <div className="flex items-center justify-between gap-3">
        <DialogTitle className="text-base font-bold text-foreground">عنوان النافذة</DialogTitle>
        <DialogCloseButton />
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

لا `aria-describedby` إلى معرّف غير موجود. في AlertDialog تتضح عواقب الإجراء وسبيل الإلغاء؛ عدم الحاجة لوصف في Dialog بسيط ليس رخصة لحذف تعليمات أو تحذير مطلوب.

### الانتظار وملكية المحاولة

- مدد <1s بلا مؤشر مزعج، 1–3s spinner، وأكثر من 3s/مدة مجهولة `indeterminate` افتراضياً. `progress` فقط مع `measured` من مصدر العملية؛ لا نسبة أو ETA مصطنعين من مؤقت.
- `pickWaitComponent(expectedMs, progressCapability?)` يضيف قدرة اختيارية `'indeterminate' | 'measured'`؛ الاستدعاء القديم واتحاد الإرجاع محفوظان، والافتراضي الطويل `'spinner'`.
- تبقى النافذة مفتوحة أثناء حفظ يحتاج نتيجتها، أو يسمح بإغلاقها وفق سياسة واضحة. الإلغاء لا يعني إنهاء عمل خلفي إلا إن كان إلغاءً فعلياً.
- الإغلاق/إعادة الفتح لا يتركان حالة تحميل قديمة، لكن العمل غير المنتهي له ملكية غير صفرية عند المالك الصحيح حتى الاكتمال؛ يُلغى فعلياً أو تُنقل ملكيته وتُسحب صلاحية الجلسة القديمة.
- كل محاولة لها معرّف/جيل جلسة؛ النتيجة و`catch` و`finally` القديمة لا تطبق بيانات ولا تغلق جلسة أحدث ولا تصفّر تحميلها. لا يكفي `useEffect` على `open` مع `finally` غير محروسين.

### الحركة

إظهار مباشر وتلاشي قصير للألواح عبر `motion-safe:animate-in motion-safe:fade-in motion-safe:duration-100` وانتقالات لون/سهم حتى 150ms مع `motion-reduce:transition-none`. يُتجنب تحريك الارتفاع والزنبرك البطيء في المفتش، لا منع كل تعشيش/مكتبة حركة. layout/paint قد يتأثران بالارتفاع؛ لا ادعاء GPU أو تفوق CSS دون قياس. تقليل الحركة يحفظ الحالة والمعلومة.

### مصطلحات قصيرة حين تبقى واضحة

| السياق | الصياغة المحلية                                  |
| ------ | ------------------------------------------------ |
| ملف    | فتح صورة... / المشاريع... / تفريغ العمل          |
| تحرير  | تكرار / حذف                                      |
| عرض    | المساطر / الشبكة / الخصائص                       |
| خصائص  | التنسيق / الألوان أو الضبط / التأثيرات / الترتيب |
| تعبئة  | تعبئة الكل / تعبئة الفارغ / تعبئة الصف           |

كلمة/كلمتان تفضيل لا حد مطلق؛ تعليمات وعواقب مطلوبة لا تُنقل إلى Tooltip وحده.

## 5. الاستوديوهات والمكتبات وأهلية التبويبات

- تجميع تصنيفات متشابهة وكبسولات `flex-wrap`؛ 5–6 هدف محلي تقريبي لا فرض يحذف فئة لازمة.
- أيقونات أفعال مفيدة، لا شروحات/شارات مكررة في المفتش؛ التعليمات والتحذيرات المهمة محفوظة.
- القوائم داخل المودال تستخدم Portal الأصلي/الغلاف المناسب مع الحفاظ على نطاق الحوار، لا حلاً بـ z-index وحده.
- **Context eligibility:** يمكن إخفاء/تعطيل تبويب غير قابل للتطبيق حسب العنصر أو القفل أو التحديد، مع سبب مفهوم عند الحاجة وتبويب نشط بديل ومزامنة الاختيار. لا تمكين وهمي لكل التبويبات ولا تعطيل قدرة متاحة بالفعل. الألوان/الضبط يتبعان قدرات العنصر، ولا تبويبات داخلية مكررة.

## 6. مصدر واحد للاختصارات ولوحة الأدوات

**لوحة الأدوات واحدة فقط:** `WorkspacePanelRail` (Popover + cmdk) تُفتح بـ `Ctrl+K` ومن «عرض ← لوحة الأدوات». يُمنع إضافة لوحة أوامر ثانية لأنها تختطف الاختصار نفسه وتكسر ثابت حظر الازدواجية في `.agents/AGENTS.md`.

1. **مصدر الاختصارات:** كل اختصار عام حصراً في `frontend/src/hooks/use-keyboard-shortcuts.ts` عبر `useHotkeys` وحراس `ignoreEventWhen`. يُمنع مستمع `keydown` خام على `window` لاختصار جديد يتجاوز حراس الحقول.
2. **مصدر الأوامر:** كل أمر في `WORKSPACE_COMMANDS` (أحداث `grido:*`) أو `WORKSPACE_STATE_COMMANDS` (المتجر) داخل `frontend/src/lib/workspace-tools.ts`. لا توصيف JSX موازي للأوامر في اللوحة.
3. **حدث بلا مستمع = أمر ميت:** يُمنع حدث `grido:*` بلا مستمع حقيقي لدى مالك القدرة. يُنسخ المعرّف الصحيح (`grido:open-shortcuts` لا `grido:open-shortcuts-dialog`) وتبقى أدلة `e2e/command-palette-commands.spec.ts`، دون تشغيل E2E ضمن هذه الموجة.
4. **حقل shortcut أمانة عرض:** لا يعلن اختصار إلا وهو مسجّل بالصّيغة نفسها؛ «ملاءمة الكل» `Ctrl+0` و100% `Ctrl+1`. ما لا اختصار له بلا حقل، لا اختراع.
5. **هوية الحوار:** كل `DialogContent` له `DialogTitle` ولو `sr-only` لربط `aria-labelledby`، والوصف حين يلزم. لا تُحذف دلالات الوصول لتقليل النص.
