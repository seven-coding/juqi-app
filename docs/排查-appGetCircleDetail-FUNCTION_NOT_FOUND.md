# appGetCircleDetail 报错 FUNCTION_NOT_FOUND 排查

## 现象

- 请求：`operation=appGetCircleDetail`，`dataEnv=test`
- 响应：`code=400`，`message` 含 `FunctionName parameter could not be found` / `FUNCTION_NOT_FOUND`

## 原因

调用链为：

1. apiServer → **appApiV201** ✅
2. appApiV201 → **getCircleDetailV201** ✅（能进到该函数）
3. getCircleDetailV201 → **commonRequestV201** ❌（这里报 FUNCTION_NOT_FOUND）

即：**测试环境中未部署云函数 commonRequestV201**，getCircleDetail 在查圈子信息时会调该函数，找不到就报错。

数据库里已有圈子数据只解决「有没有数据」；「有没有能查数据的云函数」需要把 commonRequestV201 部署到测试环境。

## 解决

在 **JUQI-APP/cloudfunctions** 目录下，只部署 **commonRequestV201**（本地目录名为 `commonRequest`）到测试环境：

```bash
cd /path/to/JUQI-APP/cloudfunctions
DEPLOY_ENV=test DEPLOY_ONLY=commonRequestV201 node deploy-all.js
```

如需同时部署 getCircleDetailV201（例如曾改过核心逻辑）：

```bash
DEPLOY_ENV=test DEPLOY_ONLY=commonRequestV201,getCircleDetailV201 node deploy-all.js
```

部署前请确认已在 `cloudfunctions/.env` 或 `apiServer/.env` 中配置 `TENCENT_SECRET_ID`、`TENCENT_SECRET_KEY`（或 `CLOUD_BASE_ID`、`CLOUD_BASE_KEY`）。

## 验收

部署完成后，再请求 appGetCircleDetail（同一 circleId），应返回 200 及圈子详情；若圈子不存在则返回 404「圈子不存在」。
