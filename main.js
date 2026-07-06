/* ============================================================
   AVIGHNN GLOBAL — shared behaviour
   Nav scroll state, mobile menu, scroll reveal, blueprint draw,
   FAQ accordion, quote form handling.
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Nav background on scroll (skip on pages forced solid) ---- */
  var nav = document.getElementById('nav');
  if (nav && !nav.classList.contains('solid')) {
    var onScroll = function () {
      if (window.scrollY > 20) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Mobile menu ---- */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  if (toggle && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* ---- Scroll reveal ---- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- Blueprint stroke draw ---- */
  var bp = document.getElementById('blueprint');
  if (bp) {
    if (reduce) { bp.classList.add('go'); }
    else { requestAnimationFrame(function () { setTimeout(function () { bp.classList.add('go'); }, 350); }); }
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      q.setAttribute('aria-expanded', open ? 'false' : 'true');
      var panel = q.nextElementSibling;
      panel.style.maxHeight = open ? null : panel.scrollHeight + 'px';
    });
  });

  /* ---- Quote form (no redirect) ---- */
  var form = document.getElementById('quoteForm');
  if (form) {
    var btn = document.getElementById('submitBtn');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      btn.classList.add('sent');
      btn.innerHTML = "Sent — we'll be in touch";
      btn.disabled = true;
      /* NOTE: wire this to an endpoint / email service before launch. */
    });
  }

  /* ---- Year in footer ---- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
