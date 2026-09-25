/* QR generator — ECC level H is ENFORCED, not configurable (logo overlay safety). */

const config = loadConfig();
applyBrand(config.brand_color);

let logoDataUrl = null;
const captionInput = document.getElementById("qCaption");
const url = funnelURL(config);

document.getElementById("qUrl").textContent = url;
document.getElementById("qrCaptionText").textContent = captionInput.value;

function qrOptions() {
  return {
    width: 280, height: 280,
    data: url,
    image: logoDataUrl || undefined,
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
  document.getElementById("qrCaptionText").textContent = captionInput.value || "";
  qr = new QRCodeStyling(qrOptions());
  document.getElementById("qrHolder").innerHTML = "";
  qr.append(document.getElementById("qrHolder"));
}

captionInput.addEventListener("input", () => {
  document.getElementById("qrCaptionText").textContent = captionInput.value;
});

document.getElementById("qLogo").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { logoDataUrl = reader.result; rebuild(); showToast("Logo applied"); };
  reader.readAsDataURL(file);
});

/* PNG download — composites QR + caption on a print-ready white canvas */
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
    a.download = "review-qr.png";
    a.click();
    showToast("PNG downloaded");
  }, "image/png");
};

/* SVG download — vector, code only (caption is a print-layout element) */
document.getElementById("dlSvg").onclick = async () => {
  const blob = await qr.getRawData("svg");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "review-qr.svg";
  a.click();
  showToast("SVG downloaded");
};

attachRipple(".btn");