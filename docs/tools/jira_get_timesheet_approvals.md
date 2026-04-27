# jira_get_timesheet_approvals

Fetches timesheet approval records for a given Tempo team and period start date.

## Purpose

Retrieves the current timesheet approval status (open, approved, etc.) and logged hours versus required hours for all members of a specific Tempo team within a given week or period.

## Input Schema

- \`teamId\` (number): The ID of the Tempo team (e.g., 484).
- \`periodStartDate\` (string): Start date of the timesheet period in \`yyyy-MM-dd\` format (e.g., "2026-04-27").

## Output

Returns a Markdown table listing team members, their current timesheet status, logged hours, and required hours for the period.

## Examples

### Fetch Approvals for Team 484 for the Week of April 27, 2026

**Input:**
\`\`\`json
{
  "teamId": 484,
  "periodStartDate": "2026-04-27"
}
\`\`\`
