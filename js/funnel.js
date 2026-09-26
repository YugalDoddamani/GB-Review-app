/* ============================================================
   Starling Funnel — funnel.js
   ============================================================ */

function startFunnel() {
  /* ---------- Config ---------- */
  let BUSINESS = (typeof loadConfig === "function") ? loadConfig() : null;

  // Fallback so the funnel never hard-crashes on missing config
  if (!BUSINESS || !BUSINESS.locations || !BUSINESS.locations.length) {
    BUSINESS = {
      name: "Your Business",
      brand_color: "#18181b",
      logo_initial: "Y",
      rating_flows: {},
      locations: [{ label: "Main", place_id: "" }]
    };
  }

  const locIndex = parseInt(new URLSearchParams(location.search).get("l") || "0", 10);
  const LOCATION = BUSINESS.locations[locIndex] || BUSINESS.locations[0];
  const PLACE_ID = LOCATION.place_id;
  const MULTI = BUSINESS.locations.length > 1;

  let rating = 0;
  let selectedTags = [];

  /* ---------- Apply config to DOM ---------- */
  function applyConfig() {
    const nameEl = document.getElementById("bizName");
    if (nameEl) {
      nameEl.textContent =
        BUSINESS.name + (MULTI && LOCATION.label ? " — " + LOCATION.label : "");
    }

    if (typeof applyBrand === "function") applyBrand(BUSINESS.brand_color);

    const logoEl = document.getElementById("logo");
    const img = document.getElementById("logoImg");
    if (logoEl && img) {
      const logo = (typeof getLogo === "function") ? getLogo() : null;
      if (logo) {
        img.src = logo;
        img.style.display = "block";
        logoEl.style.display = "none";
      } else {
        logoEl.textContent =
          BUSINESS.logo_initial || (BUSINESS.name[0] || "Y").toUpperCase();
        logoEl.style.display = "flex";
        img.style.display = "none";
      }
    }

    document.title = "Leave a review — " + BUSINESS.name;
    resetFunnel();
  }

  /* ---------- Config from parent (builder iframe) ---------- */
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "starling_config") {
      const base = (typeof defaultConfig === "function") ? defaultConfig() : {};
      BUSINESS = { ...base, ...e.data.config };
      applyConfig();
    }
  });

  /* ---------- Stars ---------- */
  const starsEl = document.getElementById("stars");
  if (starsEl) {
    starsEl.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "star";
      b.textContent = "★";
      b.setAttribute("aria-label", i + " stars");
      b.onclick = () => selectRating(i);
      starsEl.appendChild(b);
    }
  } else {
    console.error("[funnel] #stars element not found in funnel.html");
  }

  function selectRating(n) {
    rating = n;
    if (starsEl) {
      [...starsEl.children].forEach((s, i) => {
        s.classList.toggle("filled", i < n);
        if (i === n - 1) {
          s.classList.remove("pop");
          void s.offsetWidth;
          s.classList.add("pop");
        }
      });
    }
    console.log("[review_event] rating:", n, "location:", LOCATION.label);
    setTimeout(() => gotoStep(2), 300);
  }

  /* ---------- Tags / Step 2 ---------- */
  function renderTags() {
    const flow = (BUSINESS.rating_flows && BUSINESS.rating_flows[rating]) || {
      heading: "What stood out?",
      tags: []
    };

    const tagsTitle = document.getElementById("tagsTitle");
    const tagsHint  = document.getElementById("tagsHint");
    const chipsEl   = document.getElementById("chips");

    if (tagsTitle) tagsTitle.textContent = flow.heading || "What stood out?";
    if (tagsHint) {
      tagsHint.textContent =
        rating >= 4
          ? "Pick anything that applies — or skip."
          : "Your honest feedback helps us improve — pick anything that applies, or skip.";
    }

    if (!chipsEl) return;
    chipsEl.innerHTML = "";
    selectedTags = [];

    (flow.tags || []).forEach((t) => {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "chip";
      c.textContent = t;
      c.onclick = () => {
        c.classList.toggle("selected");
        if (c.classList.contains("selected")) selectedTags.push(t);
        else selectedTags = selectedTags.filter((x) => x !== t);
      };
      chipsEl.appendChild(c);
    });
  }

  /* ---------- Step 3: build review + copy ---------- */
function generateReview() {
  const textEl = document.getElementById("reviewText");
  if (!textEl) return;
  if (typeof buildReview === "function") {
    textEl.value = buildReview(
      rating,
      selectedTags,
      BUSINESS.name,
      BUSINESS.city || ""     // ← must be here
    );
  } else {
    textEl.value = "Great experience at " + BUSINESS.name + "!";
  }
}

  const tagsNext = document.getElementById("tagsNext");
  const tagsSkip = document.getElementById("tagsSkip");
  if (tagsNext) tagsNext.onclick = () => { generateReview(); gotoStep(3); };
  if (tagsSkip) tagsSkip.onclick = () => { generateReview(); gotoStep(3); };

  /* ---------- iOS-safe clipboard ---------- */
  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {});
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px;";
    document.body.appendChild(ta);

    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0, 999999);

    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  /* ---------- Single "Copy & Continue to Google" button ---------- */
  (function initGoogleButton() {
    const btn = document.getElementById("googleBtn");
    if (!btn) return;

    const label = btn.querySelector(".cta-label") || btn;
    const originalLabel = label.textContent;
    let busy = false;

    btn.addEventListener("click", () => {
      if (busy) return;
      busy = true;

      const textEl = document.getElementById("reviewText");
      const text = textEl ? textEl.value : "";
      const url  = "https://search.google.com/local/writereview?placeid=" + PLACE_ID;

      // Synchronous copy — must happen inside the gesture
      const ok = copyToClipboard(text);

      btn.classList.add("filling");
      label.textContent = "Copied!";

      console.log("[review_event] handoff, rating:", rating, "tags:", selectedTags);

      if (!ok) {
        if (typeof showToast === "function") {
          showToast("Couldn't copy — long-press the review text to copy it");
        }
        btn.classList.remove("filling");
        label.textContent = originalLabel;
        busy = false;
        return;
      }

      setTimeout(() => {
        label.textContent = "Opening Google…";
        setTimeout(() => { window.location.href = url; }, 200);
      }, 800);
    });
  })();

  /* ---------- Step navigation ---------- */
  const stepLabels = [
    "Step 1 of 3 · How was your visit?",
    "Step 2 of 3 · A few details",
    "Step 3 of 3 · Your review"
  ];

 function gotoStep(n) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById("step" + n);
  if (target) target.classList.add("active");

  const lbl = document.getElementById("stepLabel");
  if (lbl) lbl.textContent = stepLabels[n - 1];

  // Progress bar: 33% → 66% → 100%
  const fill = document.getElementById("progressFill");
  if (fill) {
    fill.style.width = (n / 3) * 100 + "%";
    fill.classList.toggle("done", n === 3);
  }

  if (n === 2) renderTags();
}
const fill = document.getElementById("progressFill");
if (fill) {
  fill.style.width = "0%";
  fill.classList.remove("done");
}

  /* ---------- Boot ---------- */
  applyConfig();
  if (typeof attachRipple === "function") attachRipple(".btn");

  // Notify parent (builder) that we're ready for config
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "starling_ready" }, "*");
    }
  } catch (e) {}
}

/* ---------- DOM ready gate ---------- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startFunnel);
} else {
  startFunnel();
}