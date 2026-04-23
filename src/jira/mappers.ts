import type { JiraIssue, JiraIssueSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Raw Jira types (partial — only fields we request)
// ---------------------------------------------------------------------------

interface RawIssueFields {
  summary?: string;
  description?: RawDescription | string | null;
  status?: { name?: string };
  assignee?: { displayName?: string } | null;
  reporter?: { displayName?: string } | null;
  priority?: { name?: string } | null;
  issuetype?: { name?: string };
  created?: string;
  updated?: string;
}

interface RawIssue {
  key: string;
  fields?: RawIssueFields;
  self?: string;
}

// Jira 8 description can be plain text or Atlassian Document Format (ADF)
interface RawDescription {
  type?: string;
  content?: RawAdfNode[];
  text?: string;
  version?: number;
}

interface RawAdfNode {
  type?: string;
  text?: string;
  content?: RawAdfNode[];
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/**
 * Maps a raw Jira issue payload to the stable JiraIssue output shape.
 */
export function mapIssue(raw: RawIssue, baseUrl: string): JiraIssue {
  const f = raw.fields ?? {};
  return {
    key: raw.key,
    summary: f.summary ?? "(no summary)",
    description: extractDescription(f.description),
    status: f.status?.name ?? "Unknown",
    assignee: f.assignee?.displayName ?? null,
    reporter: f.reporter?.displayName ?? null,
    priority: f.priority?.name ?? null,
    issueType: f.issuetype?.name ?? "Unknown",
    created: f.created ?? "",
    updated: f.updated ?? "",
    url: `${baseUrl}/browse/${raw.key}`,
  };
}

/**
 * Maps a raw Jira issue to the compact JiraIssueSummary shape.
 */
export function mapIssueSummary(raw: RawIssue, baseUrl: string): JiraIssueSummary {
  const f = raw.fields ?? {};
  return {
    key: raw.key,
    summary: f.summary ?? "(no summary)",
    status: f.status?.name ?? "Unknown",
    assignee: f.assignee?.displayName ?? null,
    priority: f.priority?.name ?? null,
    updated: f.updated ?? "",
    url: `${baseUrl}/browse/${raw.key}`,
  };
}

// ---------------------------------------------------------------------------
// Internal: description extraction
// ---------------------------------------------------------------------------

/**
 * Converts Jira 8 description to plain text.
 * Handles both plain-string and Atlassian Document Format (ADF) payloads.
 */
function extractDescription(
  raw: RawDescription | string | null | undefined
): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") return raw.trim() || null;
  // ADF document
  return extractAdfText(raw).trim() || null;
}

function extractAdfText(node: RawAdfNode): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content
    .map((child) => extractAdfText(child))
    .join(node.type === "paragraph" || node.type === "heading" ? "\n" : "");
}
