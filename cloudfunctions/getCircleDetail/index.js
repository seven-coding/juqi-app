// 查询圈子详情信息
// type: 默认不传
// 'tag': 查询圈子tag
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const {
  errorCode
} = require('./errorCode')
const $ = db.command.aggregate;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  let openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;
  const _ = db.command;
  let circleId = event.id;
  let { updateLog } = event;

  try {
    if (!circleId) {
      return errorCode.LIMIT_QUERY
    }

    // 获取圈子信息
    let result = (await cloud.callFunction({
      // 要调用的云函数名称
      name: 'commonRequest',
      // 传递给云函数的event参数
      data: {
        method: "get_circle_info",
        circleId
      }
    })).result;
    
    let data = result;
    // 获取最近关注的5名用户
    let follow = data.follow ? data.follow : [];
    // let followUser, followUserInfo;
    // if (follow && follow.length) {
    //   followUser = follow.length > 5 ? follow.slice(-5) : follow;
    //   followUserInfo = await db.collection('user').where({
    //     openId: _.in(followUser)
    //   }).get();
    // }

    // 获取最后五个关注的人
    let followUserInfo = (await db.collection('circle_follow').aggregate()
      .match({
        circleId,
        status: 1
      })
      .sort({
        create_time: 1,
      })
      .limit(5)
      .lookup({
        from: 'user',
        let: {
          openId: '$openId'
        },
        pipeline: $.pipeline()
          .match(_.expr(
            $.eq(['$openId', '$$openId']),
          ))
          .project({
            avatarUrl: 1,
          })
          .done(),
        as: 'user',
      })
      .replaceRoot({
        newRoot: $.mergeObjects([$.arrayElemAt(['$user', 0]), '$$ROOT'])
      })
      .project({
        avatarUrl: 1
      })
      .end()).list;
      console.log(followUserInfo);

    // 用户加入圈子状态
    let followInfo =  (await db.collection('circle_follow').where({
      circleId,
      openId
    }).get()).data;
    // 圈子关注状态
    let followStatus = followInfo && followInfo.length ? followInfo[0].status : 0;

    // 获取更新日志
    let updateInfo;
    if (updateLog) {
      updateInfo = ((await db.collection('log_admin').aggregate().match({
        "newInfo.circleId": circleId,
        type: 1
      }).sort({
        createTime: -1
      }).limit(1).lookup({
        from: 'user',
        localField: 'openId',
        foreignField: 'openId',
        as: 'user',
      }).end()).list)
      updateInfo = updateInfo&& updateInfo.length ? updateInfo[0] : {}
    }

    return {
      code: 200,
      openId,
      data,
      follow: !!followStatus,
      followStatus, // 用户加入圈子状态 0 未加入 1 申请中 2 已加入
      followUserInfo: followUserInfo,
      updateInfo
    };
  } catch (error) {
    return {
      error,
      code: 400,
      message: ''
    }
  }
}


async function get_last_5_Follow_list(){

}