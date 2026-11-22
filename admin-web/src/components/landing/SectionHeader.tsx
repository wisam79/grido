import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  /** Optional supporting information, not a second heading or decorative label. */
  description?: ReactNode;
  align?: "center" | "start";
  size?: "xl" | "lg";
  gap?: "md" | "lg" | "none";
}

const TITLE_SIZES = {
  xl: "text-2xl sm:text-4xl lg:text-[42px]",
  lg: "text-2xl sm:text-3xl lg:text-[34px]",
} as const;

const GAPS = {
  md: "mb-8 sm:mb-10",
  lg: "mb-10 sm:mb-12",
  none: "",
} as const;

export function SectionHeader({
  eyebrow,
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
      {eyebrow && (
        <p
          className={`mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-brand-light ${
            isCentered ? "justify-center" : "justify-start"
          }`}
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-brand-primary"
          />
          <span>{eyebrow}</span>
        </p>
      )}
      <h2
        className={`${TITLE_SIZES[size]} font-bold tracking-tight leading-[1.24] text-text-primary text-balance ${
          isCentered ? "max-w-3xl mx-auto" : ""
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-3.5 text-sm sm:text-base text-text-secondary leading-[1.75] text-balance ${
            isCentered ? "max-w-2xl mx-auto" : "max-w-lg"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
