/**
 * 动态可见状态 dynStatus 取值含义（与小程序统一，两端一致）
 * 用于发布、查询时的条件与注释参考。
 *
 * 1 - 全部可见：普通电站帖，首页/个人主页/电站内均可见
 * 2 - 仅圈子内可见：树洞/私密电站帖，仅在该电站列表内可见，不出首页与个人主页
 * 3 - 仅主页可见
 * 4 - 仅自己可见
 * 5 - 仅圈子可见（如新人区审核中等）
 * 6 - 仅圈子不可见
 * 7 - 仅首页不可见
 * 8 - 仅话题可见
 * 9 - 仅粉丝可见等
 *
 * 树洞电站：发布写 2（sendSecretDyns），查询按 circle.circleDynStatus（树洞为 2）。
 */
const DYN_STATUS = {
  VISIBLE_ALL: 1,
  CIRCLE_ONLY: 2,   // 树洞/私密电站
  HOME_ONLY: 3,
  SELF_ONLY: 4,
  CIRCLE_VISIBLE: 5,
  CIRCLE_HIDDEN: 6,
  SQUARE_HIDDEN: 7,
  TOPIC_ONLY: 8,
  FANS_ONLY: 9,
};
module.exports = { DYN_STATUS };
