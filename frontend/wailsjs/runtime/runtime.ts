import { Events, Window, Browser } from "@wailsio/runtime";

export function EventsOn(eventName: string, callback: (...args: any[]) => void): () => void {
  return Events.On(eventName, (ev: any) => {
    if (ev && ev.data !== undefined) {
      if (Array.isArray(ev.data)) {
        callback(...ev.data);
      } else {
        callback(ev.data);
      }
    } else {
      callback(ev);
    }
  });
}

export function EventsOff(eventName: string, ...additionalNames: string[]): void {
  Events.Off(eventName, ...additionalNames);
}

export function EventsEmit(eventName: string, ...data: any[]): void {
  Events.Emit(eventName, data.length === 1 ? data[0] : data);
}

export function WindowMinimise(): void {
  Window.Minimise();
}

export function WindowToggleMaximise(): void {
  Window.ToggleMaximise();
}

export function WindowIsMaximised(): Promise<boolean> {
  return Window.IsMaximised();
}

export function Quit(): void {
  Window.Close();
}

export function BrowserOpenURL(url: string): void {
  Browser.OpenURL(url);
}

export function WindowGetSize(): Promise<{ w: number; h: number }> {
  return Window.Size().then((s: any) => ({ w: s?.width || 0, h: s?.height || 0 }));
}

export function WindowSetSize(width: number, height: number): void {
  Window.SetSize(width, height);
}

export function WindowGetPosition(): Promise<{ x: number; y: number }> {
  return Window.Position().then((p: any) => ({ x: p?.x || 0, y: p?.y || 0 }));
}

export function WindowSetPosition(x: number, y: number): void {
  Window.SetPosition(x, y);
}
