/**
 * body-normalizer.ts
 *
 * Centralises the normalizeJiraBody() function and JiraBodyFormat type.
 *
 * Extracted from adf.ts to break the circular dependency:
 *   adf.ts  ──▶  markdown-to-adf.ts  ──▶  adf.ts   (BAD — circular)
 *
 * New dependency graph (acyclic):
 *   adf.ts              (types + low-level ADF builders)
 *   markdown-to-adf.ts  (parser, imports adf.ts types only)
 *   body-normalizer.ts  (imports both, owns normalizeJiraBody)
 *   tool files          (import from body-normalizer.ts)
 */

import { invalidInput } from "../errors.js";
import {
  buildMinimalAdfDocument,
  isAdfDocument,
  type AdfDocument,
} from "./adf.js";
import { markdownToAdf } from "./markdown-to-adf.js";

// ---------------------------------------------------------------------------
// Public type
// ---------------------------------------------------------------------------

export type JiraBodyFormat = "plain" | "markdown" | "adf";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable description of why an object is not a valid ADF doc.
 * Used only for error messages in the "adf" format branch.
 */
function describeAdfValidationFailure(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "body must be a plain object";
  }
  const doc = value as Record<string, unknown>;
  const problems: string[] = [];
  if (doc["type"] !== "doc") problems.push(`type must be "doc" (got "${String(doc["type"])}")`);
  if (doc["version"] !== 1) problems.push(`version must be 1 (got ${JSON.stringify(doc["version"])})`);
  if (!Array.isArray(doc["content"])) problems.push("content must be an array");
  return problems.length > 0 ? problems.join("; ") : "unknown";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalizes a comment/description body to ADF based on the supplied format.
 *
 * - "plain"    – wraps the raw string in a single paragraph ADF node.
 * - "markdown" – parses Markdown subset into rich ADF (headings, lists, code
 *                blocks, inline marks, links, blockquotes, tables).
 * - "adf"      – validates and passes through an already-structured ADF object.
 *
 * @throws McpError (invalidInput) when the value cannot be converted.
 */
export function normalizeJiraBody(
  body: string | AdfDocument | Record<string, unknown>,
  format: JiraBodyFormat = "markdown"
): AdfDocument {
  if (format === "adf") {
    if (isAdfDocument(body)) return body;
    throw invalidInput(
      `bodyFormat is "adf" but body is not a valid ADF document: ${describeAdfValidationFailure(body)}`
    );
  }

  if (typeof body !== "string") {
    // If a non-string is passed with plain/markdown format, try ADF pass-through
    if (isAdfDocument(body)) return body;
    throw invalidInput(
      'body must be a string when bodyFormat is "plain" or "markdown".'
    );
  }

  if (format === "plain") {
    return buildMinimalAdfDocument(body);
  }

  // format === "markdown"
  return markdownToAdf(body);
}
