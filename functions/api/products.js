/**
 * functions/api/products.js
 * Cloudflare Pages Function — GET /api/products
 *
 * Caching strategy (fastest → slowest):
 *   1. Cloudflare KV  (PRODUCTS_CACHE binding) — ~5ms, TTL 10 min
 *   2. Live Google Sheets fetch                 — ~2–5 sec
 *
 * To enable KV caching:
 *   1. Go to Cloudflare Dashboard → Workers & Pages → your project
 *   2. Settings → Functions → KV namespace bindings
 *   3. Add binding: Variable name = PRODUCTS_CACHE, select (or create) a KV namespace
 */

import { fetchAndParseProducts } from '../lib/sheets.js';

const KV_KEY    = 'products_v1';
const KV_TTL    = 600; // 10 minutes in seconds
const HTTP_TTL  = 300; // 5 minutes for browser/CDN HTTP cache

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const kv = context.env?.PRODUCTS_CACHE;

  // ── 1. Try KV cache first ─────────────────────────────────────────────────
  if (kv) {
    try {
      const cached = await kv.get(KV_KEY, { type: 'json' });
      if (cached) {
        return new Response(
          JSON.stringify({ ...cached, fromCache: true }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Cache-Control': `public, max-age=${HTTP_TTL}, s-maxage=${HTTP_TTL}`,
              'X-Cache': 'HIT',
            },
          }
        );
      }
    } catch (e) {
      console.warn('[PJA] KV read failed, falling back to live fetch:', e.message);
    }
  }

  // ── 2. Cache miss — fetch live from Google Sheets ─────────────────────────
  try {
    const products = await fetchAndParseProducts();
    const payload  = { products, updatedAt: new Date().toISOString() };

    // Write to KV in the background (don't block the response)
    if (kv) {
      context.waitUntil(
        kv.put(KV_KEY, JSON.stringify(payload), { expirationTtl: KV_TTL })
          .catch(e => console.warn('[PJA] KV write failed:', e.message))
      );
    }

    return new Response(
      JSON.stringify({ ...payload, fromCache: false }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': `public, max-age=${HTTP_TTL}, s-maxage=${HTTP_TTL}`,
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, products: [] }),
      { status: 500, headers: corsHeaders }
    );
  }
}

