// 转发帖子后评论
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;

// 添加消息
async function forwardComment(data) {
  let createTime = new Date().valueOf();
  let dyns;

  let {
    dynId, //动态Id
    to, //回复的人
    from,
    commentContent, //评论文字部分
    type,
    ait, //艾特用户
  } = data;

  // 评论或者回复他人评论发送消息
  let messageId;
  if (to !== from) {
    let result = await db.collection('messagesOther').add({
      data: {
        type: 2,
        from,
        to,
        status: 0, //代表提示，1代表不提示
        commentContent,
        dynId, //动态Id
        createTime,
      }
    });
    messageId = result._id;
  }

  // 第一层回复
  let newComment = await db.collection('dynComments').add({
    data: {
      dynId,
      openId: from,
      from,
      to,
      createTime,
      addMesId: messageId,
      ait,
      commentContent,
      forwradStatus: true //转发评论状态
    }
  });

   // 如果艾特了用户，发送艾特信息，艾特消息可能是文字，可能是图片，可能无内容
   if (ait && ait.length) {
    ait.map(async item => {
      await sendAitMessage({
        dynId: id,
        from: openId,
        to: item.openId,
        commentContent,
        // imagePath,
        ait
      })
    })
  }

  // 一条新的回复
  dyns = await db.collection('dyn').doc(dynId).update({
    data: {
      commentNums: _.inc(1)
    }
  });

  return dyns;

}


exports.forwardComment = forwardComment;