#!/usr/bin/env node

const baseUrl = process.argv.find((arg) => arg.startsWith("--base-url="))?.split("=")[1]
  ?? process.env.MCP_BASE_URL
  ?? "http://127.0.0.1:5057";

const timeoutMs = Number(process.env.MCP_SMOKE_TIMEOUT_MS ?? 30000);
const samplePostName = "Restaurant Galion Kotor";
const sampleRouteName = "Staza oko Crnog jezera";

const smokeCases = [
  ["tourism_search_regions", { query: "Kotor", limit: 3 }],
  ["tourism_get_region_summary", { regionName: "Kotor" }],
  ["tourism_search_posts", { regionName: "Kotor", postTypes: ["restaurant"], sortBy: "rating", limit: 10 }],
  ["tourism_get_post_detail", { postName: samplePostName }],
  ["tourism_search_routes", { regionName: "Kotor", limit: 5 }],
  ["tourism_get_route_detail", { routeName: sampleRouteName }],
  ["tourism_get_reviews", { postName: samplePostName, limit: 5 }],
  ["tourism_get_route_reviews", { routeName: sampleRouteName, limit: 5 }],
  ["tourism_search_tags", { limit: 5 }],
  ["tourism_search_activities", { limit: 5 }],
  ["tourism_search_events", { regionName: "Kotor", limit: 5 }],
  ["tourism_get_nearby", { latitude: 42.4247, longitude: 18.7712, radiusKm: 10, limit: 5 }],
  ["tourism_get_similar_posts", { postName: samplePostName, limit: 5 }],
  ["tourism_get_recommendations", { regionName: "Kotor", limit: 5 }],
  ["tourism_get_top_content", { regionName: "Kotor", sortBy: "rating", limit: 5 }],
  ["tourism_get_new_content", { regionName: "Kotor", daysBack: 3650, limit: 5 }],
  ["tourism_get_visit_trends", { regionName: "Kotor" }],
  ["tourism_get_external_click_stats", { regionName: "Kotor", limit: 5 }],
  ["tourism_get_direction_stats", { regionName: "Kotor", limit: 5 }],
  ["tourism_get_my_saved", { limit: 5 }],
  ["tourism_get_my_planner", {}],
  ["tourism_get_my_favorites", { limit: 5 }],
  ["tourism_get_my_profile", {}],
  ["tourism_submit_review", { postName: samplePostName, rating: 5, comment: "Smoke test without auth" }],
  ["tourism_save_location", { postName: samplePostName }],
  ["tourism_unsave_location", { postName: samplePostName }],
  ["tourism_like_location", { postName: samplePostName }],
  ["tourism_unlike_location", { postName: samplePostName }],
  ["tourism_add_to_planner", { postName: samplePostName }],
  ["tourism_remove_from_planner", { postName: samplePostName }]
];

function withTimeout(promise, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  return {
    signal: controller.signal,
    run: promise(controller.signal).finally(() => clearTimeout(timer))
  };
}

function parseSseJson(text) {
  return [...text.matchAll(/^data: (.*)$/gm)].map((match) => JSON.parse(match[1]));
}

async function postMcp(method, params) {
  const request = withTimeout(
    (signal) => fetch(`${baseUrl}/mcp`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Math.floor(Math.random() * 1_000_000_000),
        method,
        params
      })
    }),
    method
  );

  const response = await request.run;
  const body = await response.text();
  return {
    httpStatus: response.status,
    messages: parseSseJson(body),
    rawBody: body
  };
}

function summarizeContent(result) {
  const text = result?.content?.map((item) => item.text ?? "").join("\n") ?? "";
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}

async function callTool(name, args) {
  try {
    const response = await postMcp("tools/call", { name, arguments: args });
    const message = response.messages[0];
    const result = message?.result;
    const rpcError = message?.error;
    const sample = summarizeContent(result);
    const ok = response.httpStatus === 200 && !rpcError && result?.isError !== true;

    return {
      tool: name,
      ok,
      httpStatus: response.httpStatus,
      isError: result?.isError === true,
      error: rpcError?.message ?? (result?.isError ? sample : null),
      sample
    };
  } catch (error) {
    return {
      tool: name,
      ok: false,
      httpStatus: null,
      isError: true,
      error: error instanceof Error ? error.message : String(error),
      sample: ""
    };
  }
}

async function checkHealth() {
  const request = withTimeout(
    (signal) => fetch(`${baseUrl}/health`, { signal }),
    "health"
  );
  const response = await request.run;
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

async function main() {
  const health = await checkHealth();
  if (!health.ok) {
    console.error(`Health check failed (${health.status}): ${health.body}`);
    process.exit(2);
  }

  const listResponse = await postMcp("tools/list", {});
  const listedTools = listResponse.messages[0]?.result?.tools?.map((tool) => tool.name).sort() ?? [];
  const coveredTools = smokeCases.map(([name]) => name).sort();
  const missingCases = listedTools.filter((name) => !coveredTools.includes(name));
  const unknownCases = coveredTools.filter((name) => !listedTools.includes(name));

  const results = [];
  for (const [name, args] of smokeCases) {
    results.push(await callTool(name, args));
  }

  const failed = results.filter((result) => !result.ok);
  const summary = {
    baseUrl,
    health,
    listedToolCount: listedTools.length,
    testedToolCount: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    missingCases,
    unknownCases,
    results
  };

  console.log(JSON.stringify(summary, null, 2));

  if (missingCases.length > 0 || unknownCases.length > 0 || failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
