import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/admin.js";

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function withEnvironment(values, callback) {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("reports missing deployment configuration without accepting a login", async () => {
  await withEnvironment({
    DATABASE_URL: undefined,
    ADMIN_PASSWORD: undefined,
    ADMIN_SESSION_SECRET: undefined,
  }, async () => {
    const response = mockResponse();
    await handler({
      method: "POST",
      headers: { host: "site.example", origin: "https://site.example" },
      body: { action: "login", password: "anything" },
    }, response);

    assert.equal(response.statusCode, 503);
    assert.match(response.body.error, /not configured/i);
  });
});

test("rejects cross-origin logins", async () => {
  await withEnvironment({
    DATABASE_URL: "postgresql://example.invalid/db",
    ADMIN_PASSWORD: "correct horse battery staple",
    ADMIN_SESSION_SECRET: "a-session-secret-long-enough-for-testing",
  }, async () => {
    const response = mockResponse();
    await handler({
      method: "POST",
      headers: { host: "site.example", origin: "https://attacker.example" },
      body: { action: "login", password: "correct horse battery staple" },
    }, response);

    assert.equal(response.statusCode, 403);
  });
});

test("sets a secure HttpOnly cookie for a valid password", async () => {
  await withEnvironment({
    DATABASE_URL: "postgresql://example.invalid/db",
    ADMIN_PASSWORD: "correct horse battery staple",
    ADMIN_SESSION_SECRET: "a-session-secret-long-enough-for-testing",
  }, async () => {
    const response = mockResponse();
    await handler({
      method: "POST",
      headers: { host: "site.example", origin: "https://site.example" },
      body: { action: "login", password: "correct horse battery staple" },
    }, response);

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["Set-Cookie"], /HttpOnly/);
    assert.match(response.headers["Set-Cookie"], /Secure/);
    assert.match(response.headers["Set-Cookie"], /SameSite=Strict/);
  });
});