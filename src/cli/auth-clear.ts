#!/usr/bin/env node
/**
 * CLI: jira-auth-clear
 *
 * Removes the locally stored Jira session file.
 * Safe to run even if no session exists.
 */
import { config } from "../config.js";
import { clearSession } from "../auth/session-store.js";

(async () => {
  try {
    await clearSession(config.JIRA_SESSION_FILE);
    console.log(`🗑️  Session cleared: ${config.JIRA_SESSION_FILE}\n`);
    process.exit(0);
  } catch (err: unknown) {
    console.error("❌ Failed to clear session:", err);
    process.exit(1);
  }
})();
