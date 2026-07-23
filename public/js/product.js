/* ============================================================
   product.js — Product detail page logic
   PJ Antique Website
   ============================================================ */

(function () {
  'use strict';

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = '/collections';
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

  /* ---- Lightbox Logic ---- */
  function initLightbox() {
    const mainImg = document.querySelector('.product-gallery__main img');
    if (!mainImg) return;
    
    let lb = document.querySelector('.lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = `<div class="lightbox-close">&times;</div><img class="lightbox-img" src="" alt="">`;
      document.body.appendChild(lb);
    }
    
    const lbImg = lb.querySelector('.lightbox-img');
    
    mainImg.style.cursor = 'zoom-in';
    mainImg.addEventListener('click', () => {
      lbImg.src = mainImg.src;
      lbImg.alt = mainImg.alt;
      lb.classList.add('active');
    });
    
    lb.addEventListener('click', () => {
      lb.classList.remove('active');
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
      bcCatLink.href = `/collections?cat=${cat.id}`;
      bcCatLink.textContent = cat.label;
    }
    if (bcName) bcName.textContent = product.name;

    const catLabel = product.categoryLabel || window.PJA.getCategoryLabel(product.category, categories);

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
          <a href="/contact#contact-form?interest=${product.category}&product=${encodeURIComponent(product.name)}"
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
    initLightbox();

    // Update SEO Meta Tags
    document.title = `Petrified Wood ${product.name} - ${product.id} — PJ Antique`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    const dims = product.dimensions ? ` Dimensions: ${product.dimensions}.` : '';
    const wgt = product.weight ? ` Weight: ${product.weight} kg.` : '';
    metaDesc.content = `Discover our premium Petrified Wood ${product.name}. Authentic, handcrafted fossil wood furniture from Indonesia.${dims}${wgt} SKU: ${product.id}.`;
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
        <a href="/product?id=${encodeURIComponent(p.id)}" class="prod-card">
          <div class="prod-card__img-wrap">
            <img src="${window.PJA.resolveImage(p)}" alt="${p.name}" class="prod-card__img" loading="lazy" onerror="this.src='${p.fallbackImage || '/images/prod_coffee_table.png'}';this.onerror=null;">
          </div>
          <div class="prod-card__info">
            <h3 class="prod-card__name">${p.name}</h3>
            <p class="prod-card__short" style="font-size: 0.85rem; color: var(--warm-gray); margin-top: 0.25rem;">SKU: ${p.id}</p>
            ${p.dimensions ? `<p class="prod-card__dim">${p.dimensions}</p>` : ''}
            ${p.weight ? `<p class="prod-card__dim">${p.weight} kg</p>` : ''}
            <span class="prod-card__action">View Details</span>
          </div>
        </a>`;
    });

    // Init related products navigation
    const btnPrev = document.getElementById('related-prev');
    const btnNext = document.getElementById('related-next');
    if (btnPrev && btnNext) {
      btnPrev.addEventListener('click', () => {
        track.scrollBy({ left: -340, behavior: 'smooth' });
      });
      btnNext.addEventListener('click', () => {
        track.scrollBy({ left: 340, behavior: 'smooth' });
      });
    }
  }

  /* ---- Init ---- */
  window.PJA.loadProducts()
    .then(products => {
      const product = products.find(p => p.id === productId);
      if (!product) { window.location.href = '/collections'; return; }
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
