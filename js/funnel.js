let BUSINESS = loadConfig();
const locIndex = parseInt(new URLSearchParams(location.search).get("l") || "0", 10);
const LOCATION = BUSINESS.locations[locIndex] || BUSINESS.locations[0];
const PLACE_ID = LOCATION.place_id;
const MULTI = BUSINESS.locations.length > 1;

let rating = 0, selectedTags = [];

function applyConfig() {
  document.getElementById("bizName").textContent =
    BUSINESS.name + (MULTI && LOCATION.label ? " — " + LOCATION.label : "");
  applyBrand(BUSINESS.brand_color);

  /* logo: uploaded image if this device has it, otherwise the initial */
  const logoEl = document.getElementById("logo");
  const img = document.getElementById("logoImg");
  const logo = getLogo();
  if (logo) {
    img.src = logo; img.style.display = "block";
    logoEl.style.display = "none";
  } else {
    logoEl.textContent = BUSINESS.logo_initial || (BUSINESS.name[0] || "Y").toUpperCase();
    logoEl.style.display = "flex"; img.style.display = "none";
  }

  document.title = "Leave a review — " + BUSINESS.name;
  resetFunnel();
}

window.addEventListener("message", e => {
  if (e.data && e.data.type === "starling_config") {
    BUSINESS = { ...defaultConfig(), ...e.data.config };
    applyConfig();
  }
});

/* stars */
const starsEl = document.getElementById("stars");
for (let i = 1; i <= 5; i++) {
  const b = document.createElement("button");
  b.className = "star"; b.textContent = "★";
  b.setAttribute("aria-label", i + " stars");
  b.onclick = () => selectRating(i);
  starsEl.appendChild(b);
}

function selectRating(n) {
  rating = n;
  [...starsEl.children].forEach((s, i) => {
    s.classList.toggle("filled", i < n);
    if (i === n - 1) { s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); }
  });
  console.log("[review_event] rating:", n, "location:", LOCATION.label); // analytics later
  setTimeout(() => gotoStep(2), 300);
}

/* tags — per-rating flow */
function renderTags() {
  const flow = BUSINESS.rating_flows[rating] || { heading: "What stood out?", tags: [] };
  document.getElementById("tagsTitle").textContent = flow.heading || "What stood out?";
  document.getElementById("tagsHint").textContent =
    rating >= 4 ? "Pick anything that applies — or skip."
                : "Your honest feedback helps us improve — pick anything that applies, or skip.";
  const chipsEl = document.getElementById("chips");
  chipsEl.innerHTML = ""; selectedTags = [];
  (flow.tags || []).forEach(t => {
    const c = document.createElement("button");
    c.className = "chip"; c.textContent = t;
    c.onclick = () => {
      c.classList.toggle("selected");
      if (c.classList.contains("selected")) selectedTags.push(t);
      else selectedTags = selectedTags.filter(x => x !== t);
    };
    chipsEl.appendChild(c);
  });
}

document.getElementById("tagsNext").onclick = () => { generateReview(); gotoStep(3); };
document.getElementById("tagsSkip").onclick = () => { generateReview(); gotoStep(3); };

function generateReview() {
  // variation engine — different structure every time
  document.getElementById("reviewText").value = buildReview(rating, selectedTags, BUSINESS.name);
}
/* ---------- iOS-safe clipboard ---------- */
function copyToClipboard(text) {
  // Modern API — works on HTTPS + iOS Safari 13.4+
  if (navigator.clipboard && window.isSecureContext) {
    // Fire-and-forget; the copy is queued before we navigate.
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }

  // Legacy fallback (older iOS, non-HTTPS, some in-app browsers)
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

    const text = document.getElementById("reviewText").value;
    const url  = "https://search.google.com/local/writereview?placeid=" + PLACE_ID;

    // 1. Copy SYNCHRONOUSLY — still inside the user gesture.
    //    Do NOT await anything before this line.
    const ok = copyToClipboard(text);

    // 2. Start the fill animation immediately.
    btn.classList.add("filling");
    label.textContent = "Copied!";

    // 3. Analytics (safe — fires before navigation)
    console.log("[review_event] handoff, rating:", rating, "tags:", selectedTags);

    if (!ok) {
      // Clipboard failed — don't navigate with an empty clipboard.
      showToast("Couldn't copy — long-press the review text to copy it");
      btn.classList.remove("filling");
      label.textContent = originalLabel;
      busy = false;
      return;
    }

    // 4. After the fill animation, navigate.
    //    Use window.location.href (NOT window.open) — same-tab nav is
    //    never blocked by iOS Safari's popup blocker.
    setTimeout(() => {
      label.textContent = "Opening Google…";
      setTimeout(() => { window.location.href = url; }, 200);
    }, 800);
  });
})();

const stepLabels = ["Step 1 of 3 · How was your visit?", "Step 2 of 3 · A few details", "Step 3 of 3 · Your review"];
ffunction gotoStep(n) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById("step" + n).classList.add("active");
  document.getElementById("stepLabel").textContent = stepLabels[n - 1];

  document.querySelectorAll(".step-dot").forEach(dot => {
    const step = parseInt(dot.dataset.step, 10);
    dot.classList.toggle("active", step === n);
    dot.classList.toggle("completed", step < n);
  });

  if (n === 2) renderTags();
}
function resetFunnel() {
  rating = 0; selectedTags = [];
  [...starsEl.children].forEach(s => s.classList.remove("filled"));
  gotoStep(1);
}

applyConfig();
attachRipple(".btn");