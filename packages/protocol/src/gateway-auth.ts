export const DASHBOARD_WS_PROTOCOL = "aiverse.dashboard.v1";
const AUTH_TOKEN_RE = /^[A-Za-z0-9_-]{32,256}$/;

export function assertDashboardAuthToken(token: string): string {
  if (!AUTH_TOKEN_RE.test(token)) {
    throw new Error("Dashboard local auth token must be 32-256 base64url-safe characters");
  }
  return token;
}

export function dashboardWsAuthProtocol(token: string): string {
  return `aiverse.auth.${assertDashboardAuthToken(token)}`;
}
