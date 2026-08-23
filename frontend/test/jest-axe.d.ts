declare module 'jest-axe' {
  export function axe(html: Element | string, options?: unknown): Promise<AxeResults>;
  export interface AxeResultNode {
    target: string[];
    html: string;
    failureSummary?: string;
  }
  export interface AxeResults {
    violations: AxeResultNode[];
    passes: unknown[];
    incomplete: unknown[];
    inapplicable: unknown[];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- توافق مع توقيع expect.extend في Vitest
  export const toHaveNoViolations: any;
}
