import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.output/**', '.wxt/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Developer tools pasted into a browser console.
    files: ['tools/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Developer tools run with Node.
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // Project rule: no `any` in TypeScript.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
