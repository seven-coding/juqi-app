# App云函数开发计划修正总结

## 文档说明

本文档总结了在检查《App云函数开发计划.md》和《App云函数开发任务清单.md》过程中发现的问题及修正内容。

**检查日期**: 2026-01-12  
**检查范围**: 参数映射、路由配置、代码示例准确性

---

## 已修正的问题

### 1. 参数类型映射错误

**问题**: 多个云函数代码示例中使用了字符串类型的 `type` 参数，但核心层云函数需要数字类型。

**修正内容**:
- `appGetDynList`: 添加了 `typeMap` 映射，将字符串类型（'all', 'follow', 'circle', 'topic'）转换为数字（2, 6, 1, 5）
- `appSearchUser`: 修正为 `type: 1`（数字类型）
- `appSearchDyn`: 修正为 `type: 2`（数字类型）
- `appSearchTopic`: 修正为 `type: 3`（数字类型）
- `appGetUserDynList`: 确认使用 `type: 4`（数字类型）
- `appGetFavoriteList`: 确认使用 `type: 13`（数字类型）

### 2. 参数名称错误

**问题**: `appGetCircleDetail` 使用了错误的参数名 `circleId`。

**修正内容**:
- 修正为使用 `id` 参数（核心层 `getCircleDetail` 期望的参数名）

### 3. 缺少分页参数

**问题**: `appGetDynList` 缺少 `publicTime` 参数处理。

**修正内容**:
- 添加了 `publicTime` 参数解构
- 添加了 `publicTime` 条件判断和传递逻辑
- 在返回数据中添加了 `publicTime` 字段用于下次分页

### 4. 缺少路由配置

**问题**: `appJoinCircle` 和 `appQuitCircle` 未在 `appApi/index.js` 中配置路由。

**修正内容**:
- 已在 `appApi/index.js` 第147行添加了 `appJoinCircle` 和 `appQuitCircle` 的路由配置

### 5. 用户资料获取逻辑不完整

**问题**: `appGetUserProfile` 仅使用 `getUserAbout` 无法获取完整的用户信息。

**修正内容**:
- 改为组合调用方式：
  1. 使用 `commonRequest` (method: 'get_user_info') 获取基本用户信息
  2. 使用 `getUserAbout` (type: 7) 获取关注/拉黑状态
- 确保返回会员状态（仅自己的信息）

### 6. 邀请相关函数参数错误

**问题**: `appGetInviteCode` 和 `appGetInviteCount` 使用了错误的 `type` 参数。

**修正内容**:
- `appGetInviteCode`: 使用 `type: 8`（发送/获取邀请码）
- `appGetInviteCount`: 使用 `type: 6`（获取用户其他信息，包含邀请数量）

### 7. 搜索话题逻辑不完整

**问题**: `appSearchTopic` 未处理无关键词的情况。

**修正内容**:
- 添加了条件判断：无 `keyword` 时调用 `getTopic` 获取话题列表
- 有 `keyword` 时调用 `getRearch` (type: 3) 搜索话题

---

## 验证结果

### ✅ 已确认正确的配置

1. **路由配置**: `appApi/index.js` 中所有操作的路由配置正确
2. **参数标准化**: 所有代码示例都遵循不传递 `source` 参数的原则
3. **错误处理**: 统一使用 `error()` 和 `success()` 函数
4. **会员状态**: 用户相关接口都包含了会员状态处理逻辑

### ✅ 架构规则遵守情况

- ✅ 版本控制方案：业务版本层与核心层分离
- ✅ 参数标准化：所有参数都正确转换
- ✅ 数据格式转换：响应格式统一
- ✅ 错误处理：统一错误码和格式
- ✅ 环境配置：明确使用测试环境

---

## 待开发功能清单

### 第一阶段（P0）- 核心功能

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
- [ ] `appBlackUser` / `appUnblackUser` - 拉黑/取消拉黑

#### upload模块
- [ ] `appUploadImage` - 上传图片

### 第二阶段（P1）- 重要功能

#### user模块扩展
- [ ] `appUpdateUserInfo` - 更新用户信息
- [ ] `appGetChargeList` - 获取充电列表
- [ ] `appGetFavoriteList` - 获取收藏列表
- [ ] `appGetBlackList` - 获取黑名单
- [ ] `appGetInviteCode` / `appGetInviteCount` - 邀请相关
- [ ] `appUpdateVipConfig` - 更新VIP配置

#### circle模块
- [ ] `appGetCircleList` - 获取圈子列表
- [ ] `appGetCircleDetail` - 获取圈子详情
- [ ] `appJoinCircle` / `appQuitCircle` - 加入/退出圈子
- [ ] `appCreateTopic` - 创建话题
- [ ] `appSearchTopic` - 搜索话题

#### search模块
- [ ] `appSearchUser` - 搜索用户
- [ ] `appSearchDyn` - 搜索动态
- [ ] `appSearchTopic` - 搜索话题

### 第三阶段（P1）- 架构优化

#### message模块
- [ ] `appGetMessageList` - 获取消息列表
- [ ] `appSetMessage` - 设置消息状态
- [ ] 修改app客户端代码，统一消息接口调用

---

## 开发建议

### 1. 开发顺序

建议按照以下顺序开发：
1. **第一阶段（P0）**: 优先实现核心功能，确保app基础流程可用
2. **第二阶段（P1）**: 完善功能，提升用户体验
3. **第三阶段（架构优化）**: 统一消息接口，优化架构

### 2. 测试重点

- **参数类型**: 确保所有 `type` 参数使用正确的数字类型
- **分页功能**: 测试 `publicTime` 分页逻辑
- **组合调用**: 测试 `appGetUserProfile` 的组合调用逻辑
- **错误处理**: 测试各种异常情况

### 3. 注意事项

1. **严格遵守架构规则**: 不传递 `source` 参数给核心层
2. **参数标准化**: 所有参数必须转换为核心层标准格式
3. **会员状态**: 用户信息接口必须包含会员状态（仅自己的信息）
4. **测试环境**: 所有代码部署在测试环境
5. **向后兼容**: 确保不影响小程序功能

---

## 文档状态

- ✅ **App云函数开发计划.md**: 已修正，可直接使用
- ✅ **App云函数开发任务清单.md**: 已修正，可直接使用
- ✅ **appApi/index.js**: 路由配置正确

---

## 更新记录

- 2026-01-12: 创建修正总结文档
- 2026-01-12: 修正所有发现的问题
- 2026-01-12: 验证路由配置和参数映射
