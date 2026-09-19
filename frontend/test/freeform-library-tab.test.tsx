import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FreeformLibraryTab } from "../src/components/editor/panels/freeform/freeform-library-tab";
import { useEditorStore } from "../src/lib/editor-store";
import { PREF_KEYS, readStoredList } from "../src/lib/local-prefs";

describe("لوحة المفضلة وآخر استخدام", () => {
  beforeEach(() => {
    localStorage.clear();
    useEditorStore.setState({ elements: [], selectedIds: [] });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("يعرض أقسام اللوحة الأربعة وحالاتها الفارغة", () => {
    render(<FreeformLibraryTab />);

    expect(screen.getByText("آخر استخدام")).toBeInTheDocument();
    expect(screen.getByText("عناصر سريعة")).toBeInTheDocument();
    expect(screen.getByText("الخطوط المفضلة")).toBeInTheDocument();
    expect(screen.getByText("الألوان المحفوظة")).toBeInTheDocument();

    expect(screen.getByText("لا سجل استخدام بعد")).toBeInTheDocument();
    expect(screen.getByText("لا خطوط مفضلة")).toBeInTheDocument();
    expect(screen.getByText("لا ألوان محفوظة")).toBeInTheDocument();
  });

  it("يضيف عنصراً إلى الكانفاس ويسجّله في آخر استخدام", () => {
    render(<FreeformLibraryTab />);

    fireEvent.click(screen.getByTitle("إضافة مستطيل"));

    expect(useEditorStore.getState().elements).toHaveLength(1);
    expect(readStoredList(PREF_KEYS.recentItems)).toContain("shape:rect");
    expect(screen.getByTitle("إعادة إضافة مستطيل")).toBeInTheDocument();
  });

  it("يثبّت العنصر في المفضلة ويحفظ ذلك محلياً، ثم يفكّ التثبيت", () => {
    render(<FreeformLibraryTab />);

    const toggle = screen.getByLabelText("إضافة مثلث للمفضلة");
    fireEvent.click(toggle);

    expect(readStoredList(PREF_KEYS.favoriteShapes)).toEqual(["triangle"]);
    expect(screen.getByLabelText("إزالة مثلث من المفضلة")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("إزالة مثلث من المفضلة"));
    expect(readStoredList(PREF_KEYS.favoriteShapes)).toEqual([]);
  });

  it("يقيّد شبكة العناصر بالتصنيف المختار", () => {
    render(<FreeformLibraryTab />);

    fireEvent.click(screen.getByText("نصوص"));
    expect(screen.getByTitle("إضافة عنوان رئيسي")).toBeInTheDocument();
    expect(screen.queryByTitle("إضافة مثلث")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("أشكال"));
    expect(screen.getByTitle("إضافة مثلث")).toBeInTheDocument();
    expect(screen.queryByTitle("إضافة عنوان رئيسي")).not.toBeInTheDocument();
  });

  it("يفرّغ المفضلة وآخر استخدام من زر واحد", () => {
    render(<FreeformLibraryTab />);

    fireEvent.click(screen.getByLabelText("إضافة مستطيل للمفضلة"));
    expect(readStoredList(PREF_KEYS.favoriteShapes)).toEqual(["rect"]);

    fireEvent.click(screen.getByText("تفريغ الكل"));

    expect(readStoredList(PREF_KEYS.favoriteShapes)).toEqual([]);
    expect(readStoredList(PREF_KEYS.recentItems)).toEqual([]);
  });
});
