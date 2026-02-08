//
//  SceneDelegate.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/13.
//

import UIKit

class SceneDelegate: NSObject, UIWindowSceneDelegate {
    
    // 处理 URL Scheme 回调 (iOS 13+)
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        // 让 AppDelegate 处理微信回调
        if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
            WXApi.handleOpen(url, delegate: appDelegate)
        }
    }
    
    // 处理 Universal Links 回调 (iOS 13+)
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
            WXApi.handleOpenUniversalLink(userActivity, delegate: appDelegate)
        }
    }
}
