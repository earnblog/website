// 构建前顺手更新 ETF 每日净流入记录(src/data/etf-daily.json),让每日发文任务每天把它带进提交。
// Cloudflare 自己的构建机上不跑(改了也提交不回仓库);取数失败或超时只打一行提示,绝不让构建失败。
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.CF_PAGES) process.exit(0);
const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'datapack.mjs');
const r = spawnSync(process.execPath, [script, '--etf-sync'], { encoding: 'utf8', timeout: 120000 });
console.log((r.stdout || '').trim() || `etf-sync: 跳过(${r.error?.message || (r.stderr || '').trim().split('\n').at(-1) || '无输出'})`);
