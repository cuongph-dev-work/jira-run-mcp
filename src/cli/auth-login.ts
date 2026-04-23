#!/usr/bin/env node
/**
 * CLI: jira-auth-login
 *
 * Launches a headed browser and waits for the operator to complete SSO.
 * On success, saves the Playwright storage state to the configured session file.
 * Optionally validates the session immediately after saving.
 */
import "dotenv/config";
import { config } from "../config.js";
import { runInteractiveLogin } from "../auth/playwright-auth.js";
import { loadAndValidateSession } from "../auth/session-manager.js";
import { isMcpError } from "../errors.js";

(async () => {
  try {
    await runInteractiveLogin({
      baseUrl: config.JIRA_BASE_URL,
      sessionFilePath: config.JIRA_SESSION_FILE,
      headless: config.PLAYWRIGHT_HEADLESS,
      browser: config.PLAYWRIGHT_BROWSER,
    });

    // Validate the session right away so the operator knows it worked
    console.log("🔍 Validating session...");
    try {
      await loadAndValidateSession(
        config.JIRA_SESSION_FILE,
        config.JIRA_BASE_URL,
        config.JIRA_VALIDATE_PATH
      );
      console.log("✅ Session is valid. You are authenticated with Jira.\n");
    } catch (validationErr: unknown) {
      if (isMcpError(validationErr)) {
        console.warn(`⚠️  Post-login validation failed: [${validationErr.code}] ${validationErr.message}`);
        console.warn("   The session was saved but may not be usable yet. Try again.\n");
      } else {
        throw validationErr;
      }
    }
  } catch (err: unknown) {
    if (isMcpError(err)) {
      console.error(`\n❌ [${err.code}] ${err.message}\n`);
    } else {
      console.error("\n❌ Unexpected error during login:", err);
    }
    process.exit(1);
  }
})();
