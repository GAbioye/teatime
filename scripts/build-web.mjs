// Builds the web layer of the app into www/ (what Capacitor packages into the APK).
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const fonts = [
  ["bricolage-grotesque", ["500", "700", "800"]],
  ["figtree", ["400", "500", "600", "700"]],
  ["jetbrains-mono", ["500", "700"]],
];

rmSync("www", { recursive: true, force: true });
mkdirSync("www/fonts", { recursive: true });
for (const [family, weights] of fonts) {
  for (const w of weights) {
    const f = `${family}-latin-${w}-normal.woff2`;
    cpSync(`node_modules/@fontsource/${family}/files/${f}`, `www/fonts/${f}`);
  }
}
cpSync("src/index.html", "www/index.html");
cpSync("src/styles.css", "www/styles.css");
cpSync("src/icon.png", "www/icon.png");

await build({
  entryPoints: ["src/app.js"],
  bundle: true,
  format: "iife",
  target: ["chrome90"],
  minify: true,
  sourcemap: false,
  outfile: "www/app.js",
  logLevel: "info",
});
