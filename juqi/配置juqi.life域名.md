# 配置 juqi.life 自定义域名

## 📋 配置步骤

### 第一步：在云开发控制台配置域名

1. **登录云开发控制台**
   - 访问：https://tcb.cloud.tencent.com/dev?envId=prod-juqi-7glu2m8qfa31e13f#/static-hosting

2. **添加自定义域名**
   - 进入"静态网站托管"页面
   - 找到"自定义域名"或"域名管理"
   - 点击"添加域名"
   - 输入域名：`juqi.life`
   - 选择 SSL 证书：
     - **推荐**：使用云开发自动申请免费证书
     - 或上传已有证书

3. **获取配置信息**
   - 记录 CNAME 地址（用于 DNS 解析）
   - 记录证书 ID（如果需要通过工具配置）

### 第二步：配置 DNS 解析

在你的域名服务商（如腾讯云 DNS、阿里云 DNS 等）添加 CNAME 记录：

```
记录类型：CNAME
主机记录：@（根域名）或 www（如果需要）
记录值：[云开发提供的 CNAME 地址]
TTL：600（或默认值）
```

### 第三步：等待生效

- DNS 解析：通常 5-30 分钟
- SSL 证书：如果自动申请，可能需要几分钟

### 第四步：验证配置

配置完成后，访问以下地址应该能看到 apple-app-site-association 文件：
```
https://juqi.life/.well-known/apple-app-site-association
```

## 🔧 配置完成后需要更新的内容

### 1. 更新 AppDelegate.swift

将 Universal Link 更新为：
```swift
WXApi.registerApp(wechatAppID, universalLink: "https://juqi.life/app/")
```

### 2. 更新 Xcode Associated Domains

在 Xcode 的 `Signing & Capabilities` 中：
- 添加：`applinks:juqi.life`

### 3. apple-app-site-association 文件

文件已经上传，配置完成后会自动通过新域名访问，无需修改。

## 🚀 快速配置（如果你有证书 ID）

如果你已经在控制台配置过域名，或者有证书 ID，可以告诉我证书 ID，我可以帮你通过工具快速完成配置。

## 📝 当前状态

✅ **apple-app-site-association 文件已上传**
- 路径：`.well-known/apple-app-site-association`
- 当前可通过：`https://prod-juqi-7glu2m8qfa31e13f-1314478640.tcloudbaseapp.com/.well-known/apple-app-site-association` 访问

⏳ **待配置**
- 自定义域名：`juqi.life`
- DNS 解析
- SSL 证书

## 🔗 控制台链接

- **静态网站托管**: https://tcb.cloud.tencent.com/dev?envId=prod-juqi-7glu2m8qfa31e13f#/static-hosting
