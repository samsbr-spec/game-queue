# Deploying Game Queue to Vercel (free)

Two ways to do this. **Method A (CLI)** is fastest if you're comfortable in Terminal. **Method B (GitHub)** gives you automatic re-deploys whenever you change the code, and is the better long-term setup.

Either way, first make sure the project builds locally:

```bash
cd game-queue
npm install
npm run build
```

If that finishes without errors and creates a `dist/` folder, you're good to deploy.

---

## Method A — Vercel CLI (quickest, ~3 minutes)

1. Install the Vercel CLI (one time):
   ```bash
   npm install -g vercel
   ```

2. From inside the `game-queue` folder, run:
   ```bash
   vercel
   ```

3. It'll ask you to log in (opens your browser — sign up free with GitHub, Google, or email).

4. Then it asks a few setup questions. Just accept the defaults:
   - "Set up and deploy?" → **Y**
   - "Which scope?" → your account
   - "Link to existing project?" → **N**
   - "Project name?" → press Enter (uses `game-queue`) or type your own
   - "In which directory is your code?" → press Enter (current directory `./`)
   - It auto-detects Vite — accept the detected build settings.

5. It builds and deploys. When done, it prints a URL like `https://game-queue-xxxx.vercel.app`. That's your live app.

6. To deploy the production version (not just a preview):
   ```bash
   vercel --prod
   ```

Open that URL on your phone, then add it to your home screen (see bottom of this file).

---

## Method B — GitHub + Vercel (best for ongoing use)

This makes Vercel automatically redeploy every time you push a code change to GitHub.

1. Create a new repository on https://github.com (green "New" button). Name it `game-queue`. Leave it empty (no README).

2. In Terminal, from inside the `game-queue` folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Game Queue"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/game-queue.git
   git push -u origin main
   ```
   (Replace `YOUR_USERNAME` with your GitHub username.)

3. Go to https://vercel.com and sign in with GitHub.

4. Click "Add New… → Project", find your `game-queue` repo, click "Import".

5. Vercel auto-detects it's a Vite app. Don't change anything — just click "Deploy".

6. Wait ~1 minute. You get a live URL.

From now on, any time you push new code to GitHub, Vercel redeploys automatically.

---

## Add to your iPhone home screen (feels like a real app)

1. Open your Vercel URL in Safari on your phone.
2. Tap the Share button (square with an up arrow).
3. Tap "Add to Home Screen".
4. Now it launches full-screen from your home screen, no browser bars — just like a native app.

---

## A note on your data

Your games/queue save to the browser's local storage on whatever device you open the app. That means:
- Your data persists between visits on the same device/browser. ✅
- Your data does NOT automatically sync between your phone and computer (they're separate local stores).
- Clearing your browser data would erase it.

When you're ready for cross-device sync and cloud backup, that's the Supabase step (Phase 2). Ask Claude to help you wire it up when you get there.
