module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:playwright/recommended',
    'plugin:astro/recommended',
    'plugin:vue/vue3-recommended', // Add Vue 3 support
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest', // Update to latest instead of 12
    sourceType: 'module',
    extraFileExtensions: ['.astro', '.vue'], // Add .vue extension
  },
  plugins: [
    '@typescript-eslint',
    'playwright',
    'vue', // Add Vue plugin
  ],
  overrides: [
    {
      // Astro files
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
      rules: {
        '@typescript-eslint/triple-slash-reference': 'off',
      },
    },
    {
      // Type definition files
      files: ['*.d.ts'],
      rules: {
        '@typescript-eslint/triple-slash-reference': 'off',
      },
    },
    {
      // Vue files
      files: ['*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  ],
  rules: {
    'vue/multi-word-component-names': 'off', // Optional: if you want to allow single-word component names
    'vue/require-default-prop': 'error', // Recommended for better prop definitions
    'vue/component-api-style': ['error', ['script-setup']], // Enforce script setup syntax
  },
};
