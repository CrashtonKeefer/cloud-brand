import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "cloud_admin_session";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

export function createSessionToken(secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: now + ADMIN_SESSION_SECONDS * 1000,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function isValidSessionToken(token, secret, now = Date.now()) {
  if (typeof token !== "string" || !secret) return false;

  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isSafeInteger(session.expiresAt) && session.expiresAt > now;
  } catch {
    return false;
  }
}

export function getSessionToken(request) {
  const cookieHeader = request.headers.cookie || "";
  const pair = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`));
  return pair ? pair.slice(ADMIN_COOKIE_NAME.length + 1) : "";
}

export function createSessionCookie(token) {
  return `${ADMIN_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ADMIN_SESSION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function hasAdminSession(request, secret) {
  return isValidSessionToken(getSessionToken(request), secret);
}