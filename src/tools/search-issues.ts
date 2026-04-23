import { z } from "zod";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { JiraHttpClient } from "../jira/http-client.js";
import { isMcpError } from "../errors.js";
import type { Config } from "../config.js";
import type { JiraIssueSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const searchIssuesSchema = z.object({
  jql: z
    .string()
    .min(1, "jql is required"),
  limit: z
    .number()
    .int()
    .min(1, "limit must be at least 1")
    .max(50, "limit cannot exceed 50")
    .default(10),
});

export type SearchIssuesInput = z.infer<typeof searchIssuesSchema>;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * MCP tool handler for `jira_search_issues`.
 */
export async function handleSearchIssues(
  rawInput: unknown,
  cfg: Config
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const parsed = searchIssuesSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return errorContent(`Invalid input: ${msg}`);
  }

  const { jql, limit } = parsed.data;

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
    const result = await client.searchIssues(jql, limit);
    return {
      content: [
        {
          type: "text",
          text: formatSearchResult(jql, result.total, result.issues),
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

function formatSearchResult(
  jql: string,
  total: number,
  issues: JiraIssueSummary[]
): string {
  const header = [
    `# Jira Search Results`,
    ``,
    `**JQL:** \`${jql}\``,
    `**Total:** ${total} issue(s) found | Showing: ${issues.length}`,
    ``,
  ];

  if (issues.length === 0) {
    return [...header, "_No issues matched the query._"].join("\n");
  }

  const rows = issues.map((issue) =>
    [
      `## ${issue.key}: ${issue.summary}`,
      `**Status:** ${issue.status} | **Priority:** ${issue.priority ?? "—"} | **Assignee:** ${issue.assignee ?? "Unassigned"}`,
      `**Updated:** ${issue.updated}`,
      `**URL:** ${issue.url}`,
    ].join("\n")
  );

  return [...header, ...rows].join("\n\n");
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
