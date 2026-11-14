import { memo, useId, useRef, useState } from 'react';

import {
  AlignBottomIcon,
  AlignCenterHorizontalIcon,
  AlignCenterVerticalIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
} from '@/components/ui/alignment-icons';
import { FluentSection } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, CaretDown, Group, GroupDismiss, Lock } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/lib/editor-store';
import { isPrintFilterId } from '@/lib/filters/print-filter-contract';
import { getDocumentSession } from '@/lib/io/document-session';
import {
  buildSelectionLayerPatches,
  buildSelectionPropertyPatches,
  canArrangeSelection,
  deriveSelectionProperties,
  getSelectionElements,
  parseSelectionNumber,
} from '@/lib/selection-properties';
import { IMAGE_FILTERS } from '@/lib/templates';
import { FOCUS_RING } from '@/lib/ui/ui-compliance';
import { cn } from '@/lib/utils';

import type { SelectionChange, SelectionField } from '@/lib/selection-properties';
import type { CanvasElement } from '@/lib/store/types';

const HEX_COLOR_RE = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;

const MULTI_ALIGN_ACTIONS = [
  { action: 'right', label: 'يمين', Icon: AlignRightIcon },
  { action: 'center', label: 'منتصف أفقي', Icon: AlignCenterHorizontalIcon },
  { action: 'left', label: 'يسار', Icon: AlignLeftIcon },
  { action: 'top', label: 'أعلى', Icon: AlignTopIcon },
  { action: 'middle', label: 'منتصف عمودي', Icon: AlignCenterVerticalIcon },
  { action: 'bottom', label: 'أسفل', Icon: AlignBottomIcon },
] as const;

interface MultiSelectionPropertiesProps {
  elements: readonly CanvasElement[];
}

function SelectionDraftField({
  field,
  disabled,
  onCommit,
}: {
  field: Exclude<SelectionField, { kind: 'filter' }>;
  disabled: boolean;
  onCommit: (change: SelectionChange) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const skipBlur = useRef(false);
  const gesture = useRef<{
    display: string;
    documentSession: number;
    commit: typeof onCommit;
  } | null>(null);
  const display = field.state.kind === 'mixed' ? '' : String(field.state.value);
  const finish = () => {
    const session = gesture.current;
    if (
      disabled ||
      draft === null ||
      !session ||
      session.documentSession !== getDocumentSession() ||
      draft === session.display
    ) {
      gesture.current = null;
      setDraft(null);
      setInvalid(false);
      return;
    }
    if (field.kind === 'number') {
      const value = parseSelectionNumber(draft, field.min, field.max);
      if (value === undefined) {
        setInvalid(true);
        return;
      }
      session.commit({ key: field.key, value });
    } else {
      if (!HEX_COLOR_RE.test(draft.trim())) {
        setInvalid(true);
        return;
      }
      session.commit({ key: field.key, value: draft.trim() });
    }
    gesture.current = null;
    setDraft(null);
    setInvalid(false);
  };
  const activeText = (draft ?? display).trim();
  const swatchHex = field.kind === 'color' && HEX_COLOR_RE.test(activeText) ? activeText : null;
  return (
    <div className="space-y-1 border-b border-border/30 last:border-b-0 py-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <label htmlFor={id} className="min-w-0 flex-1 text-xs font-medium text-foreground/90">
          {field.label}
        </label>
        <div className="flex items-center gap-1.5 shrink-0">
          {field.kind === 'color' && (
            <span
              aria-hidden="true"
              className="size-4 shrink-0 rounded-sm border border-border/60 bg-muted/40"
              style={swatchHex ? { backgroundColor: swatchHex } : undefined}
            />
          )}
          <Input
            id={id}
            aria-label={field.label}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${id}-error` : undefined}
            type="text"
            inputMode={field.kind === 'number' ? 'decimal' : 'text'}
            dir="ltr"
            disabled={disabled}
            value={draft ?? display}
            placeholder={field.state.kind === 'mixed' ? 'مختلط' : undefined}
            className={cn(
              'h-8 w-24 border-border/60 bg-background text-xs font-mono tabular-nums shadow-2xs',
              FOCUS_RING,
            )}
            onFocus={() => {
              skipBlur.current = false;
              gesture.current = {
                display,
                documentSession: getDocumentSession(),
                commit: onCommit,
              };
              setDraft(display);
              setInvalid(false);
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              setInvalid(false);
            }}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              finish();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                // Draft-only editing never restores a snapshot over independent edits.
                skipBlur.current = true;
                gesture.current = null;
                setDraft(null);
                setInvalid(false);
                event.currentTarget.blur();
              } else if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                finish();
                skipBlur.current = true;
                event.currentTarget.blur();
              }
            }}
          />
          {field.kind === 'number' && (
            <span className="w-5 text-center text-mini font-mono text-muted-foreground">
              {field.unit}
            </span>
          )}
        </div>
      </div>
      {invalid && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {field.kind === 'number'
            ? `أدخل قيمة بين ${field.min} و${field.max}`
            : 'أدخل لون HEX صالحاً'}
        </p>
      )}
    </div>
  );
}

export const MultiSelectionProperties = memo(function MultiSelectionProperties({
  elements,
}: MultiSelectionPropertiesProps) {
  const model = deriveSelectionProperties(elements);
  const ids = elements.map((element) => element.id);
  // Capture the render/gesture's document, not whatever document happens to be
  // current at commit. IDs alone are not identities across load/reset.
  const documentSession = getDocumentSession();
  const commit = (change: SelectionChange) => {
    const state = useEditorStore.getState();
    if (state.mode !== 'single' || documentSession !== getDocumentSession()) return;
    const fresh = getSelectionElements(state.elements, state.selectedIds, state.selectedId);
    if (
      fresh.length < 2 ||
      fresh.length !== ids.length ||
      fresh.some((element) => !ids.includes(element.id))
    )
      return;
    const patches = buildSelectionPropertyPatches(fresh, change);
    if (!patches.length) return;
    state.updateElements(patches);
    state.pushHistory();
  };
  const arrange = (
    action:
      | 'left'
      | 'center'
      | 'right'
      | 'top'
      | 'middle'
      | 'bottom'
      | 'group'
      | 'ungroup'
      | 'front'
      | 'back',
  ) => {
    const state = useEditorStore.getState();
    const fresh = getSelectionElements(state.elements, state.selectedIds, state.selectedId);
    if (
      state.mode !== 'single' ||
      documentSession !== getDocumentSession() ||
      fresh.length < 2 ||
      fresh.length !== ids.length ||
      fresh.some((element) => !ids.includes(element.id)) ||
      !canArrangeSelection(state.elements, state.selectedIds)
    )
      return;
    if (action === 'front' || action === 'back') {
      const patches = buildSelectionLayerPatches(state.elements, state.selectedIds, action);
      if (patches.length) {
        state.updateElements(patches);
        state.pushHistory();
      }
    } else if (action === 'group' || action === 'ungroup') {
      // Group/ungroup lack store lock guards; require the entire selection unlocked.
      if (fresh.some((element) => element.locked)) return;
      if (action === 'group') state.groupSelectedElements();
      else state.ungroupSelectedElements();
    } else state.alignSelectedElements(action);
  };
  const canArrange = useEditorStore((state) => canArrangeSelection(state.elements, ids));
  const allUnlocked = model.eligibleCount === model.selectedCount;
  const sameGroup =
    elements[0]?.groupId && elements.every((element) => element.groupId === elements[0].groupId);
  const hasMixedFields =
    model.eligibleCount > 0 &&
    model.fields.some((field) => field.kind !== 'filter' && field.state.kind === 'mixed');
  return (
    <div className="space-y-2.5 font-cairo select-none pb-2" dir="rtl">
      {model.eligibleCount > 0 && (!allUnlocked || hasMixedFields) && (
        <div className="rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5 space-y-0.5 text-xs text-muted-foreground">
          {!allUnlocked && <p>التعديل لغير المقفل فقط.</p>}
          {hasMixedFields && <p>المختلط: اعتماد بـ Enter أو مغادرة الحقل.</p>}
        </div>
      )}
      {model.eligibleCount === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-2 text-xs text-warning">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          <p role="status">جميع العناصر مقفلة؛ ألغِ القفل من لوحة الطبقات للتعديل.</p>
        </div>
      )}

      {model.fields.length > 0 && (
        <FluentSection
          title="الخصائص المشتركة"
          collapsible
          defaultOpen
          className="border-border/40 py-2"
        >
          <div>
            {model.fields.map((field) =>
              field.kind === 'filter' ? (
                <label
                  key={field.key}
                  className="flex items-center justify-between gap-2 border-b border-border/30 last:border-b-0 py-2 text-xs font-medium text-foreground/90"
                >
                  {field.label}
                  <div className="relative shrink-0">
                    <select
                      aria-label={field.label}
                      disabled={!model.eligibleCount}
                      value={field.state.kind === 'mixed' ? '' : field.state.value}
                      className={cn(
                        'h-8 min-w-32 appearance-none rounded-md border border-border/60 bg-background ps-2.5 pe-7 text-xs font-medium text-foreground shadow-2xs transition-colors disabled:opacity-50 cursor-pointer',
                        FOCUS_RING,
                      )}
                      onChange={(event) => {
                        if (isPrintFilterId(event.target.value))
                          commit({ key: 'filter', value: event.target.value });
                      }}
                    >
                      {field.state.kind === 'mixed' && (
                        <option value="" disabled>
                          مختلط
                        </option>
                      )}
                      {IMAGE_FILTERS.filter((filter) => isPrintFilterId(filter.id)).map(
                        (filter) => (
                          <option key={filter.id} value={filter.id}>
                            {filter.name}
                          </option>
                        ),
                      )}
                    </select>
                    <CaretDown
                      className="pointer-events-none absolute end-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                </label>
              ) : (
                // Field value updates keep both the DOM focus and the user's active draft.
                <SelectionDraftField
                  key={field.key}
                  field={field}
                  disabled={!model.eligibleCount}
                  onCommit={commit}
                />
              ),
            )}
          </div>
        </FluentSection>
      )}

      <FluentSection
        title="المحاذاة والترتيب"
        collapsible
        defaultOpen
        className="border-border/40 py-2"
      >
        <div className="space-y-2.5">
          <div
            role="group"
            aria-label="محاذاة التحديد"
            className="flex items-center justify-between gap-0.5 rounded-lg border border-border/40 bg-muted/40 p-1"
          >
            {MULTI_ALIGN_ACTIONS.map(({ action, label, Icon }, index) => (
              <div key={action} className="contents">
                {index === 3 && <div className="h-4 w-px bg-border/50" aria-hidden="true" />}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'coarse-touch-target h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-2xs cursor-pointer transition-colors',
                    FOCUS_RING,
                  )}
                  aria-label={`محاذاة ${label}`}
                  title={`محاذاة ${label}`}
                  disabled={!canArrange}
                  onClick={() => arrange(action)}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          {!canArrange && model.eligibleCount > 0 && (
            <p className="text-xs text-muted-foreground">
              ترتيب المجموعة يتطلب تحديدها كاملة بلا أقفال.
            </p>
          )}
          <div role="group" aria-label="المجموعات والطبقات" className="grid grid-cols-2 gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className={cn('coarse-touch-target h-8 gap-1.5 text-xs cursor-pointer', FOCUS_RING)}
              disabled={!canArrange || !allUnlocked || Boolean(sameGroup)}
              onClick={() => arrange('group')}
            >
              <Group className="size-3.5 shrink-0" aria-hidden="true" />
              تجميع
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn('coarse-touch-target h-8 gap-1.5 text-xs cursor-pointer', FOCUS_RING)}
              disabled={!canArrange || !allUnlocked || !elements.some((element) => element.groupId)}
              onClick={() => arrange('ungroup')}
            >
              <GroupDismiss className="size-3.5 shrink-0" aria-hidden="true" />
              فك التجميع
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn('coarse-touch-target h-8 gap-1.5 text-xs cursor-pointer', FOCUS_RING)}
              disabled={!canArrange}
              onClick={() => arrange('front')}
            >
              <ArrowUp className="size-3.5 shrink-0" aria-hidden="true" />
              إلى المقدمة
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn('coarse-touch-target h-8 gap-1.5 text-xs cursor-pointer', FOCUS_RING)}
              disabled={!canArrange}
              onClick={() => arrange('back')}
            >
              <ArrowDown className="size-3.5 shrink-0" aria-hidden="true" />
              إلى الخلف
            </Button>
          </div>
        </div>
      </FluentSection>
    </div>
  );
});
