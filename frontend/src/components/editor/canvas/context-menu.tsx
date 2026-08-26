import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/lib/editor-store";
import { wailsIsDesktop } from "@/lib/wails-env";
import { useShallow } from "zustand/react/shallow";
import { Loader2 } from "lucide-react";
import {
  Copy20Regular,
  Delete20Regular,
  ArrowUp20Regular,
  ArrowDown20Regular,
  Broom20Filled,
  Sparkle20Filled,
  Wand20Filled,
  ImageAdd20Filled,
  Cut20Filled,
  ClipboardPaste20Regular,
  ArrowRotateClockwise20Filled,
  FlipHorizontal20Filled,
  Target20Filled,
  Grid20Filled,
  SplitVertical20Filled,
  SplitHorizontal20Filled,
  Layer20Filled,
} from "@fluentui/react-icons";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { pasteFromClipboardOrStore } from "@/lib/io/clipboard-utils";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";
import type { ImageElement, CanvasSlot, CanvasElement } from "@/lib/store/types";

const CropDialog = lazy(() => import("../dialogs/crop-dialog").then((m) => ({ default: m.CropDialog })));

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
      className="fixed z-[9999] w-[200px] bg-popover backdrop-blur-2xl border border-border rounded-xl p-1 text-xs font-cairo overflow-hidden select-none animate-in fade-in-80 zoom-in-95 duration-150 outline-none space-y-1 shadow-fluent-28 fluent-specular"
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
          <div className="space-y-1">
            {/* قسم الذكاء الاصطناعي إن كان عنصراً صورياً */}
            {imgEl?.imageSrc && (
              <>
                <div className="px-2 pt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  معالجة الصور
                </div>
                <div className="space-y-0.5">
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                    onClick={() => {
                      setCropTarget({
                        imageSrc: imgEl.imageSrc,
                        originalImageSrc: imgEl.originalImageSrc,
                        onSave: async (croppedB64, dims) => {
                          try {
                            const isWailsDesktop = wailsIsDesktop();
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
                    <Cut20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    <span className="truncate">قص وتدوير الصورة</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    disabled={isRemovingBg}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background text-xs font-semibold disabled:opacity-40"
                    onClick={() => {
                      handleRemoveBg(imgEl);
                      onClose();
                    }}
                  >
                    {isRemovingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" /> : <Sparkle20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />}
                    <span className="truncate">{isRemovingBg ? "جاري العزل ..." : "عزل الخلفية (AI)"}</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    disabled={isEnhancing}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background text-xs font-semibold disabled:opacity-40"
                    onClick={() => {
                      handleEnhance(imgEl);
                      onClose();
                    }}
                  >
                    {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" /> : <Wand20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />}
                    <span className="truncate">{isEnhancing ? "جاري المعالجة ..." : "ترميم الوجه (AI)"}</span>
                  </button>
                </div>
                <div className="h-px bg-border/40 my-1" role="separator" />
              </>
            )}

            {/* قسم التحكم والترتيب */}
            <div className="px-2 pt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              التحكم والترتيب
            </div>
            <div className="space-y-0.5">
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={() => handleAction(() => {
                  copySelectedElements([target.id!]);
                })}
              >
                <Copy20Regular className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="truncate">نسخ العنصر</span>
              </button>

              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={() => handleAction(() => {
                  cutSelectedElements([target.id!]);
                })}
              >
                <Cut20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="truncate">قص العنصر</span>
              </button>

              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={() => handleAction(() => {
                  pasteFromClipboardOrStore();
                })}
              >
                <ClipboardPaste20Regular className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="truncate">لصق العنصر</span>
              </button>

              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={() => handleAction(() => {
                  const { selectedIds } = useEditorStore.getState();
                  if (selectedIds.length > 1) {
                    duplicateElements(selectedIds);
                  } else {
                    duplicateElement(target.id!);
                  }
                })}
              >
                <Copy20Regular className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="truncate">تكرار العنصر</span>
              </button>
              
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={() => handleAction(() => bringToFront(target.id!))}
              >
                <ArrowUp20Regular className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="truncate">إحضار للأمام</span>
              </button>
              
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={() => handleAction(() => sendToBack(target.id!))}
              >
                <ArrowDown20Regular className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="truncate">إرسال للخلف</span>
              </button>

              <div className="h-px bg-border/40 my-1" role="separator" />
              
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
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
                <Delete20Regular className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="truncate font-bold">حذف العنصر</span>
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
          <div className="space-y-1">
            {/* قسم إدارة الصورة والذكاء الاصطناعي */}
            <div className="px-2 pt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              الصورة والذكاء الاصطناعي
            </div>
            <div className="space-y-0.5">
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={async () => {
                  const [b64] = await openImageFileDialog(false);
                  if (b64) {
                    let srcToUse = b64;
                    if (b64.startsWith("data:image/")) {
                      try {
                        const localPath = await SaveImageFromBase64(b64);
                        if (localPath) srcToUse = localPath;
                      } catch {
                        // Fallback
                      }
                    }
                    setSlotImage(target.id!, srcToUse);
                    onClose();
                  }
                }}
              >
                <ImageAdd20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="truncate">استبدال الصورة</span>
              </button>

              {slot?.imageSrc && (
                <>
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                    onClick={() => {
                      if (!slot.imageSrc) return;
                      setCropTarget({
                        imageSrc: slot.imageSrc,
                        originalImageSrc: slot.originalImageSrc,
                        onSave: async (croppedB64) => {
                          try {
                            const isWailsDesktop = wailsIsDesktop();
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
                    <Cut20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    <span className="truncate">قص وتدوير الصورة</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    disabled={isRemovingBg}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background text-xs font-semibold disabled:opacity-40"
                    onClick={() => {
                      if (slot) {
                        handleRemoveBg(slot);
                        onClose();
                      }
                    }}
                  >
                    {isRemovingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" /> : <Sparkle20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />}
                    <span className="truncate">{isRemovingBg ? "جاري العزل ..." : "عزل الخلفية (AI)"}</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    disabled={isEnhancing}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background text-xs font-semibold disabled:opacity-40"
                    onClick={() => {
                      if (slot) {
                        handleEnhance(slot);
                        onClose();
                      }
                    }}
                  >
                    {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" /> : <Wand20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />}
                    <span className="truncate">{isEnhancing ? "جاري المعالجة ..." : "ترميم الوجه (AI)"}</span>
                  </button>
                </>
              )}

              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={() => handleActionWithHistory(() => updateSlot(target.id!, { imageSrc: undefined, originalImageSrc: undefined }))}
              >
                <Broom20Filled className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="truncate">تفريغ الخلية</span>
              </button>
            </div>

            {/* قسم التحويل والمحاذاة */}
            {slot?.imageSrc && (
              <>
                <div className="h-px bg-border/40 my-1" />
                <div className="px-2 pt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  التحويل والمحاذاة
                </div>
                <div className="space-y-0.5">
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                    onClick={() => handleActionWithHistory(() => updateSlot(target.id!, { dragX: 0, dragY: 0, zoom: 1 }))}
                  >
                    <Target20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    <span className="truncate">توسيط الصورة</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                    onClick={() => handleActionWithHistory(() => updateSlot(target.id!, { rotation: (((slot.rotation ?? 0) + 90) % 360) }))}
                  >
                    <ArrowRotateClockwise20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    <span className="truncate">تدوير 90° ({slot.rotation ?? 0}°)</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                    onClick={() => handleActionWithHistory(() => updateSlot(target.id!, { flipX: !slot.flipX }))}
                  >
                    <FlipHorizontal20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    <span className="truncate">قلب أفقي</span>
                  </button>
                </div>
              </>
            )}

            {/* قسم التعبئة والتكرار الخطي */}
            {slot?.imageSrc && (
              <>
                <div className="h-px bg-border/40 my-1" />

                <div className="px-2 pt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  التعبئة والتكرار
                </div>
                <div className="space-y-0.5">
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                    onClick={() => handleActionWithHistory(() => state.fillAllSlots(slot.imageSrc!, target.id!))}
                  >
                    <Grid20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    <span className="truncate">تعبئة الورقة بالكامل</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                    onClick={() => handleActionWithHistory(() => state.fillEmptySlots(slot.imageSrc!, target.id!))}
                  >
                    <Sparkle20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    <span className="truncate">تعبئة الخانات الفارغة فقط</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                    onClick={() => handleActionWithHistory(() => state.fillRowSlots(target.id!, slot.imageSrc!))}
                  >
                    <SplitHorizontal20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    <span className="truncate">تعبئة الصف الحالي</span>
                  </button>

                  <button
                    role="menuitem"
                    tabIndex={-1}
                    className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                    onClick={() => handleActionWithHistory(() => state.fillColumnSlots(target.id!, slot.imageSrc!))}
                  >
                    <SplitVertical20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    <span className="truncate">تعبئة العمود الحالي</span>
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* 🔹 قائمة الكانفس عند الضغط على المساحة الفارغة */}
      {target.type === "canvas" && (() => {
        const state = useEditorStore.getState();
        const hasCopied = clipboardElements && clipboardElements.length > 0;
        const hasElements = state.mode === "single" && state.elements.length > 0;

        return (
          <div className="space-y-1">
            <div className="px-2 pt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              إجراءات الصفحة
            </div>
            <div className="space-y-0.5">
              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={() => handleAction(async () => {
                  const [b64] = await openImageFileDialog(false);
                  if (b64) {
                    let srcToUse = b64;
                    if (b64.startsWith("data:image/")) {
                      try {
                        const localPath = await SaveImageFromBase64(b64);
                        if (localPath) srcToUse = localPath;
                      } catch {
                        // Fallback
                      }
                    }
                    const aspect = await resolveImageAspectRatio(srcToUse);
                    state.addImageElement(srcToUse, aspect);
                  }
                })}
              >
                <ImageAdd20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="truncate">إضافة صورة جديدة</span>
              </button>

              <button
                role="menuitem"
                tabIndex={-1}
                className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                onClick={() => handleAction(() => {
                  pasteFromClipboardOrStore();
                })}
              >
                <ClipboardPaste20Regular className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                <span className="truncate">
                  لصق المحتوى {hasCopied ? `(${clipboardElements.length})` : ""}
                </span>
              </button>

              {hasElements && (
                <button
                  role="menuitem"
                  tabIndex={-1}
                  className="group w-full text-right px-2 py-1.5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-md flex items-center gap-2 transition-all duration-150 cursor-pointer outline-none text-xs font-semibold"
                  onClick={() => handleAction(() => {
                    state.selectAllElements();
                  })}
                >
                  <Layer20Filled className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                  <span className="truncate">تحديد كافة العناصر (Ctrl+A)</span>
                </button>
              )}
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
