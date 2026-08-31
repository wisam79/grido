import * as React from "react";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { ArrowClockwise20Regular } from "@fluentui/react-icons";
import { cn } from "@/lib/utils";

export interface HugeIconProps extends Omit<HugeiconsIconProps, "icon" | "className"> {
  icon?: any;
  className?: string;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * Reusable Icon component with Fluent 2 & Hugeicons backward-compatibility support.
 */
export const HugeIcon = React.forwardRef<HTMLElement | SVGElement, HugeIconProps>(
  ({ icon, size = 20, strokeWidth = 1.5, className, style, ...props }, ref) => {
    if (!icon) return null;

    // If icon is already a React element (e.g. <Settings20Regular />)
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<any>, {
        className: cn("inline-block shrink-0 align-middle", className, (icon.props as any)?.className),
        style: { width: size, height: size, fontSize: size, ...style, ...(icon.props as any)?.style },
        ...props,
      });
    }

    // If icon is a React Component (function or object with $$typeof / render, like @fluentui/react-icons)
    if (typeof icon === "function" || (typeof icon === "object" && ("$$typeof" in icon || "render" in icon))) {
      const IconComponent = icon as React.ComponentType<any>;
      return (
        <IconComponent
          ref={ref}
          className={cn("inline-block shrink-0 align-middle", className)}
          style={{ width: size, height: size, fontSize: size, ...style }}
          {...props}
        />
      );
    }

    // Otherwise treat as Hugeicons data definition
    return (
      <HugeiconsIcon
        ref={ref as any}
        icon={icon}
        size={size}
        strokeWidth={strokeWidth}
        className={cn("inline-block shrink-0 align-middle", className)}
        style={style}
        {...props}
      />
    );
  }
);

HugeIcon.displayName = "HugeIcon";

/**
 * Standardized modern animated spinner for Fluent 2 Design System.
 */
export const Spinner: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size = 16,
  className,
  style,
}) => {
  return (
    <ArrowClockwise20Regular
      className={cn("animate-spin shrink-0", className)}
      style={{ width: size, height: size, fontSize: size, ...style }}
    />
  );
};

export { HugeiconsIcon };
export type { HugeiconsIconProps };
