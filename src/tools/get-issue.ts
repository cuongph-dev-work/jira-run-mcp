import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { isMcpError } from "../errors.js";
import type { Config } from "../config.js";

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

function formatIssue(issue: {
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
}): string {
  return [
    `# ${issue.key}: ${issue.summary}`,
    ``,
    `**Type:** ${issue.issueType}`,
    `**Status:** ${issue.status}`,
    `**Priority:** ${issue.priority ?? "—"}`,
    `**Assignee:** ${issue.assignee ?? "Unassigned"}`,
    `**Reporter:** ${issue.reporter ?? "Unknown"}`,
    `**Created:** ${issue.created}`,
    `**Updated:** ${issue.updated}`,
    `**URL:** ${issue.url}`,
    ``,
    `## Description`,
    ``,
    issue.description ?? "_No description provided._",
  ].join("\n");
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
