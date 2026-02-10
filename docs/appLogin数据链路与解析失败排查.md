# appLogin 数据链路与「解析失败」排查

## 一、端到端数据流

```
[App Swift]
  POST https://{cloudRunHost}/app/v2/api
  Content-Type: application/json
  Body: { "operation": "appLogin", "data": { "code": "test_app_debug" }, "source": "v2", "dataEnv": "prod" }
    ↓
[CloudRun 网关]
  转发到 NestJS 容器
    ↓
[NestJS apiServer]
  • AuthGuard: operation=appLogin → 放行，不校验 token
  • AppController.api() → AppService.handleApiRequest('appLogin', data, null, dataEnv)
  • 使用测试环境 Cloudbase 实例 → cloudbase.callFunction({ name: 'appApi', data: { operation, data, token, source, dataEnv } })
    ↓
[云函数 appApi]（测试环境）
  • 按 dataEnv 初始化 DB（prod 则连正式库）
  • 路由到 auth.Login(event)
  • Login: 测试 code → 按 dataEnv 取 openId（prod: onosB5t... / test: test_openid_app）
  • 查 user、生成 token → 返回 success({ token, openId, joinStatus, vipStatus, trialStartTime, trialDays })
  • 云函数 return 值 = { code: 200, data: { ... }, message: "成功", timestamp }
    ↓
[CloudBase Node SDK]（在 apiServer 内）
  • callFunction 返回结构因环境/版本可能为：
    A) { result: { code, data, message, timestamp } }   ← 常见
    B) { result: "<JSON string>" }                       ← 需 JSON.parse
    C) 直接 { code, data, message }                      ← 少数
    ↓
[NestJS apiServer]
  • payload = result.result ?? result，若 payload 无 code → 返回 { code: 500, message: '云函数未返回有效数据', data: null }
  • Controller return payload → ResponseInterceptor：若已是 { code, message, data } 则原样返回
  • @HttpCode(200) 应返回 HTTP 200（若已部署）；未部署则仍可能 201
    ↓
[CloudRun]
  将 Nest 的 JSON body 与 status 返回给客户端
    ↓
[App Swift]
  • 期望 JSON 根节点: { "code": 200, "message": "...", "data": { "token", "openId", "joinStatus", "vipStatus", "trialStartTime", "trialDays" } }
  • 解码为 APIResponse<LoginData>，再取 resultData = apiResponse.data
```

## 二、「数据解析失败」常见原因

| 现象 | 可能原因 | 排查/修复 |
|------|----------|-----------|
| **HTTP 500 但客户端报「解析失败」** | 服务端返回 500 时 `data` 为 `{ stack, ... }`，客户端仍按 `LoginData` 解码导致失败 | 云函数 `internalError` 已改为始终返回 `data: null`；客户端可先判断 code 再解码 data |
| **正式数据源登录 500：trial_periods 不存在** | 正式环境 DB 无 `trial_periods` 集合，auth.Login 查/写该集合抛错 | auth.js 中试用期逻辑已用 try/catch 包裹，集合不存在时仅跳过试用期、照常返回登录成功 |
| HTTP 201 + DecodingError: missing | 响应体根节点没有 `code` | 多为网关或 apiServer 返回了包装结构，如 `{ "result": { "code": 200, ... } }`，客户端期望根节点即 `code` |
| HTTP 200/201 + 响应体为空 | 网关/代理未把 body 打满、或 Nest 返回了 undefined | 客户端已做「2xx 且 body 为空」报错；服务端需保证 return 的必为 `{ code, message, data }` |
| HTTP 200 + JSON 有 code 但 decode 仍失败 | `data` 内字段类型不符（如 trialStartTime 为 string、或缺少必填字段） | 看客户端「解码失败时打印的原始 body」对比 LoginData 定义 |

## 三、服务端必须保证的响应形状

客户端只认**根节点**为：

- `code: Int`
- `message: String`（可选但建议有）
- `data: 对象或 null`（登录成功时为 `{ token, openId, joinStatus, vipStatus, trialStartTime?, trialDays? }`）

因此 apiServer 在调用云函数后，**必须**把「云函数返回值」解包成上述形状再 return，不能直接 return `{ result: ... }` 或带一层 `result` 的包装。

## 四、建议的排查步骤

1. **确认 apiServer 已部署**  
   包含对 `result.result` 的解包、以及 `@HttpCode(200)` 的修改，再测一次。

2. **看客户端日志**  
   若已加「appLogin 解码失败时打印原始响应体」，查看控制台前几百字符的响应内容，确认根节点是 `code/message/data` 还是 `result: { code, ... }`。

3. **看 CloudRun / apiServer 日志**  
   确认 `[CloudFunction] Success - operation: appLogin, code: 200` 是否出现；若出现「云函数返回结构异常」，说明 SDK 返回格式与预期不符，需按实际结构再解一层或做 JSON.parse。

4. **用 curl 复现**  
   ```bash
   curl -s -X POST 'https://juqi-api-server-217941-7-1314478640.sh.run.tcloudbase.com/app/v2/api' \
     -H 'Content-Type: application/json' \
     -d '{"operation":"appLogin","data":{"code":"test_app_debug"},"source":"v2","dataEnv":"prod"}' | jq .
   ```  
   看返回的 JSON 根节点是否为 `code` / `message` / `data`。
