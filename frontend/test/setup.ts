import '@testing-library/jest-dom';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(matchers);
expect.extend(toHaveNoViolations);

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver;

// Mock Wails bindings
Object.defineProperty(window, 'go', {
  value: {
    main: {
      App: {
        LoadAutoSave: () => Promise.resolve(""),
        SaveAutoSave: () => Promise.resolve(),
        ClearAutoSave: () => Promise.resolve(),
        SaveImageFromBase64: () => Promise.resolve(""),
        OpenFile: () => Promise.resolve(""),
        SaveFile: () => Promise.resolve(),
        SaveFileDialog: () => Promise.resolve("")
      }
    }
  },
  writable: true
});

