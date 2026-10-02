import { timingSafeEqual } from "node:crypto";
import {
  clearSessionCookie,
  createSessionCookie,
  createSessionToken,
  hasAdminSession,
} from "../lib/admin-session.js";
import { validateCommunities } from "../lib/community-data.js";
import { listCommunities, saveCommunities } from "../lib/community-store.js";

function sendError(response, status, message) {
  return response.status(status).json({ error: message });
}

function readBody(request) {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }
  return request.body && typeof request.body === "object" ? request.body : {};
}

function isSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return true;

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function matchesPassword(candidate, expected) {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length
    && timingSafeEqual(candidateBytes, expectedBytes);
}

function adminConfigured() {
  return Boolean(
    process.env.DATABASE_URL
      && process.env.ADMIN_PASSWORD
      && process.env.ADMIN_SESSION_SECRET,
  );
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "POST") {
    if (!isSameOrigin(request)) return sendError(response, 403, "Request origin is not allowed.");

    const body = readBody(request);
    if (body.action === "logout") {
      response.setHeader("Set-Cookie", clearSessionCookie());
      return response.status(200).json({ ok: true });
    }

    if (body.action !== "login") return sendError(response, 400, "Unknown Admin action.");
    if (!adminConfigured()) {
      return sendError(response, 503, "Admin is not configured. Add the required Vercel environment variables.");
    }

    if (typeof body.password !== "string" || !matchesPassword(body.password, process.env.ADMIN_PASSWORD)) {
      return sendError(response, 401, "Invalid password.");
    }

    response.setHeader("Set-Cookie", createSessionCookie(createSessionToken(process.env.ADMIN_SESSION_SECRET)));
    return response.status(200).json({ ok: true });
  }

  if (request.method !== "GET" && request.method !== "PUT") {
    response.setHeader("Allow", "GET, POST, PUT");
    return sendError(response, 405, "Method not allowed.");
  }

  if (request.method === "PUT" && !isSameOrigin(request)) {
    return sendError(response, 403, "Request origin is not allowed.");
  }

  if (!hasAdminSession(request, process.env.ADMIN_SESSION_SECRET)) {
    return sendError(response, 401, "Sign in to continue.");
  }

  if (request.method === "GET") {
    try {
      return response.status(200).json({ communities: await listCommunities() });
    } catch {
      return sendError(response, 503, "Community storage is not available.");
    }
  }

  let communities;
  try {
    communities = validateCommunities(readBody(request).communities);
  } catch (error) {
    return sendError(response, 400, error.message);
  }

  try {
    return response.status(200).json({ communities: await saveCommunities(communities) });
  } catch {
    return sendError(response, 503, "Could not save community changes.");
  }
}