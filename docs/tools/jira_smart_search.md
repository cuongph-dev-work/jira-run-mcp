# jira_smart_search

Search Jira with an issue key, explicit JQL, or natural-language filters.

## When to Use

- User gives an issue key and expects the matching issue
- User gives valid JQL and wants it executed directly
- User asks for common searches without writing JQL, such as "open bugs assigned to me"
- You want a safer first search before falling back to hand-written JQL

## Input

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | `string` | yes | - | Issue key, explicit JQL, or natural-language search text |
| `mode` | `"auto" \| "jql" \| "smart"` | no | `"auto"` | Detection mode |
| `project` | `string` | no | - | Jira project key, e.g. `DNIEM` |
| `issueType` | `string` | no | - | Exact Jira issue type, e.g. `Bug`, `Task`, `Story` |
| `status` | `string` | no | - | Exact Jira status name |
| `assignee` | `string` | no | - | Assignee name, `me`, or `unassigned` |
| `text` | `string` | no | - | Explicit text search term |
| `updatedWithinDays` | `number` | no | - | Add `updated >= -Nd` |
| `createdWithinDays` | `number` | no | - | Add `created >= -Nd` |
| `hasAttachmentType` | `string` | no | - | Add ScriptRunner `hasAttachments("<type>")` |
| `includeDone` | `boolean` | no | `false` | Allows done results when natural intent says open |
| `limit` | `number` | no | `10` | Max results, 1-50 |
| `startAt` | `number` | no | `0` | Pagination offset |
| `orderBy` | `"updated" \| "created" \| "priority" \| "issuekey"` | no | `"updated"` | Sort field for generated JQL |
| `order` | `"ASC" \| "DESC"` | no | `"DESC"` | Sort order for generated JQL |

## Auto Detection

`mode: "auto"` chooses behavior in this order:

1. Issue key, e.g. `DNIEM-42` -> direct issue lookup
2. Explicit JQL, e.g. `project = DNIEM AND status = Open` -> run unchanged
3. Natural-language text -> generate JQL from supported filters

## Smart Phrases

| User phrase | Generated JQL fragment |
|-------------|------------------------|
| `open`, `active`, `unresolved` | `statusCategory != Done` |
| `done`, `closed`, `resolved` | `statusCategory = Done` |
| `in progress` | `statusCategory = "In Progress"` |
| `to do` | `statusCategory = "To Do"` |
| `bug`, `bugs` | `issuetype = Bug` |
| `task`, `tasks` | `issuetype = Task` |
| `story`, `stories` | `issuetype = Story` |
| `assigned to me`, `my issues` | `assignee = currentUser()` |
| `unassigned` | `assignee is EMPTY` |
| `updated last 7 days` | `updated >= -7d` |
| `created last 7 days` | `created >= -7d` |
| `has pdf attachment` | `issueFunction in hasAttachments(pdf)` |

If no smart phrase is detected, the tool falls back to `text ~ "<query>"`.

## Output

Returns markdown with:

- Detection mode and generated/executed JQL
- Total result count and pagination range
- Compact issue rows with key, summary, type, status, priority, assignee, dates, and URL
- Navigation hints for full issue details or the next page

Errors always return `isError: true`.

## Examples

**Natural-language search:**

```json
{
  "name": "jira_smart_search",
  "arguments": {
    "query": "open bugs assigned to me updated last 7 days",
    "project": "DNIEM",
    "limit": 10
  }
}
```

Generated JQL:

```jql
project = DNIEM AND issuetype = Bug AND statusCategory != Done AND assignee = currentUser() AND updated >= -7d ORDER BY updated DESC
```

**Explicit JQL:**

```json
{
  "name": "jira_smart_search",
  "arguments": {
    "query": "project = DNIEM AND priority = High ORDER BY updated DESC",
    "mode": "jql"
  }
}
```

**Issue key lookup:**

```json
{
  "name": "jira_smart_search",
  "arguments": {
    "query": "DNIEM-42"
  }
}
```
