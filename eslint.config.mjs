/* The community directory's scanner, run in-repo. The rules it applies are
 * published as eslint-plugin-obsidianmd, so `npm run lint` is the same
 * instrument the directory uses, and a finding fails the gate here before it
 * fails a listing in public. The stylesheet is in scope too, because the
 * scanner reads it. */
import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';
import css from '@eslint/css';

export default defineConfig([
  ...obsidianmd.configs.recommended.map((c) => ({
    files: ['**/*.ts', '**/*.mjs'],
    ...c,
  })),
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.*'],
        },
      },
    },
    plugins: { obsidianmd },
    rules: {
      'obsidianmd/ui/sentence-case': ['warn', {
        brands: ['ICOR', 'Obsidian'],
        acronyms: ['ID'],
      }],
    },
  },
  {
    /* The settings tab implements the 1.13 declarative API and keeps
       `display()` ON PURPOSE as the fallback, which is the case its
       deprecation notice carves out; the directory's own rule reports the
       fallback as bypassed at this floor, which it is, and that is the
       point of a fallback. Inline disables are forbidden by the recommended
       config, so both exemptions live here, scoped to one file. */
    files: ['src/settings/SettingsTab.ts'],
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
      'obsidianmd/settings-tab/no-deprecated-display': 'off',
    },
  },
  {
    files: ['styles.css'],
    plugins: { css },
    language: 'css/css',
    rules: {
      ...css.configs.recommended.rules,
      /* Every value in styles.css is one of Obsidian's variables, which
         the scanner cannot see; it validates the shape and lets the
         names through. */
      'css/no-invalid-properties': ['error', { allowUnknownVariables: true }],
    },
  },
  {
    ignores: ['main.js', 'node_modules/**', 'test/**'],
  },
]);
