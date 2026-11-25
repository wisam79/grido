---
trigger: glob
glob: '{frontend/src/**/*.{ts,tsx,css,html},frontend/index.html,admin-web/src/**/*.{ts,tsx,css,html}}'
description: 'قواعد واجهة وتجربة المستخدم ومعايير Microsoft Fluent 2 المحلية في Grido Studio'
---

# قواعد الواجهة وتجربة المستخدم (UI/UX & Fluent 2)

المصدر التنفيذي والتفاصيل: `.agents/skills/grido-ui-system/SKILL.md` و`frontend/src/index.css`.

- **الأولوية والمراجع:** السلامة وصدق الحالة والوضوح والوصولية تسبق المينيمالية والحركة. قيم الكثافة والاستدارة ومهل الانتظار سياسة Grido محلية لا متطلبات Microsoft/WCAG عامة. لا يُحذف دليل أو تأكيد في `scripts/docs-gate.mjs` أو الحراس القائمة.
- **الاستدارة (`--radius: 6px`):** `rounded-md` (4px للتحكم/البطاقات الداخلية بلا ظل)، `rounded-lg shadow-fluent-16` (6px للعائمة)، `rounded-xl shadow-fluent-16` (10px للحوارات)، `rounded-none` لصفوف المفتش مع `border-b border-border/55`، و`rounded-full` للكبسولات/الأفاتار. يُمنع `rounded-2xl`/`rounded-3xl`.
- **أهداف النقر والتركيز:** `h-7 w-7` (`compact` 28×28px)، `44×44px` (`coarse` للمس)، `h-8` قياسي، `h-9` بارز، `h-12`/`min-h-12` للأشرطة ورأس اللوح. حلقة التركيز المزدوجة: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none`. العقود الأصغر القديمة (مثل `h-6 w-6`) لا تُسقط صامتاً.
- **الأيقونات والاختصار (Zero Visual Filler):** الأيقونات للأفعال والحالات فقط (لا أيقونة في `FluentSection` أو `FluentSliderField` أو `FluentSettingRow`)؛ الزر الأيقوني يحمل `aria-label`، والأيقونة الزخرفية تُخفى عن قارئ الشاشة. يُمنع تكرار التسميات أو الوصف البديهي، مع حفظ التحذيرات والعواقب والوحدات اللازمة. `DialogTitle` إلزامي ولو `sr-only`، وعند انعدام الوصف يُضبط `aria-describedby={undefined}`.
- **الحوارات وPortals:** `DialogCloseButton` داخل `DialogHeader` (`flex items-center justify-between`) مع `showCloseButton={false}`. استخدم Radix Portal / أغلفة المشروع دون Portal مزدوج أو فرض `document.body` أو ترقيع `transform`/`overflow` برفع `z-index` وحده.
- **الانتظار وملكية المحاولة:** `<1s` بلا مؤشر مزعج، `1–3s` spinner، `>3s`/مجهول `indeterminate` (`progress` فقط مع `measured` عبر `pickWaitComponent`). كل محاولة غير متزامنة تحمل معرّف محاولة/جيل يمنع النتائج القديمة و`catch`/`finally` من التحديث بعد الإغلاق مع الحفاظ على ملكية العمل الخلفي.
- **تنظيم المفتش والألواح:** أهلية التبويبات سياقية (`Style`, `Colors/Adjust`, `Effects`, `Arrange`) مع بديل صالح دون أدوات وهمية. تحديد عنصر يفتح `properties` ويعيد الحالة السابقة عند الإلغاء (`frontend/test/use-workspace-panels.test.ts`). المساطر `20px` مثبتة في حواف الشاشة خارج Scroll Area وتُبرز `(0,0)` وأطراف الورقة، وقوالب الكولاج تُلتقط ديناميكياً من `collageTemplate`.
- **مصدر واحد للاختصارات والأوامر:** الاختصارات العامة في `frontend/src/hooks/use-keyboard-shortcuts.ts`، والأوامر في `WORKSPACE_COMMANDS`/`WORKSPACE_STATE_COMMANDS` ضمن `frontend/src/lib/workspace-tools.ts` عبر اللوحة الوحيدة `WorkspacePanelRail` (`Ctrl+K`) بلا أحداث `grido:*` ميتة أو `keydown` خام على `window`.
- **السجلات والحركة والتفضيلات:** استخدم `createLogger('ComponentName')` من `src/lib/logger` بدل `console.error`/`console.warn` في العمليات الحساسة. الألواح تستعمل تلاشي `motion-safe:duration-100` و`motion-reduce:transition-none` دون تحريك height مستمر. تفضيلات الواجهة الخفيفة تُحفظ في `localStorage`. صفحة `/cam` أداة خدمية صادقة الحالة (`facingMode: { ideal: "environment" }`).
