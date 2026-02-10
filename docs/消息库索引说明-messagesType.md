# 消息库 messagesType 复合索引说明

## 目的

getMessagesUser（消息首屏）对 `messagesType` 的查询条件为：`to`、`status in [0,1]`，排序为 `status asc, createTime desc`。数据量大时易超时，需在**生产环境**与测试环境的消息库上建立复合索引以加速。

## 推荐索引

- **集合**：`messagesType`
- **索引字段**（顺序）：`to`（升序）、`status`（升序）、`createTime`（降序）
- **说明**：与 getMessagesUser 的 match + sort 一致，便于聚合阶段利用索引。

## 操作方式

在云开发控制台 → 数据库 → 对应环境 → 集合 `messagesType` → 索引管理 中创建上述复合索引；或通过云开发 API 创建。创建后无需改代码，查询会自动走索引。

## 影响

- 仅影响查询性能，对线上小程序与 App 均为正向（首屏加载更快、超时概率降低）。
- 写入消息逻辑不受影响。
