import * as fs from 'fs';
import * as path from 'path';

import { describe, it, expect } from 'vitest';

/**
 * Selected measurable local source rules, not a complete GUI/accessibility audit.
 * Existing production guards remain unchanged. Owned rules/skill TSX examples
 * must not teach styling that those guards forbid in the desktop editor.
 */

const SRC = path.resolve(__dirname, '../src');
const ROOT = path.resolve(__dirname, '../..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && full.endsWith('.tsx') ? [full] : [];
  });
}

function rel(file: string): string {
  return path.relative(SRC, file).split(path.sep).join('/');
}

const FILES = walk(SRC);
const POLICY_FILES = [
  '.agents/rules/ui-ux-fluent.md',
  '.agents/skills/fluent2-design-system/SKILL.md',
  '.agents/skills/grido-ui-designer-guide/SKILL.md',
  '.agents/skills/radix-ui-accessibility-ux/SKILL.md',
];

describe('UI Compliance Guard (R-series enforcement)', () => {
  it('لا يوجد z-index سحري z-[N] — يُستعمل مقياس --z-*', () => {
    const offenders = FILES.filter((f) =>
      /(?:^|[\s"'`])z-\[\d/.test(fs.readFileSync(f, 'utf-8')),
    ).map(rel);
    expect(offenders).toEqual([]);
  });

  it('لا يوجد حجم خط اعتباطي text-[Npx] — يُستعمل مقياس --text-*', () => {
    const offenders = FILES.filter((f) =>
      /text-\[\d+(?:\.\d+)?px\]/.test(fs.readFileSync(f, 'utf-8')),
    ).map(rel);
    expect(offenders).toEqual([]);
  });

  it('لا يوجد لون hex خام داخل className — تُستعمل توكنات الثيم', () => {
    // استثناء وحيد: نمط النقاط الزخرفي في freeform-elements-tab (خلفية texture لا لون حالة)
    const offenders: string[] = [];
    for (const f of FILES) {
      if (rel(f) === 'components/editor/panels/freeform/freeform-elements-tab.tsx') continue;
      fs.readFileSync(f, 'utf-8')
        .split('\n')
        .forEach((line, i) => {
          if (line.includes('className=') && /#[0-9a-fA-F]{3,6}\b/.test(line)) {
            offenders.push(`${rel(f)}:${i + 1}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});

describe('UI Compliance Guard — owned policy examples', () => {
  it.each(POLICY_FILES)('%s TSX examples preserve local token/radius evidence', (file) => {
    const markdown = fs.readFileSync(path.join(ROOT, file), 'utf-8');
    const css = fs.readFileSync(path.join(SRC, 'index.css'), 'utf-8');
    const shadows = new Set([...css.matchAll(/--fluent-shadow-(\d+)\s*:/g)].map((m) => m[1]));
    const layers = new Set([...css.matchAll(/--z-([a-z-]+)\s*:/g)].map((m) => m[1]));
    // Fenced example code only: prose may name a forbidden token to explain it.
    // No production exceptions are widened, including the existing z-50 license.
    for (const [index, block] of [...markdown.matchAll(/```tsx\s*\n([\s\S]*?)```/g)].entries()) {
      const code = block[1];
      const context = `${file}, TSX example ${index + 1}`;
      expect(code, context).not.toMatch(/\brounded-(?:2xl|3xl)\b/);
      expect(code, context).not.toMatch(/(?:^|[\s"'`])z-\[\d/);
      expect(code, context).not.toMatch(/text-\[\d+(?:\.\d+)?px\]/);
      expect(code, context).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(code, context).not.toMatch(/\bbg-primary\s[^"'`]*\btext-primary-foreground\b/);
      for (const match of code.matchAll(/shadow-fluent-(\d+)/g)) {
        expect(shadows.has(match[1]), `${context}: ${match[0]} must exist`).toBe(true);
      }
      for (const match of code.matchAll(/z-\(--z-([a-z-]+)\)/g)) {
        expect(layers.has(match[1]), `${context}: ${match[0]} must exist`).toBe(true);
      }
    }
  });

  it('skills retain executable example fences so the example guard cannot silently go vacuous', () => {
    for (const file of POLICY_FILES.filter((name) => name.endsWith('/SKILL.md'))) {
      expect(fs.readFileSync(path.join(ROOT, file), 'utf-8'), file).toMatch(/```tsx\s*\n/);
    }
  });
});
