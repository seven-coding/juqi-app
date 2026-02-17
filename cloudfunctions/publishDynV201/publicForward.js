// 发布转发帖子（使用 env.getDb 按 dataEnv 写库）
const cloud = require('wx-server-sdk');
const { getDb } = require('./env');
const {
  errorCode
} = require('./errorCode')
const {
  userAuth
} = require('./userAuth')

const {
  forwardComment
} = require('./forwardComment')
const {
  publicDyn,
  getPublicAuth
} = require('./operate')
const {
  setDynsInfo,
} = require('./utils/dyns')
// 添加消息
async function publicForward(event, circleInfo, openId) {
  const db = getDb();
  const _ = db.command;
  const $ = db.command.aggregate;

  let {
    dynContent,
    circleId,
    circleTitle,
    ait, //艾特人的openId list
    forwardDynId, //转发动态Id 
    dynType, //转发类型必填
    ifForComment, //是否转发并评论
  } = event;
  
  let forwardInfo = (await db.collection('dyn').aggregate()
  .match({
    _id: forwardDynId
  })
  .project({
    openId: 1,
    dynContent: 1,
    imagePath: 1,
    musicId: 1,
    imageList: 1,
    musicName: 1,
    musicPoster: 1,
    musicSrc: 1,
  })
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
        _id: 0,
        avatarUrl: 1,
        nickName: 1,
        labels: 1,
        country: 1,
        openId: 1,
        avatarVisitUrl: 1,
      })
      .done(),
    as: 'userInfo',
  })
  .end()).list[0];

  // 被拉黑不可点赞
  let blackResult = await userAuth(openId, forwardInfo.openId);
  if (!blackResult) {
    return errorCode.BE_BLACKED
  }

  // 获取发布圈子权限
  let publicAuth = await getPublicAuth(circleId, openId, circleInfo);
  if (!publicAuth) {
    return errorCode.NO_CIRCLE_AUTH
  }


  let result = await publicDyn({
    dynContent,
    forwardDynId,
    forwardDynStatus: 1, //转发动态状态 2 删除状态
    forwardInfo,
    openId: openId,
    createTime: db.serverDate(), //发布时间
    isDelete: 0, //是否删除
    likeNums: 0,
    commentNums: 0,
    circleId,
    circleTitle,
    dynStatus: 1,
    ait,
    dynType, //dynType: 为2时表示转发类型
    publicTime: new Date().valueOf(),
    userTopTime:0
  }, circleInfo)

   // 如果艾特了用户，发送艾特信息
   if (ait && ait.length) {
    ait.map(async item => {
      await sendAitMessage({
        dynId: _id,
        from: openId,
        to: item.openId
      })
    })
  }

  await setDynsInfo(forwardInfo._id, {
    forwardNums: _.inc(1)
  })

  // 转发并评论
  if (ifForComment) {
    await forwardComment({
      from: openId,
      to: forwardInfo.openId,
      dynId: forwardDynId,
      commentContent: dynContent,
      ait,
    })
  }

  return result
}


exports.publicForward = publicForward;