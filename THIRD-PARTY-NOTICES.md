# Third-party notices

The built `main.js` bundles no third-party code. Everything it needs at
runtime is provided by the host application and is declared external at
build time (`esbuild.config.mjs`): `obsidian`, `@codemirror/state`,
`@codemirror/view` and `@codemirror/language`. `test/hygiene.test.mjs`
checks that the bundle requires exactly those four modules and carries no
`node_modules` path.

## Icons

Lucide icon names are resolved through Obsidian's own icon API at runtime.
No icon assets are bundled.

## Development dependencies

TypeScript, esbuild, ESLint, `eslint-plugin-obsidianmd`, `@eslint/css`,
`typescript-eslint`, `@types/node`, the `obsidian` type package and the
three `@codemirror` type packages are used to build, lint and test the
plugin. None of them ships in a release.

Everything in this plugin is written for it.
