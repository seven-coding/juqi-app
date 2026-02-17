# MCP 方式部署云函数说明（一键自动）

## 一键自动部署（推荐，无需手动上传与分步配置）

在 `JUQI-APP/cloudfunctions` 下**配置一次**环境变量或 `.env` 后，执行**一条命令**即可完成：  
① 通过微信云开发 Open API 补建环境中缺失的云函数；② 批量上传各云函数代码。  
无需打开微信开发者工具、无需分步执行。

### 配置（一次即可）

在 `JUQI-APP/cloudfunctions` 或项目根目录放置 `.env` 文件，或 `export` 环境变量：

| 变量 | 说明 |
|------|------|
| `WX_APPID` | 与云开发环境关联的小程序 AppID |
| `WX_SECRET` | 小程序 AppSecret |
| `TENCENT_SECRET_ID` | 腾讯云 SecretId（与云开发同账号） |
| `TENCENT_SECRET_KEY` | 腾讯云 SecretKey |

可复制 `cloudfunctions/.env.example` 为 `.env` 后填写。

### 执行

```bash
cd JUQI-APP/cloudfunctions
node run-full-deploy.js
```

脚本会依次：

1. **补建**：调用微信 Open API `tcb/createfunction`，为 `cloudbaserc.json` 中列出、但当前环境中不存在的云函数创建“空壳”。
2. **部署代码**：对各云函数目录执行 `npm install` 并调用腾讯云 SCF 更新代码（`UpdateFunctionCode`）。

### 仅补建、不上传代码

若只需在环境中创建缺失的函数名（后续用微信开发者工具上传代码）：

```bash
cd JUQI-APP/cloudfunctions
# 配置 WX_APPID、WX_SECRET 或 ACCESS_TOKEN 后：
node wx-create-functions.js
```

---

## 需要部署的云函数（均在 JUQI-APP 项目内）

所有云函数均在 `JUQI-APP/cloudfunctions/` 下，**不依赖 JUQI-小程序** 项目：

- **appApi**：统一入口
- **getDynsListV2、getDynDetail、publishDyn、likeOrUnlikeV2、delDyn**
- **getMessagesNew、setMessage**
- **getCircle、getCircleDetail、getTopic、setTopic、setJoinCircle**
- **getRearch、login、commonRequest、getUserAbout、chargeHer、setUser、updateUserInfo、getUserList、setUserInfo**

列表以 `cloudbaserc.json` 为准。

---

## 部署后验证

```bash
cd JUQI-APP/cloudfunctions/appApi
export TENCENT_SECRET_ID="你的SecretId"
export TENCENT_SECRET_KEY="你的SecretKey"
export TCB_ENV_ID="test-juqi-3g1m5qa7cc2737a1"
node tests/run-all-tests.js
```

---

**注意**：若使用腾讯云 MCP 服务器，也可通过 MCP 工具更新已存在的云函数代码；**创建**尚未存在的云函数建议使用上述微信 Open API 补建脚本，避免 SCF CreateFunction 在云开发环境下报 Stamp 错误。
