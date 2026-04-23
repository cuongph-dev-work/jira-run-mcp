import { chromium, firefox, webkit } from "playwright";
import axios from "axios";
import { readSession, writeSession } from "./session-store.js";
import { extractCookies } from "./session-manager.js";
import type { SessionFile } from "../types.js";

type BrowserEngine = "chromium" | "firefox" | "webkit";

// ---------------------------------------------------------------------------
// Interactive SSO login
// ---------------------------------------------------------------------------

/**
 * Launches a browser in headed mode, navigates to the Jira base URL, and
 * waits for the operator to complete the SSO flow manually.
 *
 * The session is ONLY written to disk when:
 * 1. The browser URL has left all SSO/login path patterns, AND
 * 2. A test HTTP call to `validatePath` returns HTTP 2xx.
 *
 * If the validation fails, any previously saved session is preserved
 * (the new incomplete state is not written).
 */
export async function runInteractiveLogin(options: {
  baseUrl: string;
  sessionFilePath: string;
  headless: boolean;
  browser: BrowserEngine;
  validatePath?: string;
}): Promise<void> {
  const {
    baseUrl,
    sessionFilePath,
    headless,
    browser: browserName,
    validatePath = "/rest/api/2/myself",
  } = options;

  console.log(`\n🔐 Launching ${browserName} to authenticate with Jira...\n`);
  console.log(`   Base URL : ${baseUrl}`);
  console.log(`   Session  : ${sessionFilePath}\n`);

  const browserFactory = getBrowserFactory(browserName);
  const browserInstance = await browserFactory.launch({ headless });
  const context = await browserInstance.newContext();
  const page = await context.newPage();

  await page.goto(baseUrl);

  console.log("👉 Complete the SSO login in the browser window.");
  console.log("   Waiting for you to reach the Jira dashboard...\n");

  // Poll the current URL until we've left all common SSO path patterns
  const ssoPatterns = ["/login", "/sso", "/idp", "/auth", "/saml", "/oauth", "/openid-connect"];

  const deadline = Date.now() + 300_000; // 5 minutes
  while (Date.now() < deadline) {
    const currentUrl = page.url();
    const onSsoPage = ssoPatterns.some((p) => currentUrl.includes(p));
    if (!onSsoPage) break;
    await page.waitForTimeout(2_000);
  }

  // Give the page a moment to settle and flush session cookies
  await page.waitForTimeout(2_000);

  const storageState = await context.storageState();
  await browserInstance.close();

  // ---------------------------------------------------------------------------
  // Validate BEFORE writing — do not overwrite an existing good session
  // with one that hasn't completed login yet.
  // ---------------------------------------------------------------------------
  const candidate: SessionFile = {
    savedAt: new Date().toISOString(),
    baseUrl,
    storageState,
  };

  console.log("🔍 Verifying new session before saving...");
  const isValid = await validateCandidateSession(candidate, baseUrl, validatePath);

  if (!isValid) {
    // The browser closed but the session is not usable — leave the old one intact
    throw new Error(
      "Login did not complete successfully: the new session failed validation.\n" +
      "Your previous session (if any) has NOT been overwritten.\n" +
      "Please run jira-auth-login again and ensure you reach the Jira dashboard before closing the browser."
    );
  }

  await writeSession(sessionFilePath, candidate);

  console.log(`\n✅ Session saved to ${sessionFilePath}`);
  console.log(`   Saved at : ${candidate.savedAt}\n`);
}

// ---------------------------------------------------------------------------
// Internal: candidate session validation (no disk read/write side-effects)
// ---------------------------------------------------------------------------

/**
 * Returns true if the candidate SessionFile produces a 2xx response from Jira.
 * Never throws — returns false on any failure so callers can decide.
 */
export async function validateCandidateSession(
  candidate: SessionFile,
  baseUrl: string,
  validatePath: string
): Promise<boolean> {
  const cookies = extractCookies(candidate, baseUrl);
  const validateUrl = `${baseUrl}${validatePath}`;

  try {
    const res = await axios.get(validateUrl, {
      headers: {
        Cookie: cookies.cookieHeader,
        Accept: "application/json",
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Guard against Jira returning HTML login page with 200 OK
    if (typeof res.data === "string" && isLoginPage(res.data)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function getBrowserFactory(name: BrowserEngine) {
  switch (name) {
    case "firefox":
      return firefox;
    case "webkit":
      return webkit;
    default:
      return chromium;
  }
}

function isLoginPage(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.startsWith("<!") &&
    (lower.includes("log in") || lower.includes("login") || lower.includes("sso"))
  );
}

// ---------------------------------------------------------------------------
// Re-export readSession for test convenience
// ---------------------------------------------------------------------------
export { readSession };
