let config;
try {
  const saved = localStorage.getItem("qr_business_config");
  config = saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_CONFIG };
} catch { config = { ...DEFAULT_CONFIG }; }

const fields = {
  name: document.getElementById("fName"),
  initial: document.getElementById("fInitial"),
  color: document.getElementById("fColor"),
  placeId: document.getElementById("fPlaceId"),
  posTags: document.getElementById("fPosTags"),
  impTags: document.getElementById("fImpTags")
};

function fillForm() {
  fields.name.value = config.name;
  fields.initial.value = config.logo_initial;
  fields.color.value = config.brand_color;
  document.getElementById("fColorHex").textContent = config.brand_color;
  fields.placeId.value = config.place_id;
  fields.posTags.value = config.positive_tags.join("\n");
  fields.impTags.value = config.improvement_tags.join("\n");
  validatePlaceId();
}

function readForm() {
  config.name = fields.name.value.trim() || "Your Business";
  config.logo_initial = (fields.initial.value.trim() || config.name[0]).toUpperCase();
  config.brand_color = fields.color.value;
  config.place_id = fields.placeId.value.trim();
  config.positive_tags = fields.posTags.value.split("\n").map(s => s.trim()).filter(Boolean);
  config.improvement_tags = fields.impTags.value.split("\n").map(s => s.trim()).filter(Boolean);
}

function validatePlaceId() {
  const v = fields.placeId.value.trim();
  const ok = v.toLowerCase().startsWith("chij");
  document.getElementById("placeWarn").style.display = (v && !ok) ? "block" : "none";
}

let saveTimer;
function pushConfig() {
  readForm();
  validatePlaceId();
  saveConfig(config);
  applyBrand(config.brand_color); // builder's own ambient follows the brand too
  document.getElementById("fColorHex").textContent = config.brand_color;
  const state = document.getElementById("saveState");
  state.classList.remove("saving");
  state.innerHTML = '<span class="dot"></span>Saved locally';
  document.getElementById("preview").contentWindow.postMessage({ type: "qr_config", config }, "*");
}

function markSaving() {
  const state = document.getElementById("saveState");
  state.classList.add("saving");
  state.innerHTML = '<span class="dot"></span>Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushConfig, 300);
}

Object.values(fields).forEach(el => el.addEventListener("input", markSaving));

document.getElementById("testLinkBtn").onclick = () => {
  readForm();
  window.open("https://search.google.com/local/writereview?placeid=" + config.place_id, "_blank");
};

document.getElementById("resetBtn").onclick = () => {
  config = { ...DEFAULT_CONFIG };
  localStorage.removeItem("qr_business_config");
  fillForm();
  pushConfig();
  showToast("Reset to defaults");
};

fillForm();
applyBrand(config.brand_color);
attachRipple(".btn");