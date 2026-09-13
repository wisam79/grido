import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CursorClick,
} from "@phosphor-icons/react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StickerTemplate, StickerParams, MockupBackground } from "../types";
import { StickerInlineEditor, ActiveFieldState, ActiveColorState } from "./StickerInlineEditor";

export interface StickerPreviewProps {
  template: StickerTemplate;
  params: StickerParams;
  svgString: string;
  onChangeField?: (fieldId: string, value: string) => void;
  onChangeColor?: (role: "primary" | "secondary" | "background", color: string) => void;
  onResetField?: (fieldId: string) => void;
}

const MOCKUP_OPTIONS: { id: MockupBackground; label: string; dotClass: string }[] = [
  { id: "dark", label: "داكن", dotClass: "bg-[#0f172a]" },
  { id: "white", label: "استوديو", dotClass: "bg-white border border-border/80" },
  { id: "cardboard", label: "كرتون", dotClass: "bg-[#B88E58]" },
  { id: "checker", label: "شفاف", dotClass: "bg-muted-foreground/50 border border-border/40" },
];

const COLOR_ROLE_LABELS: Record<"primary" | "secondary" | "background", string> = {
  primary: "اللون الرئيسي",
  secondary: "اللون الثانوي",
  background: "لون الخلفية",
};

export const StickerPreview = React.memo(function StickerPreview({
  template,
  params,
  svgString,
  onChangeField,
  onChangeColor,
  onResetField,
}: StickerPreviewProps) {
  const [mockupBg, setMockupBg] = useState<MockupBackground>("dark");
  const [zoomLevel, setZoomLevel] = useState(1);

  const finish = params.finish || "standard";
  const showDieCut = params.dieCutBorder ?? true;

  // Active in-place element editor state
  const [activeField, setActiveField] = useState<ActiveFieldState | null>(null);
  const [activeColor, setActiveColor] = useState<ActiveColorState | null>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);

  // Reset active editors when switching templates
  useEffect(() => {
    setActiveField(null);
    setActiveColor(null);
  }, [template.id]);

  /** تمييز عنصر SVG واحد كنشط (نص أو شكل) وإزالة التمييز عن السابق */
  const markActiveElement = useCallback((el: SVGElement | null) => {
    const host = svgHostRef.current;
    if (!host) return;
    host.querySelectorAll(".is-active-edit").forEach((n) => n.classList.remove("is-active-edit"));
    if (el) el.classList.add("is-active-edit");
  }, []);

  const closeEditors = useCallback(() => {
    setActiveField(null);
    setActiveColor(null);
    markActiveElement(null);
  }, [markActiveElement]);

  /** فتح محرر حقل نصي — القيمة تُقرأ من params لحظة الفتح (لا نسخة ستاليّة) */
  const openFieldEditor = useCallback(
    (fieldId: string, target: SVGElement) => {
      const stageRect = stageContainerRef.current?.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const x = stageRect ? targetRect.left - stageRect.left + targetRect.width / 2 : 0;
      const y = stageRect ? targetRect.top - stageRect.top : 0;

      setActiveColor(null);
      markActiveElement(target);
      setActiveField({
        fieldId,
        x,
        y,
      });
    },
    [markActiveElement]
  );

  /** فتح محرر لون دور — اللون الحالي يُقرأ من params مباشرة */
  const openColorEditor = useCallback(
    (role: "primary" | "secondary" | "background", target: SVGElement) => {
      const stageRect = stageContainerRef.current?.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const x = stageRect ? targetRect.left - stageRect.left + targetRect.width / 2 : 0;
      const y = stageRect ? targetRect.top - stageRect.top : 0;

      const currentColors: Record<string, string> = {
        primary: params.primaryColor,
        secondary: params.secondaryColor,
        background: params.backgroundColor,
      };

      setActiveField(null);
      markActiveElement(target);
      setActiveColor({
        role,
        label: COLOR_ROLE_LABELS[role],
        currentColor: currentColors[role],
        x,
        y,
      });
    },
    [params.primaryColor, params.secondaryColor, params.backgroundColor, markActiveElement]
  );

  /** استنتاج حقل النص من العنصر: data-field-id الصريح ثم مطابقة المحتوى */
  const resolveTextField = useCallback(
    (textEl: SVGTextElement): { id: string; target: SVGElement } | null => {
      const explicit = textEl.getAttribute("data-field-id");
      const content = textEl.textContent?.trim() || "";
      const byId = explicit
        ? template.fields.find((f) => f.id === explicit)
        : undefined;
      const byContent = byId
        ? undefined
        : template.fields.find(
            (f) =>
              (params.fields[f.id] && params.fields[f.id].trim() === content) ||
              f.defaultValue.trim() === content
          );
      const field = byId ?? byContent;
      if (!field) return null;
      // textPath داخل <text data-field-id>: نبرز الحاوية <text> نفسها
      const anchor =
        (textEl.tagName.toLowerCase() === "textpath"
          ? (textEl.closest("text") as SVGElement | null)
          : textEl) ?? textEl;
      return { id: field.id, target: anchor };
    },
    [template.fields, params.fields]
  );

  /** استنتاج دور اللون من عنصر شكلي */
  const resolveColorRole = useCallback(
    (shapeEl: SVGGraphicsElement): "primary" | "secondary" | "background" | null => {
      const explicit = shapeEl.getAttribute("data-color-role") as
        | "primary"
        | "secondary"
        | "background"
        | null;
      if (explicit) return explicit;
      const fill = shapeEl.getAttribute("fill");
      if (fill === params.backgroundColor) return "background";
      if (fill === params.secondaryColor) return "secondary";
      if (fill === params.primaryColor) return "primary";
      if (shapeEl.tagName.toLowerCase() === "rect" && !shapeEl.getAttribute("stroke")) {
        return "background";
      }
      return null;
    },
    [params.primaryColor, params.secondaryColor, params.backgroundColor]
  );

  // Handle direct click on SVG elements
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | SVGElement;
    if (!target || !stageContainerRef.current) return;

    // 1. Text element clicked -> Open Text Inline Editor
    const textEl = target.closest("text, textPath") as SVGTextElement | null;
    if (textEl) {
      e.stopPropagation();
      const resolved = resolveTextField(textEl);
      if (resolved) {
        openFieldEditor(resolved.id, resolved.target);
        return;
      }
    }

    // 2. Shape or Background clicked -> Open Color Role Quick Swatches
    const shapeEl = target.closest("polygon, circle, rect, path, ellipse") as SVGGraphicsElement | null;
    if (shapeEl) {
      e.stopPropagation();
      const role = resolveColorRole(shapeEl);
      if (role) {
        openColorEditor(role, shapeEl);
        return;
      }
    }

    // Clicked outside elements -> close
    closeEditors();
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const handleZoomReset = () => setZoomLevel(1);

  // Surface texture styling
  const stageBackgroundStyle = useMemo(() => {
    switch (mockupBg) {
      case "checker":
        return {
          backgroundImage:
            "linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.05) 75%)",
          backgroundColor: "#090d16",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
        };
      case "white":
        return {
          background: "radial-gradient(ellipse at 50% 30%, #ffffff 0%, #f1f5f9 65%, #e2e8f0 100%)",
        };
      case "cardboard":
        return {
          backgroundColor: "#B88E58",
          backgroundImage:
            "radial-gradient(#9b7444 0.75px, transparent 0.75px), radial-gradient(#9b7444 0.75px, #B88E58 0.75px)",
          backgroundSize: "18px 18px",
          backgroundPosition: "0 0, 9px 9px",
        };
      case "dark":
      default:
        return {
          background: "radial-gradient(ellipse at center, #172033 0%, #0a0f1d 80%)",
        };
    }
  }, [mockupBg]);

  // Physical lighting and die-cut shadows
  const stickerFilterStyle = useMemo(() => {
    const filters: string[] = [];

    if (showDieCut) {
      filters.push("drop-shadow(0 0 1px rgba(255, 255, 255, 0.98))");
      filters.push("drop-shadow(0 0 2.5px rgba(255, 255, 255, 0.85))");
    }

    if (finish === "glossy") {
      filters.push("drop-shadow(0 20px 35px rgba(0, 0, 0, 0.4))");
      filters.push("drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22))");
    } else if (finish === "matte") {
      filters.push("drop-shadow(0 12px 22px rgba(0, 0, 0, 0.25))");
      filters.push("drop-shadow(0 2px 5px rgba(0, 0, 0, 0.15))");
    } else if (finish === "holographic") {
      filters.push("drop-shadow(0 18px 36px rgba(99, 102, 241, 0.35))");
      filters.push("drop-shadow(0 4px 14px rgba(236, 72, 153, 0.25))");
    } else {
      filters.push("drop-shadow(0 16px 30px rgba(0, 0, 0, 0.3))");
      filters.push("drop-shadow(0 3px 8px rgba(0, 0, 0, 0.18))");
    }

    return {
      filter: filters.join(" "),
      transform: `scale(${zoomLevel})`,
      transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), filter 0.25s ease",
    };
  }, [showDieCut, finish, zoomLevel]);

  const currentMm = template.defaultMm || {
    width: 50,
    height: Math.round(50 / template.aspectRatio),
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden select-none relative">
      {/* ── Immersive Stage: يملأ كل المساحة المتاحة ── */}
      <div
        ref={stageContainerRef}
        onClick={handleStageClick}
        className="relative flex-1 min-h-0 w-full flex items-center justify-center p-6 overflow-hidden transition-all duration-300 fluent-specular"
        style={stageBackgroundStyle}
      >
        {/* Interaction Hint (Icon-Driven with Tooltip) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute top-3 start-3 z-10 flex items-center justify-center w-7 h-7 bg-card/85 backdrop-blur-md rounded-full border border-border/30 text-primary cursor-help shadow-2xs">
              <CursorClick className="w-3.5 h-3.5" weight="bold" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs font-cairo font-medium">
            انقر لتعديل أي عنصر أو نص مباشرة
          </TooltipContent>
        </Tooltip>

        {/* Real Dimensions & DPI Spec */}
        <div className="absolute top-3 end-3 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-card/75 backdrop-blur-md border border-border/30 text-[10px] font-mono text-muted-foreground/90 select-none pointer-events-none">
          <span>{currentMm.width}×{currentMm.height} مم</span>
          <span className="text-border/60">•</span>
          <span className="text-primary font-bold">300 DPI</span>
        </div>

        {/* Sticker with Physical Presence */}
        <div
          className="relative flex items-center justify-center group max-w-full max-h-full"
          style={stickerFilterStyle}
        >
          <div
            ref={svgHostRef}
            className="sticker-svg-interactive w-auto h-auto flex items-center justify-center [&>svg]:max-w-[min(40vw,440px)] [&>svg]:max-h-[min(46vh,410px)] [&>svg]:w-auto [&>svg]:h-auto transition-transform"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />

          {/* Glossy Sheen Overlay */}
          {finish === "glossy" && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-white/25 opacity-70 group-hover:opacity-90 transition-opacity" />
          )}

          {/* Holographic Iridescent Shimmer */}
          {finish === "holographic" && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/20 via-cyan-400/25 to-yellow-400/20 mix-blend-overlay opacity-80 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Floating In-Place Contextual Editor */}
        <StickerInlineEditor
          activeField={activeField}
          activeColor={activeColor}
          template={template}
          activeFieldValue={
            activeField
              ? params.fields[activeField.fieldId] ??
                template.fields.find((f) => f.id === activeField.fieldId)?.defaultValue ??
                ""
              : undefined
          }
          onClose={closeEditors}
          onChangeFieldValue={(id, val) => onChangeField?.(id, val)}
          onChangeColor={(role, color) => onChangeColor?.(role, color)}
          onResetField={onResetField}
        />

        {/* Bottom Dock: Environment Swatches (Icon/Dot-Driven) & Zoom */}
        <div
          role="toolbar"
          aria-label="خلفية المعاينة والتكبير"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 bg-card/90 backdrop-blur-md rounded-xl border border-border/50 shadow-fluent-8"
        >
          {MOCKUP_OPTIONS.map((opt) => {
            const isActive = mockupBg === opt.id;
            return (
              <Tooltip key={opt.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMockupBg(opt.id);
                    }}
                    aria-pressed={isActive}
                    aria-label={`خلفية: ${opt.label}`}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer",
                      isActive
                        ? "bg-background shadow-2xs border border-border/50 ring-1 ring-primary/40"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <span className={cn("w-3.5 h-3.5 rounded-full shrink-0", opt.dotClass)} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-cairo font-medium">
                  خلفية {opt.label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className="w-[1px] h-4 bg-border/40 mx-0.5" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            disabled={zoomLevel <= 0.5}
            aria-label="تصغير المعاينة"
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 cursor-pointer"
            title="تصغير"
          >
            <MagnifyingGlassMinus className="w-3.5 h-3.5" />
          </button>
          <span
            className="w-11 text-center text-[11px] font-mono font-bold text-foreground select-none"
            aria-live="polite"
          >
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            disabled={zoomLevel >= 2.5}
            aria-label="تكبير المعاينة"
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 cursor-pointer"
            title="تكبير"
          >
            <MagnifyingGlassPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomReset();
            }}
            className={cn(
              "h-7 px-1.5 text-[10px] font-semibold rounded-md cursor-pointer flex items-center justify-center transition-colors",
              zoomLevel !== 1
                ? "text-primary font-bold hover:bg-primary/10"
                : "text-muted-foreground/60"
            )}
            title="إعادة ضبط 100%"
          >
            1:1
          </button>
        </div>
      </div>
    </div>
  );
});

StickerPreview.displayName = "StickerPreview";
