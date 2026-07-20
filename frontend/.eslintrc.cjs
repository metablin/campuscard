module.exports = {
  root: true,
  env: { browser: true, es2023: true },
  extends: ['plugin:@vkontakte/eslint-plugin/react-typescript'],
  plugins: ['import'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    react: { version: 'detect' },
  },
  ignorePatterns: ['dist', 'node_modules', 'vite.config.ts'],
  rules: {
    // Vite + React 17+ JSX transform: React в scope не нужен
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    // Vite-шаблон использует non-null assertion для #root
    '@typescript-eslint/no-non-null-assertion': 'off',
    // стандартные значения (пустота массива/строки, индексы, slice) — не магия
    '@typescript-eslint/no-magic-numbers': [
      'error',
      { ignoreNumericLiteralTypes: true, ignoreEnums: true, ignore: [0, 1] },
    ],
  },
};
