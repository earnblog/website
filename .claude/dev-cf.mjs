// 本地预览:在博客目录里跑 wrangler pages dev dist(带 functions 和本地 D1)。先 npm run build
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
spawn("npx.cmd", ["--yes", "wrangler", "pages", "dev", "dist", "--port", "8790", "--ip", "127.0.0.1"], { cwd: root, stdio: "inherit", shell: true });
