# Repository Guidelines

## Project Structure & Module Organization
- `miniprogram/`: WeChat Mini Program source (pages, components, app entry). Key areas: `pages/`, `models/`, `utils/`, `custom-tab-bar/`.
- `cloudfunctions/`: Node.js cloud functions by domain (e.g., `farmer-manage/`, `settlement-manage/`). Each function is a deployable unit.
- `docs/`: Product and technical docs, including business flow, API reference, and deployment guides.
- `typings/`: TypeScript typings for the mini program runtime.
- `project.config.json`: WeChat DevTools project configuration.

## Build, Test, and Development Commands
- `npm install`: Install dependencies used by the mini program UI libraries.
- WeChat DevTools: open the project root and run/preview from the IDE. There is no CLI build script configured in `package.json`.
- Cloud functions deployment: use WeChat DevTools to “Upload and deploy” each function under `cloudfunctions/`.

## Coding Style & Naming Conventions
- Language: TypeScript in `miniprogram/` with strict compiler settings (`tsconfig.json`).
- Indentation: follow existing files (typically 2 spaces in JSON/WXML/WXSS and 2 spaces in TS).
- Naming: use lower-kebab-case for folders, lowerCamelCase for variables/functions, and `PascalCase` for class/type names.
- Keep UI strings and business rules in sync with cloud function data models.

## Testing Guidelines
- No automated test framework is configured. Validate changes via WeChat DevTools preview and cloud function testing tools.
- For cloud functions, prefer “云函数测试” in DevTools with JSON payloads in `cloudfunctions/README.md`.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:` (optional scope like `feat(finance):`).
- PRs should include: clear summary, affected pages/modules, and screenshots for UI changes (mini program pages).
- Link related docs/requirements when modifying business logic or settlement calculations.

## Configuration & Security Notes
- Cloud permissions and indexes are documented in `cloudfunctions/README.md` and `cloudfunctions/database-schema.md`.
- Avoid direct database writes from the client; use cloud functions for all data mutations.
