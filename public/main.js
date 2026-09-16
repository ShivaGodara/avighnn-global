/* ============================================================
   AVIGHNN GLOBAL — shared behaviour
   Splash, nav scroll state, mobile menu, scroll reveal, blueprint
   draw, drafting-sheet frame + title block, self-measuring sections,
   extrusion motion, FAQ accordion, quote form handling.
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
  /* Product cards are uncovered by a retracting shutter. Once that has
     had time to play, the shutter is taken out of rendering: a stalled
     transition must never be able to leave a card covered. */
  function markRevealed(el, delay) {
    if (!el.classList.contains('prod-card')) return;
    if (!delay) { el.classList.add('revealed'); return; }
    setTimeout(function () { el.classList.add('revealed'); }, delay);
  }

  (function reveals() {
    var revealEls = document.querySelectorAll('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('in'); markRevealed(el, 0); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
        markRevealed(e.target, 1400);
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  })();

  /* ============================================================
     DRAFTING SHEET — frame + title block
     Both are decorative chrome, so both are aria-hidden and
     pointer-events: none. The title block reads its sheet number
     and name off <body data-sheet data-sheet-title>.
     ============================================================ */
  (function buildSheet() {
    var frame = document.createElement('div');
    frame.className = 'sheet';
    frame.setAttribute('aria-hidden', 'true');
    ['tl', 'tr', 'bl', 'br'].forEach(function (pos) {
      var tick = document.createElement('span');
      tick.className = 'sheet-corner ' + pos;
      frame.appendChild(tick);
    });
    document.body.appendChild(frame);

    var sheetNo = document.body.getAttribute('data-sheet');
    var sheetTitle = document.body.getAttribute('data-sheet-title');
    if (!sheetNo || !sheetTitle) return;

    var tb = document.createElement('aside');
    tb.className = 'title-block';
    tb.setAttribute('aria-hidden', 'true');
    tb.innerHTML =
      '<div class="tb-row">' +
        '<div class="tb-org">Avighnn Global</div>' +
        '<div class="tb-title"></div>' +
      '</div>' +
      '<div class="tb-row tb-meta">' +
        '<span class="tb-sheet"></span><span class="sep">&middot;</span>' +
        '<span>Scale 1:1</span><span class="sep">&middot;</span>' +
        '<span class="tb-rev"></span>' +
      '</div>';
    tb.querySelector('.tb-title').textContent = sheetTitle;
    tb.querySelector('.tb-sheet').textContent = 'Sheet ' + sheetNo;
    tb.querySelector('.tb-rev').textContent = 'Rev 04 / ' + new Date().getFullYear();
    document.body.appendChild(tb);

    /* Stand the title block down over the footer, where it would
       otherwise sit on top of the contact details. */
    var footer = document.querySelector('.footer');
    if (footer && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { tb.classList.toggle('tb-out', e.isIntersecting); });
      }, { threshold: 0 }).observe(footer);
    }
  })();

  /* ============================================================
     SECTIONS THAT MEASURE THEMSELVES
     A broken dimension line down the left gutter of each band,
     labelled with the band's real rendered height. Only built when
     there is gutter to hold it (>= 1240px, matching the CSS).
     ============================================================ */
  (function buildDims() {
    var MIN_WIDTH = 1240;
    var MIN_HEIGHT = 280;
    var dims = [];
    var watching = false;

    function build() {
      if (dims.length || window.innerWidth < MIN_WIDTH) return;
      var bands = document.querySelectorAll('.hero, .page-hero, .detail-hero, .section');
      bands.forEach(function (band) {
        if (band.offsetHeight < MIN_HEIGHT) return;
        var dim = document.createElement('span');
        dim.className = 'sec-dim';
        dim.setAttribute('aria-hidden', 'true');
        dim.innerHTML =
          '<i class="sd-seg top"></i><i class="sd-seg bot"></i>' +
          '<i class="sd-cap top"></i><i class="sd-cap bot"></i>' +
          '<b class="sd-label"></b>';
        band.appendChild(dim);
        dims.push({ band: band, el: dim, label: dim.querySelector('.sd-label') });
      });
      measure();
      watch();
    }

    /* Heights shift once webfonts land and on every resize, so the
       label is re-read rather than captured once. */
    function measure() {
      dims.forEach(function (d) {
        d.label.textContent = d.band.offsetHeight.toFixed(1);
      });
    }

    function watch() {
      if (watching || !dims.length) return;
      watching = true;
      if (reduce || !('IntersectionObserver' in window)) {
        dims.forEach(function (d) { d.el.classList.add('in'); });
        return;
      }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      dims.forEach(function (d) { obs.observe(d.el); });
    }

    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('load', function () { build(); measure(); });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { build(); measure(); }, 180);
    }, { passive: true });
  })();

  /* ---- Process track: draw the connector left to right ---- */
  (function trackLine() {
    var tracks = document.querySelectorAll('.track');
    if (!tracks.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      tracks.forEach(function (t) { t.classList.add('line-in'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('line-in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    tracks.forEach(function (t) { obs.observe(t); });
  })();

  /* ============================================================
     COUNTING NUMBERS
     Dimensions and stats tick up to their value instead of fading,
     so a drawing appears to take its own measurements.
     ============================================================ */
  var NUMERIC = /^([^\d]{0,3})(\d+(?:\.\d+)?)$/;

  function countUp(el, dur) {
    var match = NUMERIC.exec((el.textContent || '').trim());
    if (!match) return;                        /* leave "R — ref", "ISO 9001" alone */
    var prefix = match[1];
    var target = parseFloat(match[2]);
    var dot = match[2].indexOf('.');
    var places = dot === -1 ? 0 : match[2].length - dot - 1;
    var final = prefix + target.toFixed(places);
    var start = null;
    var done = false;

    function settle() {
      done = true;
      el.textContent = final;
    }

    function frame(now) {
      if (done) return;
      if (start === null) start = now;
      var p = Math.min(1, (now - start) / dur);
      if (p >= 1) { settle(); return; }
      el.textContent = prefix + (target * (1 - Math.pow(1 - p, 3))).toFixed(places);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    /* A number is content, not decoration: if the frame loop is
       throttled or never advances, land on the real value anyway. */
    setTimeout(settle, dur + 120);
  }

  /* ---- Blueprint stroke draw, then let it measure itself ---- */
  (function blueprint() {
    var bp = document.getElementById("blueprint");
    if (!bp) return;
    if (reduce) { bp.classList.add('go'); return; }
    requestAnimationFrame(function () {
      setTimeout(function () {
        bp.classList.add('go');
        setTimeout(function () {
          bp.querySelectorAll('.bp-dims text').forEach(function (t) { countUp(t, 900); });
        }, 1300);                              /* matches .bp-dims transition-delay */
      }, 350);
    });
  })();

  /* ---- Stat figures ---- */
  (function statCounters() {
    var stats = document.querySelector(".stats");
    if (!stats || reduce || !('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        e.target.querySelectorAll('.stat-num').forEach(function (n) {
          /* only pure figures — "ISO 9001" and "72–96h" stay put */
          if (/^[\d.]+$/.test((n.textContent || '').trim())) countUp(n, 1100);
        });
      });
    }, { threshold: 0.4 });
    obs.observe(stats);
  })();

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      q.setAttribute('aria-expanded', open ? 'false' : 'true');
      var panel = q.nextElementSibling;
      panel.style.maxHeight = open ? null : panel.scrollHeight + 'px';
    });
  });

  /* ============================================================
     QUOTE FORM → GOOGLE SHEET
     Posted to an Apps Script Web App (see apps-script/Code.gs) as
     text/plain so the request stays a CORS simple request; Apps
     Script cannot answer a preflight. If the response cannot be read
     — an opaque redirect, a blocked reader — the row has still very
     likely landed, so a second no-cors attempt is made rather than
     telling the buyer their inquiry was lost.
     ============================================================ */
  (function quoteForm() {
    var form = document.getElementById('quoteForm');
    if (!form) return;

    /* Same-origin endpoint on our own server. It validates the payload
       and forwards it to the inquiry sheet, so the Apps Script URL is
       no longer published here. */
    var ENDPOINT = '/api/quote';

    var btn = document.getElementById('submitBtn');
    var status = document.getElementById('formStatus');
    var idle = btn.innerHTML;
    var sending = false;

    function say(msg, kind) {
      if (!status) return;
      status.textContent = msg;
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
    }

    function payload() {
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.page = location.pathname;
      data.referrer = document.referrer;
      data.userAgent = navigator.userAgent;
      return JSON.stringify(data);
    }

    function succeed() {
      btn.classList.add('sent');
      btn.innerHTML = "Sent — we'll be in touch";
      say('Thank you. Your inquiry is with our team — expect a priced quote within 72 to 96 hours.', 'ok');
      form.reset();
    }

    function fail(msg) {
      sending = false;
      btn.disabled = false;
      btn.innerHTML = idle;
      say(msg || 'Something went wrong. Please email aviiral@avighnnglobal.com and we will pick it up from there.', 'err');
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (sending) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }

      if (!ENDPOINT) {                       /* not yet configured */
        fail('The form is not connected yet. Please email aviiral@avighnnglobal.com.');
        return;
      }

      sending = true;
      btn.disabled = true;
      btn.innerHTML = 'Sending…';
      say('Sending your specifications…', 'busy');

      var body = payload();

      /* Same origin, so the response is always readable — no opaque
         retry is needed and a failure here is a real failure. */
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      })
        .then(function (res) {
          return res.json().catch(function () { return null; });
        })
        .then(function (res) {
          if (res && res.ok) succeed();
          else fail(res && res.error);
        })
        .catch(function () { fail(); });
    });
  })();

  /* ---- Year in footer ---- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ============================================================
     SPLASH
     The curtain only ever adds and removes a class on <html>. The
     entrance animations underneath are held by CSS while it is up and
     released when it drops, so no content depends on a callback that
     fires late. Three guarantees it never sticks: the mark waits on
     the logo but only briefly, the exit is scheduled the moment it
     starts, and a hard cap fires regardless of what else happened.
     ============================================================ */
  (function splashScreen() {
    var el = document.getElementById('splash');
    var armed = document.documentElement.classList.contains('splash-on');

    /* Reduced motion gets no curtain at all — it is pure decoration. */
    if (!el || !armed || reduce) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      document.documentElement.classList.remove("splash-on");
      return;
    }

    /* Mark the session so internal navigation never sees it again. */
    try { sessionStorage.setItem('ag_splash', '1'); } catch (e) {}

    var began = false;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      el.classList.add('splash-out');
      /* dropping the class unlocks the scroll and releases the
         entrance animations held underneath */
      document.documentElement.classList.remove("splash-on");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 700);
    }

    function begin() {
      if (began) return;
      began = true;
      el.classList.add('splash-go');
      setTimeout(finish, 1500);
    }

    /* Hold for the logo so the reveal never wipes over an empty box,
       but give up quickly if it is slow. */
    var img = el.querySelector('img');
    if (img && !img.complete) {
      img.addEventListener('load', begin);
      img.addEventListener('error', begin);
      setTimeout(begin, 900);
    } else {
      begin();
    }

    setTimeout(finish, 4000);
  })();
})();
