export const DEFAULT_COMMUNITIES = [
  {
    id: "cloud-studios",
    name: "Cloud Studios",
    inviteCode: "EKv4N7VPN2",
    logoPath: "assets/cloud-studios.png",
  },
  {
    id: "alaska-state-roleplay",
    name: "Alaska State Roleplay",
    inviteCode: "xuHweZvqcw",
    logoPath: "assets/115.png",
  },
  {
    id: "cloud-courses",
    name: "Cloud Courses",
    inviteCode: "vUS2uDE7cY",
    logoPath: "",
  },
];

const communityIds = new Set(DEFAULT_COMMUNITIES.map(({ id }) => id));

function isValidLogoPath(value) {
  if (value === "") return true;

  const isLocalAsset = /^assets\/[a-zA-Z0-9._/-]+$/.test(value)
    && !value.split("/").includes("..");
  const isDiscordIcon = /^https:\/\/cdn\.discordapp\.com\/icons\/\d+\/[a-zA-Z0-9_]+\.png(?:\?size=\d{2,4})?$/.test(value);

  return isLocalAsset || isDiscordIcon;
}

export function validateCommunities(input) {
  if (!Array.isArray(input) || input.length !== DEFAULT_COMMUNITIES.length) {
    throw new Error("Exactly three community cards are required.");
  }

  const seen = new Set();
  const communities = input.map((item) => {
    if (!item || typeof item !== "object" || !communityIds.has(item.id) || seen.has(item.id)) {
      throw new Error("Community IDs must match the configured cards.");
    }

    const name = typeof item.name === "string" ? item.name.trim() : "";
    const inviteCode = typeof item.inviteCode === "string" ? item.inviteCode.trim() : "";
    const logoPath = typeof item.logoPath === "string" ? item.logoPath.trim() : "";

    if (!name || name.length > 80) {
      throw new Error("Community names must be between 1 and 80 characters.");
    }
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(inviteCode)) {
      throw new Error("Invite codes may contain only letters, numbers, underscores, and hyphens.");
    }
    if (!isValidLogoPath(logoPath)) {
      throw new Error("Logo paths must point to an asset or a Discord server icon.");
    }

    seen.add(item.id);
    return { id: item.id, name, inviteCode, logoPath };
  });

  if (seen.size !== communityIds.size) {
    throw new Error("All configured community cards must be included.");
  }

  return communities.sort(
    (left, right) => DEFAULT_COMMUNITIES.findIndex(({ id }) => id === left.id)
      - DEFAULT_COMMUNITIES.findIndex(({ id }) => id === right.id),
  );
}