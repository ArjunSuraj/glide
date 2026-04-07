import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, "..");
const dist = join(pkgRoot, "dist");

cpSync(join(pkgRoot, "..", "overlay", "dist", "overlay.js"), join(dist, "overlay.js"));
mkdirSync(join(dist, "fonts"), { recursive: true });
cpSync(join(pkgRoot, "src", "fonts"), join(dist, "fonts"), { recursive: true });
