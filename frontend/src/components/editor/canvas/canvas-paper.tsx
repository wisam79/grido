import React from "react";
import { Loader2 } from "lucide-react";
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
        className="relative rounded-sm overflow-hidden border border-black/10 dark:border-white/10 transition-shadow duration-300 shadow-md shadow-black/15 hover:shadow-lg hover:shadow-black/20 fluent-specular select-none"
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
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md rounded-sm gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
