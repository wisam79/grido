import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "system" | "dark" | "light";
export type EffectiveTheme = "dark" | "light";

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("grido-theme-mode") || localStorage.getItem("grido-theme");
      if (saved === "system" || saved === "dark" || saved === "light") {
        return saved;
      }
    }
    return "system"; // الوضع الافتراضي للتطبيق متوافق مع نظام Windows 11
  });

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true; // احتياطي: الوضع الداكن
  });

  // مراقبة التغير الحي في ثيم نظام التشغيل (Windows 11)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // اشتقاق الثيم الفعلي المطبق
  const effectiveTheme: EffectiveTheme =
    themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;

  // مزامنة صنف CSS وحفظ التفضيل
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("grido-theme-mode", themeMode);
    localStorage.setItem("grido-theme", effectiveTheme);
  }, [themeMode, effectiveTheme]);

  // التبديل السلس: عند التبديل من وضع النظام، الانتقال للوضع المقابل مباشرة
  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      if (prev === "system") {
        return effectiveTheme === "dark" ? "light" : "dark";
      }
      if (prev === "light") return "dark";
      return "system";
    });
  }, [effectiveTheme]);

  return {
    theme: effectiveTheme,
    themeMode,
    effectiveTheme,
    setThemeMode,
    toggleTheme,
  };
}

