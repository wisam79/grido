import * as React from "react";
import { IconContext, type IconWeight } from "./icons";

export interface FluentIconProviderProps {
  children: React.ReactNode;
  weight?: IconWeight;
  size?: number | string;
  color?: string;
  mirrored?: boolean;
}

/**
 * مزود سياق أيقونات Fluent الموحد لتطبيق Grido Studio
 * يحافظ على نفس واجهة مزود Phosphor السابق (weight, size, color, mirrored)
 */
export function FluentIconProvider({
  children,
  weight = "regular",
  size = 20,
  color = "currentColor",
  mirrored = false,
}: FluentIconProviderProps) {
  return (
    <IconContext.Provider value={{ color, size, weight, mirrored }}>
      {children}
    </IconContext.Provider>
  );
}

export { IconContext };
export type { IconWeight };