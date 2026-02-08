# App页面云函数梳理

## 文档说明

本文档梳理iOS/Android原生app页面中涉及的云函数，按页面进行分类列举。所有云函数通过`appApi`云函数统一入口调用，部署在测试环境中。

## 架构说明

### 架构原则（严格按照App接口文档）

- **版本控制方案**：业务版本层处理所有App特有逻辑，核心层保持纯净
- **完全隔离**：所有App接口通过`appApi`云函数统一入口，与小程序完全隔离
- **参数标准化**：App版本通过Token解析openId，核心层统一接收标准化参数
- **不传递source参数**：核心层不区分调用来源，专注于核心业务逻辑
- **数据格式转换**：版本层负责将核心层返回转换为App所需格式

### 调用流程

- App通过`apiServer`统一调用`appApi`云函数
- 所有app接口的operation都以`app`开头（如`appLogin`、`appGetDynList`等）
- `appApi`云函数根据operation路由到对应的模块（auth/user/dyn/circle/message/search/upload）
- 版本层（modules）处理参数标准化，调用核心层云函数
- 核心层云函数不接收source参数，保持纯净

### 环境说明

- **云函数部署环境**：测试环境
- 所有云函数代码部署在测试环境中进行开发和测试

---

## App页面列表（基于Views目录）

### 1. 认证相关页面

#### LoginView - 登录页面
- **云函数**: `appLogin`
- **用途**: 用户登录，支持微信登录和手机号登录
- **调用位置**: `AuthService.swift`

#### LanguageVerifyView - 语言验证页面
- **云函数**: `appSubmitLanguageVerify`
- **用途**: 提交语言验证
- **调用位置**: `Views/Auth/LanguageVerifyView.swift`

#### VerifyProgressView - 验证进度页面
- **云函数**: `appGetVerifyStatus`
- **用途**: 获取验证状态
- **调用位置**: `Views/Auth/VerifyProgressView.swift`

#### TrialPeriodView - 试用期页面
- **云函数**: （可能调用用户信息相关接口）
- **用途**: 显示试用期信息

---

### 2. 首页相关

#### HomeView - 首页
- **云函数**: `appGetDynList`
- **用途**: 获取动态列表（支持type: all/follow/circle/topic等）
- **调用位置**: `Models/HomeViewModel.swift`
- **说明**: 支持多个分类切换，每个分类独立维护数据状态

#### DiscoverView - 发现页
- **云函数**: 
  - `appGetDynList` - 获取动态列表
  - `appGetTopicList` - 获取话题列表
  - `appSearchTopic` - 搜索话题
- **用途**: 发现页展示动态和话题

---

### 3. 动态相关

#### PostDetailView - 动态详情页
- **云函数**: 
  - `appGetDynDetail` - 获取动态详情
  - `appGetDynComment` - 获取评论列表
  - `appLikeDyn` - 点赞动态
  - `appCommentDyn` - 评论动态
  - `appLikeComment` - 点赞评论
  - `appDeleteComment` - 删除评论
  - `appRepostDyn` - 转发动态
  - `appChargeDyn` - 充电动态
  - `appFollowUser` / `appUnfollowUser` - 关注/取消关注
- **用途**: 查看动态详情、评论、点赞、转发、充电等操作
- **调用位置**: `Views/Details/PostDetailView.swift`, `Views/PostCardView.swift`

#### PublishView - 发布动态页
- **云函数**: 
  - `appGetCircleList` - 获取圈子列表
  - `appGetTopicList` - 获取话题列表
  - `appSearchTopic` - 搜索话题
  - `appCreateTopic` - 创建话题
  - `appUploadImage` - 上传图片
  - `appPublishDyn` - 发布动态
- **用途**: 发布新动态，支持选择圈子、话题、上传图片等
- **调用位置**: `Views/PublishView.swift`

#### FavoriteListView - 收藏列表页
- **云函数**: 
  - `appGetFavoriteList` - 获取收藏列表
  - `appGetDynDetail` - 获取动态详情（点击查看）
- **用途**: 查看收藏的动态列表

---

### 4. 用户相关

#### UserProfileView - 用户主页
- **云函数**: 
  - `appGetUserProfile` - 获取用户主页信息
  - `appGetUserDynList` - 获取用户动态列表
  - `appGetUserFollowStatus` - 获取关注状态
  - `appFollowUser` / `appUnfollowUser` - 关注/取消关注
  - `appChargeUser` - 给用户充电
  - `appBlackUser` / `appUnblackUser` - 拉黑/取消拉黑
- **用途**: 查看用户主页、动态列表、关注、充电、拉黑等操作
- **调用位置**: `Views/Details/UserProfileView.swift`

#### ProfileView - 个人中心页
- **云函数**: 
  - `appGetCurrentUserProfile` - 获取当前用户信息
  - `appGetUserDynList` - 获取自己的动态列表
  - `appGetUserList` - 获取关注/粉丝列表
  - `appGetChargeList` - 获取充电列表
  - `appGetFavoriteList` - 获取收藏列表
  - `appGetBlackList` - 获取拉黑列表
  - `appGetInviteCode` - 获取邀请码
  - `appGetInviteCount` - 获取邀请数量
  - `appUploadImage` - 上传头像
  - `appUpdateUserInfo` - 更新用户信息
- **用途**: 个人中心，查看和管理个人信息
- **调用位置**: `Views/ProfileView.swift`

#### UserListView - 用户列表页（关注/粉丝）
- **云函数**: 
  - `appGetUserList` - 获取用户列表（type: follows/followers）
- **用途**: 查看关注列表或粉丝列表

#### BlackListView - 黑名单页
- **云函数**: 
  - `appGetBlackList` - 获取黑名单
  - `appUnblackUser` - 取消拉黑
- **用途**: 查看和管理黑名单

#### ChargeListView - 充电列表页
- **云函数**: 
  - `appGetChargeList` - 获取充电列表
- **用途**: 查看被充电列表
- **调用位置**: `Views/ChargeListView.swift`

---

### 5. 圈子相关

#### CircleDetailView - 圈子详情页
- **云函数**: 
  - `appGetCircleDetail` - 获取圈子详情
  - `appGetDynList` - 获取圈子动态列表（type: circle）
  - `appJoinCircle` / `appQuitCircle` - 加入/退出圈子
- **用途**: 查看圈子详情和圈子内的动态

#### TopicDetailView - 话题详情页
- **云函数**: 
  - `appGetTopicDetail` - 获取话题详情
  - `appGetTopicDynList` - 获取话题动态列表
- **用途**: 查看话题详情和话题下的动态
- **调用位置**: `Views/Details/TopicDetailView.swift`

---

### 6. 消息相关

#### MessageView - 消息首页
- **云函数**: 
  - `getMessagesNew` - 获取消息列表（通过NetworkService直接调用，operation: "getMessagesNew"）
  - `setMessage` - 设置消息状态（已读/删除，通过NetworkService直接调用，operation: "setMessage"）
- **用途**: 消息首页，显示所有消息列表
- **调用位置**: `Models/MessageViewModel.swift`
- **说明**: 注意这里直接调用`getMessagesNew`和`setMessage`，不是`appGetMessageList`和`appSetMessage`

#### MessageDetailView - 消息详情页（包含聊天功能）
- **云函数**: 
  - `getMessagesNew` - 获取消息详情（指定from和type，通过NetworkService直接调用）
  - `setMessage` - 设置消息状态（已读/删除）
- **用途**: 查看消息详情和发送聊天消息，输入栏已集成在页面中
- **调用位置**: `Models/MessageCategoryViewModel.swift`, `Views/Messages/MessageDetailView.swift`
- **说明**: 此页面同时支持查看消息详情和发送聊天消息，ChatMessageView是消息展示组件，不是独立页面

#### ChargeMessageView - 充电消息页
- **云函数**: 
  - `getMessagesNew` - 获取充电消息（type: 充电类型，通过NetworkService直接调用）
- **用途**: 查看充电相关消息
- **调用位置**: `Views/Messages/ChargeMessageView.swift`

#### CommentMessageView - 评论消息页
- **云函数**: 
  - `getMessagesNew` - 获取评论消息（type: 评论类型，通过NetworkService直接调用）
- **用途**: 查看评论相关消息
- **调用位置**: `Views/Messages/CommentMessageView.swift`

#### AtMessageView - 艾特消息页
- **云函数**: 
  - `getMessagesNew` - 获取艾特消息（type: 艾特类型，通过NetworkService直接调用）
- **用途**: 查看@我的消息
- **调用位置**: `Views/Messages/AtMessageView.swift`

#### VisitorMessageView - 访客消息页
- **云函数**: 
  - `getMessagesNew` - 获取访客消息（type: 访客类型，通过NetworkService直接调用）
- **用途**: 查看访客消息
- **调用位置**: `Views/Messages/VisitorMessageView.swift`

---

### 7. 搜索相关

#### SearchView - 搜索页
- **云函数**: 
  - `appSearchUser` - 搜索用户
  - `appSearchDyn` - 搜索动态
  - `appSearchTopic` - 搜索话题
- **用途**: 搜索用户、动态、话题
- **调用位置**: `Networking/APIService.swift`

---

### 8. 设置相关

#### SettingsView - 设置页
- **云函数**: 
  - `appGetCurrentUserProfile` - 获取当前用户信息
  - `appUpdateUserInfo` - 更新用户信息
  - `appUpdateVipConfig` - 更新VIP配置
- **用途**: 设置页面，更新用户信息和VIP配置

#### PersonalizationSettingsView - 个性化设置页
- **云函数**: 
  - `appUpdateUserInfo` - 更新用户信息
  - `appUpdateVipConfig` - 更新VIP配置
- **用途**: 个性化设置

---

### 9. 其他页面

#### VipView - VIP页面
- **云函数**: （可能需要VIP相关接口，但当前文档未列出）
- **用途**: VIP相关功能

#### QRCodeView - 二维码页
- **云函数**: 
  - `appGetUserProfile` - 获取用户信息（用于生成二维码）
  - `appGetInviteCode` - 获取邀请码
- **用途**: 显示用户二维码和邀请码
- **调用位置**: `Views/QRCodeView.swift`

#### InviteFriendsView - 邀请好友页
- **云函数**: 
  - `appGetInviteCode` - 获取邀请码
  - `appGetInviteCount` - 获取邀请数量
- **用途**: 邀请好友功能

---

## 云函数汇总（按模块分类）

### auth模块（认证相关）

| 云函数 | 用途 | 调用页面 |
|--------|------|----------|
| `appLogin` | 登录 | LoginView |
| `appGetUserInfo` | 获取用户信息 | AuthService, UserStatusService |
| `appRefreshToken` | 刷新Token | （自动调用） |
| `appSubmitLanguageVerify` | 提交语言验证 | LanguageVerifyView |
| `appGetVerifyStatus` | 获取验证状态 | VerifyProgressView |

### user模块（用户相关）

| 云函数 | 用途 | 调用页面 |
|--------|------|----------|
| `appGetCurrentUserProfile` | 获取当前用户信息 | ProfileView, UserProfileView |
| `appGetUserProfile` | 获取用户主页信息 | UserProfileView, QRCodeView |
| `appUpdateUserInfo` | 更新用户信息 | ProfileView, SettingsView, PersonalizationSettingsView |
| `appFollowUser` | 关注用户 | UserProfileView, PostDetailView |
| `appUnfollowUser` | 取消关注 | UserProfileView, PostDetailView |
| `appGetUserFollowStatus` | 获取关注状态 | UserProfileView |
| `appGetUserList` | 获取用户列表（关注/粉丝） | ProfileView, UserListView |
| `appGetUserDynList` | 获取用户动态列表 | UserProfileView, ProfileView |
| `appChargeUser` | 给用户充电 | UserProfileView |
| `appBlackUser` | 拉黑用户 | UserProfileView |
| `appUnblackUser` | 取消拉黑 | UserProfileView, BlackListView |
| `appSetUserStatus` | 设置用户状态（管理员） | （管理员功能） |
| `appGetUserActionHistory` | 获取用户操作记录（管理员） | （管理员功能） |
| `appSetUserAuth` | 设置用户标签（管理员） | （管理员功能） |
| `appGetChargeList` | 获取充电列表 | ProfileView, ChargeListView |
| `appGetFavoriteList` | 获取收藏列表 | ProfileView, FavoriteListView |
| `appGetBlackList` | 获取黑名单 | ProfileView, BlackListView |
| `appGetInviteCode` | 获取邀请码 | ProfileView, QRCodeView, InviteFriendsView |
| `appGetInviteCount` | 获取邀请数量 | ProfileView, InviteFriendsView |
| `appSaveAddress` | 保存收货地址 | （地址管理） |
| `appUpdateVipConfig` | 更新VIP配置 | SettingsView, PersonalizationSettingsView |

### dyn模块（动态相关）

| 云函数 | 用途 | 调用页面 |
|--------|------|----------|
| `appGetDynList` | 获取动态列表 | HomeView, DiscoverView, CircleDetailView |
| `appGetDynDetail` | 获取动态详情 | PostDetailView, FavoriteListView |
| `appPublishDyn` | 发布动态 | PublishView |
| `appDeleteDyn` | 删除动态 | PostDetailView |
| `appLikeDyn` | 点赞动态 | PostDetailView, PostCardView |
| `appCommentDyn` | 评论动态 | PostDetailView |
| `appGetDynComment` | 获取评论列表 | PostDetailView |
| `appLikeComment` | 点赞评论 | PostDetailView |
| `appDeleteComment` | 删除评论 | PostDetailView |
| `appRepostDyn` | 转发动态 | PostDetailView, PostCardView |
| `appChargeDyn` | 充电动态 | PostDetailView, PostCardView |

### circle模块（圈子相关）

| 云函数 | 用途 | 调用页面 |
|--------|------|----------|
| `appGetCircleList` | 获取圈子列表 | PublishView |
| `appGetCircleDetail` | 获取圈子详情 | CircleDetailView |
| `appJoinCircle` | 加入圈子 | CircleDetailView |
| `appQuitCircle` | 退出圈子 | CircleDetailView |
| `appGetTopicList` | 获取话题列表 | DiscoverView, PublishView |
| `appGetTopicDetail` | 获取话题详情 | TopicDetailView |
| `appGetTopicDynList` | 获取话题动态列表 | TopicDetailView |
| `appCreateTopic` | 创建话题 | PublishView |
| `appSearchTopic` | 搜索话题 | DiscoverView, PublishView, SearchView |

### message模块（消息相关）

| 云函数 | 用途 | 调用页面 | 说明 |
|--------|------|----------|------|
| `getMessagesNew` | 获取消息列表 | MessageView, MessageDetailView, ChargeMessageView, CommentMessageView, AtMessageView, VisitorMessageView | 注意：直接调用核心层云函数，不是appGetMessageList |
| `setMessage` | 设置消息状态（已读/删除） | MessageView, MessageDetailView | 注意：直接调用核心层云函数，不是appSetMessage |

**重要说明**：消息相关的接口目前直接调用核心层云函数`getMessagesNew`和`setMessage`，而不是通过`appApi`的`appGetMessageList`和`appSetMessage`。这需要在后续开发中统一为通过`appApi`调用。

### search模块（搜索相关）

| 云函数 | 用途 | 调用页面 |
|--------|------|----------|
| `appSearchUser` | 搜索用户 | SearchView |
| `appSearchDyn` | 搜索动态 | SearchView |
| `appSearchTopic` | 搜索话题 | SearchView |

### upload模块（上传相关）

| 云函数 | 用途 | 调用页面 |
|--------|------|----------|
| `appUploadImage` | 上传图片 | PublishView, ProfileView |

---

## 云函数调用方式说明

### 1. 通过appApi调用（标准方式）

大部分接口通过`appApi`云函数调用：

```swift
// 示例：获取动态列表
let response = try await NetworkService.shared.request(
    operation: "appGetDynList",
    data: [
        "type": "all",
        "page": 1,
        "limit": 20
    ]
)
```

### 2. 直接调用核心层云函数（需要统一）

消息相关接口目前直接调用核心层云函数：

```swift
// 示例：获取消息列表（当前方式，需要统一）
let response: MessageListResponse = try await NetworkService.shared.request(
    operation: "getMessagesNew",  // 直接调用核心层
    data: [
        "page": 1,
        "limit": 20
    ]
)
```

**建议**：后续统一为通过`appApi`调用，即使用`appGetMessageList`和`appSetMessage`。

---

## 架构实现要求

### 版本层（appApi/modules）职责

1. **参数标准化**
   - 通过Token解析openId
   - 将App参数转换为核心层标准格式
   - 不传递source参数

2. **数据格式转换**
   - 将核心层返回转换为App所需格式
   - 处理会员状态等App特有字段

3. **错误处理**
   - 统一错误格式
   - 错误码映射

### 核心层云函数要求

1. **保持纯净**
   - 不接收source参数
   - 不区分调用来源
   - 专注于核心业务逻辑

2. **参数标准化**
   - 统一接收openId等标准参数
   - 不关心参数来源

---

## 环境配置

- **云函数部署环境**：测试环境
- **云函数名称**：`appApi`
- **调用入口**：`apiServer`（NestJS后端）
- **路由规则**：根据operation前缀路由到对应模块

---

## 注意事项

1. **消息接口统一**：当前消息相关接口直接调用核心层，建议后续统一为通过`appApi`调用
2. **参数标准化**：所有调用核心层的接口必须标准化参数，不传递source
3. **会员状态**：所有返回用户信息的接口必须包含会员状态
4. **错误处理**：统一错误码和错误信息格式
5. **测试环境**：所有云函数代码部署在测试环境中

---

## 文档更新记录

- 2026-01-12: 创建文档，梳理app页面云函数调用关系
- 2026-01-12: 明确架构规则和测试环境要求
- 2026-01-12: 标注消息接口需要统一为通过appApi调用
