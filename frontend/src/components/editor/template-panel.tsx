import React, { useState, useEffect } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { COLLAGE_TEMPLATES, CollageTemplate, PAPER_SIZES } from "@/lib/templates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


import { CollageTemplateCard } from "./collage-template-card";
import { CustomCollageCard } from "./custom-collage-card";
import { cn } from "@/lib/utils";
import { LayoutGrid, Plus, Minus, Image as ImageIcon, Paintbrush, Rows, Columns, FolderHeart, Trash2, Save, X, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft, Crosshair } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { PopoverColorPicker } from "./properties/shared-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TemplatePanel() {
  const { setCollageTemplate, collageTemplate, backgroundColor, setBackgroundColor } = useEditorStore(useShallow((state) => ({
    setCollageTemplate: state.setCollageTemplate,
    collageTemplate: state.collageTemplate,
    backgroundColor: state.backgroundColor,
    setBackgroundColor: state.setBackgroundColor,
  })));

  const [savedTemplates, setSavedTemplates] = useState<CollageTemplate[]>(() => {
    const raw = localStorage.getItem("grido_user_collage_templates");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.map((t: any) => ({
          ...t,
          icon: LayoutGrid,
        }));
      } catch (e) {
        console.error("Failed to load user templates", e);
      }
    }
    return [];
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPredefined, setShowPredefined] = useState(false);
  
  const officialTemplates = COLLAGE_TEMPLATES.filter(
    (t) => t.id.startsWith("collage-iq-") || t.id === "collage-passport-sheet"
  );

  const loadTemplates = () => {
    const raw = localStorage.getItem("grido_user_collage_templates");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const mapped = parsed.map((t: any) => ({
          ...t,
          icon: LayoutGrid,
        }));
        setSavedTemplates(mapped);
      } catch (e) {
        console.error("Failed to load user templates", e);
      }
    } else {
      setSavedTemplates([]);
    }
  };

  const handleSaveTemplate = (name: string, cells: any[]) => {
    const newTpl: CollageTemplate = {
      id: "collage-user-" + Date.now(),
      name,
      slots: cells.length,
      cells,
      icon: LayoutGrid,
    };
    const updated = [...savedTemplates, newTpl];
    localStorage.setItem("grido_user_collage_templates", JSON.stringify(updated));
    setSavedTemplates(updated);
    toast.success("تم حفظ القالب بنجاح");
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTemplates.filter((t) => t.id !== id);
    localStorage.setItem("grido_user_collage_templates", JSON.stringify(updated));
    setSavedTemplates(updated);
    toast.success("تم حذف القالب بنجاح");
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/40 select-none">
      {/* Scrollable Sidebar Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 pb-8 space-y-4">
          {/* Color Picker Section */}
          <div className="space-y-1.5 font-cairo">
            <PopoverColorPicker
              color={backgroundColor}
              onChange={setBackgroundColor}
              className="w-full h-9 rounded-xl border-border/60 bg-background/60 hover:bg-accent/30 hover:border-primary/30"
              label={
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                  <Paintbrush className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>لون خلفية مساحة العمل</span>
                </div>
              }
            />
          </div>

          <Separator className="bg-border/25" />

          {/* Grid Settings Section */}
          <div className="space-y-3.5">
            <CustomCollageCard 
              onSelect={setCollageTemplate} 
              activeTemplateId={collageTemplate?.id} 
              onSaveTemplate={handleSaveTemplate}
            />

            <Separator className="bg-border/25" />

            <div className="space-y-2.5 font-cairo pt-1.5">
              <Dialog onOpenChange={(open) => { if (open) loadTemplates(); }}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-primary/30 text-foreground transition-all cursor-pointer active:scale-[0.98] shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderHeart className="w-4 h-4 text-primary" />
                      <span className="text-[11px] font-bold">قوالب الكولاج والطباعة</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl font-cairo" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="text-right text-base font-bold flex items-center gap-2">
                      <FolderHeart className="w-5 h-5 text-primary" />
                      قوالب الكولاج والطباعة
                    </DialogTitle>
                    <DialogDescription className="text-right text-[11px]">
                      اختر من نماذج الطباعة الرسمية المجهزة أو قوالب الكولاج التي قمت بحفظها مسبقاً.
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="official" className="w-full mt-3">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl h-10 border border-border/40">
                      <TabsTrigger value="official" className="rounded-lg font-bold text-xs cursor-pointer py-1.5">
                        نماذج الطباعة الرسمية
                      </TabsTrigger>
                      <TabsTrigger value="saved" className="rounded-lg font-bold text-xs cursor-pointer py-1.5 flex items-center justify-center gap-1.5">
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
                          <DialogTrigger key={tpl.id} asChild>
                            <div>
                              <CollageTemplateCard
                                tpl={tpl}
                                onSelect={(t) => setCollageTemplate(t)}
                                isActive={collageTemplate?.id === tpl.id}
                              />
                            </div>
                          </DialogTrigger>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="saved" className="mt-4 focus-visible:outline-hidden">
                      {savedTemplates.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground text-center py-10 border border-dashed border-border/60 rounded-2xl bg-muted/5">
                          لا توجد قوالب محفوظة بعد. يمكنك إنشاء قالب مخصص وحفظه.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                          {savedTemplates.map((tpl) => (
                            <DialogTrigger key={tpl.id} asChild>
                              <div>
                                <CollageTemplateCard
                                  tpl={tpl}
                                  onSelect={(t) => setCollageTemplate(t)}
                                  isActive={collageTemplate?.id === tpl.id}
                                  onDelete={(e) => handleDeleteTemplate(tpl.id, e)}
                                />
                              </div>
                            </DialogTrigger>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

