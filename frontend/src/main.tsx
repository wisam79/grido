import React from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/error-boundary'

if (typeof window !== "undefined" && !(window as any).go) {
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
            <App/>
        </ErrorBoundary>
    </React.StrictMode>
)
