# Game Queue

A personal video game library and queue tracker. React + Three.js, deep-space chrome aesthetic.

Your data saves automatically to your browser's local storage (`localStorage`), so your queue persists on whatever device/browser you use it in.

---

## Running it locally on your Mac

You need Node.js installed. If you don't have it, install it from https://nodejs.org (get the "LTS" version) or via Homebrew: `brew install node`.

Then, in Terminal, from inside this folder:

```bash
npm install      # installs dependencies (one time)
npm run dev      # starts a local server
```

It'll print a local URL (usually http://localhost:5173) — open that in your browser to see the app.

To make a production build:

```bash
npm run build    # outputs to the dist/ folder
npm run preview  # preview that production build locally
```

---

## Deploying to Vercel (free)

See DEPLOY.md for step-by-step instructions.
