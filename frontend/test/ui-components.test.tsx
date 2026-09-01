import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import { Input } from '../src/components/ui/input';
import { Label } from '../src/components/ui/label';
import { Separator } from '../src/components/ui/separator';
import { Switch } from '../src/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../src/components/ui/tabs';
import { HugeIcon, Spinner } from '../src/components/ui/huge-icon';
import { Sparkle } from '@phosphor-icons/react';

describe('UI Components Unit Tests', () => {
  it('renders Button component and handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>انقر هنا</Button>);

    const btn = screen.getByRole('button', { name: 'انقر هنا' });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
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

    rerender(<Separator orientation="vertical" />);
    const sepVert = container.querySelector('[data-slot="separator"]');
    expect(sepVert).toHaveAttribute('data-orientation', 'vertical');
  });

  it('renders Switch component and toggles checked state', () => {
    const handleCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={handleCheckedChange} aria-label="تفعيل الخيار" />);

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
      </Tabs>
    );

    expect(screen.getByText('التبويب الأول')).toBeInTheDocument();
    expect(screen.getByText('محتوى 1')).toBeInTheDocument();
  });

  it('renders HugeIcon and Spinner components properly', () => {
    const { container, rerender } = render(
      <HugeIcon icon={Sparkle} size={24} className="test-huge-icon text-primary" data-testid="huge-sparkle" />
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

