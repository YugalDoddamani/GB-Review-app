/* Guard: is the QR library actually loaded? */
if (typeof QRCodeStyling === "undefined") {
  document.querySelector(".sub").textContent =
    "⚠ QR library failed to load — check that js/qr-code-styling.js exists and refresh.";
  throw new Error("QRCodeStyling not loaded");
}

const config = loadConfig();

/* Defensive: old saved configs may lack locations — repair in memory */
if (!Array.isArray(config.locations) || !config.locations.length) {
  config.locations = [{ label: "Main", place_id: config.place_id || "" }];
}
if (!config.rating_flows || !Object.keys(config.rating_flows).length) {
  config.rating_flows = JSON.parse(JSON.stringify(PRESETS.cafe.flows));
}

applyBrand(config.brand_color);
const logo = getLogo();

let activeLoc = 0;
const captionInput = document.getElementById("qCaption");
const footerInput = document.getElementById("qFooter");

/* location selector */
const locSel = document.getElementById("qLocation");
config.locations.forEach((l, i) => {
  const o = document.createElement("option");
  o.value = i;
  o.textContent = config.locations.length > 1
    ? `${config.name} — ${l.label || "Location " + (i + 1)}`
    : config.name;
  locSel.appendChild(o);
});
locSel.addEventListener("change", () => { activeLoc = parseInt(locSel.value, 10); rebuild(); });

function currentURL() { return funnelURL(config, activeLoc); }

/* Logo sits ABOVE the code now, so ECC Q (not H) — less dense, easier to scan */
function qrOptions() {
  return {
    width: 600, height: 600,
    data: currentURL(),
    qrOptions: { errorCorrectionLevel: "Q" },
    dotsOptions: { color: config.brand_color, type: "rounded" },
    cornersSquareOptions: { color: config.brand_color, type: "extra-rounded" },
    cornersDotOptions: { color: config.brand_color },
    backgroundOptions: { color: "#ffffff" },
    margin: 0
  };
}

function renderCardHeader() {
  const logoEl = document.getElementById("cardLogo");
  if (logo) {
    logoEl.style.backgroundImage = `url(${logo})`;
    logoEl.textContent = "";
  } else {
    logoEl.style.backgroundImage = "none";
    logoEl.textContent = (config.name[0] || "S").toUpperCase();
  }
  document.getElementById("cardName").textContent = config.name;
}

let qr = new QRCodeStyling(qrOptions());
qr.append(document.getElementById("qrHolder"));

function rebuild() {
  document.getElementById("qUrl").textContent = currentURL();
  document.getElementById("qrCaptionText").textContent = captionInput.value || "";
  document.getElementById("qrFooterText").textContent = footerInput.value || "";
  renderCardHeader();
  qr = new QRCodeStyling(qrOptions());
  document.getElementById("qrHolder").innerHTML = "";
  qr.append(document.getElementById("qrHolder"));
}

captionInput.addEventListener("input", () => document.getElementById("qrCaptionText").textContent = captionInput.value);
footerInput.addEventListener("input", () => document.getElementById("qrFooterText").textContent = footerInput.value);

/* ---- PNG download: full card composited at 1080×1350 ---- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

document.getElementById("dlPng").onclick = async () => {
  await document.fonts.ready;

  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  /* logo tile */
  const logoSize = 150, logoY = 100;
  if (logo) {
    const bmp = await createImageBitmap(await (await fetch(logo)).blob());
    ctx.save();
    roundRect(ctx, (W - logoSize) / 2, logoY, logoSize, logoSize, 36);
    ctx.clip();
    ctx.drawImage(bmp, (W - logoSize) / 2, logoY, logoSize, logoSize);
    ctx.restore();
  } else {
    ctx.save();
    roundRect(ctx, (W - logoSize) / 2, logoY, logoSize, logoSize, 36);
    ctx.fillStyle = "#f4f4f5"; ctx.fill();
    ctx.fillStyle = "#18181b";
    ctx.font = "600 64px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((config.name[0] || "S").toUpperCase(), W / 2, logoY + logoSize / 2 + 4);
    ctx.restore();
  }

  /* business name (wrapped) */
  ctx.fillStyle = "#18181b";
  ctx.font = "700 52px Inter, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  let nameLines = [config.name];
  if (config.name.length > 28) {
    nameLines = [];
    let line = "";
    config.name.split(" ").forEach(w => {
      if ((line + " " + w).trim().length > 28) { nameLines.push(line.trim()); line = w; }
      else line += " " + w;
    });
    nameLines.push(line.trim());
  }
  nameLines.forEach((l, i) => ctx.fillText(l, W / 2, 320 + i * 60));

  /* QR */
  const qrSize = 720;
  const qrY = 320 + nameLines.length * 60 + 40;
  const blob = await qr.getRawData("png");
  const qrBmp = await createImageBitmap(blob);
  ctx.drawImage(qrBmp, (W - qrSize) / 2, qrY, qrSize, qrSize);

  /* caption + footer */
  const captionY = qrY + qrSize + 90;
  const caption = captionInput.value.trim();
  if (caption) {
    ctx.fillStyle = "#18181b";
    ctx.font = "600 42px Inter, sans-serif";
    ctx.fillText(caption, W / 2, captionY);
  }
  const footer = footerInput.value.trim();
  if (footer) {
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "400 30px Inter, sans-serif";
    ctx.fillText(footer, W / 2, captionY + 58);
  }

  canvas.toBlob(out => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(out);
    const locLabel = (config.locations[activeLoc]?.label || "card").toLowerCase().replace(/\s+/g, "-");
    a.download = `starling-card-${locLabel}.png`;
    a.click();
    showToast("Card downloaded — 1080×1350");
  }, "image/png");
};

document.getElementById("dlSvg").onclick = async () => {
  const blob = await qr.getRawData("svg");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "starling-qr.svg";
  a.click();
  showToast("SVG downloaded");
};

rebuild();
attachRipple(".btn");