# Universal Links 配置说明

## ✅ 已完成的配置

### 1. apple-app-site-association 文件

已创建并上传到静态网站托管：
- **文件路径**: `.well-known/apple-app-site-association`
- **访问地址**: `https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association`
- **配置内容**:
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

### 2. AppDelegate 配置

已更新 `AppDelegate.swift`，Universal Link 设置为：
```swift
WXApi.registerApp(wechatAppID, universalLink: "https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/app/")
```

## 📋 在 Xcode 中配置 Associated Domains

### 步骤：

1. 在 Xcode 中打开项目（使用 `juqi.xcworkspace`）
2. 选择项目 Target `juqi`
3. 选择 `Signing & Capabilities` 标签页
4. 点击 `+ Capability`
5. 添加 `Associated Domains`
6. 点击 `+` 添加域名，格式：`applinks:prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com`

**注意**：不需要包含 `https://` 和路径，只需要域名部分。

## 🔍 验证配置

### 1. 验证文件可访问

在浏览器中访问：
```
https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association
```

应该能看到 JSON 内容。

### 2. 验证文件格式

确保：
- ✅ 文件是有效的 JSON 格式
- ✅ Content-Type 正确（应该是 `application/json` 或 `text/plain`）
- ✅ 文件大小不超过 128KB
- ✅ 可以通过 HTTPS 访问

### 3. 测试 Universal Links

在 iOS 设备上：
1. 在 Safari 中打开：`https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/app/test`
2. 长按链接，应该看到"在'juqi'中打开"选项
3. 点击后应该直接打开应用

## 🌐 使用自定义域名（可选）

如果你想使用 `https://juqi.life/app/` 这样的自定义域名：

### 步骤：

1. **在云开发控制台配置自定义域名**：
   - 登录 [云开发控制台](https://tcb.cloud.tencent.com/dev?envId=prod-juqi-7glu2m8qfa31e13f#/static-hosting)
   - 进入"静态网站托管"
   - 添加自定义域名 `juqi.life`
   - 配置 SSL 证书

2. **更新 apple-app-site-association 文件**：
   - 文件内容不变（路径仍然是 `/app/*`）
   - 但需要通过新域名访问

3. **更新 AppDelegate.swift**：
   ```swift
   WXApi.registerApp(wechatAppID, universalLink: "https://juqi.life/app/")
   ```

4. **更新 Xcode 中的 Associated Domains**：
   - 改为：`applinks:juqi.life`

## 📝 重要提示

1. **文件必须无扩展名**：`apple-app-site-association`（不是 `.json`）
2. **路径必须正确**：`.well-known/apple-app-site-association`
3. **必须使用 HTTPS**：HTTP 不支持
4. **Content-Type**：应该是 `application/json` 或 `text/plain`
5. **首次配置后**：可能需要等待几分钟让 Apple 验证文件
6. **测试环境**：Universal Links 在模拟器上可能不完全工作，建议在真机上测试

## 🔗 相关链接

- **静态网站托管管理**: https://tcb.cloud.tencent.com/dev?envId=prod-juqi-7glu2m8qfa31e13f#/static-hosting
- **文件访问地址**: https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association
- **Universal Links 文档**: https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app
