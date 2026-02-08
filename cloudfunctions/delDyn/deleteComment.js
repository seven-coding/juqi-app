// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
// const {
//   CONFIG
// } = require('./config')
const {
  errorCode
} = require('./errorCode');

// 删除评论
async function deleteComment(event) {
  try {
    let {
      id,
      type,
      firstIndex,
      secondIndex,
      commentId
    } = event;

    // let dynDetail = await db.collection('dyn').doc(id).get();
    // let comments = dynDetail.data.comments;
    // let commentDetail = secondIndex || secondIndex == 0 ? comments[firstIndex].comments[secondIndex] : comments[firstIndex];
    // let { from, openId } = commentDetail; 
    // let owner =  from || openId; //兼容早期代码，早期comment第一层只存了openId,后来为form,to


    if (secondIndex || secondIndex == 0) {
      // 删除第二层
      let commentDetail = (await db.collection('dynCommentReplay').doc(commentId).get()).data;
      let { from, dynId } = commentDetail;
      // if (operator !== from) {
      //   // 非本人的评论
      //   return errorCode.NOT_OWN;
      // }


      let updateResult = await db.collection('dynCommentReplay').doc(commentId).update({
        data: {
          comStatus: 1,
        }
      });
      
      // 修改评论数量
      await db.collection('dyn').doc(dynId).update({
        data: {
          commentNums: _.inc(-1)
        }
      });

      // 撤回评论消息
      let messageId = commentDetail.addMesId;
      if (messageId) {
        await db.collection('messagesOther').doc(messageId).update({
          data: {
            status: 2
          }
        })
      }
      return {
        code: 200,
        data: updateResult
      }

    } else {
      // 删除第一层

      let commentDetail = (await db.collection('dynComments').doc(commentId).get()).data;
      let { from, dynId } = commentDetail;
      // if (operator !== from) {
      //   // 非本人的评论
      //   return errorCode.NOT_OWN;
      // }

      await db.collection('dyn').doc(id).update({
        data: {
          ['comments.' + [firstIndex] + '.comStatus']: 1
        }
      });

      // 修改评论数量
      await db.collection('dyn').doc(dynId).update({
        data: {
          commentNums: _.inc(-1)
        }
      });

      let updateResult = await db.collection('dynComments').doc(commentId).update({
        data: {
          comStatus: 1,
        }
      });

      // 撤回评论消息
      let messageId = commentDetail.addMesId;
      if (messageId) {
        await db.collection('messagesOther').doc(messageId).update({
          data: {
            status: 2
          }
        })
      }

      return { code: 200 }

    }


  } catch (error) {
    console.log(event, error);
    return {
      error,
      code: 400,
      message: '网络请求失败，请重试'
    }
  }
}

exports.deleteComment = deleteComment;