/* ============================================================
   AVIGHNN GLOBAL — process entry point

   cPanel's "Setup Node.js App" (Phusion Passenger) looks for this
   file by name and starts it for you, so keep it as the Application
   startup file in that screen. Running `npm start` locally or on a
   VPS goes through the same path.
   ============================================================ */

'use strict';

const app = require('./server');

/* Passenger supplies the port; everything else falls back to 3000. */
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Avighnn Global listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

/* Let in-flight requests finish when the platform restarts the app. */
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received — closing server.`);
    server.close(() => process.exit(0));
  });
}
