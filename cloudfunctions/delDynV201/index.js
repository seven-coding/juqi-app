// 删除
// type: 1 或者不传 删除动态
// type: 2 删除评论
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const $ = db.command.aggregate;
const _ = db.command;
const {
  deleteComment
} = require('./deleteComment');
const {
  errorCode
} = require('./errorCode');
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');


// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const ownOpenId = event.source === 'newApp' ? event.openId : wxContext.OPENID;


  if (!ownOpenId) {
    return {
      code: 400,
      message: "未登录"
    }
  }

  const {
    type
  } = event;
  if (type === 2) {
    // 删除评论
    return await deleteCommentHandler(event);
  } else {
    // 删除动态
    return await deleteDynamic(event, ownOpenId);
  }
}



// 删除评论的函数
async function deleteCommentHandler(event) {
  try {
    const result = await deleteComment(event);
    return result;
  } catch (error) {
    console.error('删除评论失败：', error);
    return {
      code: 500,
      message: '删除评论失败'
    };
  }
}

// 删除动态的函数
async function deleteDynamic(event, ownOpenId) {
  try {
    const {
      id
    } = event;

    // 查询动态信息
    const {
      list
    } = await db.collection('dyn').aggregate()
      .match(_.or([{
          _id: id,
          openId: ownOpenId
        },
        {
          forwardDynId: id
        } // 添加这个条件来匹配 forwardDynId，转发该动态的id
      ]))
      .lookup({
        from: 'user',
        let: {
          openId: '$openId'
        },
        pipeline: $.pipeline()
          .match(_.expr($.eq(['$openId', '$$openId'])))
          .project({
            _id: 0,
            joinStatus: 1,
          })
          .done(),
        as: 'userInfo',
      })
      .end();

    if (!list.length) {
      return errorCode.NO_DYN;
    }
    // 找到这个动态
    let dynDetail = list.find(item => item._id === id);
    const dynOwner = dynDetail.openId;

    // 判断是本人帖子
    if (dynOwner !== ownOpenId) {
      return errorCode.NOT_OWN;
    }

    if (dynDetail.dynStatus === 2) {
      return errorCode.NO_DYN;
    }

    // 判断用户是否正常用户
    if (dynDetail.userInfo[0].joinStatus !== 1) {
      return errorCode.NOT_JOIN_USER;
    }




    // 清除缓存
    await setRedisExpire(`publish_count_${ownOpenId}`, 0);
    await setRedisExpire(id, 0);

    // 执行删除操作
    const deleteResult = await db.collection('dyn').doc(id).update({
      data: {
        isDelete: 1,
        dynStatus: 2,
        isRisk: true
      }
    });

    if (deleteResult.stats.updated === 1) {
      if (list.length > 1) {
        // 如果删除动态，则该条动态相关的转发也失效
        await db.collection('dyn').where({
          forwardDynId: id
        }).update({
          data: {
            forDynStatus: 2
          }
        });
      }
      return {
        code: 200,
        message: '删除成功'
      };
    } else {
      return {
        code: 500,
        message: '删除失败'
      };
    }
  } catch (error) {
    console.error('删除动态失败：', error);
    return {
      code: 500,
      message: '删除动态失败'
    };
  }
}