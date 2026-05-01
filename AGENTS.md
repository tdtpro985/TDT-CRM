# AGENTS.md

## Scope
Instructions for coding agents working in `TDT-CRM`.
Prioritize small, safe edits and preserve current behavior unless task asks otherwise.

## Repo Layout
- Frontend app: `frontend/` (React + Vite)
- Backend API: `backend/` (Flask + MySQL)
- DB schema source of truth: `backend/database/schema.sql`
- Frontend entrypoint: `frontend/src/main.jsx`
- Preferred backend entrypoint: `backend/app.py`
- Legacy backend file: `backend/main.py`

## Cursor/Copilot Rules
- No `.cursorrules` found.
- No `.cursor/rules/` directory found.
- No `.github/copilot-instructions.md` found.
- If these files appear later, treat them as authoritative local policy.

## Setup Expectations
- Node + npm installed.
- Python 3 + pip installed.
- MySQL running and accessible.
- Backend reads env vars via `python-dotenv`.
- Frontend defaults API base to `http://localhost:5000`.

## Build/Lint/Run Commands
Run from repository root unless noted.

### Frontend
- Install deps: `npm install`
- Start dev server: `npm run dev`
- Build production bundle: `npm run build`
- Preview production build: `npm run preview`
- Lint frontend: `npm run lint`

### Backend (run in `backend/`)
- Install deps: `pip install -r requirements.txt`
- Start API (preferred): `python app.py`
- Start API (legacy): `python main.py`
- Rebuild DB from schema: `python -m database.rebuild_db`
- Clear CRM data tables: `python -m database.clear_db`
- Initialize legacy mock data: `python -m database.init_db`
- Ensure default users exist: `python -m database.bootstrap_users`
- Reset default user passwords: `python -m database.bootstrap_users --reset-passwords`

## Test Commands (Current Reality)
No automated test runner is configured today.
- No test files matching common `test/spec` patterns were found.
- No `pytest.ini` or `pyproject.toml` test config exists.
- No Jest/Vitest configuration exists.
- No `npm test` script exists in root `package.json`.

## Single-Test Commands (When Added)
If you introduce tests, prefer these single-test patterns.

### Pytest
- One file: `pytest tests/test_file.py`
- One test: `pytest tests/test_file.py::test_case_name`

### Vitest
- One file: `npx vitest run src/path/file.test.jsx`
- One test name: `npx vitest run src/path/file.test.jsx -t "test name"`

When adding a test framework, update this file and `README.md` in the same PR.

## API and Data Shape Rules
- Database fields are primarily `snake_case`.
- Frontend-facing JSON is primarily `camelCase`.
- Keep field names stable across backend handlers and frontend consumers.
- Use SQL aliases or explicit mapping for naming conversion.

Common key mappings used in this repo:
- `company_id` -> `companyId`
- `contact_id` -> `contactId`
- `deal_id` -> `dealId`
- `close_date` -> `closeDate`
- `last_touch` -> `lastTouch`

## Code Style
Follow the style already used in touched files.

### JavaScript/JSX
- Use ESM imports.
- 2-space indentation.
- Single quotes.
- Semicolons typically omitted.
- Prefer `const`, use `let` only when reassignment is needed.
- Use clear names; avoid cryptic abbreviations.

### Python
- Import order: stdlib, third-party, local modules.
- 4-space indentation.
- `snake_case` for functions/variables.
- `UPPER_SNAKE_CASE` for module constants.
- Use explicit imports; avoid wildcard imports.

## Imports and Module Boundaries
- Frontend import order: React/hooks, CSS, local modules.
- Keep imports local/relative to match existing patterns.
- Keep React components in `PascalCase` filenames.
- Hooks must be named `useSomething` and remain side-effect focused.
- Avoid circular dependencies across hooks/views/components.

## Typing and Validation
- Repo is JavaScript + Python (no TypeScript).
- Validate required request fields in Flask routes.
- Normalize payloads before storing in state.
- Cast numbers deliberately (for example deal `value`).
- Handle nullable dates consistently (`None` or empty string as expected by caller).

## Naming Conventions
- React components: `PascalCase` (e.g., `DashboardView`).
- JS functions/variables: `camelCase`.
- Python modules/functions: `snake_case`.
- SQL tables/columns: `snake_case`.
- Keep naming consistent within each file and API boundary.

## Error Handling
### Frontend
- Use `apiFetch` for authenticated API calls.
- Check `res.ok` before success flows.
- Show user-safe error messages only.
- Keep optimistic updates only where existing patterns already do.

### Backend
- Validate early and return proper status codes.
- Use parameterized SQL (`%s` placeholders) only.
- Return JSON errors (400/401/403/404/409/500) as appropriate.
- Always close DB connections in `finally` via `close_connection(conn)`.

## Security Rules
- Never commit secrets (`.env`, `credentials.json`, tokens).
- Preserve auth guards (`@jwt_required`, `@admin_required`).
- Preserve rate limits on sensitive endpoints (login/sync).
- Keep password handling hashed (`generate_password_hash`, `check_password_hash`).
- Do not leak stack traces or sensitive internals in API responses.

## Database Change Rules
- Treat `backend/database/schema.sql` as authoritative schema.
- If schema changes, update backend SQL and frontend field usage together.
- Keep compatibility for existing branch/filter/auth behavior.
- Re-check seed and migration scripts after schema edits.

## Linting Notes
- ESLint config lives at `eslint.config.js`.
- Current ignores exclude backend and some frontend paths.
- Lint clean does not guarantee runtime correctness.
- Avoid unrelated lint churn outside touched scope.

## Agent Checklist
Before coding:
- Identify affected view/hook/route/schema files.
- Confirm auth, branch filtering, and payload shape assumptions.

During coding:
- Keep edits focused and reversible.
- Preserve existing response keys and status code semantics.

Before finishing:
- Run `npm run lint`.
- Run relevant app commands for changed surface area.
- Update docs when introducing new commands/conventions.

## Avoid
- Do not make broad architecture rewrites unless explicitly requested.
- Do not silently rename API fields consumed by frontend.
- Do not introduce new frameworks without documenting usage.
