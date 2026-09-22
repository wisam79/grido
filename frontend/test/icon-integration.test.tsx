import { describe, it, expect } from "vitest";
import * as React from "react";
import { render } from "@testing-library/react";
import { FluentIconProvider } from "@/components/ui/fluent-icon-provider";
import {
  Sparkle,
  Eye,
  LockSimple,
  LockSimpleOpen,
  Stack,
  Scan,
  TextT,
  Image,
} from "@/components/ui/icons";

describe("Fluent Icon Layer Integration & Multi-Weight System", () => {
  it("renders FluentIconProvider and passes default context", () => {
    const { container } = render(
      <FluentIconProvider weight="regular" size={20}>
        <div data-testid="icon-wrapper">
          <Sparkle data-testid="sparkle-icon" />
        </div>
      </FluentIconProvider>
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("data-fui-icon")).not.toBeNull();
  });

  it("renders all 6 weights mapped onto Fluent variants (thin/light/regular -> Regular, bold/fill/duotone -> Filled)", () => {
    const { container } = render(
      <FluentIconProvider>
        <div className="icon-grid">
          <Stack data-testid="thin-icon" weight="thin" />
          <LockSimpleOpen data-testid="light-icon" weight="light" />
          <Image data-testid="regular-icon" weight="regular" />
          <TextT data-testid="bold-icon" weight="bold" />
          <LockSimple data-testid="fill-icon" weight="fill" />
          <Scan data-testid="duotone-icon" weight="duotone" />
        </div>
      </FluentIconProvider>
    );

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(6);
    for (const testId of ["thin-icon", "light-icon", "regular-icon", "bold-icon", "fill-icon", "duotone-icon"]) {
      expect(container.querySelector(`[data-testid="${testId}"]`)).not.toBeNull();
    }
  });

  it("supports dynamic stateful weight switching (regular <-> fill)", () => {
    const StatefulToggle = ({ isLocked, isSelected }: { isLocked: boolean; isSelected: boolean }) => (
      <FluentIconProvider>
        <div>
          {isLocked ? (
            <LockSimple data-testid="lock-active" weight="fill" />
          ) : (
            <LockSimpleOpen data-testid="lock-idle" weight="light" />
          )}
          <Eye data-testid="visibility-toggle" weight={isSelected ? "bold" : "regular"} />
        </div>
      </FluentIconProvider>
    );

    const { rerender, getByTestId, queryByTestId } = render(
      <StatefulToggle isLocked={false} isSelected={false} />
    );

    expect(getByTestId("lock-idle")).toBeDefined();
    expect(queryByTestId("lock-active")).toBeNull();

    rerender(<StatefulToggle isLocked={true} isSelected={true} />);
    expect(getByTestId("lock-active")).toBeDefined();
    expect(queryByTestId("lock-idle")).toBeNull();
  });
});