# Jira 8 Internal MCP Design

## Goal

Build a minimal MCP server for an internal Jira 8 instance with the following stack:

- TypeScript
- `@modelcontextprotocol/sdk`
- Express
- Zod
- Streamable HTTP transport
- Playwright for SSO-backed session bootstrap and future browser-driven tools

This phase is intentionally limited to validating the architecture and authentication model, not to implementing a broad Jira integration.

## Scope

Phase 1 includes:

- Streamable HTTP MCP server scaffold
- Jira SSO login bootstrap using Playwright
- Session persistence via locally stored Playwright state/cookies
- HTTP-based Jira API access using the stored authenticated session
- Two read-only tools:
  - `jira_get_issue(issueKey)`
  - `jira_search_issues(jql, limit?)`
- Manual reauthentication flow when the session expires

Phase 1 excludes:

- Write/update Jira operations
- Background auto-refresh of expired sessions
- Full browser-driven Jira tools
- Full custom-field normalization for company-specific Jira schemas
- End-to-end automation of the entire SSO flow in tests

## Constraints

- The Jira instance is internal and uses SSO.
- Standard Jira API token or username/password auth is not viable for the target environment.
- Authentication must rely on browser-derived session cookies or Playwright storage state.
- Playwright is expected to be reused later for additional tools beyond login.
- The design should stay small enough to validate quickly with one or two tools.

## Recommended Approach

Use a hybrid architecture with a strict separation of responsibilities:

- Playwright handles interactive SSO login and saves authenticated browser state locally.
- MCP tools use a normal HTTP client for Jira REST API calls, reusing the persisted session data.
- Session validity is checked centrally before Jira API access.
- Expired sessions produce a deterministic `SESSION_EXPIRED` or `AUTH_REQUIRED` error and instruct the operator to reauthenticate via a dedicated CLI command.

This keeps phase 1 fast and simple while preserving a clean path to future browser-driven tools.

## Alternatives Considered

### 1. HTTP-first with Playwright bootstrap

Playwright is used only for login and reauthentication, while all tools call Jira through HTTP.

Pros:

- Smallest implementation surface
- Fast tool execution
- Clear separation between auth and business logic

Cons:

- Requires explicit session validity detection
- Requires synchronization between stored Playwright state and HTTP requests

### 2. Playwright-first for all tools

All Jira interactions go through a live Playwright browser context.

Pros:

- Mirrors browser-authenticated behavior exactly
- Simplifies edge cases tied to web-only flows

Cons:

- Slow and resource-heavy
- Unnecessarily complex for basic read-only tools
- Poor fit for a lightweight MCP server baseline

### 3. Hybrid by tool type

Read-oriented tools use HTTP, while future UI-dependent tools use Playwright directly.

Pros:

- Best long-term flexibility
- Matches the expected future direction

Cons:

- Requires clear abstraction boundaries up front

### Recommendation

Adopt option 3 as the architectural target, but implement phase 1 in the style of option 1. That yields a clean session layer now without overbuilding the initial tool set.

## Architecture

### Server Layer

`src/server.ts` initializes the MCP server, registers the Streamable HTTP transport, and exposes the first two tools.

Responsibilities:

- Bootstrap config
- Wire auth/session services
- Wire Jira client and tool handlers
- Register MCP tool schemas and handlers

### Config Layer

`src/config.ts` reads and validates environment variables with Zod.

Initial config surface:

- `JIRA_BASE_URL`
- `JIRA_SESSION_FILE`
- `JIRA_VALIDATE_PATH`
- `PLAYWRIGHT_HEADLESS`
- `PLAYWRIGHT_BROWSER`
- `MCP_PORT`
- `LOG_LEVEL`

### Auth Layer

The auth layer is split into focused components:

- `session-store.ts`
  - Read/write the persisted Playwright storage state file
  - Track minimal metadata such as last update time and base URL
- `session-manager.ts`
  - Load current session state
  - Decide whether validation is required
  - Classify expired or missing sessions
- `playwright-auth.ts`
  - Open the browser
  - Run interactive SSO login
  - Persist resulting storage state for later reuse

This boundary matters because later browser-driven tools should be able to reuse the same Playwright session abstraction without coupling tool logic to login logic.

### Jira Access Layer

The Jira integration is intentionally HTTP-first for phase 1.

- `http-client.ts`
  - Build requests against Jira REST endpoints
  - Attach cookies/session state derived from stored Playwright state
  - Detect auth-related failure patterns
- `endpoints.ts`
  - Centralize endpoint builders
- `mappers.ts`
  - Convert Jira response payloads into stable MCP output shapes

### Tool Layer

Two tool modules provide the initial functionality:

- `get-issue.ts`
- `search-issues.ts`

Each tool:

- Validates inputs with Zod
- Delegates auth/session checking to shared services
- Calls the Jira access layer
- Returns compact, stable output

### Error Layer

`src/errors.ts` defines stable internal error categories such as:

- `AUTH_REQUIRED`
- `SESSION_EXPIRED`
- `JIRA_HTTP_ERROR`
- `JIRA_RESPONSE_ERROR`
- `CONFIG_ERROR`

These errors should be easy for both operators and future client code to interpret.

## Authentication Lifecycle

### Bootstrap Login

The initial login flow is handled by a dedicated CLI command:

- `jira-auth-login`

Behavior:

1. Launch Playwright in interactive mode.
2. Navigate to the Jira base URL or a known login entry point.
3. Allow the operator to complete the SSO flow.
4. Persist Playwright `storageState` to the configured session file.
5. Optionally validate the session immediately after saving.

### Runtime Usage

During normal MCP tool execution:

1. Load the persisted session state.
2. Validate it if needed.
3. Use it to construct authenticated HTTP requests to Jira.
4. Return Jira data through normalized tool outputs.

### Expired Session Handling

Phase 1 uses manual reauthentication.

If the session is invalid or expired:

1. Abort the business request.
2. Return a structured auth error.
3. Instruct the operator to rerun `jira-auth-login`.

This is preferred over automatic browser relaunch in phase 1 because:

- It keeps MCP request handling deterministic.
- It avoids long-running or interactive browser activity in the middle of a tool request.
- It is easier to debug in an internal corporate SSO environment.

### Future Upgrade Path

The design intentionally preserves a path to automatic reauthentication later. That can be added by extending the auth orchestrator rather than rewriting the tool or Jira client layers.

## Tool Contracts

### `jira_get_issue`

Input:

- `issueKey: string`

Behavior:

- Fetch a single issue from Jira by key

Output:

- `key`
- `summary`
- `description`
- `status`
- `assignee`
- `reporter`
- `priority`
- `issueType`
- `created`
- `updated`
- `url`

Notes:

- Description may be simplified or reduced to a text-safe representation.
- Company-specific custom fields are out of scope for the first tool version.

### `jira_search_issues`

Input:

- `jql: string`
- `limit?: number`

Behavior:

- Execute a JQL query
- Return a compact issue list for inspection

Output:

- `total`
- `issues[]`

Each item in `issues[]` includes:

- `key`
- `summary`
- `status`
- `assignee`
- `priority`
- `updated`
- `url`

### Validation Rules

- Inputs are validated with Zod.
- Limit values are bounded to a reasonable small maximum for phase 1.
- Output shapes stay compact and stable rather than mirroring raw Jira payloads.

## CLI Utilities

Phase 1 should include three operator-facing commands:

- `jira-auth-login`
  - Run interactive login and store session state
- `jira-auth-check`
  - Validate whether the stored session still works
- `jira-auth-clear`
  - Remove the stored local session state

These commands reduce ambiguity around session management and make the auth flow easy to test manually before broader MCP usage.

## Proposed Project Structure

```text
jira-run-mcp/
├─ package.json
├─ tsconfig.json
├─ .gitignore
├─ .env.example
├─ docs/
│  └─ superpowers/
│     └─ specs/
├─ .jira/
│  └─ session.json
└─ src/
   ├─ server.ts
   ├─ config.ts
   ├─ errors.ts
   ├─ types.ts
   ├─ auth/
   │  ├─ session-store.ts
   │  ├─ session-manager.ts
   │  └─ playwright-auth.ts
   ├─ jira/
   │  ├─ http-client.ts
   │  ├─ endpoints.ts
   │  └─ mappers.ts
   ├─ tools/
   │  ├─ get-issue.ts
   │  └─ search-issues.ts
   └─ cli/
      ├─ auth-login.ts
      ├─ auth-check.ts
      └─ auth-clear.ts
```

## Testing Strategy

Phase 1 testing should focus on confidence without overinvesting in brittle SSO automation.

### Unit Tests

Cover:

- Config validation
- Tool input schemas
- Jira response mappers
- Session classification logic
- Auth-expired detection rules

### Integration Tests

Use mocked Jira HTTP responses to test:

- Successful issue retrieval
- Successful JQL search
- Auth failure mapping
- Unexpected HTML or login-page responses

### Manual Verification

Use the actual internal Jira environment for:

- Interactive SSO login via Playwright
- Session persistence
- Session expiration behavior
- Real execution of the two initial tools

## Risks and Mitigations

### Risk: Corporate SSO flow is not stable in headless mode

Mitigation:

- Default Playwright login to headed mode for the bootstrap command
- Keep browser selection configurable

### Risk: Jira 8 returns non-JSON login or redirect responses when auth expires

Mitigation:

- Centralize auth failure detection in the Jira client/session manager
- Detect `401`, redirect patterns, and login-page HTML responses

### Risk: Session state format may not map cleanly to HTTP cookies

Mitigation:

- Encapsulate cookie extraction and request decoration in one module
- Add validation and logging around malformed or missing session data

### Risk: Jira internal custom fields create noisy payloads

Mitigation:

- Normalize only a minimal stable field set in phase 1
- Leave room for a future debug/raw mode if needed

## Success Criteria

Phase 1 is successful if:

- The MCP server starts over Streamable HTTP.
- An operator can run `jira-auth-login` and establish a reusable Jira session.
- `jira_get_issue` can retrieve a real issue from the internal Jira instance.
- `jira_search_issues` can execute JQL and return a compact list.
- Expired sessions fail cleanly with a reauthentication instruction.
- The architecture remains ready for future Playwright-backed Jira tools.

## Implementation Notes

- Prefer minimal dependencies beyond the requested stack.
- Keep auth logic isolated from tool definitions.
- Do not overfit the first version to unknown Jira customizations.
- Favor explicit, inspectable errors over hidden retries.

## Decision Summary

Build a TypeScript MCP server using Streamable HTTP with:

- Playwright for interactive SSO session bootstrap
- Persisted local session state
- HTTP-first Jira API execution for initial tools
- Manual reauth on session expiration
- Two read-only tools for early validation: `jira_get_issue` and `jira_search_issues`
