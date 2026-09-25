import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore, CanvasElement } from '@/lib/editor-store';
import { Spinner } from '@/components/ui/huge-icon';
import { OpenFile, SaveImageFromBase64 } from '../../../../wailsjs/go/main/App';
import { wailsIsDesktop } from '@/lib/wails-env';
import { SnapGuide } from '@/lib/canvas/snap-utils';
import { KonvaCanvas } from '../konva/konva-canvas';
import { useShallow } from 'zustand/react/shallow';
import { ContextMenuPosition, ContextMenuTarget } from './context-menu';
import { ViewportFixedRulersHeader, ViewportFixedRulersSidebar } from './canvas-rulers';
import { TextEditingOverlay } from './text-editing-overlay';
import { CanvasContextMenu } from './canvas-context-menu';
import { CanvasQuickBar } from './canvas-quick-bar';
import { checkerColor, guideCenter, guideEdge } from '@/lib/canvas/canvas-colors';
import { computeCanvasDisplay } from '@/lib/canvas/fit';
import { publishCanvasFitStatus } from '@/lib/ui/canvas-fit-status';
import { useCanvasViewport } from './use-canvas-viewport';
import { useUserGuides } from './use-user-guides';
import { useImageDrop } from './use-image-drop';
import { useRulerMetricsPreview } from './use-ruler-metrics';
import { CanvasBleedGuides } from './canvas-bleed-guides';
import { formatGuideMeasurement } from '@/lib/canvas/units';

export interface EditorCanvasProps {
  printMode?: boolean;
  onOpenFile?: () => void;
  onOpenTemplates?: () => void;
}

export const EditorCanvas = React.memo(
  React.forwardRef<HTMLDivElement, EditorCanvasProps>(function EditorCanvas(
    { printMode = false, onOpenFile, onOpenTemplates },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    const lastDblClickRef = useRef<number>(0);
    const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

    const [contextMenu, setContextMenu] = useState<{
      position: ContextMenuPosition;
      target: ContextMenuTarget;
    } | null>(null);

    // وحدة المساطر والخطوط الإرشادية من الـ Store
    const {
      rulerUnit,
      setRulerUnit,
      userGuides,
      showUserGuides,
      lockUserGuides,
      clearUserGuides,
      setShowUserGuides,
      setLockUserGuides,
    } = useEditorStore(
      useShallow((state) => ({
        rulerUnit: state.rulerUnit,
        setRulerUnit: state.setRulerUnit,
        userGuides: state.userGuides,
        showUserGuides: state.showUserGuides,
        lockUserGuides: state.lockUserGuides,
        clearUserGuides: state.clearUserGuides,
        setShowUserGuides: state.setShowUserGuides,
        setLockUserGuides: state.setLockUserGuides,
      })),
    );

    // 🛡️ تقسيم الاشتراك: الدوال (هويات ثابتة أبداً) منفصلة عن الحالة
    const { selectElement, setEditingTextId, updateElement, pushHistory, setCanvasZoom } =
      useEditorStore(
        useShallow((state) => ({
          selectElement: state.selectElement,
          setEditingTextId: state.setEditingTextId,
          updateElement: state.updateElement,
          pushHistory: state.pushHistory,
          setCanvasZoom: state.setCanvasZoom,
        })),
      );

    // 🛡️ تقسيم الاشتراكات: كل حقل في اشتراك مستقل حتى لا يُعاد رسم المكون
    // بسبب تغيير حقل واحد (مثل canvasZoom عند الزوم) — يقرأ من الذاكرة مباشرة فيعيد
    // الحسابات فقط، ولا يُلوّث باقي الـ sub-tree
    const mode = useEditorStore((s) => s.mode);
    const elements = useEditorStore((s) => s.elements);
    const editingTextId = useEditorStore((s) => s.editingTextId);
    const canvasWidth = useEditorStore((s) => s.canvasWidth);
    const canvasHeight = useEditorStore((s) => s.canvasHeight);
    const backgroundColor = useEditorStore((s) => s.backgroundColor);
    const canvasZoom = useEditorStore((s) => s.canvasZoom);
    const showRuler = useEditorStore((s) => s.showRuler);
    const template = useEditorStore((s) => s.template);
    const printSettings = useEditorStore((s) => s.printSettings);
    const selectedIds = useEditorStore((s) => s.selectedIds);
    const collageMargin = useEditorStore((s) => s.collageMargin);
    const slots = useEditorStore((s) => s.slots);
    const canvasFitMode = useEditorStore((s) => s.canvasFitMode);

    // 🧭 منطق الزوم والتحريك (كان مضمّناً في هذا الملف)
    useCanvasViewport(containerRef, innerRef);

    // حجم العرض التقديري لحساب أبعاد الورقة (يُستخدم أيضاً كتبعية لقياسات المساطر)
    const aspect = canvasWidth / canvasHeight;

    // 🧭 قياسات المساطر وحجم الحاوية ومؤشر الفأرة (كانت مضمّنة في هذا الملف)
    const { rulerMetrics, containerSize, handleWorkspaceMouseMove, handleWorkspaceMouseLeave } =
      useRulerMetricsPreview(
        containerRef,
        innerRef,
        { showRuler, printMode },
        { canvasZoom, mode, aspect },
      );

    // 🧭 أبعاد الورقة المعروضة — منطق الملاءمة كله في lib/canvas/fit.ts
    // (كان الحساب مضمّناً هنا ويلائم على الارتفاع دائماً فيُهدر ~60% من عرض
    //  منطقة العمل على ورقة رأسية؛ وصار الوضع اختيارياً: كامل/عرض/تلقائي)
    const {
      displayW,
      displayH,
      resolved: resolvedFitMode,
      leftoverRatio,
    } = computeCanvasDisplay({
      containerW: containerSize.w,
      containerH: containerSize.h,
      aspect,
      zoom: canvasZoom,
      fitMode: canvasFitMode,
      // مقاس الورقة الحقيقي بالبكسل — لازم لوضع «الحجم الفعلي 1:1»
      canvasW: canvasWidth,
      canvasH: canvasHeight,
    });

    // يُنشر الوضع الفعّل ونسبة الفراغ لشريط العرض في التذييل (خارج شجرة الكانفاس)
    useEffect(() => {
      publishCanvasFitStatus({ resolved: resolvedFitMode, leftoverRatio });
    }, [resolvedFitMode, leftoverRatio]);

    // 🧭 الخطوط الإرشادية (كانت مضمّنة في هذا الملف)
    const { dragGuideState, setDragGuideState, handleStartDragHGuide, handleStartDragVGuide } =
      useUserGuides(innerRef, displayW, displayH, printMode, elements);

    // 🧭 منطق إسقاط الصور (كان مضمّناً في هذا الملف)
    const { isLoading, setIsLoading, handleDragOver, handleDrop } = useImageDrop(innerRef);

    const widthMM = useMemo(() => {
      if (template) return template.widthMM;
      return (canvasWidth / (printSettings?.dpi || 300)) * 25.4;
    }, [template, canvasWidth, printSettings]);

    const heightMM = useMemo(() => {
      if (template) return template.heightMM;
      return (canvasHeight / (printSettings?.dpi || 300)) * 25.4;
    }, [template, canvasHeight, printSettings]);

    const marginPxX = useMemo(() => {
      if (
        mode === 'collage' &&
        typeof collageMargin === 'number' &&
        collageMargin > 0 &&
        canvasWidth > 0
      ) {
        return (collageMargin / canvasWidth) * displayW;
      }
      if (printSettings?.marginMM && widthMM > 0) {
        return (printSettings.marginMM / widthMM) * displayW;
      }
      return 0;
    }, [mode, collageMargin, canvasWidth, displayW, printSettings?.marginMM, widthMM]);

    const marginPxY = useMemo(() => {
      if (
        mode === 'collage' &&
        typeof collageMargin === 'number' &&
        collageMargin > 0 &&
        canvasHeight > 0
      ) {
        return (collageMargin / canvasHeight) * displayH;
      }
      if (printSettings?.marginMM && heightMM > 0) {
        return (printSettings.marginMM / heightMM) * displayH;
      }
      return 0;
    }, [mode, collageMargin, canvasHeight, displayH, printSettings?.marginMM, heightMM]);

    const handleDoubleClick = useCallback(
      async (el: CanvasElement) => {
        if (printMode || isLoading) return;
        // العنصر المقفل لا يُحرَّر بالنقر المزدوج — السحب والـ Transformer يحترمان القفل أيضاً
        if (el.locked) return;
        if (el.type === 'image') {
          try {
            setIsLoading(true);
            const b64 = await OpenFile();
            if (b64) {
              const isWailsDesktop = wailsIsDesktop();
              let srcToUse = b64;
              if (isWailsDesktop && b64.startsWith('data:image/')) {
                try {
                  const localPath = await SaveImageFromBase64(b64);
                  if (localPath) srcToUse = localPath;
                } catch (e) {
                  console.error('Failed to save image locally:', e);
                }
              }
              updateElement(el.id, { imageSrc: srcToUse });
              pushHistory();
            }
          } catch (err) {
            console.error('Open file error:', err);
          } finally {
            setIsLoading(false);
          }
        } else if (el.type === 'text') {
          setEditingTextId(el.id);
        }
      },
      [printMode, isLoading, updateElement, pushHistory, setEditingTextId, setIsLoading],
    );

    const handleSlotClick = useCallback(
      (slotId: string) => {
        if (printMode) return;
        selectElement(slotId);
      },
      [printMode, selectElement],
    );

    const handleSlotDblClick = useCallback(
      async (slotId: string) => {
        if (printMode || isLoading) return;
        const now = Date.now();
        if (now - lastDblClickRef.current < 200) return;
        lastDblClickRef.current = now;
        try {
          setIsLoading(true);
          const b64 = await OpenFile();
          if (b64) {
            const isWailsDesktop = wailsIsDesktop();
            let srcToUse = b64;
            if (isWailsDesktop && b64.startsWith('data:image/')) {
              try {
                const localPath = await SaveImageFromBase64(b64);
                if (localPath) srcToUse = localPath;
              } catch (e) {
                console.error('Failed to save image locally:', e);
              }
            }
            useEditorStore.getState().setSlotImage(slotId, srcToUse);
          }
        } catch (err) {
          console.error('Open file error:', err);
        } finally {
          setIsLoading(false);
        }
      },
      [printMode, isLoading, setIsLoading],
    );

    const handleCanvasContextMenu = useCallback(
      (e: KonvaEventObject<MouseEvent>) => {
        if (printMode) return;
        const evt = e.evt;
        if (!evt) return;

        const x = evt.clientX;
        const y = evt.clientY;

        let targetType: 'element' | 'slot' | 'canvas' = 'canvas';
        let targetId: string | null = null;

        const node = e.target;
        const stage = node.getStage();
        const isBackground = node === stage || node.hasName('bg-rect');

        if (!isBackground) {
          if (mode === 'single') {
            const elNode =
              typeof node.findAncestor === 'function'
                ? node.findAncestor((n: Konva.Node) => !!n.id(), true)
                : null;
            const id = elNode?.id() || node.id() || (node.attrs as { id?: string } | undefined)?.id;
            if (id) {
              targetType = 'element';
              targetId = id;
              if (!selectedIds.includes(id)) {
                selectElement(id);
              }
            }
          } else if (mode === 'collage') {
            const parentGroup =
              typeof node.findAncestor === 'function'
                ? node.findAncestor((n: Konva.Node) => !!n.id() && n.id().startsWith('slot-'), true)
                : null;
            if (parentGroup) {
              targetType = 'slot';
              targetId = parentGroup.id().replace('slot-', '');
              selectElement(targetId);
            }
          }
        }

        setContextMenu({
          position: { x, y },
          target: { type: targetType, id: targetId },
        });
      },
      [printMode, mode, selectedIds, selectElement],
    );

    const sortedElements = useMemo(
      () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
      [elements],
    );

    const canvasArea = (
      <div
        className="relative shrink-0"
        style={{
          width: displayW,
          height: displayH,
        }}
      >
        <div
          ref={innerRef}
          id="canvas-area"
          data-fit-mode={resolvedFitMode}
          className="relative w-full h-full rounded-md overflow-hidden border border-black/10 dark:border-black/50 dark:ring-1 dark:ring-white/12 transition-shadow duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.85),0_4px_16px_rgba(0,0,0,0.6)] fluent-specular"
          style={{
            width: displayW,
            height: displayH,
            backgroundColor,
            backgroundImage:
              backgroundColor === 'transparent'
                ? `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)`
                : undefined,
            backgroundSize: backgroundColor === 'transparent' ? '20px 20px' : undefined,
            backgroundPosition:
              backgroundColor === 'transparent' ? '0 0, 0 10px, 10px -10px, -10px 0px' : undefined,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) selectElement(null);
          }}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              selectElement(null);
            }
          }}
          role="presentation"
        >
          {isLoading && (
            <div className="absolute inset-0 z-(--z-canvas-overlay) flex flex-col items-center justify-center fluent-smoke-backdrop rounded-md gap-2">
              <Spinner className="w-8 h-8 text-primary" size={32} />
              <span className="text-xs font-bold text-white font-cairo">جاري تجهيز الصورة ...</span>
            </div>
          )}

          {(mode === 'collage' || mode === 'single') && (
            <KonvaCanvas
              displayW={displayW}
              displayH={displayH}
              sortedElements={sortedElements}
              handleDoubleClick={handleDoubleClick}
              setActiveGuides={setActiveGuides}
              handleSlotClick={handleSlotClick}
              handleSlotDblClick={handleSlotDblClick}
              onContextMenu={handleCanvasContextMenu}
            />
          )}

          <CanvasContextMenu
            contextMenu={contextMenu}
            printMode={printMode}
            onClose={() => setContextMenu(null)}
          />

          {/* الشريط السريع الموحد العائم فوق العنصر/الخلية المحددة */}
          <CanvasQuickBar printMode={printMode} isContextMenuOpen={contextMenu !== null} />

          {/* 🧭 خطوط المستخدم الإرشادية التفاعلية (User Guidelines) */}
          {!printMode &&
            showUserGuides &&
            userGuides.map((guide) => {
              const isH = guide.type === 'h';
              const isCurrentlyDragging = dragGuideState?.guideId === guide.id;
              if (isCurrentlyDragging) return null;

              return (
                <div
                  key={guide.id}
                  title={
                    lockUserGuides
                      ? 'خط إرشادي مقفل (انقر لفتح القفل من قائمة المسطرة)'
                      : 'خط إرشادي: اسحب للتحريك أو انقر مرتين للحذف'
                  }
                  role="separator"
                  aria-orientation={isH ? 'horizontal' : 'vertical'}
                  onPointerDown={(e) => {
                    if (lockUserGuides) return;
                    e.stopPropagation();
                    setDragGuideState({
                      type: guide.type,
                      pos: guide.pos,
                      guideId: guide.id,
                    });
                  }}
                  onDoubleClick={(e) => {
                    if (lockUserGuides) return;
                    e.stopPropagation();
                    useEditorStore.getState().removeUserGuide(guide.id);
                  }}
                  className={`absolute z-(--z-canvas-overlay) group transition-colors select-none ${
                    lockUserGuides
                      ? 'cursor-default'
                      : isH
                        ? 'left-0 right-0 h-4 -mt-2 cursor-ns-resize flex items-center'
                        : 'top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex justify-center'
                  }`}
                  style={{
                    [isH ? 'top' : 'left']: `${guide.pos * 100}%`,
                    ...(lockUserGuides &&
                      (isH
                        ? {
                            left: 0,
                            right: 0,
                            height: '16px',
                            marginTop: '-8px',
                            display: 'flex',
                            alignItems: 'center',
                          }
                        : {
                            top: 0,
                            bottom: 0,
                            width: '16px',
                            marginLeft: '-8px',
                            display: 'flex',
                            justifyContent: 'center',
                          })),
                  }}
                >
                  <div
                    className={`transition-all ${
                      lockUserGuides ? 'bg-amber-500/70' : 'bg-primary'
                    } ${
                      isH
                        ? 'w-full h-[1px] group-hover:h-[2px]'
                        : 'h-full w-[1px] group-hover:w-[2px]'
                    }`}
                  />
                  {/* شارة القياس عند التحويم */}
                  <div
                    className={`absolute hidden group-hover:flex items-center px-1.5 py-0.5 rounded-md ${
                      lockUserGuides ? 'bg-amber-600' : 'bg-primary'
                    } text-white font-mono text-micro font-bold shadow-fluent-8 z-(--z-canvas-guides) pointer-events-none ${
                      isH ? 'left-3 -top-5' : 'top-3 left-2'
                    }`}
                  >
                    {formatGuideMeasurement(
                      guide.pos,
                      isH,
                      rulerUnit,
                      widthMM,
                      heightMM,
                      canvasWidth,
                      canvasHeight,
                    )}
                    {lockUserGuides && ' (مقفلة)'}
                  </div>
                </div>
              );
            })}

          {/* 🧭 خطوط المحاذاة الذكية أثناء التحريك (Smart Snap Alignment Guides) */}
          {!printMode &&
            activeGuides.map((guide, idx) => {
              const isCenter = Math.abs(guide.coord - 0.5) < 0.005;
              const color = isCenter ? guideCenter() : guideEdge();
              return (
                <div
                  key={idx}
                  className="absolute pointer-events-none z-(--z-canvas-guides) transition-opacity duration-75"
                  style={{
                    left: guide.type === 'v' ? `${guide.coord * 100}%` : 0,
                    top: guide.type === 'h' ? `${guide.coord * 100}%` : 0,
                    width: guide.type === 'v' ? '1px' : '100%',
                    height: guide.type === 'h' ? '1px' : '100%',
                    backgroundColor: color,
                  }}
                />
              );
            })}

          <TextEditingOverlay
            printMode={printMode}
            editingTextId={editingTextId}
            elements={elements}
            displayW={displayW}
            displayH={displayH}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            updateElement={updateElement}
            pushHistory={pushHistory}
            setEditingTextId={setEditingTextId}
          />
        </div>

        {/* خطوط وهوامش النزيف والقص والأمان للمطابع (طافية حول ورقة الكانفس) */}
        {!printMode && <CanvasBleedGuides displayW={displayW} displayH={displayH} />}

        {/* 🧭 خط السحب الإرشادي المباشر (Live Dragging Guide Line) - طافٍ بحرية خارج حدود القص ليبقى مرئياً عند السحب من المساطر */}
        {!printMode && dragGuideState && (
          <div
            className={`absolute z-(--z-canvas-guides) pointer-events-none select-none ${
              dragGuideState.type === 'h'
                ? 'left-0 right-0 h-[1px] bg-primary flex items-center'
                : 'top-0 bottom-0 w-[1px] bg-primary flex justify-center'
            }`}
            style={{
              [dragGuideState.type === 'h' ? 'top' : 'left']: `${dragGuideState.pos * 100}%`,
            }}
          >
            <div
              className={`absolute flex items-center px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground font-mono text-micro font-bold shadow-fluent-8 ${
                dragGuideState.type === 'h' ? 'left-3 -top-5' : 'top-3 left-2'
              }`}
            >
              {formatGuideMeasurement(
                dragGuideState.pos,
                dragGuideState.type === 'h',
                rulerUnit,
                widthMM,
                heightMM,
                canvasWidth,
                canvasHeight,
              )}
            </div>
          </div>
        )}
      </div>
    );

    return (
      <div
        className="absolute inset-0 flex flex-col bg-muted/40 overflow-hidden select-none"
        dir="ltr"
      >
        <ViewportFixedRulersHeader
          showRuler={showRuler}
          printMode={printMode}
          viewportWidth={rulerMetrics.viewportWidth}
          originX={rulerMetrics.originX}
          displayW={displayW}
          widthMM={widthMM}
          canvasPxW={canvasWidth}
          rulerUnit={rulerUnit}
          marginPxX={marginPxX}
          onChangeRulerUnit={setRulerUnit}
          onStartDragHGuide={handleStartDragHGuide}
          onClearGuides={clearUserGuides}
          hasGuides={userGuides.length > 0}
          showUserGuides={showUserGuides}
          onToggleShowGuides={() => setShowUserGuides(!showUserGuides)}
          lockUserGuides={lockUserGuides}
          onToggleLockGuides={() => setLockUserGuides(!lockUserGuides)}
        />

        <div className="flex flex-1 overflow-hidden relative" dir="ltr">
          <ViewportFixedRulersSidebar
            showRuler={showRuler}
            printMode={printMode}
            viewportHeight={rulerMetrics.viewportHeight}
            originY={rulerMetrics.originY}
            displayH={displayH}
            heightMM={heightMM}
            canvasPxH={canvasHeight}
            rulerUnit={rulerUnit}
            marginPxY={marginPxY}
            onStartDragVGuide={handleStartDragVGuide}
          />

          <div
            ref={(node) => {
              (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref && 'current' in ref) {
                (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
              }
            }}
            className="flex-1 overflow-auto workspace-grid relative"
            onMouseMove={handleWorkspaceMouseMove}
            onMouseLeave={handleWorkspaceMouseLeave}
          >
            <div
              className="min-w-full min-h-full flex p-4"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) selectElement(null);
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div style={{ margin: 'auto' }}>{canvasArea}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }),
);
