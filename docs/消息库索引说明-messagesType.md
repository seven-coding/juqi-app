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

## 平台 10 秒同步调用限制（App 必读）

- **云函数同步调用云函数**时，Cloud Base 平台有约 **10 秒** 的硬限制：超过 10 秒即返回 `FUNCTIONS_TIME_LIMIT_EXCEEDED`，与 getMessagesNew 或 appApi 的「超时配置」「client timeout」无关。
- 因此 **getMessagesNew 必须在 10 秒内返回**，否则 App 消息首屏会一直报「Invoking task timed out after 10 seconds」。
- **唯一可靠手段**：在 **实际被查询的数据库** 的 `messagesType` 上建立复合索引（见下），使聚合 + 排序走索引，在 10 秒内完成。

## 1 秒内返回的前置条件

- **必须**在**被查询环境**的 `messagesType` 上创建上述复合索引，否则首屏聚合 + count 会全表扫描，无法在 10 秒内返回（进而触发平台 10s 限制）。
- **App 使用「云托管 API + 线上数据」时**：getMessagesNew 读的是 **生产环境** 的库 → 索引需建在 **生产环境** 的 `messagesType` 上（不是测试环境）。
- 首屏接口已改为仅返回列表（不附带 notReadCount），未读角标由客户端通过 appGetUnreadCount 单独拉取。

### 操作步骤（生产环境 messagesType 建索引）

1. 打开 [腾讯云开发控制台](https://tcb.cloud.tencent.com) → 选择 **生产环境**（与「线上数据」对应）。
2. 左侧 **数据库** → 集合 **messagesType** → **索引管理**。
3. **新建索引**，字段顺序：`to`（升序）、`status`（升序）、`createTime`（降序），保存。
4. 等待索引构建完成后，再在 App 中重试消息首屏。

## 为何「没有索引」时小程序仍能返回、App 却超时？

- **环境与超时**  
  - 小程序：前端通过 `wx.cloud.callFunction('getMessagesNew')` **直连生产环境**云函数，云函数与 DB 同环境、同地域；生产环境云函数超时一般为 **60 秒**（或控制台配置值）。即便无索引时查询要 10～20 秒，只要在 60s 内完成就不会报超时，用户能等到结果（可能感觉慢但不会 10s 就报错）。  
  - App：请求经 **测试环境**（apiServer → appApi → getMessagesNew），getMessagesNew 再读生产库；测试环境云函数此前为 **10 秒** 超时。无索引时聚合 + count 超过 10s，先触发平台超时（FUNCTIONS_TIME_LIMIT_EXCEEDED），所以表现为「App 超时、小程序能返回」。

- **查询逻辑**  
  - 小程序侧 getMessagesUser 仍是 **aggregate + 多 lookup**（circle、dyn、messagesUser、user），且首屏会再调 getNotReadCount，整体并不比 App 版轻。  
  - 因此并非「无索引时小程序更快」，而是「无索引时小程序有更长超时时间窗口，请求仍能跑完」。

- **结论**  
  - 要稳定 **1 秒内** 返回，小程序与 App 都需在对应环境的 messagesType（及二级页用到的 messagesUser、messagesOther）上建好复合索引；仅靠提高超时无法解决体感慢的问题。

## 相关

- 二级页所用集合的索引说明见 [消息库索引说明-messagesUser-messagesOther.md](消息库索引说明-messagesUser-messagesOther.md)。
