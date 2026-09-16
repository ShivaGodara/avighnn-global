# Avighnn Global

Precision aluminium profiles and extrusions — marketing site and quote inquiry
endpoint, served by Express.

## Structure

```
app.js              Process entry point. cPanel/Passenger starts this file.
server.js           The Express app: routing, headers, /api/quote.
public/             Everything served to the browser.
  *.html            The nine pages, unchanged from the static build.
  404.html          Not-found page, in the site's design.
  styles.css
  main.js           Front-end behaviour, including the quote form.
  images/           Product photos, JPG + WebP at 1400w and 700w.
  logo/
apps-script/        Google Apps Script that writes inquiries to the sheet.
image-prompts/      Prompts used to generate the product photography.
```

## Running locally

```sh
npm install
cp .env.example .env     # then fill in QUOTE_ENDPOINT
npm run dev              # http://localhost:3000
```

`npm start` runs it without the file watcher.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no | Defaults to 3000. Passenger sets this itself — leave it unset on cPanel. |
| `NODE_ENV` | on the live server | Set to `production`. Enables HSTS and `upgrade-insecure-requests`. |
| `QUOTE_ENDPOINT` | yes, for the form | The `/exec` URL of the deployed Apps Script web app. See `apps-script/SETUP.md`. |

`GET /healthz` reports whether `QUOTE_ENDPOINT` was picked up — the quickest way
to confirm a deploy is live and configured.

## What the server adds over the static files

- **Clean URLs.** `/products` and `/products.html` both work. Nothing redirects,
  so existing indexed links keep their status.
- **The quote endpoint.** `POST /api/quote` validates the payload, drops honeypot
  submissions, rate-limits to 20 posts per IP per 10 minutes, and forwards to the
  inquiry sheet. The Apps Script URL is no longer published in `main.js`, where
  anyone reading source could post to it directly.
- **Security headers** via Helmet, with a CSP that allows Google Fonts and nothing
  else off-origin.
- **gzip** — `styles.css` goes out at 10 KB instead of 44 KB.
- **Cache headers** — images and fonts for a week, HTML revalidated every request.
- **A real 404 page** instead of the host's default.

---

# Deploying to GoDaddy

**Check your plan first.** Node hosting is only available on GoDaddy's cPanel
Linux Hosting (Deluxe and above), VPS, or Dedicated plans. Website Builder and
the Economy shared plan cannot run Node at all. If you are on one of those, see
*Static fallback* at the bottom — the site works perfectly well without the
server, you just lose the form endpoint and have to point `main.js` back at the
Apps Script URL.

## Option A — cPanel Node.js (shared hosting, Deluxe and above)

cPanel runs Node apps under Phusion Passenger. It reads `app.js`, so the naming
here already matches what it expects.

1. **Push this repo to GitHub** (already done if you are reading this there).

2. **Get the files onto the server.** In cPanel either:
   - *Git Version Control* → Create → paste the repo URL → deploy; or
   - upload a zip of the repo (without `node_modules/`) via *File Manager* and
     extract it.

   Put it somewhere **outside** `public_html`, e.g. `/home/USER/avighnn-global`.
   Passenger serves through its own mapping; files in `public_html` would be
   exposed directly and bypass the server.

3. **cPanel → Setup Node.js App → Create Application:**

   | Field | Value |
   |---|---|
   | Node.js version | 18.x or newer |
   | Application mode | Production |
   | Application root | `avighnn-global` |
   | Application URL | your domain |
   | Application startup file | `app.js` |

4. **Add environment variables** in that same screen:
   `NODE_ENV=production` and `QUOTE_ENDPOINT=https://script.google.com/…/exec`.
   Do not set `PORT` — Passenger assigns it.

5. **Run NPM Install** (the button on that screen), then **Restart**.

6. **Verify:** visit `https://yourdomain.com/healthz`. You want
   `{"ok":true,"quoteEndpointConfigured":true,…}`. Then load the site and submit
   a test inquiry.

To deploy a change later: push to GitHub, pull it in *Git Version Control*, then
hit **Restart** on the Node app. Restart is required — Passenger does not pick up
new code on its own.

## Option B — GoDaddy VPS or Dedicated

```sh
git clone https://github.com/ShivaGodara/avighnn-global.git
cd avighnn-global
npm ci --omit=dev
cp .env.example .env        # fill in QUOTE_ENDPOINT, set NODE_ENV=production

sudo npm install -g pm2
pm2 start app.js --name avighnn-global
pm2 save && pm2 startup     # run the command it prints
```

Then put nginx in front, so TLS terminates there and Node never faces the
internet directly:

```nginx
server {
  listen 443 ssl;
  server_name avighnnglobal.com www.avighnnglobal.com;

  # ssl_certificate / ssl_certificate_key — from certbot or GoDaddy

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }
}
```

The app already sets `trust proxy`, so rate limiting keys on the visitor's real
IP rather than on nginx.

## Pointing the domain at it

GoDaddy DNS → your domain → **Manage DNS**. For cPanel hosting the A record is
set up for you when the domain is assigned to the hosting account. For a VPS,
point the `@` and `www` A records at the VPS IP address.

## Static fallback

If Node turns out not to be available on your plan, the site still works as
plain files:

1. Upload the **contents of `public/`** into `public_html`.
2. In `public_html/main.js`, change `var ENDPOINT = '/api/quote';` back to the
   Apps Script `/exec` URL, and restore the `text/plain` content type — see the
   git history of that file for the exact previous version.

You lose the rate limiting, the hidden endpoint, the security headers, and the
custom 404. Everything a visitor sees stays identical.
