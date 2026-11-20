import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { toast } from 'sonner';
import { describe, it, expect, vi } from 'vitest';

import { Sparkle } from '@/components/ui/icons';

import { ModeSwitcher } from '../src/components/editor/toolbar/mode-switcher';
import { Badge } from '../src/components/ui/badge';
import { Button } from '../src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogCloseButton,
} from '../src/components/ui/dialog';
import { HugeIcon, Spinner } from '../src/components/ui/huge-icon';
import { Input } from '../src/components/ui/input';
import { Label } from '../src/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../src/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '../src/components/ui/radio-group';
import { Separator } from '../src/components/ui/separator';
import { Toaster } from '../src/components/ui/sonner';
import { Switch } from '../src/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../src/components/ui/tabs';
import { useTheme } from '../src/hooks/use-theme';
import { useEditorStore } from '../src/lib/editor-store';

describe('UI Components Unit Tests', () => {
  it('renders Button component and handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>انقر هنا</Button>);

    const btn = screen.getByRole('button', { name: 'انقر هنا' });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('blocks disabled asChild links and child handlers without losing refs or enabled behavior', async () => {
    const user = userEvent.setup();
    const wrapperClick = vi.fn();
    const childClick = vi.fn();
    const childCapture = vi.fn();
    const wrapperKey = vi.fn();
    const ref = React.createRef<HTMLButtonElement>();
    const content = (disabled: boolean) => (
      <Button
        asChild
        disabled={disabled}
        ref={ref}
        onClick={wrapperClick}
        onKeyDownCapture={wrapperKey}
      >
        <a href="#disabled-link" onClick={childClick} onClickCapture={childCapture} tabIndex={0}>
          رابط الأمر
        </a>
      </Button>
    );
    const { rerender } = render(content(true));
    const link = screen.getByRole('link', { name: 'رابط الأمر' });
    expect(ref.current).toBe(link);
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(link).toHaveClass('opacity-50', 'cursor-not-allowed');
    expect(fireEvent.click(link)).toBe(false);
    expect(fireEvent.keyDown(link, { key: 'Enter' })).toBe(false);
    expect(fireEvent.keyDown(link, { key: ' ' })).toBe(false);
    await user.click(link);
    expect(wrapperClick).not.toHaveBeenCalled();
    expect(childClick).not.toHaveBeenCalled();
    expect(childCapture).not.toHaveBeenCalled();
    expect(wrapperKey).not.toHaveBeenCalled();
    rerender(content(false));
    fireEvent.click(link);
    expect(wrapperClick).toHaveBeenCalledOnce();
    expect(childClick).toHaveBeenCalledOnce();
    expect(childCapture).toHaveBeenCalledOnce();
  });

  it('reactively themes one Toaster and sets the z token above injected vendor CSS', async () => {
    let setThemeMode!: ReturnType<typeof useTheme>['setThemeMode'];
    function ToastHarness() {
      setThemeMode = useTheme().setThemeMode;
      return <Toaster style={{ marginTop: 7 }} />;
    }
    const { container, unmount } = render(<ToastHarness />);
    // Sonner's live section mounts immediately, but its list exists only with a toast.
    await act(async () => {
      toast.info('إشعار اختبار الثيم', { id: 'ui-theme-test', duration: Infinity });
    });
    // Vendor subscription intentionally publishes the toast from a queued timer.
    await waitFor(() =>
      expect(container.querySelectorAll('[data-sonner-toaster]')).toHaveLength(1),
    );
    const toaster = container.querySelector<HTMLElement>('[data-sonner-toaster]')!;
    expect(container.querySelectorAll('[data-sonner-toaster]')).toHaveLength(1);
    expect(toaster.style.zIndex).toBe('var(--z-toast)');
    expect(toaster.style.marginTop).toBe('7px');
    act(() => setThemeMode('light'));
    expect(toaster).toHaveAttribute('data-sonner-theme', 'light');
    act(() => setThemeMode('dark'));
    expect(toaster).toHaveAttribute('data-sonner-theme', 'dark');
    act(() => setThemeMode('system'));
    act(() => toast.dismiss('ui-theme-test'));
    unmount();
  });

  it('mode tabs rove, wrap and preserve prevented or modified keys', () => {
    useEditorStore.getState().reset();
    useEditorStore.setState({ mode: 'collage' });
    const { rerender, unmount } = render(<ModeSwitcher />);
    const collage = screen.getByTestId('mode-tab-collage');
    const single = screen.getByTestId('mode-tab-single');
    expect(collage.tabIndex).toBe(0);
    expect(single.tabIndex).toBe(-1);
    act(() => collage.focus());
    fireEvent.keyDown(collage, { key: 'ArrowLeft' });
    expect(single).toHaveFocus();
    expect(single.tabIndex).toBe(0);
    expect(useEditorStore.getState().mode).toBe('single');
    fireEvent.keyDown(single, { key: 'ArrowRight' });
    expect(collage).toHaveFocus();
    fireEvent.keyDown(collage, { key: 'End' });
    expect(single).toHaveFocus();
    fireEvent.keyDown(single, { key: 'Home' });
    expect(collage).toHaveFocus();
    fireEvent.keyDown(collage, { key: 'ArrowLeft', ctrlKey: true });
    expect(useEditorStore.getState().mode).toBe('collage');
    rerender(
      <div onKeyDownCapture={(event) => event.preventDefault()}>
        <ModeSwitcher />
      </div>,
    );
    fireEvent.keyDown(screen.getByTestId('mode-tab-collage'), { key: 'End' });
    expect(useEditorStore.getState().mode).toBe('collage');
    unmount();
    useEditorStore.getState().reset();
  });

  it('keeps nested portaled popovers above dialogs and returns focus one overlay at a time', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>فتح الحوار</DialogTrigger>
        <DialogContent showCloseButton={false} aria-describedby={undefined}>
          <DialogTitle>حوار الاختبار</DialogTitle>
          <Popover>
            <PopoverTrigger>فتح القائمة</PopoverTrigger>
            <PopoverContent>
              <button>أمر القائمة</button>
            </PopoverContent>
          </Popover>
          <DialogCloseButton />
        </DialogContent>
      </Dialog>,
    );
    const opener = screen.getByRole('button', { name: 'فتح الحوار' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'حوار الاختبار' });
    expect(dialog).toHaveClass('z-(--z-dialog)');
    expect(dialog).toHaveAttribute('dir', 'rtl');
    const menuOpener = screen.getByRole('button', { name: 'فتح القائمة' });
    await user.click(menuOpener);
    const content = document.querySelector('[data-slot="popover-content"]')!;
    expect(content).toHaveClass('z-(--z-dialog-popover)');
    expect(dialog).not.toContainElement(content as HTMLElement);
    expect(screen.getByRole('button', { name: 'أمر القائمة' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull();
    expect(dialog).toBeInTheDocument();
    expect(menuOpener).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'حوار الاختبار' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('Radix horizontal radio focus uses RTL by default and permits explicit LTR', async () => {
    const user = userEvent.setup();
    const options = (
      <>
        <RadioGroupItem value="first" aria-label="أول" />
        <RadioGroupItem value="disabled" disabled aria-label="معطل" />
        <RadioGroupItem value="last" aria-label="آخر" />
      </>
    );
    const { rerender } = render(
      <RadioGroup orientation="horizontal" defaultValue="first">
        {options}
      </RadioGroup>,
    );
    const first = screen.getByRole('radio', { name: 'أول' });
    const last = screen.getByRole('radio', { name: 'آخر' });
    expect(screen.getByRole('radiogroup')).toHaveAttribute('dir', 'rtl');
    act(() => first.focus());
    await user.keyboard('{ArrowLeft}');
    expect(last).toHaveFocus();
    rerender(
      <RadioGroup dir="ltr" orientation="horizontal" defaultValue="first">
        {options}
      </RadioGroup>,
    );
    expect(screen.getByRole('radiogroup')).toHaveAttribute('dir', 'ltr');
    act(() => first.focus());
    await user.keyboard('{ArrowRight}');
    expect(last).toHaveFocus();
  });

  it('renders Badge component with default and custom variants', () => {
    const { rerender } = render(<Badge variant="secondary">ميزة جديدة</Badge>);
    expect(screen.getByText('ميزة جديدة')).toBeInTheDocument();

    rerender(<Badge variant="destructive">تحذير</Badge>);
    expect(screen.getByText('تحذير')).toBeInTheDocument();

    rerender(<Badge variant="outline">إطار</Badge>);
    expect(screen.getByText('إطار')).toBeInTheDocument();
  });

  it('renders Input component and handles text change', () => {
    const handleChange = vi.fn();
    render(<Input placeholder="أدخل اسمك" onChange={handleChange} />);

    const input = screen.getByPlaceholderText('أدخل اسمك');
    fireEvent.change(input, { target: { value: 'أحمد' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('renders Label component correctly', () => {
    render(<Label htmlFor="test-input">البريد الإلكتروني</Label>);
    expect(screen.getByText('البريد الإلكتروني')).toBeInTheDocument();
  });

  it('renders Separator component with horizontal and vertical orientation', () => {
    const { container, rerender } = render(<Separator orientation="horizontal" />);
    const sep = container.querySelector('[data-slot="separator"]');
    expect(sep).toBeInTheDocument();
    expect(sep).toHaveAttribute('data-orientation', 'horizontal');
    expect(sep).toHaveClass('h-px', 'w-full');
    expect(sep).toHaveAttribute('role', 'none');

    rerender(<Separator orientation="vertical" />);
    const sepVert = container.querySelector('[data-slot="separator"]');
    expect(sepVert).toHaveAttribute('data-orientation', 'vertical');
    expect(sepVert).toHaveClass('h-full', 'w-px');
    expect(sepVert).not.toHaveClass('w-full');
  });

  it('renders Switch component and toggles checked state', () => {
    const handleCheckedChange = vi.fn();
    render(
      <Switch checked={false} onCheckedChange={handleCheckedChange} aria-label="تفعيل الخيار" />,
    );

    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeInTheDocument();

    fireEvent.click(switchEl);
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });

  it('renders Tabs component correctly', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">التبويب الأول</TabsTrigger>
          <TabsTrigger value="tab2">التبويب الثاني</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">محتوى 1</TabsContent>
        <TabsContent value="tab2">محتوى 2</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('التبويب الأول')).toBeInTheDocument();
    expect(screen.getByText('محتوى 1')).toBeInTheDocument();
  });

  it('renders HugeIcon and Spinner components properly', () => {
    const { container, rerender } = render(
      <HugeIcon
        icon={Sparkle}
        size={24}
        className="test-huge-icon text-primary"
        data-testid="huge-sparkle"
      />,
    );

    const svgEl = container.querySelector('svg');
    expect(svgEl).toBeInTheDocument();
    expect(svgEl).toHaveClass('test-huge-icon');

    rerender(<Spinner size={18} className="custom-spin-class" />);
    const spinnerSvg = container.querySelector('svg');
    expect(spinnerSvg).toBeInTheDocument();
    expect(spinnerSvg).toHaveClass('animate-spin');
    expect(spinnerSvg).toHaveClass('custom-spin-class');
  });
});
