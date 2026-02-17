# appGetDynDetail 返回 404「动态不存在」排查说明

## 1. 日志里哪些是错误、哪些可以忽略

| 日志 | 含义 | 是否需处理 |
|------|------|------------|
| `nw_socket_set_connection_idle ... SO_CONNECTION_IDLE failed [42: Protocol not available]` | iOS/macOS 系统层 socket 选项不支持（ENOPROTOOPT），常见于模拟器/部分真机 | **可忽略**，不影响请求成功与否 |
| `appGetCurrentUserProfile` / `appGetDynComment` 返回 200 | 接口正常 | 无需处理 |
| `appGetDynDetail` 返回 **404，message: 动态不存在** | 当前请求的这条动态在**当前数据环境**里查不到 | **需要排查** |

结论：**真正导致失败的是「动态不存在」404，不是 socket 报错。**

---

## 2. 404 是在哪里产生的

- **入口**：客户端调用 `appGetDynDetail`，传入动态 `id`。
- **appApi**：`appApi/modules/dyn.js` 的 `GetDynDetail` 会带上 `event.envId` 调用核心层云函数 `getDynDetail`。
- **核心层**：`getDynDetail/index.js` 根据 `event.envId` 做 `cloud.init({ env: envId })`，再调用 `getDynDetail/getDynDetail.js` 里的查询。
- **查询逻辑**：在**当前 cloud 环境**的 `dyn` 集合里做 `aggregate().match({ _id: dynId })`；若 `list` 为空，则返回 404，message 为「动态不存在」。

也就是说：**404 = 在当前 envId 对应的数据库的 `dyn` 集合中，没有 _id 等于请求里 id 的文档。**

---

## 3. 可能原因（按常见程度）

1. **当前请求的 id 在测试环境里本来就不存在**
   - 列表里的某条动态已被删除，但列表是缓存的或来自上一页，点击进去就会 404。
   - 或列表来自其它数据源/环境，和详情使用的环境不一致。

2. **id 来自「线上」而当前是「测试数据」**
   - 例如从分享/链接进来的是线上环境的动态 id，而 App 当前 `dataEnv=test`，测试库没有这条 _id，会 404。

3. **环境未对齐（理论上已避免）**
   - appApi 已根据 `dataEnv` 设置 `event.envId` 并传给 getDynDetail，列表与详情应同库；若你改过 env 或部署，可再确认一次请求里是否带了 `dataEnv=test` 且 envId 与列表一致。

---

## 4. 建议的排查步骤

1. **确认请求里的动态 id 和 dataEnv**
   - 在客户端或服务端打印：`appGetDynDetail` 请求体中的 `id` 和 `dataEnv`（或 envId）。
   - 在云函数 getDynDetail 入口打印：`event.id`、`event.envId`，便于和数据库环境对应。

2. **在对应环境的数据库中确认是否存在该动态**
   - 打开云开发控制台 → 对应环境（测试环境）→ 数据库 → `dyn` 集合。
   - 用上面打印的 `id` 查一条文档（_id 等于该 id），看是否存在、是否被软删等。

3. **确认列表和详情用的是同一条 id**
   - 从列表点进详情时，用列表项里的哪个字段当作 `id` 传给 `getDynDetail`（例如 `post.id` 或 `post._id`）？
   - 确保列表接口返回的该字段与 `dyn` 集合的 `_id` 一致，且没有在中间被替换成其它环境的 id。

4. **（可选）在 getDynDetail 核心层加简短日志**
   - 在 `getDynDetail/getDynDetail.js` 的 aggregate 之后加一句：若 `list.length === 0`，打 log：`dynId, envId`（或当前 env 标识），便于以后直接看云函数日志确认「哪个 id、哪个环境」查不到。

---

## 5. 小结

- **Socket 报错**：系统层、可忽略。
- **404 原因**：当前请求的动态 id 在当前 envId 对应的 `dyn` 集合中不存在。
- **下一步**：在客户端或 appApi/getDynDetail 打印请求的 `id` 和 `dataEnv`/`envId`，到对应环境 `dyn` 集合中查该 _id 是否存在；并确认列表与详情使用的 id 一致、环境一致。
