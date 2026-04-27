# jira_act_on_timesheet_approval

Approve, reject, or reopen a team member's Tempo timesheet for a given period.

## Purpose

This tool allows a reviewer (team lead / PM) to take action on a submitted timesheet directly from the agent. The reviewer identity is automatically resolved from the current authenticated session — no need to pass your own user key.

> [!IMPORTANT]
> This is a **write action**. The agent will ask for your confirmation before calling this tool.

## Supported Actions

| Action | When to use |
|--------|-------------|
| `approve` | Timesheet has been reviewed and is correct |
| `reject` | Timesheet has issues — provide a comment explaining why |
| `reopen` | Revert an approved timesheet to allow changes |

## Input Schema

- `userKey` (string): Jira user key of the team member (e.g., `"lapdq@runsystem.net"`).
- `periodDateFrom` (string): Start date of the timesheet period in `yyyy-MM-dd` format (e.g., `"2026-04-20"`).
- `action` (string): One of `"approve"`, `"reject"`, or `"reopen"`.
- `comment` (string, optional): Accompanying comment. Recommended when rejecting.

## Output

Returns a confirmation table showing the action taken, the affected user, period, reviewer, and comment.

## Examples

### Approve a Timesheet

**Input:**
```json
{
  "userKey": "lapdq@runsystem.net",
  "periodDateFrom": "2026-04-20",
  "action": "approve",
  "comment": "ok"
}
```

### Reject a Timesheet with Reason

**Input:**
```json
{
  "userKey": "lapdq@runsystem.net",
  "periodDateFrom": "2026-04-20",
  "action": "reject",
  "comment": "Missing 8h on Tuesday. Please check and resubmit."
}
```

## Typical Workflow

1. `jira_search_tempo_teams` — find team ID
2. `jira_get_timesheet_approvals` — see who has submitted
3. `jira_get_timesheet_approval_log` — review action history
4. `jira_search_worklogs` — inspect actual logged hours
5. **`jira_act_on_timesheet_approval`** — approve or reject
