import { listCommunities } from "../lib/community-store.js";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const communities = await listCommunities();
    return response.status(200).json({ communities });
  } catch {
    return response.status(503).json({ error: "Community storage is not configured." });
  }
}