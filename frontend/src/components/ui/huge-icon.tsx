import * as React from "react";
import { type IconProps } from "@phosphor-icons/react";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type IconComponentProps = IconProps & React.SVGProps<SVGSVGElement> & Record<string, unknown>;

export interface HugeIconProps {
  icon?: React.ComponentType<IconComponentProps> | React.ReactElement | null;
  className?: string;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
  weight?: IconProps["weight"];
}

/**
 * Reusable Icon component — Phosphor-only wrapper.
 * Accepts a Phosphor component (function) or a React element.
 */
export const HugeIcon = React.forwardRef<SVGSVGElement, HugeIconProps>(
  ({ icon, size = 20, className, style, weight, ...props }, ref) => {
    if (!icon) return null;

    // If icon is already a React element, clone it with our props
    if (React.isValidElement(icon)) {
      const elem = icon as React.ReactElement<{ className?: string; style?: React.CSSProperties }>;
      return React.cloneElement(elem, {
        className: cn("inline-block shrink-0 align-middle", className, elem.props?.className),
        style: { width: size, height: size, fontSize: size, ...style, ...elem.props?.style },
        ...(weight ? { weight } : {}),
        ...props,
      } as Record<string, unknown>);
    }

    // Treat as a Phosphor component (function or forwardRef object)
    if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
      const IconComponent = icon as React.ComponentType<IconComponentProps>;
      return (
        <IconComponent
          ref={ref}
          size={size}
          className={cn("inline-block shrink-0 align-middle", className)}
          style={style}
          {...(weight ? { weight } : {})}
          {...props}
        />
      );
    }

    return null;
  }
);

HugeIcon.displayName = "HugeIcon";

/**
 * Standardized animated spinner using Phosphor Icons.
 */
export const Spinner: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size = 16,
  className,
  style,
}) => {
  return (
    <CircleNotch
      size={size}
      weight="bold"
      className={cn("animate-spin shrink-0", className)}
      style={style}
    />
  );
};
