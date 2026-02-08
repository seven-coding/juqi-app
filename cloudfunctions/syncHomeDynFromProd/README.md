# syncHomeDynFromProd

从**正式环境**同步首页各 type 所需动态到**测试环境**，最多 **50 条**，便于 App 验证首页（最新、公告板、热榜等）。

## 规则

- 仅同步 **50 条** dyn + 相关 user（最多 50 个）。
- 正式环境**只读**，测试环境写入。
- 数据来源：正式环境 `dyn` 集合（可见动态 + 管理员动态）及对应 `user`。

## 行为说明

1. 拉取管理员（公告板）动态最多 10 条。
2. 拉取最新可见动态（dynStatus 1,6）按 publicTime 倒序最多 50 条。
3. 合并去重后取最多 50 条写入测试环境 `dyn`。
4. 收集上述动态的 openId，从正式环境拉取对应用户并写入测试环境 `user`（最多 50 个）。

## 部署与执行

1. 在云函数根目录执行 `npm install`。
2. 将本云函数部署到**测试环境**（与 appApi、getDynsListV2 同一环境）。
3. 在控制台或通过调用云函数触发执行；可通过环境变量 `PROD_ENV_ID`、`TEST_ENV_ID` 覆盖环境 ID（默认见 config.json）。

## 环境变量

- `PROD_ENV_ID`：正式环境 ID（只读源）。
- `TEST_ENV_ID`：测试环境 ID（写入目标）。

默认与 `appApi/utils/env.js` 一致：`prod-juqi-7glu2m8qfa31e13f` / `test-juqi-3g1m5qa7cc2737a1`。
