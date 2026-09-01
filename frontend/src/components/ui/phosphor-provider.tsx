import React from "react";
import { IconContext, IconWeight } from "@phosphor-icons/react";

export interface PhosphorProviderProps {
  children: React.ReactNode;
  weight?: IconWeight;
  size?: number | string;
  color?: string;
  mirrored?: boolean;
}

/**
 * مزود سياق أيقونات Phosphor الموحد لتطبيق Grido Studio
 * يوفر تكاملاً سلساً مع نظام أوزان الأيقونات (thin, light, regular, bold, fill, duotone)
 */
export function PhosphorProvider({
  children,
  weight = "regular",
  size = 18,
  color = "currentColor",
  mirrored = false,
}: PhosphorProviderProps) {
  return (
    <IconContext.Provider
      value={{
        color,
        size,
        weight,
        mirrored,
      }}
    >
      {children}
    </IconContext.Provider>
  );
}

export { IconContext };
export type { IconWeight };
