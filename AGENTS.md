# Repository Guidelines

## Project Structure & Module Organization

- This directory currently has no application code, assets, dependency manifests, or build configuration. Establish the project structure when adding the first implementation.
- Suggested layout: `src/` for application code, `tests/` for automated tests, `assets/` for static resources, and `docs/` for technical documentation. Create only directories the project needs.
- Group related functionality by feature and keep shared utilities separate from feature-specific code.

## Build, Test, and Development Commands

- No installation, development, build, lint, or test commands are configured yet.
- When selecting a toolchain, document exact setup and execution commands in `README.md` and commit the appropriate dependency lockfile.
- If adopting npm, define scripts before documenting commands such as `npm run dev`, `npm run build`, and `npm test`.
- Document file-scoped test and lint commands when the selected tools support them.

## Coding Style & Naming Conventions

- No language, formatter, or linter has been selected. Add configuration alongside the initial source code.
- Until then, use consistent indentation within each file and descriptive names for modules, functions, and variables.
- Adopt language-appropriate naming conventions and enforce them through the chosen tooling.

## Testing Guidelines

- No testing framework or coverage threshold is configured.
- Add tests for core behavior and bug fixes as functionality is introduced. Follow the selected framework's naming convention, such as `converter.test.ts` for a TypeScript test suite.
- Document test prerequisites and commands, including any required fixtures.

## Commit & Pull Request Guidelines

- This directory is not initialized as a Git repository; no existing commit convention can be inferred.
- Use concise, imperative commit subjects, for example `Add conversion input validation`.
- Pull requests should describe the change, record validation performed, link relevant issues, and include screenshots for visual changes.
- AI-assisted commits must include a `Co-Authored-By` trailer identifying the assisting model.

## Security & Configuration

- Keep credentials and local configuration out of version control. Provide placeholder values in an example configuration file when needed.
- Update this guide as actual tooling and conventions are established.
