#!/usr/bin/env node
/**
 * 从 Cursor 本地 state.vscdb 读取「今日」AI 请求（aiService.generations），写入 docs/今日AI请求.md。
 *
 * 使用：在 JUQI-APP 目录下执行
 *   node scripts/export-yesterday-cursor-prompts.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const PLATFORM = os.platform();
const IS_MAC = PLATFORM === 'darwin';

// 当前脚本所在目录 -> JUQI-APP
const JUQI_APP_DIR = path.resolve(__dirname, '..');
// 工作区根目录（Cursor 打开的通常是 JUQI，即 JUQI-APP 的父目录）
const WORKSPACE_DIR = path.resolve(JUQI_APP_DIR, '..');
const WORKSPACE_URI = 'file://' + (WORKSPACE_DIR.startsWith('/') ? '' : '/') + WORKSPACE_DIR.replace(/\\/g, '/');

function getCursorWorkspaceStorageDir() {
  if (IS_MAC) {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage');
  }
  if (PLATFORM === 'win32') {
    return path.join(process.env.APPDATA || '', 'Cursor', 'User', 'workspaceStorage');
  }
  return path.join(os.homedir(), '.config', 'Cursor', 'User', 'workspaceStorage');
}

function findWorkspaceHash(wsStorageDir) {
  if (!fs.existsSync(wsStorageDir)) {
    return null;
  }
  const dirs = fs.readdirSync(wsStorageDir);
  for (const d of dirs) {
    const workspaceJsonPath = path.join(wsStorageDir, d, 'workspace.json');
    if (!fs.existsSync(workspaceJsonPath)) continue;
    try {
      const raw = fs.readFileSync(workspaceJsonPath, 'utf8');
      const obj = JSON.parse(raw);
      const folder = (obj && obj.folder) || '';
      if (folder === WORKSPACE_URI || folder === WORKSPACE_URI + '/') {
        return d;
      }
    } catch (_) {}
  }
  return null;
}

function getStateVscdbPath(wsStorageDir, hash) {
  return path.join(wsStorageDir, hash, 'state.vscdb');
}

function readItem(dbPath, key) {
  if (!fs.existsSync(dbPath)) return null;
  try {
    const sql = `SELECT value FROM ItemTable WHERE key='${key.replace(/'/g, "''")}'`;
    const out = execSync(`sqlite3 "${dbPath.replace(/"/g, '\\"')}" "${sql}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const trimmed = (out && out.trim()) || '';
    return trimmed ? JSON.parse(trimmed) : null;
  } catch (e) {
    return null;
  }
}

function readGenerations(dbPath) {
  return readItem(dbPath, 'aiService.generations');
}

function readPrompts(dbPath) {
  return readItem(dbPath, 'aiService.prompts');
}

function getYesterdayRangeLocal() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  return { start: yesterdayStart, end: todayStart };
}

function getTodayRangeLocal() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return { start: todayStart, end: now.getTime() + 1 };
}

function formatTime(unixMs) {
  const d = new Date(unixMs);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** 判断一行是否为日志（排除后用于统计输入文字数） */
function isLogLine(line) {
  const t = line.trim();
  if (!t) return true;
  const logPatterns = [
    /^\[HTTP/i, /^nw_socket/i, /^setsockopt/i, /^❌/i, /^📥/i, /^📤/i,
    /Decoding Error|API Error|duration:|status:\s*\d+|retry:\s*\d+/i,
    /POST https|GET https|body:\s*operation=/i,
    /^\[C\d+\.\d+:\d+\]/i, /Protocol not available/i, /Connection.*failed/i,
  ];
  return logPatterns.some((p) => p.test(t));
}

/** 统计一组请求的输入文字数（排除日志行） */
function countInputChars(items) {
  let total = 0;
  for (const item of items) {
    const raw = (item.textDescription || item.text || '').trim();
    const lines = raw.split(/\r?\n/).filter((l) => !isLogLine(l));
    const text = lines.join('\n').trim();
    total += text.length;
  }
  return total;
}

/** 生成「对比昨天」文案：请求数差、输入字数差 */
function formatCompareYesterday(currentCount, currentChars, yesterdayCount, yesterdayChars) {
  const reqDiff = currentCount - yesterdayCount;
  const charDiff = currentChars - yesterdayChars;
  const reqStr = reqDiff > 0 ? `请求 +${reqDiff} 条` : reqDiff < 0 ? `请求 ${reqDiff} 条` : '请求 持平';
  const charStr = charDiff > 0 ? `输入 +${charDiff} 字` : charDiff < 0 ? `输入 ${charDiff} 字` : '输入 持平';
  return `较昨日 ${reqStr}，${charStr}`;
}

function main() {
  const wsStorageDir = getCursorWorkspaceStorageDir();
  if (!fs.existsSync(wsStorageDir)) {
    console.error('未找到 Cursor workspaceStorage 目录:', wsStorageDir);
    process.exit(1);
  }

  const hash = findWorkspaceHash(wsStorageDir);
  if (!hash) {
    console.error('未找到当前工作区对应的 Cursor 存储，工作区 URI:', WORKSPACE_URI);
    process.exit(1);
  }

  const dbPath = getStateVscdbPath(wsStorageDir, hash);
  const generations = readGenerations(dbPath);
  const prompts = readPrompts(dbPath);
  if (!Array.isArray(generations) || generations.length === 0) {
    console.log('未读取到 aiService.generations 或为空，将写入空文档。');
  }

  const range = getTodayRangeLocal();
  const rangeStart = range.start;
  const rangeEnd = range.end;

  // 当日全部：仅用 generations（带时间），不限制条数
  let items = (generations || []).filter(
    (g) => g && typeof g.unixMs === 'number' && g.unixMs >= rangeStart && g.unixMs < rangeEnd
  );
  const seenTexts = new Set(items.map((g) => (g.textDescription || g.text || '').trim().slice(0, 200)));
  // 合并 prompts 中未出现在 generations 里的条目（无精确时间，视为今日补充）
  if (Array.isArray(prompts) && prompts.length > 0) {
    for (const p of prompts) {
      const text = (p.text || '').trim();
      if (!text) continue;
      const key = text.slice(0, 200);
      if (seenTexts.has(key)) continue;
      seenTexts.add(key);
      items.push({ unixMs: rangeStart, textDescription: text, fromPrompts: true });
    }
  }
  items.sort((a, b) => b.unixMs - a.unixMs); // 时间倒序，最新在前

  const requestCount = items.length;
  const inputChars = countInputChars(items);

  const yesterdayRange = getYesterdayRangeLocal();
  const yesterdayItems = (generations || []).filter(
    (g) => g && typeof g.unixMs === 'number' && g.unixMs >= yesterdayRange.start && g.unixMs < yesterdayRange.end
  );
  const yesterdayCount = yesterdayItems.length;
  const yesterdayChars = countInputChars(yesterdayItems);
  const compareText = formatCompareYesterday(requestCount, inputChars, yesterdayCount, yesterdayChars);

  const outPath = path.join(JUQI_APP_DIR, 'docs', '今日AI请求.md');
  const scriptCmd = 'node scripts/export-yesterday-cursor-prompts.js';
  const lines = [
    '> **生成方式**：在 JUQI-APP 目录下执行 `' + scriptCmd + '`',
    '',
    '# 今日 AI 请求',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
    `统计范围：${formatTime(rangeStart)} — ${formatTime(rangeEnd)}（本地时间）`,
    '',
    '说明：本报告输出**当日全部**可用请求（来自 aiService.generations + aiService.prompts 去重合并）。Cursor 本地 generations 仅保留最近约 50 条，合并 prompts 后可能略多。',
    '',
    '## 全局统计',
    '',
    '| 请求数 | 输入文字数（排除日志） | 对比昨天 |',
    '|--------|------------------------|----------|',
    `| ${requestCount} | ${inputChars} 字 | ${compareText} |`,
    '',
    '---',
    '',
  ];

  if (items.length === 0) {
    lines.push('今日暂无记录。请在该工作区使用 Cursor 对话后重新运行脚本。');
    lines.push('');
  } else {
    items.forEach((item, i) => {
      const time = formatTime(item.unixMs);
      const desc = (item.textDescription || item.text || '').trim().replace(/\r\n/g, '\n');
      lines.push(`## ${i + 1}. ${time}`);
      lines.push('');
      lines.push('```');
      lines.push(desc || '(无内容)');
      lines.push('```');
      lines.push('');
    });
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log('已写入:', outPath);
  console.log('请求条数:', items.length);
}

main();
