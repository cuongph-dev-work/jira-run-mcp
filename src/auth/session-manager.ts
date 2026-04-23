import axios from "axios";
import { readSession } from "./session-store.js";
import { authRequired, sessionExpired } from "../errors.js";
import type { PlaywrightCookie, SessionCookies, SessionFile } from "../types.js";

// ---------------------------------------------------------------------------
// Cookie extraction
// ---------------------------------------------------------------------------

/**
 * Converts Playwright cookie objects into an HTTP Cookie header string.
 * Only includes cookies whose domain matches the base URL host.
 */
export function extractCookies(
  session: SessionFile,
  baseUrl: string
): SessionCookies {
  const host = new URL(baseUrl).hostname;

  const matched: PlaywrightCookie[] = session.storageState.cookies?.filter((c: PlaywrightCookie) => {
    return host.endsWith(c.domain.replace(/^\./, ""));
  }) ?? [];

  const cookieHeader = matched
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return { cookieHeader };
}

// ---------------------------------------------------------------------------
// Session validation
// ---------------------------------------------------------------------------

/**
 * Loads the session from disk and validates it against the Jira REST API.
 *
 * Throws:
 * - `AUTH_REQUIRED` if no session file exists
 * - `SESSION_EXPIRED` if the session exists but Jira rejects it
 */
export async function loadAndValidateSession(
  sessionFilePath: string,
  baseUrl: string,
  validatePath: string
): Promise<SessionCookies> {
  const session = await readSession(sessionFilePath);

  if (session === null) {
    throw authRequired();
  }

  const cookies = extractCookies(session, baseUrl);
  const validateUrl = `${baseUrl}${validatePath}`;

  try {
    const res = await axios.get(validateUrl, {
      headers: {
        Cookie: cookies.cookieHeader,
        Accept: "application/json",
      },
      maxRedirects: 0,
      // Only 2xx is treated as a valid authenticated response.
      // 3xx redirects mean Jira is bouncing us to a login/SSO page — expired.
      // With maxRedirects:0, axios returns the redirect response rather than
      // following it, so we must reject it here explicitly.
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Jira may redirect to a login page for expired sessions
    if (isLoginPageResponse(res.data)) {
      throw sessionExpired();
    }

    return cookies;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      const status = err.response?.status;
      // 401 / 403 = Jira explicitly rejected the session.
      // Any 3xx = Jira is redirecting to SSO/login — session is invalid.
      // (maxRedirects:0 surfaces 3xx as errors rather than following them)
      if (
        status === 401 ||
        status === 403 ||
        (status !== undefined && status >= 300 && status < 400)
      ) {
        throw sessionExpired();
      }
    }
    // Re-throw McpErrors (e.g., sessionExpired thrown above) and network errors
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isLoginPageResponse(body: unknown): boolean {
  if (typeof body !== "string") return false;
  const lower = body.toLowerCase();
  return (
    lower.includes("<title>log in") ||
    lower.includes("id=\"login-form\"") ||
    lower.includes("sso") && lower.includes("<html")
  );
}

function isAxiosError(err: unknown): err is { response?: { status: number } } {
  return (
    typeof err === "object" &&
    err !== null &&
    "isAxiosError" in err &&
    (err as { isAxiosError: boolean }).isAxiosError === true
  );
}
