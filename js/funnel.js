let BUSINESS = loadConfig();
let rating = 0, selectedTags = [];

function applyConfig() {
  document.getElementById("bizName").textContent = BUSINESS.name;
  const logo = document.getElementById("logo");
  logo.textContent = BUSINESS.logo_initial;
  applyBrand(BUSINESS.brand_color);
  document.getElementById("placeNote").textContent = "placeid: " + BUSINESS.place_id;
  document.title = "Leave a review — " + BUSINESS.name;
  resetFunnel();
}

/* builder hot-reload */
window.addEventListener("message", e => {
  if (e.data && e.data.type === "qr_config") {
    BUSINESS = { ...DEFAULT_CONFIG, ...e.data.config };
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
  // analytics later → review_events insert. Never changes the destination.
  console.log("[review_event] rating:", n);
  setTimeout(() => gotoStep(2), 300);
}

/* tags */
function renderTags() {
  const positive = rating >= 4;
  const tags = positive ? BUSINESS.positive_tags : BUSINESS.improvement_tags;
  document.getElementById("tagsTitle").textContent = positive ? "What stood out?" : "What could be better?";
  document.getElementById("tagsHint").textContent = positive
    ? "Pick anything that applies — or skip."
    : "Your honest feedback helps us improve — pick anything that applies, or skip.";
  const chipsEl = document.getElementById("chips");
  chipsEl.innerHTML = ""; selectedTags = [];
  tags.forEach(t => {
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

/* review generation + handoff */
function generateReview() {
  const name = BUSINESS.name;
  const openers = {
    5: `I had an excellent experience at ${name} and would happily recommend it.`,
    4: `I had a really good experience at ${name} and would recommend it.`,
    3: `My visit to ${name} was solid overall, with some real highlights.`,
    2: `My experience at ${name} fell short of expectations in a couple of ways.`,
    1: `I was disappointed with my experience at ${name}.`
  };
  let text = openers[rating] || openers[3];
  if (selectedTags.length) {
    const list = selectedTags.map(t => t.toLowerCase()).join(", ");
    text += rating >= 4 ? ` The ${list} really stood out.` : ` Specifically, the ${list} could use some attention.`;
  }
  text += rating >= 4 ? " I'll definitely be back." : " I hope to see these improve on my next visit.";
  document.getElementById("reviewText").value = text;
}

document.getElementById("copyBtn").onclick = async () => {
  const text = document.getElementById("reviewText").value;
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.getElementById("reviewText"); ta.select(); document.execCommand("copy"); }
  showToast("Copied — paste it into Google");
};

document.getElementById("googleBtn").onclick = () => {
  // Compliance: EVERY rating goes to Google. No branches, no exceptions.
  window.open("https://search.google.com/local/writereview?placeid=" + BUSINESS.place_id, "_blank");
  console.log("[review_event] handoff, rating:", rating, "tags:", selectedTags);
};

/* navigation */
const stepLabels = ["Step 1 of 3 · How was your visit?", "Step 2 of 3 · A few details", "Step 3 of 3 · Your review"];
function gotoStep(n) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById("step" + n).classList.add("active");
  document.getElementById("stepLabel").textContent = stepLabels[n - 1];
  if (n === 2) renderTags();
}

function resetFunnel() {
  rating = 0; selectedTags = [];
  [...starsEl.children].forEach(s => s.classList.remove("filled"));
  gotoStep(1);
}

applyConfig();
attachRipple(".btn");