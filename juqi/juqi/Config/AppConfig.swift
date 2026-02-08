//
//  AppConfig.swift
//  juqi
//
//  Created by Auto on 2026/1/12.
//

import Foundation

/// App环境配置
enum AppEnvironment {
    case debug
    case release
}

/// 测试 API 模式
enum TestAPIMode {
    case local           // 本地开发: localhost:9999
    case cloudRun        // 云托管默认域名 (推荐联调使用)
    case customDomain    // 自定义域名: test-api.juqi.life
}

/// App配置管理
struct AppConfig {
    /// 测试环境 API 模式（DEBUG 下生效）
    /// - .local: 使用 http://localhost:9999/app/v2（模拟器）或 testLocalHost IP（真机）
    /// - .cloudRun: 使用云托管默认域名（联调推荐）
    /// - .customDomain: 使用自定义域名 https://test-api.juqi.life/app/v2
    static let testAPIMode: TestAPIMode = .cloudRun
    
    /// 云托管默认域名（NestJS v2 API）
    static let cloudRunHost = "juqi-api-server-217941-7-1314478640.sh.run.tcloudbase.com"

    /// 本地测试时的 Host（真机调试时改为你电脑的局域网 IP，如 "192.168.1.100"）
    static let testLocalHost = "localhost"
    
    /// 兼容旧代码：是否使用本地测试 API
    static var useLocalTestAPI: Bool {
        return testAPIMode == .local
    }

    /// 当前环境
    static var currentEnvironment: AppEnvironment {
        #if DEBUG
        return .debug
        #else
        return .release
        #endif
    }

    /// 数据环境（仅测试环境有效）：请求时传给后端，用于切换 测试库/生产库
    /// - "test": 测试数据
    /// - "prod": 线上数据
    private static let dataEnvKey = "AppConfig.dataEnv"
    static var dataEnv: String {
        get {
            #if DEBUG
            return UserDefaults.standard.string(forKey: dataEnvKey) ?? "test"
            #else
            return "prod"
            #endif
        }
        set {
            #if DEBUG
            UserDefaults.standard.set(newValue, forKey: dataEnvKey)
            #endif
        }
    }

    /// API基础URL
    static var baseURL: String {
        switch currentEnvironment {
        case .debug:
            switch testAPIMode {
            case .local:
                return "http://\(testLocalHost):9999/app/v2"
            case .cloudRun:
                return "https://\(cloudRunHost)/app/v2"
            case .customDomain:
                return "https://test-api.juqi.life/app/v2"
            }
        case .release:
            return "https://api.juqi.life/app/v2"
        }
    }
    
    /// API完整路径
    static var apiURL: String {
        return "\(baseURL)/api"
    }
    
    /// WebSocket URL（如果需要）
    static var wsURL: String {
        switch currentEnvironment {
        case .debug:
            switch testAPIMode {
            case .local:
                return "ws://\(testLocalHost):9999/ws"
            case .cloudRun:
                return "wss://\(cloudRunHost)/ws"
            case .customDomain:
                return "wss://test-api.juqi.life/ws"
            }
        case .release:
            return "wss://api.juqi.life/ws"
        }
    }
    
    /// 是否启用日志
    static var enableLogging: Bool {
        switch currentEnvironment {
        case .debug:
            return true
        case .release:
            return false
        }
    }
    
    /// 请求超时时间（秒）
    static var requestTimeout: TimeInterval {
        return 30.0
    }
    
    /// 最大重试次数
    static var maxRetries: Int {
        return 3
    }
    
    // MARK: - 环境信息
    
    /// 当前数据源描述（API 地址 + 数据环境），用于日志统计
    static var dataSourceDescription: String {
        let apiDesc: String
        switch currentEnvironment {
        case .debug:
            switch testAPIMode {
            case .local:
                apiDesc = "本地API(\(testLocalHost):9999)"
            case .cloudRun:
                apiDesc = "云托管API(Cloud Run)"
            case .customDomain:
                apiDesc = "云端测试API(test-api.juqi.life)"
            }
        case .release:
            apiDesc = "线上API(api.juqi.life)"
        }
        let dataEnvDesc = dataEnv == "prod" ? "线上数据" : "测试数据"
        return "\(apiDesc) + \(dataEnvDesc)"
    }
    
    /// 打印当前环境配置信息（用于调试和确认）
    static func printEnvironmentInfo() {
        // 明确当前环境的数据源（便于日志统计与排查）
        print("📊 [数据源] 当前数据源: \(dataSourceDescription)")
        
        let env = currentEnvironment
        let envName = env == .debug ? "测试环境 (DEBUG)" : "生产环境 (RELEASE)"
        let logStatus = enableLogging ? "是" : "否"
        
        print("""
        ╔═══════════════════════════════════════════════════════════════╗
        ║                  🚀 App 环境配置信息                         ║
        ╠═══════════════════════════════════════════════════════════════╣
        ║  环境模式:     \(envName)                                    ║
        ║  当前数据源:   \(dataSourceDescription)                       ║
        ║  API基础URL:   \(baseURL)                                     ║
        ║  API完整路径:  \(apiURL)                                      ║
        ║  WebSocket:    \(wsURL)                                       ║
        ║  日志启用:     \(logStatus)                                   ║
        ║  请求超时:     \(Int(requestTimeout))秒                      ║
        ║  最大重试:     \(maxRetries)次                                ║
        ╚═══════════════════════════════════════════════════════════════╝
        """)
    }
    
    /// 获取环境信息字符串（用于UI显示）
    static var environmentInfo: String {
        let env = currentEnvironment
        let envName = env == .debug ? "测试环境" : "生产环境"
        return "\(envName) - \(apiURL)"
    }
}
