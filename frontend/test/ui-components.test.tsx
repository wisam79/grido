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
    render(<Badge variant="secondary">ميزة جديدة</Badge>);
    expect(screen.getByText('ميزة جديدة')).toBeInTheDocument();
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

  it('renders Separator component correctly', () => {
    const { container } = render(<Separator orientation="horizontal" />);
    expect(container.firstChild).toBeInTheDocument();
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
});
