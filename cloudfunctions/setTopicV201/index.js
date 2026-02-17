// 设置话题
const cloud = require('wx-server-sdk')
// type：
// 1.增加话题
// 2.设置话题描述
// 3.屏蔽某条动态

cloud.init()
const db = cloud.database()
const { errorCode } = require('./errorCode');
const { getTopicAuth, hiddenInTopic, addTopic } = require('./operate');

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { type, topic, topicDesc, dynId } = event;
  let openId = event.source === 'newApp' ? event.openId : wxContext.OPENID;

  console.log(event)
  if (type === 1) {
    // 增加话题
    let result = await addTopic({
      openId,
      topic
    })
    return result;
  } else if (type === 2) {
    // 设置话题描述
    // 参数校验
    if (!topic || !topicDesc) {
      return errorCode.LIMIT_QUERY
    }
    // 权限确认
    let auth = await getTopicAuth(openId, topic);
    if (!auth) { return errorCode.NO_AUTH };

    const circleFollow = await db.collection('topics').where({
      topic
    }).update({
      data: {
        topicDesc
      }
    });

    if (circleFollow.errMsg === "collection.update:ok") {
      return {
        code: 200
      }
    } else {
      return errorCode.UPDATE_ERROR
    }
  } else if (type === 3) {
    // 权限确认
    let auth = await getTopicAuth(openId, topic);
    if (!auth) { return errorCode.NO_AUTH };
    if (!dynId) {
      return errorCode.LIMIT_QUERY
    }

    let result = await hiddenInTopic(dynId);
    return result
  }
}