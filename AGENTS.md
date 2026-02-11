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

## 业务术语（必须牢记）
- **负责人（firstManager / secondManager）**：指副总，不是助理。负责人字段记录的是管理该片区的副总姓名。
- **助理（assistant）**：指实际操作农户签约、发苗的助理人员，对应 users 表中 role='assistant' 的用户。助理通过 createBy 字段关联农户，助理登录后只能看到自己 createBy 的农户。
- 两者是完全不同的角色，不要混淆。
