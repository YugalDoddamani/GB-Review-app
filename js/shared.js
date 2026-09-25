/* Starling — shared config contract, presets, variation engine.
   Backend swap later happens only inside loadConfig()/saveConfig(). */

const APP_NAME = "Starling";

const DEFAULT_CONFIG = {
  name: "Cedar & Vine Café",
  brand_color: "#18181b",
  logo_initial: "C",
  service_type: "cafe",
  locations: [{ label: "Main", place_id: "ChIJxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }],
  rating_flows: {} // filled from preset on first load
};

/* ---------- service type presets ---------- */
const PRESETS = {
  cafe: {
    label: "Café",
    flows: {
      5: { heading: "What did you love?", tags: ["Great coffee", "Friendly staff", "Cozy atmosphere", "Fast service", "Good pastries"] },
      4: { heading: "What stood out?", tags: ["Good coffee", "Nice seating", "Warm welcome", "Quick service"] },
      3: { heading: "What was okay, what wasn't?", tags: ["Decent coffee", "Slow at peak hours", "Limited seating", "Order mix-up"] },
      2: { heading: "What went wrong?", tags: ["Long wait", "Wrong order", "Rude staff", "Too noisy"] },
      1: { heading: "What happened?", tags: ["Very slow service", "Wrong order", "Unfriendly staff", "Dirty tables"] }
    }
  },
  restaurant: {
    label: "Restaurant",
    flows: {
      5: { heading: "What did you love?", tags: ["Delicious food", "Great service", "Lovely ambiance", "Good value", "Nice presentation"] },
      4: { heading: "What stood out?", tags: ["Tasty food", "Attentive staff", "Comfortable setting", "Fair prices"] },
      3: { heading: "What was okay, what wasn't?", tags: ["Food was average", "Slow kitchen", "Cramped tables", "Wait time"] },
      2: { heading: "What went wrong?", tags: ["Food was cold", "Long wait", "Wrong dish", "Overpriced"] },
      1: { heading: "What happened?", tags: ["Poor food quality", "Terrible service", "Wrong order twice", "Unclean"] }
    }
  },
  salon: {
    label: "Salon / Spa",
    flows: {
      5: { heading: "What did you love?", tags: ["Great stylist", "Relaxing experience", "Clean space", "Great results", "Easy booking"] },
      4: { heading: "What stood out?", tags: ["Skilled staff", "Nice results", "Pleasant space", "Good products"] },
      3: { heading: "What was okay, what wasn't?", tags: ["Result was average", "Rushed service", "Wait time", "Price felt high"] },
      2: { heading: "What went wrong?", tags: ["Not what I asked for", "Rushed job", "Long wait", "Unfriendly staff"] },
      1: { heading: "What happened?", tags: ["Bad result", "Rude staff", "Unclean tools", "Overcharged"] }
    }
  },
  clinic: {
    label: "Clinic / Practice",
    flows: {
      5: { heading: "What did you appreciate?", tags: ["Caring staff", "Short wait", "Clear explanations", "Clean facility", "Great follow-up"] },
      4: { heading: "What stood out?", tags: ["Professional staff", "Good care", "Clean facility", "Smooth process"] },
      3: { heading: "What was okay, what wasn't?", tags: ["Long wait", "Rushed appointment", "Hard to book", "Parking"] },
      2: { heading: "What went wrong?", tags: ["Very long wait", "Felt rushed", "Unclear billing", "Hard to reach"] },
      1: { heading: "What happened?", tags: ["Unprofessional staff", "Extremely long wait", "Billing issues", "Poor communication"] }
    }
  },
  retail: {
    label: "Retail / Store",
    flows: {
      5: { heading: "What did you love?", tags: ["Great selection", "Helpful staff", "Good prices", "Easy checkout", "Nice store"] },
      4: { heading: "What stood out?", tags: ["Good selection", "Friendly staff", "Fair prices", "Well organized"] },
      3: { heading: "What was okay, what wasn't?", tags: ["Limited stock", "Slow checkout", "Hard to find items", "Parking"] },
      2: { heading: "What went wrong?", tags: ["Out of stock", "Unhelpful staff", "Long checkout", "Poor return process"] },
      1: { heading: "What happened?", tags: ["Rude staff", "Nothing in stock", "Refused return", "Overcharged"] }
    }
  },
  auto: {
    label: "Auto services",
    flows: {
      5: { heading: "What did you love?", tags: ["Honest pricing", "Fast service", "Clear explanations", "Quality work", "Friendly staff"] },
      4: { heading: "What stood out?", tags: ["Fair quote", "On-time service", "Good communication", "Solid work"] },
      3: { heading: "What was okay, what wasn't?", tags: ["Took longer than promised", "Price higher than quoted", "Hard to schedule"] },
      2: { heading: "What went wrong?", tags: ["Overcharged", "Problem came back", "Slow service", "Poor communication"] },
      1: { heading: "What happened?", tags: ["Overcharged badly", "Work not done right", "Never called back", "Rude service"] }
    }
  }
};

/* ---------- config load/save ---------- */
function defaultConfig() {
  const cfg = { ...DEFAULT_CONFIG, locations: DEFAULT_CONFIG.locations.map(l => ({ ...l })) };
  cfg.rating_flows = JSON.parse(JSON.stringify(PRESETS.cafe.flows));
  return cfg;
}

function loadConfig() {
  const params = new URLSearchParams(location.search);
  if (params.has("b")) {
    try { return decodeConfig(params.get("b")); } catch {}
  }
  try {
    const saved = localStorage.getItem("starling_config");
    if (saved) return { ...defaultConfig(), ...JSON.parse(saved) };
  } catch {}
  return defaultConfig();
}

function saveConfig(cfg) {
  try { localStorage.setItem("starling_config", JSON.stringify(cfg)); } catch {}
}

/* ---------- compact encode for QR URLs (short keys keep QRs scannable) ---------- */
function encodeConfig(cfg) {
  const c = {
    n: cfg.name, c: cfg.brand_color, st: cfg.service_type,
    lc: cfg.locations.map(l => [l.label, l.place_id]),
    rf: Object.fromEntries(Object.entries(cfg.rating_flows).map(([k, v]) => [k, [v.heading, v.tags]]))
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(c))));
}

function decodeConfig(b64) {
  const c = JSON.parse(decodeURIComponent(escape(atob(b64))));
  return {
    name: c.n, brand_color: c.c, service_type: c.st,
    logo_initial: (c.n || "Y")[0].toUpperCase(),
    locations: (c.lc || []).map(l => ({ label: l[0], place_id: l[1] })),
    rating_flows: Object.fromEntries(Object.entries(c.rf || {}).map(([k, v]) => [k, { heading: v[0], tags: v[1] }]))
  };
}

/* The URL a QR encodes. locIndex selects the branch (0-based). */
function funnelURL(cfg, locIndex = 0) {
  const base = location.href.replace(/[^/]*$/, "index.html");
  return base + "?b=" + encodeConfig(cfg) + (locIndex > 0 ? "&l=" + locIndex : "");
}

/* ---------- logo (localStorage — used on your devices + QR overlay) ---------- */
function getLogo() { try { return localStorage.getItem("starling_logo"); } catch { return null; } }
function setLogo(dataUrl) {
  try { dataUrl ? localStorage.setItem("starling_logo", dataUrl) : localStorage.removeItem("starling_logo"); } catch {}
}

/* ---------- brand color → CSS variables ---------- */
function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function applyBrand(hex) {
  const [r, g, b] = hexToRgb(hex);
  const root = document.documentElement.style;
  root.setProperty("--brand", hex);
  root.setProperty("--brand-soft", `rgba(${r},${g},${b},0.10)`);
}

/* ---------- text variation engine ----------
   Random openers / tag structures / closers per rating band, so ten
   customers with the same tags produce ten visibly different reviews.
   This variety matters for compliance: identical templated reviews
   are a pattern Google's spam systems can flag. */
const OPENERS = {
  5: ["I had a fantastic experience at {name}.", "{name} really delivered — great visit.", "Couldn't ask for a better visit to {name}."],
  4: ["Really solid experience at {name}.", "I enjoyed my time at {name}.", "Good experience at {name} overall."],
  3: ["An okay experience at {name}.", "My visit to {name} was mixed — some good, some not.", "Decent visit to {name}, though not without issues."],
  2: ["My visit to {name} was disappointing.", "Not a great experience at {name}.", "I left {name} feeling let down."],
  1: ["I had a bad experience at {name}.", "Really disappointed with my visit to {name}.", "My visit to {name} did not go well."]
};
const TAG_PATTERNS = {
  high: ["The {list} were the highlights.", "Especially good: the {list}.", "Standouts included the {list}."],
  mid: ["The {list} were fine, but other things need work.", "Where it worked: the {list}. Elsewhere, less so.", "The {list} were acceptable, though inconsistent."],
  low: ["The main issues were the {list}.", "Specifically, the {list} need attention.", "Problems I ran into: the {list}."]
};
const CLOSERS = {
  high: ["I'll definitely be back.", "Would happily return.", "I'd recommend it."],
  mid: ["Hoping the next visit is better.", "Might give it another try.", "Room to improve, but not a write-off."],
  low: ["I hope these issues get addressed.", "Unlikely to return unless things change.", "Needs serious improvement."]
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function buildReview(rating, tags, name) {
  const band = rating >= 4 ? "high" : rating === 3 ? "mid" : "low";
  let text = pick(OPENERS[rating]).replace("{name}", name);
  if (tags.length) {
    const list = tags.map(t => t.toLowerCase()).join(", ");
    text += " " + pick(TAG_PATTERNS[band]).replace("{list}", list);
  }
  text += " " + pick(CLOSERS[band]);
  return text;
}

/* ---------- micro-interactions ---------- */
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