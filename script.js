/* =========================================================
   "Will you be Haris's Date?" — interaction logic
   - Plain vanilla JS, no dependencies.
   - Easy to tweak: change CONFIG values or NO_LABELS below.
========================================================= */

const CONFIG = {
  // How much the Yes button grows per "no" click (multiplicative).
  yesGrowthPerClick: 0.18,
  // Cap so it never overflows the card or breaks layout.
  yesMaxScale: 2.4,
  // After this many "no" clicks, the No button starts running away.
  // Clicks 1-5 = Nah, Maybe, Are you sure?, Please?, Pretty please — all stay put.
  // Click 6 = "Don't do this 😭" is when it finally starts escaping.
  escapeAfterClicks: 6,
  // After this many clicks, Yes button pulses.
  pulseAfterClicks: 2,
  // Min gap (px) the No button keeps from card / Yes button.
  safeGap: 16,
  // Confetti pieces.
  confettiCount: 120,
  // Floating background hearts.
  heartCount: 18,
};

// Progressive text shown on the No button. Loops at the end if exceeded.
const NO_LABELS = [
  "Fuck No 😤",
  "Nah 😐",
  "Maybe 🤔",
  "Are you sure? 😟",
  "Please? 🥺",
  "Pretty please 💔",
  "Don't do this 😭",
  "Last chance 😩",
];

// ---------- DOM refs ----------
const $ = (id) => document.getElementById(id);
const card = $("card");
const yesBtn = $("yes-btn");
const noBtn = $("no-btn");
const successScreen = $("success");
const confettiBox = $("confetti");
const heartsBox = document.querySelector(".hearts");
const againBtn = $("again-btn");

// ---------- State ----------
let noClicks = 0;
let yesScale = 1;
let isEscaping = false;

// =====================================================
// Background — floating hearts
// =====================================================
function spawnHearts() {
  const emojis = ["❤️", "💕", "💖", "💗", "💞", "🌸", "✨"];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < CONFIG.heartCount; i++) {
    const h = document.createElement("span");
    h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    h.style.left = Math.random() * 100 + "vw";
    h.style.fontSize = 14 + Math.random() * 22 + "px";
    h.style.animationDuration = 9 + Math.random() * 10 + "s";
    h.style.animationDelay = -Math.random() * 12 + "s";
    h.style.opacity = 0.35 + Math.random() * 0.5;
    frag.appendChild(h);
  }
  heartsBox.appendChild(frag);
}

// =====================================================
// Sound — tiny click pop using Web Audio (no assets).
// Only created on first user gesture (browser policy safe).
// =====================================================
let audioCtx = null;
function pop(freq = 520, dur = 0.08, type = "sine", gain = 0.05) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, audioCtx.currentTime + dur);
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch { /* audio is best-effort */ }
}

// =====================================================
// Yes button — grows + pulses
// =====================================================
function growYes() {
  yesScale = Math.min(yesScale + CONFIG.yesGrowthPerClick, CONFIG.yesMaxScale);
  document.documentElement.style.setProperty("--yes-scale", yesScale.toFixed(3));
  if (noClicks >= CONFIG.pulseAfterClicks) yesBtn.classList.add("pulsing");
}

// =====================================================
// No button — progressive text + escape behavior
// =====================================================
function updateNoLabel() {
  const i = Math.min(noClicks, NO_LABELS.length - 1);
  noBtn.innerHTML = NO_LABELS[i];
}

function shakeNo() {
  noBtn.classList.remove("shake");
  // force reflow so the animation restarts every click
  void noBtn.offsetWidth;
  noBtn.classList.add("shake");
}

/**
 * Move the No button to a random spot that's fully on-screen
 * and does not overlap the card or the Yes button.
 */
/**
 * Returns the smallest reliable viewport size.
 * Browser zoom + mobile chrome can make different APIs disagree by a few
 * pixels — taking the minimum guarantees we stay inside what's actually visible.
 */
function getViewport() {
  const widths = [window.innerWidth, document.documentElement.clientWidth];
  const heights = [window.innerHeight, document.documentElement.clientHeight];
  if (window.visualViewport) {
    widths.push(window.visualViewport.width);
    heights.push(window.visualViewport.height);
  }
  return {
    w: Math.floor(Math.min.apply(null, widths.filter(Boolean))),
    h: Math.floor(Math.min.apply(null, heights.filter(Boolean))),
  };
}

function escapeNo() {
  if (!isEscaping) {
    enterEscapeMode();
  }

  // Use ceil for the button size so we never under-estimate the space it needs.
  const w = Math.ceil(noBtn.getBoundingClientRect().width);
  const h = Math.ceil(noBtn.getBoundingClientRect().height);
  const pad = CONFIG.safeGap;

  const { w: vw, h: vh } = getViewport();

  // Hard bounds — floored so subpixel rounding can't push us out at non-100% zoom.
  const minX = pad;
  const minY = pad;
  const maxX = Math.max(pad, Math.floor(vw - w - pad));
  const maxY = Math.max(pad, Math.floor(vh - h - pad));

  const cardRect = inflate(card.getBoundingClientRect(), pad);
  const yesRect = inflate(yesBtn.getBoundingClientRect(), pad);

  // Try a bunch of random spots, pick the first that doesn't overlap.
  let chosen = null;
  for (let i = 0; i < 80; i++) {
    const x = minX + Math.random() * Math.max(0, maxX - minX);
    const y = minY + Math.random() * Math.max(0, maxY - minY);
    const candidate = { left: x, top: y, right: x + w, bottom: y + h };
    if (!intersects(candidate, cardRect) && !intersects(candidate, yesRect)) {
      chosen = { x, y };
      break;
    }
  }

  // Fallback: pin to a corner farthest from the card center.
  if (!chosen) chosen = farthestCorner(w, h, cardRect, vw, vh, pad);

  // Final clamp — guarantee the button is always inside the viewport,
  // regardless of how the random / corner logic landed. Floor to avoid
  // sub-pixel drift at fractional zoom levels (e.g. 90%, 110%).
  chosen.x = Math.max(minX, Math.min(Math.floor(chosen.x), maxX));
  chosen.y = Math.max(minY, Math.min(Math.floor(chosen.y), maxY));

  noBtn.style.left = chosen.x + "px";
  noBtn.style.top = chosen.y + "px";
}

function enterEscapeMode() {
  isEscaping = true;
  const r = noBtn.getBoundingClientRect();

  // CRITICAL: the .card has a `transform`, which makes it the containing block
  // for any `position: fixed` descendant — so fixed coords would be card-relative,
  // not viewport-relative, and our viewport bounds calculations would be wrong.
  // Reparenting the button to <body> (which has no transformed ancestors) makes
  // `position: fixed` behave correctly against the actual viewport.
  if (noBtn.parentNode !== document.body) {
    document.body.appendChild(noBtn);
  }

  noBtn.classList.add("escaping");
  // Lock current position first to avoid a teleport flash.
  noBtn.style.left = r.left + "px";
  noBtn.style.top = r.top + "px";
}

// ---- geometry helpers ----
function inflate(r, by) {
  return { left: r.left - by, top: r.top - by, right: r.right + by, bottom: r.bottom + by };
}
function intersects(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}
function farthestCorner(w, h, cardRect, vw, vh, pad) {
  const cx = (cardRect.left + cardRect.right) / 2;
  const cy = (cardRect.top + cardRect.bottom) / 2;
  const corners = [
    { x: pad,                y: pad },
    { x: vw - w - pad,       y: pad },
    { x: pad,                y: vh - h - pad },
    { x: vw - w - pad,       y: vh - h - pad },
  ];
  let best = corners[0], bestDist = -1;
  for (const c of corners) {
    const dx = c.x + w / 2 - cx;
    const dy = c.y + h / 2 - cy;
    const d = dx * dx + dy * dy;
    if (d > bestDist) { bestDist = d; best = c; }
  }
  return best;
}

// =====================================================
// Confetti — DOM-based, lightweight
// =====================================================
function launchConfetti() {
  const colors = ["#ff3e7f", "#ff7eb6", "#ffd166", "#06d6a0", "#b14bff", "#fff"];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < CONFIG.confettiCount; i++) {
    const piece = document.createElement("i");
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--dx", (Math.random() * 200 - 100) + "px");
    piece.style.setProperty("--rot", (Math.random() * 1080 - 360) + "deg");
    piece.style.width = 6 + Math.random() * 8 + "px";
    piece.style.height = 10 + Math.random() * 10 + "px";
    piece.style.animationDuration = 2.4 + Math.random() * 2.2 + "s";
    piece.style.animationDelay = Math.random() * 0.6 + "s";
    if (Math.random() < 0.3) piece.style.borderRadius = "50%";
    frag.appendChild(piece);
  }
  confettiBox.appendChild(frag);
}

// =====================================================
// Success transition
// =====================================================
function celebrate() {
  // Lock the page so background hearts/scroll don't fight the success scene.
  card.classList.add("gone");
  successScreen.classList.add("visible");
  successScreen.setAttribute("aria-hidden", "false");
  launchConfetti();
  pop(880, 0.18, "triangle", 0.06);
  setTimeout(() => pop(1320, 0.18, "triangle", 0.05), 120);
  setTimeout(() => pop(1760, 0.22, "triangle", 0.05), 260);
}

// =====================================================
// Wire up events
// =====================================================
noBtn.addEventListener("click", () => {
  noClicks++;
  pop(220 + Math.random() * 80, 0.06, "square", 0.04);
  updateNoLabel();
  growYes();
  shakeNo();
  if (noClicks >= CONFIG.escapeAfterClicks) escapeNo();
});

// Make the No button dodge on hover/touch once it's in escape mode — extra mischief.
const dodgeOnContact = () => { if (isEscaping) escapeNo(); };
noBtn.addEventListener("mouseenter", dodgeOnContact);
noBtn.addEventListener("touchstart", dodgeOnContact, { passive: true });

yesBtn.addEventListener("click", () => {
  pop(660, 0.12, "sine", 0.06);
  celebrate();
});

againBtn?.addEventListener("click", () => {
  // Reset to initial state — handy for demos.
  noClicks = 0;
  yesScale = 1;
  isEscaping = false;
  document.documentElement.style.setProperty("--yes-scale", "1");
  yesBtn.classList.remove("pulsing");
  noBtn.classList.remove("escaping", "shake");
  noBtn.style.left = noBtn.style.top = "";
  noBtn.innerHTML = NO_LABELS[0];
  confettiBox.innerHTML = "";
  successScreen.classList.remove("visible");
  successScreen.setAttribute("aria-hidden", "true");
  card.classList.remove("gone");
});

// Keep the No button on-screen if the viewport resizes while it's escaping.
const onViewportChange = () => { if (isEscaping) escapeNo(); };
window.addEventListener("resize", onViewportChange);
window.visualViewport?.addEventListener("resize", onViewportChange);
window.visualViewport?.addEventListener("scroll", onViewportChange);

// Init
spawnHearts();
