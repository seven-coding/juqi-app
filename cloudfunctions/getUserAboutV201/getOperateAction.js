// 获取操作关系（type=7）：关注状态、拉黑状态、是否不可见
// 注意：测试环境必须部署本目录（JUQI-APP/cloudfunctions/getUserAbout），勿部署小程序侧同名文件（其 getOperateAction 存在 userInfo 未定义会报 500）
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

// 不看对方：noSeeHer=我设置的不看她, herNoSee=她设置的不让我看
async function getNoSeeShip(openId, otherOpenId) {
  try {
    const noSeeRecord = (await db.collection('user_no_see').where(
      _.or([
        { openId, noSeeId: otherOpenId, type: 1 },
        { openId: otherOpenId, noSeeId: openId, type: 2 }
      ])
    ).get()).data;

    if (!noSeeRecord.length) {
      return [0, 0];
    }
    let noSeeHer = 0;
    let herNoSee = 0;
    noSeeRecord.forEach(item => {
      if (item.type === 1) noSeeHer = 1;
      else herNoSee = 1;
    });
    return [noSeeHer, herNoSee];
  } catch (error) {
    console.log('[getNoSeeShip] error:', error);
    return [0, 0];
  }
}

async function getOperateAction(event, openId) {
  const otherOpenId = event.AnyOpenId;
  if (!otherOpenId) {
    return { code: 400, message: '缺少目标用户ID' };
  }

  // 关注状态：1 未关注 2 已关注 3 回关 4 互相关注
  const iFollowHim = await db.collection('user_followee')
    .where({ openId, followeeId: otherOpenId, status: 1 })
    .get();
  const heFollowsMe = await db.collection('user_followee')
    .where({ openId: otherOpenId, followeeId: openId, status: 1 })
    .get();

  let followStatus = 1;
  if (iFollowHim.data.length > 0 && heFollowsMe.data.length > 0) {
    followStatus = 4;
  } else if (heFollowsMe.data.length > 0) {
    followStatus = 3;
  } else if (iFollowHim.data.length > 0) {
    followStatus = 2;
  }

  // 拉黑状态：1 正常 2 已拉黑（我拉黑对方或对方拉黑我）
  const iBlackHim = await db.collection('user_black')
    .where({ openId, blackId: otherOpenId })
    .count();
  const heBlackMe = await db.collection('user_black')
    .where({ openId: otherOpenId, blackId: openId })
    .count();
  const blackStatus = (iBlackHim.total > 0 || heBlackMe.total > 0) ? 2 : 1;

  const [noSeeHer, herNoSee] = await getNoSeeShip(openId, otherOpenId);
  const isInvisible = herNoSee === 1; // 对方设置「不让我看」

  return {
    code: 200,
    followStatus,
    blackStatus,
    isInvisible: !!isInvisible
  };
}

exports.getOperateAction = getOperateAction;
