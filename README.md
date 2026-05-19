# Will You Be Haris's Date? 💌

A playful single-page "date proposal" website with a Yes button that grows
glowier with every No, and a No button that eventually gives up and starts
running for its life.

Built with plain **HTML + CSS + vanilla JavaScript** — no build step, no
frameworks, no dependencies. Drop it on any static host and it works.

---

## ✨ Features

- Romantic animated gradient background with floating hearts.
- Glassmorphism proposal card with a smooth entrance animation.
- **"Hell Yes"** button grows + pulses on every "No" click.
- **"Fuck No"** button:
  - Cycles through a sequence of progressively desperate labels.
  - Shakes on every click.
  - After a few clicks, escapes to random spots on the screen.
  - Never overlaps the card or the Yes button.
  - Stays fully inside the viewport, even on resize.
- Confetti + heart-pop celebration screen when Yes wins (it always wins).
- Subtle Web Audio click pops — no asset files, no autoplay.
- Fully responsive (mobile + desktop).
- Respects `prefers-reduced-motion`.

---

## 📁 File Structure

```
proposal-web/
├── index.html     # Markup + structure
├── styles.css     # All styling + animations
├── script.js      # Interaction logic
└── README.md
```

Everything you'd ever want to tweak — copy, growth rates, escape threshold,
confetti count — lives at the top of `script.js` in the `CONFIG` and
`NO_LABELS` constants.

---

## 🚀 Running Locally

This is a static site. Any of these works:

### Option 1 — Just open the file
Double-click `index.html`. Done.

> Some browsers restrict the Web Audio API for `file://` URLs. If clicks
> are silent, use Option 2.

### Option 2 — Tiny local server (recommended)

With **Python** (already installed on most machines):
```bash
cd proposal-web
python -m http.server 5173
```
Then open <http://localhost:5173>.

With **Node**:
```bash
npx serve proposal-web
```

With **VS Code**: install the "Live Server" extension, right-click
`index.html` → *Open with Live Server*.

---

## 🎨 Customizing

All copy + behavior tuning is at the top of `script.js`:

```js
const CONFIG = {
  yesGrowthPerClick: 0.18,   // how much Yes grows per No
  yesMaxScale: 2.4,          // hard cap so it never breaks layout
  escapeAfterClicks: 3,      // No starts running after N clicks
  pulseAfterClicks: 2,       // Yes starts pulsing after N clicks
  safeGap: 16,               // min px gap between No and other elements
  confettiCount: 120,
  heartCount: 18,
};

const NO_LABELS = [
  "Fuck No 😤",
  "Nah 😐",
  "Maybe 🤔",
  // ...add or rewrite freely
];
```

The proposal text lives in `index.html` (`.title` and `.success-title`).
Colors and gradients live in `:root` of `styles.css`.

---

## 🌐 Deployment

Because it's static, you can host it anywhere for free:

- **Vercel** — `vercel deploy` in the project folder. (Auto-detects static.)
- **Netlify** — drag the `proposal-web/` folder onto
  <https://app.netlify.com/drop>.
- **GitHub Pages** — push to a repo, then in *Settings → Pages* point at
  the `main` branch root. Site goes live at
  `https://<user>.github.io/<repo>/`.
- **Cloudflare Pages** — connect the repo, framework preset = *None*,
  build command empty, output dir = `/`.

---

## 🧠 Engineering Notes

- The No button uses `position: fixed` only after it enters "escape mode",
  so the initial layout is never disturbed.
- Yes-button scale is driven by a CSS custom property (`--yes-scale`) so
  JS only touches one value and CSS handles the smooth transition.
- Escape position is chosen by sampling random points and rejecting any
  that intersect the card or Yes button (with a configurable safety gap).
  A corner fallback handles the rare case where no valid spot is found
  (e.g. tiny viewports).
- A `resize` listener re-places the No button if the window changes while
  it's mid-escape, preventing off-screen buttons on rotation.
- Confetti pieces are plain DOM nodes animated with CSS keyframes — cheap
  and GPU-friendly. Click pops are synthesized with `AudioContext` so the
  bundle stays zero-asset.

---

## 💖 Credits

Built for Haris. Use responsibly. Heartbreak not included.
