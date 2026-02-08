/**
 * 从正式环境同步首页各 type 所需动态到测试环境，最多 50 条
 * - 最新/热榜：可见动态按 publicTime 取 50 条
 * - 公告板：优先包含管理员动态（openId 在 ADMIN_USER 中）
 * - 同时同步相关 user 记录（最多 50 个），保证 dealData lookup 可用
 */

const MAX_DYN = 50;
const MAX_USER = 50;

// 与 getDynsListV2/admin.js 保持一致，公告板展示这些用户的动态
const ADMIN_USER = [
  'oynAL4yTQzRWGZSU_2hCoiqdjIOk',
  'oynAL4zEZQsiOQXJ6eUyA3foo8js',
  'oynAL46LfoeMMs_ZWqxvRYFOirQM',
  'oynAL45D28kGnUz-sbMJwex3wfEU',
  'oynAL47bUUoXW4yiVY3lTD1IVoVI'
];

/**
 * 从 prod 拉取最多 50 条 dyn（含公告板管理员动态 + 最新），再同步相关 user
 * @param {object} prodDb - 正式环境 database 实例（@cloudbase/node-sdk）
 * @param {object} testDb - 测试环境 database 实例
 * @returns {object} { success, dynSynced, userSynced, error? }
 */
async function syncHomeDyn(prodDb, testDb) {
  const _ = prodDb.command;

  try {
    // 1) 公告板：管理员动态最多 10 条
    let adminDyns = [];
    try {
      const adminRes = await prodDb
        .collection('dyn')
        .where({ openId: _.in(ADMIN_USER) })
        .orderBy('publicTime', 'desc')
        .limit(10)
        .get();
      adminDyns = (adminRes && adminRes.data) ? adminRes.data : [];
    } catch (e) {
      console.warn('拉取管理员动态失败，继续同步最新:', e.message);
    }

    // 2) 最新：可见动态按 publicTime 取 50 条（dynStatus 1,6 与 getSquareList 一致）
    const latestRes = await prodDb
      .collection('dyn')
      .where({ dynStatus: _.in([1, 6]) })
      .orderBy('publicTime', 'desc')
      .limit(MAX_DYN)
      .get();
    const latestDyns = (latestRes && latestRes.data) ? latestRes.data : [];

    // 3) 合并去重，以 _id 为 key，优先保留管理员动态，最多 50 条
    const byId = new Map();
    for (const d of adminDyns) {
      if (d._id) byId.set(d._id, d);
    }
    for (const d of latestDyns) {
      if (d._id && !byId.has(d._id)) byId.set(d._id, d);
      if (byId.size >= MAX_DYN) break;
    }
    const toSyncDyns = Array.from(byId.values()).slice(0, MAX_DYN);

    if (toSyncDyns.length === 0) {
      return { success: true, dynSynced: 0, userSynced: 0, message: '正式环境无符合条件的动态' };
    }

    // 4) 写入测试环境 dyn（add 保留 _id；重复则 update）
    let dynSynced = 0;
    for (const item of toSyncDyns) {
      if (!item._id) continue;
      try {
        await testDb.collection('dyn').add({ data: item });
        dynSynced++;
      } catch (err) {
        const code = err.code || '';
        const msg = (err.message || '');
        if (code === 'DATABASE_DUPLICATE_KEY' || msg.includes('duplicate') || msg.includes('already exists')) {
          try {
            await testDb.collection('dyn').where({ _id: item._id }).update({ data: item });
            dynSynced++;
          } catch (e) {
            console.error('更新 dyn 失败', item._id, e.message);
          }
        } else {
          console.error('写入 dyn 失败', item._id, msg);
        }
      }
    }

    // 5) 收集 openId，拉取 user 并写入测试环境（最多 MAX_USER）
    const openIds = [...new Set(toSyncDyns.map((d) => d.openId).filter(Boolean))].slice(0, MAX_USER);
    let userSynced = 0;
    for (const openId of openIds) {
      try {
        const userRes = await prodDb.collection('user').where({ openId }).limit(1).get();
        const users = (userRes && userRes.data) ? userRes.data : [];
        if (users.length === 0) continue;
        const u = users[0];
        if (!u._id) continue;
        try {
          await testDb.collection('user').add({ data: u });
          userSynced++;
        } catch (err) {
          const code = err.code || '';
          const msg = (err.message || '');
          if (code === 'DATABASE_DUPLICATE_KEY' || msg.includes('duplicate') || msg.includes('already exists')) {
            try {
              await testDb.collection('user').where({ _id: u._id }).update({ data: u });
              userSynced++;
            } catch (e) {
              console.error('更新 user 失败', u._id, e.message);
            }
          } else {
            console.error('写入 user 失败', u._id, msg);
          }
        }
      } catch (e) {
        console.warn('拉取 user 失败', openId, e.message);
      }
    }

    console.log(`syncHomeDyn 完成: dyn ${dynSynced}, user ${userSynced}`);
    return { success: true, dynSynced, userSynced };
  } catch (error) {
    console.error('syncHomeDyn 失败:', error);
    return { success: false, dynSynced: 0, userSynced: 0, error: error.message };
  }
}

module.exports = { syncHomeDyn };
