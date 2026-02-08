# Content-Type 修复指南

## 🔍 当前状态

验证结果显示：
- **默认域名**: Content-Type 仍然是 `application/octet-stream` ❌
- **文件存在**: ✅ 文件可以访问（HTTP 200）
- **文件内容**: ✅ JSON 内容正确

## ⚠️ 问题分析

虽然你在 COS 控制台修改了 Content-Type，但可能：
1. **CDN 缓存未刷新**：修改后需要等待几分钟
2. **修改位置不对**：可能修改了其他文件或位置
3. **修改未保存**：需要确认修改已保存

## ✅ 解决方案

### 方法一：等待 CDN 缓存刷新（推荐先尝试）

1. **等待 5-10 分钟**
   - CDN 缓存通常会自动刷新
   - 可以尝试清除浏览器缓存

2. **验证是否生效**
   ```bash
   curl -I https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association | grep -i content-type
   ```
   
   应该看到：`content-type: application/json`

### 方法二：重新上传文件（如果方法一不行）

#### 步骤 1：删除旧文件

在 COS 控制台：
1. 找到文件：`.well-known/apple-app-site-association`
2. 点击"删除"

#### 步骤 2：重新上传并设置 Content-Type

1. 点击"上传"按钮
2. 选择本地文件：`JUQI-APP/juqi/apple-app-site-association`
3. **重要**：在上传对话框中，找到"高级设置"或"元数据设置"
4. 设置 `Content-Type` 为：`application/json`
5. 上传到路径：`.well-known/apple-app-site-association`

#### 步骤 3：验证

等待 1-2 分钟后验证：
```bash
curl -I https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association | grep -i content-type
```

### 方法三：使用临时 JSON 文件（如果上传时无法设置 Content-Type）

如果上传时无法设置 Content-Type，可以：

1. **上传带扩展名的文件**
   - 上传 `apple-app-site-association.json` 到 `.well-known/apple-app-site-association.json`
   - 带 `.json` 扩展名的文件会自动识别为 `application/json`

2. **然后重命名或复制**
   - 在 COS 控制台复制文件
   - 将 `.well-known/apple-app-site-association.json` 复制为 `.well-known/apple-app-site-association`
   - 或者删除旧文件，将 JSON 文件重命名为无扩展名

## 🔍 验证步骤

### 1. 验证 Content-Type

```bash
curl -I https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association | grep -i content-type
```

**预期结果**: `content-type: application/json`

### 2. 验证浏览器访问

在浏览器中访问：
```
https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association
```

**预期结果**: 
- ✅ 直接显示 JSON 内容
- ❌ 不应该提示下载

### 3. 验证文件内容

```bash
curl -s https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association
```

**预期内容**:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "CRP77P4D8P.com.seven.juqi",
        "paths": [
          "/app/*"
        ]
      }
    ]
  }
}
```

## 📝 当前验证结果

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 文件可访问 | ✅ | HTTP 200 |
| 文件内容 | ✅ | JSON 格式正确 |
| Content-Type | ❌ | 仍然是 `application/octet-stream` |
| 浏览器显示 | ❌ | 可能提示下载 |

## 🚀 推荐操作

1. **先等待 5-10 分钟**，看 CDN 缓存是否自动刷新
2. **如果仍然不对**，重新上传文件并确保在上传时设置 Content-Type
3. **验证修改是否生效**

## ⚠️ 重要提示

1. **Apple 的要求**：Content-Type 必须是 `application/json` 或 `text/plain`，否则 Universal Links 可能无法正常工作
2. **CDN 缓存**：修改后需要等待几分钟让 CDN 缓存刷新
3. **测试**：修改后建议在浏览器中直接访问验证，确保显示 JSON 而不是下载

## 🔗 相关链接

- **COS 控制台**: https://console.cloud.tencent.com/cos/bucket?bucket=a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640&region=ap-shanghai
- **默认域名**: https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association
