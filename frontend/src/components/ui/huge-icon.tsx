import * as React from "react";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export interface HugeIconProps extends Omit<HugeiconsIconProps, "className"> {
  className?: string;
}

/**
 * Reusable HugeIcon component with Tailwind CSS & Fluent 2 support.
 */
export const HugeIcon = React.forwardRef<SVGSVGElement, HugeIconProps>(
  ({ icon, size = 20, strokeWidth = 1.5, className, ...props }, ref) => {
    return (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        size={size}
        strokeWidth={strokeWidth}
        className={cn("inline-block shrink-0 align-middle", className)}
        {...props}
      />
    );
  }
);

HugeIcon.displayName = "HugeIcon";

/**
 * Standardized modern animated spinner using Hugeicons Loading03Icon.
 */
export const Spinner: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className,
}) => {
  return (
    <HugeIcon
      icon={Loading03Icon}
      size={size}
      className={cn("animate-spin shrink-0", className)}
    />
  );
};

export { HugeiconsIcon };
export type { HugeiconsIconProps };
