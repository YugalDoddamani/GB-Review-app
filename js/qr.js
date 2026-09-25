const config = loadConfig();
applyBrand(config.brand_color);
const logo = getLogo();

let activeLoc = 0;
const captionInput = document.getElementById("qCaption");

/* location selector */
const locSel = document.getElementById("qLocation");
config.locations.forEach((l, i) => {
  const o = document.createElement("option");
  o.value = i;
  o.textContent = config.locations.length > 1 ? `${config.name} — ${l.label || "Location " + (i + 1)}` : config.name;
  locSel.appendChild(o);
});
locSel.addEventListener("change", () => { activeLoc = parseInt(locSel.value, 10); rebuild(); });

function currentURL() { return funnelURL(config, activeLoc); }

function qrOptions() {
  return {
    width: 280, height: 280,
    data: currentURL(),
    image: logo || undefined,
    qrOptions: { errorCorrectionLevel: "H" },   // hard rule — logo overlay requires H
    imageOptions: { crossOrigin: "anonymous", margin: 8, imageSize: 0.38 },
    dotsOptions: { color: config.brand_color, type: "rounded" },
    cornersSquareOptions: { color: config.brand_color, type: "extra-rounded" },
    cornersDotOptions: { color: config.brand_color },
    backgroundOptions: { color: "#ffffff" }
  };
}

let qr = new QRCodeStyling(qrOptions());
qr.append(document.getElementById("qrHolder"));

function rebuild() {
  document.getElementById("qUrl").textContent = currentURL();
  document.getElementById("qrCaptionText").textContent = captionInput.value || "";
  qr = new QRCodeStyling(qrOptions());
  document.getElementById("qrHolder").innerHTML = "";
  qr.append(document.getElementById("qrHolder"));
}

captionInput.addEventListener("input", () => {
  document.getElementById("qrCaptionText").textContent = captionInput.value;
});

document.getElementById("dlPng").onclick = async () => {
  const size = 720;
  const caption = captionInput.value.trim();
  const canvasH = caption ? size + 120 : size + 50;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size, canvasH);
  const blob = await qr.getRawData("png");
  const bmp = await createImageBitmap(blob);
  ctx.drawImage(bmp, 0, 0, size, size);
  if (caption) {
    ctx.fillStyle = "#18181b";
    ctx.font = "600 36px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(caption, size / 2, size + 78);
  }
  canvas.toBlob(out => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(out);
    const locLabel = (config.locations[activeLoc]?.label || "qr").toLowerCase().replace(/\s+/g, "-");
    a.download = `starling-qr-${locLabel}.png`;
    a.click();
    showToast("PNG downloaded");
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