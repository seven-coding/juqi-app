//
//  KeychainHelper.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation
import Security

/// Keychain工具类，用于安全存储Token
class KeychainHelper {
    private static let service = "com.juqi.app"
    private static let tokenKey = "userToken"
    private static let openIdKey = "userOpenId"
    
    /// 保存Token到Keychain
    static func saveToken(_ token: String) -> Bool {
        guard let data = token.data(using: .utf8) else {
            return false
        }
        
        // 删除旧token
        deleteToken()
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    /// 从Keychain读取Token
    static func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return token
    }
    
    /// 删除Token
    static func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey
        ]
        SecItemDelete(query as CFDictionary)
        deleteOpenId()
    }
    
    /// 保存当前用户 openId（登录时写入，用于关注列表等接口）
    static func saveOpenId(_ openId: String) -> Bool {
        guard let data = openId.data(using: .utf8) else { return false }
        deleteOpenId()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: openIdKey,
            kSecValueData as String: data
        ]
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }
    
    /// 读取当前用户 openId
    static func getOpenId() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: openIdKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let openId = String(data: data, encoding: .utf8), !openId.isEmpty else {
            return nil
        }
        return openId
    }
    
    /// 删除 openId（登出时调用）
    static func deleteOpenId() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: openIdKey
        ]
        SecItemDelete(query as CFDictionary)
    }
    
    /// 检查Token是否存在
    static func hasToken() -> Bool {
        return getToken() != nil
    }
}
