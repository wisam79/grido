import { createContext, useContext } from 'react';

export const PanelFooterPortalContext = createContext<HTMLDivElement | null>(null);

/** يرجع حاوية تذييل اللوح المثبتة أسفل PanelShell لوضع أزرار الإجراءات دون فراغ ميت */
export function usePanelFooterPortal(): HTMLDivElement | null {
  return useContext(PanelFooterPortalContext);
}
