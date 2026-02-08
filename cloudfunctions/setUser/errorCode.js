// 工具函数
exports.errorCode = {
  LIMIT_QUERY: {
    code: 400,
    messge: "缺少参数"
  },
  UPDATE_ERROR: {
    code: 400,
    messge: "拉黑失败，请重试"
  },
  BLACK_SUCCESS: {
    code: 200,
    messge: "拉黑成功"
  },
  UNBLACK_SUCCESS: {
    code: 200,
    messge: "取消拉黑成功"
  },
  NO_BALCK: {
    code: 200,
    messge: "还没有拉黑"
  },
  NO_AUTH: {
    code: 400,
    messge: "无权限"
  },
  ALREADY_BLACK: {
    code: 400,
    message: "你已经拉黑"
  },
  ALREADY_UNBLACK: {
    code: 400,
    message: "你已经取消拉黑"
  },
  NOT_VIP: {
    code: 400,
    message: "抱歉，您还不会会员"
  },
  HAS_RECORD: {
    code: 400,
    message: "已经设置啦"
  },
  HAS_BIND: {
    code: 400,
    message: "账号已被绑定，如被冒认请直接在了解橘气中联系客服"
  },
  HAS_NO_BIND: {
    code: 400,
    message: "账号未被绑定"
  },
  YOU_HAS_BIND: {
    code: 400,
    message: "你已经绑定账号，如认领错账号请在了解橘气中联系客服"
  },
  YOU_HAS_NO_BIND: {
    code: 400,
    message: "你还没有绑定该账号，无法取消绑定"
  },
  NO_JUQI_COIN: {
    code: 403,
    message: "你的账号缺少1个橘气币哦"
  }
};