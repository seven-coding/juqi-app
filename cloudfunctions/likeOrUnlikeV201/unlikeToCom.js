// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  errorCode
} = require('./errorCode');
const {
  resetMessagesUser
} = require('./messages');
const {
  CONFIG
} = require('./config');
const { userAuth } = require('./userAuth');

// 给评论取消点赞
async function unlikeToCom(event) {
  try {
    const wxContext = cloud.getWXContext()
    let operator = wxContext.OPENID;

    let {
      id,
      to,
      firstIndex = 0,
      secondIndex,
      commentId
    } = event;

    let commentDetail;
    if (secondIndex || secondIndex == 0) {
      // 点赞二层评论
      commentDetail = (await db.collection('dynCommentReplay').doc(commentId).get()).data;
    } else if (firstIndex || firstIndex == 0) {
      // 点赞一层评论
      commentDetail = (await db.collection('dynComments').doc(commentId).get()).data;
    }

    let {
      like,
      comStatus,
      from,
      likeMesId
    } = commentDetail;

    // 是否被拉黑确认
    let result = await userAuth(operator, from);
    if (result != 1) {
      return errorCode[`BLACKED_${result}`]
    }


    if (!like || !like.length || !like.includes(operator)) {
      return errorCode.ALREADY_UN_LIKE;
    }
    // // 是否评论已经删除
    if (comStatus === 1) {
      return errorCode.ALREADY_DELETE;
    }
  
    let messageId = likeMesId[operator];
    await resetMessagesUser({
      messageId: messageId,
      to: from, //评论点赞消息回退
      type: CONFIG.MESSAGES_USER_TYPE.LIKE_COMMENT,
      groupType: CONFIG.GROUP_TYPE.LIKE_COMMENT,
    });

    let updateResult;
    if (secondIndex || secondIndex == 0) {
      updateResult = await db.collection('dynCommentReplay').doc(commentId).update({
        data: {
          like: _.pull(operator),
          likeNums: _.inc(-1),
        }
      });
    } else if (firstIndex || firstIndex == 0) {
      // 更新点赞数量
      updateResult = await db.collection('dynComments').doc(commentId).update({
        data: {
          like: _.pull(operator),
          likeNums: _.inc(-1),
        }
      })
    }

    return {
      code: 200,
      data: updateResult
    };

  } catch (error) {
    console.log(error)
    return errorCode.LIMIT_QUERY
  }
}

exports.unlikeToCom = unlikeToCom;