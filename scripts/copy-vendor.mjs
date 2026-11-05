// 브라우저가 직접 받아야 하는 외부 파일을 node_modules에서 public/vendor로 복사한다.
// (pdf.js 워커, rhwp 한글 렌더러 wasm) — 빌드·개발 전에 자동 실행(package.json의 prebuild/predev).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public", "vendor");
mkdirSync(out, { recursive: true });

const files = [
  ["pdfjs-dist/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
  ["@rhwp/core/rhwp_bg.wasm", "rhwp_bg.wasm"],
];
for (const [spec, name] of files) {
  const src = require.resolve(spec);
  copyFileSync(src, path.join(out, name));
  console.log(`vendor: ${name}`);
}
