import { cn } from "@/lib/utils";
import { Folder, GridFour, UploadSimple, Trash, Sparkle, ArrowSquareOut } from "@phosphor-icons/react";
import { CollageTemplate } from "@/lib/templates";
import { FluentSection } from "@/components/ui/blocks";

interface CollageLibraryTabProps {
  savedTemplates: CollageTemplate[];
  activeTemplateId: string | undefined;
  onSelect: (t: CollageTemplate) => void;
  onDeleteTemplate?: (id: string, e: React.MouseEvent) => void;
  onOpenFreeformModal: () => void;
  onImportClick: () => void;
  onOpenTemplatesDialog?: () => void;
}

export function CollageLibraryTab({
  savedTemplates,
  activeTemplateId,
  onSelect,
  onDeleteTemplate,
  onOpenFreeformModal,
  onImportClick,
  onOpenTemplatesDialog,
}: CollageLibraryTabProps) {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Freeform Mixed Builder Action Button */}
      <button
        type="button"
        onClick={onOpenFreeformModal}
        className="w-full h-10 px-3.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-between group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none shadow-2xs fluent-specular"
      >
        <div className="flex items-center gap-2.5">
          <Sparkle className="w-4.5 h-4.5 text-primary shrink-0 group-hover:rotate-12 transition-transform" weight="duotone" />
          <div className="flex flex-col items-start text-right">
            <span className="font-bold">كولاج حر ومختلط</span>
            <span className="text-[9.5px] text-muted-foreground font-normal">دمج أحجام وقياسات متعددة في ورقة واحدة</span>
          </div>
        </div>
        <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
          فتح
        </span>
      </button>

      {/* القوالب المحفوظة الخاصة بالمستخدم */}
      <FluentSection
        icon={<Folder className="w-4 h-4 text-primary" weight="duotone" />}
        title="قوالبي المحفوظة"
        action={
          <button
            type="button"
            onClick={onImportClick}
            className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
            title="استيراد قوالب من ملف JSON"
          >
            <UploadSimple className="w-3 h-3" weight="bold" />
            <span>استيراد</span>
          </button>
        }
      >
        {savedTemplates.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border/60 rounded-xl">
            لا توجد قوالب محفوظة بعد. يمكنك تخصيص شبكة وحفظها من تبويب "تخصيص الشبكة".
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {savedTemplates.map((t) => {
              const isActive = activeTemplateId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className={cn(
                    "p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none group",
                    isActive
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "bg-background/80 border-border/70 hover:bg-muted/50 hover:border-primary/40 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GridFour className="w-4 h-4 text-primary" weight="duotone" />
                    <span className="text-xs font-bold truncate">{t.name}</span>
                    <span className="text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                      {t.slots} خانات
                    </span>
                  </div>
                  {onDeleteTemplate && (
                    <button
                      type="button"
                      onClick={(e) => onDeleteTemplate(t.id, e)}
                      title="حذف القالب"
                      className="w-6 h-6 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash className="w-3 h-3" weight="regular" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </FluentSection>

      {/* زر فتح مكتبة القوالب الكاملة */}
      {onOpenTemplatesDialog && (
        <button
          type="button"
          onClick={onOpenTemplatesDialog}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 text-foreground transition-all cursor-pointer active:scale-[0.98] shadow-2xs font-bold text-xs"
        >
          <div className="flex items-center gap-2">
            <GridFour className="w-4 h-4 text-primary" weight="duotone" />
            <span>تصفح كافة القوالب الرسمية</span>
          </div>
          <ArrowSquareOut className="w-3.5 h-3.5 opacity-60" weight="bold" />
        </button>
      )}
    </div>
  );
}
