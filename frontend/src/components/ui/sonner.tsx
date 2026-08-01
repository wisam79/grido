import React from "react"
import { Toaster as Sonner, ToasterProps } from "sonner"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = typeof window !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      dir="rtl"
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
        error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
        warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
        info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
        loading: <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans !bg-card/90 dark:!bg-[#28282c]/95 !text-foreground !border !border-border/60 dark:!border-white/12 !shadow-md !rounded-full !backdrop-blur-md transition-all duration-150 !w-auto !max-w-fit !mx-auto px-3.5 py-1.5 min-h-[34px] gap-2 flex items-center",
          title: "text-xs font-medium text-foreground tracking-normal font-sans whitespace-nowrap",
          description: "text-[11px] text-muted-foreground font-sans mt-0.5",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90 text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80 text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
          closeButton:
            "group-[.toast]:!bg-transparent group-[.toast]:!text-muted-foreground/60 group-[.toast]:hover:!text-foreground group-[.toast]:!border-none group-[.toast]:!rounded-full transition-colors p-0.5",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
