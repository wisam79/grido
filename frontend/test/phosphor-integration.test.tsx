import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  PhosphorProvider,
} from "@/components/ui/phosphor-provider";
import {
  Sparkle,
  Eye,
  EyeSlash,
  LockSimple,
  LockSimpleOpen,
  Stack,
  Scan,
  TextT,
  Image,
} from "@phosphor-icons/react";

describe("Phosphor Icons Integration & Multi-Weight System", () => {
  it("renders PhosphorProvider and passes default context", () => {
    const { container } = render(
      <PhosphorProvider weight="regular" size={20}>
        <div data-testid="icon-wrapper">
          <Sparkle data-testid="sparkle-icon" />
        </div>
      </PhosphorProvider>
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("width")).toBe("20");
    expect(svg?.getAttribute("height")).toBe("20");
  });

  it("renders all 6 weights: thin, light, regular, bold, fill, duotone", () => {
    const { container } = render(
      <PhosphorProvider>
        <div className="icon-grid">
          <Stack data-testid="thin-icon" weight="thin" />
          <LockSimpleOpen data-testid="light-icon" weight="light" />
          <Image data-testid="regular-icon" weight="regular" />
          <TextT data-testid="bold-icon" weight="bold" />
          <LockSimple data-testid="fill-icon" weight="fill" />
          <Scan data-testid="duotone-icon" weight="duotone" />
        </div>
      </PhosphorProvider>
    );

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(6);
  });

  it("supports dynamic stateful weight switching (regular <-> fill, regular <-> bold)", () => {
    const StatefulToggle = ({ isLocked, isSelected }: { isLocked: boolean; isSelected: boolean }) => (
      <PhosphorProvider>
        <div>
          {isLocked ? (
            <LockSimple data-testid="lock-active" weight="fill" />
          ) : (
            <LockSimpleOpen data-testid="lock-idle" weight="light" />
          )}
          <Eye data-testid="visibility-toggle" weight={isSelected ? "bold" : "regular"} />
        </div>
      </PhosphorProvider>
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
