# 排查：切到「测试数据」后列表仍显示正式库

## 已加的排查日志

复现步骤：**关于页切到「测试数据」→ 返回首页**，然后按下面顺序看日志。

### 1. 客户端（Xcode 控制台）

| 关键字 | 含义 |
|--------|------|
| `🔍 [排查] 切换后` | 切换数据环境后，UserDefaults 与 AppConfig.dataEnv 是否一致（应为 test） |
| `🔍 [排查] 动态列表请求` | 发往服务端的 body.dataEnv 与当前 AppConfig.dataEnv（应为 test） |
| `📤 [HTTP Request] ... dataEnv=` | 该次请求实际带上的 dataEnv |

若这里 **dataEnv=prod**，说明是客户端问题：  
- **Release 构建**下 `AppConfig.dataEnv` 固定返回 `"prod"`（见 `AppConfig.swift` #if DEBUG），需用 **DEBUG 构建** 再试，或改 Release 下也读 UserDefaults。

### 2. 服务端 apiServer（Cloud Run / 本地日志）

| 关键字 | 含义 |
|--------|------|
| `[API] 排查 动态列表` | 收到的 body.dataEnv，将用于选库 |
| `[AppService] 直连数据库` 或 `[AppService] 排查 动态列表走云函数` | 走直连还是云函数，以及传入的 dataEnv |

若这里 **dataEnv 为 prod**，说明请求里带的就是 prod（回头查客户端）；若为 test 但列表仍是正式数据，继续看云函数日志。

### 3. 云函数 appApi / getDynsListV2（云开发控制台）

| 关键字 | 含义 |
|--------|------|
| `[appApi] 排查 动态列表` | appApi 入口：dataEnv → envId（test 应对应 test-juqi-...） |
| `[appGetDynList] 排查 选库` | dyn 模块传给 getDynsListV2 的 event.dataEnv 与 coreParams.envId |
| `[getDynsListV2] 排查 实际选库` | 实际用于查库的 envId（test 前缀=测试库，prod 前缀=正式库） |

若 envId 为 `prod-juqi-...` 而你是切到测试数据，说明前面某处把 dataEnv 传成了 prod 或 envId 被写死/覆盖。

## 快速结论

- **客户端已打 `dataEnv=test`，服务端/云函数也收到 test 且 envId 为 test 前缀** → 仍看到正式数据时，可能是缓存或其它列表（如消息）未按 dataEnv 区分，需再缩小到具体接口/页面。
- **客户端就打出 `dataEnv=prod`** → 先确认是 DEBUG 构建，再确认切换后 `🔍 [排查] 切换后` 里读回为 test。
