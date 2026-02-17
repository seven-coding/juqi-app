// 工具函数


exports.errorCode = {
  NO_CONTENT: {
    code: 400,
    message: '没有发布内容哦～'
  },
  NO_CIRCLE_AUTH: {
    code: 400,
    message: '该电站需要加入才可发布哦～'
  },
  NO_AUTH: {
    code: 400,
    message: '无发布权限哦～'
  },
  OVER_LENGTH: {
    code: 400,
    message: '文字不能超过3000字哦～'
  },
  HAS_SEND: {
    code: 400,
    message: '已经发过语音帖了～'
  },
  VOICE_ERRROR: {
    code: 400,
    message: "声音文件上传被打断，请重新上传"
  },
  BE_BLACKED: {
    code: 409,
    message: "您已被对方拉黑"
  },
  NO_AUTH_CONTENT: {
    code: 400,
    message: "抱歉，微信审核当前文字部分有敏感内容，无法发布"
  },
  NO_FORWARD: {
    code: 400,
    message: "暂时不允许转发哦"
  }, 
  SEND_FAIL: {
    code: 400,
    message: "发布失败"
  }
};