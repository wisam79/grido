import React from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/error-boundary'

if (typeof window !== "undefined" && !(window as any).go) {
  const mockImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='%236366f1'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='32' font-family='sans-serif'>Grido Studio Mock Image</text></svg>";
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
