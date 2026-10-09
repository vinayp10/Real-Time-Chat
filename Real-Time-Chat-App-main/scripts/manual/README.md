# Manual smoke scripts

These are optional helper scripts, not part of `npm test`.

- `socket-smoke.js` - needs the server running on port 5000 (`npm run dev:server`). Registers two users and sends a message over Socket.IO.
- `browser-call-smoke.cjs` - needs the whole app running plus `npm install puppeteer`. Opens the app in a headless browser to try the call screen.
