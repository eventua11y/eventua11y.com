module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:playwright/recommended",
    "plugin:astro/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
    parser: "@typescript-eslint/parser",
    extraFileExtensions: [".astro"],
  },
  plugins: [
    "@typescript-eslint",
    "playwright",
  ],
  rules: {
    // Add any custom rules here
    // "astro/no-set-html-directive": "error"
  },
  overrides: [
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
      rules: {
        // Add any custom rules for .astro files here
        // "astro/no-set-html-directive": "error"
      },
    },
  ],
};