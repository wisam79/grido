import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { COLLAGE_TEMPLATES, CollageTemplate } from "@/lib/templates";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GetCustomTemplates, SaveCustomTemplate, DeleteCustomTemplate } from "../../../../wailsjs/go/main/App";
import { CollageTemplateCard } from "./collage-template-card";
import { CustomCollageCard } from "./custom-collage-card";
import { PanelShell } from "./panel-shell";
import { LayoutGrid, FolderHeart, Palette, Paintbrush, Shapes } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PopoverColorPicker } from "../properties/shared-controls";
import { LayersList } from "../properties/layers-list";
import { FluentEmptyState, FluentSection } from "@/components/ui/blocks";

export interface TemplatePanelProps {
  /** يُمرر من App لإظهار زر الطي الداخلي — يُحذف في عرض Sheet الجوال */
  onCollapse?: () => void;
}

export function TemplatePanel({ onCollapse }: TemplatePanelProps) {
  const { 
    setCollageTemplate, 
    collageTemplate, 
    slots, 
    mode, 
    elements,
    backgroundColor,
    setBackgroundColor,
  } = useEditorStore(useShallow((state) => ({
    setCollageTemplate: state.setCollageTemplate,
    collageTemplate: state.collageTemplate,
    slots: state.slots,
    mode: state.mode,
    elements: state.elements,
    backgroundColor: state.backgroundColor,
    setBackgroundColor: state.setBackgroundColor,
  })));

  const [savedTemplates, setSavedTemplates] = useState<CollageTemplate[]>([]);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حوار تأكيد عند تبديل القالب إذا كان سيُسقط صوراً موجودة أو عناصر الوضع الحر (P2-14)
  const [pendingTemplate, setPendingTemplate] = useState<CollageTemplate | null>(null);

  const handleSelectTemplate = (t: CollageTemplate) => {
    const capacity = t.cells?.length ?? t.slots;
    const filledSlots = slots.filter((s) => s.imageSrc).length;
    const dropsImages = filledSlots > 0 && capacity < filledSlots;
    const hasFreeElements = mode !== "collage" && elements.length > 0;
    if (dropsImages || hasFreeElements) {
      setPendingTemplate(t);
      return;
    }
    setCollageTemplate(t);
  };

  const droppedCount = pendingTemplate
    ? Math.max(0, slots.filter((s) => s.imageSrc).length - (pendingTemplate.cells?.length ?? pendingTemplate.slots))
    : 0;

  const officialTemplates = COLLAGE_TEMPLATES;

  const loadTemplates = useCallback(async () => {
    try {
      const templates = await GetCustomTemplates();
      const mapped = templates.map((t: any) => ({
        id: "collage-user-" + t.id,
        name: t.name,
        slots: t.slots,
        cells: typeof t.cells === "string" ? JSON.parse(t.cells) : t.cells,
        icon: LayoutGrid,
      }));
      setSavedTemplates(mapped);
    } catch (e) {
      console.error("Failed to load user templates", e);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTemplates();
  }, [loadTemplates]);

  const handleSaveTemplate = async (name: string, cells: any[]) => {
    try {
      await SaveCustomTemplate(name, cells.length, JSON.stringify(cells));
      toast.success("تم حفظ القالب بنجاح");
      loadTemplates();
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء حفظ القالب");
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const numericId = parseInt(id.replace("collage-user-", ""));
      if (!isNaN(numericId)) {
        await DeleteCustomTemplate(numericId);
        toast.success("تم حذف القالب بنجاح");
        loadTemplates();
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل حذف القالب");
    }
  };

  return (
    <PanelShell
      icon={<Shapes className="w-4 h-4" />}
      title="القوالب"
      subtitle={
        mode === "collage"
          ? "كولاج ونماذج طباعة جاهزة"
          : "طبقات العمل ولون الخلفية"
      }
      onCollapse={onCollapse}
      collapseTitle="إخفاء لوحة القوالب (Ctrl+B)"
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
            if (!Array.isArray(items)) throw new Error("Invalid format");
            let imported = 0;
            for (const item of items) {
              if (item.name && item.cells) {
                await SaveCustomTemplate(item.name, item.cells.length, JSON.stringify(item.cells));
                imported++;
              }
            }
            toast.success(`تم استيراد ${imported} قالب بنجاح`);
            loadTemplates();
          } catch (err) {
            toast.error("ملف غير صالح للاستيراد");
          }
          e.target.value = "";
        }}
      />

      {mode === "collage" ? (
        <div className="space-y-4">
          <CustomCollageCard 
            onSelect={handleSelectTemplate} 
            activeTemplateId={collageTemplate?.id} 
            onSaveTemplate={handleSaveTemplate}
            savedTemplates={savedTemplates}
            onDeleteTemplate={handleDeleteTemplate}
            onOpenTemplatesDialog={() => {
              loadTemplates();
              setTemplatesDialogOpen(true);
            }}
            fileInputRef={fileInputRef}
          />

          {/* Dialog for Full Official & Custom Templates Browser */}
          <Dialog open={templatesDialogOpen} onOpenChange={setTemplatesDialogOpen}>
              <DialogContent className="max-w-2xl font-cairo rounded-2xl border border-border bg-card fluent-specular" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-right text-base font-bold flex items-center gap-2">
                    <FolderHeart className="w-5 h-5 text-primary" />
                    مكتبة قوالب الكولاج والطباعة
                  </DialogTitle>
                  <DialogDescription className="text-right text-xs text-muted-foreground">
                    اختر من نماذج الطباعة الرسمية المجهزة أو قوالب الكولاج التي قمت بحفظها مسبقاً.
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="official" className="w-full mt-2">
                  <TabsList className="grid w-full grid-cols-2 bg-input p-1 rounded-xl h-8 border border-border">
                    <TabsTrigger value="official" className="rounded-lg font-bold text-xs cursor-pointer py-1">
                      نماذج الطباعة الرسمية
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="rounded-lg font-bold text-xs cursor-pointer py-1 flex items-center justify-center gap-1.5">
                      قوالبي المحفوظة
                      {savedTemplates.length > 0 && (
                        <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">
                          {savedTemplates.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="official" className="mt-4 focus-visible:outline-hidden">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                      {officialTemplates.map((tpl) => (
                        <div key={tpl.id} onClick={() => setTemplatesDialogOpen(false)}>
                          <CollageTemplateCard
                            tpl={tpl}
                            onSelect={handleSelectTemplate}
                            isActive={collageTemplate?.id === tpl.id}
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="saved" className="mt-4 focus-visible:outline-hidden">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold text-foreground/80">القوالب المحفوظة</span>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 px-2.5 text-[11px] font-bold rounded-md border border-border bg-input hover:bg-muted/70 text-foreground cursor-pointer flex items-center justify-center transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none select-none shadow-2xs"
                        >
                          استيراد
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (savedTemplates.length === 0) return toast.info("لا توجد قوالب لتصديرها");
                            try {
                              const exportData = savedTemplates.map(t => ({ name: t.name, cells: t.cells }));
                              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `grido-templates-${Date.now()}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              toast.success("تم تصدير القوالب بنجاح");
                            } catch (e) {
                              toast.error("حدث خطأ أثناء التصدير");
                            }
                          }}
                          className="h-7 px-2.5 text-[11px] font-bold rounded-md border border-border/80 bg-muted/40 hover:bg-muted/70 text-foreground cursor-pointer flex items-center justify-center transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none select-none shadow-2xs"
                        >
                          تصدير الكل
                        </button>
                      </div>
                    </div>

                    {savedTemplates.length === 0 ? (
                      <FluentEmptyState
                        icon={<FolderHeart className="w-6 h-6 text-primary" />}
                        title="لا توجد قوالب مخصصة محفوظة"
                        description="قم بتخصيص شبكة كولاج من اللوحة وحفظها لتظهر هنا للوصول السريع."
                      />
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {savedTemplates.map((tpl) => (
                          <div key={tpl.id} onClick={() => setTemplatesDialogOpen(false)}>
                            <CollageTemplateCard
                              tpl={tpl}
                              onSelect={handleSelectTemplate}
                              isActive={collageTemplate?.id === tpl.id}
                              onDelete={(e) => handleDeleteTemplate(tpl.id, e)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-4" dir="rtl">
          <FluentSection
            icon={<Palette className="w-3.5 h-3.5" />}
            title="لون خلفية مساحة العمل"
          >
            <PopoverColorPicker
              color={backgroundColor}
              onChange={setBackgroundColor}
              className="w-full h-8 rounded-md border-border/80 bg-background/50 hover:bg-accent/40 hover:border-primary/40 shadow-2xs"
              label={
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <Paintbrush className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>لون خلفية مساحة العمل</span>
                </div>
              }
            />
          </FluentSection>

          <Separator className="bg-border/30 my-2" />

          <LayersList />
        </div>
      )}

      {/* Confirmation Dialog when switching templates with existing photos */}
      <AlertDialog open={pendingTemplate !== null} onOpenChange={(open) => { if (!open) setPendingTemplate(null); }}>
        <AlertDialogContent dir="rtl" className="font-cairo rounded-2xl border fluent-specular">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-base font-bold">
              {droppedCount > 0 ? "تبديل قالب الكولاج" : "الانتقال إلى وضع الكولاج"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right text-xs text-muted-foreground leading-relaxed">
              {droppedCount > 0 && mode === "collage"
                ? `سيتم إسقاط ${droppedCount} ${droppedCount === 1 ? "صورة" : "صور"} موجودة لا تتسع للقالب الجديد. هل تريد المتابعة؟`
                : droppedCount > 0
                  ? `سيتم إسقاط ${droppedCount} ${droppedCount === 1 ? "صورة" : "صور"} موجودة ومسح عناصر الوضع الحر الحالية. هل تريد المتابعة؟`
                  : "سيتم مسح عناصر الوضع الحر الحالية عند التحويل إلى وضع الكولاج. هل تريد المتابعة؟"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer rounded-md h-8 text-xs font-semibold">إلغاء</AlertDialogCancel>
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
}
