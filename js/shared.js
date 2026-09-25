/* Shared config contract + tiny helpers — the "API" between all pages.
   Later this file's loadConfig() body becomes a Supabase fetch; nothing else changes. */

const DEFAULT_CONFIG = {
  name: "Cedar & Vine Café",
  place_id: "ChIJxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  brand_color:  "#18181b",
  logo_initial: "C",
  positive_tags: ["Great coffee", "Friendly staff", "Cozy atmosphere", "Fast service", "Good pastries"],
  improvement_tags: ["Slow service", "Order was wrong", "Too noisy", "Prices felt high", "Cleanliness"]
};

/* Priority: URL params (QR link) → localStorage (builder) → defaults */
function loadConfig() {
  const params = new URLSearchParams(location.search);
  if (params.has("b")) {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(decodeURIComponent(escape(atob(params.get("b"))))) }; } catch {}
  }
  try {
    const saved = localStorage.getItem("qr_business_config");
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  try { localStorage.setItem("qr_business_config", JSON.stringify(cfg)); } catch {}
}

/* Unicode-safe base64 — business names can contain any characters */
function encodeConfig(cfg) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
}

/* The URL the QR code encodes: index.html?b=<config> */
function funnelURL(cfg) {
  const base = location.href.replace(/[^/]*$/, "index.html");
  return base + "?b=" + encodeConfig(cfg);
}

/* ---- brand color → CSS variables (accent + ambient gradient tint) ---- */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}
function applyBrand(hex) {
  const [r, g, b] = hexToRgb(hex);
  const root = document.documentElement.style;
  root.setProperty("--brand", hex);
  root.setProperty("--brand-soft", `rgba(${r},${g},${b},0.16)`);
  root.setProperty("--ambient-1", `rgba(${r},${g},${b},0.12)`);
}

/* ---- micro-interaction helpers ---- */
function attachRipple(selector) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener("pointerdown", e => {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const r = document.createElement("span");
      r.className = "ripple";
      r.style.width = r.style.height = size + "px";
      r.style.left = (e.clientX - rect.left - size / 2) + "px";
      r.style.top = (e.clientY - rect.top - size / 2) + "px";
      btn.appendChild(r);
      setTimeout(() => r.remove(), 500);
    });
  });
}

function showToast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}