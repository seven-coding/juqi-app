// 工具函数
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const {
  errorCode
} = require('./errorCode')
const _ = db.command;

// 获取用户权限
async function getTopicAuth(openId, topic) {
   // 获取圈子信息
   let userInfo = (await cloud.callFunction({
    // 要调用的云函数名称
    name: 'commonRequest',
    // 传递给云函数的event参数
    data: {
      method: "get_user_info",
      openId
    }
  })).result;

  let {auth} = userInfo;
  let hasAuth = auth && (auth.admin || auth.superAdmin );
  
  if (hasAuth) {
    return true
  } else {
    const {
      data
    } = (await db.collection('topics').where({
      topic,
    }).get());

    if ((topic.openId === openId)) {
      return 'topicOwner'
    } else {
      return false
    }
  } 
}

// 屏蔽话题
async function hiddenInTopic(dynId) {
  try {
    const wxContext = cloud.getWXContext()
    const operator = wxContext.OPENID

    // 动态屏蔽
    let updateResult = await db.collection('dyn').doc(dynId).update({
      data: {
        hiddenStatus: 1,
        dynStatus: 2
      }
    });

    if (updateResult.errMsg && updateResult.errMsg === 'document.update:ok') {
      await db.collection('log_admin').add({
        data: {
          openId: operator,
          dynId,
          createTime: new Date().valueOf(),
          type: 13
        }
      })

      return {
        code: 200
      }
    } else {
      console.log('设置失败，请重试', updateResult);
      return {
        code: 400,
        message: '设置失败，请重试'
      }
    }

  } catch (error) {
    console.log(error)
    return {
      code: 400,
      error
    }
  }
}

async function addTopic(data) {
  let { openId, topic } = data;
  try {
    if (!topic) {
      return errorCode.LIMIT_QUERY
    }

    let hasTopic = (await db.collection('topics').where({
      topic
    }).get()).data;

    if (hasTopic && hasTopic.length) {
      return errorCode.HAS_TOPIC
    }

    let authResult = await cloud.openapi.security.msgSecCheck({
      content: topic
    });

    if (authResult.errCode !== 0) {
      return {
        code: 400,
        message: "抱歉，微信审核当前话题文字部分有敏感内容，无法发布	"
      }
    }



    let result = await db.collection('topics').add({
      data: {
        openId,
        topic,
        createTime: new Date().valueOf(),
        joinCounts: 0
      }
    })

    if (result.errMsg == "collection.add:ok") {
      return {
        code: 200
      }
    }

  } catch (error) {

    if (error && error.errCode && error.errCode !== 0) {
      return {
        code: 400,
        message: "抱歉，微信审核当前话题文字部分有敏感内容，无法发布"
      }
    }

    return {
      code: 400,
      error
    }
  }
}


exports.getTopicAuth = getTopicAuth;
exports.hiddenInTopic = hiddenInTopic;
exports.addTopic = addTopic;