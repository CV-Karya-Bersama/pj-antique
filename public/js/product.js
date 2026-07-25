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
      `<img src="${window.PJA.resolveImage(product, i)}" alt="Petrified Wood ${product.name} — SKU: ${product.id} — View ${i + 1}"
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
      { key: 'Stock',      val: product.stock },
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
          <img src="${window.PJA.resolveImage(product)}" alt="Petrified Wood ${product.name} — SKU: ${product.id}" loading="eager"
               onerror="this.src='${product.fallbackImage || '/images/prod_coffee_table.png'}';this.onerror=null;">
          ${product.stock === '0' ? `<span class="prod-card__badge" style="background:var(--espresso);color:white;top:1rem;left:1rem;">Sold Out</span>` : ''}
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
          ${product.stock === '0' 
            ? `
              <div style="background: var(--cream); padding: 1.5rem; border: 1px solid var(--border); margin-bottom: 1.5rem;">
                <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--espresso);">This Piece Has Found a Home</h3>
                <p style="color: var(--warm-gray); line-height: 1.5; font-size: 0.95rem; margin: 0;">
                  The piece you are looking for (Ref: ${product.id}) has been sold and removed from our active catalog. Because every petrified wood piece is a unique geological artifact, it cannot be exactly replicated.
                </p>
              </div>
              <a href="/collections?cat=${product.category}" class="btn btn--ghost">Browse Similar Pieces</a>
            `
            : `
              <a href="/contact#contact-form?interest=${product.category}&product=${encodeURIComponent(product.name)}"
                 class="btn btn--dark"
                 id="product-enquire-btn">
                Enquire About This Piece
              </a>
              <a href="https://wa.me/6285718233007?text=${encodeURIComponent(`Hello, I am interested in your petrified wood furniture. Could you please share more information?\nI am inquiring about the price of the ${product.name} (SKU: ${product.id})`)}" 
                 target="_blank" rel="noopener noreferrer" class="btn btn--ghost" id="product-call-btn">
                Call Us / Message Us Via WhatsApp +62 857-1823-3007
              </a>
              <p class="product-info__note">
                Each piece is unique. Contact us to check availability and arrange a viewing at our Ubud, Bali showroom.
              </p>
              
              <div class="product-accordion">
                <details>
                  <summary>How to Order</summary>
                  <div class="product-accordion__content">
                    We currently process orders directly through WhatsApp to ensure a personalized white-glove service. Click the button above to speak with our specialists. Learn more in our <a href="/faq">FAQ</a>.
                  </div>
                </details>
                <details>
                  <summary>Shipping & Delivery</summary>
                  <div class="product-accordion__content">
                    We offer worldwide shipping from our Bali workshop. Freight costs vary by destination and piece dimensions. View our <a href="/terms#shipping">Shipping Policy</a> for details.
                  </div>
                </details>
              </div>
            `
          }
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
    const productTitle = `Petrified Wood ${product.name} - ${product.id} — PJ Antique`;
    document.title = productTitle;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    const dims = product.dimensions ? ` Dimensions: ${product.dimensions}.` : '';
    const wgt = product.weight ? ` Weight: ${product.weight} kg.` : '';
    metaDesc.content = `Discover our premium Petrified Wood ${product.name}. Authentic, handcrafted fossil wood furniture from Indonesia.${dims}${wgt} SKU: ${product.id}.`;

    // Inject canonical URL for this product
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `https://antique.id/product?id=${encodeURIComponent(product.id)}`;

    // Inject og:url
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = `https://antique.id/product?id=${encodeURIComponent(product.id)}`;

    // Inject og:title and og:description dynamically
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = productTitle;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = metaDesc.content;

    // Inject first product image into og:image
    const firstImg = window.PJA.resolveImage(product);
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && firstImg) ogImg.content = firstImg.startsWith('http') ? firstImg : `https://antique.id${firstImg}`;

    // Inject Product JSON-LD structured data for rich results
    const existingLd = document.getElementById('product-jsonld');
    if (existingLd) existingLd.remove();

    const availability = product.stock === '0'
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock';

    const schema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "description": metaDesc.content,
      "image": [window.PJA.resolveImage(product)],
      "sku": product.id,
      "brand": {
        "@type": "Brand",
        "name": "PJ Antique Bali"
      },
      "offers": {
        "@type": "Offer",
        "url": `https://antique.id/product?id=${encodeURIComponent(product.id)}`,
        "priceCurrency": "IDR",
        "price": "0",
        "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        "availability": availability,
        "seller": {
          "@type": "Organization",
          "name": "PJ Antique Bali"
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "ID",
          "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "0",
            "currency": "IDR"
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "ID"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 7, "unitCode": "DAY" },
            "transitTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 14, "unitCode": "DAY" }
          }
        }
      }
    };

    // Only add material/dimensions as additionalProperty if present
    if (product.material || product.dimensions || product.finish) {
      schema.additionalProperty = [];
      if (product.material) schema.additionalProperty.push({ "@type": "PropertyValue", "name": "Material", "value": product.material });
      if (product.dimensions) schema.additionalProperty.push({ "@type": "PropertyValue", "name": "Dimensions", "value": product.dimensions });
      if (product.finish) schema.additionalProperty.push({ "@type": "PropertyValue", "name": "Finish", "value": product.finish });
    }

    const ldScript = document.createElement('script');
    ldScript.type = 'application/ld+json';
    ldScript.id = 'product-jsonld';
    ldScript.textContent = JSON.stringify(schema);
    document.head.appendChild(ldScript);

    // BreadcrumbList JSON-LD — enables breadcrumb display in Google Search results
    const catLabel2 = product.categoryLabel || (cat && cat.label) || product.category;
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home",        "item": "https://antique.id/" },
        { "@type": "ListItem", "position": 2, "name": "Collections", "item": "https://antique.id/collections" },
        { "@type": "ListItem", "position": 3, "name": catLabel2,     "item": `https://antique.id/collections?cat=${encodeURIComponent(product.category)}` },
        { "@type": "ListItem", "position": 4, "name": product.name,  "item": `https://antique.id/product?id=${encodeURIComponent(product.id)}` }
      ]
    };

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(bcScript);
  }

  /* ---- Build related products carousel ---- */
  function renderRelated(product, allProducts, categories) {
    const track = document.getElementById('relatedTrack');
    if (!track) return;

    const related = allProducts
      .filter(p => p.id !== product.id && p.category === product.category && p.stock !== '0')
      .slice(0, 6);

    if (related.length === 0) {
      const section = document.querySelector('.related-section');
      if (section) section.style.display = 'none';
      return;
    }

    related.forEach(p => {
      const cat = categories.find(c => c.id === p.category);
      track.innerHTML += `
        <a href="/product?id=${encodeURIComponent(p.id)}" class="prod-card" aria-label="${p.name} - SKU ${p.id}">
          <div class="prod-card__img-wrap">
            <img src="${window.PJA.resolveImage(p)}" alt="Petrified Wood ${p.name} — SKU: ${p.id}" class="prod-card__img" loading="lazy" onerror="this.src='${p.fallbackImage || '/images/prod_coffee_table.png'}';this.onerror=null;">
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
      if (!product) {
        document.title = "Piece Found a Home — PJ Antique";
        const container = document.getElementById('productDetailInner');
        if (container) {
          container.innerHTML = `
            <div style="text-align:center; padding: 10vh 5%; animation: fadeUp 0.6s ease-out forwards;">
              <p class="label" style="margin-bottom:1rem;">Out of Stock</p>
              <h1 style="font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3.5rem); margin-bottom: 1.5rem; line-height: 1.1;">Product Not Found</h1>
              <p style="color: var(--warm-gray); max-width: 600px; margin: 0 auto 2.5rem; line-height: 1.6; font-size: 1.05rem;">
                The piece you are looking for <strong>(Ref: ${productId})</strong> could not be found. It may have been sold or removed from our catalog.
              </p>
              <a href="/collections" class="btn btn--primary">Browse Available Collections</a>
            </div>
          `;
        }
        const relSection = document.querySelector('.related-section');
        if (relSection) relSection.style.display = 'none';
        return; 
      }
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
