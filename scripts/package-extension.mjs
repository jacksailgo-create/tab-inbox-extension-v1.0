import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = packageJson.version || "0.0.0";
const releaseDir = join(root, "release");
const stagingDir = join(releaseDir, `tab-inbox-extension-v${version}`);
const zipPath = join(releaseDir, `tab-inbox-extension-v${version}.zip`);

const entries = [
  "manifest.json",
  "dashboard.html",
  "dashboard.css",
  "dashboard.js",
  "content_error_guard.js",
  "auto_classifier_ping.js",
  "workspace_fab.js",
  "icons",
  "dist/background/serviceWorker.js"
];

rmSync(stagingDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(stagingDir, { recursive: true });

for (const entry of entries) {
  const source = join(root, entry);
  if (!existsSync(source)) {
    throw new Error(`Missing package entry: ${entry}. Run npm run build first.`);
  }
  cpSync(source, join(stagingDir, entry), { recursive: true });
}

execFileSync("zip", ["-qr", zipPath, "."], { cwd: stagingDir, stdio: "inherit" });

console.log(`Created ${zipPath}`);
console.log(`Staged unpacked extension at ${stagingDir}`);
