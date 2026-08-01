"use client"

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
        success: (
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30 shrink-0 shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        ),
        error: (
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/30 shrink-0 shadow-xs">
            <AlertCircle className="w-4 h-4" />
          </div>
        ),
        warning: (
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30 shrink-0 shadow-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
        ),
        info: (
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/30 shrink-0 shadow-xs">
            <Info className="w-4 h-4" />
          </div>
        ),
        loading: (
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-500 ring-1 ring-indigo-500/30 shrink-0 shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans group-[.toaster]:bg-card/95 group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:border-border/70 group-[.toaster]:shadow-[0_12px_40px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08)] group-[.toaster]:rounded-2xl group-[.toaster]:backdrop-blur-xl transition-all duration-200 !w-auto !max-w-md !mx-auto px-4 py-3 gap-3 flex items-center border-r-4",
          title: "text-xs font-semibold tracking-tight text-foreground/95 font-sans",
          description: "group-[.toast]:text-muted-foreground text-[11.5px] leading-normal mt-0.5 font-sans",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
          closeButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:hover:bg-accent/50 group-[.toast]:border-none group-[.toast]:rounded-full transition-colors",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
