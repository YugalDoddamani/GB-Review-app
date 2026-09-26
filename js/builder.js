let config;
try {
  const saved = localStorage.getItem("starling_config");
  config = saved ? { ...defaultConfig(), ...JSON.parse(saved) } : defaultConfig();
} catch { config = defaultConfig(); }

let activeRating = 5;

/* ---- element refs ---- */
const el = id => document.getElementById(id);
const fields = {
  name: el("fName"),
  color: el("fColor"),
  service: el("fService"),
  heading: el("fHeading"),
  tags: el("fTags"),
  city: el("fCity")            // ← NEW
};

/* ---- service select ---- */
Object.entries(PRESETS).forEach(([key, p]) => {
  const o = document.createElement("option");
  o.value = key; o.textContent = p.label;
  fields.service.appendChild(o);
});
fields.service.value = config.service_type;

el("applyPreset").onclick = () => {
  const key = fields.service.value;
  config.service_type = key;
  config.rating_flows = JSON.parse(JSON.stringify(PRESETS[key].flows));
  renderRatingTabs();
  fillRatingEditor();
  pushConfig();
  showToast(PRESETS[key].label + " preset loaded");
};

/* ---- logo ---- */
function renderLogoPreview() {
  const logo = getLogo();
  const p = el("logoPreview");
  if (logo) {
    p.style.backgroundImage = `url(${logo})`;
    p.style.backgroundSize = "cover";
    p.textContent = "";
  } else {
    p.style.backgroundImage = "none";
    p.textContent = (config.name[0] || "?").toUpperCase();
  }
}
el("fLogo").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    setLogo(reader.result);
    renderLogoPreview();
    showToast("Logo saved");
  };
  reader.readAsDataURL(file);
});
el("logoRemove").onclick = () => { setLogo(null); renderLogoPreview(); };

/* ---- locations ---- */
function renderLocations() {
  const list = el("locList");
  list.innerHTML = "";
  config.locations.forEach((loc, i) => {
    const row = document.createElement("div");
    row.className = "loc-row";
    row.innerHTML = `
      <input type="text" class="input loc-label" placeholder="Label (e.g. Downtown)" value="${loc.label.replace(/"/g, "&quot;")}">
      <input type="text" class="input mono loc-place" placeholder="Place ID" value="${loc.place_id.replace(/"/g, "&quot;")}">
      <button class="btn btn-ghost loc-remove" title="Remove">✕</button>`;
    row.querySelector(".loc-label").addEventListener("input", e => { loc.label = e.target.value; scheduleSave(); });
    row.querySelector(".loc-place").addEventListener("input", e => { loc.place_id = e.target.value.trim(); scheduleSave(); });
    row.querySelector(".loc-remove").onclick = () => {
      if (config.locations.length === 1) return showToast("Keep at least one location");
      config.locations.splice(i, 1);
      renderLocations(); pushConfig();
    };
    list.appendChild(row);
  });
}
el("locAdd").onclick = () => {
  config.locations.push({ label: "", place_id: "" });
  renderLocations();
  showToast("Add a label + Place ID for the new branch");
};

/* ---- rating flow tabs ---- */
function renderRatingTabs() {
  const tabs = el("rtabs");
  tabs.innerHTML = "";
  for (let r = 1; r <= 5; r++) {
    const b = document.createElement("button");
    b.className = "rtab" + (r === activeRating ? " active" : "");
    b.innerHTML = "★".repeat(r) || "—";
    b.onclick = () => {
      activeRating = r;
      renderRatingTabs();
      fillRatingEditor();
    };
    tabs.appendChild(b);
  }
}

function fillRatingEditor() {
  const flow = config.rating_flows[activeRating] || { heading: "", tags: [] };
  el("ratingNum").textContent = activeRating;
  fields.heading.value = flow.heading || "";
  fields.tags.value = (flow.tags || []).join("\n");
}

fields.heading.addEventListener("input", () => {
  config.rating_flows[activeRating] = config.rating_flows[activeRating] || { heading: "", tags: [] };
  config.rating_flows[activeRating].heading = fields.heading.value;
  scheduleSave();
});
fields.tags.addEventListener("input", () => {
  config.rating_flows[activeRating] = config.rating_flows[activeRating] || { heading: "", tags: [] };
  config.rating_flows[activeRating].tags = fields.tags.value.split("\n").map(s => s.trim()).filter(Boolean);
  scheduleSave();
});

/* ---- save + preview sync ---- */
let saveTimer;
function scheduleSave() {
  const state = el("saveState");
  state.classList.add("saving");
  state.innerHTML = '<span class="dot"></span>Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushConfig, 300);
}
function pushConfig() {
  config.name = fields.name.value.trim() || "Your Business";
  config.logo_initial = (config.name[0] || "Y").toUpperCase();
  config.brand_color = fields.color.value;
  config.city = (fields.city?.value || "").trim();   // ← NEW
  saveConfig(config);
  applyBrand(config.brand_color);
  el("fColorHex").textContent = config.brand_color;
  renderLogoPreview();
  const state = el("saveState");
  state.classList.remove("saving");
  state.innerHTML = '<span class="dot"></span>Saved locally';
  el("preview").contentWindow.postMessage({ type: "starling_config", config }, "*");
}

fields.name.addEventListener("input", scheduleSave);
fields.color.addEventListener("input", scheduleSave);
fields.service.addEventListener("change", scheduleSave);
if (fields.city) fields.city.addEventListener("input", scheduleSave);   // ← NEW

el("resetBtn").onclick = () => {
  config = defaultConfig();
  localStorage.removeItem("starling_config");
  setLogo(null);
  fillForm();
  pushConfig();
  showToast("Reset to defaults");
};

function fillForm() {
  fields.name.value = config.name;
  fields.color.value = config.brand_color;
  fields.service.value = config.service_type;
  if (fields.city) fields.city.value = config.city || "";   // ← NEW
  el("fColorHex").textContent = config.brand_color;
  renderLocations();
  renderRatingTabs();
  fillRatingEditor();
  renderLogoPreview();
}

fillForm();
applyBrand(config.brand_color);
attachRipple(".btn");


const cityEl = document.getElementById("fCity");
if (cityEl) {
  cityEl.addEventListener("input", scheduleSave);
  console.log("[builder] city listener attached");
} else {
  console.error("[builder] #fCity not found in DOM!");
}