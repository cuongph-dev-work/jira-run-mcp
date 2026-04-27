# jira_search_worklogs

Search Tempo worklogs for one or more workers across a date range.

## Purpose

This tool queries the Tempo `POST /worklogs/search` endpoint to retrieve all worklog entries for specified team members within a given period. It is useful for reviewing time-tracking data, generating reports, or checking what work was logged by specific people.

Unlike `jira_get_my_worklogs` (which only fetches the current user's logs), this tool supports **multiple workers** in a single call.

## Input Schema

- `dateFrom` (string): Start of date range in `yyyy-MM-dd` format (e.g., `"2026-04-20"`).
- `dateTo` (string): End of date range inclusive in `yyyy-MM-dd` format (e.g., `"2026-04-26"`).
- `workers` (string[]): One or more Jira usernames or user keys. At least one is required.

## Output

Returns a Markdown table with:
- Worklog ID, date, issue key + summary (truncated), time spent, process, type of work, comment
- Total entry count and total hours for the period

## Examples

### Fetch Worklogs for One Worker (One Week)

**Input:**
```json
{
  "dateFrom": "2026-04-20",
  "dateTo": "2026-04-26",
  "workers": ["ducnpp@runsystem.net"]
}
```

### Fetch Worklogs for Multiple Workers

**Input:**
```json
{
  "dateFrom": "2026-04-20",
  "dateTo": "2026-04-26",
  "workers": ["ducnpp@runsystem.net", "quocpa@runsystem.net", "nhintt@runsystem.net"]
}
```

## See Also

- `jira_get_my_worklogs` — fetch worklogs for the currently authenticated user only
- `jira_add_worklog` — log time on a Jira issue
- `jira_get_timesheet_approvals` — check timesheet approval statuses for a team
