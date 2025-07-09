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
      
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
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
    files: ['test/**/*.ts', 'src/**/*.spec.ts'], // Apply type-aware rules and Jest rules to test files
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './jest-e2e.config.cjs'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...jest.configs.recommended.rules, // Apply Jest recommended rules
      // You might want to add more specific rules for test files here
    },
  },
  {
    rules: {
      ...tseslint.configs.recommended.rules, // General TypeScript rules (non-type-aware)
      ...prettier.rules,

      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-eval': 'error',

      

      '@typescript-eslint/explicit-function-return-type': 'warn',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'security/detect-eval-with-expression': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      'import/no-commonjs': 'error',
    },
  },
  {
    files: ['**/*.cjs'],
    rules: {
      'import/no-commonjs': 'off',
    },
  },
);
