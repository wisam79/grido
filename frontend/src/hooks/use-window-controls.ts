import { useState, useEffect, useCallback } from "react";
import { WindowMinimise, WindowToggleMaximise, Quit as WindowClose, WindowIsMaximised } from "../../wailsjs/runtime/runtime";

export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  const checkMaximized = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && (window as any).runtime?.WindowIsMaximised) {
        const max = await WindowIsMaximised();
        setIsMaximized(Boolean(max));
        return;
      }
    } catch {
      // fallback
    }

    if (typeof window !== "undefined") {
      const isMax =
        window.outerWidth >= window.screen.availWidth &&
        window.outerHeight >= window.screen.availHeight;
      setIsMaximized(isMax);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    checkMaximized();

    window.addEventListener("resize", checkMaximized);
    const handleFocus = () => {
      setIsFocused(true);
      checkMaximized();
    };
    const handleBlur = () => setIsFocused(false);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("resize", checkMaximized);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [checkMaximized]);

  const handleMinimize = () => WindowMinimise();
  const handleMaximize = async () => {
    WindowToggleMaximise();
    setTimeout(checkMaximized, 100);
  };
  const handleClose = () => WindowClose();

  return {
    isMaximized,
    isFocused,
    handleMinimize,
    handleMaximize,
    handleClose,
  };
}
