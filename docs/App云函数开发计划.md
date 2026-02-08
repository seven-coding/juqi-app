# App云函数开发计划

## 文档说明

本文档基于《App页面云函数梳理.md》，制定详细的云函数开发计划。所有云函数部署在测试环境中，严格按照App接口文档的架构规则实现。

## 开发原则

### 架构规则（必须严格遵守）

1. **版本控制方案**
   - 业务版本层（appApi/modules）处理所有App特有逻辑
   - 核心层保持纯净，不区分调用来源
   - 不传递source参数给核心层

2. **参数标准化**
   - 版本层通过Token解析openId
   - 将App参数转换为核心层标准格式
   - 核心层统一接收标准化参数

3. **数据格式转换**
   - 版本层负责将核心层返回转换为App所需格式
   - 处理会员状态等App特有字段

4. **错误处理**
   - 统一错误码：200成功，400参数错误，401未登录，403无权限，500服务器错误
   - 统一错误信息格式

5. **环境配置**
   - 所有云函数部署在测试环境
   - 使用环境隔离的db实例

---

## 开发阶段划分

### 第一阶段：核心功能（P0 - 必须实现）

**目标**：实现app基础功能，支持用户登录、查看动态、发布动态等核心流程

**预计时间**：2-3周

#### auth模块（认证相关）

| 云函数 | 状态 | 优先级 | 核心层云函数 | 开发要求 |
|--------|------|--------|--------------|----------|
| `appLogin` | ✅ 已实现 | P0 | `login` | 需要完善微信登录逻辑 |
| `appGetUserInfo` | ✅ 已实现 | P0 | `login` (userinfo) | 需要确保返回会员状态 |
| `appRefreshToken` | ✅ 已实现 | P0 | `login` (refresh) | 已实现 |
| `appSubmitLanguageVerify` | ✅ 已实现 | P0 | - | 已实现 |
| `appGetVerifyStatus` | ✅ 已实现 | P0 | - | 已实现 |

**开发任务**：
- [ ] 完善`appLogin`的微信登录逻辑（需要对接微信开放平台API）
- [ ] 确保`appGetUserInfo`返回会员状态字段

#### dyn模块（动态相关）

| 云函数 | 状态 | 优先级 | 核心层云函数 | 开发要求 |
|--------|------|--------|--------------|----------|
| `appGetDynList` | ❌ 待开发 | P0 | `getDynsListV2` | 参数标准化，数据格式转换 |
| `appGetDynDetail` | ❌ 待开发 | P0 | `getDynDetail` | 参数标准化，数据格式转换 |
| `appGetDynComment` | ✅ 已实现 | P0 | `getDynComment` | 已实现 |
| `appPublishDyn` | ❌ 待开发 | P0 | `publishDyn` | 参数标准化，数据格式转换 |
| `appLikeDyn` | ❌ 待开发 | P0 | `likeOrUnlikeV2` | 参数标准化 |
| `appCommentDyn` | ✅ 已实现 | P0 | `commentV2` | 已实现 |
| `appLikeComment` | ✅ 已实现 | P0 | `likeOrUnlikeV2` | 已实现 |
| `appDeleteComment` | ✅ 已实现 | P0 | `delDyn` | 已实现 |
| `appRepostDyn` | ✅ 已实现 | P0 | `publishDyn` | 已实现 |
| `appChargeDyn` | ❌ 待开发 | P0 | `likeOrUnlikeV2` | 参数标准化 |
| `appDeleteDyn` | ❌ 待开发 | P1 | `delDyn` | 参数标准化 |

**开发任务**：
- [ ] 实现`appGetDynList`（首页核心功能，注意type参数映射和publicTime分页）
- [ ] 实现`appGetDynDetail`（动态详情页核心功能）
- [ ] 实现`appPublishDyn`（发布动态核心功能）
- [ ] 实现`appLikeDyn`（点赞功能，type=1）
- [ ] 实现`appChargeDyn`（充电功能，type=2）
- [ ] 实现`appDeleteDyn`（删除动态）

#### user模块（用户相关 - 核心功能）

| 云函数 | 状态 | 优先级 | 核心层云函数 | 开发要求 |
|--------|------|--------|--------------|----------|
| `appGetCurrentUserProfile` | ❌ 待开发 | P0 | `login` (getOwnInfo) | 参数标准化，返回会员状态 |
| `appGetUserProfile` | ❌ 待开发 | P0 | `commonRequest` (get_user_info) + `getUserAbout` (type=7) | 组合调用，参数标准化，返回会员状态 |
| `appGetUserDynList` | ❌ 待开发 | P0 | `getDynsListV2` | 参数标准化，type=4 |
| `appFollowUser` | ✅ 已实现 | P0 | `followOrUnfollow` | 已实现 |
| `appUnfollowUser` | ✅ 已实现 | P0 | `followOrUnfollow` | 已实现 |
| `appGetUserFollowStatus` | ✅ 已实现 | P0 | - | 已实现 |
| `appChargeUser` | ❌ 待开发 | P0 | `chargeHer` | 参数标准化 |
| `appBlackUser` | ❌ 待开发 | P1 | `setUser` | 参数标准化 |
| `appUnblackUser` | ❌ 待开发 | P1 | `setUser` | 参数标准化 |

**开发任务**：
- [ ] 实现`appGetCurrentUserProfile`（个人中心核心功能）
- [ ] 实现`appGetUserProfile`（用户主页核心功能，使用commonRequest+getUserAbout组合调用）
- [ ] 实现`appGetUserDynList`（用户动态列表，注意type=4是数字）
- [ ] 实现`appChargeUser`（给用户充电）
- [ ] 实现`appBlackUser`和`appUnblackUser`（拉黑功能）

#### upload模块（上传相关）

| 云函数 | 状态 | 优先级 | 核心层云函数 | 开发要求 |
|--------|------|--------|--------------|----------|
| `appUploadImage` | ❌ 待开发 | P0 | 云存储上传 | 实现图片上传到云存储 |

**开发任务**：
- [ ] 实现`appUploadImage`（发布动态必需）

---

### 第二阶段：重要功能（P1 - 重要但非必需）

**目标**：完善用户相关功能、圈子功能、搜索功能

**预计时间**：2-3周

#### user模块（用户相关 - 扩展功能）

| 云函数 | 状态 | 优先级 | 核心层云函数 | 开发要求 |
|--------|------|--------|--------------|----------|
| `appUpdateUserInfo` | ❌ 待开发 | P1 | `updateUserInfo` | 参数标准化 |
| `appGetUserList` | ✅ 已实现 | P1 | `getUserList` | 已实现 |
| `appGetChargeList` | ❌ 待开发 | P1 | `getUserList` (type=charging) | 参数标准化 |
| `appGetFavoriteList` | ❌ 待开发 | P1 | `getDynsListV2` (type=13) | 参数标准化 |
| `appGetBlackList` | ❌ 待开发 | P1 | `getUserList` (type=black) | 参数标准化 |
| `appGetInviteCode` | ❌ 待开发 | P1 | `getUserAbout` | 参数标准化 |
| `appGetInviteCount` | ❌ 待开发 | P1 | `getUserAbout` | 参数标准化 |
| `appUpdateVipConfig` | ❌ 待开发 | P1 | `setUserInfo` | 参数标准化 |
| `appSaveAddress` | ❌ 待开发 | P2 | - | 独立实现 |
| `appSetUserStatus` | ❌ 待开发 | P2 | `setUser` | 管理员功能 |
| `appGetUserActionHistory` | ❌ 待开发 | P2 | `tcbRequest` | 管理员功能 |
| `appSetUserAuth` | ❌ 待开发 | P2 | `setUser` | 管理员功能 |

**开发任务**：
- [ ] 实现`appUpdateUserInfo`（更新用户信息）
- [ ] 实现`appGetChargeList`（充电列表，type='charging'字符串）
- [ ] 实现`appGetFavoriteList`（收藏列表，type=13数字）
- [ ] 实现`appGetBlackList`（黑名单列表，type='black'字符串）
- [ ] 实现`appGetInviteCode`（邀请码，getUserAbout type=8）和`appGetInviteCount`（邀请数量，getUserAbout type=6）
- [ ] 实现`appUpdateVipConfig`（VIP配置）

#### circle模块（圈子相关）

| 云函数 | 状态 | 优先级 | 核心层云函数 | 开发要求 |
|--------|------|--------|--------------|----------|
| `appGetCircleList` | ❌ 待开发 | P1 | `getCircle` | 参数标准化 |
| `appGetCircleDetail` | ❌ 待开发 | P1 | `getCircleDetail` | 参数标准化 |
| `appJoinCircle` | ❌ 待开发 | P1 | `setJoinCircle` (type=1) | 参数标准化 |
| `appQuitCircle` | ❌ 待开发 | P1 | `setJoinCircle` (type=2) | 参数标准化 |
| `appGetTopicList` | ✅ 已实现 | P1 | `getTopic` | 已实现 |
| `appGetTopicDetail` | ✅ 已实现 | P1 | `getTopic` | 已实现 |
| `appGetTopicDynList` | ✅ 已实现 | P1 | `getDynsListV2` | 已实现 |
| `appCreateTopic` | ❌ 待开发 | P1 | `setTopic` | 参数标准化 |
| `appSearchTopic` | ❌ 待开发 | P1 | `getRearch` (type=topic) | 参数标准化 |

**开发任务**：
- [ ] 实现`appGetCircleList`（圈子列表）
- [ ] 实现`appGetCircleDetail`（圈子详情，注意参数名是id不是circleId）
- [ ] 实现`appJoinCircle`和`appQuitCircle`（加入/退出圈子，已添加路由配置）
- [ ] 实现`appCreateTopic`（创建话题）
- [ ] 实现`appSearchTopic`（搜索话题，注意无keyword时调用getTopic）

#### search模块（搜索相关）

| 云函数 | 状态 | 优先级 | 核心层云函数 | 开发要求 |
|--------|------|--------|--------------|----------|
| `appSearchUser` | ❌ 待开发 | P1 | `getRearch` (type=user) | 参数标准化 |
| `appSearchDyn` | ❌ 待开发 | P1 | `getRearch` (type=dyn) | 参数标准化 |
| `appSearchTopic` | ❌ 待开发 | P1 | `getRearch` (type=topic) | 参数标准化 |

**开发任务**：
- [ ] 实现`appSearchUser`（搜索用户，type=1数字类型）
- [ ] 实现`appSearchDyn`（搜索动态，type=2数字类型）
- [ ] 实现`appSearchTopic`（搜索话题，type=3数字类型，无keyword时调用getTopic）

---

### 第三阶段：消息功能统一（P1 - 架构优化）

**目标**：统一消息接口，改为通过appApi调用

**预计时间**：1周

#### message模块（消息相关）

| 云函数 | 状态 | 优先级 | 核心层云函数 | 开发要求 |
|--------|------|--------|--------------|----------|
| `appGetMessageList` | ❌ 待开发 | P1 | `getMessagesNew` | 统一消息接口，参数标准化 |
| `appSetMessage` | ❌ 待开发 | P1 | `setMessage` | 统一消息接口，参数标准化 |

**开发任务**：
- [ ] 实现`appGetMessageList`（统一消息列表接口）
- [ ] 实现`appSetMessage`（统一消息状态设置接口）
- [ ] 修改app客户端代码，改为调用`appGetMessageList`和`appSetMessage`
- [ ] 测试消息相关功能

**重要说明**：当前消息接口直接调用核心层，需要统一为通过appApi调用。

---

## 开发任务清单

### 第一阶段任务（P0）

#### auth模块
- [ ] 完善`appLogin`微信登录逻辑
- [ ] 确保`appGetUserInfo`返回会员状态

#### dyn模块
- [ ] `appGetDynList` - 获取动态列表
- [ ] `appGetDynDetail` - 获取动态详情
- [ ] `appPublishDyn` - 发布动态
- [ ] `appLikeDyn` - 点赞动态
- [ ] `appChargeDyn` - 充电动态
- [ ] `appDeleteDyn` - 删除动态

#### user模块
- [ ] `appGetCurrentUserProfile` - 获取当前用户信息
- [ ] `appGetUserProfile` - 获取用户主页信息
- [ ] `appGetUserDynList` - 获取用户动态列表
- [ ] `appChargeUser` - 给用户充电
- [ ] `appBlackUser` - 拉黑用户
- [ ] `appUnblackUser` - 取消拉黑

#### upload模块
- [ ] `appUploadImage` - 上传图片

### 第二阶段任务（P1）

#### user模块
- [ ] `appUpdateUserInfo` - 更新用户信息
- [ ] `appGetChargeList` - 获取充电列表
- [ ] `appGetFavoriteList` - 获取收藏列表
- [ ] `appGetBlackList` - 获取黑名单
- [ ] `appGetInviteCode` - 获取邀请码
- [ ] `appGetInviteCount` - 获取邀请数量
- [ ] `appUpdateVipConfig` - 更新VIP配置

#### circle模块
- [ ] `appGetCircleList` - 获取圈子列表
- [ ] `appGetCircleDetail` - 获取圈子详情
- [ ] `appJoinCircle` - 加入圈子
- [ ] `appQuitCircle` - 退出圈子
- [ ] `appCreateTopic` - 创建话题
- [ ] `appSearchTopic` - 搜索话题（统一到search模块）

#### search模块
- [ ] `appSearchUser` - 搜索用户
- [ ] `appSearchDyn` - 搜索动态
- [ ] `appSearchTopic` - 搜索话题

### 第三阶段任务（P1 - 架构优化）

#### message模块
- [ ] `appGetMessageList` - 获取消息列表
- [ ] `appSetMessage` - 设置消息状态
- [ ] 修改app客户端代码，统一消息接口调用

---

## 开发规范

### 1. 文件结构

```
cloudfunctions/appApi/
├── index.js              # 入口文件
├── modules/              # 业务版本层
│   ├── auth.js          # 认证模块
│   ├── user.js          # 用户模块
│   ├── dyn.js           # 动态模块
│   ├── circle.js        # 圈子模块
│   ├── message.js       # 消息模块
│   ├── search.js        # 搜索模块
│   └── upload.js        # 上传模块
├── utils/               # 工具函数
│   ├── token.js         # Token相关
│   ├── response.js      # 响应格式化
│   └── env.js           # 环境隔离
└── config.json          # 配置文件
```

### 2. 代码模板

#### 标准调用核心层模板

```javascript
// ========== 业务版本层（appApi/modules/dyn.js）==========
async function appGetDynList(event) {
  try {
    const { openId, data, db } = event;
    
    // 1. 参数校验
    const { type, page = 1, limit = 20, circleId, topic, publicTime } = data;
    
    // type参数映射：将App的字符串类型转换为数字
    const typeMap = {
      'all': 2,      // 最新动态（广场）
      'follow': 6,   // 关注动态
      'circle': 1,   // 圈子动态
      'topic': 5     // 话题动态
    };
    
    const coreType = typeof type === 'string' ? typeMap[type] : type;
    
    if (!coreType) {
      return error(400, "缺少type参数或type参数无效");
    }
    
    // 2. 参数标准化（将App参数转为核心层标准格式）
    const coreParams = {
      openId: openId,
      ownOpenId: openId,  // App版本在版本层处理openId
      type: coreType,  // 数字类型，不是字符串
      limit: limit
      // 注意：不传递source参数
    };
    
    // 分页参数处理
    if (publicTime) {
      coreParams.publicTime = publicTime;
    }
    
    // 根据type添加特定参数
    if (coreType === 1 && circleId) {
      coreParams.circleId = circleId;
    }
    if (coreType === 5 && topic) {
      coreParams.topic = topic;
    }
    
    // 3. 调用核心层（传递标准化参数）
    const result = await cloud.callFunction({
      name: 'getDynsListV2',
      data: coreParams  // 不包含source
    });
    
    // 4. 检查核心层返回
    if (result.result.code !== 200) {
      return error(result.result.code || 500, result.result.message || '获取动态列表失败');
    }
    
    // 5. 数据格式转换（适配App需求）
    const appData = {
      list: result.result.dynList || [],
      total: result.result.count || 0,
      hasMore: (result.result.dynList || []).length >= limit,
      publicTime: result.result.publicTime  // 返回publicTime用于下次分页
    };
    
    // 6. 返回App格式
    return success(appData);
  } catch (err) {
    console.error('appGetDynList error:', err);
    return error(500, err.message || '服务器错误');
  }
}
```

### 3. 参数标准化规则

#### 必须标准化的参数

- `openId`: 从Token解析，传递给核心层
- `ownOpenId`: 通常等于openId
- 业务参数：根据核心层接口要求标准化

#### 禁止传递的参数

- `source`: 不传递给核心层
- `token`: 不传递给核心层（已在版本层处理）

### 4. 数据格式转换规则

#### 统一响应格式

```javascript
// 成功响应
{
  code: 200,
  data: { /* 数据内容 */ },
  message: "成功"
}

// 失败响应
{
  code: 400/401/403/500,
  message: "错误信息",
  data: null
}
```

#### 会员状态处理

所有返回用户信息的接口必须包含会员状态：

```javascript
// 确保返回会员状态
const userInfo = {
  ...coreUserInfo,
  usersSecret: [{
    vipStatus: coreUserInfo.vipStatus || false,
    vipStartTime: coreUserInfo.vipStartTime || 0,
    vipEndTime: coreUserInfo.vipEndTime || 0,
    vipConfig: coreUserInfo.vipConfig || {}
  }]
};
```

### 5. 错误处理规则

```javascript
// 使用统一的错误处理
const { error } = require('../utils/response');

// 参数错误
if (!requiredParam) {
  return error(400, "缺少必需参数");
}

// 权限错误
if (!hasPermission) {
  return error(403, "无权限");
}

// 业务错误
if (businessError) {
  return error(400, "业务错误信息");
}

// 服务器错误
try {
  // 业务逻辑
} catch (err) {
  console.error('error:', err);
  return error(500, err.message || '服务器错误');
}
```

---

## 测试要求

### 1. 单元测试

每个云函数需要测试：
- 参数校验
- 正常流程
- 异常情况
- 错误处理

### 2. 集成测试

- 测试与核心层云函数的调用
- 测试数据格式转换
- 测试错误处理

### 3. 端到端测试

- 测试app客户端调用
- 测试完整业务流程
- 测试会员状态同步

### 4. 测试环境

- 所有测试在测试环境进行
- 使用测试数据库
- 不影响生产环境

---

## 部署要求

### 1. 环境配置

- **部署环境**：测试环境
- **云函数名称**：`appApi`
- **Node版本**：根据项目要求

### 2. 部署步骤

1. 在测试环境部署`appApi`云函数
2. 确保所有依赖已安装
3. 配置环境变量（如需要）
4. 测试部署后的功能
5. 验证与app客户端的集成

### 3. 版本控制

- 使用Git管理代码
- 每个功能独立分支
- 代码审查后合并
- 记录版本变更

---

## 开发优先级总结

### P0 - 必须实现（第一阶段）

1. `appGetDynList` - 首页核心功能
2. `appGetDynDetail` - 动态详情核心功能
3. `appPublishDyn` - 发布动态核心功能
4. `appGetCurrentUserProfile` - 个人中心核心功能
5. `appGetUserProfile` - 用户主页核心功能
6. `appGetUserDynList` - 用户动态列表
7. `appUploadImage` - 图片上传
8. `appLikeDyn` - 点赞功能
9. `appChargeDyn` - 充电功能
10. `appChargeUser` - 给用户充电

### P1 - 重要功能（第二阶段）

1. 用户相关扩展功能（更新信息、列表查询等）
2. 圈子相关功能
3. 搜索功能
4. 消息接口统一

### P2 - 可选功能（第三阶段）

1. 管理员功能
2. 地址管理
3. 其他辅助功能

---

## 注意事项

1. **严格遵守架构规则**：不传递source参数，保持核心层纯净
2. **参数标准化**：所有调用核心层的接口必须标准化参数
3. **会员状态**：所有返回用户信息的接口必须包含会员状态
4. **错误处理**：统一错误码和错误信息格式
5. **测试环境**：所有云函数代码部署在测试环境中
6. **代码审查**：每个功能开发完成后进行代码审查
7. **文档更新**：开发完成后更新相关文档

---

## 文档更新记录

- 2026-01-12: 创建开发计划文档
- 2026-01-12: 基于App页面云函数梳理文档生成开发计划
