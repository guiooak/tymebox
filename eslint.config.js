import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * Architecture boundary: every wrapped external library may only be imported
 * inside its own `common/services/*` (or, for recharts, `common/components/chart`)
 * abstraction. Feature code must depend on our interfaces, never the library.
 *
 * Keyed by the abstraction that "owns" the library.
 */
const WRAPPED = {
  'date-fns': ['date-fns', 'date-fns/*'],
  firebase: ['firebase', 'firebase/*'],
  recharts: ['recharts', 'recharts/*'],
  zustand: ['zustand', 'zustand/*'],
  'react-router': ['react-router', 'react-router-dom'],
};

const message =
  'Import this library only through its common/services/* abstraction, never directly.';

/**
 * Dependency direction (see the README's Architecture section):
 * - `common/` is app-agnostic: it never imports a feature or the shell.
 * - Nothing imports the shell (`src/app/`).
 * - A feature uses another feature only through its public `index.ts`
 *   (meeting's `store` and `alerts` folders are public too).
 */
const FEATURES = [
  'account',
  'auth',
  'brand',
  'landing',
  'legal',
  'meeting',
  'preferences',
];
/** Sub-folders of a feature that others may import, besides its index. */
const PUBLIC_FOLDERS = { meeting: ['store', 'alerts'] };

const UP = '^(\\.\\./)+';
const COMMON_BOUNDARY = [
  {
    regex: `${UP}(features|app)(/|$)`,
    message: 'common/ is shared code: it must not import a feature or the app shell.',
  },
];
const SHELL_BOUNDARY = {
  regex: `${UP}app(/|$)`,
  message: 'Nothing imports the app shell (src/app/).',
};

/** Matches a deep import into `feature`, past its public surface. */
function deepImport(feature, prefix = UP) {
  const open = PUBLIC_FOLDERS[feature] ?? [];
  const allowed = open.length > 0 ? `(?!(${open.join('|')})(/index)?$)` : '';
  return {
    regex: `${prefix}${feature}/${allowed}(?!index$).+`,
    message: `Import ${feature} through its public index.ts, not its internal folders.`,
  };
}

/** The boundary for files inside `feature`: other features' internals and the shell. */
function featureBoundary(feature) {
  return [
    SHELL_BOUNDARY,
    ...FEATURES.filter((f) => f !== feature).map((f) => deepImport(f)),
  ];
}

/** The shell may import any feature, through its public surface. */
const APP_BOUNDARY = FEATURES.map((f) => deepImport(f, '^\\.\\./features/'));

/**
 * Build a no-restricted-imports rule banning every wrapped lib except
 * `exceptKey`, plus the given boundary patterns.
 */
function restrictImports(exceptKey, boundary = []) {
  const patterns = Object.entries(WRAPPED)
    .filter(([key]) => key !== exceptKey)
    .flatMap(([, globs]) => globs);
  return ['error', { patterns: [{ group: patterns, message }, ...boundary] }];
}

/** Per-abstraction exceptions: exactly one wrapped library in its own folder. */
const LIBRARY_HOMES = [
  [['src/common/services/datetime/**'], 'date-fns'],
  [['src/common/services/auth/**', 'src/common/services/database/**'], 'firebase'],
  [['src/common/services/chart/**', 'src/common/components/chart/**'], 'recharts'],
  [['src/common/services/state/**'], 'zustand'],
  [['src/common/services/router/**'], 'react-router'],
];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.yarn/**',
      'datetime-lib-benchmark/**',
      '**/*.config.{js,ts}',
      'eslint.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-exports': [
        'error',
        { restrictDefaultExports: { direct: true, named: true, defaultFrom: true } },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': restrictImports(null),
    },
  },

  // ── Dependency direction between common, features and the shell ──
  {
    files: ['src/common/**'],
    rules: { 'no-restricted-imports': restrictImports(null, COMMON_BOUNDARY) },
  },
  ...FEATURES.map((feature) => ({
    files: [`src/features/${feature}/**`],
    rules: { 'no-restricted-imports': restrictImports(null, featureBoundary(feature)) },
  })),
  {
    files: ['src/app/**'],
    rules: { 'no-restricted-imports': restrictImports(null, APP_BOUNDARY) },
  },

  // ── Per-abstraction overrides: re-enable exactly one library in its folder ──
  ...LIBRARY_HOMES.map(([files, library]) => ({
    files,
    rules: { 'no-restricted-imports': restrictImports(library, COMMON_BOUNDARY) },
  })),

  // Tests may use any helper import freely.
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // Ambient declaration files require interfaces (module augmentation) and
  // default exports (CSS module shims).
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      'no-restricted-exports': 'off',
    },
  },

  eslintConfigPrettier,
);
