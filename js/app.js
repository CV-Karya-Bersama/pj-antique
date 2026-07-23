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
  const mobileClose = document.getElementById('mobileClose');

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

  // Mobile menu toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    });
  }
  if (mobileClose && mobileMenu) {
    mobileClose.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
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
        transitionEl.classList.add('active');
        setTimeout(() => { window.location.href = href; }, 350);
      });
    });
  }

})();
