# 服务端 Token 校验与「Token 有问题」的原因

## 服务端如何校验 Token

- **校验方**：云托管 apiServer（`auth.guard.ts`）和云函数 appApi（`utils/token.js`）共用同一套逻辑。
- **算法**：JWT，密钥 `PRIVATE_KEY`、有效期 `30d` 两边一致。
- **校验步骤**：先 `jwt.decode` 取 payload，再 `jwt.verify(token, PRIVATE_KEY)`。  
  - 通过 → 认为 token 有效，并把 `openId` 注入请求。  
  - 不通过 → 若是 `TokenExpiredError` 则报「Token已过期」，否则报「Token验证失败」。

所以**服务端报「Token 过期/无效」** = 在服务端执行 `jwt.verify` 时，要么过期（exp 已过），要么签名/格式不对。

---

## 为什么服务端会认为 Token 有问题（常见原因）

### 1. Token 真的过期了（最常见）

- 签发时设置了 **30 天** 有效期，超过 30 天再请求就会报「Token已过期」。
- 若用户很久没打开 App，或一直用同一颗 token 没换过，到期后第一次请求就会触发。

### 2. 客户端没有用服务端下发的 newToken 更新本地

- 服务端在 token **快过期（7 天内）** 时会在响应里带 `newToken`，希望客户端换用新 token。
- 当前客户端 **没有解析、也没有保存** 响应里的 `newToken`（`APIResponse` 只有 code/data/message/requestId），所以本地一直用旧 token，直到 30 天到期 → 服务端就会报过期。
- **建议**：在客户端解析响应时若存在 `newToken`，调用 `AuthService.saveToken(newToken)` 更新本地，可减少「明明刚用过却突然过期」的情况。

### 3. 服务端或签发端时间不准

- `exp` 是「过期时间戳」，和服务器系统时间比较。若云托管或云函数的**系统时间比真实时间快很多**，会提前认为 token 已过期。
- 一般云环境时间较准，但若曾改过系统时间或时区异常，可能出现这种情况。

### 4. 密钥或环境不一致（少见）

- Token 必须由**同一密钥**签发和校验。apiServer 与云函数里的 `PRIVATE_KEY`、`TOKEN_EXPIRES_IN` 已对齐，正常情况下不会因密钥不一致报错。
- 若 token 是在**别的项目/环境**用不同密钥签发的，再打到当前 apiServer，会报「Token验证失败」（不是「Token已过期」）。

### 5. 传参/网络导致 token 没带上或被改

- 请求里没带 token、或 body/header 里 token 被截断、编码错误，服务端会报「未提供 Token」或解码失败。
- 你之前遇到的是 **body 里 code=401 + 文案「Token已过期」**，说明 token 有传到服务端且能 decode，只是 `jwt.verify` 判定过期，所以属于「过期」或「时间/未刷新」类原因，而不是没传或格式错误。

---

## 小结

| 现象           | 可能原因 |
|----------------|----------|
| Token已过期    | 超过 30 天；或未用 newToken 更新，一直用到过期；或服务端时间偏快 |
| Token验证失败  | 签名/密钥不一致，或 token 被篡改、格式错误 |
| 未提供 Token   | 请求未带 token 或提取方式与客户端不一致 |

当前约定：服务端继续返回 **401**，客户端收到后自动登出并弹出 Toast「登录已过期，请重新登录」引导用户重新登录；同时通过 newToken 自动保存、启动时 appRefreshToken 从根上减少过期。

---

## 如何避免类似问题（已做 + 建议）

### 已做

1. **服务端：Token 无效/过期返回 401**  
   apiServer 的 AuthGuard 在未提供 Token 或 Token 无效/过期时返回 **401**（`UnauthorizedException`），与客户端约定一致。

2. **客户端：401 时自动登出 + Toast 引导**  
   收到 401（HTTP 401 或 body.code=401）或 requiresReauth 时，先弹出 Toast「登录已过期，请重新登录」，再执行登出，用户会被引导至登录页。

3. **客户端：自动保存 newToken**  
   响应体中的 `newToken` 已解析（`APIResponse.newToken`），每次请求成功且带 `newToken` 时，会调用 `AuthService.shared.saveToken(newToken)` 更新本地 token，减少「用着用着突然过期」的情况。

4. **客户端：启动时调用 appRefreshToken**  
   验证通过后异步调用 `appRefreshToken` 换新 token，减少后续请求因过期被拒。
