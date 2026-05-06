import process from "node:process";
import { LINEAR_API_URL } from "./config.mjs";
import { appendLedger } from "./ledger.mjs";

export async function linearGraphql(query, variables = {}, operation = "graphql") {
  const key = process.env.LINEAR_API_KEY;
  if (!key) throw new Error("LINEAR_API_KEY is not set. Cache-only tools still work, but live sync/write tools require Linear auth.");

  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({ query, variables })
  });
  await appendLedger({ operation, linearRequests: 1, cacheHit: false });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(JSON.stringify(body.errors || body, null, 2));
  return body.data;
}
