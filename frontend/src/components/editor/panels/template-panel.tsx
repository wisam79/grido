import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CaretLeft, CaretRight } from '@/components/ui/icons';
import { useEditorStore } from '@/lib/editor-store';
import { createLogger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/wails-error';
import { getCollageSectionForTab, getStudioSectionForTab } from '@/lib/workspace-tools';

import { CustomCollageCard } from './custom-collage-card';
import { FreeformStudioPanel } from './freeform';
import { PanelShell } from './panel-shell';
import {
  GetCustomTemplates,
  SaveCustomTemplate,
  DeleteCustomTemplate,
} from '../../../../wailsjs/go/main/App';

import type { NormalizedCell } from './collage/collage-grid-math';
import type { CollageTab } from '@/hooks/use-workspace-panels';
import type { CollageTemplate } from '@/lib/templates';
import type { FreeformTab } from '@/lib/workspace-tools';

const logger = createLogger('template-panel');

export interface TemplatePanelProps {
  /** يُمرر من App لإظهار زر الطي الداخلي — يُحذف في عرض Sheet الجوال */
  onCollapse?: () => void;
  /** جهة اللوح الفيزيائية — تحدد اتجاه سهم الطي (يسار في Wide، يمين في Standard) */
  collapseSide?: 'left' | 'right';
  /** يخفي رأس اللوحة عندما تعرض التبويبات الداخلية اسم الأداة (compact) */
  hideHeader?: boolean;
  activeStudioTab?: FreeformTab;
  activeCollageTab?: CollageTab;
  onActiveCollageTabChange?: (tab: CollageTab) => void;
}

export const TemplatePanel = React.memo(function TemplatePanel({
  onCollapse,
  collapseSide = 'right',
  hideHeader = false,
  activeStudioTab = 'stickers',
  activeCollageTab = 'custom',
  onActiveCollageTabChange,
}: TemplatePanelProps) {
  const { setCollageTemplate, collageTemplate, slots, mode, workflow } = useEditorStore(
    useShallow((state) => ({
      setCollageTemplate: state.setCollageTemplate,
      collageTemplate: state.collageTemplate,
      slots: state.slots,
      mode: state.mode,
      workflow: state.workflow,
    })),
  );

  const [savedTemplates, setSavedTemplates] = useState<CollageTemplate[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حوار تأكيد عند تبديل القالب إذا كان سيُسقط صوراً موجودة (P2-14).
  // عناصر الوضع الحر لم تعد تُمس عند تبديل قالب الكولاج (فصل الوضعين) فلا تأكيد لها.
  const [pendingTemplate, setPendingTemplate] = useState<CollageTemplate | null>(null);

  const handleSelectTemplate = (t: CollageTemplate) => {
    const capacity = t.cells?.length ?? t.slots;
    const filledSlotsWithSrc = slots.filter((s) => s.imageSrc);
    const uniqueImages = new Set(filledSlotsWithSrc.map((s) => s.imageSrc));
    // إذا كانت الصور الفريدة أكثر من سعة القالب الجديد، سيتم فقدان صور فريدة حقيقية
    // أما إذا كانت صورة واحدة مكررة أو صور فريدة تتسع بالكامل للقالب الجديد، يتم التبديل مباشرة
    const dropsImages = uniqueImages.size > capacity;
    if (dropsImages) {
      setPendingTemplate(t);
      return;
    }
    setCollageTemplate(t);
  };

  const droppedCount = useMemo(
    () =>
      pendingTemplate
        ? Math.max(
            0,
            new Set(slots.filter((s) => s.imageSrc).map((s) => s.imageSrc)).size -
              (pendingTemplate.cells?.length ?? pendingTemplate.slots),
          )
        : 0,
    [pendingTemplate, slots],
  );

  const loadTemplates = useCallback(async () => {
    try {
      const templates = await GetCustomTemplates();
      const mapped = (templates || []).flatMap((t) => {
        // #11 — try/catch مستقل لكل عنصر لمنع قالب تالف من إسقاط القائمة كلها
        let parsedCells: NormalizedCell[] | null = null;
        try {
          const raw = typeof t.cells === 'string' ? JSON.parse(t.cells) : t.cells;
          if (Array.isArray(raw)) parsedCells = raw as NormalizedCell[];
        } catch {
          logger.warn(`Template "${t.name}" has corrupt cells JSON — excluded from list`);
        }
        if (parsedCells === null) return []; // استبعاد القوالب ذات البيانات التالفة
        return [
          {
            id: 'collage-user-' + t.id,
            name: t.name,
            slots: t.slots,
            cells: parsedCells,
          },
        ];
      });
      setSavedTemplates(mapped);
    } catch (e) {
      logger.error('Failed to load user templates', e);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSaveTemplate = async (name: string, cells: NormalizedCell[]) => {
    try {
      await SaveCustomTemplate(name, cells.length, JSON.stringify(cells));
      toast.success('تم حفظ القالب');
      loadTemplates();
    } catch (e) {
      logger.error(e);
      toast.error(toErrorMessage(e, 'فشل حفظ القالب'));
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const numericId = parseInt(id.replace('collage-user-', ''));
      if (!isNaN(numericId)) {
        await DeleteCustomTemplate(numericId);
        toast.success('تم حذف القالب');
        loadTemplates();
      }
    } catch (err) {
      logger.error(err);
      toast.error(toErrorMessage(err, 'فشل حذف القالب'));
    }
  };

  // العنوان يُقرأ من سجل الوجهات الموحّد — الوجهة سطح واحد وتبويباتها تفاصيلها
  const activeSection =
    mode === 'collage'
      ? getCollageSectionForTab(activeCollageTab)
      : getStudioSectionForTab(activeStudioTab, workflow);

  return (
    <PanelShell
      title={activeSection.title}
      showHeader={!hideHeader}
      onCollapse={onCollapse}
      collapseTitle={`إخفاء ${activeSection.label} (Ctrl+B)`}
      collapseIcon={
        collapseSide === 'left' ? (
          <CaretLeft
            className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-0.5 transition-[color,transform]"
            weight="bold"
          />
        ) : (
          <CaretRight
            className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-[color,transform]"
            weight="bold"
          />
        )
      }
      className="bg-transparent select-none"
    >
      {/* Hidden File Input for Templates Import */}
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        id="import-templates-hidden"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            const items = JSON.parse(text);
            if (!Array.isArray(items)) throw new Error('Invalid format');
            let imported = 0;
            for (const item of items) {
              if (item.name && item.cells) {
                await SaveCustomTemplate(item.name, item.cells.length, JSON.stringify(item.cells));
                imported++;
              }
            }
            toast.success(`تم استيراد ${imported} قالب`);
            loadTemplates();
          } catch (err) {
            toast.error(toErrorMessage(err, 'ملف غير صالح للاستيراد'));
          }
          e.target.value = '';
        }}
      />

      {mode === 'collage' ? (
        <div className="space-y-4">
          <CustomCollageCard
            onSelect={handleSelectTemplate}
            activeTemplateId={collageTemplate?.id}
            onSaveTemplate={handleSaveTemplate}
            savedTemplates={savedTemplates}
            onDeleteTemplate={handleDeleteTemplate}
            fileInputRef={fileInputRef}
            activeTab={activeCollageTab}
            onActiveTabChange={onActiveCollageTabChange}
          />
        </div>
      ) : (
        <FreeformStudioPanel activeTab={activeStudioTab} />
      )}

      {/* Confirmation Dialog when switching templates with existing photos */}
      <AlertDialog
        open={pendingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTemplate(null);
        }}
      >
        <AlertDialogContent dir="rtl" className="font-cairo border fluent-specular">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start text-base font-bold">
              تبديل قالب الكولاج
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start text-xs text-muted-foreground leading-relaxed">
              {`سيتم حذف ${droppedCount} ${droppedCount === 1 ? 'صورة' : 'صور'} لا تتسع للقالب الجديد. متابعة؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer rounded-md h-8 text-xs font-semibold">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer rounded-md h-8 text-xs font-semibold"
              onClick={() => {
                if (pendingTemplate) setCollageTemplate(pendingTemplate);
                setPendingTemplate(null);
              }}
            >
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelShell>
  );
});
