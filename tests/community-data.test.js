import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_COMMUNITIES, validateCommunities } from "../lib/community-data.js";

test("accepts and normalizes the configured community cards", () => {
  const communities = validateCommunities(DEFAULT_COMMUNITIES.map((community) => ({
    ...community,
    name: ` ${community.name} `,
  })));

  assert.deepEqual(communities.map(({ id }) => id), DEFAULT_COMMUNITIES.map(({ id }) => id));
  assert.equal(communities[0].name, "Cloud Studios");
});

test("rejects missing cards and unexpected IDs", () => {
  assert.throws(() => validateCommunities(DEFAULT_COMMUNITIES.slice(0, 2)));
  assert.throws(() => validateCommunities([
    { ...DEFAULT_COMMUNITIES[0], id: "unexpected" },
    ...DEFAULT_COMMUNITIES.slice(1),
  ]));
});

test("rejects invalid invite codes and unsafe logo paths", () => {
  const invalidInvite = DEFAULT_COMMUNITIES.map((community) => ({ ...community }));
  invalidInvite[0].inviteCode = "javascript:alert(1)";
  assert.throws(() => validateCommunities(invalidInvite));

  const invalidLogo = DEFAULT_COMMUNITIES.map((community) => ({ ...community }));
  invalidLogo[0].logoPath = "https://example.com/tracker.png";
  assert.throws(() => validateCommunities(invalidLogo));
});

test("allows local assets and Discord-hosted server icons", () => {
  const communities = DEFAULT_COMMUNITIES.map((community) => ({ ...community }));
  communities[2].logoPath = "https://cdn.discordapp.com/icons/123456/abc123.png?size=128";
  assert.equal(validateCommunities(communities)[2].logoPath, communities[2].logoPath);
});