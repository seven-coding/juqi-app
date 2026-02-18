# JUQI-APP 云函数

## 版本信息

- **版本**: 2.0.0
- **环境**: 测试环境 (test-juqi-3g1m5qa7cc2737a1)
- **更新日期**: 2026-01-15
- **说明**: App 云函数全部在本项目内单独实现，**不依赖、不共用** JUQI-小程序 项目的云函数。

## 目录结构

```
cloudfunctions/
├── appApi/                   # 统一入口，由 apiServer 调用
├── getDynsListV2/           # 动态列表（广场/关注/话题/用户/收藏等）
├── getDynDetail/            # 动态详情
├── publishDyn/              # 发布动态
├── likeOrUnlikeV2/          # 点赞/充电
├── delDyn/                  # 删除动态
├── getMessagesNew/          # 消息列表
├── setMessage/              # 消息状态
├── getCircle/               # 圈子列表
├── getCircleDetail/         # 圈子详情
├── getTopic/                # 话题列表/详情
├── setTopic/                # 创建话题
├── setJoinCircle/           # 加入/退出圈子
├── getRearch/               # 搜索（用户/动态/话题/圈子）
├── login/                   # 登录
├── commonRequest/           # 通用请求（如黑名单等）
├── getUserAbout/            # 用户相关（邀请码等）
├── chargeHer/               # 充电
├── setUser/                 # 用户设置（拉黑等）
├── updateUserInfo/          # 更新用户信息
├── getUserList/             # 用户列表（关注/粉丝/充电/黑名单）
├── setUserInfo/             # 用户信息设置
└── cloudbaserc.json         # 部署配置
```

## 架构说明

### 架构规则

1. **独立实现**: 所有被 appApi 调用的「核心层」云函数均在本目录内实现，部署时仅使用本项目的云函数，**不与小程序共用**。
2. **参数标准化**: 通过 Token 解析 openId，appApi 向各云函数传递标准化参数。
3. **错误码**: 200 成功，400 参数错误，401 未登录，403 无权限，500 服务器错误。

### 调用流程

```
App 客户端 → apiServer → appApi 云函数 → 本目录内各云函数（getDynsListV2 / getDynDetail / …）→ 数据库
```

## 已实现接口

### auth模块（认证相关）

| 接口 | 函数名 | 说明 |
|------|--------|------|
| appLogin | Login | App登录 |
| appGetUserInfo | GetUserInfo | 获取用户信息 |
| appRefreshToken | RefreshToken | 刷新Token |
| appSubmitLanguageVerify | SubmitLanguageVerify | 提交语言验证 |
| appGetVerifyStatus | GetVerifyStatus | 获取审核状态 |

### user模块（用户相关）

| 接口 | 函数名 | 核心层 | 说明 |
|------|--------|--------|------|
| appGetCurrentUserProfile | GetCurrentUserProfile | login (getOwnInfo) | 获取当前用户信息 |
| appGetUserProfile | GetUserProfile | commonRequest + getUserAbout | 获取用户主页信息 |
| appGetUserDynList | GetUserDynList | getDynsListV2 (type=4) | 获取用户动态列表 |
| appChargeUser | ChargeUser | chargeHer | 给用户充电 |
| appBlackUser | BlackUser | setUser (type=1) | 拉黑用户 |
| appUnblackUser | UnblackUser | setUser (type=2) | 取消拉黑 |
| appFollowUser | FollowUser | - | 关注用户 |
| appUnfollowUser | UnfollowUser | - | 取消关注 |
| appGetUserFollowStatus | GetUserFollowStatus | - | 获取关注状态 |
| appGetUserList | GetUserList | - | 获取用户列表 |
| appUpdateUserInfo | UpdateUserInfo | updateUserInfo | 更新用户信息 |
| appGetChargeList | GetChargeList | getUserList (type='charging') | 获取充电列表 |
| appGetFavoriteList | GetFavoriteList | getDynsListV2 (type=13) | 获取收藏列表 |
| appGetBlackList | GetBlackList | getUserList (type='black') | 获取黑名单 |
| appGetInviteCode | GetInviteCode | getUserAbout (type=8) | 获取邀请码 |
| appGetInviteCount | GetInviteCount | getUserAbout (type=6) | 获取邀请数量 |
| appUpdateVipConfig | UpdateVipConfig | setUserInfo | 更新VIP配置 |

### dyn模块（动态相关）

| 接口 | 函数名 | 核心层 | 说明 |
|------|--------|--------|------|
| appGetDynList | GetDynList | getDynsListV2 | 获取动态列表 |
| appGetDynDetail | GetDynDetail | getDynDetail | 获取动态详情 |
| appPublishDyn | PublishDyn | publishDyn | 发布动态 |
| appLikeDyn | LikeDyn | likeOrUnlikeV2 (type=1) | 点赞动态 |
| appChargeDyn | ChargeDyn | likeOrUnlikeV2 (type=2) | 充电动态 |
| appDeleteDyn | DeleteDyn | delDyn (type=1) | 删除动态 |
| appGetDynComment | GetDynComment | - | 获取评论列表 |
| appCommentDyn | CommentDyn | - | 评论动态 |
| appLikeComment | LikeComment | - | 点赞评论 |
| appDeleteComment | DeleteComment | - | 删除评论 |
| appRepostDyn | RepostDyn | - | 转发动态 |

### circle模块（圈子相关）

| 接口 | 函数名 | 核心层 | 说明 |
|------|--------|--------|------|
| appGetCircleList | GetCircleList | getCircle | 获取圈子列表 |
| appGetCircleDetail | GetCircleDetail | getCircleDetail (id参数) | 获取圈子详情 |
| appJoinCircle | JoinCircle | setJoinCircle (type=1) | 加入圈子 |
| appQuitCircle | QuitCircle | setJoinCircle (type=2) | 退出圈子 |
| appGetTopicList | GetTopicList | getTopic | 获取话题列表 |
| appGetTopicDetail | GetTopicDetail | getTopic | 获取话题详情 |
| appGetTopicDynList | GetTopicDynList | getDynsListV2 (type=5) | 获取话题动态列表 |
| appCreateTopic | CreateTopic | setTopic | 创建话题 |

### search模块（搜索相关）

| 接口 | 函数名 | 核心层 | 说明 |
|------|--------|--------|------|
| appSearchUser | SearchUser | getRearch (type=1) | 搜索用户 |
| appSearchDyn | SearchDyn | getRearch (type=2) | 搜索动态 |
| appSearchTopic | SearchTopic | getRearch (type=3) / getTopic | 搜索话题 |
| appSearchCircle | SearchCircle | getRearch (type=4) | 搜索圈子 |

### message模块（消息相关）

| 接口 | 函数名 | 核心层 | 说明 |
|------|--------|--------|------|
| appGetMessageList | GetMessageList | getMessagesNew | 获取消息列表 |
| appSetMessage | SetMessage | setMessage | 设置消息状态 |
| appGetUnreadCount | GetUnreadCount | getMessagesNew | 获取未读消息数 |
| appMarkMessagesRead | MarkMessagesRead | setMessage | 批量标记已读 |

### upload模块（上传相关）

| 接口 | 函数名 | 说明 |
|------|--------|------|
| appUploadImage | UploadImage | 上传图片 |
| appUploadImages | UploadImages | 批量上传图片 |

## 关键参数映射

### getDynsListV2 type映射

| App类型 | 核心层type | 说明 |
|---------|-----------|------|
| 'all' | 2 | 广场/最新动态 |
| 'follow' | 6 | 关注动态 |
| 'circle' | 1 | 圈子动态 |
| 'topic' | 5 | 话题动态 |
| - | 4 | 用户动态 |
| - | 13 | 收藏列表 |

### getRearch type映射

| 搜索类型 | type值 |
|---------|--------|
| 用户 | 1 |
| 动态 | 2 |
| 话题 | 3 |
| 电站 | 4 |

## 部署说明

### 一键自动部署（推荐，无需手动上传）

在 `JUQI-APP/cloudfunctions` 目录下配置一次环境变量后，执行一条命令即可完成「补建缺失云函数 + 批量上传代码」，无需打开微信开发者工具或分步操作。

1. **配置**（任选其一）：
   - 复制 `.env.example` 为 `.env`，填写小程序与腾讯云密钥；或
   - 在终端 `export` 以下变量后再执行脚本。
2. **所需环境变量**（可写在 `apiServer/.env` 或 `cloudfunctions/.env`，脚本会自动加载）：
   - `TENCENT_SECRET_ID`、`TENCENT_SECRET_KEY`（或 apiServer 中的 `CLOUD_BASE_ID`、`CLOUD_BASE_KEY`）：腾讯云密钥，用于**补建**与**上传代码**，**无需小程序 AppID**（与测试环境其它云函数创建方式一致）。
   - 可选：若使用微信 Open API 补建，可配置 `WX_APPID`、`WX_SECRET`。
3. **执行**（默认测试环境）：
   - **最小部署（默认）**：仅部署 **git 有改动的云函数**，不补建、不部署未改动函数。
     ```bash
     cd JUQI-APP/cloudfunctions
     node run-full-deploy.js
     ```
   - **全量部署**：补建缺失云函数并部署全部。仅在明确需要时使用：
     ```bash
     node run-full-deploy.js full
     # 或
     DEPLOY_FULL=1 node run-full-deploy.js
     ```
   - **仅部署指定函数**：`DEPLOY_ONLY=getDynDetailV201,appApiV201 node run-full-deploy.js`
4. 仅部署本项目云函数，不依赖 JUQI-小程序。全量时才会先补建再按列表逐个上传；最小部署时只上传有改动的函数。

### 测试环境 V2 命名部署

测试环境可将所有云函数部署为带 `V2` 后缀的名称（如 `appApiV2`、`getMessagesNewV2`），与正式环境原名区分，便于同环境内测与正式隔离。

- **配置**：使用 `cloudbaserc.test.json`（已包含全部 xxxV2 函数名，getDynsListV2、likeOrUnlikeV2 保持不变）。
- **执行**：
  ```bash
  cd JUQI-APP/cloudfunctions
  DEPLOY_ENV=test node deploy-all.js
  ```
- **说明**：部署后 apiServer 会调用 `appApiV2`；各云函数内部通过 `TCB_ENV_ID` 判断环境，在测试环境中互调时使用 xxxV2 名称。正式环境仍使用 `cloudbaserc.json` 部署原名，小程序不受影响。

### 仅补建云函数（不上传代码）

若只需在环境中创建缺失的函数名（例如后续用微信开发者工具手动上传代码）：

```bash
cd JUQI-APP/cloudfunctions
# 配置 WX_APPID、WX_SECRET 或 ACCESS_TOKEN 后：
node wx-create-functions.js
```

### 手动部署（备选）

- 使用微信开发者工具：打开项目 → 云开发 → 云函数 → 右键各函数「上传并部署：云端安装依赖」。
- 环境 ID 见 `cloudbaserc.json`（当前为 `test-juqi-3g1m5qa7cc2737a1`）。建议先部署核心云函数（getDynsListV2、getDynDetail、login、getUserList 等），最后部署 appApi。

## 注意事项

1. 所有云函数部署在测试环境（envId 见 cloudbaserc.json）。
2. 参数类型必须正确（数字 vs 字符串）。
3. getCircleDetail 使用 id 参数，不是 circleId。
4. 返回用户信息时需包含会员状态。
5. getDynsListV2 内 dealBlackDyn 已对 openId 做防护，避免「查询参数对象值不能均为 undefined」。
6. **个人主页动态超时（appGetUserDynList / type=4）**：若出现 DATABASE_TIMEOUT，请在云开发控制台为 **dyn** 集合建立复合索引：`openId`(升序)、`dynStatus`(升序)、`isDelete`(升序)、`userTopTime`(降序)、`publicTime`(降序)，以加速 match+sort+limit 的 aggregate 查询。
