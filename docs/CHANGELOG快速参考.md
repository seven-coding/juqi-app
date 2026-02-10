# CHANGELOG 快速参考

> 每次更新，都补充下更新记录 📝

## 快速开始

### 1. 更新 CHANGELOG

```bash
# 编辑 CHANGELOG.md，在 [未发布 / Unreleased] 部分添加你的变更
vim CHANGELOG.md
```

或使用辅助工具：

```bash
./scripts/update-changelog.sh
```

### 2. 选择变更类型

| 类型 | 使用场景 |
|------|---------|
| 新增 (Added) | 新功能、新文件 |
| 变更 (Changed) | 功能改进、修改 |
| 修复 (Fixed) | Bug修复 |
| 移除 (Removed) | 删除功能 |
| 弃用 (Deprecated) | 即将移除 |
| 安全 (Security) | 安全修复 |
| 待完成 (Pending) | 未完成工作 |

### 3. 编写示例

```markdown
## [未发布 / Unreleased]

### 新增 (Added)
- iOS: 评论功能支持图片上传
- appApi: 新增 `appCommentDyn` 接口

### 变更 (Changed)
- PostDetailView: 优化评论加载性能

### 修复 (Fixed)
- 修复评论点赞状态不同步问题
```

### 4. 提交代码

```bash
git add .
git commit -m "feat: 添加评论功能"
git push
```

## 完整文档

- 📖 [CHANGELOG.md](../CHANGELOG.md) - 更新日志
- 📋 [CHANGELOG模板.md](./CHANGELOG模板.md) - 更新模板
- 📚 [更新记录管理指南.md](./更新记录管理指南.md) - 详细指南
- 🛠️ [开发指南.md](./开发指南.md) - 开发规范

## 提交前检查

- [ ] 代码已测试通过
- [ ] CHANGELOG.md 已更新
- [ ] 变更描述清晰
- [ ] 使用了中英文双语
- [ ] 相关文档已更新

---

记住：**每次提交前更新 CHANGELOG** 📝
