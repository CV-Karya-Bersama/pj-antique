/**
 * js/data.js — Centralised product data loader
 * Putra Jambu Antique Website
 *
 * Fetch order:
 *   1. /api/products  (Cloudflare Pages Function — live Google Sheets)
 *   2. data/products.json  (local fallback if running offline)
 */

window.PJA = window.PJA || {};

// ─── PRODUCT LOADER ───────────────────────────────────────────────────────────

window.PJA.loadProducts = async function () {
  try {
    const res = await fetch('/api/products', { cache: 'default' });
    if (res.ok) {
      const json = await res.json();
      if (json.products && json.products.length > 0) {
        console.info(`[PJA] ${json.products.length} products loaded from Google Sheets (${json.updatedAt})`);
        
        let products = json.products;
        // Push sold out items to the bottom, maintaining relative arrival order otherwise
        products.sort((a, b) => {
          const aSold = a.stock === '0' || (a.stock && a.stock.toLowerCase().includes('sold')) ? 1 : 0;
          const bSold = b.stock === '0' || (b.stock && b.stock.toLowerCase().includes('sold')) ? 1 : 0;
          return aSold - bSold;
        });
        
        return products;
      }
    }
  } catch (e) {
    console.warn('[PJA] Live API unavailable, falling back to local JSON.', e);
  }

  try {
    const res = await fetch('data/products.json');
    if (!res.ok) throw new Error('Local JSON not found');
    const json = await res.json();
    console.info(`[PJA] ${json.products.length} products loaded from local products.json`);
    
    let products = json.products;
    products.sort((a, b) => {
      const aSold = a.stock === '0' || (a.stock && a.stock.toLowerCase().includes('sold')) ? 1 : 0;
      const bSold = b.stock === '0' || (b.stock && b.stock.toLowerCase().includes('sold')) ? 1 : 0;
      return aSold - bSold;
    });
    
    return products;
  } catch (e) {
    console.error('[PJA] Could not load products from any source.', e);
    return [];
  }
};

// ─── DYNAMIC CATEGORIES ───────────────────────────────────────────────────────

/**
 * Derive the unique category list from loaded products.
 * Preferred order: Living Room, Seater, Dining Room, Outdoor, Decoration.
 * Any additional categories from the sheet are appended alphabetically.
 */
const PREFERRED_ORDER = ['living-room', 'seater', 'dining-room', 'outdoor', 'decoration'];

window.PJA.loadCategories = function (products) {
  const catMap = new Map();

  products.forEach(p => {
    if (!p.category || p.category === 'skip') return;
    if (!catMap.has(p.category)) {
      catMap.set(p.category, p.categoryLabel || _slugToLabel(p.category));
    }
  });

  const cats = Array.from(catMap.entries()).map(([id, label]) => ({ id, label }));

  cats.sort((a, b) => {
    const ai = PREFERRED_ORDER.indexOf(a.id);
    const bi = PREFERRED_ORDER.indexOf(b.id);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.label.localeCompare(b.label);
  });

  return cats;
};

window.PJA.getCategoryLabel = function (id, categories) {
  if (categories) {
    const cat = categories.find(c => c.id === id);
    if (cat) return cat.label;
  }
  return _slugToLabel(id);
};

function _slugToLabel(slug) {
  if (!slug) return '';
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── IMAGE RESOLVER ───────────────────────────────────────────────────────────

/**
 * Resolve product image with fallback chain:
 *   1. product.images[index]
 *   2. product.fallbackImage
 *   3. Inline SVG placeholder
 */
window.PJA.resolveImage = function (product, index = 0) {
  const imgs = product.images || [];
  if (imgs[index]) return imgs[index];
  if (product.fallbackImage) return product.fallbackImage;
  // SVG placeholder — same warm cream as the site background
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' style='background:%23F0EAE2'%3E%3Ctext x='50%25' y='50%25' font-size='64' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%AA%A8%3C/text%3E%3C/svg%3E`;
};
