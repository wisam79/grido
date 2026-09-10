import React from "react";
import { ContextMenu, ContextMenuPosition, ContextMenuTarget } from "./context-menu";

interface CanvasContextMenuProps {
  contextMenu: {
    position: ContextMenuPosition;
    target: ContextMenuTarget;
  } | null;
  printMode: boolean;
  onClose: () => void;
}

export const CanvasContextMenu = React.memo(function CanvasContextMenu({
  contextMenu,
  printMode,
  onClose,
}: CanvasContextMenuProps) {
  if (!contextMenu || printMode) return null;

  return (
    <ContextMenu
      position={contextMenu.position}
      target={contextMenu.target}
      onClose={onClose}
    />
  );
});
