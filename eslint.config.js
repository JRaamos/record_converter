import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['node_modules/**', 'dist/**', 'release/**', 'test-results/**', 'playwright-report/**', 'tmp/**'] },
  js.configs.recommended,
  { files: ['**/*.{js,jsx,cjs}'], languageOptions: { ecmaVersion: 'latest', globals: {...globals.node,...globals.browser}, parserOptions: {ecmaFeatures: {jsx:true}} }, rules: {'no-unused-vars': ['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^[A-Z_]'}]} }
];
