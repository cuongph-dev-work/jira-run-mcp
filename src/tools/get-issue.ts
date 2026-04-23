import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { isMcpError } from "../errors.js";
import type { Config } from "../config.js";
import type { JiraIssue } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const getIssueSchema = z.object({
  issueKey: z
    .string()
    .min(1, "issueKey is required")
    .regex(/^[A-Z][A-Z0-9_]+-\d+$/, "issueKey must be a valid Jira key (e.g. PROJ-123)"),
});

export type GetIssueInput = z.infer<typeof getIssueSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * MCP tool handler for `jira_get_issue`.
 * Validates session, fetches the issue, and returns normalized content.
 */
export async function handleGetIssue(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = getIssueSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { issueKey } = parsed.data;

  let sessionCookies;
  try {
    sessionCookies = await loadAndValidateSession(
      cfg.JIRA_SESSION_FILE,
      cfg.JIRA_BASE_URL,
      cfg.JIRA_VALIDATE_PATH
    );
  } catch (err: unknown) {
    if (isMcpError(err)) {
      return authErrorContent(err.code, err.message);
    }
    throw err;
  }

  const client = new JiraHttpClient(cfg.JIRA_BASE_URL, sessionCookies);

  try {
    const issue = await client.getIssue(issueKey);
    return {
      content: [
        {
          type: "text",
          text: formatIssue(issue),
        },
      ],
    };
  } catch (err: unknown) {
    if (isMcpError(err)) {
      return errorContent(`[${err.code}] ${err.message}`);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatIssue(issue: JiraIssue): string {
  const lines: string[] = [];

  console.log(JSON.stringify(issue, null, 2));

  // ── Header ──────────────────────────────────────────────────────────────
  lines.push(`# ${issue.key}: ${issue.summary}`);
  lines.push(``);
  lines.push(`**URL:** ${issue.url}`);
  lines.push(``);

  // ── Classification ───────────────────────────────────────────────────────
  lines.push(`## Details`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **Type** | ${issue.issueType} |`);
  lines.push(`| **Status** | ${issue.status} |`);
  if (issue.resolution) {
    lines.push(`| **Resolution** | ${issue.resolution} |`);
  }
  lines.push(`| **Priority** | ${issue.priority ?? "—"} |`);
  if (issue.projectStages) {
    lines.push(`| **Project Stages** | ${issue.projectStages} |`);
  }
  if (issue.severity) {
    lines.push(`| **Severity** | ${issue.severity} |`);
  }
  if (issue.labels.length > 0) {
    lines.push(`| **Labels** | ${issue.labels.join(", ")} |`);
  }
  if (issue.components.length > 0) {
    lines.push(`| **Components** | ${issue.components.join(", ")} |`);
  }
  if (issue.affectsVersions.length > 0) {
    lines.push(`| **Affects Versions** | ${issue.affectsVersions.join(", ")} |`);
  }
  if (issue.fixVersions.length > 0) {
    lines.push(`| **Fix Versions** | ${issue.fixVersions.join(", ")} |`);
  }
  if (issue.epicLink) {
    lines.push(`| **Epic Link** | ${issue.epicLink} |`);
  }
  if (issue.epicName) {
    lines.push(`| **Epic Name** | ${issue.epicName} |`);
  }
  if (issue.parent) {
    lines.push(`| **Parent** | ${issue.parent} |`);
  }
  lines.push(``);

  // ── People ───────────────────────────────────────────────────────────────
  lines.push(`## People`);
  lines.push(``);
  lines.push(`| Role | Name |`);
  lines.push(`|------|------|`);
  lines.push(`| **Assignee** | ${issue.assignee ?? "Unassigned"} |`);
  lines.push(`| **Reporter** | ${issue.reporter ?? "—"} |`);
  if (issue.defectOwner && ["Bug", "Bug_Customer", "Leakage"].includes(issue.issueType)) {
    lines.push(`| **Defect Owner** | ${issue.defectOwner} |`);
  }
  lines.push(``);

  // ── Dates ────────────────────────────────────────────────────────────────
  lines.push(`## Dates`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **Created** | ${formatDate(issue.created)} |`);
  lines.push(`| **Updated** | ${formatDate(issue.updated)} |`);
  if (issue.dueDate) {
    lines.push(`| **Due** | ${issue.dueDate} |`);
  }
  if (issue.planStartDate) {
    lines.push(`| **Plan Start Date** | ${issue.planStartDate} |`);
  }
  if (issue.actualStartDate) {
    lines.push(`| **Actual Start Date** | ${issue.actualStartDate} |`);
  }
  if (issue.actualEndDate) {
    lines.push(`| **Actual End Date** | ${issue.actualEndDate} |`);
  }
  lines.push(``);

  // ── Time Tracking ────────────────────────────────────────────────────────
  const tt = issue.timeTracking;
  if (tt.originalEstimate || tt.remainingEstimate || tt.timeSpent) {
    lines.push(`## Time Tracking`);
    lines.push(``);
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    if (tt.originalEstimate) lines.push(`| **Estimated** | ${tt.originalEstimate} |`);
    if (tt.remainingEstimate) lines.push(`| **Remaining** | ${tt.remainingEstimate} |`);
    if (tt.timeSpent) lines.push(`| **Logged** | ${tt.timeSpent} |`);
    lines.push(``);
  }

  // ── Sub-tasks ─────────────────────────────────────────────────────────────
  if (issue.subtasks.length > 0) {
    lines.push(`## Sub-tasks`);
    lines.push(``);
    lines.push(`| Key | Type | Status | Priority |`);
    lines.push(`|-----|------|--------|----------|`);
    for (const st of issue.subtasks) {
      lines.push(`| ${st.key} | ${st.issueType} | ${st.status} | ${st.priority ?? "—"} |`);
    }
    lines.push(``);
  }

  // ── Bug / Defect fields ───────────────────────────────────────────────────
  const hasBugFields =
    issue.defectType ||
    issue.defectOrigin ||
    issue.causeCategory ||
    issue.degrade ||
    issue.causeAnalysis ||
    issue.impactAssessment ||
    issue.action ||
    issue.dod;

  if (hasBugFields) {
    lines.push(`## Bug / Defect Info`);
    lines.push(``);
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    if (issue.defectType) lines.push(`| **Defect Type** | ${issue.defectType} |`);
    if (issue.defectOrigin) lines.push(`| **Defect Origin** | ${issue.defectOrigin} |`);
    if (issue.causeCategory) lines.push(`| **Cause Category** | ${issue.causeCategory} |`);
    if (issue.degrade) lines.push(`| **Degrade** | ${issue.degrade} |`);
    if (issue.dod) lines.push(`| **DoD** | ${issue.dod} |`);
    lines.push(``);
    if (issue.causeAnalysis) {
      lines.push(`### Cause Analysis`);
      lines.push(``);
      lines.push(issue.causeAnalysis);
      lines.push(``);
    }
    if (issue.impactAssessment) {
      lines.push(`### Impact Assessment`);
      lines.push(``);
      lines.push(issue.impactAssessment);
      lines.push(``);
    }
    if (issue.action) {
      lines.push(`### Action`);
      lines.push(``);
      lines.push(issue.action);
      lines.push(``);
    }
  }

  // ── Description ──────────────────────────────────────────────────────────
  lines.push(`## Description`);
  lines.push(``);
  lines.push(issue.description ?? "_No description provided._");

  return lines.join("\n");
}

/** Formats an ISO timestamp to a readable local date-time string. */
function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function authErrorContent(code: string, message: string) {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: `[${code}] ${message}\n\nRun: npm run jira-auth-login`,
      },
    ],
  };
}
