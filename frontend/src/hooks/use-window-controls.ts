import { useState, useEffect } from "react";
import { WindowMinimise, WindowToggleMaximise, Quit as WindowClose } from "../../wailsjs/runtime/runtime";

export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        const isMax =
          window.outerWidth >= window.screen.availWidth &&
          window.outerHeight >= window.screen.availHeight;
        setIsMaximized(isMax);
      };
      window.addEventListener("resize", handleResize);
      handleResize();

      const handleFocus = () => setIsFocused(true);
      const handleBlur = () => setIsFocused(false);
      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);

      const handleContextMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable &&
          !target.closest("[contenteditable='true']")
        ) {
          e.preventDefault();
        }
      };
      window.addEventListener("contextmenu", handleContextMenu);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("contextmenu", handleContextMenu);
      };
    }
  }, []);

  const handleMinimize = () => WindowMinimise();
  const handleMaximize = () => {
    WindowToggleMaximise();
    setIsMaximized((prev) => !prev);
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
