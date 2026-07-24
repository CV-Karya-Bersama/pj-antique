/**
 * functions/_middleware.js
 * Cloudflare Pages Middleware — Edge SSR for SEO meta tags
 *
 * Intercepts requests to /product.html?id=SKU and uses HTMLRewriter
 * to inject unique <title>, <meta>, <og:*>, and JSON-LD Product schema
 * before the response reaches the browser or any crawler.
 *
 * Also handles:
 *  - /sitemap.xml        → dynamic sitemap from Google Sheets data
 *  - Accept: text/markdown → converts any HTML page to Markdown on the fly
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

async function getProducts(env) {
  if (_productCache && Date.now() - _cacheTs < CACHE_TTL_MS) {
    return _productCache;
  }
  
  const kv = env?.PRODUCTS_CACHE;
  if (kv) {
    try {
      const cached = await kv.get('products_v1', { type: 'json' });
      if (cached && cached.products) {
        _productCache = cached.products;
        _cacheTs = Date.now();
        return _productCache;
      }
    } catch (e) {
      console.warn('[middleware] KV read failed:', e.message);
    }
  }

  _productCache = await fetchAndParseProducts();
  _cacheTs = Date.now();
  return _productCache;
}

// ─── DYNAMIC MARKDOWN GENERATOR (For Product Pages) ────────────────────────────
function generateProductMarkdown(product, canonicalUrl) {
  const title = buildTitle(product);
  const description = buildDescription(product);
  const image = product.images?.[0] || product.fallbackImage || '';
  const now = new Date().toISOString();
  
  return `---
created: ${now}
tags: [${product.category || 'Petrified Wood'}]
source: ${canonicalUrl}
---

# ${title}

> ## Excerpt
> ${description}

---
${image ? `![${product.name || 'Product Image'}](${image})` : ''}

## Specifications
- **Category:** ${product.category || 'N/A'}
- **SKU:** ${product.id}
- **Dimensions:** ${product.dimensions || 'N/A'}
- **Weight:** ${product.weight || 'N/A'}
- **Finish:** ${product.finish || 'N/A'}

## About Putra Jambu Antique
One-of-a-kind petrified wood furniture and décor, handcrafted by CV Karya Bersama.

### Collections
- [Living Room](https://antique.id/collections?cat=living-room)
- [Seater](https://antique.id/collections?cat=seater)
- [Dining Room](https://antique.id/collections?cat=dining-room)
- [Outdoor](https://antique.id/collections?cat=outdoor)
- [Decoration](https://antique.id/collections?cat=decoration)
- [All Pieces](https://antique.id/collections)

### Contact
- Flagship Showroom: Mas, Ubud, Gianyar, Bali 80571, Indonesia
- WhatsApp: [+62 857-1823-3007](https://wa.me/6285718233007)
- Email: [info@antique.id](mailto:info@antique.id)

© ${new Date().getFullYear()} Putra Jambu Antique by CV Karya Bersama.
`;
}


// ─── MIDDLEWARE ENTRY ──────────────────────────────────────────────────────────
export async function onRequest({ request, next, env }) {
  const url    = new URL(request.url);
  const accept = request.headers.get('Accept') || '';

  // ── Content Negotiation: Accept: text/markdown ────────────────────────────
  // When a client requests Markdown (e.g. curl -H "Accept: text/markdown" URL),
  // fetch the HTML response then convert it to clean Markdown at the edge.
  if (accept.includes('text/markdown')) {
    const isProductPage = url.pathname.endsWith('/product.html') || url.pathname === '/product';
    const id = url.searchParams.get('id');

    // 1. Dynamic Markdown for Product Pages (since the HTML is just an empty shell)
    if (isProductPage && id) {
      try {
        const products = await getProducts(env);
        const product  = products.find(p => p.id === id);
        if (product) {
          const markdown = generateProductMarkdown(product, url.href);
          return new Response(markdown, {
            status: 200,
            headers: {
              'Content-Type': 'text/markdown; charset=utf-8',
              'Cache-Control': 'public, max-age=300',
              'Vary': 'Accept',
            }
          });
        }
      } catch (err) {
        console.error('[middleware] Error fetching product for markdown:', err);
      }
    }

    // 2. Generic HTML-to-Markdown fallback for all other static pages
    const response = await next();
    const contentType = response.headers.get('Content-Type') || '';
    // Only convert HTML responses — pass API/XML/asset responses through unchanged
    if (contentType.includes('text/html')) {
      const html = await response.text();
      const markdown = htmlToMarkdown(html, url);
      return new Response(markdown, {
        status: response.status,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Vary': 'Accept',
        }
      });
    }
    return response;
  }

  // ── Route: /sitemap.xml ──────────────────────────────────────────────────
  if (url.pathname === '/sitemap.xml') {
    return handleSitemap(env);
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
    const products = await getProducts(env);
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

  // Use a flag to only append JSON-LD once (not replace — it's not in static HTML)
  let jsonLdAppended = false;

  return new HTMLRewriter()
    // ── Replace <title> ───────────────────────────────────────────────────
    .on('title', {
      element(el) { el.setInnerContent(title); }
    })
    // ── Replace meta description ──────────────────────────────────────────
    .on('meta[name="description"]', {
      element(el) { el.setAttribute('content', description); }
    })
    // ── Replace OG tags in-place (so no duplicates reach crawlers) ────────
    .on('meta[property="og:title"]', {
      element(el) { el.setAttribute('content', title); }
    })
    .on('meta[property="og:description"]', {
      element(el) { el.setAttribute('content', description); }
    })
    .on('meta[property="og:url"]', {
      element(el) { el.setAttribute('content', canonicalUrl); }
    })
    .on('meta[property="og:image"]', {
      element(el) {
        if (image) el.setAttribute('content', image);
      }
    })
    .on('meta[property="og:type"]', {
      element(el) { el.setAttribute('content', 'product'); }
    })
    // ── Replace Twitter card tags in-place ────────────────────────────────
    .on('meta[name="twitter:title"]', {
      element(el) { el.setAttribute('content', title); }
    })
    .on('meta[name="twitter:description"]', {
      element(el) { el.setAttribute('content', description); }
    })
    .on('meta[name="twitter:image"]', {
      element(el) {
        if (image) el.setAttribute('content', image);
      }
    })
    // ── Replace existing canonical if present, otherwise we append below ──
    .on('link[rel="canonical"]', {
      element(el) { el.setAttribute('href', canonicalUrl); }
    })
    // ── Append only what doesn't exist in the static HTML (JSON-LD) ───────
    .on('head', {
      element(el) {
        if (!jsonLdAppended) {
          jsonLdAppended = true;
          el.append(`<script type="application/ld+json">${jsonLd}</script>`, { html: true });
        }
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
async function handleSitemap(env) {
  let productUrls = '';
  let categoryUrls = '';

  try {
    const products = await getProducts(env);
    
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

// ─── HTML → MARKDOWN CONVERTER ────────────────────────────────────────────────
/**
 * Converts an HTML string to clean Markdown using HTMLRewriter.
 * Runs entirely at the edge with zero external dependencies.
 *
 * Handles: h1-h6, p, a, img, strong/b, em/i, code, pre, blockquote,
 *          ul/ol/li, table/tr/th/td, hr, br, nav, footer (stripped).
 *
 * Usage: GET /any-page  with  Accept: text/markdown
 */
function htmlToMarkdown(html, url) {
  // We build the markdown by accumulating text chunks via a state machine.
  // HTMLRewriter is streaming/async, but since we already have the full HTML
  // string here we can use a simple regex-based approach that's fast and
  // dependency-free for a Worker context.

  let md = html;

  // ── 1. Strip elements we never want ──────────────────────────────────────
  const STRIP_TAGS = ['script', 'style', 'nav', 'header', 'footer',
                      'noscript', 'svg', 'form', 'button', 'iframe',
                      'aside', '.page-transition', '.nav__mobile'];
  for (const tag of ['script','style','nav','header','footer','noscript',
                     'svg','form','button','iframe','aside']) {
    md = md.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
  }
  // Strip remaining self-closing / void tags that add noise
  md = md.replace(/<(link|meta|input|br\s*\/?)(\s[^>]*)?\/?>/gi, '\n');

  // ── 2. Block elements → Markdown ─────────────────────────────────────────
  // Headings
  for (let i = 6; i >= 1; i--) {
    const hashes = '#'.repeat(i);
    md = md.replace(new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, 'gi'),
      (_, inner) => `\n\n${hashes} ${stripTags(inner).trim()}\n\n`);
  }

  // Blockquote
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, inner) => inner.trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n');

  // Pre / code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, inner) => `\n\`\`\`\n${decodeEntities(inner)}\n\`\`\`\n\n`);
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_, inner) => `\n\`\`\`\n${decodeEntities(stripTags(inner))}\n\`\`\`\n\n`);

  // HR
  md = md.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // ── 3. Inline elements → Markdown ────────────────────────────────────────
  // Images (before links so nested <a><img></a> works)
  md = md.replace(/<img[^>]+alt="([^"]*)"[^>]+src="([^"]*)"[^>]*\/?>/gi,
    (_, alt, src) => `![${alt}](${src})`);
  md = md.replace(/<img[^>]+src="([^"]*)"[^>]*(?:alt="([^"]*)")?[^>]*\/?>/gi,
    (_, src, alt='') => `![${alt}](${src})`);

  // Links
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, inner) => {
      const text = stripTags(inner).trim();
      if (!text) return '';
      // Make relative URLs absolute
      const absHref = href.startsWith('http') ? href
        : href.startsWith('/') ? `${url.origin}${href}` : href;
      return `[${text}](${absHref})`;
    });

  // Bold / Italic
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, (_, _t, inner) => `**${stripTags(inner).trim()}**`);
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi,         (_, _t, inner) => `_${stripTags(inner).trim()}_`);

  // Inline code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, inner) => `\`${decodeEntities(inner)}\``);

  // ── 4. Lists ──────────────────────────────────────────────────────────────
  // Ordered list items
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let i = 0;
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,
      (_, li) => `${++i}. ${stripTags(li).trim()}\n`) + '\n';
  });
  // Unordered list items
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) =>
    inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,
      (_, li) => `- ${stripTags(li).trim()}\n`) + '\n');

  // ── 5. Tables ─────────────────────────────────────────────────────────────
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, inner) => {
    const rows = [];
    inner.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row) => {
      const cells = [];
      row.replace(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi, (_, cell) => {
        cells.push(stripTags(cell).trim());
      });
      rows.push(cells);
    });
    if (!rows.length) return '';
    const header = `| ${rows[0].join(' | ')} |`;
    const divider = `| ${rows[0].map(() => '---').join(' | ')} |`;
    const body = rows.slice(1).map(r => `| ${r.join(' | ')} |`).join('\n');
    return `\n${header}\n${divider}\n${body}\n\n`;
  });

  // ── 6. Paragraphs & line breaks ───────────────────────────────────────────
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_, inner) => `\n${stripTags(inner).trim()}\n\n`);
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<\/?(div|section|article|main|span|label)[^>]*>/gi, '\n');

  // ── 7. Remaining tags & cleanup ───────────────────────────────────────────
  md = md.replace(/<[^>]+>/g, '');           // strip any remaining tags
  md = decodeEntities(md);                    // decode &amp; &nbsp; etc.
  md = md.replace(/\n{3,}/g, '\n\n');        // collapse excess blank lines
  md = md.trim();

  // ── 8. Add a header with page URL ─────────────────────────────────────────
  const pageLabel = url.pathname === '/' ? 'Home' : url.pathname.replace(/^\//, '');
  return `<!-- Putra Jambu Antique — ${SITE_URL}${url.pathname} -->\n<!-- Generated by content negotiation (Accept: text/markdown) -->\n\n${md}\n\n---\n*Source: [${pageLabel}](${SITE_URL}${url.pathname}${url.search})*\n`;
}

/** Strip all HTML tags from a string */
function stripTags(str) {
  return (str || '').replace(/<[^>]+>/g, '');
}

/** Decode common HTML entities */
function decodeEntities(str) {
  return (str || '')
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&quot;/g,  '"')
    .replace(/&#39;/g,   "'")
    .replace(/&nbsp;/g,  ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&rsaquo;/g, '›')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

