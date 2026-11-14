// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackProvider, useFeedback } from './FeedbackProvider';

const cleanups: Array<() => void> = [];
async function flush() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); }
async function mount() {
  let api!: ReturnType<typeof useFeedback>;
  function Harness() {
    api = useFeedback();
    return <main><button type="button">المشغل</button><button type="button">خارج النافذة</button></main>;
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    act(() => root.unmount());
    mounted = false;
    container.remove();
  };
  cleanups.push(unmount);
  await act(async () => { root.render(<StrictMode><FeedbackProvider><Harness /></FeedbackProvider></StrictMode>); });
  const trigger = container.querySelector<HTMLButtonElement>('button')!;
  trigger.focus();
  return { get api() { return api; }, trigger, container, unmount };
}
function button(label: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')]
    .find((item) => item.textContent === label)!;
}
function press(target: EventTarget, key: string, shiftKey = false) {
  act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })); });
}
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  if (vi.isFakeTimers()) { await act(async () => { await vi.runOnlyPendingTimersAsync(); }); vi.useRealTimers(); }
  else await flush();
  vi.unstubAllGlobals();
});

describe('admin FeedbackProvider Radix confirmation', () => {
  it('names and describes dangerous confirmation, focuses cancel, traps Tab both ways', async () => {
    const view = await mount();
    let pending!: Promise<boolean>;
    await act(async () => { pending = view.api.confirmDialog('حذف المستخدم؟', { danger: true, confirmLabel: 'حذف' }); });
    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(dialog.className).toContain('z-(--z-dialog)');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('تأكيد إجراء خطير');
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toContain('حذف المستخدم؟');
    expect(document.activeElement).toBe(button('إلغاء'));
    press(button('إلغاء'), 'Tab');
    expect(document.activeElement).toBe(button('حذف'));
    press(button('حذف'), 'Tab', true);
    expect(document.activeElement).toBe(button('إلغاء'));
    act(() => view.trigger.focus());
    expect(dialog.contains(document.activeElement)).toBe(true);
    press(document.activeElement!, 'Escape');
    expect(await pending).toBe(false);
    await flush();
    expect(document.activeElement).toBe(view.trigger);
  });

  it('does not globally confirm on Enter or Space; cancel activation stays false', async () => {
    const view = await mount();
    let pending!: Promise<boolean>;
    const settled = vi.fn();
    await act(async () => { pending = view.api.confirmDialog('هل ترغب في الحذف؟', { danger: true }); pending.then(settled); });
    press(window, 'Enter');
    press(window, ' ');
    await act(async () => {});
    expect(settled).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(button('إلغاء'));
    // jsdom does not implement the browser's keyboard-generated button click.
    press(button('إلغاء'), 'Enter');
    act(() => button('إلغاء').click());
    expect(await pending).toBe(false);
    expect(settled).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('confirms only the action; drains overlapping requests FIFO without losing promises', async () => {
    const view = await mount();
    let first!: Promise<boolean>, second!: Promise<boolean>, third!: Promise<boolean>;
    await act(async () => {
      first = view.api.confirmDialog('الأول');
      second = view.api.confirmDialog('الثاني', { danger: true });
      third = view.api.confirmDialog('الثالث');
    });
    act(() => button('تأكيد').click());
    expect(await first).toBe(true);
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain('الثاني');
    expect(document.activeElement).toBe(button('إلغاء'));
    act(() => button('إلغاء').click());
    expect(await second).toBe(false);
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain('الثالث');
    press(button('إلغاء'), 'Escape');
    expect(await third).toBe(false);
    await flush();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(view.trigger);
  });

  it('bounds the queue, settles rejected overflow and active/queued requests on unmount', async () => {
    const view = await mount();
    const pending: Array<Promise<boolean>> = [];
    await act(async () => { for (let i = 0; i < 12; i++) pending.push(view.api.confirmDialog(`طلب ${i}`)); });
    expect(await Promise.all(pending.slice(8))).toEqual([false, false, false, false]);
    view.unmount();
    expect(await Promise.all(pending)).toEqual(Array(12).fill(false));
    expect(await view.api.confirmDialog('بعد الإزالة')).toBe(false);
  });

  it('restores the main region if the launching action was deleted', async () => {
    const view = await mount();
    const main = view.container.querySelector('main')!;
    let pending!: Promise<boolean>;
    await act(async () => { pending = view.api.confirmDialog('حذف', { danger: true }); });
    view.trigger.remove();
    act(() => button('تأكيد').click());
    expect(await pending).toBe(true);
    await flush();
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');
    act(() => main.querySelector<HTMLButtonElement>('button')!.focus());
    expect(main.hasAttribute('tabindex')).toBe(false);
  });

  it('does not dismiss a confirmation from the overlay', async () => {
    const view = await mount();
    let pending!: Promise<boolean>;
    await act(async () => { pending = view.api.confirmDialog('تأكيد'); });
    const overlay = document.querySelector<HTMLElement>('[data-state="open"].bg-black\\/70')!;
    act(() => { overlay.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); overlay.click(); });
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    act(() => button('إلغاء').click());
    expect(await pending).toBe(false);
  });
});

describe('admin feedback toast lifecycle', () => {
  it('bounds notifications, clears dismissed/expired timers and cleans up on unmount', async () => {
    const view = await mount();
    await flush();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const baseline = vi.getTimerCount();
    act(() => { for (let i = 0; i < 8; i++) view.api.notify(`إشعار ${i}`, 'success'); });
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(5);
    expect(document.querySelector('[aria-live="polite"]')?.className).toContain('z-(--z-toast)');
    expect(vi.getTimerCount()).toBe(baseline + 5);
    act(() => document.querySelector<HTMLButtonElement>('[aria-label="إغلاق الإشعار"]')!.click());
    expect(vi.getTimerCount()).toBe(baseline + 4);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    act(() => view.api.notify('باقٍ', 'error'));
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    view.api.notify('بعد الإزالة');
    expect(vi.getTimerCount()).toBe(0);
  });
});
