import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  SealCheck,
  Plus,
  GridFour,
  DownloadSimple,
  Copy,
  FilePng,
  FileSvg,
  CaretDown,
  ArrowRight,
  Sparkle,
  Code,
} from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogCloseButton,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/huge-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from "@/lib/editor-store";
import { wailsIsDesktop } from "@/lib/wails-env";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";
import { toast } from "sonner";
import { StickerCategory, StickerCategoryGroupId, StickerShape, StickerTemplate, StickerParams, SheetGridConfig } from "../types";
import { ALL_STICKER_TEMPLATES } from "../templates";
import { findHiddenFieldIds } from "../templates/svg-elements";
import { renderSvgToPngDataUrl, downloadFile } from "../lib/svg-rasterizer";
import { copyPngDataUrlToClipboard, copySvgCodeToClipboard } from "../lib/clipboard-utils";
import { generateStickerSheet } from "../lib/sheet-generator";
import { StickerCatalog } from "./StickerCatalog";
import { StickerProperties } from "./StickerProperties";
import { StickerPreview } from "./StickerPreview";

export interface StickerStudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: StickerCategoryGroupId | StickerCategory | "all";
}

function buildDefaultParams(template: StickerTemplate): StickerParams {
  return {
    fields: Object.fromEntries(template.fields.map((f) => [f.id, f.defaultValue])),
    primaryColor: template.defaultColors.primary,
    secondaryColor: template.defaultColors.secondary,
    backgroundColor: template.defaultColors.background,
    isTransparent: false,
    fontFamily: "Cairo",
    fontScale: 1,
    finish: "standard",
    dieCutBorder: true,
  };
}

export const StickerStudioDialog = React.memo(function StickerStudioDialog({
  open,
  onOpenChange,
  initialCategory = "all",
}: StickerStudioDialogProps) {
  // Stage state: "gallery" for picking templates, "customize" for fine-tuning & inserting
  const [view, setView] = useState<"gallery" | "customize">("gallery");

  const [selectedCategory, setSelectedCategory] = useState<StickerCategoryGroupId | StickerCategory | "all">(initialCategory);
  const [selectedShape, setSelectedShape] = useState<StickerShape | "all">("all");
  const [selectedTemplate, setSelectedTemplate] = useState<StickerTemplate>(() => {
    if (initialCategory !== "all") {
      const match = ALL_STICKER_TEMPLATES.find((t) => t.category === initialCategory);
      if (match) return match;
    }
    return ALL_STICKER_TEMPLATES[0];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isInserting, setIsInserting] = useState(false);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [busyExport, setBusyExport] = useState(false);

  const [gridConfig, setGridConfig] = useState<SheetGridConfig>({
    rows: 3,
    cols: 3,
    spacingMm: 4,
  });

  const [params, setParams] = useState<StickerParams>(() => buildDefaultParams(selectedTemplate));

  // Reset loading state and restore gallery on dialog close (rule: Modal loading state cleanup)
  useEffect(() => {
    if (!open) {
      setIsInserting(false);
      setIsGeneratingSheet(false);
      setBusyExport(false);
      setView("gallery");
    }
  }, [open]);

  // اختيار قالب: يحدّث الحقول من افتراضيات القالب الجديد وينتقل مباشرة لوضع التخصيص
  const handleSelectTemplate = useCallback((template: StickerTemplate) => {
    setSelectedTemplate(template);
    setParams(buildDefaultParams(template));
    setView("customize");
  }, []);

  const handleBackToGallery = useCallback(() => {
    setView("gallery");
  }, []);

  const handleChangeCategory = useCallback((cat: StickerCategoryGroupId | StickerCategory | "all") => {
    setSelectedCategory(cat);
  }, []);

  const handleResetDefaults = useCallback(() => {
    setParams(buildDefaultParams(selectedTemplate));
  }, [selectedTemplate]);

  const svgString = useMemo(() => {
    if (view === "gallery") return "";
    try {
      const rawFamily = params.fontFamily || "Cairo";
      const cleanFamily = rawFamily.replace(/['"]/g, "").trim();
      const safeFamily = cleanFamily.includes(" ") ? `'${cleanFamily}'` : cleanFamily;
      return selectedTemplate.generateSvg({
        ...params,
        fontFamily: safeFamily,
      });
    } catch (err) {
      console.error("Failed to generate SVG:", err);
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><text x="200" y="200" text-anchor="middle">Error</text></svg>`;
    }
  }, [view, selectedTemplate, params]);

  const hiddenFieldIds = useMemo(
    () => (view === "customize" ? findHiddenFieldIds(svgString, selectedTemplate.fields.map((f) => f.id)) : []),
    [view, svgString, selectedTemplate.fields]
  );

  const handleInsertToCanvas = useCallback(async (pngDataUrl: string) => {
    let finalSrc = pngDataUrl;

    if (wailsIsDesktop() && pngDataUrl.startsWith("data:image/")) {
      try {
        const localPath = await SaveImageFromBase64(pngDataUrl);
        if (localPath) finalSrc = localPath;
      } catch (e) {
        console.error("Failed to save sticker locally on desktop:", e);
      }
    }

    const aspect = await resolveImageAspectRatio(finalSrc);
    useEditorStore.getState().addImageElement(finalSrc, aspect);
  }, []);

  const handleInsertSingle = useCallback(async () => {
    try {
      setIsInserting(true);
      const pngUrl = await renderSvgToPngDataUrl(
        svgString,
        1200,
        1200 / selectedTemplate.aspectRatio,
        [params.fontFamily || "Cairo"]
      );
      await handleInsertToCanvas(pngUrl);
      toast.success("أُدرج الملصق");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("فشل الإدراج");
    } finally {
      setIsInserting(false);
    }
  }, [svgString, selectedTemplate.aspectRatio, params.fontFamily, handleInsertToCanvas, onOpenChange]);

  const handleInsertSheet = useCallback(async () => {
    try {
      setIsGeneratingSheet(true);
      const singlePng = await renderSvgToPngDataUrl(
        svgString,
        1000,
        1000 / selectedTemplate.aspectRatio,
        [params.fontFamily || "Cairo"]
      );
      // #9 — تحويل spacingMm → gapPx بناءً على DPI الشيت المستهدف (2400px / 200mm = 12 px/mm)
      const SHEET_WIDTH_PX = 2400;
      const SHEET_WIDTH_MM = 200; // 20 سم
      const pxPerMm = SHEET_WIDTH_PX / SHEET_WIDTH_MM;
      const gapPx = Math.max(0, Math.round(gridConfig.spacingMm * pxPerMm));
      const sheetPng = await generateStickerSheet(singlePng, {
        rows: gridConfig.rows,
        cols: gridConfig.cols,
        gapPx,
        sheetWidth: 2400,
        sheetHeight: 2400,
      });
      await handleInsertToCanvas(sheetPng);
      toast.success(
        `أُدرج شيت (${gridConfig.rows * gridConfig.cols} ملصقات)`
      );
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("فشل توليد الشيت");
    } finally {
      setIsGeneratingSheet(false);
    }
  }, [svgString, selectedTemplate.aspectRatio, params.fontFamily, gridConfig, handleInsertToCanvas, onOpenChange]);

  const handleChangeField = useCallback((fieldId: string, value: string) => {
    setParams((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldId]: value,
      },
    }));
  }, []);

  const handleChangeColor = useCallback(
    (role: "primary" | "secondary" | "background", color: string) => {
      setParams((prev) => {
        switch (role) {
          case "primary":
            return { ...prev, primaryColor: color };
          case "secondary":
            return { ...prev, secondaryColor: color };
          case "background":
            return { ...prev, backgroundColor: color };
        }
      });
    },
    []
  );

  const handleResetField = useCallback((fieldId: string) => {
    const field = selectedTemplate.fields.find((f) => f.id === fieldId);
    if (!field) return;
    setParams((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldId]: field.defaultValue,
      },
    }));
  }, [selectedTemplate.fields]);

  const handleDownloadSvg = useCallback(() => {
    try {
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      downloadFile(url, `${selectedTemplate.id}.svg`);
      URL.revokeObjectURL(url);
      toast.success("نُزّل ملف SVG");
    } catch {
      toast.error("فشل تنزيل SVG");
    }
  }, [svgString, selectedTemplate.id]);

  const handleDownloadPng = useCallback(async () => {
    try {
      setBusyExport(true);
      const pngUrl = await renderSvgToPngDataUrl(
        svgString,
        1200,
        1200 / selectedTemplate.aspectRatio,
        [params.fontFamily || "Cairo"]
      );
      downloadFile(pngUrl, `${selectedTemplate.id}.png`);
      toast.success("صُدّر PNG عالي الدقة (300 DPI)");
    } catch {
      toast.error("فشل التصدير");
    } finally {
      setBusyExport(false);
    }
  }, [svgString, selectedTemplate.aspectRatio, selectedTemplate.id, params.fontFamily]);

  const handleCopyImage = useCallback(async () => {
    try {
      setBusyExport(true);
      const pngUrl = await renderSvgToPngDataUrl(
        svgString,
        1200,
        1200 / selectedTemplate.aspectRatio,
        [params.fontFamily || "Cairo"]
      );
      const ok = await copyPngDataUrlToClipboard(pngUrl);
      if (ok) {
        toast.success("نُسخت الصورة للحافظة");
      } else {
        await copySvgCodeToClipboard(svgString);
        toast.success("نُسخ كود SVG");
      }
    } catch {
      toast.error("فشل النسخ");
    } finally {
      setBusyExport(false);
    }
  }, [svgString, selectedTemplate.aspectRatio, params.fontFamily]);

  const handleCopySvgCode = useCallback(async () => {
    try {
      const ok = await copySvgCodeToClipboard(svgString);
      if (ok) {
        toast.success("نُسخ كود SVG المتجه");
      } else {
        toast.error("تعذر نسخ SVG");
      }
    } catch {
      toast.error("فشل نسخ SVG");
    }
  }, [svgString]);


  const templateMm = selectedTemplate.defaultMm || {
    width: 50,
    height: Math.round(50 / selectedTemplate.aspectRatio),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[94vw] sm:max-w-[920px] h-[640px] max-h-[88vh] min-h-[520px] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 rounded-2xl shadow-fluent-28 font-cairo fluent-specular transition-all duration-200 gap-0"
        dir="rtl"
      >
        {/* ── Title Bar Header (Adapts to Active Stage) ── */}
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            {view === "gallery" ? (
              /* Gallery Header */
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <SealCheck className="w-4 h-4 text-primary" weight="duotone" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <DialogTitle className="text-sm font-bold text-foreground truncate">
                    الملصقات
                  </DialogTitle>
                  <span className="text-mini font-mono font-bold px-2 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {ALL_STICKER_TEMPLATES.length}
                  </span>
                  <DialogDescription className="sr-only">
                    معرض ملصقات وشارات Grido
                  </DialogDescription>
                </div>
              </div>
            ) : (
              /* Customize Header with Back Button */
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToGallery}
                  className="h-8 px-2 text-xs font-bold gap-1 rounded-md hover:bg-muted text-foreground cursor-pointer shrink-0 border border-border/40 hover:border-border/70"
                  title="العودة للمعرض"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>المعرض</span>
                </Button>

                <div className="w-px h-4 bg-border/60 shrink-0" />

                <div className="flex items-center gap-2 min-w-0">
                  <DialogTitle className="text-sm font-bold text-foreground truncate">
                    {selectedTemplate.name}
                  </DialogTitle>
                  <span className="text-micro font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                    {templateMm.width}×{templateMm.height} مم
                  </span>
                  <DialogDescription className="sr-only">
                    تخصيص ملصق {selectedTemplate.name}
                  </DialogDescription>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 shrink-0">
              <DialogCloseButton />
            </div>
          </div>
        </DialogHeader>

        {/* ── Dialog Body: Gallery vs Customize ── */}
        {view === "gallery" ? (
          /* View 1: Spacious Gallery */
          <div className="flex-1 min-h-0 overflow-hidden">
            <StickerCatalog
              selectedCategory={selectedCategory}
              selectedShape={selectedShape}
              selectedTemplateId={selectedTemplate.id}
              onSelectTemplate={handleSelectTemplate}
              onSelectCategory={handleChangeCategory}
              onSelectShape={setSelectedShape}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        ) : (
          /* View 2: Focused 2-Column Customizer */
          <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
            {/* Right Side (RTL Start): Live Vector Preview */}
            <div className="flex-1 min-w-[340px] h-full flex flex-col overflow-hidden border-e border-border/40">
              <StickerPreview
                template={selectedTemplate}
                params={params}
                svgString={svgString}
                onChangeField={handleChangeField}
                onChangeColor={handleChangeColor}
                onResetField={handleResetField}
              />
            </div>

            {/* Left Side (RTL End): Streamlined Inspector */}
            <div className="w-[330px] xl:w-[350px] shrink-0 h-full flex flex-col overflow-hidden">
              <StickerProperties
                template={selectedTemplate}
                params={params}
                onChangeParams={setParams}
                onResetDefaults={handleResetDefaults}
                gridConfig={gridConfig}
                onChangeGridConfig={setGridConfig}
                hiddenFieldIds={hiddenFieldIds}
              />
            </div>
          </div>
        )}

        {/* ── Footer: Action Bar (Adapts to Active Stage) ── */}
        <DialogFooter className="px-5 py-2.5 border-t border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          {view === "gallery" ? (
            /* Gallery Footer */
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                <SealCheck className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                <span className="text-foreground font-bold truncate">{selectedTemplate.name}</span>
                <span className="text-border/60">•</span>
                <span className="text-mini"><span className="font-mono">{templateMm.width}×{templateMm.height}</span> مم</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 px-3.5 text-xs font-semibold rounded-md cursor-pointer"
                >
                  إلغاء
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setView("customize")}
                  className="h-8 px-4 rounded-md text-xs font-bold gap-1.5 shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <span>تخصيص</span>
                  <Sparkle className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </div>
            </>
          ) : (
            /* Customize Footer */
            <>
              {/* Auxiliary Tools & Export */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Export Dropdown */}
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isInserting || isGeneratingSheet || busyExport}
                      className="h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-md hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground shrink-0 border-border/60"
                    >
                      {busyExport ? (
                        <Spinner className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <DownloadSimple className="w-3.5 h-3.5" />
                      )}
                      <span>{busyExport ? "يصدّر ..." : "تصدير"}</span>
                      {!busyExport && <CaretDown className="w-3 h-3 text-muted-foreground" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44 text-xs font-cairo">
                    <DropdownMenuItem onClick={handleDownloadPng} className="cursor-pointer gap-2">
                      <FilePng className="w-4 h-4 text-primary" weight="duotone" />
                      <span>صورة PNG</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadSvg} className="cursor-pointer gap-2">
                      <FileSvg className="w-4 h-4 text-emerald-500" weight="duotone" />
                      <span>ملف SVG</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyImage} className="cursor-pointer gap-2">
                      <Copy className="w-4 h-4 text-amber-500" weight="duotone" />
                      <span>نسخ صورة</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopySvgCode} className="cursor-pointer gap-2">
                      <Code className="w-4 h-4 text-indigo-500" weight="duotone" />
                      <span>نسخ SVG</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sheet Insert Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleInsertSheet}
                  disabled={isInserting || isGeneratingSheet || busyExport}
                  className="h-8 px-2.5 rounded-md text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted cursor-pointer shrink-0"
                  title={`إدراج شيت (${gridConfig.rows}×${gridConfig.cols})`}
                >
                  {isGeneratingSheet ? (
                    <>
                      <Spinner className="w-3.5 h-3.5 animate-spin" />
                      <span>يولّد ...</span>
                    </>
                  ) : (
                    <>
                      <GridFour className="w-3.5 h-3.5 text-primary" weight="bold" />
                      <span>شيت ({gridConfig.rows * gridConfig.cols})</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Actions: Cancel & Hero Insert */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isInserting || isGeneratingSheet || busyExport}
                  className="h-8 px-3.5 text-xs font-semibold rounded-md cursor-pointer"
                >
                  إلغاء
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleInsertSingle}
                  disabled={isInserting || isGeneratingSheet || busyExport}
                  className="h-8 px-5 rounded-md text-xs font-bold gap-1.5 shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all min-w-[90px]"
                >
                  {isInserting ? (
                    <>
                      <Spinner className="w-3.5 h-3.5 animate-spin" />
                      <span>يُدرج ...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" weight="bold" />
                      <span>إدراج</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

StickerStudioDialog.displayName = "StickerStudioDialog";
