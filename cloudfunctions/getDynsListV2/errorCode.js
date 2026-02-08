// 工具函数
exports.errorCode = {
  NO_AUTH: {
    code: 400,
    messge: "无权限"
  },
  LIMIT_QUERY: {
    code: 400,
    messge: "缺少参数"
  },
  EXE_ERROR: {
    code: 400,
    messge: "执行错误,请截图反馈到橘气家长群"
  },
  APPLY_ERROR: {
    code: 400,
    messge: "申请失败"
  },
  HAS_TOPIC: {
    code: 400,
    messge: "话题已存在"
  },
  NO_CIRCLE_OWNER: {
    code: 400,
    messge: "还没有橘长"
  },
  NO_FOLLOW: {
    code: 200,
    dynList: [],
  }
};