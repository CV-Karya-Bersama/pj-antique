/* ============================================================
   product.js — Product detail page logic
   PJ Antique Website
   ============================================================ */

(function () {
  'use strict';

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = 'collections.html';
    return;
  }

  /* ---- Image gallery logic ---- */
  function initGallery(images) {
    const mainImg = document.querySelector('.product-gallery__main img');
    const thumbs  = document.querySelectorAll('.product-gallery__thumb');

    if (!mainImg || !thumbs.length) return;

    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => {
        mainImg.src = images[i];
        mainImg.alt = thumb.alt;
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }

  /* ---- Build product detail HTML ---- */
  function renderProduct(product, categories) {
    const container = document.getElementById('productDetailInner');
    if (!container) return;

    const cat = categories.find(c => c.id === product.category);

    // Breadcrumb
    const bcCatLink = document.getElementById('breadcrumb-cat-link');
    const bcName    = document.getElementById('breadcrumb-name');
    if (bcCatLink && cat) {
      bcCatLink.href = `collections.html?cat=${cat.id}`;
      bcCatLink.textContent = cat.label;
    }
    if (bcName) bcName.textContent = product.name;

    // Build image gallery markup
    const thumbsHTML = product.images.map((img, i) =>
      `<img src="${window.PJA.resolveImage(product, i)}" alt="Petrified Wood ${product.name} — ${catLabel} — View ${i + 1}"
            class="product-gallery__thumb ${i === 0 ? 'active' : ''}"
            loading="lazy"
            onerror="this.src='${product.fallbackImage || '/images/prod_coffee_table.png'}';this.onerror=null;">`
    ).join('');

    // Build specs table
    const specs = [
      { key: 'Material',   val: product.material },
      { key: 'Dimensions', val: product.dimensions },
      { key: 'Weight',     val: product.weight },
      { key: 'Finish',     val: product.finish },
      { key: 'Product ID', val: product.id },
    ];
    const specsHTML = specs
      .filter(s => s.val)
      .map(s => `
        <div class="product-spec">
          <span class="product-spec__key">${s.key}</span>
          <span class="product-spec__val">${s.val}</span>
        </div>`).join('');

    const catLabel = product.categoryLabel || window.PJA.getCategoryLabel(product.category);

    container.innerHTML = `
      <!-- GALLERY -->
      <div class="product-gallery" data-animate="left">
        <div class="product-gallery__main">
          <img src="${window.PJA.resolveImage(product)}" alt="Petrified Wood ${product.name} — ${catLabel} Collection" loading="eager"
               onerror="this.src='${product.fallbackImage || '/images/prod_coffee_table.png'}';this.onerror=null;">
        </div>
        ${product.images.length > 1 ? `<div class="product-gallery__thumbs">${thumbsHTML}</div>` : ''}
      </div>

      <!-- INFO -->
      <div class="product-info" data-animate="right">
        <p class="label" style="margin-bottom:0.5rem;">${catLabel}</p>
        <h1 class="product-info__name">${product.name}</h1>

        <div class="product-specs">
          ${specsHTML}
        </div>

        <div class="product-info__cta">
          <a href="contact.html#contact-form?interest=${product.category}&product=${encodeURIComponent(product.name)}"
             class="btn btn--dark"
             id="product-enquire-btn">
            Enquire About This Piece
          </a>
          <a href="tel:+6285695564699" class="btn btn--ghost" id="product-call-btn">
            Call Us — +62 856-9556-4699
          </a>
          <p class="product-info__note">
            Each piece is unique. Contact us to check availability and arrange a viewing at our Ubud, Bali showroom.
          </p>
        </div>
      </div>
    `;

    // Animate newly added elements
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
        });
      }, { threshold: 0.1 });
      container.querySelectorAll('[data-animate]').forEach(el => io.observe(el));
    } else {
      container.querySelectorAll('[data-animate]').forEach(el => el.classList.add('visible'));
    }

    // Init gallery interactivity
    if (product.images.length > 1) initGallery(product.images);

    // Update page title
    document.title = `${product.name} — PJ Antique`;
  }

  /* ---- Build related products carousel ---- */
  function renderRelated(product, allProducts, categories) {
    const track = document.getElementById('relatedTrack');
    if (!track) return;

    const related = allProducts
      .filter(p => p.id !== product.id && p.category === product.category)
      .slice(0, 6);

    if (related.length === 0) {
      const section = document.querySelector('.related-section');
      if (section) section.style.display = 'none';
      return;
    }

    related.forEach(p => {
      const cat = categories.find(c => c.id === p.category);
      track.innerHTML += `
        <a href="product.html?id=${p.id}" class="prod-card" role="listitem">
          <div class="prod-card__img-wrap">
            <img src="${p.images[0]}" alt="${p.name}" class="prod-card__img" loading="lazy">
          </div>
          <div class="prod-card__info">
            <p class="prod-card__cat">${cat ? cat.label : p.category}</p>
            <h3 class="prod-card__name">${p.name}</h3>
            <p class="prod-card__short">${p.shortDesc}</p>
            <span class="prod-card__action">View Details</span>
          </div>
        </a>`;
    });
  }

  /* ---- Init ---- */
  window.PJA.loadProducts()
    .then(products => {
      const product = products.find(p => p.id === productId);
      if (!product) { window.location.href = 'collections.html'; return; }
      const categories = window.PJA.loadCategories(products);
      renderProduct(product, categories);
      renderRelated(product, products, categories);
    })
    .catch(err => {
      console.error('Failed to load product data:', err);
      const container = document.getElementById('productDetailInner');
      if (container) container.innerHTML = '<p style="color:var(--warm-gray)">Unable to load product. Please try again.</p>';
    });

})();
