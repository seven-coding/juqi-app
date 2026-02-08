# URL Scheme 配置说明

## 📝 URL Schemes 填写格式

### 格式规则

URL Schemes 的格式是：**`wx` + 你的微信 AppID**

### 示例

如果你的微信 AppID 是：`1234567890abcdef`

那么 URL Schemes 应该填写：**`wx1234567890abcdef`**

### 完整配置步骤

#### 1. 在 Xcode 中配置

1. 打开 Xcode 项目（使用 `juqi.xcworkspace`）
2. 选择项目 Target `juqi`
3. 选择 `Info` 标签页
4. 找到 `URL Types`（如果没有，点击 `+` 添加）
5. 展开 `URL Types`
6. 点击 `+` 添加新的 URL Type
7. 配置：
   - **Identifier**: `weixin`
   - **URL Schemes**: 点击 `+` 添加，输入 `wx你的微信AppID`
     - 例如：如果 AppID 是 `1234567890abcdef`，就填 `wx1234567890abcdef`

#### 2. 配置示例

```
Identifier: weixin
URL Schemes: 
  - wx1234567890abcdef  (假设你的 AppID 是 1234567890abcdef)
```

## ⚠️ 重要提示

1. **格式必须正确**：
   - ✅ 正确：`wx1234567890abcdef`
   - ❌ 错误：`wx 1234567890abcdef`（有空格）
   - ❌ 错误：`1234567890abcdef`（缺少 `wx` 前缀）
   - ❌ 错误：`weixin1234567890abcdef`（前缀错误）

2. **AppID 来源**：
   - 从微信开放平台获取：https://open.weixin.qq.com/
   - 登录后，在"管理中心" → "移动应用" → 查看你的应用
   - AppID 是一个字符串，通常是字母和数字的组合

3. **需要同时配置的地方**：
   - ✅ Xcode Info 标签页中的 URL Schemes
   - ✅ `AppDelegate.swift` 中的 `wechatAppID`（不需要 `wx` 前缀）
   - ✅ 微信开放平台中的 Bundle ID 必须与 Xcode 项目中的 Bundle Identifier 一致

## 🔍 如何获取微信 AppID

1. 访问微信开放平台：https://open.weixin.qq.com/
2. 登录你的账号
3. 进入"管理中心"
4. 选择"移动应用"
5. 找到你的应用，查看 AppID

## 📋 配置检查清单

- [ ] 在 Xcode Info 标签页中配置了 URL Types
- [ ] Identifier 设置为 `weixin`
- [ ] URL Schemes 填写为 `wx你的微信AppID`（格式正确）
- [ ] 在 `AppDelegate.swift` 中替换了 `YOUR_WECHAT_APP_ID` 为真实 AppID（不需要 `wx` 前缀）
- [ ] 微信开放平台中配置的 Bundle ID 与 Xcode 项目中的 Bundle Identifier 一致

## 💡 常见错误

### 错误 1：URL Schemes 格式错误

**错误示例**：
- `wx 1234567890abcdef`（有空格）
- `weixin1234567890abcdef`（前缀错误）

**正确格式**：
- `wx1234567890abcdef`（`wx` + AppID，无空格）

### 错误 2：AppID 和 URL Schemes 混淆

- **AppID**：`1234567890abcdef`（在 `AppDelegate.swift` 中使用）
- **URL Schemes**：`wx1234567890abcdef`（在 Xcode Info 中配置）

### 错误 3：忘记添加 `wx` 前缀

URL Schemes 必须包含 `wx` 前缀，否则微信无法正确回调到你的 App。

## 🎯 快速配置模板

假设你的微信 AppID 是 `YOUR_APP_ID`：

1. **Xcode Info 标签页**：
   - Identifier: `weixin`
   - URL Schemes: `wxYOUR_APP_ID`

2. **AppDelegate.swift**：
   ```swift
   private let wechatAppID = "YOUR_APP_ID"  // 注意：这里不需要 wx 前缀
   ```

3. **微信开放平台**：
   - Bundle ID: 必须与 Xcode 项目中的 Bundle Identifier 完全一致

## 🔗 相关文档

- **微信开放平台**：https://open.weixin.qq.com/
- **配置说明**：`JUQI-APP/juqi/配置说明.md`
- **AppDelegate 配置**：`JUQI-APP/juqi/juqi/AppDelegate.swift`
