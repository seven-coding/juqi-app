/**
 * 仅对本页消息 id 做已读更新，避免全量 where 更新导致超时
 * @param {object} db - database 实例
 * @param {string} dbName - 集合名
 * @param {object} update - 更新内容，如 { status: 1, noReadCount: 0 }
 * @param {string[]} pageMessageIds - 本页消息 _id 列表
 * @param {number} maxIds - 单次更新 id 数量上限，默认 100
 */
async function alreadyReadByPageIds(db, dbName, update, pageMessageIds, maxIds = 100) {
  if (!db || !pageMessageIds || pageMessageIds.length === 0) return;
  const _ = db.command;
  const ids = pageMessageIds.slice(0, maxIds);
  if (ids.length === 0) return;
  try {
    await db.collection(dbName).where({ _id: _.in(ids) }).update({ data: update });
    if (pageMessageIds.length > maxIds) {
      console.log(`[alreadyReadByPageIds] ${dbName} 本页 ${pageMessageIds.length} 条，仅更新前 ${maxIds} 条`);
    }
  } catch (err) {
    console.error('[alreadyReadByPageIds] error', dbName, err);
  }
}

module.exports = { alreadyReadByPageIds };
