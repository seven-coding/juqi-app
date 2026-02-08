// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  errorCode
} = require('./errorCode');
const { userAuth } = require('./userAuth');
const { verifyUser } = require('./verifyUser');
const { updateUserInfo } = require('./utils/userInfo');

// 给动态点赞
async function likeToDyn(event) {
  try {
    let operator = event.openId;
    if (!operator) {
      const wxContext = cloud.getWXContext()
      operator = wxContext.OPENID;
    }

    let { id } = event;

    const dynDetail = await db.collection('dyn').doc(id).get();
    let {
      likeNums,
      like,
      circleId,
      openId,
      verifyStatus,
      isDelete,
      riskControlLevel
    } = dynDetail.data;
    let to = openId;


    // 被删除或者被风控，不可操作
    if (isDelete == 1) {
      return errorCode.DELETE;
    }

    if (riskControlLevel == 4 || riskControlLevel == 3) {
      return errorCode.RISK;
    }

    // 被拉黑不可点赞
    if (operator != openId) {
      let result = await userAuth(operator, to);
      if (result != 1) {
        return errorCode[`BLACKED_${result}`]
      }
    }
   

    // 已经点过赞不做任何处理
    if (like && like.length && like.includes(operator)) {
      return errorCode.ALREADY_LIKE;
    }

    // 更新点赞数量和点赞人
    let updateResult = await updateLikeNums(id, operator);

    // 查看消息列表中是否已经对动态点过赞，如未点过赞，则进行电量增加
    const ifHasLikeResult = await db.collection('messagesOther').where({
      type: 1,
      chargeType: 1,
      dynId: id, //点赞动态id
      from: operator,
      to,
    }).get();


    // 非第一次点赞 点赞+1，消息推送
    if (!(ifHasLikeResult.data && ifHasLikeResult.data.length)) {
      if (operator !== to) {
        // 非本人点赞+1
        likeNums = likeNums + 1;
        // 圈子电量+1
        await updateCircleChargeNums(circleId, 1);
        // 更新用户电量
        await updateUserInfo(to, {
          chargeNums: _.inc(1)
        })

        // 增加被点赞消息
        await db.collection('messagesOther').add({
          data: {
            type: 1,
            chargeType: 1,
            dynId: id, //点赞动态id
            from: operator,
            to: to,
            status: 0, //代表提示，1代表不提示
            createTime: new Date().valueOf()
          }
        });
      }
    }

    if (verifyStatus == 1 && likeNums >= 1) {
      console.log("超过2个验证数")
      // 如果为待验证帖子且点赞数 >=2
      await verifyUser(id, dynDetail.data)
    }


    return {
      code: 200,
      result: updateResult
    };
  } catch (error) {
    console.log(error)
    return errorCode.LIMIT_QUERY
  }
}

// 更新点赞数量和点赞人
async function updateLikeNums(id, operator) {
  let updateResult = await db.collection('dyn').doc(id).update({
    data: {
      like: _.addToSet(operator),
      likeNums: _.inc(1)
    }
  });
  return updateResult;
}

// 更新圈子电量
async function updateCircleChargeNums(circleId, nums){
  await db.collection('circle').doc(circleId).update({
    data: {
      chargeNums: _.inc(nums)
    }
  });
}

exports.likeToDyn = likeToDyn;


