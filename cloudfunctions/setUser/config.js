// 工具函数


exports.CONFIG = {
  LOGS_ADMIN: {
    SET_CIRLCE: 1, //    1. 设置圈子信息
    SET_MANAGE: 2, //2. 设置管理员
    CANCEL_MANAGE: 3, //3. 取消管理员
    QUIT_MANAGE: 4, //4. 踢出圈子成员
    ADD_BEST: 5, //5. 加精
    CANCEL_BEST: 6, //6. 取消加精
    HIDDEN: 7, //7. 电站屏蔽
    CANCEL_HIDDEN: 8, //8. 取消屏蔽电站
    SET_RISK: 9, //9. 风控
    SET_TOP: 10, //置顶
    CANCEL_TOP: 11, //取消置顶
    CHANGE_CIRCLE: 12, //修改所属电站
    USER_SET_TOP:13,//用户主页置顶
    // USER_CANCEL_TOP:14,//用户取消主页置顶
    // SET_PRIVACY:15,//用户设置帖子为隐私
    // SET_PRIVACY_CANCEL:16,//用户设置帖子为公开
    AWARD:17, //官方发活动奖励

    SET_USER_BLACK: 19,
    SET_USER_STATUS: 20,

  },
  LOG_USER_ACTION: {
    LOGOUT: 1
  },
  SHOP_LOG_COIN_TYPE: {
    RMB: 1,
    JUQI_COIN: 2
  },
  MESSAGES_USER_TYPE: {
    SET_CIRLCE: 1, //    1. 设置圈子信息
    SET_MANAGE: 2, //2. 设置管理员
    CANCEL_MANAGE: 3, //3. 取消管理员
    QUIT_MANAGE: 4, //4. 踢出圈子成员
    ADD_BEST: 5, //5. 加精
    CANCEL_BEST: 6, //6. 取消加精
    HIDDEN: 7, //7. 电站屏蔽
    CANCEL_HIDDEN: 8, //8. 取消屏蔽电站
    SET_RISK: 9, //9. 风控
    SET_TOP: 10, //置顶
    CANCEL_TOP: 11, //取消置顶
    JOIN_CIRCLE: 12, //. 加入圈子成功
    REJECT_JOIN_CIRCLE: 13, //. 拒绝圈子成功
    APPLY_CIRCLE_SUCCESS: 14, //.动态投稿成功
    APPLY_CIRCLE_ERROR: 15,// .动态审核失败
    FOLLOW: 16,//关注
    UNFOLLOW: 17, //取消关注
    SYSTEM: 18, //系统消息
    LIKE_COMMENT: 19
  },
  GROUP_TYPE: {
    SYSTEM: 0,
    FOLLOW_TYPE: 1, //关注or取消关注
    LIKE_COMMENT: 2
  },
};