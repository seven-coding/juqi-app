# 脚本说明

## sync-circle-prod-to-test.js（正式环境圈子同步至测试环境）

**作用**：从正式环境读取 `circle` 集合全部数据（最多 500 条），按 `_id` 幂等写入测试环境（不存在则新增，已存在则更新）。用于解决测试环境圈子为空导致 appGetCircleDetail 失败等问题。

**执行方式**（在 `cloudfunctions` 目录下）：

```bash
node scripts/sync-circle-prod-to-test.js
```

**环境变量**：与 seed 脚本相同（`TEST_ENV_ID`、`PROD_ENV_ID`；本地运行需配置腾讯云密钥）。

**注意**：正式环境只读，仅向测试环境写入。

---

## seed-test-collections.js（测试环境集合补全与测试数据）

**作用**：对比线上环境，对测试环境补全缺失的 NoSQL 集合，并对空集合按线上字段插入最多 100 条测试数据，满足 App 可测。

**执行方式**（在 `cloudfunctions` 目录下）：

```bash
node scripts/seed-test-collections.js
```

**环境变量**（可选，默认与 [appApi/utils/env.js](../appApi/utils/env.js) 一致）：

- `TEST_ENV_ID`：测试环境 ID，默认 `test-juqi-3g1m5qa7cc2737a1`
- `PROD_ENV_ID`：生产环境 ID，默认 `prod-juqi-7glu2m8qfa31e13f`

**行为**：

1. 仅向**测试环境**写入，**生产环境只读**。
2. 幂等：已存在的集合不再创建；空集合从生产拉取最多 100 条写入测试（重复则 update）。
3. 集合清单见 [docs/collections-app-no-sql.md](../../docs/collections-app-no-sql.md)。

**注意**：

- 本地运行需配置腾讯云密钥（如环境变量 `TENCENT_SECRET_ID`、`TENCENT_SECRET_KEY`，或云开发控制台获取）；在云函数内运行时使用云函数默认身份。
- 需能同时连接两个环境（云函数内或本地配置腾讯云密钥）。
- 从 prod 拷贝到 test 的数据若含敏感信息，可按需在脚本内做脱敏或仅拷贝结构。

**验收**：执行成功后，测试环境中代码引用的集合均应存在，原为空的集合至少有 1～100 条测试数据，App 拉动态、详情、评论等不再出现「集合不存在」类 500。
