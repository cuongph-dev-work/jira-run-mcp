// ---------------------------------------------------------------------------
// Centralized Jira REST API endpoint builders
// All endpoints target Jira REST API v2 (Jira 8 default)
// ---------------------------------------------------------------------------

const API_BASE = "/rest/api/2";

/**
 * URL for a single issue.
 * @example issueUrl("https://jira.co", "PROJ-123")
 *   → "https://jira.co/rest/api/2/issue/PROJ-123"
 */
export function issueUrl(baseUrl: string, issueKey: string): string {
  return `${baseUrl}${API_BASE}/issue/${encodeURIComponent(issueKey)}`;
}

/**
 * URL for the JQL search endpoint.
 */
export function searchUrl(baseUrl: string): string {
  return `${baseUrl}${API_BASE}/search`;
}

/**
 * Fields to request for a full issue (jira_get_issue).
 * Keeping this minimal prevents noisy custom-field payloads.
 */
export const ISSUE_FIELDS: string[] = [
  "summary",
  "description",
  "status",
  "assignee",
  "reporter",
  "priority",
  "issuetype",
  "created",
  "updated",
];

/**
 * Fields to request for a compact issue list (jira_search_issues).
 */
export const SEARCH_FIELDS: string[] = [
  "summary",
  "status",
  "assignee",
  "priority",
  "updated",
];
