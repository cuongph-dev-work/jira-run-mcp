#!/usr/bin/env node
/**
 * CLI: jira-auth-check
 *
 * Validates whether the stored Jira session is still alive.
 * Exits 0 if valid, exits 1 if expired or missing.
 */
import { config } from "../config.js";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { readSession } from "../auth/session-store.js";
import { isMcpError } from "../errors.js";

(async () => {
  try {
    // Show metadata before hitting the network
    const session = await readSession(config.JIRA_SESSION_FILE);
    if (!session) {
      console.log("❌ No session found.");
      console.log(`   Expected file: ${config.JIRA_SESSION_FILE}`);
      console.log("   Run: npm run jira-auth-login\n");
      process.exit(1);
    }

    console.log(`📄 Session file   : ${config.JIRA_SESSION_FILE}`);
    console.log(`   Saved at       : ${session.savedAt}`);
    console.log(`   Base URL       : ${session.baseUrl}`);
    console.log(`   Cookies stored : ${session.storageState.cookies?.length ?? 0}`);
    console.log(`\n🔍 Validating against ${config.JIRA_BASE_URL}${config.JIRA_VALIDATE_PATH} ...`);

    await loadAndValidateSession(
      config.JIRA_SESSION_FILE,
      config.JIRA_BASE_URL,
      config.JIRA_VALIDATE_PATH
    );

    console.log("✅ Session is valid. You are authenticated with Jira.\n");
    process.exit(0);
  } catch (err: unknown) {
    if (isMcpError(err)) {
      console.error(`\n❌ [${err.code}] ${err.message}`);
      console.error("   Run: npm run jira-auth-login\n");
    } else {
      console.error("\n❌ Unexpected error:", err);
    }
    process.exit(1);
  }
})();
