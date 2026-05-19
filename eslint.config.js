import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // viewer/main.js is browser code, not part of the TS project. Lint
    // would otherwise complain about it not being in tsconfig.
    // viewer/dist/ is the static build output (gitignored).
    ignores: [
      'node_modules/**',
      'dist/**',
      'out/**',
      'coverage/**',
      '.husky/**',
      'viewer/main.js',
      'viewer/dist/**',
      // Playwright spec uses @playwright/test; lint config can't easily handle both.
      'viewer/viewer.spec.ts',
      'viewer/playwright.config.ts',
      // Browser client: own tsconfig (DOM + JSX), typechecked via
      // `pnpm typecheck:client`. The flat config's typed/React rules
      // don't apply here, same segregation as viewer browser code.
      // `client/scripts/**` (Node fixture tooling) stays linted.
      'client/src/**',
      'client/dist/**',
      'client/vite.config.ts',
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/no-cycle': 'error',
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.config.{js,ts}', 'eslint.config.js'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
