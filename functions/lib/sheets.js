/**
 * functions/lib/sheets.js
 * Shared Google Sheets CSV fetcher + parser
 * Used by _middleware.js and api/products.js
 *
 * SKIP: Any row with CATEGORY = "SKIP" (case-insensitive) is excluded.
 * Categories are dynamic — derived from the sheet data, not hardcoded.
 */

const SHEET_ID  = '15PkQD_v8Di-8fTIYLMWY7frjy8_OWnBf3TDMzfdlbyU';
const SHEET_GID = '1576116514';
const CACHE_TTL = 300;

export async function fetchAndParseProducts() {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?output=csv&gid=${SHEET_GID}`;

  const res = await fetch(csvUrl, {
    cf: { cacheTtl: CACHE_TTL, cacheEverything: true }
  });

  if (!res.ok) throw new Error(`Google Sheets HTTP ${res.status}`);

  const csvText = await res.text();
  return parseCSV(csvText);
}

// ─── CSV PARSER ────────────────────────────────────────────────────────────────

/**
 * Expected columns (row 1 = headers, case-insensitive):
 * No | CATEGORY | shortDesc | description | finish | featured |
 * fallback_image | SKU | Name | Dimensions | Weight | Stock | Image
 */
export function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const idx = name => headers.indexOf(name);

  const COL = {
    no:            idx('no'),
    category:      idx('category'),
    shortDesc:     idx('shortdesc'),
    description:   idx('description'),
    finish:        idx('finish'),
    featured:      idx('featured'),
    fallbackImage: idx('fallback_image'),
    sku:           idx('sku'),
    name:          idx('name'),
    dimensions:    idx('dimensions'),
    weight:        idx('weight'),
    stock:         idx('stock'),
    image:         idx('image'),
  };

  const products = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const name = (cols[COL.name] || '').trim();
    if (!name) continue;

    const rawCategory = (cols[COL.category] || '').trim();

    // ── SKIP rows marked as SKIP ──────────────────────────────────────────────
    const normCat = normaliseCategory(rawCategory);
    if (normCat === 'skip') continue;

    const rawImage   = cols[COL.image] || '';
    const fallback   = cols[COL.fallbackImage] || '';
    const imageUrl   = resolveImageUrl(rawImage) || resolveImageUrl(fallback) || '';

    products.push({
      id:            (cols[COL.sku] || `PROD-${i}`).trim(),
      no:            (cols[COL.no] || String(i)).trim(),
      category:      normCat,
      categoryLabel: normalisedLabel(rawCategory),  // human-readable, preserves original case
      name,
      shortDesc:     (cols[COL.shortDesc]   || '').trim(),
      description:   (cols[COL.description] || '').trim(),
      finish:        (cols[COL.finish]       || '').trim(),
      dimensions:    (cols[COL.dimensions]   || '').trim(),
      weight:        (cols[COL.weight]       || '').trim(),
      stock:         (cols[COL.stock]        || '').trim(),
      featured:      isTruthy(cols[COL.featured]),
      images:        imageUrl ? [imageUrl] : [],
      fallbackImage: resolveImageUrl(fallback) || '',
    });
  }

  return products;
}

/** Parse one CSV row, handling quoted fields that contain commas */
function parseRow(row) {
  const result = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Normalise category text from the sheet to a URL-safe slug.
 * Returns 'skip' for any SKIP/empty/ignored marker.
 * Unknown categories are slugified and returned — they are NOT dropped.
 */
export function normaliseCategory(raw) {
  if (!raw) return 'skip';
  const s = raw.toLowerCase().trim();

  // ── Explicit skip markers ─────────────────────────────────────────────────
  if (s === 'skip' || s === '-' || s === 'x' || s === 'n/a' || s === '') return 'skip';

  // ── Known categories ──────────────────────────────────────────────────────
  if (s.includes('living') || s.includes('ruang tamu'))                      return 'living-room';
  if (s.includes('bed') || s.includes('kamar tidur'))                        return 'bedroom';
  if (s.includes('dining') || s.includes('makan'))                           return 'dining-room';
  if (s.includes('outdoor') || s.includes('garden') || s.includes('taman')) return 'outdoor';
  if (s.includes('decor') || s.includes('accent') || s.includes('aksesoris') || s.includes('ornamen')) return 'decoration';

  // ── Unknown category — slugify and preserve ───────────────────────────────
  return s.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Returns the human-readable label for a category.
 * For known slugs, returns a canonical English label.
 * For unknown categories, title-cases the original raw string.
 */
export function normalisedLabel(raw) {
  const s = (raw || '').toLowerCase().trim();
  if (s.includes('living') || s.includes('ruang tamu'))  return 'Living Room';
  if (s.includes('bed') || s.includes('kamar tidur'))    return 'Bedroom';
  if (s.includes('dining') || s.includes('makan'))       return 'Dining Room';
  if (s.includes('outdoor') || s.includes('garden'))     return 'Outdoor';
  if (s.includes('decor') || s.includes('accent') || s.includes('aksesoris')) return 'Decoration';
  // Unknown: title-case the original
  return raw.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Convert any Google Drive share URL to a fast direct image URL.
 *
 * Supported input formats:
 *   https://drive.google.com/uc?export=view&id=FILE_ID
 *   https://drive.google.com/file/d/FILE_ID/view
 *   https://drive.usercontent.google.com/download?id=FILE_ID&export=view
 *   https://lh3.googleusercontent.com/d/FILE_ID   ← already direct
 *
 * Output: https://lh3.googleusercontent.com/d/FILE_ID=w1200
 */
export function resolveImageUrl(url) {
  if (!url || !url.trim()) return '';
  url = url.trim();

  if (url.includes('lh3.googleusercontent.com')) return url;

  if (url.includes('drive.usercontent.google.com')) {
    const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
    return url;
  }

  if (url.includes('drive.google.com/uc') || url.includes('drive.google.com/open')) {
    const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  }

  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://lh3.googleusercontent.com/d/${fileMatch[1]}=w1200`;

  return url; // local path or other URL
}

function isTruthy(val) {
  if (!val) return false;
  const v = String(val).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'y' || v === 'ya';
}
