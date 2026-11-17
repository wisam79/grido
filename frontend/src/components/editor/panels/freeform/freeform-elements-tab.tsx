import React, { useCallback } from 'react';

import { ShapeGlyph } from '@/components/editor/shapes/shape-glyph';
import { useEditorStore } from '@/lib/editor-store';
import { SHAPE_CATEGORIES, shapesInCategory } from '@/lib/io/shape-catalog';

import { FreeformTextTab } from './freeform-text-tab';

import type { ShapeCatalogItem } from '@/lib/io/shape-catalog';

export interface FreeformElementsTabProps {
  category: 'shapes' | 'text';
}

const FreeformShapesContent = React.memo(function FreeformShapesContent() {
  const addShapeElement = useEditorStore((state) => state.addShapeElement);

  const handleAddShape = useCallback(
    (item: ShapeCatalogItem) => {
      addShapeElement(item.kind, item.path, { aspect: item.aspect, defaults: item.defaults });
    },
    [addShapeElement],
  );

  return (
    <div
      data-testid="studio-elements-shapes"
      className="space-y-3 font-cairo animate-in fade-in duration-150"
      dir="rtl"
    >
      {/* كتالوج الأشكال الكامل بفئاته */}
      <div className="space-y-3">
        {SHAPE_CATEGORIES.map((group) => {
          const shapes = shapesInCategory(group.id);
          if (shapes.length === 0) return null;

          return (
            <div key={group.id} className="space-y-1.5">
              <div className="px-1 flex items-center justify-between">
                <span className="text-control font-semibold text-foreground">{group.label}</span>
                <span className="text-mini font-mono text-muted-foreground font-semibold">
                  {shapes.length}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {shapes.map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    data-testid={`element-add-shape-${shape.id}`}
                    onClick={() => handleAddShape(shape)}
                    title={shape.label}
                    aria-label={shape.label}
                    className="group flex items-center justify-center h-10 bg-card hover:bg-accent border border-border/70 hover:border-control-border rounded-md transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none select-none"
                  >
                    <ShapeGlyph
                      kind={shape.kind}
                      path={shape.path}
                      sides={shape.defaults?.sides}
                      starPoints={shape.defaults?.starPoints}
                      doubleArrow={shape.defaults?.pointerAtBeginning === true}
                      className="w-5 h-5 shrink-0 text-muted-foreground/75 group-hover:text-foreground transition-colors duration-150"
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const FreeformElementsTab = React.memo(function FreeformElementsTab({
  category: activeCategory,
}: FreeformElementsTabProps) {
  if (activeCategory === 'text') {
    return <FreeformTextTab />;
  }
  return <FreeformShapesContent />;
});
