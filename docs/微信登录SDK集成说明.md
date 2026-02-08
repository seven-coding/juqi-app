# 微信登录SDK集成说明

## 一、SDK集成步骤

### 1. 添加WechatOpenSDK依赖

#### 方式一：使用Swift Package Manager（推荐）

1. 在Xcode中，选择 `File` -> `Add Packages...`
2. 输入URL：`https://github.com/wechat-open-sdk/wechat-open-sdk-ios`
3. 选择版本并添加到项目

#### 方式二：使用CocoaPods

在 `Podfile` 中添加：
```ruby
pod 'WechatOpenSDK'
```

然后运行：
```bash
pod install
```

### 2. 配置Info.plist

在 `Info.plist` 中添加以下配置：

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>weixin</string>
    <string>weixinULAPI</string>
</array>
```

### 3. 配置URL Scheme

在Xcode项目设置中：
1. 选择Target -> Info -> URL Types
2. 点击 `+` 添加新的URL Type
3. 设置：
   - Identifier: `weixin`
   - URL Schemes: `wx[你的微信AppID]`（例如：`wx1234567890abcdef`）

### 4. 在AppDelegate中处理微信回调

如果项目使用AppDelegate，在 `AppDelegate.swift` 中添加：

```swift
import UIKit
import WechatOpenSDK

@main
class AppDelegate: UIResponder, UIApplicationDelegate, WXApiDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // 注册微信SDK
        WXApi.registerApp("你的微信AppID", universalLink: "你的Universal Link")
        return true
    }
    
    // 处理微信回调
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        return WXApi.handleOpen(url, delegate: self)
    }
    
    // WXApiDelegate
    func onResp(_ resp: BaseResp!) {
        if resp is SendAuthResp {
            let authResp = resp as! SendAuthResp
            if authResp.errCode == 0 {
                // 授权成功，获取code
                let code = authResp.code
                // 通知LoginView处理登录
                NotificationCenter.default.post(name: NSNotification.Name("WechatAuthSuccess"), object: nil, userInfo: ["code": code])
            } else {
                // 授权失败
                NotificationCenter.default.post(name: NSNotification.Name("WechatAuthFailed"), object: nil)
            }
        }
    }
}
```

### 5. 更新LoginView使用真实微信SDK

在 `LoginView.swift` 中，更新 `handleWechatLogin` 方法：

```swift
private func handleWechatLogin() {
    isAuthenticating = true
    errorMessage = nil
    
    // 注册通知监听
    NotificationCenter.default.addObserver(
        forName: NSNotification.Name("WechatAuthSuccess"),
        object: nil,
        queue: .main
    ) { [weak self] notification in
        guard let self = self,
              let code = notification.userInfo?["code"] as? String else {
            return
        }
        self.handleWechatCode(code)
    }
    
    NotificationCenter.default.addObserver(
        forName: NSNotification.Name("WechatAuthFailed"),
        object: nil,
        queue: .main
    ) { [weak self] _ in
        self?.isAuthenticating = false
        self?.errorMessage = "微信授权失败"
        self?.showError = true
    }
    
    // 调用微信SDK进行授权
    let req = SendAuthReq()
    req.scope = "snsapi_userinfo"
    req.state = "juqi_login"
    WXApi.sendAuthReq(req, viewController: nil, completion: nil)
}

private func handleWechatCode(_ code: String) {
    Task {
        do {
            let response = try await authService.login(wechatCode: code)
            isAuthenticating = false
        } catch {
            isAuthenticating = false
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
```

## 二、配置微信开放平台

1. 登录[微信开放平台](https://open.weixin.qq.com/)
2. 创建移动应用
3. 获取AppID和AppSecret
4. 配置Bundle ID和包名
5. 配置Universal Links（iOS 9+）

## 三、注意事项

1. **AppID和AppSecret**：不要将AppSecret存储在客户端，应该在后端使用
2. **Universal Links**：iOS 9+需要使用Universal Links，需要在微信开放平台配置
3. **测试环境**：开发阶段可以使用测试号进行测试
4. **审核**：提交App Store审核时，需要确保微信登录功能正常

## 四、测试

1. 在真机上测试（模拟器无法调用微信）
2. 确保已安装微信客户端
3. 测试授权流程是否正常
4. 测试授权取消的情况
