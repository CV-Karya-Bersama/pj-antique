/* ============================================================
   collections.js — Dynamic filter & product grid
   PJ Antique Website
   ============================================================ */

(function () {
  'use strict';

  let allProducts  = [];
  let allCategories = [];
  let activeFilter = 'all';

  const urlParams = new URLSearchParams(window.location.search);
  const initCat   = urlParams.get('cat') || 'all';

  /* ──────────────────────────────────────────────────────────
     RENDER PRODUCT GRID
  ────────────────────────────────────────────────────────── */
  function renderGrid(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (products.length === 0) {
      grid.innerHTML = '<p class="no-results">No pieces found in this category.</p>';
      return;
    }

    products.forEach((p, i) => {
      const catLabel = p.categoryLabel || window.PJA.getCategoryLabel(p.category, allCategories);
      const imgSrc   = window.PJA.resolveImage(p);
      const fbSrc    = p.fallbackImage || 'images/prod_coffee_table.png';

      const card = document.createElement('a');
      card.href      = `product.html?id=${encodeURIComponent(p.id)}`;
      card.className = 'prod-card';
      card.setAttribute('role', 'listitem');
      card.id        = `grid-prod-${p.id}`;
      card.setAttribute('data-animate', '');
      card.style.transitionDelay = `${(i % 4) * 60}ms`;

      card.innerHTML = `
        <div class="prod-card__img-wrap">
          <img src="${imgSrc}" alt="Petrified Wood ${p.name} — ${catLabel} Collection" class="prod-card__img" loading="lazy"
               onerror="this.src='${fbSrc}';this.onerror=null;">
          ${p.featured ? '<span class="prod-card__badge">Featured</span>' : ''}
          ${p.stock && p.stock.toLowerCase().includes('sold') ? '<span class="prod-card__badge prod-card__badge--sold">Sold</span>' : ''}
        </div>
        <div class="prod-card__info">
          <p class="prod-card__cat">${catLabel}</p>
          <h3 class="prod-card__name">${p.name}</h3>
          <p class="prod-card__short">${p.shortDesc}</p>
          ${p.dimensions ? `<p class="prod-card__dim">${p.dimensions}</p>` : ''}
          <span class="prod-card__action">View Details</span>
        </div>
      `;

      grid.appendChild(card);
    });

    // Trigger intersection observer for new cards
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
        });
      }, { threshold: 0.06 });
      grid.querySelectorAll('[data-animate]').forEach(el => io.observe(el));
    } else {
      grid.querySelectorAll('[data-animate]').forEach(el => el.classList.add('visible'));
    }
  }

  /* ──────────────────────────────────────────────────────────
     FILTER LOGIC
  ────────────────────────────────────────────────────────── */
  function applyFilter(cat) {
    activeFilter = cat;
    const filtered = cat === 'all'
      ? allProducts
      : allProducts.filter(p => p.category === cat);
    renderGrid(filtered);

    // Update result count
    const countEl = document.getElementById('resultCount');
    if (countEl) {
      const label = cat === 'all' ? 'all pieces' : allCategories.find(c => c.id === cat)?.label || cat;
      countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'piece' : 'pieces'}${cat !== 'all' ? ` in ${label}` : ''}`;
    }
  }

  /* ──────────────────────────────────────────────────────────
     DYNAMIC FILTER BUTTONS
  ────────────────────────────────────────────────────────── */
  function renderFilterButtons(categories) {
    const container = document.getElementById('filterButtons');
    if (!container) return;

    const makeBtn = (cat, label, isActive) => {
      const btn = document.createElement('button');
      btn.className   = `filter-btn${isActive ? ' active' : ''}`;
      btn.dataset.cat = cat;
      btn.id          = `filter-${cat}`;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const url = new URL(window.location);
        cat === 'all' ? url.searchParams.delete('cat') : url.searchParams.set('cat', cat);
        window.history.replaceState({}, '', url);
        applyFilter(cat);
      });
      return btn;
    };

    container.innerHTML = '';
    container.appendChild(makeBtn('all', 'All Pieces', activeFilter === 'all'));
    categories.forEach(c => {
      container.appendChild(makeBtn(c.id, c.label, activeFilter === c.id));
    });
  }

  /* ──────────────────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────────────────── */
  window.PJA.loadProducts()
    .then(products => {
      allProducts   = products;
      allCategories = window.PJA.loadCategories(products);

      // Remove loading message
      const loadingMsg = document.getElementById('loadingMsg');
      if (loadingMsg) loadingMsg.remove();

      // Render filter buttons (dynamic from data)
      renderFilterButtons(allCategories);

      // Apply initial category from URL
      if (initCat !== 'all') {
        activeFilter = initCat;
      }

      applyFilter(activeFilter);
    })
    .catch(err => {
      console.error('[PJA] Failed to load products:', err);
      const grid = document.getElementById('productsGrid');
      if (grid) grid.innerHTML = '<p class="no-results">Unable to load products. Please try again or <a href="contact.html">contact us</a>.</p>';
    });

})();
