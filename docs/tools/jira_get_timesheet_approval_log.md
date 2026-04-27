# jira_get_timesheet_approval_log

Retrieve the approval action history (submit/approve/reject timeline) for all members of a Tempo team in a given period.

## Purpose

This tool fetches the full audit trail of timesheet approval actions — submissions, approvals, rejections, and reopens — for a team. Unlike `jira_get_timesheet_approvals` which shows the _current_ status, this tool shows **who did what and when**, including reviewer and actor details and any comments.

## Input Schema

- `teamId` (number): The ID of the Tempo team (e.g., 115).
- `periodStartDate` (string): Start date of the timesheet period in `yyyy-MM-dd` format (e.g., "2026-04-20").

## Output

Returns a Markdown report per team member showing:
- Period and hours submitted vs required
- A timeline table of actions: action type, actor, reviewer, comment, timestamp

Members who have not performed any action yet are listed as inactive.

## Status Icons

| Icon | Meaning |
|------|---------|
| 📤  | Submitted |
| ✅  | Approved |
| ❌  | Rejected |
| 🔄  | Reopened |

## Examples

### Fetch Approval Log for Team 115 (Week of April 20, 2026)

**Input:**
```json
{
  "teamId": 115,
  "periodStartDate": "2026-04-20"
}
```

## See Also

- `jira_get_timesheet_approvals` — current approval statuses (not history)
- `jira_search_tempo_teams` — find team IDs by name
