import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { 
  Copy, 
  Trash2, 
  ArrowUpToLine, 
  ArrowDownToLine, 
  Eraser,
  Sparkles,
  Wand2,
  ImagePlus,
  Rows,
  Columns,
  LayoutGrid,
  Loader2,
  Scissors,
  Clipboard
} from "lucide-react";
import { openImageFileDialog } from "@/lib/file-dialog-utils";
import { SaveImageFromBase64 } from "../../../wailsjs/go/main/App";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { pasteFromClipboardOrStore } from "@/lib/clipboard-utils";
import type { ImageElement, CanvasSlot, CanvasElement } from "@/lib/store/types";

const CropDialog = lazy(() => import("./crop-dialog").then((m) => ({ default: m.CropDialog })));

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuTarget {
  id: string | null;
  type: "element" | "slot" | "canvas";
}

interface ContextMenuProps {
  position: ContextMenuPosition;
  target: ContextMenuTarget;
  onClose: () => void;
}

export function ContextMenu({ position, target, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const focusIndexRef = React.useRef(0);
  const {
    duplicateElement,
    duplicateElements,
    copySelectedElements,
    cutSelectedElements,
    pasteCopiedElements,
    clipboardElements,
    removeElement,
    bringToFront,
    sendToBack,
    updateSlot,
    updateElement,
    setSlotImage,
    pushHistory,
    slots,
    elements
  } = useEditorStore(useShallow((state) => ({
    duplicateElement: state.duplicateElement,
    duplicateElements: state.duplicateElements,
    copySelectedElements: state.copySelectedElements,
    cutSelectedElements: state.cutSelectedElements,
    pasteCopiedElements: state.pasteCopiedElements,
    clipboardElements: state.clipboardElements,
    removeElement: state.removeElement,
    bringToFront: state.bringToFront,
    sendToBack: state.sendToBack,
    updateSlot: state.updateSlot,
    updateElement: state.updateElement,
    setSlotImage: state.setSlotImage,
    pushHistory: state.pushHistory,
    slots: state.slots,
    elements: state.elements,
  })));

  const onUpdateSlot = (id: string, patch: Partial<CanvasSlot>) => {
    updateSlot(id, patch);
  };

  const onUpdateElement = (id: string, patch: Partial<CanvasElement>) => {
    updateElement(id, patch);
  };

  const { isRemovingBg, handleRemoveBg } = useBgRemoval(target.type === "slot" ? onUpdateSlot : onUpdateElement);
  const { isEnhancing, handleEnhance, remainingQuota } = useAiEnhance(target.type === "slot" ? onUpdateSlot : onUpdateElement);

  const [cropTarget, setCropTarget] = useState<{
    imageSrc: string;
    originalImageSrc?: string;
    onSave: (croppedB64: string, dims?: { width: number; height: number }) => void;
  } | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const menu = menuRef.current;
      if (!menu) return;
      const items = menu.querySelectorAll<HTMLElement>("[role='menuitem']");
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = (focusIndexRef.current + 1) % items.length;
        focusIndexRef.current = next;
        items[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (focusIndexRef.current - 1 + items.length) % items.length;
        focusIndexRef.current = prev;
        items[prev]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        focusIndexRef.current = 0;
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        const last = items.length - 1;
        focusIndexRef.current = last;
        items[last]?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const handleActionWithHistory = (action: () => void) => {
    action();
    pushHistory();
    onClose();
  };

  const [menuSize, setMenuSize] = React.useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (menuRef.current) {
      setMenuSize({
        w: menuRef.current.offsetWidth,
        h: menuRef.current.offsetHeight
      });
    }
    focusIndexRef.current = 0;
    // أعد القياس عندما يتغير محتوى القائمة أثناء فتحها (spinner ↔ نص) حتى لا تبقى المقاسات قديمة
  }, [target, position.x, position.y, isRemovingBg, isEnhancing]);

  const size = menuSize || { w: 190, h: 280 };

  let maxRight = window.innerWidth - 8;
  let maxBottom = window.innerHeight - 8;
  let minLeft = 8;
  let minTop = 8;

  const canvasArea = document.getElementById("canvas-area");
  if (canvasArea) {
    const rect = canvasArea.getBoundingClientRect();
    maxRight = Math.min(maxRight, rect.right);
    maxBottom = Math.min(maxBottom, rect.bottom);
    minLeft = Math.max(minLeft, rect.left);
    minTop = Math.max(minTop, rect.top);
  }

  let left = position.x;
  let top = position.y;
  let originX = "left";
  let originY = "top";

  if (left + size.w > maxRight) {
    left = position.x - size.w;
    originX = "right";
  }
  if (top + size.h > maxBottom) {
    top = position.y - size.h;
    originY = "bottom";
  }

  left = Math.max(minLeft, Math.min(left, maxRight - size.w));
  top = Math.max(minTop, Math.min(top, maxBottom - size.h));

  const portal = createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      aria-label="قائمة السياق الموحدة"
      className="fixed z-[9999] w-[190px] bg-card/95 backdrop-blur-2xl border border-border/60 shadow-[0_20px_50px_rgba(0,0,0,0.35)] rounded-2xl p-2 text-xs font-cairo overflow-hidden select-none animate-in fade-in-80 zoom-in-95 duration-150 outline-none space-y-1.5"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        transformOrigin: `${originY} ${originX}`,
        visibility: menuSize === null ? 'hidden' : 'visible'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 🔹 قائمة العناصر المتحركة على الكانفس */}
      {target.type === "element" && target.id && (() => {
        const el = elements.find((e) => e.id === target.id);
        const imgEl = el?.type === "image" ? (el as ImageElement) : null;

        return (
          <div className="space-y-1.5">
            {/* قسم الذكاء الاصطناعي إن كان عنصراً صورياً */}
            {imgEl?.imageSrc && (
              <>
                <div className="px-2 pt-0.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  معالجة الصور
                </div>
                <div className="space-y-0.5">
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2.5 py-1.5 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                    onClick={() => {
                      setCropTarget({
                        imageSrc: imgEl.imageSrc,
                        originalImageSrc: imgEl.originalImageSrc,
                        onSave: async (croppedB64, dims) => {
                          try {
                            const isWailsDesktop = typeof (window as any).go?.main?.App !== "undefined";
                            let finalPath = croppedB64;
                            if (isWailsDesktop && croppedB64.startsWith("data:image/")) {
                              try {
                                const localPath = await SaveImageFromBase64(croppedB64);
                                if (localPath) finalPath = localPath;
                              } catch (e) {
                                console.error("Failed to save cropped image locally:", e);
                              }
                            }

                            const img = new Image();
                            img.onload = () => {
                              const w = dims?.width || img.width;
                              const h = dims?.height || img.height;
                              const croppedAspect = w / h;
                              const state = useEditorStore.getState();
                              const canvasRatio = state.canvasWidth / state.canvasHeight;
                              const newHeight = (imgEl.width * canvasRatio) / croppedAspect;

                              updateElement(imgEl.id, {
                                imageSrc: finalPath,
                                height: newHeight,
                                originalImageSrc: imgEl.originalImageSrc || imgEl.imageSrc,
                              });

                              state.setLastEditedImage(finalPath);
                              state.setLastEditedImageAspect(croppedAspect);
                              state.pushHistory();
                            };
                            img.onerror = () => {
                              updateElement(imgEl.id, {
                                imageSrc: finalPath,
                                originalImageSrc: imgEl.originalImageSrc || imgEl.imageSrc,
                              });
                              pushHistory();
                            };
                            img.src = croppedB64;
                          } catch (err) {
                            console.error("Failed to crop image in context menu:", err);
                          }
                        }
                      });
                    }}
                  >
                    <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-150 shrink-0">
                      <Scissors className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-emerald-500 transition-colors">قص وتدوير الصورة</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    disabled={isRemovingBg}
                    className="group w-full text-right px-2.5 py-1.5 hover:bg-purple-500/10 hover:text-purple-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none disabled:opacity-50"
                    onClick={() => {
                      handleRemoveBg(imgEl);
                      onClose();
                    }}
                  >
                    <div className="p-1 rounded-md bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-150 shrink-0">
                      {isRemovingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-purple-500 transition-colors">عزل الخلفية (AI)</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    disabled={isEnhancing}
                    className="group w-full text-right px-2.5 py-1.5 hover:bg-amber-500/10 hover:text-amber-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none disabled:opacity-50"
                    onClick={() => {
                      handleEnhance(imgEl);
                      onClose();
                    }}
                  >
                    <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-150 shrink-0">
                      {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-amber-500 transition-colors">ترميم الوجه (AI)</span>
                  </button>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-1" role="separator" />
              </>
            )}

            {/* قسم التحكم والترتيب */}
            <div className="px-2 pt-0.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              التحكم والترتيب
            </div>
            <div className="space-y-0.5">
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-primary/10 hover:text-primary rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={() => handleAction(() => {
                  copySelectedElements([target.id!]);
                })}
              >
                <div className="p-1 rounded-md bg-muted/80 text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-150 shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-primary transition-colors">نسخ العنصر</span>
              </button>

              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-amber-500/10 hover:text-amber-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={() => handleAction(() => {
                  cutSelectedElements([target.id!]);
                })}
              >
                <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-150 shrink-0">
                  <Scissors className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-amber-500 transition-colors">قص العنصر</span>
              </button>

              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={() => handleAction(() => {
                  pasteFromClipboardOrStore();
                })}
              >
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-150 shrink-0">
                  <Clipboard className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-emerald-500 transition-colors">لصق العنصر</span>
              </button>

              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-primary/10 hover:text-primary rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={() => handleAction(() => {
                  const { selectedIds } = useEditorStore.getState();
                  if (selectedIds.length > 1) {
                    duplicateElements(selectedIds);
                  } else {
                    duplicateElement(target.id!);
                  }
                })}
              >
                <div className="p-1 rounded-md bg-muted/80 text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-150 shrink-0">
                  <Copy className="w-3.5 h-3.5 opacity-60" />
                </div>
                <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-primary transition-colors">تكرار العنصر</span>
              </button>
              
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-primary/10 hover:text-primary rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={() => handleAction(() => bringToFront(target.id!))}
              >
                <div className="p-1 rounded-md bg-muted/80 text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-150 shrink-0">
                  <ArrowUpToLine className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-primary transition-colors">إحضار للأمام</span>
              </button>
              
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-primary/10 hover:text-primary rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={() => handleAction(() => sendToBack(target.id!))}
              >
                <div className="p-1 rounded-md bg-muted/80 text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-150 shrink-0">
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-primary transition-colors">إرسال للخلف</span>
              </button>

              <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-1" role="separator" />
              
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-destructive/10 text-destructive rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={() => handleAction(() => {
                  const { selectedIds, removeElements } = useEditorStore.getState();
                  const removableIds = selectedIds.filter((id) => {
                    const found = elements.find((e) => e.id === id);
                    return found && !found.locked;
                  });
                  if (removableIds.length > 1) {
                    removeElements(removableIds);
                  } else if (removableIds.length === 1) {
                    removeElement(removableIds[0]);
                  } else if (!el?.locked) {
                    removeElement(target.id!);
                  }
                })}
              >
                <div className="p-1 rounded-md bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white transition-colors duration-150 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <span className="font-extrabold text-[11.5px] leading-tight">حذف العنصر</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* 🔹 قائمة خلايا الكولاج */}
      {target.type === "slot" && target.id && (() => {
        const state = useEditorStore.getState();
        const slot = state.slots?.find((s) => s.id === target.id);

        return (
          <div className="space-y-1.5">
            {/* قسم إدارة الصورة والذكاء الاصطناعي */}
            <div className="px-2 pt-0.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              الصورة والذكاء الاصطناعي
            </div>
            <div className="space-y-0.5">
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-blue-500/10 hover:text-blue-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={async () => {
                  const [b64] = await openImageFileDialog(false);
                  if (b64) {
                    let srcToUse = b64;
                    if (b64.startsWith("data:image/")) {
                      try {
                        const localPath = await SaveImageFromBase64(b64);
                        if (localPath) srcToUse = localPath;
                      } catch {
                        // Fallback to original base64 if local save fails
                      }
                    }
                    setSlotImage(target.id!, srcToUse);
                    onClose();
                  }
                }}
              >
                <div className="p-1 rounded-md bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-150 shrink-0">
                  <ImagePlus className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-blue-500 transition-colors">استبدال الصورة</span>
              </button>

              {slot?.imageSrc && (
                <>
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2.5 py-1.5 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                    onClick={() => {
                      if (!slot.imageSrc) return;
                      setCropTarget({
                        imageSrc: slot.imageSrc,
                        originalImageSrc: slot.originalImageSrc,
                        onSave: async (croppedB64) => {
                          try {
                            const isWailsDesktop = typeof (window as any).go?.main?.App !== "undefined";
                            let finalPath = croppedB64;
                            if (isWailsDesktop && croppedB64.startsWith("data:image/")) {
                              try {
                                const localPath = await SaveImageFromBase64(croppedB64);
                                if (localPath) finalPath = localPath;
                              } catch (e) {
                                console.error("Failed to save cropped slot image:", e);
                              }
                            }

                            updateSlot(slot.id, {
                              imageSrc: finalPath,
                              dragX: 0,
                              dragY: 0,
                              zoom: 1,
                              originalImageSrc: slot.originalImageSrc || slot.imageSrc,
                            });
                            pushHistory();
                          } catch (err) {
                            console.error("Failed to save cropped slot image:", err);
                          }
                        }
                      });
                    }}
                  >
                    <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-150 shrink-0">
                      <Scissors className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-emerald-500 transition-colors">قص وتدوير الصورة</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    disabled={isRemovingBg}
                    className="group w-full text-right px-2.5 py-1.5 hover:bg-purple-500/10 hover:text-purple-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none disabled:opacity-50"
                    onClick={() => {
                      if (slot) {
                        handleRemoveBg(slot);
                        onClose();
                      }
                    }}
                  >
                    <div className="p-1 rounded-md bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-150 shrink-0">
                      {isRemovingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-purple-500 transition-colors">عزل الخلفية (AI)</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    disabled={isEnhancing}
                    className="group w-full text-right px-2.5 py-1.5 hover:bg-amber-500/10 hover:text-amber-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none disabled:opacity-50"
                    onClick={() => {
                      if (slot) {
                        handleEnhance(slot);
                        onClose();
                      }
                    }}
                  >
                    <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-150 shrink-0">
                      {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-amber-500 transition-colors">ترميم الوجه (AI)</span>
                  </button>
                </>
              )}

              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={() => handleActionWithHistory(() => updateSlot(target.id!, { imageSrc: undefined, originalImageSrc: undefined }))}
              >
                <div className="p-1 rounded-md bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-150 shrink-0">
                  <Eraser className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-rose-500 transition-colors">تفريغ الخلية</span>
              </button>
            </div>

            {/* قسم التعبئة والتكرار الخطي */}
            {slot?.imageSrc && (
              <>
                <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-1" />

                <div className="px-2 pt-0.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  التعبئة والتكرار
                </div>
                <div className="space-y-0.5">
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2.5 py-1.5 hover:bg-primary/10 hover:text-primary rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                    onClick={() => handleActionWithHistory(() => state.fillAllSlots(slot.imageSrc!, target.id!))}
                  >
                    <div className="p-1 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-150 shrink-0">
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-primary transition-colors">تعبئة الورقة بالكامل</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2.5 py-1.5 hover:bg-blue-500/10 hover:text-blue-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                    onClick={() => handleActionWithHistory(() => state.fillRowSlots(target.id!, slot.imageSrc!))}
                  >
                    <div className="p-1 rounded-md bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-150 shrink-0">
                      <Rows className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-blue-500 transition-colors">تعبئة الصف الحالي</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2.5 py-1.5 hover:bg-indigo-500/10 hover:text-indigo-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                    onClick={() => handleActionWithHistory(() => state.fillColumnSlots(target.id!, slot.imageSrc!))}
                  >
                    <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-150 shrink-0">
                      <Columns className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-indigo-500 transition-colors">تعبئة العمود الحالي</span>
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* 🔹 قائمة الكانفس عند الضغط على المساحة الفارغة */}
      {target.type === "canvas" && (() => {
        const hasCopied = clipboardElements && clipboardElements.length > 0;

        return (
          <div className="space-y-1.5">
            <div className="px-2 pt-0.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              إجراءات الصفحة
            </div>
            <div className="space-y-0.5">
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2.5 py-1.5 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-xl flex items-center gap-2.5 transition-all duration-150 cursor-pointer outline-none"
                onClick={() => handleAction(() => {
                  pasteFromClipboardOrStore();
                })}
              >
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-150 shrink-0">
                  <Clipboard className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[11.5px] leading-tight text-foreground group-hover:text-emerald-500 transition-colors">
                  لصق المحتوى {hasCopied ? `(${clipboardElements.length})` : ""}
                </span>
              </button>
            </div>
          </div>
        );
      })()}

    </div>,
    document.body
  );

  return (
    <>
      {!cropTarget && portal}
      {cropTarget && (
        <Suspense fallback={null}>
          <CropDialog
            open={!!cropTarget}
            onOpenChange={(op) => {
              if (!op) {
                setCropTarget(null);
                onClose();
              }
            }}
            imageSrc={cropTarget.imageSrc}
            originalImageSrc={cropTarget.originalImageSrc}
            onCropSave={(croppedB64, dims) => {
              cropTarget.onSave(croppedB64, dims);
              setCropTarget(null);
              onClose();
            }}
          />
        </Suspense>
      )}
    </>
  );
}
