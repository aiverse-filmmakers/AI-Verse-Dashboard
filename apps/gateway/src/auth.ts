import { randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import {
  assertDashboardAuthToken,
  dashboardWsAuthProtocol,
} from "../../../packages/protocol/src/index.js";

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createGatewayAuthToken(provided?: string): string {
  if (provided !== undefined) return assertDashboardAuthToken(provided);
  return randomBytes(32).toString("base64url");
}

export function hasBearerAuthorization(
  headers: IncomingHttpHeaders,
  authToken: string,
): boolean {
  const raw = headers.authorization;
  if (typeof raw !== "string") return false;
  const match = /^Bearer\s+([A-Za-z0-9_-]{32,256})$/i.exec(raw.trim());
  if (!match) return false;
  return constantTimeEqual(match[1], authToken);
}

export function hasWebSocketAuthorization(
  headers: IncomingHttpHeaders,
  authToken: string,
): boolean {
  if (hasBearerAuthorization(headers, authToken)) return true;

  const raw = headers["sec-websocket-protocol"];
  if (typeof raw !== "string") return false;
  const expected = dashboardWsAuthProtocol(authToken);
  for (const protocol of raw.split(",").map((value) => value.trim())) {
    if (constantTimeEqual(protocol, expected)) return true;
  }
  return false;
}
