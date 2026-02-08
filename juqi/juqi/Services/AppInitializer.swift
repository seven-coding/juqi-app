//
//  AppInitializer.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/13.
//

import Foundation
import UIKit
import Network

/// 应用初始化管理器，统一管理启动流程
class AppInitializer {
    static let shared = AppInitializer()
    
    private var initializationState: InitializationState = .notStarted
    private let initializationQueue = DispatchQueue(label: "com.juqi.initialization", attributes: .concurrent)
    
    enum InitializationState {
        case notStarted
        case initializing
        case completed
        case failed(Error)
    }
    
    private init() {}
    
    // MARK: - 初始化流程
    
    /// 执行应用初始化
    /// - Parameter completion: 初始化完成回调
    func initialize(completion: @escaping (Result<Void, Error>) -> Void) {
        // 检查是否已经初始化过
        switch initializationState {
        case .notStarted:
            break // 继续初始化
        case .completed:
            completion(.success(()))
            return
        case .initializing:
            // 正在初始化中，不重复初始化
            return
        case .failed(let error):
            completion(.failure(error))
            return
        }
        
        initializationState = .initializing
        
        initializationQueue.async { [weak self] in
            guard let self = self else { return }
            
            // 1. 系统级初始化（同步，必须在主线程之前完成）
            self.initializeSystemServices()
            
            // 2. 网络权限请求（异步）
            self.requestNetworkPermission { networkResult in
                // 3. 用户认证初始化（依赖网络权限）
                self.initializeAuthService { authResult in
                    DispatchQueue.main.async {
                        switch (networkResult, authResult) {
                        case (.success, .success):
                            self.initializationState = .completed
                            completion(.success(()))
                        case (.failure(let error), _):
                            self.initializationState = .failed(error)
                            completion(.failure(error))
                        case (_, .failure(let error)):
                            self.initializationState = .failed(error)
                            completion(.failure(error))
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - 系统级初始化
    
    /// 初始化系统级服务（崩溃监控、微信SDK、Token获取）
    private func initializeSystemServices() {
        // 0. 打印环境配置信息（最早打印，方便调试）
        AppConfig.printEnvironmentInfo()
        
        // 1. 初始化崩溃监控（必须在最早执行）
        _ = CrashReporter.shared
        
        // 2. 初始化微信SDK（在AppDelegate中已注册，这里确保初始化）
        // 注意：微信SDK的实际注册在AppDelegate中完成
        
        // 3. 初始化NetworkService（读取Token）
        // NetworkService是单例，首次访问时自动初始化
        _ = NetworkService.shared
        
        // 4. 初始化DataSyncService
        _ = DataSyncService.shared
    }
    
    // MARK: - 网络权限请求
    
    /// 请求网络权限并启动网络监控
    private func requestNetworkPermission(completion: @escaping (Result<Void, Error>) -> Void) {
        // iOS 14+ 需要请求本地网络权限
        // 注意：实际网络权限在Info.plist中已配置，这里主要是启动网络监控
        
        // 延迟一小段时间，确保系统准备就绪
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            // 启动网络监控（NetworkService内部会延迟启动，这里确保已初始化）
            // 网络监控已在NetworkService初始化时配置，这里只是确认
            completion(.success(()))
        }
    }
    
    // MARK: - 用户认证初始化
    
    /// 初始化用户认证服务
    private func initializeAuthService(completion: @escaping (Result<Void, Error>) -> Void) {
        #if DEBUG
        // 测试环境：若未设置“强制每次登录”，则保留 token 并走 checkAuthState，便于直接进首页调试
        if shouldResetAuthForTesting() {
            clearAuthForTesting()
            // 清除后直接返回，不进行token验证
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                completion(.success(()))
            }
            return
        }
        #endif
        
        // 生产环境：检查认证状态（AuthService会从Keychain读取token并验证）
        Task { @MainActor in
            await AuthService.shared.checkAuthState()
            completion(.success(()))
        }
    }
    
    // MARK: - 测试环境处理
    
    #if DEBUG
    /// 判断是否应该重置认证状态（测试环境）
    private func shouldResetAuthForTesting() -> Bool {
        // 测试环境：默认每次启动进登录页，点击「测试登录」后使用真实 token 进入首页并拉取数据
        // 若需保留登录状态，可设置 UserDefaults.standard.set(false, forKey: "forceLoginOnLaunch")
        let forceLogin = UserDefaults.standard.object(forKey: "forceLoginOnLaunch") as? Bool
        return forceLogin ?? true  // 默认 true，每次启动显示登录页
    }
    
    /// 清除认证状态（测试环境）
    private func clearAuthForTesting() {
        // 清除token
        KeychainHelper.deleteToken()
        
        // 清除用户状态
        UserDefaults.standard.removeObject(forKey: "trialStartTime")
        
        // 重置AuthService状态（在主线程执行）
        DispatchQueue.main.async {
            AuthService.shared.logout()
        }
        
        print("🧪 测试环境：已清除认证状态，将显示登录页")
    }
    #endif
    
    // MARK: - 恢复失败任务
    
    /// 恢复失败的数据同步任务（在初始化完成后异步执行）
    func recoverFailedTasks() {
        Task {
            await DataSyncService.shared.recoverFailedTasks()
        }
    }
    
    // MARK: - 上传崩溃日志
    
    /// 上传崩溃日志（在初始化完成后异步执行）
    func uploadCrashLogs() {
        Task {
            await CrashReporter.shared.uploadCrashLogs()
        }
    }
}
