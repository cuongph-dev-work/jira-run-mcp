import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { config } from "./config.js";
import { handleGetIssue } from "./tools/get-issue.js";
import { handleSearchIssues } from "./tools/search-issues.js";

// ---------------------------------------------------------------------------
// MCP server factory
// A new McpServer is created per request (stateless Streamable HTTP pattern).
// Calling server.connect() on a single shared instance across concurrent
// requests causes lifecycle conflicts — each transport must own its server.
// ---------------------------------------------------------------------------

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "jira-run-mcp",
    version: "0.1.0",
  });

  // Tool: jira_get_issue
  server.tool(
    "jira_get_issue",
    "Fetch a single Jira issue by key and return its details (summary, description, status, assignee, etc.)",
    {
      issueKey: z.string().describe("Jira issue key, e.g. PROJ-123"),
    },
    async (input) => {
      return handleGetIssue(input, config);
    }
  );

  // Tool: jira_search_issues
  server.tool(
    "jira_search_issues",
    "Execute a JQL query against Jira and return a compact list of matching issues",
    {
      jql: z.string().describe("JQL query string, e.g. 'project = PROJ AND status = Open'"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe("Maximum number of results to return (1–50, default 10)"),
    },
    async (input) => {
      return handleSearchIssues(input, config);
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Express + Streamable HTTP transport
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

/**
 * MCP endpoint — stateless, per-request server+transport pair.
 *
 * Each incoming request gets a brand-new McpServer and StreamableHTTPServerTransport.
 * This is the correct pattern for stateless Streamable HTTP:
 * - No shared mutable transport state between concurrent requests.
 * - server.connect() is called exactly once per server instance.
 */
app.all("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — no session header
  });

  res.on("close", () => {
    transport.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[MCP] Request error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "jira-run-mcp", version: "0.1.0" });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(config.MCP_PORT, () => {
  console.log(`\n🚀 Jira MCP server running`);
  console.log(`   Port     : ${config.MCP_PORT}`);
  console.log(`   Endpoint : http://localhost:${config.MCP_PORT}/mcp`);
  console.log(`   Health   : http://localhost:${config.MCP_PORT}/health`);
  console.log(`   Jira     : ${config.JIRA_BASE_URL}\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n⏹  Shutting down...");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("\n⏹  Shutting down...");
  process.exit(0);
});
