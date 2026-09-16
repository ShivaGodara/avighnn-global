/* ============================================================
   AVIGHNN GLOBAL — Express server

   Serves the site out of public/ and receives quote inquiries on
   POST /api/quote. The page markup is unchanged from the static
   build; this file only adds routing, headers, and the inquiry
   endpoint that used to be called straight from the browser.

   Exported rather than started, so app.js owns the listen call and
   tests (or Passenger) can mount the app themselves.
   ============================================================ */

'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

const PUBLIC_DIR = path.join(__dirname, 'public');
const IS_PROD = process.env.NODE_ENV === 'production';

/* Google Apps Script web app that appends the row to the inquiry
   sheet. Kept server-side now, so the deployment URL is no longer
   published in main.js where anyone could POST to it directly. */
const QUOTE_ENDPOINT = process.env.QUOTE_ENDPOINT || '';

/* Behind cPanel/Passenger, nginx, or any reverse proxy the client IP
   arrives in X-Forwarded-For. Trust one hop so rate limiting keys on
   the real address instead of the proxy's. */
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ---- security headers -------------------------------------
   The pages load fonts from Google and nothing else off-origin.
   Everything else is same-origin, so the policy can stay tight. */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],   /* splash guard is inline in <head> */
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: IS_PROD ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  /* HSTS only once the domain is actually served over HTTPS. */
  hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true } : false
}));

app.use(compression());
app.use(express.json({ limit: '64kb' }));

/* ---- static assets ----------------------------------------
   Fingerprint-free filenames, so HTML revalidates on every request
   while images and fonts sit in the browser cache for a week. */
app.use(express.static(PUBLIC_DIR, {
  extensions: ['html'],          /* /products serves products.html */
  index: 'index.html',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/\.(jpg|jpeg|png|webp|svg|ico|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

/* ---- quote inquiries --------------------------------------
   Mirrors the validation in apps-script/Code.gs so a bad payload is
   rejected here rather than travelling to the sheet. */

const FIELDS = ['name', 'company', 'email', 'port', 'type', 'quantity', 'specs'];
const REQUIRED = ['name', 'company', 'email', 'specs'];
const MAX_LEN = 5000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const quoteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,                       /* per IP, per ten minutes */
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please try again shortly.' }
});

app.post('/api/quote', quoteLimiter, async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  /* Honeypot: a real person never fills a hidden field. Answer OK so
     the bot learns nothing, but write nothing. */
  if (String(body.website || '').trim()) {
    return res.json({ ok: true });
  }

  const data = {};
  for (const key of FIELDS) {
    data[key] = String(body[key] == null ? '' : body[key]).trim().slice(0, MAX_LEN);
  }

  const missing = REQUIRED.filter((key) => !data[key]);
  if (missing.length) {
    return res.status(400).json({
      ok: false,
      error: 'Missing required field: ' + missing.join(', ')
    });
  }
  if (!EMAIL_RE.test(data.email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address.' });
  }

  /* Context the sheet records alongside the fields. Taken from the
     request rather than the payload so it cannot be spoofed. */
  data.page = String(body.page || '').slice(0, 300);
  data.referrer = String(req.get('referer') || '').slice(0, 300);
  data.userAgent = String(req.get('user-agent') || '').slice(0, 300);
  data.submittedAt = new Date().toISOString();

  if (!QUOTE_ENDPOINT) {
    console.error('[quote] QUOTE_ENDPOINT is not set — inquiry not forwarded:', data.email);
    return res.status(503).json({
      ok: false,
      error: 'The form is not connected yet. Please email aviiral@avighnnglobal.com.'
    });
  }

  try {
    /* Apps Script cannot answer a CORS preflight, so the body goes as
       text/plain exactly as the browser used to send it. */
    const upstream = await fetch(QUOTE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });

    const text = await upstream.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      /* Apps Script answered with an HTML error page rather than JSON. */
      console.error('[quote] unreadable upstream response:', text.slice(0, 200));
      throw new Error('Unreadable response from the inquiry sheet.');
    }

    if (result && result.ok) return res.json({ ok: true });
    return res.status(502).json({
      ok: false,
      error: (result && result.error) || 'The inquiry sheet rejected the submission.'
    });
  } catch (err) {
    console.error('[quote] forwarding failed:', err.message);
    return res.status(502).json({
      ok: false,
      error: 'We could not record your inquiry. Please email aviiral@avighnnglobal.com.'
    });
  }
});

/* ---- health check ------------------------------------------
   For uptime monitors and for confirming a deploy is actually live. */
app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    quoteEndpointConfigured: Boolean(QUOTE_ENDPOINT),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/* ---- 404 ---------------------------------------------------- */
const NOT_FOUND_PAGE = path.join(PUBLIC_DIR, '404.html');

app.use((req, res) => {
  res.status(404);
  if (req.accepts('html') && fs.existsSync(NOT_FOUND_PAGE)) {
    return res.sendFile(NOT_FOUND_PAGE);
  }
  res.json({ ok: false, error: 'Not found' });
});

/* ---- errors -------------------------------------------------
   Log the detail, tell the visitor nothing that helps an attacker. */
app.use((err, req, res, next) => {   // eslint-disable-line no-unused-vars
  console.error('[error]', err);
  res.status(err.status || 500);
  if (req.accepts('html') && fs.existsSync(NOT_FOUND_PAGE)) {
    return res.sendFile(NOT_FOUND_PAGE);
  }
  res.json({ ok: false, error: 'Server error' });
});

module.exports = app;
