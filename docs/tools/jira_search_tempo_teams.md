# jira_search_tempo_teams

Search for Tempo teams by name.

## Purpose

This tool queries the Tempo teams API to find team IDs, names, and their respective team leads. It is particularly useful when you need a team ID to fetch timesheet approvals or view team members but only know the team's name or part of its name.

## Input Schema

- \`query\` (string): The search string to filter teams. Pass an empty string (\`""\`) to retrieve all available teams.

## Output

Returns a Markdown table listing matching teams, their IDs, team leads (display name and username), and whether the team is public.

## Examples

### Search for a Specific Team

**Input:**
\`\`\`json
{
  "query": "Gensai"
}
\`\`\`

### List All Teams

**Input:**
\`\`\`json
{
  "query": ""
}
\`\`\`
