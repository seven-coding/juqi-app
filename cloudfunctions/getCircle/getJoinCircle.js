// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command;
const {
  getCircles
} = require('./getCircles')
const {
  getRedisValue,
  setRedisValue,
  setRedisExpire
} = require('./redis');


// 添加消息
async function getJoinCircle(data) {
  // 获取用户已加入的圈子
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  let userJoinList = await getUserJoinCircles(openId);
  // userJoinList = userJoinList.map(item => {
  //   return item.circleId;
  // })
  console.log(userJoinList);

  if (userJoinList.length) {

    let circleList = (await getCircles()).data;

    userJoinList.map((item, index) => {
        let circleId = item.circleId;
        let detail = circleList.find(one => {
          return one._id == circleId
        })
        userJoinList[index] = Object.assign(item, detail);

        console.log(userJoinList);
    })

    return {
      code: 200,
      data: userJoinList
    }
    
  } else {
    return {
      code: 400,
      message: "还没有加入列表"
    }
  }
}

// 添加消息
async function getUserJoinCircles(openId) {

  let REDIS_KEY = `${openId}_join_circle_list`;
  let USER_JOIN_REDIS = await getRedisValue(REDIS_KEY);

  if (USER_JOIN_REDIS) {
    console.log('命中加入圈子缓存');

    USER_JOIN_REDIS = JSON.parse(USER_JOIN_REDIS);
    return USER_JOIN_REDIS;
  } else {

    let joinCircles = (await db.collection('circle_follow')
      .aggregate()
      .match({
        openId
      })
      .sort({
        createTime: 1
      })
      .project({
        circleId: 1,
        createTime: 1
      })
      .end()).list;

    await setRedisValue(REDIS_KEY, JSON.stringify(joinCircles))
    await setRedisExpire(REDIS_KEY, 60 * 60 * 24 * 7)

    return joinCircles;
  }
}



exports.getJoinCircle = getJoinCircle;