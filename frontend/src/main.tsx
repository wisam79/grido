import React from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/error-boundary'
import { LogFrontendError } from '../wailsjs/go/main/App'

// Global error handlers to catch unhandled exceptions and send them to the Go logger
window.onerror = function (message, source, lineno, colno, error) {
  const stack = error?.stack || '';
  LogFrontendError("error", `Uncaught Error: ${message}`, stack).catch(console.error);
  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  const error = event.reason;
  const message = error?.message || String(error);
  const stack = error?.stack || '';
  LogFrontendError("error", `Unhandled Promise Rejection: ${message}`, stack).catch(console.error);
});

// 🚫 حظر تكبير وتصغير واجهة التطبيق بالكامل (Browser Page Zoom) عبر التوجباد أو المفاتيح
if (typeof window !== 'undefined') {
  // حظر Ctrl + Wheel للتوجباد المسبب لتكبير النافذة بدلاً من الكانفس —
  // يُستثنى الكانفس نفسه (id=canvas-area) لأنه يعالج Ctrl+wheel للتكبير داخلياً
  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const target = e.target as HTMLElement | null;
        if (target?.closest?.('#canvas-area')) return;
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // حظر اختصارات المتصفح الافتراضية للتكبير (Ctrl + / Ctrl - / Ctrl 0)
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0' || e.code === 'NumpadAdd' || e.code === 'NumpadSubtract')
      ) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
        }
      }
    },
    { capture: true }
  );

  // حظر أحداث الايماءات لنوافذ المتصفح
  window.addEventListener('gesturestart', (e) => e.preventDefault());
  window.addEventListener('gesturechange', (e) => e.preventDefault());
  window.addEventListener('gestureend', (e) => e.preventDefault());
}

import { StageProvider } from '@/lib/canvas/stage-context'

if (typeof window !== "undefined" && !(window as any).go) {
  window.addEventListener("contextmenu", (e) => {
    if (import.meta.env.PROD) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!isInput) {
        e.preventDefault();
      }
    }
  });
  const mockImage = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4MDAnIGhlaWdodD0nNjAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjNjM2NmYxJy8+PHRleHQgeD0nNTAlJyB5PSc1MCUnIGRvbWluYW50LWJhc2VsaW5lPSdtaWRkbGUnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGZpbGw9J3doaXRlJyBmb250LXNpemU9JzMyJyBmb250LWZhbWlseT0nc2Fucy1zZXJpZic+R3JpZG8gU3R1ZGlvIE1vY2sgSW1hZ2U8L3RleHQ+PC9zdmc+";
  (window as any).go = {
    main: {
      App: {
        OpenFile: async () => mockImage,
        GetImageDimensions: async () => ({ width: 800, height: 600 }),
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

if (!container) {
    throw new Error("Root element '#root' not found in DOM");
}

const root = createRoot(container)

root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <StageProvider>
                <App/>
            </StageProvider>
        </ErrorBoundary>
    </React.StrictMode>
)
