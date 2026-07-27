import React from "react";
import { createPortal } from "react-dom";
import { ContextMenu, ContextMenuPosition, ContextMenuTarget } from "../context-menu";

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

  return createPortal(
    <ContextMenu
      position={contextMenu.position}
      target={contextMenu.target}
      onClose={onClose}
    />,
    document.body
  );
});
