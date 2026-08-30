#!/usr/bin/env node
/*
 * Turns a logo JPEG — black line art on an off-white paper square, which is how
 * they arrive from the designer — into the transparent PNG the site uses.
 *
 *   node tools/make-logo.js <input.jpg> <output.png> [maxEdge]
 *
 * Dropped straight onto the site's beige, the JPEG reads as a white box. This
 * keys the paper out into real alpha, trims the surrounding margin, and scales
 * the result down (default 260px on its long edge; the header monogram is 320).
 *
 * It borrows Playwright's browser purely for its canvas — there is no image
 * library in this project, and adding one for six files is not worth it.
 */
const { chromium } = require("playwright");
const fs = require("fs");

const [input, output, maxEdgeArg] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node tools/make-logo.js <input.jpg> <output.png> [maxEdge]");
  process.exit(1);
}
const maxEdge = Number(maxEdgeArg) || 260;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("about:blank");

  const dataUrl = "data:image/jpeg;base64," + fs.readFileSync(input).toString("base64");

  const result = await page.evaluate(
    async ([dataUrl, maxEdge]) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();

      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const px = data.data;

      // For antialiased black ink on paper, alpha = 1 - luminance/paper with
      // the ink left pure black. Composited over any colour that reproduces
      // exactly what the original showed over its own paper.
      const PAPER = 243;
      let minX = c.width;
      let minY = c.height;
      let maxX = -1;
      let maxY = -1;

      for (let i = 0; i < px.length; i += 4) {
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        let a = Math.round(255 * (1 - lum / PAPER));
        if (a < 6) a = 0;
        if (a > 255) a = 255;
        px[i] = 0;
        px[i + 1] = 0;
        px[i + 2] = 0;
        px[i + 3] = a;

        if (a > 12) {
          const p = i / 4;
          const x = p % c.width;
          const y = (p - x) / c.width;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      ctx.putImageData(data, 0, 0);

      if (maxX < 0) {
        minX = 0;
        minY = 0;
        maxX = c.width - 1;
        maxY = c.height - 1;
      }
      const cw = maxX - minX + 1;
      const ch = maxY - minY + 1;
      const scale = Math.min(1, maxEdge / Math.max(cw, ch));

      const o = document.createElement("canvas");
      o.width = Math.round(cw * scale);
      o.height = Math.round(ch * scale);
      const octx = o.getContext("2d");
      octx.imageSmoothingQuality = "high";
      octx.drawImage(c, minX, minY, cw, ch, 0, 0, o.width, o.height);

      return { png: o.toDataURL("image/png").split(",")[1], w: o.width, h: o.height };
    },
    [dataUrl, maxEdge]
  );

  fs.writeFileSync(output, Buffer.from(result.png, "base64"));
  const kb = (fs.statSync(output).size / 1024).toFixed(0);
  console.log(`${output}  ${result.w}x${result.h}  ${kb} KB`);

  await browser.close();
})();
