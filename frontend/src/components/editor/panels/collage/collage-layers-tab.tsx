import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Stack, Trash, Image as ImageIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { FluentSection } from "@/components/ui/blocks";

/**
 * collage-layers-tab.tsx — تبويب «طبقات الخانات» لوضع الكولاج.
 *
 * الفجوة: الوضع الحر يملك تبويب طبقات كاملاً، بينما الكولاج بلا أي قائمة
 * نظرة عامة على الخانات (مصدرها، امتلاؤها، تحديدها) — فيضطر المستخدم
 * للنقر على الكانفاس نفسه لاكتشاف الحالة. هذا التبويب يسدّها بصف لكل
 * خانة: مصغّرة + حالة + تحديد بالنقر + إفراغ، بنفس لغة صفوف الطبقات.
 */
export const CollageLayersTab = React.memo(function CollageLayersTab() {
  const { slots, selectedId, selectElement, updateSlot, pushHistory } =
    useEditorStore(
      useShallow((state) => ({
        slots: state.slots,
        selectedId: state.selectedId,
        selectElement: state.selectElement,
        updateSlot: state.updateSlot,
        pushHistory: state.pushHistory,
      }))
    );

  const ordered = React.useMemo(
    () => [...slots].sort((a, b) => a.cellIndex - b.cellIndex),
    [slots]
  );
  const filledCount = React.useMemo(
    () => ordered.filter((s) => !!s.imageSrc).length,
    [ordered]
  );

  const handleClear = (slotId: string) => {
    updateSlot(slotId, { imageSrc: undefined, originalImageSrc: undefined });
    pushHistory();
  };

  return (
    <div
      className="flex flex-col gap-2.5 font-cairo animate-in fade-in duration-200"
      dir="rtl"
    >
      <FluentSection
        icon={<Stack className="w-4 h-4" weight="duotone" />}
        title="طبقات الخانات"
        subtitle={
          ordered.length === 0
            ? "لا توجد شبكة بعد"
            : `${filledCount} ممتلئة · ${ordered.length - filledCount} فارغة`
        }
      >
        {ordered.length === 0 ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            اختر شبكة من تبويب «شبكة الكولاج» لعرض الخانات هنا وتحديدها
            وإفراغها.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {ordered.map((slot) => {
              const isSelected = selectedId === slot.id;
              const isFilled = !!slot.imageSrc;
              return (
                <li key={slot.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`الخانة ${slot.cellIndex + 1}${isFilled ? " (ممتلئة)" : " (فارغة)"}`}
                    onClick={() => selectElement(slot.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectElement(slot.id);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 p-1.5 rounded-lg border text-start transition-colors cursor-pointer",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                      isSelected
                        ? "bg-primary/10 border-primary/40 shadow-xs"
                        : "bg-card/60 border-border/60 hover:bg-accent/60 hover:border-border"
                    )}
                  >
                    {/* المصغّرة */}
                    <span className="w-8 h-8 rounded-md overflow-hidden shrink-0 border border-border/60 bg-muted/60 flex items-center justify-center">
                      {isFilled ? (
                        <img
                          src={slot.imageSrc}
                          alt=""
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <ImageIcon
                          className="w-4 h-4 text-muted-foreground/50"
                          weight="regular"
                        />
                      )}
                    </span>

                    {/* الاسم والحالة */}
                    <span className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block text-xs font-bold truncate",
                          isSelected ? "text-primary" : "text-foreground/90"
                        )}
                      >
                        {slot.label || `الخانة ${slot.cellIndex + 1}`}
                      </span>
                      <span className="block text-micro text-muted-foreground truncate mt-0.5">
                        {isFilled ? "صورة مُدرجة" : "فارغة — انقر للإدراج"}
                      </span>
                    </span>

                    {/* شارة الامتلاء */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        isFilled ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    />

                    {/* إفراغ */}
                    {isFilled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClear(slot.id);
                        }}
                        aria-label={`إفراغ الخانة ${slot.cellIndex + 1}`}
                        title="إفراغ الخانة"
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                      >
                        <Trash className="w-4 h-4" weight="regular" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </FluentSection>
    </div>
  );
});

CollageLayersTab.displayName = "CollageLayersTab";
