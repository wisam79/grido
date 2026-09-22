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

  export const toHaveNoViolations: any;
}
