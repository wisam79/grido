import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: ReactNode;
  /** Optional supporting information, not a second heading or decorative label. */
  description?: ReactNode;
  align?: "center" | "start";
  size?: "xl" | "lg";
  gap?: "md" | "lg" | "none";
}

const TITLE_SIZES = {
  xl: "text-2xl sm:text-3xl lg:text-[38px]",
  lg: "text-2xl sm:text-3xl",
} as const;

const GAPS = {
  md: "mb-6 sm:mb-8",
  lg: "mb-8 sm:mb-10",
  none: "",
} as const;

export function SectionHeader({
  title,
  description,
  align = "center",
  size = "xl",
  gap = "md",
}: SectionHeaderProps) {
  const isCentered = align === "center";

  return (
    <div
      className={`${GAPS[gap]} ${isCentered ? "text-center" : "text-start"}`}
    >
      <h2
        className={`${TITLE_SIZES[size]} font-bold tracking-tight leading-[1.3] text-balance ${
          isCentered ? "max-w-3xl mx-auto" : ""
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-3 text-sm text-text-secondary leading-relaxed text-balance ${
            isCentered ? "max-w-2xl mx-auto" : "max-w-md"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
