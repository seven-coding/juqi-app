# 更新日志 / Changelog

本文档记录 JUQI iOS App 项目的所有重要更新和变更。

All notable changes to the JUQI iOS App project will be documented in this file.

更新格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [未发布 / Unreleased]

### 新增 (Added)
- 项目根目录：创建 CHANGELOG.md 更新日志文件
- 文档：CHANGELOG模板.md - 更新记录模板和快速参考
- 文档：更新记录管理指南.md - 完整的更新记录管理体系说明
- 脚本：update-changelog.sh - CHANGELOG 更新辅助工具
- 消息：不看TA、不让TA看、未访问列表视图（NoSeeListView、NoSeeMeListView、NoVisitListView）
- 圈子：CircleItem 模型
- 文档：今日AI请求、日复盘、版本与进度、消息页架构审查、用户头像取数、电站与话题页、帖子详情UI对比等
- 脚本：复盘与导出相关 scripts

### 变更 (Changed)
- README.md: 添加更新日志链接，强调更新记录的重要性
- 开发指南.md: 新增"更新记录管理"章节，详细说明 CHANGELOG 维护规范
- 首页：HomeView、HomeViewModel 与动态列表联调
- 发现：DiscoverView 与 getRearch、search 模块对接
- 帖子详情：PostDetailView、CircleDetailView、TopicDetailView、UserProfileView、RepostSheetView、RichTextView 与 getDynDetail
- 消息：MessageView、MessageViewModel、VisitorMessageView
- 个人页：ProfileView、UserProfileView、getUserAbout/getOperateAction
- 发布：PublishView、PostCardView
- 登录/账号：AuthService、appApi/modules/auth
- appApi/云函数：search、user、circle、dyn 模块扩展；getDynsListV2、getDynDetail、getRearch 联调
- 文档：App接口文档更新
- 部署：deploy-all、run-full-deploy、env 配置；删除 .env.example、setMessage/deploy.zip

### 修复 (Fixed)
- 待补充

### 待完成 (Pending)
- 帖子详情：评论列表与接口联调（一级/二级、点赞、图片）
- 帖子详情：评论输入与提交联调（一级/二级评论、评论图片上传）

---

## [0.1.0] - 2025-02-10

### 新增 (Added)
- 项目初始结构创建
- 接口文档体系建立
  - App接口文档（34个接口）
  - 接口架构设计文档
  - 接口清单确认文档
  - 接口映射关系文档
- 云函数开发
  - appApi 统一入口云函数
  - 用户认证模块 (auth)
  - 用户信息模块 (user)
  - 动态模块 (dyn)
  - 圈子模块 (circle)
  - 消息模块 (message)
  - 搜索模块 (search)
  - 上传模块 (upload)
  - Token验证机制
  - 统一响应格式
- iOS App 核心功能
  - 微信登录功能
  - Token 管理
  - 首页（动态列表）
  - 发现页
  - 动态详情页
  - 发布动态页
  - 用户主页（自己/他人）
  - 消息页面
  - 访客消息功能

### 变更 (Changed)
- 项目文档结构优化
- 开发指南完善

### 技术细节 (Technical)
- **总接口数**: 34个
- **需要Token**: 31个
- **无需Token**: 3个
- **返回会员状态**: 4个

### 接口分类
1. 用户认证类: 3个接口
2. 用户信息类: 4个接口
3. 动态类: 7个接口
4. 圈子类: 5个接口
5. 消息类: 5个接口
6. 搜索类: 3个接口
7. 文件上传类: 2个接口
8. 其他功能类: 5个接口

---

## 版本说明 (Version Notes)

### 版本号规则
- **主版本号 (Major)**: 重大功能更新或架构变更
- **次版本号 (Minor)**: 新功能添加
- **修订号 (Patch)**: Bug修复和小改进

### 更新类型说明
- **新增 (Added)**: 新功能、新文件、新模块
- **变更 (Changed)**: 现有功能的修改或改进
- **修复 (Fixed)**: Bug修复
- **移除 (Removed)**: 删除的功能或文件
- **弃用 (Deprecated)**: 即将移除的功能
- **安全 (Security)**: 安全相关的修复或改进
- **待完成 (Pending)**: 计划中但未完成的功能

---

## 如何更新此文档 (How to Update)

每次提交代码前，请按照以下步骤更新 CHANGELOG.md：

1. **确定版本号**
   - 如果是bug修复：增加修订号（如 0.1.0 → 0.1.1）
   - 如果是新功能：增加次版本号（如 0.1.0 → 0.2.0）
   - 如果是重大更新：增加主版本号（如 0.1.0 → 1.0.0）

2. **记录变更**
   - 在 `[未发布 / Unreleased]` 部分添加变更
   - 按类型分类：新增、变更、修复等
   - 描述要清晰、具体

3. **发布新版本时**
   - 将 `[未发布 / Unreleased]` 的内容移到新版本号下
   - 添加发布日期
   - 创建新的 `[未发布 / Unreleased]` 部分

4. **编写规范**
   - 使用中英文双语
   - 每条变更一行
   - 简洁明了，突出重点
   - 必要时可添加链接或引用

### 示例 (Example)

```markdown
## [未发布 / Unreleased]

### 新增 (Added)
- 用户设置页面
- 夜间模式支持

### 修复 (Fixed)
- 修复登录页面崩溃问题
- 修复图片上传失败问题

## [0.2.0] - 2025-02-15

### 新增 (Added)
- 评论功能完整实现
- 点赞和充电动画效果

### 变更 (Changed)
- 优化首页加载速度
- 改进错误提示信息
```

---

## 相关文档 (Related Documents)

- [版本与进度](./docs/版本与进度.md) - 功能清单与完成状态
- [日复盘](./docs/日复盘.md) - 每日工作总结
- [App接口文档](./docs/App接口文档.md) - 接口定义和说明
- [开发指南](./docs/开发指南.md) - 开发流程和规范
