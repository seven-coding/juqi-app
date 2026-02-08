const cloud = require('wx-server-sdk')

const {
  setMessagesUser
} = require('./utils/messages')

const {
  CONFIG
} = require('./utils/config')

cloud.init({
  // API 调用都保持和云函数当前所在环境一致
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

/** 数据结构：
 *  name: authName + Info
 *  以volunteer为例：
 * {
 *    volunteerInfo:{
 *      no: 4                       // 编号
 *      status: 2                   // 状态     1: 为volunteer；2: 已被取消volunteer
 *      startTime: 1652672352479    // 开始时间
 *      endTime: 1652672395322      // 结束时间
 *    }
 * }
 */

async function setUserAuth(event) {
  let { openId, userInfo, newAuth } = event;
  let operateOpenId;
  operateOpenId = event.source === 'newApp' ? event.operateOpenId : openId;

  if(userInfo.auth == newAuth){
    // 没有权限更新，直接返回
    return {
      code: 200,
    }
  }

  // 拉取数量
  let authInfo = (await db.collection('config')
  .where({
    _id: '6d85a2b9627c1aae035a956d12ea9139'
  })
  .get()).data[0];

  let authList = Object.keys(newAuth);
  let usersUpdate = {auth: newAuth};

  for (let i = 0; i < authList.length; i++){
    let authName = authList[i];
    let oldStatus = userInfo.auth[authName];
    let newStatus = newAuth[authName];
    // 若状态没变，则跳过
    if(oldStatus == newStatus){
      continue;
    }
    let authInfoName = authName + 'Info';         // e.g. volunteerInfo key字段
    let authNumberName = authName + 'Number';     // e.g. volunteerNumber key字段
    
    // 设置权限
    if(newStatus){
      let numberToSet = authInfo[authNumberName] + 1;
      usersUpdate[authInfoName] = {
        status: 1,
        startTime: new Date().valueOf(),
        no: numberToSet
      };
      await db.collection('config').
      doc("6d85a2b9627c1aae035a956d12ea9139")
      .update({
        data: {
          [authNumberName]: numberToSet,
        }
      });
      let tagChineseName = "第" + numberToSet.toString() + "名" + authInfo.nameMap[authName];
      // 加入该用户标签库
      userInfo.tags.push(tagChineseName);
      // 将该标签设置为显示标签
      userInfo.tagOnShow = tagChineseName;

      if(authName == "verifier"){
        let message = "你已经开通「新用户验证权限」感谢你协助守护橘气安全。验证说明：\
        1、认真验证，拒绝盲充。\
        2、可疑语音，友善留言，等待管理处理。";
        
        let from = "3dfe72d65fab8647008a91d506bd1290"
        // 消息记录
        setMessagesUser({
          from,
          to: operateOpenId,
          status: 0,
          type: CONFIG.MESSAGES_USER_TYPE.SYSTEM,
          groupType: CONFIG.GROUP_TYPE.SYSTEM,
          createTime: new Date().valueOf(),
          message,
          fromName: '橘卡丘',
          fromPhoto: "https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png",
          secondName: "橘卡丘",
          secondPhoto: 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png',
          secondMes: message,
        })
      }
    } else{// 取消权限
      let tagChineseName;
      if (userInfo[authInfoName] === undefined) {
        let numberToSet = authInfo[authNumberName] + 1;
        tagChineseName = "第" + numberToSet.toString() + "名" + authInfo.nameMap[authName];
      } else {
        tagChineseName = "第" + userInfo[authInfoName].no.toString() + "名" + authInfo.nameMap[authName];
      }
      // 从该用户标签库中删除该标签
      let tagIndex = userInfo.tags.indexOf(tagChineseName);
      if (tagIndex != -1) {
        userInfo.tags.slice(tagIndex, 1);
      }
      // 若该标签为外显标签，则更换成其他标签（若有）
      if(userInfo.tagOnShow == tagChineseName){
        userInfo.tagOnShow = userInfo.tags.length ? userInfo.tags[0] : null;
      }
      usersUpdate[authInfoName] = {
        status: 2,
        endTime: new Date().valueOf()
      };
      if(authName == "verifier"){
        let message = "您已经被取消「新用户验证权限」";
        
        let from = "3dfe72d65fab8647008a91d506bd1290"
        // 消息记录
        setMessagesUser({
          from,
          to: operateOpenId,
          status: 0,
          type: CONFIG.MESSAGES_USER_TYPE.SYSTEM,
          groupType: CONFIG.GROUP_TYPE.SYSTEM,
          createTime: new Date().valueOf(),
          message,
          fromName: '橘卡丘',
          fromPhoto: "https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png",
          secondName: "橘卡丘",
          secondPhoto: 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png',
          secondMes: message,
        })
      }
    }
  }
  usersUpdate.tagOnShow = userInfo.tagOnShow;
  usersUpdate.tags = userInfo.tags;
  // 放在循环外，只拉一次库
  await db.collection('user').where({
    operateOpenId
  }).update({
    data: usersUpdate
  });

  console.log("setUserAuth successful return!");
  return {
    code: 200
  }
}

exports.setUserAuth = setUserAuth;