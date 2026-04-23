# jira_get_issue

Fetch a single Jira issue by its key and return full details.

## When to Use

- User asks about a specific Jira ticket (e.g. "what's the status of PROJ-123?")
- You need to understand the context, description, or current state of an issue
- You need to check who is assigned to or reported a ticket
- Before making code changes related to a ticket, to understand requirements

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issueKey` | `string` | ✅ | Jira issue key in `PROJECT-NUMBER` format (e.g. `PROJ-123`, `DEV-42`) |

### Validation Rules

- Must match pattern: `^[A-Z][A-Z0-9_]+-\d+$`
- Project prefix must start with an uppercase letter
- Number must be a positive integer
- Examples: `PROJ-1`, `MY_PROJ-999`, `AB-42`

## Output

Returns a markdown-formatted text block with:

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Issue key (e.g. `PROJ-123`) |
| `summary` | `string` | Issue title |
| `description` | `string \| null` | Full description (plain text, ADF converted) |
| `status` | `string` | Current status name (e.g. `Open`, `In Progress`, `Done`) |
| `assignee` | `string \| null` | Display name of assignee, or `null` if unassigned |
| `reporter` | `string \| null` | Display name of reporter |
| `priority` | `string \| null` | Priority name (e.g. `High`, `Medium`, `Low`) |
| `issueType` | `string` | Issue type (e.g. `Bug`, `Task`, `Story`, `Epic`) |
| `created` | `string` | ISO 8601 creation timestamp |
| `updated` | `string` | ISO 8601 last update timestamp |
| `url` | `string` | Direct browser URL to the issue |

## Error Cases

| Error Code | Meaning | Action |
|------------|---------|--------|
| `AUTH_REQUIRED` | No session file found | Run `npm run jira-auth-login` |
| `SESSION_EXPIRED` | Session cookies expired | Run `npm run jira-auth-login` |
| `JIRA_HTTP_ERROR` | Jira returned non-2xx (e.g. 404 = issue not found) | Check issue key |
| `JIRA_RESPONSE_ERROR` | Unexpected response shape | Report to maintainer |

All errors return `isError: true` in the MCP response.

## Example

**Request:**
```json
{
  "name": "jira_get_issue",
  "arguments": {
    "issueKey": "PROJ-123"
  }
}
```

**Success Response (text content):**
```markdown
# PROJ-123: Fix login timeout on SSO redirect

**Type:** Bug
**Status:** In Progress
**Priority:** High
**Assignee:** Alice Smith
**Reporter:** Bob Jones
**Created:** 2024-01-15T10:00:00.000Z
**Updated:** 2024-01-20T15:30:00.000Z
**URL:** https://jira.yourcompany.com/browse/PROJ-123

## Description

Users are experiencing a timeout when the SSO redirect takes longer than 30 seconds.
```
