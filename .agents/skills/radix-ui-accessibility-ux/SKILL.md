---
name: radix-ui-accessibility-ux
description: معايير وأصول إمكانية الوصول والتفاعل لنوافذ وقوائم Radix UI (Keyboard Navigation, Focus Trapping, ARIA Semantics, and Dialog/Dropdown Architecture)
---

# إمكانية الوصول وتجربة المستخدم بـ Radix UI

## المصدر وأولوية التعارض

[Radix Primitives Documentation](https://www.radix-ui.com/primitives) مرجع خارجي لسلوك المكتبة و[Microsoft Fluent 2](https://fluent2.microsoft.design/) مرجع تصميم. لم تُنفّذ مراجعة شبكية للمراجع في موجة 0 بتاريخ 2026-11-13؛ لا تُنسب سياسات Grido التنفيذية أو أزمنة الحركة/أهداف النقر إلى Radix أو WAI-ARIA كمتطلبات عامة.

**سياسة Grido المحلية** في `.agents/rules/ui-ux-fluent.md`: السلامة وصدق الحالة والوضوح وإمكانية الوصول تسبق المينيمالية والحركة. تُحفظ أدلة الكود والحراس في `scripts/docs-gate.mjs` دون حذف أو تخفيف؛ هذه الموجة لا تغيّر التوثيق الرسمي أو `.agents/AGENTS.md` ولا تشغّل GUI/E2E.

## 1. مبادئ التركيب والوصول

- يُحافظ على سلوك إدارة التركيز وARIA في الـ primitive/الغلاف المشترك؛ `asChild` يحتاج عنصراً يقبل props وref، ولا يبرر زرّاً داخل زرّ.
- Dialog modal يحصر التركيز؛ non-modal لا يُعامل كأنه modal. Escape/الإغلاق يعيدان التركيز إلى trigger إن بقي صالحاً أو إلى بديل منطقي؛ الاستثناءات الخطرة تحتاج سياسة واضحة لا إلغاءً عاماً للخروج.
- لا حد مطلق لمستويين لشجرة React؛ تُحفظ طبقات السياق والدلالات اللازمة وتُزال الأغلفة الزخرفية فقط.
- الاسم الوصولي على الزر/الحقل؛ الأيقونة الزخرفية مخفية وصولياً وTooltip لا يعوّض الاسم أو التعليمات المطلوبة.
- أهداف التفاعل **الفعلية**: `coarse` 44×44px للمس، و`compact` 28×28px لسطح المكتب ذي المؤشر الدقيق؛ تُقاس حدود استقبال المؤشر بعد التحويل والقص والتداخل، لا glyph أو فراغ. هذه سياسة منتج وليست حد WCAG موحّداً. تبقى أدلة العقود القديمة الأصغر حتى مراجعتها.
- حلقة تركيز مرئية غير مقصوصة وتقليل حركة يحفظ المعلومة، لا `outline-none` منفردة بلا بديل.

## 2. Dialog / AlertDialog: الاسم والوصف

كل حوار يحتاج اسماً واضحاً عبر `Dialog.Title`/`AlertDialog.Title` أو الغلاف المشترك. يمكن `sr-only` للعنوان إن كانت الهوية مرئية من السياق. الوصف ليس نصاً تلقائياً لكل Dialog؛ يبقى مطلوباً حين يشرح خطوة أو قيداً أو عاقبة، ويظهر بصرياً إن يحتاجه الجميع. لا تحذير أو تعليمات لازمة تُحذف بالمينيمالية.

- إن كان الوصف موجوداً يُربط بمعرّف صحيح؛ يمكن إخفاؤه بصرياً مع بقائه متاحاً لقارئ الشاشة فقط حين لا يحتاجه المستخدم المبصر.
- إذا لم يحتج Dialog فعلاً وصفاً: `aria-describedby={undefined}` صراحة، لا معرّف مفقود ولا وصف حشو لتهدئة تحذير.
- AlertDialog يعرض عاقبة الإجراء وسبيل الإلغاء بوضوح؛ استثناء الحوار البسيط لا يبرر حذف معلومات السلامة.

### مثال Portal Radix الأصلي

مثال تركيبي يستخدم `z-50` المرخّص للـ overlay primitives في حارس المشروع؛ لا يُنقل هذا الترخيص إلى مكونات أخرى. في التطبيق يُفضّل غلاف Grido الذي يدير التركيز والاتجاه وPortal.

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function PrintPreviewModal({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/70 z-50" />
        <Dialog.Content
          className="fixed inset-0 m-auto h-fit w-[95vw] sm:max-w-[700px] bg-card p-6 rounded-xl shadow-fluent-16 z-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          dir="rtl"
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              معاينة وإعدادات الطباعة
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="إغلاق"
                className="h-7 w-7 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                إغلاق
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-muted-foreground mt-1">
            راجع الطابعة وهوامش القص وأبعاد الورق قبل إرسال المهمة.
          </Dialog.Description>
          <div className="mt-4">{/* إعدادات الطباعة */}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

المثال compact؛ عند دعم coarse تُوسّع حدود الزر الفعلية إلى 44×44px، لا الأيقونة وحدها. Radix يربط الوصف الخاص بالمحاولة عبر معرّفاته؛ لا `id` ثابت يكرر بين نسختين.

## 3. القوائم والتبويبات والسياق

- ArrowDown/ArrowUp للتنقل وتخطي disabled، وArrowRight/ArrowLeft للقوائم الفرعية بحسب RTL/LTR، وEnter/Space للتفعيل وفق primitive.
- `loop` يُستخدم إذا كان مناسباً لنمط القائمة؛ لا إعادة بناء roving focus بمستمع عالمي.
- أهلية التبويبات (`context eligibility`) تتبع قدرة العنصر والقفل والتحديد. يجوز إخفاء/تعطيل غير القابل للتطبيق مع سبب عند الحاجة وبديل نشط صالح ومزامنة الاختيار؛ لا فرض تمكين الجميع ولا تبويبات وهمية.
- القوائم المتأثرة بـ `transform`/القص تُفصل عن الحاوية المسببة عبر Portal الأصلي أو الغلاف المشترك. لا Portal مزدوج ولا فرض `document.body` لكل حالة؛ `container` المناسب يحفظ نطاق الحوار والتركيز والاتجاه والثيم ويخرج من التحويل/القص. رفع z-index وحده لا يصلح containing block.

## 4. قواعد التنفيذ المحلية

### الطبقات وقفل التفاعل

التوكنز الفعلية من `frontend/src/index.css` والأغلفة المشتركة؛ لا توكن z أو shadow غير معرّف. يبقى ترخيص `z-50` الحالي لمكونات overlay كما يثبّته `frontend/test/ui-compliance.test.ts`، ولا يُخفّف الحارس أو يُعمم الترخيص.

Radix يدير scroll/focus/dismissable-layer بحسب primitive و`modal`، لا كل قائمة تقفل body. لا تلاعب يدوي بـ `document.body.style.overflow` أو `pointerEvents` لتجاوز إدارة الطبقات؛ وجود modal آخر مفتوح قد يبرر بقاء القفل.

### الحفظ غير المتزامن وملكية المحاولة

- حوار يحتاج نتيجة الحفظ يبقى مفتوحاً مع حالة صادقة ويغلق بعد نجاح **محاولته الحالية** فقط. السماح بإغلاق/إلغاء اختياري حسب القدرة والخطر، لا نجاح وهمي.
- أكثر من 3s/مدة مجهولة: `indeterminate` افتراضياً. شريط `progress` فقط مع `measured` من العملية؛ لا نسبة/ETA من مؤقت. `pickWaitComponent` يحافظ على الاستدعاء القديم ويضيف قدرة قياس اختيارية.
- العمل غير المنتهي بعد الإغلاق ذو ملكية غير صفرية عند المالك الصحيح حتى الاكتمال. الإغلاق إلغاء حقيقي إن أمكن أو نقل ملكية خلفية وسحب صلاحية الجلسة القديمة؛ تصفير علم الحوار لا يثبت إنهاء العمل.
- معرّف محاولة/جيل جلسة يحرس النتيجة و`catch` و`finally` والإغلاق؛ القديمة لا تطبق بيانات ولا تغلق جلسة أحدث ولا تصفّر عملها. `useEffect` على open و`finally` غير محروسين ليسا ضمان سلامة.
- إعادة الفتح لا ترث تحميل الحوار القديم؛ يُعرض العمل الخلفي المستمر بصدق عند مالكه.

### الحركة

الحركات القصيرة سياسة محلية، لا مدة Radix ثابتة: تقليل الحركة يحفظ الحالة ويزيل الزخرفي. تحريك الارتفاع قد يستدعي layout/paint؛ لا تعميم ادعاء GPU أو أن CSS أسرع دون قياس. الاختيار يراعي زمن الاستجابة والتركيز، لا اسم مكتبة التحريك.

### الأوامر العالمية بلا ازدواج

لوحة واحدة `WorkspacePanelRail`، تسجيل الاختصارات العامة في `frontend/src/hooks/use-keyboard-shortcuts.ts` والأوامر في `WORKSPACE_COMMANDS`/`WORKSPACE_STATE_COMMANDS` داخل `frontend/src/lib/workspace-tools.ts`. لا مستمع `keydown` عالمي بديل أو أمر `grido:*` بلا مستمع لدى مالك القدرة؛ تبقى حراس الحقول وأدلة عدم الازدواج.

## 5. بروتوكول الاختبار عند الانتقال إلى الكانفاس

هذه إرشادات لصيانة الاختبارات، لا تشغيل E2E في موجة 0. لا افتراض أن كل Select/Popover يقفل pointer-events ولا أن مدة الإغلاق ثابتة 75ms. عند إغلاق طبقة modal قد يستمر قفل DismissableLayer حتى نهاية الخروج؛ وجود طبقة أخرى قد يبقيه مقصوداً.

إذا كانت القائمة آخر مالك للقفل وسيستأنف الاختبار التفاعل مع الكانفاس: ينتظر اختفاء القائمة وتحرير القفل الفعلي، لا sleep ثابتاً ولا تصفيراً يدوياً:

```typescript
await page.getByRole('option', { name: '200px', exact: true }).click();
await expect(page.getByRole('listbox')).toBeHidden();
await page.waitForFunction(() => document.body.style.pointerEvents !== 'none');
```

إذا بقي حوار modal آخر فلا يُفترض تحرير body؛ يستهدف الاختبار المحتوى المؤهل داخل الحوار، ولا يفرض إيماءة كانفاس خارجه. اختبارات مصدر/توكن لا تثبت مسارات التركيز أو حدود النقر الفعلية.
