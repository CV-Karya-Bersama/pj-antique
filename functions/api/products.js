/**
 * functions/api/products.js
 * Cloudflare Pages Function — GET /api/products
 *
 * Returns all products as JSON, fetched live from Google Sheets.
 * Used by the client-side JS on all pages.
 */

import { fetchAndParseProducts } from '../lib/sheets.js';

const CACHE_TTL = 300;

export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const products = await fetchAndParseProducts();
    return new Response(
      JSON.stringify({ products, updatedAt: new Date().toISOString() }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, products: [] }),
      { status: 500, headers: corsHeaders }
    );
  }
}
