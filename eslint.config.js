
import globals from 'globals';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
import security from 'eslint-plugin-security';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', '.eslintrc.js', 'eslint.config.js'],
  },
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylistic,
      jest,
      security,
      import: importPlugin,
    },
  },
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    rules: {
      ...tseslint.configs.recommended.rules,
      ...jest.configs.recommended.rules,
      ...security.configs.recommended.rules,
      ...prettier.rules,

      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling']],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      '@typescript-eslint/explicit-function-return-type': 'error',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);
