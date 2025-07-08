import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jest from 'eslint-plugin-jest';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules'],
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
        // project: true, // This will be enabled in a separate config for src files
        // tsconfigRootDir: import.meta.dirname, // This will be enabled in a separate config for src files
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    files: ['src/**/*.ts'], // Apply type-aware rules only to src TypeScript files
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...tseslint.configs.recommendedTypeChecked.rules, // Use type-checked recommended rules
      ...security.configs.recommended.rules, // Apply security rules that might need type info
      'security/detect-object-injection': 'off',
    },
  },
  {
    rules: {
      ...tseslint.configs.recommended.rules, // General TypeScript rules (non-type-aware)
      ...jest.configs.recommended.rules,
      ...prettier.rules,

      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-eval': 'error',

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
