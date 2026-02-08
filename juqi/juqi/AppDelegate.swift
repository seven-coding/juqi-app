//
//  AppDelegate.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import UIKit

class AppDelegate: NSObject, UIApplicationDelegate, WXApiDelegate {
    
    // 微信AppID
    private let wechatAppID = "de953a2ec5493b3b"
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // 注册微信SDK
        // Universal Link: https://app.juqi.life/app/
        WXApi.registerApp(wechatAppID, universalLink: "https://app.juqi.life/app/")
        return true
    }
    
    // MARK: - UISceneSession Lifecycle
    
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
    
    // MARK: - WXApiDelegate
    
    func onReq(_ req: BaseReq) {
        // 微信请求处理
    }
    
    func onResp(_ resp: BaseResp) {
        if resp is SendAuthResp {
            let authResp = resp as! SendAuthResp
            if authResp.errCode == 0 {
                // 授权成功，获取code
                let code = authResp.code ?? ""
                // 通知LoginView处理登录
                NotificationCenter.default.post(
                    name: NSNotification.Name("WechatAuthSuccess"),
                    object: nil,
                    userInfo: ["code": code]
                )
            } else {
                // 授权失败
                var errorMessage = "微信授权失败"
                if authResp.errCode == -2 {
                    errorMessage = "用户取消授权"
                } else if authResp.errCode == -4 {
                    errorMessage = "授权被拒绝"
                }
                NotificationCenter.default.post(
                    name: NSNotification.Name("WechatAuthFailed"),
                    object: nil,
                    userInfo: ["message": errorMessage]
                )
            }
        }
    }
}
