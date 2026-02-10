# 话题详情页：App 与小程序 UI/字段差异对比

## 一、数据来源与模型

| 端 | 接口 | 返回结构 |
|----|------|----------|
| **小程序** | `getTopic`（type=3） | topics 文档 + lookup `fromUser`，原始字段：`topic`、`topicDesc`、`openId`、`joinCounts`、`rankListStatus`、`recommend`、`fromUser` 等 |
| **App** | `appGetTopicDetail` | 标准化结构（若走 APP 自实现）：`id`、`name`、`icon`、`description`、`createTime`、`creator`、`dynCount`；若走核心层 getTopic 则与小程序同源为原始 topics 文档 |

---

## 二、字段对照表

| 含义 | 小程序字段 | App 模型字段 | 说明 |
|------|------------|--------------|------|
| 话题名称 | `topic` | `name` | 等价 |
| 话题简介 | `topicDesc` | `description` | 等价 |
| 话题图标/头图 | 无（有注释掉的背景图） | `icon` | 仅 App 有图标展示 |
| 参与次数 | `joinCounts` | — | 仅小程序有；App 用「条动态」 |
| 动态条数 | 列表总数 | `dynCount` | 仅 App 在头部展示「X 条动态」 |
| 创建者 | `fromUser[0]`（openId、nickName、头像） | `creator`（id、userName、avatar） | 小程序展示更丰富（头像+文案） |
| 排行榜开关 | `rankListStatus` | — | 仅小程序有排行榜入口 |
| 推荐/屏蔽 | `recommend` | — | 小程序取数，详情页未直接展示 |
| 话题 ID | `_id`（在 circleDetail 等处） | `id` | 等价 |
| 创建时间 | — | `createTime` | 仅 App 模型有，当前 UI 未展示 |
| 当前用户是否创建者 | `openId` 与存储对比得 `isUser` | — | 仅小程序用于显示「编辑」权限 |

---

## 三、UI 差异清单

### 3.1 头部信息区

| UI 项 | 小程序 | App | 差异说明 |
|-------|--------|-----|----------|
| 话题标题 | `#{{topic}}` 大号加粗 | `#name#` 加粗 | 一致 |
| 话题图标/头图 | 无；仅注释掉的背景图 | 有：60pt 圆形 icon，无则占位「#」 | **App 多** |
| 创建者展示 | 头像 + 昵称 +「发布了一篇话题」 | 仅文案「创建者: userName」可点 | **小程序更丰富** |
| 简介 | 支持展开/收起（超过 2 行有「展开/收起」） | 固定 2 行 `lineLimit(2)`，无展开 | **小程序可展开** |
| 参与量表述 | 「X次参与」（`joinCounts`） | 「X 条动态」（`dynCount`） | **语义不同** |
| 编辑入口 | 橘长/管理员/创建者可见「编辑」按钮 | 无 | **仅小程序有** |
| 排行榜入口 | `rankListStatus` 为真时显示「排行榜」 | 无 | **仅小程序有** |

### 3.2 列表与操作

| UI 项 | 小程序 | App | 差异说明 |
|-------|--------|-----|----------|
| 动态列表 | `<dyn-list>` 组件 | `LazyVStack` + `PostCardView` | 实现方式不同 |
| 加载更多 | 上拉加载 + `allloaded` | 「加载更多」按钮 + `hasMore` | 交互不同 |
| 下拉刷新 | 有 | 无 | **仅小程序有** |
| 底部「参与话题」 | 有，跳转发动态并带 topic | 无 | **仅小程序有** |
| 空状态 | `<no-data-tips>` | `EmptyStateView`「暂无动态」 | 一致意图 |

### 3.3 管理/编辑能力

| 能力 | 小程序 | App |
|------|--------|-----|
| 编辑话题说明 | 有：弹窗编辑 + `setTopic` type=2 | 无 |
| 权限判断 | isOwner / isManager / admin / isUser | 无 |

---

## 四、接口与数据层差异（供对齐参考）

- **小程序**：直接调云函数 `getTopic` type=3，得到 topics 单条 + `fromUser`，页面用 `topicDesc`、`joinCounts`、`fromUser`、`rankListStatus` 等。
- **App**：  
  - 若走 **JUQI-APP appApi** 的 `GetTopicDetail`：调核心层 `getTopic`，返回 `success({ topic: result.result.data })`，即原始 topics 文档形态，与 Swift 端 `TopicDetail`（id/name/icon/description/creator/dynCount）不一致，需在 appApi 或客户端做一层转换。  
  - 若走 **小程序侧 appApi** 的 `appGetTopicDetail`：自查 topics + 动态数并返回标准化结构（id、name、icon、description、creator、dynCount 等），与 App 端 `TopicDetail` 一致。

若要两端展示与能力对齐，建议：  
1）统一话题详情接口返回结构（含 `joinCounts`、`rankListStatus`、创建者 fromUser/creator）；  
2）App 补充：参与次数展示、创建者头像与文案、简介展开/收起、编辑说明、排行榜入口、参与话题按钮、下拉刷新。

---

## 五、小结：App 相对小程序缺失的 UI/能力

1. **参与次数**：无「X次参与」，仅有「X 条动态」。  
2. **创建者**：无头像与「发布了一篇话题」文案。  
3. **简介**：无展开/收起。  
4. **编辑**：无「编辑」按钮与编辑话题说明。  
5. **排行榜**：无排行榜入口。  
6. **参与话题**：无底部「参与话题」按钮。  
7. **下拉刷新**：无。

以上可作为话题详情页在 App 侧补齐 UI 与字段的 checklist。
