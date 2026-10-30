import { create } from 'zustand';

// Only dialog control lives here; the mounted modal owns its draft and history.
export const useFreeformDialogState = create(() => ({
  open: false,
  templatesRevision: 0,
}));

export function setFreeformDialogOpen(open: boolean) {
  useFreeformDialogState.setState({ open });
}

// Refresh whichever template panel is mounted now, not the card that opened us.
export function notifyFreeformTemplateSaved() {
  useFreeformDialogState.setState((state) => ({
    templatesRevision: state.templatesRevision + 1,
  }));
}
