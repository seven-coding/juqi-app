// 申请置顶
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  errorCode
} = require('./errorCode');
// const {
//   CONFIG
// } = require('./CONFIG');
const $ = db.command.aggregate;

// 给动态点赞
async function getComment(dynId) {
  try {

    let comments = (await db.collection('dynComments')
      .aggregate().match({
        dynId,
        comStatus: _.neq(1)
      }).sort({
        createTime: -1
      })
      .limit(1000)
      .lookup({
        from: 'user',
        let: {
          openId: '$from'
        },
        pipeline: $.pipeline()
          .match(_.expr(
            $.eq(['$openId', '$$openId']),
          ))
          .project({
            _id: 0,
            avatarUrl: 1,
            nickName: 1,
            labels: 1,
            country: 1,
            openId: 1,
            avatarVisitUrl: 1
          })
          .done(),
        as: 'fromUser',
      })
      .lookup({
        from: 'user',
        let: {
          openId: '$to'
        },
        pipeline: $.pipeline()
          .match(_.expr(
            $.eq(['$openId', '$$openId']),
          ))
          .project({
            _id: 0,
            avatarUrl: 1,
            nickName: 1,
            labels: 1,
            country: 1,
            openId: 1,
            avatarVisitUrl: 1
          })
          .done(),
        as: 'toUser',
      })
      .end()).list;

    if (comments && comments.length) {
      // 处理二层数据
      let commentReplay = (await db.collection('dynCommentReplay')
        .aggregate().match({
          dynId,
          comStatus: _.neq(1)
        })
        .limit(1000)
        .lookup({
          from: 'user',
          localField: 'from',
          foreignField: 'openId',
          as: 'fromUser',
        }).lookup({
          from: 'user',
          localField: 'to',
          foreignField: 'openId',
          as: 'toUser',
        })
        .group({
          _id: '$commentId',
          comments: $.push('$$ROOT')
        }).end()).list;
        
        console.log(commentReplay);
        let secondComment = {};
        if (commentReplay && commentReplay.length) {
          commentReplay.map(item => {
            secondComment[item._id] = item.comments
          })

          comments.map(item => {
            if (secondComment[item._id]) {
              item.comments = secondComment[item._id];
            }
          })
        }
    }
    
    return comments;
  } catch (error) {
    console.log(error)
    // return errorCode.LIMIT_QUERY
  }
}

exports.getComment = getComment;