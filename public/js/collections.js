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

  const PAGE_SIZE = 24;
  let currentPage = 1;
  let currentFiltered = [];

  /* ──────────────────────────────────────────────────────────
     RENDER PRODUCT GRID
  ────────────────────────────────────────────────────────── */
  function renderGrid(products, append = false) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (!append) {
      grid.innerHTML = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (products.length === 0 && !append) {
      grid.innerHTML = '<p class="no-results">No pieces found in this category.</p>';
      return;
    }

    products.forEach((p, i) => {
      const catLabel = p.categoryLabel || window.PJA.getCategoryLabel(p.category, allCategories);
      const imgSrc   = window.PJA.resolveImage(p);
      const fbSrc    = p.fallbackImage || '/images/prod_coffee_table.png';

      const card = document.createElement('a');
      card.href      = `/product?id=${encodeURIComponent(p.id)}`;
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
          <p class="prod-card__short" style="font-size: 0.85rem; color: var(--warm-gray); margin-top: 0.25rem;">SKU: ${p.id}</p>
          ${p.dimensions ? `<p class="prod-card__dim">${p.dimensions}</p>` : ''}
          ${p.weight ? `<p class="prod-card__dim">${p.weight} kg</p>` : ''}
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
      grid.querySelectorAll('[data-animate]:not(.visible)').forEach(el => io.observe(el));
    } else {
      grid.querySelectorAll('[data-animate]:not(.visible)').forEach(el => el.classList.add('visible'));
    }

    renderLoadMoreButton();
  }

  function renderLoadMoreButton() {
    const grid = document.getElementById('productsGrid');
    let btnWrap = document.getElementById('loadMoreWrap');
    
    if (currentPage * PAGE_SIZE >= currentFiltered.length) {
      if (btnWrap) btnWrap.remove();
      return;
    }

    if (!btnWrap) {
      btnWrap = document.createElement('div');
      btnWrap.id = 'loadMoreWrap';
      btnWrap.style.textAlign = 'center';
      btnWrap.style.marginTop = '3rem';
      btnWrap.style.gridColumn = '1 / -1';
      
      const btn = document.createElement('button');
      btn.className = 'btn btn--dark';
      btn.textContent = 'Load More';
      btn.addEventListener('click', () => {
        const start = currentPage * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        currentPage++;
        renderGrid(currentFiltered.slice(start, end), true);
      });
      
      btnWrap.appendChild(btn);
      grid.appendChild(btnWrap);
    } else {
      // Move it to the end of the grid
      grid.appendChild(btnWrap);
    }
  }

  /* ──────────────────────────────────────────────────────────
     FILTER LOGIC
  ────────────────────────────────────────────────────────── */
  function applyFilter(cat, query = '', sort = 'default') {
    activeFilter = cat;
    currentPage = 1;
    
    const q = query.toLowerCase().trim();
    
    currentFiltered = allProducts.filter(p => {
      const matchCat = cat === 'all' || p.category === cat;
      const matchQuery = !q || p.name.toLowerCase().includes(q) || (p.id && p.id.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });

    // Apply sorting
    if (sort !== 'default') {
      currentFiltered.sort((a, b) => {
        if (sort === 'weight-desc' || sort === 'weight-asc') {
          const wA = parseFloat(a.weight) || 0;
          const wB = parseFloat(b.weight) || 0;
          return sort === 'weight-desc' ? wB - wA : wA - wB;
        }
        if (sort === 'name-asc' || sort === 'name-desc') {
          const nA = a.name.toLowerCase();
          const nB = b.name.toLowerCase();
          if (nA < nB) return sort === 'name-asc' ? -1 : 1;
          if (nA > nB) return sort === 'name-asc' ? 1 : -1;
          return 0;
        }
        return 0;
      });
    }
      
    renderGrid(currentFiltered.slice(0, PAGE_SIZE));

    // Update result count
    const countEl = document.getElementById('resultCount');
    if (countEl) {
      const label = cat === 'all' ? 'all pieces' : allCategories.find(c => c.id === cat)?.label || cat;
      countEl.textContent = `${currentFiltered.length} ${currentFiltered.length === 1 ? 'piece' : 'pieces'}${cat !== 'all' ? ` in ${label}` : ''}`;
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
        
        const searchInput = document.getElementById('searchInput');
        const sortSelect = document.getElementById('sortSelect');
        const query = searchInput ? searchInput.value : '';
        const sort = sortSelect ? sortSelect.value : 'default';
        applyFilter(cat, query, sort);
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

      // Search Event Listener
      const searchInput = document.getElementById('searchInput');
      const sortSelect = document.getElementById('sortSelect');
      
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          applyFilter(activeFilter, e.target.value, sortSelect ? sortSelect.value : 'default');
        });
      }
      
      // Sort Event Listener
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          applyFilter(activeFilter, searchInput ? searchInput.value : '', e.target.value);
        });
      }
    })
    .catch(err => {
      console.error('[PJA] Failed to load products:', err);
      const grid = document.getElementById('productsGrid');
      if (grid) grid.innerHTML = '<p class="no-results">Unable to load products. Please try again or <a href="/contact">contact us</a>.</p>';
    });

})();
