// @vitest-environment jsdom
import { act, useState, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditUserModal } from './EditUserModal';
import type { UserProfile } from '../types';

type Props = ComponentProps<typeof EditUserModal>;
const user: UserProfile = {
  id: 'user-1', name: 'Studio', email: 'studio@example.test', plan: 'pro',
  status: 'active', expires_at: '', license_key: '',
  created_at: '2026-11-13T00:00:00Z', updated_at: '2026-11-13T00:00:00Z',
};
const cleanups: Array<() => void> = [];
async function flush() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); }
async function mount() {
  const callbacks = {
    onClose: vi.fn(), onNameChange: vi.fn(), onPlanChange: vi.fn(),
    onStatusChange: vi.fn(), onExpiresChange: vi.fn(), onSubmit: vi.fn((event) => event.preventDefault()),
  };
  let update!: (patch: Partial<Props>) => void;
  function Harness() {
    const [props, setProps] = useState<Props>({
      editModalUser: null, editName: 'Studio', editEmail: user.email, editPlan: 'pro',
      editStatus: 'active', editExpiresAt: '', savingUser: false, ...callbacks,
      onClose: () => { callbacks.onClose(); setProps((previous) => ({ ...previous, editModalUser: null })); },
    });
    update = (patch) => setProps((previous) => ({ ...previous, ...patch }));
    return <main><button type="button" onClick={() => update({ editModalUser: user })}>تعديل</button><button type="button">خارج النافذة</button><EditUserModal {...props} /></main>;
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let mounted = true;
  const unmount = () => { if (mounted) { act(() => root.unmount()); mounted = false; container.remove(); } };
  cleanups.push(unmount);
  await act(async () => { root.render(<Harness />); });
  const trigger = container.querySelector<HTMLButtonElement>('button')!;
  trigger.focus();
  act(() => trigger.click());
  return { callbacks, trigger, container, update: (patch: Partial<Props>) => act(() => update(patch)), unmount };
}
function label(text: string) { return [...document.querySelectorAll('label')].find((element) => element.textContent === text)!; }
function control(text: string) { return document.getElementById(label(text).htmlFor) as HTMLInputElement | HTMLSelectElement; }
function button(text: string) { return [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((element) => element.textContent === text)!; }
function press(target: EventTarget, key: string, shiftKey = false) {
  act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })); });
}
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(async () => { for (const cleanup of cleanups.splice(0)) cleanup(); await flush(); vi.unstubAllGlobals(); });

describe('EditUserModal local Radix shell', () => {
  it('has a real title, native linked labels, safe field focus and a focus trap', async () => {
    const view = await mount();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.className).toContain('z-(--z-dialog)');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toContain(`تعديل حساب: ${user.email}`);
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
    const fields = ['الاسم الكامل', 'البريد الإلكتروني', 'الباقة المستهدفة', 'حالة الحساب', 'تاريخ انتهاء الصلاحية'].map(control);
    expect(new Set(fields.map((field) => field.id)).size).toBe(5);
    expect(fields[1].disabled).toBe(true);
    expect(fields[1].getAttribute('type')).toBe('email');
    expect(fields[4].getAttribute('type')).toBe('date');
    expect(document.activeElement).toBe(fields[0]);
    act(() => button('حفظ التعديلات').focus());
    press(button('حفظ التعديلات'), 'Tab');
    const closeButton = document.querySelector<HTMLButtonElement>('[aria-label="إغلاق النافذة"]')!;
    expect(document.activeElement).toBe(closeButton);
    press(closeButton, 'Tab', true);
    expect(document.activeElement).toBe(button('حفظ التعديلات'));
    act(() => view.trigger.focus());
    expect(dialog.contains(document.activeElement)).toBe(true);
    press(document.activeElement!, 'Escape');
    expect(view.callbacks.onClose).toHaveBeenCalledOnce();
    await flush();
    expect(document.activeElement).toBe(view.trigger);
  });

  it('preserves native form submission and callbacks without global Enter/Space handling', async () => {
    const view = await mount();
    press(window, 'Enter'); press(window, ' ');
    expect(view.callbacks.onSubmit).not.toHaveBeenCalled();
    act(() => button('حفظ التعديلات').click());
    expect(view.callbacks.onSubmit).toHaveBeenCalledOnce();
    const name = control('الاسم الكامل') as HTMLInputElement;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, 'New studio');
      name.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(view.callbacks.onNameChange).toHaveBeenCalledWith('New studio');
    act(() => { const plan = control('الباقة المستهدفة'); plan.value = 'enterprise'; plan.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(view.callbacks.onPlanChange).toHaveBeenCalledWith('enterprise');
    act(() => button('إلغاء').click());
    expect(view.callbacks.onClose).toHaveBeenCalledOnce();
  });

  it('keeps the existing save open, disables fields and guards all dismissal/duplicate submits while busy', async () => {
    const view = await mount();
    view.update({ savingUser: true });
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-busy')).toBe('true');
    for (const field of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[role="dialog"] input, [role="dialog"] select')) expect(field.disabled).toBe(true);
    expect(button('حفظ التعديلات').disabled).toBe(true);
    expect(button('إلغاء').disabled).toBe(true);
    act(() => {
      document.querySelector<HTMLButtonElement>('[aria-label="إغلاق النافذة"]')!.click();
      button('إلغاء').click();
      document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    press(document.activeElement!, 'Escape');
    expect(view.callbacks.onClose).not.toHaveBeenCalled();
    expect(view.callbacks.onSubmit).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    // Owner/session can still remove the form programmatically; the shell cannot veto it.
    view.update({ editModalUser: null });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('links native validation errors and clears them after edits without changing persistence', async () => {
    const view = await mount();
    const date = control('تاريخ انتهاء الصلاحية') as HTMLInputElement;
    date.setCustomValidity('تاريخ انتهاء الصلاحية غير صالح.');
    act(() => button('حفظ التعديلات').click());
    expect(view.callbacks.onSubmit).not.toHaveBeenCalled();
    expect(date.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(date.getAttribute('aria-describedby')!)?.textContent).toBe('تاريخ انتهاء الصلاحية غير صالح.');
    expect(document.querySelector('[role="alert"]')).not.toBeNull();
    date.setCustomValidity('');
    act(() => { const status = control('حالة الحساب'); status.value = 'expired'; status.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(view.callbacks.onStatusChange).toHaveBeenCalledWith('expired');
    expect(date.hasAttribute('aria-invalid')).toBe(false);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    act(() => button('حفظ التعديلات').click());
    expect(view.callbacks.onSubmit).toHaveBeenCalledOnce();
  });

  it('includes and allows selecting the trial plan tier', async () => {
    const view = await mount();
    const planSelect = control('الباقة المستهدفة') as HTMLSelectElement;
    expect(Array.from(planSelect.options).map((option) => option.value)).toEqual([
      'free',
      'trial',
      'pro',
      'enterprise',
    ]);
    act(() => {
      planSelect.value = 'trial';
      planSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(view.callbacks.onPlanChange).toHaveBeenCalledWith('trial');
  });

  it('restores a connected main fallback when the edit trigger disappears', async () => {
    const view = await mount();
    const main = view.container.querySelector('main')!;
    view.trigger.remove();
    act(() => button('إلغاء').click());
    await flush();
    expect(document.activeElement).toBe(main);
  });
});
