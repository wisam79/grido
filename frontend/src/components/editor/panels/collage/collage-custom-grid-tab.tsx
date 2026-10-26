import React, { useState } from 'react';
import { toast } from 'sonner';
import { FluentSection } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  GridFour,
  Plus,
  Minus,
  X,
  BookmarkSimple,
  CornersOut,
  Rows,
  Check,
  ArrowClockwise,
} from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getGridLimits, getPhotoDimensions } from './collage-grid-math';
import type { PhotoGridType, GridAlignment } from './collage-grid-math';
import type { DerivedCollageGrid } from '@/lib/canvas/collage-grid';

/* ═══════════════════════════════════════════════════════════════
   تبويب الشبكة — تصميم Fluent 2 مريح ومتخصص حصراً في
   تخطيط وأبعاد ومقاسات شبكة صور الكولاج
   ═══════════════════════════════════════════════════════════════ */

/** حلقة التركيز المزدوجة الموحّدة (Dual Focus Ring) — المعيار الإلزامي */
const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';

/**
 * مفاتيح بطاقات تبويب الشبكة القابلة للطي — تُحفظ حالة الطي محلياً لكل مستخدم
 * فتبقى اللوحة مرتبة كما تركها المستخدم، مع إمكانية فتح أكثر من بطاقة في الوقت نفسه بحرية تامة.
 */
type CollapseKey = 'dims' | 'photoSize' | 'align';
const COLLAPSE_PREF_KEY = 'grido-collage-grid-collapse';
const SOLO_SECTION_PREF_KEY = 'grido-collage-grid-solo-section';

const loadCollapsePrefs = (): Partial<Record<CollapseKey, boolean>> => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(SOLO_SECTION_PREF_KEY)) {
      localStorage.removeItem(SOLO_SECTION_PREF_KEY);
    }
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(COLLAPSE_PREF_KEY) : null;
    return raw ? (JSON.parse(raw) as Partial<Record<CollapseKey, boolean>>) : {};
  } catch {
    // خصوصية التصفح أو تخزين تالف — الطي الافتراضي (مفتوح) خيار آمن دائماً
    return {};
  }
};

/** زر عداد مدمج بمساحة لمس أوضح وحدود خفيفة */
const COUNTER_BTN = cn(
  'size-8 rounded-lg border border-border/70 bg-card text-muted-foreground flex items-center justify-center shadow-2xs cursor-pointer transition-all duration-150',
  'hover:bg-primary/15 hover:text-primary hover:border-primary/35 active:scale-95',
  'disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:text-muted-foreground disabled:hover:border-border/70 disabled:active:scale-100',
  FOCUS_RING,
);

const SECTION_CLASS = 'border-border/50 px-1 first:pt-1 last:pb-1';

/** مقاس الوثيقة كرسم مصغر متناسق الأبعاد بصرياً */
function DocumentPresetGraphic({ type, active }: { type: string; active: boolean }) {
  const activeBorder = active
    ? 'border-primary/70 bg-primary/15 text-primary'
    : // نص كامل بدل /70: الرمادي المخفف كان يهبط تحت حد WCAG AA على السطح الداكن
      'border-border/80 bg-muted/50 text-muted-foreground';
  if (type === 'stretch') {
    return (
      <div
        className={cn(
          'w-9 h-9 rounded-md border border-dashed flex items-center justify-center transition-colors',
          activeBorder,
        )}
      >
        <CornersOut className="w-4 h-4" weight="bold" />
      </div>
    );
  }

  // تمثيل نسبي دقيق لشكل وأبعاد كل وثيقة رسمية
  const ratioStyles: Record<string, string> = {
    visa: 'w-6 h-6 rounded-md', // مربع 1:1
    'iq-national-id': 'w-5 h-7 rounded-md', // 35:45 عمودي
    'iq-civil-id': 'w-5 h-7 rounded-md', // 32:40 عمودي
    'iq-general-id': 'w-5 h-8 rounded-md', // 40:60 عمودي مستطيل
    'iq-transactions': 'w-5 h-6 rounded-md', // 30:40 مدمج
  };
  const styleClass = ratioStyles[type] || 'w-4 h-6 rounded-md';

  return (
    <div aria-hidden="true" className={cn(styleClass, 'border transition-colors', activeBorder)} />
  );
}

const ALIGNMENT_MATRIX: GridAlignment[][] = [
  ['top-left', 'top-center', 'top-right'],
  ['center-left', 'center', 'center-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
];

const ALIGNMENT_LABELS: Record<GridAlignment, string> = {
  'top-left': 'أعلى اليسار',
  'top-center': 'أعلى الوسط',
  'top-right': 'أعلى اليمين',
  'center-left': 'منتصف اليسار',
  center: 'توسيط',
  'center-right': 'منتصف اليمين',
  'bottom-left': 'أسفل اليسار',
  'bottom-center': 'أسفل الوسط',
  'bottom-right': 'أسفل اليمين',
};

/** ترتيب المسح الشبكي لتسهيل تنقل لوحة المفاتيح في مصفوفة 3×3 */
const ALIGNMENT_ORDER: GridAlignment[] = ALIGNMENT_MATRIX.flat();

const PHOTO_TYPE_OPTIONS = [
  { value: 'iq-national-id', label: 'وطنية', dim: '35×45', sub: 'مم' },
  { value: 'iq-civil-id', label: 'أحوال', dim: '32×40', sub: 'مم' },
  { value: 'visa', label: 'فيزا', dim: '50×50', sub: 'مم' },
  { value: 'iq-general-id', label: 'عامة', dim: '40×60', sub: 'مم' },
  { value: 'iq-transactions', label: 'معاملات', dim: '30×40', sub: 'مم' },
  { value: 'stretch', label: 'تمدد حر', dim: 'ملء الحيز', sub: '' },
] as const;

export interface CollageCustomGridTabProps {
  rows: number;
  cols: number;
  photoType: PhotoGridType;
  gridAlign: GridAlignment;
  isCustomActive: boolean;
  /** شبكة القالب المطبقة على الكانفس (مشتقة من خاناته) — null إذا كانت غير منتظمة */
  appliedGrid?: DerivedCollageGrid | null;
  canvasWidth: number;
  canvasHeight: number;
  storedDpi: number;
  onRowsChange: (rows: number) => void;
  onColsChange: (cols: number) => void;
  onApply: (rows: number, cols: number, photoType?: PhotoGridType, align?: GridAlignment) => void;
  onPhotoTypeChange: (photoType: PhotoGridType) => void;
  onGridAlignChange: (align: GridAlignment) => void;
  onSaveCurrentAsTemplate: (name: string) => void;
  /** اختياري: لون الخلفية يُدار أساسياً في تبويب الورقة */
  backgroundColor?: string;
  onBackgroundColorChange?: (hex: string) => void;
}

export const CollageCustomGridTab = React.memo(function CollageCustomGridTab({
  rows,
  cols,
  photoType,
  gridAlign,
  isCustomActive,
  appliedGrid,
  canvasWidth,
  canvasHeight,
  storedDpi,
  onRowsChange,
  onColsChange,
  onApply,
  onPhotoTypeChange,
  onGridAlignChange,
  onSaveCurrentAsTemplate,
}: CollageCustomGridTabProps) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');

  /** حالة طي البطاقات محفوظة محلياً — كل بطاقة تُفتح وتُطوى باستقلالية تامة دون طي البقية */
  const [collapsePrefs, setCollapsePrefs] =
    useState<Partial<Record<CollapseKey, boolean>>>(loadCollapsePrefs);

  const setCardOpen = (key: CollapseKey) => (open: boolean) => {
    setCollapsePrefs((prev) => {
      const next = { ...prev, [key]: open };
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(COLLAPSE_PREF_KEY, JSON.stringify(next));
        }
      } catch {
        // التخزين غير متاح — الحالة تبقى في الذاكرة لهذه الجلسة فقط
      }
      return next;
    });
  };

  const { maxRows, maxCols } = getGridLimits(photoType, canvasWidth, canvasHeight, storedDpi);
  const maxPhotos = maxRows * maxCols;
  const totalPhotos = rows * cols;
  const isMaxFill = rows === maxRows && cols === maxCols;
  const isCornerStrip = rows === 1 && cols === Math.min(4, maxCols) && gridAlign === 'top-left';

  /**
   * صدق زر التطبيق: حالة «مطبق» لا تُعرض إلا إذا طابقت شبكة النموذج شبكة القالب
   * المطبّقة فعلياً على الكانفس (المشتقة من خاناته) — لا شبكة النموذج وحده.
   * وفي القوالب الفيزيائية يُشترط تطابق نوع المقاس والمحاذاة أيضاً، وإلا بقي
   * الزرّ في حالة التطبيق بعد أي تغيير عليهما في النموذج دون تطبيقه.
   * الشبكات غير المنتظمة (بلا صفوف/أعمدة واضحة) تبقي الزرّ في حالة التطبيق.
   */
  const isGridApplied =
    isCustomActive &&
    !showSaveForm &&
    appliedGrid != null &&
    appliedGrid.rows === rows &&
    appliedGrid.cols === cols &&
    (appliedGrid.source !== 'physical' ||
      (appliedGrid.photoType === photoType && appliedGrid.align === gridAlign));

  // نسبة تغطية الورقة: التمدد الحر يملأ الورقة دائماً 100%،
  // والمقاسات الفيزيائية تُحسب من مجموع مساحات الصور مقابل مساحة الورقة.
  const coverage = (() => {
    if (photoType === 'stretch') return 100;
    const { wMM, hMM } = getPhotoDimensions(photoType);
    const paperWmm = (canvasWidth / storedDpi) * 25.4;
    const paperHmm = (canvasHeight / storedDpi) * 25.4;
    const wRel = Math.min(1, wMM / paperWmm);
    const hRel = Math.min(1, hMM / paperHmm);
    return Math.min(100, Math.round(totalPhotos * wRel * hRel * 100));
  })();

  // تُطبَّق التعبئة السريعة بنداء واحد نهائي (لا حالات وسيطة تُلوّث سجل التراجع)
  const handleFillSheet = () => {
    onApply(maxRows, maxCols, photoType, gridAlign);
  };

  const handleCornerStrip = () => {
    onApply(1, Math.min(4, maxCols), photoType, 'top-left');
  };

  const handleSave = () => {
    if (!saveName.trim()) {
      toast.error('أدخل اسم القالب');
      return;
    }
    onSaveCurrentAsTemplate(saveName);
    setShowSaveForm(false);
    setSaveName('');
  };

  /** تنقل لوحة المفاتيح داخل مصفوفة المحاذاة (Roving Tabindex) */
  const handleAlignKeyDown = (e: React.KeyboardEvent, align: GridAlignment) => {
    // المصفوفة مرسومة داخل جزيرة dir="ltr" (سطر 545)، فالسهم يميناً يزيد
    // الفهرس. عكس القيم هنا كان يجعل التنقل مرئياً معكوساً.
    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
    };
    const delta = deltas[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const nextIndex = Math.max(0, Math.min(8, ALIGNMENT_ORDER.indexOf(align) + delta));
    onGridAlignChange(ALIGNMENT_ORDER[nextIndex]);
  };

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* ═══ بطاقة 1: أبعاد الشبكة والصفوف والأعمدة ═══ */}
      <FluentSection
        title="أبعاد الشبكة"
        className={SECTION_CLASS}
        collapsible
        open={collapsePrefs.dims ?? true}
        onOpenChange={setCardOpen('dims')}
        subtitle={
          <>
            الحد الأقصى{' '}
            <span className="font-mono font-bold text-foreground" dir="ltr">
              {maxRows}×{maxCols}
            </span>{' '}
            صور
          </>
        }
        action={
          <span
            className="h-5 text-2xs font-mono font-semibold px-2 rounded-full bg-muted/60 text-muted-foreground flex items-center select-none"
            title="نسبة تغطية الورقة"
            aria-label="نسبة تغطية الورقة"
          >
            {coverage}%
          </span>
        }
      >
        {/* عدادات الصفوف والأعمدة — شبكة ثنائية متوازنة */}
        <div className="grid grid-cols-2 gap-2">
          {/* عداد الصفوف */}
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/55 p-2.5">
            {/* الحد الأقصى مذكور مرة واحدة في عنوان القسم — لا نكرّره في كل عدّاد */}
            <div className="text-mini font-bold text-muted-foreground select-none">الصفوف</div>
            <div
              className="flex items-center justify-between gap-1"
              role="group"
              aria-label="عدد الصفوف"
            >
              <button
                type="button"
                disabled={rows <= 1}
                onClick={() => onRowsChange(Math.max(1, rows - 1))}
                title="تقليل صف"
                aria-label="تقليل عدد الصفوف"
                className={COUNTER_BTN}
              >
                <Minus className="w-3 h-3" weight="bold" />
              </button>
              <span
                aria-live="polite"
                className="min-w-6 text-center text-sm font-mono font-bold text-foreground select-none"
              >
                {rows}
              </span>
              <button
                type="button"
                disabled={rows >= maxRows}
                onClick={() => onRowsChange(Math.min(maxRows, rows + 1))}
                title="إضافة صف"
                aria-label="زيادة عدد الصفوف"
                className={COUNTER_BTN}
              >
                <Plus className="w-3 h-3" weight="bold" />
              </button>
            </div>
          </div>

          {/* عداد الأعمدة */}
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/55 p-2.5">
            <div className="text-mini font-bold text-muted-foreground select-none">الأعمدة</div>
            <div
              className="flex items-center justify-between gap-1"
              role="group"
              aria-label="عدد الأعمدة"
            >
              <button
                type="button"
                disabled={cols <= 1}
                onClick={() => onColsChange(Math.max(1, cols - 1))}
                title="تقليل عمود"
                aria-label="تقليل عدد الأعمدة"
                className={COUNTER_BTN}
              >
                <Minus className="w-3 h-3" weight="bold" />
              </button>
              <span
                aria-live="polite"
                className="min-w-6 text-center text-sm font-mono font-bold text-foreground select-none"
              >
                {cols}
              </span>
              <button
                type="button"
                disabled={cols >= maxCols}
                onClick={() => onColsChange(Math.min(maxCols, cols + 1))}
                title="إضافة عمود"
                aria-label="زيادة عدد الأعمدة"
                className={COUNTER_BTN}
              >
                <Plus className="w-3 h-3" weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* اختصارا التعبئة في صف واحد بسيط */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleFillSheet}
            title="ملء الورقة فوراً"
            aria-label="ملء الورقة فوراً"
            className={cn(
              'h-8 px-2.5 rounded-lg text-mini font-sans font-medium transition-colors cursor-pointer select-none flex items-center justify-between gap-1.5 border',
              isMaxFill
                ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/70 border-transparent',
              FOCUS_RING,
            )}
          >
            <span className="flex items-center gap-1.5 min-w-0 font-sans whitespace-nowrap">
              <CornersOut
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  isMaxFill ? 'text-primary' : 'text-muted-foreground',
                )}
                weight="bold"
              />
              <span>ملء الورقة</span>
            </span>
            <span
              className={cn(
                'text-2xs font-mono px-1.5 py-0.5 rounded-sm border shrink-0',
                isMaxFill
                  ? 'bg-primary/10 text-primary border-primary/15 font-bold'
                  : 'bg-muted/50 text-muted-foreground border-border/40',
              )}
            >
              {maxPhotos}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCornerStrip}
            title="صف بأربع صور"
            className={cn(
              'h-8 px-2.5 rounded-lg text-mini font-sans font-medium transition-colors cursor-pointer select-none flex items-center justify-between gap-1.5 border',
              isCornerStrip
                ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/70 border-transparent',
              FOCUS_RING,
            )}
          >
            <span className="flex items-center gap-1.5 min-w-0 font-sans whitespace-nowrap">
              <Rows
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  isCornerStrip ? 'text-primary' : 'text-muted-foreground',
                )}
                weight="bold"
              />
              <span>شريط علوي</span>
            </span>
            <span
              className={cn(
                'text-2xs font-mono px-1.5 py-0.5 rounded-sm border shrink-0',
                isCornerStrip
                  ? 'bg-primary/10 text-primary border-primary/15 font-bold'
                  : 'bg-muted/50 text-muted-foreground border-border/40',
              )}
            >
              {Math.min(4, maxCols)}
            </span>
          </button>
        </div>
      </FluentSection>

      {/* ═══ بطاقة 2: مقاس الوثيقة الرسمي ═══ */}
      <FluentSection
        title="مقاس الصورة"
        className={SECTION_CLASS}
        collapsible
        open={collapsePrefs.photoSize ?? true}
        onOpenChange={setCardOpen('photoSize')}
      >
        <div className="grid grid-cols-2 gap-2">
          {PHOTO_TYPE_OPTIONS.map((opt) => {
            const isActive = photoType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isActive}
                title={`${opt.label} — ${opt.dim}`}
                onClick={() => onPhotoTypeChange(opt.value as PhotoGridType)}
                className={cn(
                  'relative min-h-[52px] py-2 px-2.5 rounded-lg border font-sans transition-colors cursor-pointer select-none flex items-center gap-2 text-start',
                  isActive
                    ? 'border-primary/50 bg-primary/15'
                    : 'bg-transparent border-border/50 hover:bg-muted/40 hover:border-border/80',
                  FOCUS_RING,
                )}
              >
                <DocumentPresetGraphic type={opt.value} active={isActive} />
                <span className="min-w-0 flex-1 text-start font-sans">
                  <span
                    className={cn(
                      'block text-xs truncate',
                      isActive ? 'text-foreground font-semibold' : 'text-foreground font-medium',
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="flex items-center gap-1 text-mini text-muted-foreground font-mono mt-0.5 whitespace-nowrap">
                    <span dir="ltr" className="text-muted-foreground-hover">
                      {opt.dim}
                    </span>
                    {opt.sub && <span>{opt.sub}</span>}
                  </span>
                </span>
                {/* تأكيد بصري غير لوني للخيار المحدد بموضع مطلق في زاوية البطاقة لمنع تكسر الأسطر وإزاحة التخطيط */}
                {isActive && (
                  <Check className="absolute top-1.5 end-1.5 w-3 h-3 text-primary" weight="bold" />
                )}
              </button>
            );
          })}
        </div>
      </FluentSection>

      {/* ═══ بطاقة 3: المحاذاة على الورقة (تظهر فقط عند تثبيت المقاس) ═══ */}
      {photoType !== 'stretch' && (
        <FluentSection
          title="المحاذاة على الورقة"
          className={SECTION_CLASS}
          collapsible
          open={collapsePrefs.align ?? true}
          onOpenChange={setCardOpen('align')}
        >
          <div className="flex items-center justify-center">
            {/* مصفوفة الارتكاز — dir="ltr" مقصودة: خريطة مكانية للورقة لا نص متدفق */}
            <div
              role="radiogroup"
              aria-label="نقطة ارتكاز الصور على الورقة"
              className="w-[108px] h-[108px] rounded-lg border border-border/60 bg-background/45 p-2 grid grid-cols-3 grid-rows-3 gap-1 select-none relative"
              dir="ltr"
            >
              <div className="absolute inset-2 pointer-events-none border border-dashed border-border/60 rounded-md" />
              {ALIGNMENT_MATRIX.map((row) =>
                row.map((alignId) => {
                  const isActive = gridAlign === alignId;
                  return (
                    <button
                      key={alignId}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      aria-label={ALIGNMENT_LABELS[alignId]}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => onGridAlignChange(alignId)}
                      onKeyDown={(e) => handleAlignKeyDown(e, alignId)}
                      title={ALIGNMENT_LABELS[alignId]}
                      className={cn(
                        'relative flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-muted/70',
                        FOCUS_RING,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'rounded-full transition-colors duration-150',
                          isActive
                            ? 'w-3.5 h-3.5 bg-primary ring-3 ring-primary/25'
                            : // نقاط كاملة بدل /50: نقاط الارتكاز كائنات رسومية تتطلب 3:1 على الأقل
                              'w-2.5 h-2.5 bg-muted-foreground/80 border border-border/40',
                        )}
                      />
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </FluentSection>
      )}

      {/* ═══ بطاقة 4: إجراءات التطبيق والحفظ — مثبتة أسفل اللوحة أثناء التمرير
          حتى تبقى الأفعال الرئيسية في متناول اليد مهما طالت البطاقات فوقها */}
      <div className="sticky bottom-0 z-10 border-t border-border/70 bg-card/95 px-2.5 pb-2 pt-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="lg"
            variant={isGridApplied ? 'outline' : 'default'}
            className="min-h-11 min-w-0 flex-[1.2]"
            onClick={() => onApply(rows, cols, photoType, gridAlign)}
            title={isGridApplied ? 'إعادة تطبيق الشبكة على الكانفس' : 'تطبيق الشبكة على الكانفس'}
          >
            {isGridApplied ? (
              <ArrowClockwise className="w-4 h-4" weight="bold" />
            ) : (
              <GridFour className="w-4 h-4" weight="bold" />
            )}
            <span>تطبيق الشبكة</span>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="min-h-11 min-w-0 flex-1"
            onClick={() => {
              setSaveName(
                `شبكة ${rows}×${cols} — ${getPhotoDimensions(photoType).label.split(' ')[0]}`,
              );
              setShowSaveForm(true);
            }}
            title="حفظ في المكتبة"
          >
            <BookmarkSimple className="w-4 h-4" weight="regular" />
            <span>حفظ كقالب</span>
          </Button>
        </div>
        {!showSaveForm ? null : (
          <div className="mt-2 flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-lg border border-border/80 shadow-2xs animate-in slide-in-from-top-2 duration-200">
            <Input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="اسم القالب"
              aria-label="اسم القالب"
              className="flex-1 text-start font-cairo"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowSaveForm(false)}
              title="إلغاء"
              aria-label="إلغاء حفظ القالب"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </Button>
            <Button type="button" onClick={handleSave}>
              <BookmarkSimple className="w-3.5 h-3.5" weight="bold" />
              <span>حفظ</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
