import React from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/error-boundary'

// Enforce high-quality image smoothing globally on all canvas rendering contexts in Webview
if (typeof HTMLCanvasElement !== 'undefined') {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, options?: any) {
    const ctx = origGetContext.call(this, type, options);
    if (type === '2d' && ctx) {
      try {
        const c2d = ctx as CanvasRenderingContext2D;
        c2d.imageSmoothingEnabled = true;
        c2d.imageSmoothingQuality = 'high';
      } catch (e) {
        // Safe fallback if not supported
      }
    }
    return ctx;
  } as any;
}

import { StageProvider } from './lib/stage-context'

if (typeof window !== "undefined" && !(window as any).go) {
  window.addEventListener("contextmenu", (e) => {
    if (import.meta.env.PROD) {
      e.preventDefault();
    }
  });
  const mockImage = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4MDAnIGhlaWdodD0nNjAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjNjM2NmYxJy8+PHRleHQgeD0nNTAlJyB5PSc1MCUnIGRvbWluYW50LWJhc2VsaW5lPSdtaWRkbGUnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGZpbGw9J3doaXRlJyBmb250LXNpemU9JzMyJyBmb250LWZhbWlseT0nc2Fucy1zZXJpZic+R3JpZG8gU3R1ZGlvIE1vY2sgSW1hZ2U8L3RleHQ+PC9zdmc+";
  (window as any).go = {
    main: {
      App: {
        OpenFile: async () => mockImage,
        LoadAutoSave: async () => "",
        SaveAutoSave: async () => {},
        ClearAutoSave: async () => {},
      }
    },
    handlers: {
      ProjectHandler: {
        GetAllProjects: async () => [],
        GetProject: async () => null,
        SaveProject: async () => "success",
        DeleteProject: async () => "success",
      }
    }
  };
}

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <StageProvider>
                <App/>
            </StageProvider>
        </ErrorBoundary>
    </React.StrictMode>
)
