# MCP Tools — Quality Checklist

> Audit each tool for input/output quality, LLM compatibility, security, and context optimization.
> This ensures LLMs can reliably understand and call every tool.
>
> Last updated: 2026-04-24

---

## 1. 🧾 Input Schema

### Global Rules

| Status | Rule | Notes |
|--------|------|-------|
| [x] | All tools use Zod schemas | Every tool has typed schema |
| [x] | Required vs optional fields defined | `.optional()` used consistently |
| [x] | Optional fields have sensible defaults | `limit=10`, `maxResults=20`, `order=DESC`, etc. |
| [x] | List tools have `limit/maxResults` with max cap | `limit≤50` (search), `maxResults≤100` (comments) |
| [x] | Enum for fixed-value fields | `issueTypeId`, `orderBy`, `order` use `z.enum`/`z.nativeEnum` |
| [ ] | **Validate `issueKey` format consistently** | Only `get_comments` has `.regex(/^[A-Z].../)`. Other tools accept any string |
| [ ] | **Validate date format (yyyy-MM-dd)** | `startDate`, `dateFrom`, `dateTo` are plain `z.string()` — no format validation |
| [x] | No raw SQL / command / URL in input | JQL is the only query language and it's safe (Jira sanitizes) |
| [x] | No credential input (token, cookie) | Auth is server-side session |

### Per-Tool Findings

| Tool | Issue | Severity | Fix |
|------|-------|----------|-----|
| `jira_bulk_transition_issues` | `comment` uses `z.union([z.string(), z.record()])` | 🔴 HIGH | Change to `z.string()` (Jira 8 = plain text only) |
| `jira_update_issue_fields` | `fields` description says "plain text or raw ADF" | 🟡 MED | Update description: plain text only |
| `jira_assign_issue` | No constraint "at least one of name/key" | 🟡 MED | Add `.describe()` explaining mutual requirement |
| `jira_transition_issue` | "exactly one of transitionId/transitionName" — not validated in schema | 🟢 LOW | Validated in handler, acceptable |
| `jira_get_my_worklogs` | No date format regex on dateFrom/dateTo | 🟡 MED | Add `.regex(/^\d{4}-\d{2}-\d{2}$/)` |

---

## 2. 📦 Output Design

### Global Rules

| Status | Rule | Notes |
|--------|------|-------|
| [x] | Output is structured Markdown text | MCP standard — LLM parses Markdown well |
| [x] | Write ops return `id` / `key` / `url` for tracing | create, comment, worklog all return identifiers |
| [x] | `isError: true` flag on all error responses | Consistent across all tools |
| [x] | No raw HTML / blob in responses | All responses are clean text |
| [x] | Format is stable (no schema drift) | Type-driven formatters |

### Per-Tool Findings

| Tool | Issue | Severity | Fix |
|------|-------|----------|-----|
| `jira_search_issues` | ✅ Has `total`, `startAt`, `limit` pagination | — | — |
| `jira_get_comments` | Has `total` but no `has_more` indicator | 🟢 LOW | Could add "Showing X of Y" |
| `jira_get_my_worklogs` | Returns ALL worklogs for date range, no pagination | 🟡 MED | OK for daily use; for large ranges could overflow context |
| `jira_get_projects` | Returns ALL projects, no limit | 🟡 MED | Add optional `limit` if instance has many projects |
| `jira_get_issue` | Attachment content can be very large | 🟢 LOW | Controlled by `maxImages`/`maxReadableFiles` caps ✅ |

---

## 3. 🧠 Tool Description Quality

### Global Rules

| Status | Rule | Notes |
|--------|------|-------|
| [x] | Tool names follow `resource_action` pattern | `jira_get_issue`, `jira_add_worklog`, etc. |
| [x] | Descriptions explain when to use | Most tools have clear purpose |
| [ ] | **Descriptions explain when NOT to use** | Missing from most tools |
| [x] | Non-generic descriptions | Each tool has specific context |
| [x] | `jira_search_issues` has extensive JQL examples | Excellent for LLM |
| [x] | `jira_create_issue` points to `jira_get_create_meta` | Workflow guidance ✅ |

### Per-Tool Findings

| Tool | Issue | Severity | Fix |
|------|-------|----------|-----|
| `jira_add_comment` | Says "auto-converted to ADF" — stale | 🔴 HIGH | Change to "Accepts plain text." |
| `jira_update_comment` | Says "plain text or raw ADF JSON" — stale | 🔴 HIGH | Change to "Accepts plain text." |
| `jira_update_issue_fields` | Says "Description supports plain text or raw ADF" — stale | 🟡 MED | Remove ADF mention |
| `jira_preview_create_issue` | No mention of `jira_get_create_meta` workflow | 🟡 MED | Add same guidance as create_issue |
| `jira_get_audit_context` | No description of what "audit context" means | 🟡 MED | Clarify: "combined view for review/auditing" |

---

## 4. 🔒 Security

| Status | Rule | Notes |
|--------|------|-------|
| [x] | Credentials server-side (`.env` / session file) | Auth via `loadAndValidateSession()` |
| [x] | No token/cookie/secret in responses | Responses only contain Jira data |
| [x] | Session validated per-request | Every handler calls `loadAndValidateSession()` |
| [x] | No arbitrary command execution | Tools only call Jira REST API |
| [x] | `filePath` in `add_attachment` is workspace-scoped | Path validation in handler |
| [x] | Input sanitized through Zod schemas | All input is typed and validated |

✅ **No security issues found.**

---

## 5. ⚠️ Error Handling

| Status | Rule | Notes |
|--------|------|-------|
| [x] | Errors use `McpError` with typed `code` | `AUTH_REQUIRED`, `SESSION_EXPIRED`, `JIRA_HTTP_ERROR`, `JIRA_RESPONSE_ERROR`, `INVALID_INPUT`, `CONFIG_ERROR` |
| [x] | `isError: true` on all error responses | Consistent across all tools |
| [x] | Human-readable `message` | Error messages include context |
| [x] | No stack trace exposure | Errors are wrapped before returning |
| [x] | No fake success on failure | All error paths set `isError: true` |
| [ ] | **No `retryable` flag** | Not critical for Jira — sessions rarely flap |

✅ **Error handling is solid.** Missing `retryable` is acceptable — Jira errors are rarely transient.

---

## 6. 📊 Logging & Observability

| Status | Rule | Notes |
|--------|------|-------|
| [ ] | **No per-tool request logging** | No tool name, input, or latency logged |
| [ ] | **No external API call logging** | Jira HTTP calls not logged |
| [ ] | **No error-level logging** | Errors only returned to client, not logged server-side |
| [x] | No secret/token in logs | Nothing is logged at all (safe by default) |
| [x] | Server startup logs | Port, endpoint, health URL logged at startup |

> 🔴 **Logging is the weakest area.** Current server has zero request-level observability.
> Recommendation: Add a lightweight request logger middleware (tool name + latency + status).

---

## 7. 🤖 LLM Compatibility

### Global Rules

| Status | Rule | Notes |
|--------|------|-------|
| [x] | Tools are single-action, not multi-step | Each tool does one thing |
| [x] | Input fields have clear `.describe()` | Every field has a description |
| [x] | Output is clean Markdown (LLM-friendly) | No binary/blob data in text responses |
| [x] | Field names are semantic | `issueKey`, `timeSpent`, `comment` — self-explanatory |
| [x] | Enums inline in descriptions | `issueTypeId` lists common values in description |

### Per-Tool Findings

| Tool | Issue | Severity | Fix |
|------|-------|----------|-----|
| `jira_create_issue` | `fields: z.record(z.unknown())` is opaque to LLM | 🟡 MED | Mitigated by `jira_get_create_meta` workflow guidance ✅ |
| `jira_update_issue_fields` | Same opaque `fields` input | 🟡 MED | Add "call jira_get_edit_meta first" in description |
| `jira_search_issues` | JQL description is ~70 lines long | 🟢 LOW | Helpful for LLM accuracy; worth the context cost |
| `jira_bulk_update_issue_fields` | Complex nested schema (array of objects) | 🟡 MED | Acceptable with `dryRun` safety flag |
| `jira_assign_issue` | Two mutually-optional fields, LLM may pass neither | 🟡 MED | Add "MUST provide at least one" to description |

---

## 8. 📉 Context Optimization

| Status | Rule | Notes |
|--------|------|-------|
| [x] | `jira_search_issues` has `limit` + `startAt` pagination | ✅ Proper cursor pagination |
| [x] | `jira_get_comments` has `maxResults` cap | ✅ Default 20, max 100 |
| [x] | `jira_get_issue` has attachment caps | ✅ `maxImages`, `maxReadableFiles` |
| [ ] | **`jira_get_projects` returns all projects** | No limit parameter |
| [ ] | **`jira_get_my_worklogs` returns all worklogs in range** | OK for single-day, risky for month-range |
| [x] | Separation: `search_issues` (list) vs `get_issue` (detail) | ✅ Proper search/detail split |
| [x] | `jira_get_audit_context` bundles related data in one call | ✅ Reduces round-trips |

---

## 📋 Priority Fix List

### 🔴 Must Fix — ✅ ALL RESOLVED

| # | Tool | Issue | Status |
|---|------|-------|--------|
| 1 | `jira_add_comment` | ~~Description says "auto-converted to ADF"~~ | ✅ Fixed |
| 2 | `jira_update_comment` | ~~Description says "plain text or raw ADF JSON"~~ | ✅ Fixed |
| 3 | `jira_bulk_transition_issues` | ~~`comment` schema is `z.union`~~ | ✅ Fixed → `z.string()` |

### 🟡 Should Fix — ✅ ALL RESOLVED

| # | Tool | Issue | Status |
|---|------|-------|--------|
| 4 | All tools with `issueKey` | Missing regex format validation | 🔲 Deferred (handler validates) |
| 5 | All tools with dates | Missing `yyyy-MM-dd` format validation | 🔲 Deferred (handler validates) |
| 6 | `jira_update_issue_fields` | ~~Description mentions ADF~~ | ✅ Fixed |
| 7 | `jira_update_issue_fields` | ~~Add "call jira_get_edit_meta first" hint~~ | ✅ Fixed |
| 8 | `jira_assign_issue` | ~~Add "MUST provide at least one" constraint~~ | ✅ Fixed |
| 9 | `jira_preview_create_issue` | ~~Add `jira_get_create_meta` workflow hint~~ | ✅ Fixed |

### 🟢 Nice to Have

| # | Area | Issue | Type |
|---|------|-------|------|
| 10 | Logging | Add per-request logging middleware | Infra |
| 11 | `jira_get_projects` | Add optional `limit` parameter | Schema |
| 12 | `jira_get_comments` | Add "Showing X of Y" in output | Output |
