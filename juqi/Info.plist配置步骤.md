# Info.plist 配置步骤（自动生成模式）

## 问题说明

项目使用自动生成 Info.plist（`GENERATE_INFOPLIST_FILE = YES`），所以不能直接添加 Info.plist 文件。需要在 Xcode 的 Build Settings 中配置。

## 配置步骤

### 方法一：在 Xcode 中直接配置（推荐）

#### 1. 配置 LSApplicationQueriesSchemes

1. 在 Xcode 中打开项目（使用 `.xcworkspace` 文件）
2. 选择项目 Target `juqi`
3. 选择 `Info` 标签页
4. 展开 `Custom iOS Target Properties`
5. 点击 `+` 添加新键
6. 输入键名：`LSApplicationQueriesSchemes`
7. 类型选择：`Array`
8. 在数组中添加两个 `String` 项：
   - `weixin`
   - `weixinULAPI`

#### 2. 配置 URL Types

1. 在同一个 `Info` 标签页中
2. 找到 `URL Types`（如果没有，点击 `+` 添加）
3. 展开 `URL Types`
4. 点击 `+` 添加新的 URL Type
5. 配置：
   - **Identifier**: `weixin`
   - **URL Schemes**: 点击 `+` 添加，输入 `wx你的微信AppID`（例如：`wx1234567890abcdef`）

### 方法二：在 Build Settings 中配置（如果方法一不行）

1. 选择项目 Target `juqi`
2. 选择 `Build Settings` 标签页
3. 搜索 `INFOPLIST_KEY`
4. 点击 `+` 添加以下键值对：

**添加 LSApplicationQueriesSchemes：**
- 键名：`INFOPLIST_KEY_LSApplicationQueriesSchemes`
- 值：`weixin weixinULAPI`（用空格分隔）

**添加 URL Types：**
这个需要在 Info 标签页中配置，Build Settings 中配置比较复杂。

## 验证配置

配置完成后，可以：
1. 编译项目，检查是否有错误
2. 查看生成的 Info.plist（在 DerivedData 中）
3. 或者在运行时检查配置是否正确

## 注意事项

⚠️ **重要**：
- 记得将 `wx你的微信AppID` 替换为真实的微信 AppID
- URL Scheme 格式必须是 `wx` + AppID
- 配置后需要重新编译项目
