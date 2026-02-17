# 消息库 messagesUser、messagesOther 复合索引说明

## 目的

消息二级页（会话/关注/充电/评论/访客/艾特/卡片/电站/点赞评论等）查询 `messagesUser`、`messagesOther` 时依赖 `to`、`groupType`/`type`、`status`、`createTime` 等条件与排序。数据量大时易超时，需在**生产环境**与测试环境建立复合索引以加速。

## messagesUser 推荐索引

- **集合**：`messagesUser`
- **索引字段**（顺序）：`to`（升序）、`groupType`（升序）、`createTime`（降序）
- **可选**（若查询常带 status）：`to`（升序）、`groupType`（升序）、`status`（升序）、`createTime`（降序）
- **说明**：与 getCommonMes、getFollowMessage、getCardsMessage、getCirclesMessage、getCommentLike 的 match + sort 一致。

## messagesOther 推荐索引

- **集合**：`messagesOther`
- **索引 1（通用）**：`to`（升序）、`type`（升序）、`status`（升序）、`createTime`（降序）
  - 用于：getNotReadCount 各类 count、getChargeMessage、getCommentMessage、getVisitMessage 等
- **索引 2（艾特）**：`to`（升序）、`type`（升序）、`aitType`（升序）、`status`（升序）、`createTime`（降序）
  - 用于：getAitMes 按 aitType 查询

## 操作方式

在云开发控制台 → 数据库 → 对应环境 → 集合 `messagesUser` / `messagesOther` → 索引管理 中创建上述复合索引；或通过云开发 API 创建。创建后无需改代码，查询会自动走索引。

## 与 messagesType 索引的配合

首屏索引见 [消息库索引说明-messagesType.md](消息库索引说明-messagesType.md)。三个集合（messagesType、messagesUser、messagesOther）均建议在生产与测试环境建好索引后再做压测。
