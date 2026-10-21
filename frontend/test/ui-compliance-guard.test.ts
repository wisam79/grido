import * as fs from 'fs';
import * as path from 'path';

import { describe, it, expect } from 'vitest';

/**
 * 🛡️ حارس الاتساق البصري (UI Compliance Guard) — تنفيذ فعلي لقواعد كان مستندها
 * `src/lib/ui/ui-compliance.ts` بلا مُنفِّذ (0 مستورِد). هذا الاختبار يمشي على كل
 * ملفات `.tsx` في `src` ويفشل البناء عند أي مخالفة قابلة للقياس:
 *   - z-index سحري `z-[N]` بدل مقياس `--z-*`
 *   - حجم خط اعتباطي `text-[Npx]` بدل مقياس `--text-*`
 *   - لون hex خام داخل `className` بدل توكنات الثيم
 */

const SRC = path.resolve(__dirname, '../src');

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
