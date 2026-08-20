import React from "react";
import { Loader2 } from "lucide-react";

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
        className="relative rounded-sm overflow-hidden border border-white/5 transition-shadow duration-300 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.7)] fluent-specular select-none"
        style={{
          width: displayW,
          height: displayH,
          backgroundColor,
          backgroundImage:
            backgroundColor === "transparent"
              ? "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)"
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
