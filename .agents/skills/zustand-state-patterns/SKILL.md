---
name: zustand-state-patterns
description: أنماط وقواعد إدارة الحالة المركزية بـ Zustand v5 في Grido Studio (Slice Pattern, Selectors, Shallow Equality, Concurrency, and Stale-Closure Prevention)
---

# 🐻 أنماط إدارة الحالة المركزية بـ Zustand v5 (Zustand State Patterns)

تحدد هذه المهارة المعايير الهندسية والأنماط الرسمية لإدارة حالة المحرر والتطبيق عبر مكتبة **Zustand v5** في Grido Studio.
المرجع الأساسي: [Zustand v5 Migration & API Guide](https://github.com/pmndrs/zustand).

---

## 🎯 1. المبادئ الجوهرية في Zustand v5 (Core Principles)

1. **الوصول المباشر اللحظي مقابل الاشتراك التفاعلي (Direct vs Reactive):**
   - داخل معالجات الأحداث (Event Handlers) والعمليات غير المتزامنة ومستمعي أحداث Wails v3: استخدم دائماً `useEditorStore.getState()` لقراءة أو تحديث الحالة دون حجز دوال الإغلاق القديمة (Stale Closures).
   - داخل مكونات React أثناء العرض (Rendering): استخدم دائماً المحددات (Selectors) الذرية مع `useShallow` لمنع الـ Re-renders غير الضرورية.

2. **الصارمة النوعية (Strict Type Safety):**
   - لا تستخدم `create` المدمج دون تعريف نوع الشريحة الكامل `StateCreator`.
   - تجنب تحويلات النوع (`as any`)؛ كل إجراء (Action) ومحدد (Selector) يجب أن يكون موصوفاً بدقة كاملة.

---

## 🧩 2. نمط تجزئة الشرائح (Slice Pattern in Zustand v5)

ينقسم متجر Grido Studio المركزي إلى 7 شرائح في `frontend/src/lib/store/slices/`:
`core-slice.ts`, `grid-slice.ts`, `history-slice.ts`, `license-slice.ts`, `element-slice.ts`, `collage-slice.ts`, `print-slice.ts`.

### الهيكل القياسي لإنشاء الشريحة (Standard Slice Creator)

```typescript
import type { StateCreator } from 'zustand';

export interface MySlice {
  myValue: string;
  setMyValue: (val: string) => void;
  resetMyValue: () => void;
}

export const createMySlice: StateCreator<
  MyStoreType, // نوع المتجر الكامل
  [['zustand/devtools', never]], // الميدلوير إن وجد
  [],
  MySlice
> = (set, get) => ({
  myValue: 'initial',
  setMyValue: (myValue) => set({ myValue }),
  resetMyValue: () => set({ myValue: 'initial' }),
});
```

---

## ⚡ 3. قواعد الأداء والاشتراك الذري (Atomic Selectors & useShallow)

في Zustand v5، إرجاع كائن جديد من دالة الـ Selector دون مقارنة سطحية يؤدي إلى إعادة رندر المكون في كل تحديث للمتجر (أو خطأ `Maximum update depth exceeded` في بعض الحالات):

### ✅ الطريقة الصحيحة:

```typescript
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '@/lib/store';

// 1. استخراج حقل بدائي مفرد (لا يحتاج useShallow)
const zoom = useEditorStore((s) => s.zoom);

// 2. استخراج عدة حقول مجمعة في كائن واحد (يجب استخدام useShallow)
const { width, height, dpi } = useEditorStore(
  useShallow((s) => ({
    width: s.paperWidth,
    height: s.paperHeight,
    dpi: s.dpi,
  }))
);

// 3. استخراج دوال التحكم والإجراءات (مستقرة ولا تعيد الرندر)
const addImage = useEditorStore((s) => s.addImageElement);
```

### ❌ أخطاء محظورة:
- لا تُرجع كائناً جديداً من محدد عادي بدون `useShallow`:
  ```typescript
  // خطر: يعيد كائناً جديداً في كل نبضة متجر
  const { x, y } = useEditorStore((s) => ({ x: s.x, y: s.y }));
  ```
- لا تستورد المتجر بالكامل داخل مكون الكانفاس الحرج:
  ```typescript
  // كارثة في الأداء: الكانفاس سيعاد رسمه مع أي حركة فأرة أو تحديث للمتجر
  const store = useEditorStore();
  ```

---

## 🛡️ 4. تكامل Zustand v5 مع دورة حياة Wails v3

عند تلقي أحداث أو نتائج من Go Backend:
1. اقرأ الحالة دائماً بـ `getState()` داخل دوال رد النداء (Callbacks).
2. عند تطبيق التحديثات المتتالية (Batching)، دمج التغييرات في نداء `set()` واحد لتفادي وميض الواجهة.
3. التحديث الذري لتاريخ التراجع (`history-slice`): لا تسجل التغييرات المجهرية (مثل تحريك العنصر بالماوس أثناء الـ Drag) في التاريخ إلا عند `onDragEnd` وليس أثناء `onDragMove`.

---

## 🏛️ 5. قواعد متانة الحالة والتراجع (Undo/Redo & State Robustness)

1. **شمولية بذر لقطة التاريخ الابتدائية (History Seeding Parity):**
   عند تهيئة التاريخ أو فتح مشروع (`loadProject` / `reset`)، يجب أن تتضمن اللقطة الأولى `history[0]` كافة الحقول التي تستعيدها دالة `restoreEntry` (بما فيها `template` و `collageTemplate` وألوان التدرج `backgroundGradientColor2` و `backgroundGradientAngle`). غياب أي حقل عن اللقطة الابتدائية يجعل التراجع (Ctrl+Z) غير قادر على استعادة الحالة الأصلية ويترك التعديلات الجديدة عالقة.

2. **إعادة الربط المكاني عند تعديل أبعاد الكانفس والشبكة (Spatial Slot Remapping):**
   عند تعديل أبعاد الكانفاس (`setCanvasSize`) أو إعدادات الطباعة (`setPrintSettings`) في وضع الكولاج، يُمنع إجبارياً ربط الخانات القديمة بالجديدة عبر مؤشر المصفوفة `slots[i]`. يجب استخدام المطابقة المكانية لأقرب مركز خلية (`remapSlotsToCells`) لضمان بقاء الصور في مواضعها البصرية الصحيحة عند تغير ترتيب الشبكة. كما يجب تخطي إعادة بناء الخانات إذا لم تتغير أبعاد أو عدد الخلايا فعلياً.

3. **حظر مشاركة مراجع الكائنات الافتراضية (No Shared Module-Level State References):**
   يُمنع استخدام مراجع مصفوفات أو كائنات افتراضية على مستوى الموديول (مثل `DEFAULT_COLLAGE_STATE.slots`) مباشرة داخل الـ Store؛ بل يجب دائماً توليد نسخ جديدة وعميقة عبر دوال تصنيع (`generateInitialSlots()` أو عمل Deep Clone) لمنع تلوث الحالة الافتراضية بين عمليات إعادة التعيين (`reset`).

4. **توليد المعرفات الآمن ضد التصادم (Collision-Proof Unique IDs):**
   يُمنع استخدام `Date.now() + Math.random()` لتوليد معرفات المجموعات أو العناصر (`groupId`, `id`) في العمليات الدفعية أو السريعة. يجب الاعتماد حصراً على `crypto.randomUUID()` لضمان استحالة التصادم.
