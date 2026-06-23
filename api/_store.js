/**
 * Tiny shared store for live sensor readings.
 * Uses Vercel KV / Upstash Redis (REST) when KV_REST_API_URL + KV_REST_API_TOKEN
 * are set (create a free KV store in Vercel → Storage → it auto-injects them).
 * Falls back to in-memory (per warm instance) so it still works for a quick demo.
 *
 * Files starting with "_" in /api are helpers, not HTTP routes.
 */
const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const mem = globalThis.__angawatch_store || (globalThis.__angawatch_store = new Map())

export const storeBackend = KV_URL && KV_TOKEN ? 'kv' : 'memory'

export async function storeSet(key, value) {
  const payload = typeof value === 'string' ? value : JSON.stringify(value)
  if (KV_URL && KV_TOKEN) {
    await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      body: payload,
    })
  } else {
    mem.set(key, payload)
  }
}

export async function storeGet(key) {
  if (KV_URL && KV_TOKEN) {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    })
    if (!r.ok) return null
    const j = await r.json().catch(() => null)
    return j?.result ?? null
  }
  return mem.get(key) ?? null
}
