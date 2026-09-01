import crypto from "node:crypto";

/**
 * Single-row garden store, guarded by a shared passcode.
 *
 * Required environment variables (set in the Vercel project settings):
 *   GARDEN_PASSCODE            - the secret you type in the app to unlock sync
 *   SUPABASE_URL               - https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  - service_role key (server-only, never shipped to the browser)
 *
 * GET  /api/garden   -> { data: <object|null>, updated_at: <iso|null> }
 * PUT  /api/garden   body { data: <object> }  -> { ok: true, updated_at: <iso> }
 */

const ROW_ID = "me";

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  try { return crypto.timingSafeEqual(ba, bb); } catch { return false; }
}

function readBody(req) {
  // Vercel's Node runtime usually pre-parses JSON into req.body; fall back to raw stream.
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const { GARDEN_PASSCODE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!GARDEN_PASSCODE || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "server not configured: set GARDEN_PASSCODE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY" });
  }

  const key = req.headers["x-garden-key"];
  if (!key || !timingSafeEqual(key, GARDEN_PASSCODE)) {
    return res.status(401).json({ error: "bad passcode" });
  }

  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/garden`;
  const sbHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(`${base}?id=eq.${ROW_ID}&select=data,updated_at`, { headers: sbHeaders });
      if (!r.ok) return res.status(502).json({ error: "supabase read failed", detail: await r.text() });
      const rows = await r.json();
      const row = rows[0] || { data: null, updated_at: null };
      return res.status(200).json(row);
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readBody(req);
      if (!body || typeof body.data !== "object" || body.data === null) {
        return res.status(400).json({ error: "expected JSON body { data: {...} }" });
      }
      const now = new Date().toISOString();
      const r = await fetch(base, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ id: ROW_ID, data: body.data, updated_at: now }),
      });
      if (!r.ok) return res.status(502).json({ error: "supabase write failed", detail: await r.text() });
      const rows = await r.json();
      return res.status(200).json({ ok: true, updated_at: (rows[0] && rows[0].updated_at) || now });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "unexpected", detail: String(e && e.message || e) });
  }
}
