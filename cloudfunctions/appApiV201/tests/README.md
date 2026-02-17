# App业务测试文档

## 文档说明

本文档说明如何运行和使用App业务测试套件。

---

## 一、测试文件结构

```
tests/
├── core-api-test.js          # 核心接口测试（已更新）
├── auth-test.js              # 认证模块测试
├── user-test.js              # 用户模块测试
├── dyn-test.js               # 动态模块测试
├── circle-test.js            # 圈子模块测试
├── message-test.js           # 消息模块测试
├── search-test.js            # 搜索模块测试
├── upload-test.js            # 上传模块测试
├── scenario-test.js          # 业务场景测试
├── format-test.js            # 数据格式测试
├── run-all-tests.js          # 运行所有测试
├── utils/
│   ├── test-helper.js        # 测试辅助函数
│   ├── mock-data.js          # 模拟数据
│   └── test-runner.js        # 测试运行器
└── reports/
    └── test-report.md        # 测试报告模板
```

---

## 二、运行测试

### 2.1 运行所有测试

```bash
cd JUQI-APP/cloudfunctions/appApi
node tests/run-all-tests.js
```

### 2.2 运行单个模块测试

```bash
# 认证模块
node tests/auth-test.js

# 用户模块
node tests/user-test.js

# 动态模块
node tests/dyn-test.js

# 圈子模块
node tests/circle-test.js

# 消息模块
node tests/message-test.js

# 搜索模块
node tests/search-test.js

# 上传模块
node tests/upload-test.js

# 业务场景测试
node tests/scenario-test.js

# 数据格式测试
node tests/format-test.js

# 核心接口测试
node tests/core-api-test.js
```

---

## 三、测试说明

### 3.1 测试环境

- **环境ID**: `test-juqi-3g1m5qa7cc2737a1`
- **云函数**: `appApi`
- **数据库**: 测试环境数据库

### 3.2 测试依赖

测试需要按顺序运行，因为：
1. 认证模块测试会生成token
2. 其他模块测试需要token才能运行

**推荐运行顺序**:
1. 先运行 `auth-test.js` 获取token
2. 然后运行其他模块测试

或者直接运行 `run-all-tests.js`，它会按正确顺序运行所有测试。

### 3.3 测试数据

- 测试使用模拟数据，不会影响生产环境
- 测试数据会在测试过程中自动生成
- 某些测试可能需要真实数据（如动态、用户），会跳过或使用现有数据

---

## 四、测试结果

### 4.1 输出格式

测试运行时会输出：
- 测试进度
- 每个测试用例的结果（通过/失败）
- 测试结果摘要（总数、通过数、失败数、通过率）
- 失败详情（如果有）

### 4.2 退出码

- `0`: 所有测试通过
- `1`: 有测试失败

### 4.3 测试报告

测试报告模板位于 `tests/reports/test-report.md`，可以手动填写测试结果。

---

## 五、测试覆盖

### 5.1 接口覆盖

- **认证模块**: 5个接口，约20个测试用例
- **用户模块**: 15个接口，约50个测试用例
- **动态模块**: 11个接口，约40个测试用例
- **圈子模块**: 8个接口，约25个测试用例
- **消息模块**: 4个接口，约15个测试用例
- **搜索模块**: 4个接口，约15个测试用例
- **上传模块**: 2个接口，约10个测试用例
- **业务场景**: 4个完整场景
- **数据格式**: 6个格式验证测试

**总计**: 约200+个测试用例

### 5.2 测试类型

- **单元测试**: 单个接口功能测试
- **集成测试**: 与核心层交互测试
- **端到端测试**: 完整业务流程测试
- **业务场景测试**: 真实使用场景测试
- **数据格式测试**: 数据格式验证测试

---

## 六、常见问题

### 6.1 Token问题

**问题**: 测试失败，提示"缺少token"

**解决**: 先运行 `auth-test.js` 获取token，或者运行 `run-all-tests.js`

### 6.2 数据不存在

**问题**: 某些测试跳过，提示"没有数据"

**解决**: 这是正常的，测试会跳过需要特定数据的测试用例

### 6.3 用户未通过验证

**问题**: 某些操作返回403，提示"用户未通过验证"

**解决**: 这是正常的，测试用户可能未通过验证，测试会跳过这些用例

---

## 七、扩展测试

### 7.1 添加新测试用例

在对应的模块测试文件中添加新的测试函数：

```javascript
async function testNewFeature() {
  if (!TEST_CONFIG.testToken) {
    throw new Error('缺少token，无法测试');
  }
  
  const result = await callAppApi('appNewFeature', {
    // 参数
  }, TEST_CONFIG.testToken);
  
  validateResponse(result, 200);
  // 验证结果
}
```

然后在 `runAllTests` 函数中添加：

```javascript
await runTest('新功能测试', testNewFeature);
```

### 7.2 添加新模块测试

1. 创建新的测试文件，如 `new-module-test.js`
2. 使用 `test-helper.js` 中的辅助函数
3. 导出 `runAllTests` 函数
4. 在 `test-runner.js` 中添加文件路径

---

**文档更新时间**: 2026-01-15
