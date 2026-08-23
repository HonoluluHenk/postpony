import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
      'src/public/assets/vendor/**',
    ],
  },
  eslint.configs.recommended,
  {
    name: 'app/typescript',
    files: ['**/*.ts'],
    // Type-aware TypeScript rules must only apply to `.ts` files. Applying them
    // to `.js` files would surface TypeScript errors on plain JavaScript.
    extends: [
      // use tslint equivalents for eslint-recommended:
      tseslint.configs.eslintRecommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.ts', '*.config.js', 'scripts/run-migration.ts', 'scripts/build-eta-templates.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowIIFEs: true,
          allowDirectConstAssertionInArrowFunctions: true
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
        },
      ],
    },
  },
  {
    // Spec files rely on deliberately loosely-typed mocks (`any`), so the
    // strict type-aware "unsafe *" rules would only add noise here.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    files: ['e2e-tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['src/public/assets/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        htmx: 'readonly',
        ui: 'readonly',
        Spinner: 'readonly',
        AirDatepicker: 'readonly',
        AirDatepickerLocale: 'readonly',
      },
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Build/tooling scripts live outside the app tsconfig and are not part of
    // the type-checked program; treat them like plain JavaScript.
    files: ['scripts/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
);
