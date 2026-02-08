// 操作用户相关接口
// 1.拉黑用户
// 2.取消拉黑用户
// 3.管理员注销用户
// 4.管理员封禁用户
const cloud = require('wx-server-sdk')

cloud.init({
  // API 调用都保持和云函数当前所在环境一致
  env: cloud.DYNAMIC_CURRENT_ENV
})
const { blackUser } = require('./userAction/blackUser');
const { setUserLogout } = require('./userAction/setUserLogout');

const { unblackUser } = require('./userAction/unblackUser.js');
// const { dealAccount } = require('./dealAccount.js');
const { setAccountAuth } = require('./adminAction/setAccountAuth.js');
const { setVisitStatus } = require('./userAction/setVisitStatus.js');
const { setUserAuth } = require('./setUserAuth.js');
const { setUserBlack } = require('./adminAction/setUserBlack');
const { award } = require('./award');
const { setNoSeeMe } = require('./userAction/setNoSeeMe');
const { setMeNoSee } = require('./userAction/setMeNoSee');
const { setOldAccount } = require('./userAction/setOldAccount');
const { setCancelAccount } = require('./userAction/setCancelAccount');

exports.main = async (event, context) => {
  let { type } = event;
  console.log(event)

  try {
    // 用户操作接口
    if (type == 1) {
      // 拉黑用户
      result = blackUser(event);
    } else if (type == 2) {
      // 取消拉黑用户
      result = unblackUser(event);
    } else if (type == 6) {
      // 设置访问权限
      result = setVisitStatus(event);
    } else if (type == 11) {
      //用户自己注销
      result = setUserLogout(event);
    } else if (type == 14) {
      // 不看她动态
      result = setMeNoSee(event);
    } else if (type == 15) {
      // 她不看我动态
      result = setNoSeeMe(event);
    } else if (type == "setOldAccount") {
      // 认领老账号
      result = setOldAccount(event);
    } else if (type == "setCancelAccount") {
      // 认领老账号
      result = setCancelAccount(event);
    } 


    // 管理员操作接口
    if (type == 5) {
      // 设置账户状态
      result = setAccountAuth(event);
    } else if (type == 7) {
      // 设置用户权限
      result = setUserAuth(event);
    } else if (type == 12) {
      // 用户封禁增加原因
      result = setUserBlack(event);
    } else if (type == 13) {
      // 手动发放橘气币
      result = award(event);
    }
    console.log(result)
    return result;

  } catch (error) {
    console.log(error)
    return {
      code: 400,
      error
    };
  }

}