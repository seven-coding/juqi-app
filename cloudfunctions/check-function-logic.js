/**
 * 检查各云函数是否有具体业务逻辑，还是仅空壳。
 * 空壳判定：入口文件很短、无本地业务模块引用、无数据库/复杂分支。
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname);
const cloudbaserc = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'cloudbaserc.json'), 'utf8')
);
const names = (cloudbaserc.functions || []).map((f) =>
  typeof f === 'string' ? f : f.name
);

function checkLogic(name) {
  const indexPath = path.join(rootDir, name, 'index.js');
  if (!fs.existsSync(indexPath)) {
    return { name, status: 'no_entry', detail: '无 index.js' };
  }
  const content = fs.readFileSync(indexPath, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const lineCount = lines.length;

  const hasLocalRequire = /require\s*\(\s*['"]\.\//.test(content);
  const hasDb = /cloud\.database\s*\(\)|\.collection\s*\(|db\./.test(content);
  const hasMultiBranch =
    /(type|method|action)\s*[=!]==?\s*[0-9]+|(type|method|action)\s*==?\s*['"]/.test(
      content
    );
  const hasModulesDir = fs.existsSync(path.join(rootDir, name, 'modules'));

  const hasLogic =
    hasLocalRequire || hasDb || hasMultiBranch || hasModulesDir || lineCount > 45;

  if (hasLogic) {
    return {
      name,
      status: 'has_logic',
      detail: `有业务逻辑 (${lineCount} 行${hasLocalRequire ? ', 本地模块' : ''}${hasDb ? ', 数据库' : ''}${hasMultiBranch ? ', 多分支' : ''})`,
    };
  }
  return {
    name,
    status: 'empty_shell',
    detail: `疑似空壳 (${lineCount} 行, 无本地模块/数据库/多分支)`,
  };
}

const results = names.map(checkLogic);
const hasLogicList = results.filter((r) => r.status === 'has_logic');
const emptyList = results.filter((r) => r.status === 'empty_shell');
const noEntryList = results.filter((r) => r.status === 'no_entry');

console.log('========== 云函数业务逻辑检查 ==========\n');
console.log('总数量:', names.length);
console.log('有业务逻辑:', hasLogicList.length);
console.log('疑似空壳:', emptyList.length);
if (noEntryList.length) console.log('无入口文件:', noEntryList.length);
console.log('');
console.log('--- 有业务逻辑 ---');
hasLogicList.forEach((r) => console.log('  ', r.name, '|', r.detail));
if (emptyList.length) {
  console.log('\n--- 疑似空壳 ---');
  emptyList.forEach((r) => console.log('  ', r.name, '|', r.detail));
}
if (noEntryList.length) {
  console.log('\n--- 无 index.js ---');
  noEntryList.forEach((r) => console.log('  ', r.name));
}
