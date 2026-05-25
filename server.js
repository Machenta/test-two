import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";

function loadDotenv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotenv();

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4000);
const serviceId = process.env.SERVICE_ID || "x4-test-two";
const displayName = process.env.SERVICE_NAME || "X4 Test Two";
const themeColor = process.env.THEME_COLOR || "#059669";
const message = process.env.SERVICE_MESSAGE || "Hello from test two";
const featureBadge = "Feature workspace: downstream bridge active";
const peerUrls = (process.env.PEER_URLS || "").split(",").map((value) => value.trim()).filter(Boolean);

async function peerStatuses() {
  const results = [];
  for (const url of peerUrls) {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/api/status`);
      results.push({ url, ok: response.ok, data: await response.json() });
    } catch (error) {
      results.push({ url, ok: false, error: error.message });
    }
  }
  return results;
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body, null, 2));
}

function html() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${displayName}</title>
    <style>
      body { margin: 0; min-height: 100vh; font-family: Inter, system-ui, sans-serif; color: #064e3b; background: ${themeColor}; }
      main { max-width: 720px; padding: 48px; }
      section { background: white; border-radius: 8px; padding: 24px; }
      button { border: 0; border-radius: 6px; background: #111827; color: white; font-weight: 700; padding: 12px 16px; cursor: pointer; }
      pre { white-space: pre-wrap; background: #ecfdf5; padding: 16px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>${displayName}</h1>
        <p>${message}</p>
        <p><strong>${featureBadge}</strong></p>
        <button id="flow">Ask downstream service</button>
        <pre id="output">Click to call test three.</pre>
      </section>
    </main>
    <script>
      document.getElementById("flow").addEventListener("click", async () => {
        const response = await fetch("./api/flow");
        document.getElementById("output").textContent = JSON.stringify(await response.json(), null, 2);
      });
    </script>
  </body>
</html>`;
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/health") return json(response, 200, { ok: true, serviceId });
  if (url.pathname === "/api/status") return json(response, 200, { serviceId, displayName, themeColor, message, featureBadge, peers: peerUrls });
  if (url.pathname === "/api/flow") return json(response, 200, { serviceId, displayName, featureBadge, peers: await peerStatuses() });
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html());
}).listen(port, host, () => {
  console.log(`${serviceId} listening on ${host}:${port}`);
});
