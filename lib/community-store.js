import { neon } from "@neondatabase/serverless";
import { DEFAULT_COMMUNITIES } from "./community-data.js";

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  return neon(process.env.DATABASE_URL);
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS community_cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL,
      logo_path TEXT NOT NULL DEFAULT ''
    )
  `;

  for (const community of DEFAULT_COMMUNITIES) {
    await sql`
      INSERT INTO community_cards (id, name, invite_code, logo_path)
      VALUES (${community.id}, ${community.name}, ${community.inviteCode}, ${community.logoPath})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

function toCommunity(row) {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    logoPath: row.logo_path,
  };
}

export async function listCommunities() {
  const sql = getSql();
  await ensureTable(sql);
  const rows = await sql`
    SELECT id, name, invite_code, logo_path
    FROM community_cards
    ORDER BY CASE id
      WHEN 'cloud-studios' THEN 0
      WHEN 'alaska-state-roleplay' THEN 1
      ELSE 2
    END
  `;
  return rows.map(toCommunity);
}

export async function saveCommunities(communities) {
  const sql = getSql();
  await ensureTable(sql);

  for (const community of communities) {
    await sql`
      UPDATE community_cards
      SET name = ${community.name}, invite_code = ${community.inviteCode}, logo_path = ${community.logoPath}
      WHERE id = ${community.id}
    `;
  }

  return listCommunities();
}