import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

// Source contracts only: no rendered contrast, hitbox, or GUI acceptance claims.
const stylesheets = [
  {
    name: 'editor',
    css: postcss.parse(readFileSync(resolve(__dirname, '../src/index.css'), 'utf8')),
    material: ':is(.fluent-mica, .fluent-acrylic)',
    surface: 'var(--card)',
  },
  {
    name: 'admin',
    css: postcss.parse(readFileSync(resolve(__dirname, '../../admin-web/src/index.css'), 'utf8')),
    material: '.app-mockup', // Existing explicitly named Mica login surface.
    surface: 'var(--grido-surface-card)',
  },
];

function media(css: postcss.Root, params: string) {
  const matches: postcss.AtRule[] = [];
  css.walkAtRules('media', (rule) => {
    if (rule.params === params) matches.push(rule);
  });
  expect(matches).toHaveLength(1);
  return matches[0];
}

function rules(container: postcss.Container) {
  const matches: postcss.Rule[] = [];
  container.walkRules((rule) => {
    matches.push(rule);
  });
  return matches;
}

function declarations(rule: postcss.Rule) {
  const values: Record<string, { value: string; important: boolean }> = {};
  rule.walkDecls((decl) => {
    values[decl.prop] = { value: decl.value, important: !!decl.important };
  });
  return values;
}

function important(value: string) {
  return { value, important: true };
}

const selector = (rule: postcss.Rule) => rule.selector.replace(/["']/g, '');

describe.each(stylesheets)(
  '$name accessibility CSS contracts',
  ({ css, material, surface, name }) => {
    it('uses system focus and disabled colors without opting out of forced colors', () => {
      const forced = media(css, '(forced-colors: active)');
      const scoped = rules(forced);
      expect(scoped.map(selector)).toEqual([
        ':focus-visible',
        ':is(button, input, select, textarea, [role=button])',
        ':is(:disabled, [aria-disabled=true])',
      ]);
      expect(declarations(scoped[0])).toEqual({
        outline: important('2px solid Highlight'),
        'outline-offset': important('2px'),
        'box-shadow': important('none'),
      });
      expect(declarations(scoped[1])).toEqual({ 'border-color': important('CanvasText') });
      expect(declarations(scoped[2])).toEqual({
        color: important('GrayText'),
        'border-color': important('GrayText'),
        opacity: important('1'),
      });
      // Earlier base-layer !important must beat the editor's fluent-focus-ring utility.
      if (name === 'editor') {
        expect(forced.parent?.type).toBe('atrule');
        expect((forced.parent as postcss.AtRule).params).toBe('base');
      }
    });

    it('reduces transparency on named UI materials only, not canvas or output tokens', () => {
      const scoped = rules(media(css, '(prefers-reduced-transparency: reduce)'));
      expect(scoped.map(selector)).toEqual([material]);
      expect(declarations(scoped[0])).toEqual({
        background: important(surface),
        'backdrop-filter': important('none'),
        '-webkit-backdrop-filter': important('none'),
      });
    });

    it('enlarges only opted-in controls under coarse pointer without pseudo hit areas', () => {
      const targets = rules(css).filter((rule) => rule.selector.includes('coarse-touch-target'));
      expect(targets).toHaveLength(1);
      expect(targets[0].selector).toBe('.coarse-touch-target');
      expect(targets[0].parent).toBe(media(css, '(pointer: coarse)'));
      expect(declarations(targets[0])).toEqual({
        'min-width': { value: '44px', important: false },
        'min-height': { value: '44px', important: false },
      });
    });

    it('defines dialog and toast tokens above the existing popover scale', () => {
      const themes: postcss.AtRule[] = [];
      css.walkAtRules('theme', (theme) => {
        themes.push(theme);
      });
      expect(themes).toHaveLength(1);
      const values: Record<string, number> = {};
      themes[0].walkDecls(/^--z-/, (decl) => {
        values[decl.prop] = Number(decl.value);
      });
      expect(values['--z-dialog']).toBe(2000);
      expect(values['--z-toast']).toBe(3000);
      if (name === 'editor') expect(values['--z-dialog']).toBeGreaterThan(values['--z-popover']);
      expect(values['--z-toast']).toBeGreaterThan(values['--z-dialog']);
    });
  },
);
