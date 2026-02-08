// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  errorCode
} = require('./errorCode');
const {
  CONFIG
} = require('./config');
const {setMessagesUser} = require('./messages')
const { userAuth } = require('./userAuth');

// 给动态点赞
async function likeToCom(event) {
  try {
    const wxContext = cloud.getWXContext()
    let operator = wxContext.OPENID;

    let {
      id,
      firstIndex,
      secondIndex,
      commentId,
      mock,
      mockOpenId,
    } = event;

    if ((operator == "oynAL47bUUoXW4yiVY3lTD1IVoVI" || operator == "oynAL4yTQzRWGZSU_2hCoiqdjIOk" || operator == "oynAL49peD3l21EFBdor_je9isXQ") && mock) {
      operator = mockOpenId;
    }

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
      commentContent,
      imagePath,
    } = commentDetail;

    // 如果用户非正常用户，不可点赞
    let { joinStatus, realEnterTime } = (await db.collection('user').where({ openId: operator }).get()).data[0];
    if (joinStatus !== 1) {
      return errorCode.NO_AUTH
    }

    // 是否被拉黑确认
    let result = await userAuth(operator, from);
    if (result != 1) {
      return errorCode[`BLACKED_${result}`]
    }

    if (like && like.length && like.includes(operator)) {
      return errorCode.ALREADY_LIKE;
    }
    // // 是否评论已经删除
    if (comStatus === 1) {
      return errorCode.ALREADY_DELETE;
    }

    // 消息记录
    let messageId;
    if (operator !== from) {
        let fromUserInfo = (await db.collection("user").where({openId: operator}).get()).data[0];

        messageId = await setMessagesUser({
          from: operator,
          to: from,
          status: 0,
          type: CONFIG.MESSAGES_USER_TYPE.LIKE_COMMENT,
          groupType: CONFIG.GROUP_TYPE.LIKE_COMMENT,
          createTime: new Date().valueOf(),
          redirecTo: `/pages/juqi/dynDetail/index?id=${id}`,
          fromName: "评论点赞",
          firstIndex,
          secondIndex,
          commentId,
          commentContent,
          imagePath,
          dynId: id,
          firstName: '评论点赞',
          firstPhoto: 'https://7072-prod-juqi-7glu2m8qfa31e13f-1314478640.tcb.qcloud.la/guanfang/4.png',

          secondName: fromUserInfo.nickName,
          secondPhoto: fromUserInfo.avatarVisitUrl || fromUserInfo.avatarUrl,
          secondMes: `${fromUserInfo.nickName} 点赞了你的评论`,
        });
    }

    let updateResult;
    if (secondIndex || secondIndex == 0) {
      updateResult = await db.collection('dynCommentReplay').doc(commentId).update({
        data: {
          like: _.push(operator),
          likeNums: _.inc(1),
          likeMesId: _.set({
            [operator]: messageId,
          })
        }
      });
    } else if (firstIndex || firstIndex == 0) {
      updateResult = await db.collection('dynComments').doc(commentId).update({
        data: {
          like: _.push(operator),
          likeNums: _.inc(1),
          likeMesId: _.set({
            [operator]: messageId,
          })
        }
      });
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

exports.likeToCom = likeToCom;