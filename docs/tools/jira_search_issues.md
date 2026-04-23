# jira_search_issues

Execute a JQL (Jira Query Language) query and return a compact list of matching issues.

## When to Use

- User asks to find issues matching certain criteria (status, assignee, project, etc.)
- You need to discover related tickets before making changes
- User asks "what are the open bugs in project X?"
- You need to find recently updated issues or issues assigned to someone
- You need an overview of a project's backlog or sprint

## Input

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `jql` | `string` | ✅ | — | JQL query string |
| `limit` | `number` | ❌ | `10` | Max results to return (1–50) |

### JQL Quick Reference

| Goal | JQL Example |
|------|-------------|
| Issues in a project | `project = PROJ` |
| Open bugs | `project = PROJ AND issuetype = Bug AND status != Done` |
| Assigned to someone | `assignee = "alice.smith"` |
| Updated recently | `project = PROJ AND updated >= -7d` |
| High priority open | `priority in (High, Highest) AND status != Done` |
| Current sprint | `project = PROJ AND sprint in openSprints()` |
| Created this week | `project = PROJ AND created >= startOfWeek()` |
| Text search | `project = PROJ AND text ~ "login timeout"` |
| Combined | `project = PROJ AND issuetype = Bug AND priority = High AND status = Open ORDER BY updated DESC` |

### Validation Rules

- `jql` must be non-empty
- `limit` must be an integer between 1 and 50 (inclusive)
- If `limit` is omitted, defaults to 10

## Output

Returns a markdown-formatted text block with:

### Summary Header
| Field | Type | Description |
|-------|------|-------------|
| `jql` | `string` | The JQL query that was executed |
| `total` | `number` | Total number of matching issues in Jira |
| `showing` | `number` | Number of issues returned (≤ limit) |

### Each Issue
| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Issue key |
| `summary` | `string` | Issue title |
| `status` | `string` | Current status name |
| `assignee` | `string \| null` | Assignee display name |
| `priority` | `string \| null` | Priority name |
| `updated` | `string` | ISO 8601 last update timestamp |
| `url` | `string` | Direct browser URL |

## Error Cases

| Error Code | Meaning | Action |
|------------|---------|--------|
| `AUTH_REQUIRED` | No session file found | Run `npm run jira-auth-login` |
| `SESSION_EXPIRED` | Session cookies expired | Run `npm run jira-auth-login` |
| `JIRA_HTTP_ERROR` | Jira rejected the query (e.g. 400 = invalid JQL) | Fix JQL syntax |
| `JIRA_RESPONSE_ERROR` | Unexpected response shape | Report to maintainer |

All errors return `isError: true` in the MCP response.

## Example

**Request:**
```json
{
  "name": "jira_search_issues",
  "arguments": {
    "jql": "project = PROJ AND status = Open ORDER BY priority DESC",
    "limit": 5
  }
}
```

**Success Response (text content):**
```markdown
# Jira Search Results

**JQL:** `project = PROJ AND status = Open ORDER BY priority DESC`
**Total:** 23 issue(s) found | Showing: 5

## PROJ-101: Critical auth bypass in admin panel
**Status:** Open | **Priority:** Highest | **Assignee:** Alice Smith
**Updated:** 2024-01-20T15:30:00.000Z
**URL:** https://jira.yourcompany.com/browse/PROJ-101

## PROJ-89: Dashboard loading timeout
**Status:** Open | **Priority:** High | **Assignee:** Unassigned
**Updated:** 2024-01-19T09:00:00.000Z
**URL:** https://jira.yourcompany.com/browse/PROJ-89
```
