import React, { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  GridFour,
  Plus,
  Minus,
  Crosshair,
  X,
  FloppyDisk,
  CornersOut,
  Rows,
  Ruler,
  Scissors,
  Check,
  CheckCircle,
  ArrowClockwise,
} from '@/components/ui/icons';
import {
  PhotoGridType,
  GridAlignment,
  getGridLimits,
  getPhotoDimensions,
} from './collage-grid-math';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FluentSection } from '@/components/ui/blocks';

/* ═══════════════════════════════════════════════════════════════
   تبويب الشبكة — تصميم Fluent 2 مريح ومتخصص حصراً في
   تخطيط وأبعاد ومقاسات شبكة صور الكولاج
   ═══════════════════════════════════════════════════════════════ */

/** حلقة التركيز المزدوجة الموحّدة (Dual Focus Ring) — المعيار الإلزامي */
const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';

/**
 * مفاتيح بطاقات تبويب الشبكة القابلة للطي — تُحفظ حالة الطي محلياً لكل مستخدم
 * (نفس نمط سجل workspace-tools) فتبقى اللوحة مرتبة كما تركها المستخدم.
 */
type CollapseKey = 'dims' | 'photoSize' | 'align';
const COLLAPSE_PREF_KEY = 'grido-collage-grid-collapse';

const loadCollapsePrefs = (): Partial<Record<CollapseKey, boolean>> => {
  try {
    const raw = localStorage.getItem(COLLAPSE_PREF_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<CollapseKey, boolean>>) : {};
  } catch {
    // خصوصية التصفح أو تخزين تالف — الطي الافتراضي (مفتوح) خيار آمن دائماً
    return {};
  }
};

/** زر عداد مدمج (h-7 = مقياس Compact Controls) */
const COUNTER_BTN = cn(
  'w-7 h-7 rounded-md border border-border/60 bg-muted/60 text-muted-foreground flex items-center justify-center shadow-2xs cursor-pointer transition-colors',
  'hover:bg-accent hover:text-foreground hover:border-border active:bg-accent-active',
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted/60 disabled:hover:text-muted-foreground disabled:hover:border-border/60',
  FOCUS_RING,
);

/** مقاس الوثيقة كرسم مصغر متناسق الأبعاد بصرياً */
function DocumentPresetGraphic({ type, active }: { type: string; active: boolean }) {
  const activeBorder = active
    ? 'border-foreground/70 bg-accent-active text-foreground'
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
    <div
      aria-hidden="true"
      className={cn(
        styleClass,
        'border flex flex-col items-center justify-center p-0.5 transition-colors relative overflow-hidden',
        activeBorder,
      )}
    >
      <div className="w-2.5 h-2.5 rounded-full border border-current opacity-85 mt-0.5 shrink-0" />
      <div className="w-3.5 h-2 rounded-t-full bg-current opacity-60 -mb-0.5 shrink-0" />
    </div>
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

  /** حالة طي البطاقات محفوظة محلياً — اللوحة تعيد ترتيب نفسها حسب تفضيل المستخدم */
  const [collapsePrefs, setCollapsePrefs] =
    useState<Partial<Record<CollapseKey, boolean>>>(loadCollapsePrefs);
  const setCardOpen = (key: CollapseKey) => (open: boolean) => {
    setCollapsePrefs((prev) => {
      const next = { ...prev, [key]: open };
      try {
        localStorage.setItem(COLLAPSE_PREF_KEY, JSON.stringify(next));
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
   * حالة «مطبّق الآن»: القالب النشط على الكانفس هو هذا التركيب بالضبط.
   * تُستخدم في شارة الحالة فقط (لا زر) — الشارة ستُخفى بأمان إذا تغيّر
   * القالب من مكان آخر لأنها تُشتق من الخاصية isCustomActive المتزامنة
   * مع القالب النشط، فلا تبقى معلومة قديمة معروضة.
   */
  const isLiveCombo = isCustomActive && !showSaveForm;

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
    const deltas: Record<string, number> = {
      ArrowLeft: 1,
      ArrowRight: -1,
      ArrowUp: -3,
      ArrowDown: 3,
    };
    const delta = deltas[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const nextIndex = Math.max(0, Math.min(8, ALIGNMENT_ORDER.indexOf(align) + delta));
    onGridAlignChange(ALIGNMENT_ORDER[nextIndex]);
  };

  const sizeBadge =
    photoType === 'stretch'
      ? 'تلقائي'
      : `${getPhotoDimensions(photoType).wMM}×${getPhotoDimensions(photoType).hMM} مم`;

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* ═══ بطاقة 1: أبعاد الشبكة والصفوف والأعمدة ═══ */}
      <FluentSection
        icon={<GridFour className="w-3.5 h-3.5" weight="duotone" />}
        title="أبعاد الشبكة"
        collapsible
        open={collapsePrefs.dims ?? true}
        onOpenChange={setCardOpen('dims')}
        subtitle={
          <>
            الحد الأقصى{' '}
            <span className="font-mono font-bold text-foreground" dir="ltr">
              {maxRows}×{maxCols}
            </span>{' '}
            صور ({maxPhotos})
          </>
        }
        action={
          <div className="flex items-center gap-1.5 select-none">
            {/* شارات محايدة: معلومة دائمة لا إجراء — الأزرق يُحفظ للحالة الحية في بطاقة الإجراءات */}
            <span
              className="h-5 text-2xs font-bold font-mono px-2 rounded-full bg-muted text-muted-foreground border border-border/60 flex items-center select-none"
              title="عدد صور الشبكة الحالية"
            >
              <span className="font-mono" dir="ltr">
                {totalPhotos}
              </span>
              <span>صور</span>
            </span>
            <span
              className="h-5 text-2xs font-mono font-bold px-2 rounded-full bg-muted text-muted-foreground border border-border/60 flex items-center select-none"
              title="نسبة تغطية الورقة"
            >
              {coverage}%
            </span>
          </div>
        }
      >
        {/* عدادات الصفوف والأعمدة — شبكة ثنائية متوازنة */}
        <div className="grid grid-cols-2 gap-2">
          {/* عداد الصفوف */}
          <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/50 border border-border/60">
            <div className="flex items-center justify-between gap-1 text-mini font-bold text-muted-foreground select-none">
              <span>الصفوف</span>
              <span
                className="text-2xs font-mono font-normal text-muted-foreground-hover"
                title="الحد الأقصى للصفوف"
              >
                أقصى {maxRows}
              </span>
            </div>
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
                className="text-xs font-mono font-bold text-foreground select-none"
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
          <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/50 border border-border/60">
            <div className="flex items-center justify-between gap-1 text-mini font-bold text-muted-foreground select-none">
              <span>الأعمدة</span>
              <span
                className="text-2xs font-mono font-normal text-muted-foreground-hover"
                title="الحد الأقصى للأعمدة"
              >
                أقصى {maxCols}
              </span>
            </div>
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
                className="text-xs font-mono font-bold text-foreground select-none"
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

        {/* تعبئة سريعة — صفوف بعرض كامل حتى لا يُقتطع أي نص عربي مهما ضاق الشريط */}
        <div className="flex flex-col gap-1 p-1 rounded-lg bg-muted/50 border border-border/70 shadow-2xs">
          <button
            type="button"
            onClick={handleFillSheet}
            title="ملء الورقة فوراً"
            className={cn(
              'h-7 px-2.5 rounded-md text-mini font-sans font-medium transition-colors cursor-pointer select-none flex items-center justify-between gap-1.5 border',
              isMaxFill
                ? 'bg-card text-foreground border-border/80 shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border-transparent',
              FOCUS_RING,
            )}
          >
            <span className="flex items-center gap-1.5 min-w-0 font-sans whitespace-nowrap">
              <CornersOut
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  isMaxFill ? 'text-foreground' : 'text-muted-foreground',
                )}
                weight="bold"
              />
              <span>ملء الورقة</span>
            </span>
            <span
              className={cn(
                'text-2xs font-mono px-1.5 py-0.5 rounded-sm border shrink-0',
                isMaxFill
                  ? 'bg-muted text-foreground border-border/70 font-bold'
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
              'h-7 px-2.5 rounded-md text-mini font-sans font-medium transition-colors cursor-pointer select-none flex items-center justify-between gap-1.5 border',
              isCornerStrip
                ? 'bg-card text-foreground border-border/80 shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border-transparent',
              FOCUS_RING,
            )}
          >
            <span className="flex items-center gap-1.5 min-w-0 font-sans whitespace-nowrap">
              <Rows
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  isCornerStrip ? 'text-foreground' : 'text-muted-foreground',
                )}
                weight="bold"
              />
              <span>شريط علوي</span>
            </span>
            <span
              className={cn(
                'text-2xs font-mono px-1.5 py-0.5 rounded-sm border shrink-0',
                isCornerStrip
                  ? 'bg-muted text-foreground border-border/70 font-bold'
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
        icon={<Ruler className="w-3.5 h-3.5" weight="duotone" />}
        title="مقاس الصورة"
        collapsible
        open={collapsePrefs.photoSize ?? true}
        onOpenChange={setCardOpen('photoSize')}
        action={
          /* محايدة: الحالة تعيش في المبدّلات لا في الشارة */
          <span className="h-5 text-2xs font-bold font-mono px-2 rounded-full bg-muted text-muted-foreground border border-border/70 flex items-center select-none">
            {photoType === 'stretch' ? 'تلقائي' : sizeBadge}
          </span>
        }
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
                  'relative min-h-[52px] py-1.5 ps-2 pe-5 rounded-lg border font-sans transition-colors cursor-pointer select-none flex items-center gap-2 text-right',
                  isActive
                    ? 'border-foreground/70 bg-accent-active shadow-2xs'
                    : 'bg-background/80 border-border/60 hover:bg-muted/50 hover:border-border',
                  FOCUS_RING,
                )}
              >
                <span className="w-9 h-9 rounded-md bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
                  <DocumentPresetGraphic type={opt.value} active={isActive} />
                </span>
                <span className="min-w-0 flex-1 leading-snug text-right font-sans">
                  <span
                    className={cn(
                      'block text-xs truncate',
                      isActive ? 'text-foreground font-semibold' : 'text-foreground font-medium',
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="flex items-center gap-1 text-mini text-muted-foreground font-mono mt-0.5 truncate">
                    <span dir="ltr" className="text-muted-foreground-hover whitespace-nowrap">
                      {opt.dim}
                    </span>
                    {opt.sub && <span className="whitespace-nowrap">{opt.sub}</span>}
                  </span>
                </span>
                {/* تأكيد بصري غير لوني للخيار المحدد بموضع مطلق في زاوية البطاقة لمنع تكسر الأسطر وإزاحة التخطيط */}
                {isActive && (
                  <Check
                    className="absolute top-1.5 end-1.5 w-3.5 h-3.5 text-foreground"
                    weight="bold"
                  />
                )}
              </button>
            );
          })}
        </div>
      </FluentSection>

      {/* ═══ بطاقة 3: المحاذاة على الورقة (تظهر فقط عند تثبيت المقاس) ═══ */}
      {photoType !== 'stretch' && (
        <FluentSection
          icon={<Crosshair className="w-3.5 h-3.5" weight="duotone" />}
          title="المحاذاة على الورقة"
          collapsible
          open={collapsePrefs.align ?? true}
          onOpenChange={setCardOpen('align')}
        >
          <div className="flex items-center gap-2">
            {/* مصفوفة الارتكاز — dir="ltr" مقصودة: خريطة مكانية للورقة لا نص متدفق */}
            <div
              role="radiogroup"
              aria-label="نقطة ارتكاز الصور على الورقة"
              className="w-[72px] h-[72px] rounded-lg border border-border/80 bg-background/95 p-1 grid grid-cols-3 grid-rows-3 gap-0.5 shrink-0 shadow-2xs select-none relative overflow-hidden"
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
                            ? 'w-3 h-3 bg-foreground shadow-xs ring-3 ring-foreground/20'
                            : // نقاط كاملة بدل /50: نقاط الارتكاز كائنات رسومية تتطلب 3:1 على الأقل
                              'w-2 h-2 bg-muted-foreground/80 border border-border/40 group-hover:bg-foreground/70',
                        )}
                      />
                    </button>
                  );
                }),
              )}
            </div>

            {/* اختصارا الموضعين الأكثر استخداماً في طباعة الوثائق */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <button
                type="button"
                aria-pressed={gridAlign === 'top-left'}
                onClick={() => onGridAlignChange('top-left')}
                className={cn(
                  'h-8 px-2.5 rounded-md text-xs font-semibold flex items-center justify-between gap-2 border cursor-pointer select-none transition-colors',
                  gridAlign === 'top-left'
                    ? 'bg-accent-active border-border/80 text-foreground'
                    : 'bg-card/60 border-border/60 text-foreground/80 hover:bg-muted hover:border-border',
                  FOCUS_RING,
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Scissors className="w-3.5 h-3.5 shrink-0" weight="bold" />
                  <span className="truncate">ركن القص</span>
                </span>
                <span className="text-2xs font-mono text-muted-foreground-hover shrink-0" dir="ltr">
                  0،0
                </span>
              </button>

              <button
                type="button"
                aria-pressed={gridAlign === 'center'}
                onClick={() => onGridAlignChange('center')}
                className={cn(
                  'h-8 px-2.5 rounded-md text-xs font-semibold flex items-center justify-between gap-2 border cursor-pointer select-none transition-colors',
                  gridAlign === 'center'
                    ? 'bg-accent-active border-border/80 text-foreground'
                    : 'bg-card/60 border-border/60 text-foreground/80 hover:bg-muted hover:border-border',
                  FOCUS_RING,
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Crosshair className="w-3.5 h-3.5 shrink-0" weight="bold" />
                  <span className="truncate">توسيط</span>
                </span>
                <span className="text-2xs font-mono text-muted-foreground-hover shrink-0">50%</span>
              </button>
            </div>
          </div>
        </FluentSection>
      )}

      {/* ═══ بطاقة 4: إجراءات التطبيق والحفظ — مثبتة أسفل اللوحة أثناء التمرير
          حتى تبقى الأفعال الرئيسية في متناول اليد مهما طالت البطاقات فوقها */}
      <div className="sticky bottom-0 z-10 p-3 rounded-xl bg-card/95 backdrop-blur-md border border-border/80 shadow-2xs fluent-specular space-y-2">
        {/* شارة الحالة الحية: تعكس حالة الكانفس لا زر لا يفعل شيئاً */}
        {isLiveCombo && (
          <div
            role="status"
            className="flex items-center gap-2 h-7 px-2.5 rounded-md bg-card/70 border border-border/60 shadow-2xs select-none"
          >
            <CheckCircle className="w-4 h-4 text-success shrink-0" weight="duotone" />
            <span className="text-micro font-bold text-foreground">الشبكة مطبقة</span>
            <span className="text-2xs font-mono text-muted-foreground shrink-0" dir="ltr">
              {rows}×{cols}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {isLiveCombo ? (
            /* الحالة الحية: كلا الفعلين ثانويان — الإبراز للشارة لا للأزرار */
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onApply(rows, cols, photoType, gridAlign)}
                title="إعادة بناء الشبكة وإعادة توزيع الصور من جديد"
              >
                <ArrowClockwise className="w-4 h-4" weight="bold" />
                <span>إعادة البناء</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSaveName(
                    `شبكة ${rows}×${cols} — ${getPhotoDimensions(photoType).label.split(' ')[0]}`,
                  );
                  setShowSaveForm(true);
                }}
                title="حفظ في المكتبة"
              >
                <FloppyDisk className="w-4 h-4" weight="duotone" />
                <span>حفظ كقالب</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                className="flex-1"
                onClick={() => onApply(rows, cols, photoType, gridAlign)}
                title="تطبيق الشبكة على الكانفس"
              >
                <GridFour className="w-4 h-4" weight="bold" />
                <span>تطبيق الشبكة</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSaveName(
                    `شبكة ${rows}×${cols} — ${getPhotoDimensions(photoType).label.split(' ')[0]}`,
                  );
                  setShowSaveForm(true);
                }}
                title="حفظ في المكتبة"
              >
                <FloppyDisk className="w-4 h-4" weight="duotone" />
                <span>حفظ كقالب</span>
              </Button>
            </>
          )}
        </div>
        {!showSaveForm ? null : (
          <div className="flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-lg border border-border/80 shadow-2xs animate-in slide-in-from-top-2 duration-200">
            <Input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="اسم القالب"
              aria-label="اسم القالب"
              className="flex-1 text-right font-cairo"
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
              <FloppyDisk className="w-3.5 h-3.5" weight="bold" />
              <span>حفظ</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
