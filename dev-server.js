import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import adminHandler from "./api/admin.js";
import communitiesHandler from "./api/communities.js";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const root = process.cwd();
const port = Number(process.env.PORT) || 4173;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function respondJson(response) {
  return {
    setHeader(name, value) {
      response.setHeader(name, value);
    },
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(value) {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify(value));
      return this;
    },
  };
}

async function readRequestBody(request, response) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64_000) {
      response.statusCode = 413;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ error: "Request body is too large." }));
      return false;
    }
    chunks.push(chunk);
  }

  try {
    request.body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return true;
  } catch {
    response.statusCode = 400;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "Invalid JSON body." }));
    return false;
  }
}

async function serveApi(request, response, handler) {
  if (request.method !== "GET" && !(await readRequestBody(request, response))) return;

  try {
    await handler(request, respondJson(response));
  } catch {
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ error: "The request could not be completed." }));
    }
  }
}

async function serveStatic(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }

  const relativePath = pathname === "/" ? "index.html"
    : pathname === "/admin" || pathname === "/admin/" ? "admin.html"
      : pathname.replace(/^\/+/, "");
  const filePath = resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}

createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/api/admin") {
    void serveApi(request, response, adminHandler);
  } else if (pathname === "/api/communities") {
    void serveApi(request, response, communitiesHandler);
  } else {
    void serveStatic(request, response);
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Cloud Studios local server listening on http://localhost:${port}`);
});