# Quote form → Google Sheet

The contact form posts each inquiry to a Google Apps Script Web App, which
appends a row to a spreadsheet and emails a notification. No server, no
third-party form service, and it works from GitHub Pages.

## 1. Create the spreadsheet

1. Go to <https://sheets.new> and name it e.g. **Avighnn Global — Inquiries**.
2. Leave it empty. The script creates an `Inquiries` tab with a header row on
   the first submission.

## 2. Add the script

1. In that spreadsheet: **Extensions → Apps Script**.
2. Delete the placeholder `myFunction`, paste the whole of
   [`Code.gs`](Code.gs), and save.
3. Check the settings at the top of the file:
   - `NOTIFY_EMAIL` — where new inquiries are emailed. Set to `''` to turn
     email off; rows are still written.
   - `SHEET_NAME`, `FIELDS`, `REQUIRED` — only if you change the form.

## 3. Deploy it

1. **Deploy → New deployment → ⚙︎ → Web app**.
2. Set:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*  ← must be *Anyone*, not *Anyone with a
     Google account*, or visitors get a login page instead of a response.
3. **Deploy**, approve the permissions prompt (it wants to edit this sheet and
   send mail as you), and copy the **Web app URL** — it ends in `/exec`.

To check it: open that URL in a browser. It should print
`{"ok":true,"service":"avighnn-global-inquiries"}`.

## 4. Point the site at it

In [`main.js`](../main.js), in the `quoteForm` block, paste the URL:

```js
var ENDPOINT = 'https://script.google.com/macros/s/AKfy…/exec';
```

Until that is filled in, the form tells the visitor to email us instead of
silently pretending to send.

## 5. Test

Open `contact.html`, submit a real-looking inquiry, and confirm:

- a row appears in the `Inquiries` tab,
- the notification email arrives,
- the form shows the green confirmation and clears itself.

## Changing the script later

Apps Script serves the **deployed** version, not the saved one. After editing
`Code.gs`, run **Deploy → Manage deployments → ✏️ → Version: New version →
Deploy**. The `/exec` URL stays the same, so nothing on the site changes.

## Notes

- The endpoint URL is public. That is fine and unavoidable for a static site —
  it can only append rows, never read them. The honeypot field (`website`)
  drops the obvious bots; if spam ever gets through, add a shared token or
  reCAPTCHA check in `doPost`.
- `MailApp` allows ~100 emails/day on a free Gmail account, 1,500 on Workspace.
  A failed email never loses the row.
- Concurrent submissions are serialised with `LockService`, so two buyers
  submitting at once cannot overwrite each other's row.
