# 使用MCP工具部署云函数

## 当前状态

已配置腾讯云 MCP 服务器，可通过 MCP 工具或 CLI 重新部署测试环境。

## 重新部署测试环境

### 方案1: 使用腾讯云 MCP 工具（已配置）

在 Cursor 中若已配置腾讯云 MCP 服务器，可使用其提供的工具完成部署：

1. **createFunction** - 创建新云函数（若函数尚未存在）
2. **updateFunctionCode** - 更新云函数代码（推荐，用于更新已存在的函数）
3. **invokeFunction** - 部署后调用云函数做冒烟测试

**部署顺序**：先部署核心层（getUserList、getDynsListV2、publishDyn），再部署 appApi。  
**环境**：测试环境 ID 为 `test-juqi-3g1m5qa7cc2737a1`，地域 `ap-shanghai`。

### 方案2: 使用 tcb CLI 重新部署

在本地已设置 `TENCENT_SECRET_ID` 和 `TENCENT_SECRET_KEY` 的前提下：

```bash
# 登录（使用环境变量）
tcb login --apiKeyId "$TENCENT_SECRET_ID" --apiKey "$TENCENT_SECRET_KEY"

# 部署 appApi（在 JUQI-APP/cloudfunctions 目录下）
cd JUQI-APP/cloudfunctions
tcb functions:deploy appApi -e test-juqi-3g1m5qa7cc2737a1 --force
```

核心层云函数需在 **JUQI-小程序** 项目的云开发控制台或微信开发者工具中分别上传：getUserList、getDynsListV2、publishDyn。

### 方案3: 使用微信开发者工具（推荐，最简单）

这是最直接的方式，无需额外配置：

1. 打开微信开发者工具
2. 打开对应项目（JUQI-APP 或 JUQI-小程序）
3. 进入云开发 → 云函数
4. 右键云函数 → "上传并部署：云端安装依赖"

### 方案4: 使用部署脚本

我已经创建了部署脚本 `deploy.js`，但需要先安装依赖：

```bash
cd JUQI-APP/cloudfunctions/appApi
npm install tencentcloud-sdk-nodejs archiver --save-dev
npm run deploy
```

---

## 需要部署的云函数

### 核心层云函数（JUQI-小程序项目）

1. **getUserList**
   - 路径: `JUQI-小程序/cloudfunctions/getUserList/`
   - 修复: 添加 getCharging 导入

2. **getDynsListV2**
   - 路径: `JUQI-小程序/cloudfunctions/getDynsListV2/`
   - 修复: 修复 item 变量错误

3. **publishDyn**
   - 路径: `JUQI-小程序/cloudfunctions/publishDyn/`
   - 修复: 修复 JSON.parse 错误处理

### App层云函数（JUQI-APP项目）

4. **appApi**
   - 路径: `JUQI-APP/cloudfunctions/appApi/`
   - 修复: 路由配置、数据格式转换

---

## 部署顺序

1. **先部署核心层云函数**（必须先部署）
2. **再部署 appApi 云函数**

---

#bu sh

部署完成后，运行测试验证：

```bash
cd JUQI-APP/cloudfunctions/appApi
export TENCENT_SECRET_ID="YOUR_SECRET_ID"
export TENCENT_SECRET_KEY="YOUR_SECRET_KEY"
export TCB_ENV_ID="test-juqi-3g1m5qa7cc2737a1"
node tests/run-all-tests.js
```

---

**注意**: 已配置腾讯云 MCP 服务器时，可在 Cursor 中通过 MCP 工具（如 updateFunctionCode）直接更新云函数代码，完成测试环境重新部署。
