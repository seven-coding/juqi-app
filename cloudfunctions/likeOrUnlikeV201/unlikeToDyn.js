// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  errorCode
} = require('./errorCode');
const { userAuth } = require('./userAuth');

// 给动态点赞
async function unlikeToDyn(event) {
  try {
    const wxContext = cloud.getWXContext()
    let operator = wxContext.OPENID;
    let {
      id,
    } = event;

    const dynDetail = await db.collection('dyn').doc(id).get();
    let {
      likeNums,
      like,
      circleId,
      openId
    } = dynDetail.data;
    let to = openId;

    // 是否被拉黑确认
    let result = await userAuth(operator, to);
    if (result != 1) {
      return errorCode[`BLACKED_${result}`]
    }


    if (!like.length ||  !like.includes(operator)) {
      return errorCode.ALREADY_UN_LIKE;
    }

    let updateResult;
    if (likeNums > 0) {
      updateResult = await db.collection('dyn').doc(id).update({
        data: {
          like: _.pull(operator),
          likeNums: _.inc(-1)
        }
      });
    } else {
      updateResult = await db.collection('dyn').doc(id).update({
        data: {
          like: _.pull(operator),
        }
      });
    }

    // 撤回点赞消息
    await db.collection('messagesOther').where({
        type: 1,
        chargeType: 1,
        dynId: id, //点赞动态id
        from: operator,
        to: to,
    }).update({
      data: {
        status: 2, //撤回
      }
    });

    return {
      code: 200, 
      result: updateResult
    };
  } catch (error) {
    console.log(error)
    return errorCode.LIMIT_QUERY
  }
}

exports.unlikeToDyn = unlikeToDyn;