import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_SESSION_SECONDS,
  createSessionToken,
  hasAdminSession,
  isValidSessionToken,
} from "../lib/admin-session.js";

test("accepts an authentic unexpired session and reads its cookie", () => {
  const token = createSessionToken("test-secret");
  assert.equal(isValidSessionToken(token, "test-secret"), true);
  assert.equal(hasAdminSession({ headers: { cookie: `other=value; cloud_admin_session=${token}` } }, "test-secret"), true);
});

test("rejects modified, expired, and differently signed sessions", () => {
  const token = createSessionToken("test-secret", 1_000);
  const expiry = 1_000 + ADMIN_SESSION_SECONDS * 1_000;
  assert.equal(isValidSessionToken(token, "test-secret", expiry), false);
  assert.equal(isValidSessionToken(token, "wrong-secret", 1_001), false);
  assert.equal(isValidSessionToken(`${token}x`, "test-secret", 1_001), false);
});