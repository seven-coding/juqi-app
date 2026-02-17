// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const {getUserInfo} = require("./utils/userInfo")

// 获取用户权限
// 获取用户权限，三种权限分别为：admin\manageer\owner
async function getUserAdminAuth(openId, circleId) {
  let auth = (await db.collection('user').where({
    openId
  }).get()).data[0].auth;
  // 管理员

  // 如果存在圈子Id
  let isOwner = false, isManage = false;
  if (circleId) {
    const result = await db.collection('circle').doc(circleId).get();
    let {
      data
    } = result;
    let {
      owner,
      manager
    } = data;
    if ((owner && owner.includes(openId))) {
      isOwner = true
    }
    if ((manager && manager.includes(openId))) {
      isManage = false
    }
  }
  return Object.assign(auth , {
    isOwner,
    isManage
  })
}

// 获取用户权限
async function getUserAuth(openId) {
  let userInfo = await getUserInfo(openId)
  // 管理员

  return userInfo.auth
}



exports.getUserAdminAuth = getUserAdminAuth;
exports.getUserAuth = getUserAuth;