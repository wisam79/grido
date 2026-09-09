import { Button } from "@/components/ui/button";
import { Minus, CopySimple, Square, X } from "@phosphor-icons/react";

/**
 * WindowControls — الأزرار الثلاثة الموحدة للنافذة (تصغير / تكبير / إغلاق)
 * مكوّن مشترك يُستخدم في رأس النافذة الرئيسي وشاشة قفل الترخيص
 * لمنع ازدواجية الترميز بين الشاشتين.
 */
interface WindowControlsProps {
  isMaximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export function WindowControls({ isMaximized, onMinimize, onMaximize, onClose }: WindowControlsProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={onMinimize}
        className="w-9 h-7.5 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 rounded-md transition-colors"
        title="تصغير"
      >
        <Minus className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onMaximize}
        className="w-9 h-7.5 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 rounded-md transition-colors"
        title={isMaximized ? "استعادة" : "تكبير"}
      >
        {isMaximized ? <CopySimple className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="w-9 h-7.5 p-0 flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white rounded-md transition-colors active:bg-red-600"
        title="إغلاق"
      >
        <X className="w-4 h-4" />
      </Button>
    </>
  );
}
