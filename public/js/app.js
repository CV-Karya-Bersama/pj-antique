/* ============================================================
   app.js — Shared functionality for all pages
   PJ Antique Website
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Footer Year ---------- */
  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Navigation ---------- */
  const nav = document.getElementById('mainNav');
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const navLinks = document.querySelectorAll('.nav__mobile .nav__link');

  function closeMobileMenu() {
    mobileMenu.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    const spans = hamburger.querySelectorAll('span');
    spans[0].style.transform = 'none';
    spans[1].style.opacity = '1';
    spans[2].style.transform = 'none';
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('active');
      if (isOpen) {
        closeMobileMenu();
      } else {
        mobileMenu.classList.add('active');
        hamburger.setAttribute('aria-expanded', 'true');
        const spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = 'translateY(8px) rotate(45deg)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'translateY(-8px) rotate(-45deg)';
      }
    });

    navLinks.forEach(link => link.addEventListener('click', closeMobileMenu));
    
    // Allow clicking outside the links to close
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) closeMobileMenu();
    });
  }

  // Scroll behaviour: transparent → scrolled
  if (nav && nav.classList.contains('transparent')) {
    const onScroll = () => {
      if (window.scrollY > 60) {
        nav.classList.remove('transparent');
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
        nav.classList.add('transparent');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Hero Image Zoom ---------- */
  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    const img = new Image();
    img.onload = () => heroBg.classList.add('loaded');
    img.src = heroBg.style.backgroundImage.slice(5, -2);
  }

  /* ---------- Scroll Animations (IntersectionObserver) ---------- */
  const animateEls = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window && animateEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    animateEls.forEach(el => io.observe(el));
  } else {
    // Fallback: show all
    animateEls.forEach(el => el.classList.add('visible'));
  }

  /* ---------- Parallax ---------- */
  const parallaxBg = document.getElementById('parallaxBg');
  if (parallaxBg) {
    const onParallax = () => {
      const section = document.getElementById('parallaxSection');
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const progress = rect.top / window.innerHeight;
      parallaxBg.style.transform = `translateY(${progress * 30}px)`;
    };
    window.addEventListener('scroll', onParallax, { passive: true });
    onParallax();
  }

  /* ---------- Page Transition ---------- */
  const transitionEl = document.getElementById('pageTransition');
  if (transitionEl) {
    // Fade in on load
    document.addEventListener('DOMContentLoaded', () => {
      transitionEl.style.opacity = '0';
    });

    // Fade out on link click
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('http')) return;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        transitionEl.style.opacity = '1';
        setTimeout(() => { window.location.href = href; }, 400);
      });
    });

    // Fix bfcache (back button freeze)
    window.addEventListener('pageshow', (event) => {
      transitionEl.style.opacity = '0';
    });
  }

})();
