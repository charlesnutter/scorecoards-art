// High-resolution raster export. The card SVG relies on page CSS and
// webfonts, and an SVG rasterized through an <img> cannot fetch external
// resources — so the stylesheet is embedded and every @font-face the page
// loaded is inlined as a data: URI before drawing to canvas.
import scorecardCss from "./scorecard.css?raw";

const fontCache = new Map();

async function blobToDataUri(blob) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
}

async function fontFaceCss() {
  const faces = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const src = rule.style.getPropertyValue("src") || "";
      const m = src.match(/url\(["']?([^"')]+)["']?\)/);
      if (!m) continue;
      const url = new URL(m[1], sheet.href || location.href).href;
      if (!fontCache.has(url)) {
        fontCache.set(
          url,
          fetch(url)
            .then((r) => r.blob())
            .then(blobToDataUri)
            .catch(() => null)
        );
      }
      const dataUri = await fontCache.get(url);
      if (dataUri) faces.push(rule.cssText.replace(m[1], dataUri));
    }
  }
  return faces.join("\n");
}

// Renders the SVG string to a PNG and triggers a download. Tries a large
// canvas first and steps down for browsers with small canvas limits.
export async function downloadPNG(svgString, filename) {
  const fonts = await fontFaceCss();
  const styled = svgString.replace(
    ">",
    `><style><![CDATA[${fonts}\n${scorecardCss}]]></style>`
  );
  const svgUrl = URL.createObjectURL(
    new Blob([styled], { type: "image/svg+xml;charset=utf-8" })
  );
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("SVG failed to load"));
      img.src = svgUrl;
    });

    const vb = svgString.match(/viewBox="0 0 (\d+\.?\d*) (\d+\.?\d*)"/);
    if (!vb) throw new Error("no viewBox");
    const w = parseFloat(vb[1]);
    const h = parseFloat(vb[2]);

    for (const longEdge of [7200, 4800, 3200]) {
      const scale = longEdge / Math.max(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!png) continue; // canvas too large for this browser — step down
      const a = document.createElement("a");
      a.href = URL.createObjectURL(png);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    throw new Error("canvas export failed at every size");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
