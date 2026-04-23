// ---------------------------------------------------------------------------
// Shared types used across auth, jira, and tool layers
// ---------------------------------------------------------------------------

// Inline Playwright StorageState shape to avoid import resolution issues
export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
}

export interface PlaywrightStorageState {
  cookies?: PlaywrightCookie[];
  origins?: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
}

/**
 * Persisted session file structure.
 * Wraps Playwright StorageState with metadata for freshness checks.
 */
export interface SessionFile {
  /** ISO 8601 timestamp of when the session was last written */
  savedAt: string;
  /** The Jira base URL this session was created against */
  baseUrl: string;
  /** Raw Playwright browser storage state (cookies + localStorage) */
  storageState: PlaywrightStorageState;
}

/**
 * Extracted HTTP-ready cookies from a SessionFile.
 */
export interface SessionCookies {
  /** Value suitable for the Cookie request header */
  cookieHeader: string;
}

// ---------------------------------------------------------------------------
// Jira output shapes — stable, normalized, free of Jira internals
// ---------------------------------------------------------------------------

/** Full issue detail returned by jira_get_issue */
export interface JiraIssue {
  key: string;
  summary: string;
  description: string | null;
  status: string;
  assignee: string | null;
  reporter: string | null;
  priority: string | null;
  issueType: string;
  created: string;
  updated: string;
  url: string;
}

/** Compact issue summary returned inside jira_search_issues */
export interface JiraIssueSummary {
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
  priority: string | null;
  updated: string;
  url: string;
}

/** Top-level result from jira_search_issues */
export interface JiraSearchResult {
  total: number;
  issues: JiraIssueSummary[];
}
