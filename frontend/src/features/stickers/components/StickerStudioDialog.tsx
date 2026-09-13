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
} from "@phosphor-icons/react";
import { FluentModal } from "@/components/ui/blocks";
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
import { StickerCategory, StickerShape, StickerTemplate, StickerParams, SheetGridConfig } from "../types";
import { ALL_STICKER_TEMPLATES } from "../templates";
import { findHiddenFieldIds } from "../templates/svg-elements";
import { renderSvgToPngDataUrl, downloadFile } from "../lib/svg-rasterizer";
import { copyPngDataUrlToClipboard } from "../lib/clipboard-utils";
import { generateStickerSheet } from "../lib/sheet-generator";
import { StickerCatalog } from "./StickerCatalog";
import { StickerProperties } from "./StickerProperties";
import { StickerPreview } from "./StickerPreview";

export interface StickerStudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: StickerCategory | "all";
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
  };
}

export const StickerStudioDialog = React.memo(function StickerStudioDialog({
  open,
  onOpenChange,
  initialCategory = "all",
}: StickerStudioDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<StickerCategory | "all">(initialCategory);
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

  // Reset loading state on dialog close (rule: Modal loading state cleanup)
  useEffect(() => {
    if (!open) {
      setIsInserting(false);
      setIsGeneratingSheet(false);
      setBusyExport(false);
    }
  }, [open]);

  // اختيار قالب: يحدّث الحقول من افتراضيات القالب الجديد فقط —
  // لا تبديل تلقائي عند تغيير التصنيف (المستخدم هو من يقرر أي قالب يعمل عليه)
  const handleSelectTemplate = useCallback((template: StickerTemplate) => {
    setSelectedTemplate(template);
    setParams(buildDefaultParams(template));
  }, []);

  const handleChangeCategory = useCallback((cat: StickerCategory | "all") => {
    setSelectedCategory(cat);
  }, []);

  const handleResetDefaults = useCallback(() => {
    setParams(buildDefaultParams(selectedTemplate));
  }, [selectedTemplate]);

  const svgString = useMemo(() => {
    try {
      return selectedTemplate.generateSvg(params);
    } catch (err) {
      console.error("Failed to generate SVG:", err);
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><text x="200" y="200" text-anchor="middle">Error</text></svg>`;
    }
  }, [selectedTemplate, params]);

  // كشف الحقول بلا عنصر مرئي قابل للنقر (كرابط QR) — تبقى وحدها في نموذج المفتش
  const hiddenFieldIds = useMemo(
    () => findHiddenFieldIds(svgString, selectedTemplate.fields.map((f) => f.id)),
    [svgString, selectedTemplate.fields]
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
      toast.success("تم إدراج الملصق بنجاح");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("فشل إدراج الملصق");
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
      const sheetPng = await generateStickerSheet(singlePng, {
        rows: gridConfig.rows,
        cols: gridConfig.cols,
        sheetWidth: 2400,
        sheetHeight: 2400,
      });
      await handleInsertToCanvas(sheetPng);
      toast.success(
        `تم إدراج شيت طباعة مكرر (${gridConfig.rows * gridConfig.cols} ملصقات)`
      );
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("فشل توليد شيت الملصقات");
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
      toast.success("تم تنزيل ملف SVG المتجهي");
    } catch {
      toast.error("فشل تنزيل ملف SVG");
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
      toast.success("تم تصدير صورة PNG عالية الدقة (300 DPI)");
    } catch {
      toast.error("فشل تصدير الصورة");
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
        toast.success("تم نسخ صورة الملصق للحافظة");
      } else {
        await navigator.clipboard.writeText(svgString);
        toast.success("تم نسخ كود SVG للحافظة");
      }
    } catch {
      toast.error("فشل النسخ");
    } finally {
      setBusyExport(false);
    }
  }, [svgString, selectedTemplate.aspectRatio, params.fontFamily]);

  return (
    <FluentModal
      open={open}
      onOpenChange={onOpenChange}
      size="full"
      contentClassName="h-[92vh]"
      icon={<SealCheck className="w-5 h-5 text-primary" weight="duotone" />}
      title="استوديو الملصقات"
      headerAction={
        /* CTA الوحيد المهما: الإدراج المفرد — البقية في الشريط السفلي */
        <Button
          type="button"
          size="sm"
          onClick={handleInsertSingle}
          disabled={isInserting || isGeneratingSheet}
          className="h-8 px-4 rounded-md text-xs font-bold gap-1.5 shadow-fluent-4 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          {isInserting ? (
            <>
              <Spinner className="w-3.5 h-3.5 animate-spin" />
              <span>جاري الإدراج ...</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" weight="bold" />
              <span>إدراج الملصق</span>
            </>
          )}
        </Button>
      }
    >
      {/* 3 Areas: Library (RTL right) | Immersive Preview (center) | Inspector (RTL left) */}
      <div className="flex flex-row h-full min-h-0 overflow-hidden">
        {/* Library: Icon Rail + Templates Column */}
        <div className="w-[340px] xl:w-[380px] shrink-0 h-full flex flex-col overflow-hidden border-e border-border/40">
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

        {/* Immersive Preview */}
        <div className="flex-1 min-w-[320px] h-full flex flex-col overflow-hidden border-e border-border/40">
          <StickerPreview
            template={selectedTemplate}
            params={params}
            svgString={svgString}
            onChangeField={handleChangeField}
            onChangeColor={handleChangeColor}
            onResetField={handleResetField}
          />
        </div>

        {/* Inspector */}
        <div className="w-[300px] xl:w-[320px] shrink-0 h-full flex flex-col overflow-hidden">
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

      {/* Status Bar: Secondary actions live here — export, sheet, stats */}
      <div className="shrink-0 h-10 border-t border-border/40 bg-muted/20 backdrop-blur-md px-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono min-w-0">
          <span className="truncate max-w-[180px] font-cairo font-semibold text-foreground/80">
            {selectedTemplate.name}
          </span>
          <span className="text-border/60">•</span>
          <span>{selectedTemplate.fields.length} حقول</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Export Dropdown */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isInserting || isGeneratingSheet || busyExport}
                className="h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-md hover:bg-muted/60 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                {busyExport ? (
                  <Spinner className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <DownloadSimple className="w-3.5 h-3.5" />
                )}
                <span>{busyExport ? "جاري التصدير ..." : "تصدير"}</span>
                {!busyExport && <CaretDown className="w-3 h-3 text-muted-foreground" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs font-cairo">
              <DropdownMenuItem onClick={handleDownloadPng} className="cursor-pointer gap-2">
                <FilePng className="w-4 h-4 text-primary" weight="duotone" />
                <span>صورة PNG (300 DPI)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadSvg} className="cursor-pointer gap-2">
                <FileSvg className="w-4 h-4 text-primary" weight="duotone" />
                <span>ملف متجهي SVG</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyImage} className="cursor-pointer gap-2">
                <Copy className="w-4 h-4 text-muted-foreground" />
                <span>نسخ للحافظة</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sheet Insert (Secondary path — batch printing) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleInsertSheet}
            disabled={isInserting || isGeneratingSheet}
            className="h-7 px-3 rounded-md text-xs font-semibold gap-1.5 border-border/60 shadow-2xs hover:bg-muted/80 cursor-pointer transition-all"
            title={`إدراج شيت طباعة مكرر (${gridConfig.rows}×${gridConfig.cols} ملصقات)`}
          >
            {isGeneratingSheet ? (
              <>
                <Spinner className="w-3.5 h-3.5 animate-spin" />
                <span>جاري التوليد ...</span>
              </>
            ) : (
              <>
                <GridFour className="w-3.5 h-3.5 text-primary" weight="bold" />
                <span>إدراج شيت مكرر ({gridConfig.rows * gridConfig.cols})</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </FluentModal>
  );
});

StickerStudioDialog.displayName = "StickerStudioDialog";
