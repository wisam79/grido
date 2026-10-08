import { Events, Window, Browser, Application } from "@wailsio/runtime";

// جسر الرنتايم الموحد (Wails v3) — نقطة الاستيراد الوحيدة لأحداث/نوافذ/نظام التطبيق.
// القاعدة المعمارية (.agents/rules/backend-wails-runtime.md): مكونات الواجهة لا تستورد
// @wailsio/runtime مباشرةً ولا تعتمد على window.runtime (غير موجود في v3)، بل تمر من هنا.
// ⚠️ هذا الملف هو مصدر التنفيذ — لا يعتمد على أي ملف داخل src (ممنوع الاعتماد المعكوس).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EventsOn(eventName: string, callback: (...args: any[]) => void): () => void {
  return Events.On(eventName, (ev: unknown) => {
    const wailsEv = ev as { data?: unknown } | undefined;
    if (wailsEv && wailsEv.data !== undefined) {
      if (Array.isArray(wailsEv.data)) {
        callback(...wailsEv.data);
      } else {
        callback(wailsEv.data);
      }
    } else {
      callback(ev);
    }
  });
}

export function EventsOff(eventName: string, ...additionalNames: string[]): void {
  Events.Off(eventName, ...additionalNames);
}

export function EventsEmit(eventName: string, ...data: unknown[]): void {
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
  Application.Quit();
}

export function BrowserOpenURL(url: string): void {
  Browser.OpenURL(url);
}

export function WindowGetSize(): Promise<{ w: number; h: number }> {
  return Window.Size().then((s: { width?: number; height?: number } | undefined) => ({
    w: s?.width || 0,
    h: s?.height || 0,
  }));
}

export function WindowSetSize(width: number, height: number): void {
  Window.SetSize(width, height);
}

export function WindowGetPosition(): Promise<{ x: number; y: number }> {
  return Window.Position().then((p: { x?: number; y?: number } | undefined) => ({
    x: p?.x || 0,
    y: p?.y || 0,
  }));
}

export function WindowSetPosition(x: number, y: number): void {
  Window.SetPosition(x, y);
}

export function WindowSnapAssist(): void {
  Window.SnapAssist();
}
