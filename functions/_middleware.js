/**
 * functions/_middleware.js
 * Cloudflare Pages Middleware — Edge SSR for SEO meta tags
 *
 * Intercepts requests to /product.html?id=SKU and uses HTMLRewriter
 * to inject unique <title>, <meta>, <og:*>, and JSON-LD Product schema
 * before the response reaches the browser or any crawler.
 *
 * Also handles:
 *  - /sitemap.xml  → dynamic sitemap from Google Sheets data
 *  - All other requests pass through unchanged
 */

import { fetchAndParseProducts } from './lib/sheets.js';

const SITE_URL    = 'https://antique.id';
const BRAND_NAME  = 'Putra Jambu Antique';
const BRAND_TAGLINE = 'Petrified Wood Furnistone, Ubud Bali';

// ─── CACHE ────────────────────────────────────────────────────────────────────
// Shared in-memory cache across requests (lasts for the lifetime of the isolate)
let _productCache = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getProducts() {
  if (_productCache && Date.now() - _cacheTs < CACHE_TTL_MS) {
    return _productCache;
  }
  _productCache = await fetchAndParseProducts();
  _cacheTs = Date.now();
  return _productCache;
}

// ─── MIDDLEWARE ENTRY ──────────────────────────────────────────────────────────
export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);

  // ── Route: /sitemap.xml ──────────────────────────────────────────────────
  if (url.pathname === '/sitemap.xml') {
    return handleSitemap();
  }

  // ── Route: /robots.txt (serve statically if present, else generate) ──────
  if (url.pathname === '/robots.txt') {
    return new Response(
      `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400' } }
    );
  }

  // ── Route: /collections.html (Category SEO) ─────────────────────────────
  if (url.pathname === '/collections.html' && url.searchParams.has('cat')) {
    const cat = url.searchParams.get('cat');
    // Basic protection against empty/invalid cat
    if (cat) {
      const response = await next();
      return injectCategoryMeta(response, cat, url.href);
    }
  }

  // ── Only intercept product detail pages ──────────────────────────────────
  const isProductPage = url.pathname.endsWith('/product.html') || url.pathname === '/product';
  if (!isProductPage || !url.searchParams.has('id')) {
    return next();
  }

  const id = url.searchParams.get('id');

  try {
    const products = await getProducts();
    const product  = products.find(p => p.id === id);

    if (!product) return next(); // Unknown product — serve static page as-is

    const response = await next(); // Fetch the static product.html
    return injectProductMeta(response, product, url.href);

  } catch (err) {
    console.error('[middleware] Error fetching product meta:', err);
    return next(); // Fall through gracefully
  }
}

// ─── HTML REWRITER ─────────────────────────────────────────────────────────────
function injectProductMeta(response, product, canonicalUrl) {
  const title       = buildTitle(product);
  const description = buildDescription(product);
  const image       = product.images?.[0] || product.fallbackImage || '';
  const jsonLd      = buildJsonLd(product, title, description, image, canonicalUrl);

  return new HTMLRewriter()
    .on('title', {
      element(el) { el.setInnerContent(title); }
    })
    .on('meta[name="description"]', {
      element(el) { el.setAttribute('content', description); }
    })
    // Inject all OG / Twitter / canonical / JSON-LD into <head>
    .on('head', {
      element(el) {
        el.append(`
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  ${image ? `<meta property="og:image" content="${escapeAttr(image)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(title)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  ${image ? `<meta name="twitter:image" content="${escapeAttr(image)}">` : ''}
  <script type="application/ld+json">${jsonLd}</script>`, { html: true });
      }
    })
    .transform(response);
}

function injectCategoryMeta(response, catId, canonicalUrl) {
  // Convert 'living-room' to 'Living Room'
  const catName = catId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const title = `${catName} Collection — ${BRAND_NAME}`;
  const description = `Browse our ${catName} collection of handcrafted petrified wood furniture. Unique pieces from ${BRAND_NAME}, Ubud Bali.`;

  return new HTMLRewriter()
    .on('title', {
      element(el) { el.setInnerContent(title); }
    })
    .on('meta[name="description"]', {
      element(el) { el.setAttribute('content', description); }
    })
    .on('head', {
      element(el) {
        el.append(`
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(title)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">`, { html: true });
      }
    })
    .transform(response);
}

// ─── META BUILDERS ─────────────────────────────────────────────────────────────

/**
 * Build a unique, SEO-rich title for each product.
 *
 * Format:  {Name} — {Dimensions} | {Brand}
 * Example: "Round Coffee Table — Ø 60cm × H 40cm | Putra Jambu Antique"
 *
 * If dimensions are absent, falls back to SKU:
 * Example: "Round Coffee Table — LR-023 | Putra Jambu Antique"
 */
function buildTitle(product) {
  const name    = product.name || 'Petrified Wood Piece';
  const dim     = product.dimensions ? product.dimensions.replace(/\s+/g, ' ').trim() : '';
  const sku     = product.id || '';
  const suffix  = dim || (sku ? `SKU ${sku}` : '');
  return suffix
    ? `${name} — ${suffix} | ${BRAND_NAME}`
    : `${name} | ${BRAND_NAME}`;
}

/**
 * Build a unique meta description per product.
 *
 * Strategy:
 *   Even when 200 products share the same shortDesc (e.g. "Natural edge coffee table"),
 *   the meta description is made unique by appending structured data:
 *   dimensions, weight, finish, and SKU — which are always different per product.
 *
 * Format:
 *   {shortDesc}. {Name}, {Dimensions}. {Weight}. Finish: {finish}. Ref: {SKU}.
 *   Handcrafted by Putra Jambu Antique, Ubud Bali.
 */
function buildDescription(product) {
  const parts = [];

  // Prose part (may be shared — that's OK)
  if (product.shortDesc) parts.push(product.shortDesc.replace(/\.?$/, ''));

  // Structured data part — ALWAYS unique per product
  const structured = [
    product.name,
    product.dimensions,
    product.weight      ? `Weight: ${product.weight}`   : null,
    product.finish      ? `Finish: ${product.finish}`   : null,
    product.id          ? `Ref: ${product.id}`          : null,
  ].filter(Boolean).join('. ');

  if (structured) parts.push(structured);

  const brand = `Handcrafted by ${BRAND_NAME}, Ubud Bali`;
  parts.push(brand);

  let desc = parts.join('. ');

  // Keep under 160 chars
  if (desc.length > 160) {
    // Trim the prose, keep the structured data (which contains the unique SKU)
    const essential = [
      structured,
      brand,
    ].join('. ');
    desc = essential.length <= 160
      ? essential
      : essential.slice(0, 157) + '\u2026';
  }

  return desc || `Handcrafted petrified wood furniture by ${BRAND_NAME}. Visit our showroom in Ubud, Bali.`;
}

/**
 * JSON-LD Product schema — helps Google display rich results and
 * differentiate products even when names are similar.
 */
function buildJsonLd(product, title, description, image, url) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name || title,
    "description": description,
    "sku": product.id,
    "mpn": product.id,
    "image": image ? [image] : [],
    "brand": {
      "@type": "Brand",
      "name": BRAND_NAME
    },
    "manufacturer": {
      "@type": "Organization",
      "name": "CV Karya Bersama",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Ubud",
        "addressRegion": "Bali",
        "addressCountry": "ID"
      }
    },
    "material": "Petrified Wood"
  };

  if (product.dimensions) schema.depth = product.dimensions;
  if (product.weight)     schema.weight = product.weight;
  if (product.finish)     schema.color  = product.finish;

  return JSON.stringify(schema);
}

function getAvailabilitySchema(stock) {
  if (!stock) return 'https://schema.org/InStock';
  const s = stock.toLowerCase();
  if (s.includes('sold') || s.includes('habis')) return 'https://schema.org/SoldOut';
  if (s.includes('order') || s.includes('indent')) return 'https://schema.org/PreOrder';
  return 'https://schema.org/InStock';
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── SITEMAP ───────────────────────────────────────────────────────────────────
async function handleSitemap() {
  let productUrls = '';
  let categoryUrls = '';

  try {
    const products = await getProducts();
    
    // Generate Product URLs
    productUrls = products.map(p => `
  <url>
    <loc>${SITE_URL}/product.html?id=${encodeURIComponent(p.id)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');

    // Generate Category URLs dynamically from unique categories in products
    const uniqueCats = [...new Set(products.map(p => p.category).filter(Boolean))];
    categoryUrls = uniqueCats.map(cat => `
  <url>
    <loc>${SITE_URL}/collections.html?cat=${encodeURIComponent(cat)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  } catch (e) {
    console.error('[middleware] Sitemap: could not fetch products', e);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/collections.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${SITE_URL}/contact.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>${categoryUrls}${productUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    }
  });
}
