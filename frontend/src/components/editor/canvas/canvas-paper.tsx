import React from "react";
import { Spinner } from "@/components/ui/huge-icon";
import { checkerColor } from "@/lib/canvas/canvas-colors";

interface CanvasPaperProps {
  innerRef?: React.RefObject<HTMLDivElement | null>;
  displayW: number;
  displayH: number;
  backgroundColor: string;
  isLoading?: boolean;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}

export const CanvasPaper = React.memo(
  React.forwardRef<HTMLDivElement, CanvasPaperProps>(function CanvasPaper(
    {
      displayW,
      displayH,
      backgroundColor,
      isLoading = false,
      onMouseMove,
      onMouseLeave,
      onClick,
      children,
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        id="canvas-area"
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
        className="relative rounded-md overflow-hidden border border-black/10 dark:border-white/10 transition-shadow duration-300 shadow-fluent-8 fluent-specular select-none"
        style={{
          width: displayW,
          height: displayH,
          backgroundColor,
          backgroundImage:
            backgroundColor === "transparent"
              ? `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)`
              : undefined,
          backgroundSize:
            backgroundColor === "transparent" ? "20px 20px" : undefined,
          backgroundPosition:
            backgroundColor === "transparent"
              ? "0 0, 0 10px, 10px -10px, -10px 0px"
              : undefined,
        }}
        onClick={onClick}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center fluent-smoke-backdrop rounded-md gap-2">
            <Spinner className="w-8 h-8 text-primary" size={32} />
            <span className="text-xs font-bold text-white font-cairo">
              جاري المعالجة ...
            </span>
          </div>
        )}

        {children}
      </div>
    );
  })
);
