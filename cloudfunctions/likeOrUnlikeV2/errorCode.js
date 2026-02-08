// 工具函数
exports.errorCode = {
  LIMIT_QUERY: {
    code: 400,
    messge: "缺少参数"
  },
  ALREADY_LIKE: {
    code: 201,
    message: '已经点赞啦～'
  },
  ALREADY_UN_LIKE: {
    code: 201,
    message: '已经取消点赞啦～'
  },
  ALREADY_DELETE: {
    code: 201,
    message: '已经删除啦～'
  },
  BE_BLACKED: {
    code: 409,
    message: "暂时没有权限哦～"
  },
  NO_AUTH: {
    code: 400,
    message: "验证未通过，没有权限"
  },
  DELETE: {
    code: 400,
    message: "帖子已被删除"
  },
  RISK: {
    code: 400,
    message: "帖子已被风控"
  },
  BLACKED_4: {
    code: 409,
    message: "你们已互相拉黑对方"
  },
  BLACKED_3: {
    code: 409,
    message: "您已拉黑对方"
  },
  BLACKED_2: {
    code: 409,
    message: "您已被对方拉黑"
  },

};