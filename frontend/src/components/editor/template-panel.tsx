"use client";

import { useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import {
  PHOTO_TEMPLATES,
  COLLAGE_TEMPLATES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  TemplateCategory,
  PhotoTemplate,
  CollageTemplate,
} from "@/lib/templates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LayoutTemplate, Images } from "lucide-react";

export function TemplatePanel() {
  const { setTemplate, setCollageTemplate } = useEditorStore();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("id");
  const [activeTab, setActiveTab] = useState<"templates" | "collage">("templates");

  const categories: TemplateCategory[] = ["id", "passport", "visa", "personal"];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4" /> القوالب الجاهزة
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          اختر قالباً مطابقاً لمتطلبات الجهة الرسمية
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "templates" | "collage")} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-2 gap-1 p-2 bg-transparent">
          <TabsTrigger value="templates" className="text-xs gap-1.5">
            <LayoutTemplate className="w-3.5 h-3.5" /> صورة واحدة
          </TabsTrigger>
          <TabsTrigger value="collage" className="text-xs gap-1.5">
            <Images className="w-3.5 h-3.5" /> كولاج
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="flex-1 flex flex-col overflow-hidden mt-0">
          <div className="flex gap-1 px-2 pb-2 flex-wrap">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1.5",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
          <ScrollArea className="flex-1 px-2 pb-3">
            <div className="grid grid-cols-2 gap-2">
              {PHOTO_TEMPLATES.filter((t) => t.category === activeCategory).map((tpl) => (
                <TemplateCard key={tpl.id} tpl={tpl} onSelect={setTemplate} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="collage" className="flex-1 flex flex-col overflow-hidden mt-0">
          <p className="px-3 py-2 text-xs text-muted-foreground">
            اختر قالب كولاج لترتيب عدة صور في إطار واحد
          </p>
          <ScrollArea className="flex-1 px-2 pb-3">
            <div className="grid grid-cols-2 gap-2">
              {COLLAGE_TEMPLATES.map((tpl) => (
                <CollageTemplateCard key={tpl.id} tpl={tpl} onSelect={setCollageTemplate} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplateCard({
  tpl,
  onSelect,
}: {
  tpl: PhotoTemplate;
  onSelect: (t: PhotoTemplate) => void;
}) {
  const aspect = tpl.width / tpl.height;
  const Icon = tpl.icon;
  return (
    <button
      onClick={() => onSelect(tpl)}
      className="group flex flex-col items-stretch gap-1.5 p-2 rounded-lg border bg-card hover:border-primary hover:shadow-md transition-all text-right"
    >
      <div className="aspect-[3/4] w-full bg-muted rounded flex items-center justify-center overflow-hidden">
        <div
          className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center"
          style={{
            aspectRatio: `${aspect}`,
            width: aspect < 1 ? "auto" : "100%",
            height: aspect < 1 ? "100%" : "auto",
          }}
        >
          <Icon className="w-7 h-7 text-primary" />
        </div>
      </div>
      <div className="text-xs font-semibold leading-tight">{tpl.name}</div>
      <div className="text-[10px] text-muted-foreground">
        {tpl.widthMM}×{tpl.heightMM} ملم · {tpl.dpi}dpi
      </div>
      {tpl.notes && (
        <div className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
          {tpl.notes}
        </div>
      )}
    </button>
  );
}

function CollageTemplateCard({
  tpl,
  onSelect,
}: {
  tpl: CollageTemplate;
  onSelect: (t: CollageTemplate) => void;
}) {
  return (
    <button
      onClick={() => onSelect(tpl)}
      className="group flex flex-col items-center gap-1.5 p-2 rounded-lg border bg-card hover:border-primary hover:shadow-md transition-all"
    >
      <div className="aspect-square w-full bg-muted rounded relative overflow-hidden">
        {tpl.cells.map((c, i) => (
          <div
            key={i}
            className="absolute bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30"
            style={{
              left: `${c.x * 100}%`,
              top: `${c.y * 100}%`,
              width: `${c.w * 100}%`,
              height: `${c.h * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="text-xs font-semibold">{tpl.name}</div>
      <div className="text-[10px] text-muted-foreground">{tpl.slots} صور</div>
    </button>
  );
}
