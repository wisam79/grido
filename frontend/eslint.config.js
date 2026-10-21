import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';

import importX from 'eslint-plugin-import-x';

import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  { ignores: ['dist', 'wailsjs', 'src/wailsjs'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      'import-x': importX,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          pathGroups: [
            { pattern: '@bindings/**', group: 'external', position: 'after' },
            { pattern: '@/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['type'],
          'newlines-between': 'ignore',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',
      'no-console': ['error', { allow: ['debug'] }],
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'no-alert': 'error',
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/aria-role': 'off',
    },
  },
  {
    // مقابض تحجيم النافذة تحاكي حدود نظام التشغيل الأصيلة (window chrome)
    // وليست عناصر واجهة قابلة للتركيز — التنفيذ الأصيل في OS غير قابل للوصول أيضاً
    files: ['src/components/editor/system/window-resize-handles.tsx'],
    rules: {
      'jsx-a11y/no-static-element-interactions': 'off',
    },
  },
  {
    // sink التسجيل الوحيد المسموح له بالكتابة على console، والـworker لا يملك
    // جسر Wails، وحارسة الامتثال البصري تُبلّغ في بيئة التطوير فقط.
    files: [
      'src/lib/logger.ts',
      'src/workers/**/*.ts',
      'src/lib/ui/ui-compliance.ts',
      'src/**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    //  - تُفحص الاختبارات والـ e2e ضمن نفس معيار الجودة (كانت خارج نطاق lint سابقاً،
    //    فمرّت فيها مخلفات مثل استيرادات ميتة).
    //  - أي (any) في الـ mocks جزء من طبيعتها: محاكاة canvas/wasm/Wails تحتاج
    //    أشكالاً مرنة لا يصفها نوع المصدر.
    //  - alias لـ this (canvas) ضروري لحفظ المرجع داخل الدوال المتداخلة في mock
    //    سياق الـ 2d، حيث يُعاد ربط this.
    files: ['test/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-this-alias': ['error', { allowedNames: ['canvas'] }],
      'no-console': 'off',
    },
  },
  {
    // ملفات تصدّر أنواع/interfaces بجانب المكوّنات — Fast Refresh لا يتأثر
    // بتصدير الأنواع (type-only exports تُمحى في الـ build)
    files: [
      'src/components/editor/canvas/ruler.tsx',
      'src/components/editor/properties/gradient-picker.tsx',
      'src/features/freeform-collage/components/freeform-paper-selector.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);
