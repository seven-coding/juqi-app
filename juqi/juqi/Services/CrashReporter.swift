//
//  CrashReporter.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation
import UIKit
import Darwin

// 全局信号处理函数
private func crashSignalHandler(_ sig: Int32) {
    let crashInfo = CrashReporter.shared.collectCrashInfo(signalValue: sig)
    CrashReporter.shared.saveCrashLog(crashInfo)
    
    // 恢复默认信号处理并重新抛出
    Darwin.signal(sig, SIG_DFL)
    raise(sig)
}

/// 崩溃监控和报告服务
class CrashReporter {
    static let shared = CrashReporter()
    
    private let crashLogDirectory: URL
    
    private init() {
        // 创建崩溃日志目录
        let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        crashLogDirectory = documentsURL.appendingPathComponent("CrashLogs")
        try? FileManager.default.createDirectory(at: crashLogDirectory, withIntermediateDirectories: true)
        
        setupCrashHandlers()
    }
    
    // MARK: - 设置崩溃处理器
    
    private func setupCrashHandlers() {
        // 设置未捕获异常处理器
        NSSetUncaughtExceptionHandler { exception in
            CrashReporter.shared.handleException(exception)
        }
        
        // 设置信号处理器
        Darwin.signal(SIGABRT, crashSignalHandler)
        Darwin.signal(SIGILL, crashSignalHandler)
        Darwin.signal(SIGSEGV, crashSignalHandler)
        Darwin.signal(SIGFPE, crashSignalHandler)
        Darwin.signal(SIGBUS, crashSignalHandler)
        Darwin.signal(SIGPIPE, crashSignalHandler)
    }
    
    // MARK: - 异常处理
    
    private func handleException(_ exception: NSException) {
        let crashInfo = collectCrashInfo(exception: exception)
        saveCrashLog(crashInfo)
        // TODO: 上报到服务器
        // uploadCrashLog(crashInfo)
    }
    
    // MARK: - 收集崩溃信息
    
    func collectCrashInfo(exception: NSException? = nil, signalValue: Int32? = nil) -> [String: Any] {
        var crashInfo: [String: Any] = [:]
        
        // 基本信息
        crashInfo["timestamp"] = Date().timeIntervalSince1970
        crashInfo["appVersion"] = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        crashInfo["buildNumber"] = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"
        crashInfo["systemVersion"] = UIDevice.current.systemVersion
        crashInfo["deviceModel"] = UIDevice.current.model
        crashInfo["deviceName"] = UIDevice.current.name
        
        // 异常信息
        if let exception = exception {
            crashInfo["type"] = "exception"
            crashInfo["name"] = exception.name.rawValue
            crashInfo["reason"] = exception.reason ?? "unknown"
            crashInfo["callStackSymbols"] = exception.callStackSymbols
            crashInfo["userInfo"] = exception.userInfo
        }
        
        // 信号信息
        if let sig = signalValue {
            crashInfo["type"] = "signal"
            crashInfo["signal"] = sig
            crashInfo["signalName"] = signalName(sig)
            crashInfo["callStackSymbols"] = Thread.callStackSymbols
        }
        
        // 内存信息
        crashInfo["memoryUsage"] = getMemoryUsage()
        
        // 用户信息（如果已登录）
        if KeychainHelper.getToken() != nil {
            // 不记录完整token，只记录是否存在
            crashInfo["hasToken"] = true
        }
        
        return crashInfo
    }
    
    private func signalName(_ signal: Int32) -> String {
        switch signal {
        case SIGABRT: return "SIGABRT"
        case SIGILL: return "SIGILL"
        case SIGSEGV: return "SIGSEGV"
        case SIGFPE: return "SIGFPE"
        case SIGBUS: return "SIGBUS"
        case SIGPIPE: return "SIGPIPE"
        default: return "UNKNOWN"
        }
    }
    
    private func getMemoryUsage() -> [String: Any] {
        // 简化版本，不获取详细内存信息
        return [
            "note": "Memory usage collection simplified"
        ]
    }
    
    // MARK: - 保存崩溃日志
    
    func saveCrashLog(_ crashInfo: [String: Any]) {
        let timestamp = crashInfo["timestamp"] as? TimeInterval ?? Date().timeIntervalSince1970
        let fileName = "crash_\(Int(timestamp)).json"
        let fileURL = crashLogDirectory.appendingPathComponent(fileName)
        
        if let data = try? JSONSerialization.data(withJSONObject: crashInfo, options: .prettyPrinted) {
            try? data.write(to: fileURL)
        }
    }
    
    // MARK: - 上报崩溃日志
    
    func uploadCrashLogs() async {
        guard let files = try? FileManager.default.contentsOfDirectory(at: crashLogDirectory, includingPropertiesForKeys: nil) else {
            return
        }
        
        for fileURL in files {
            guard let data = try? Data(contentsOf: fileURL),
                  let _ = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                continue
            }
            
            // TODO: 实现实际上报逻辑
            // do {
            //     try await APIService.shared.uploadCrashLog(crashInfo)
            //     try? FileManager.default.removeItem(at: fileURL)
            // } catch {
            //     print("Failed to upload crash log: \(error)")
            // }
        }
    }
    
    // MARK: - 记录错误
    
    func logError(_ error: Error, context: [String: Any]? = nil) {
        var errorInfo: [String: Any] = [
            "timestamp": Date().timeIntervalSince1970,
            "error": error.localizedDescription,
            "errorType": String(describing: type(of: error))
        ]
        
        if let context = context {
            errorInfo["context"] = context
        }
        
        if let apiError = error as? APIError {
            errorInfo["apiErrorCode"] = apiError.localizedDescription
        }
        
        // 保存错误日志
        let fileName = "error_\(Int(Date().timeIntervalSince1970)).json"
        let fileURL = crashLogDirectory.appendingPathComponent(fileName)
        
        if let data = try? JSONSerialization.data(withJSONObject: errorInfo, options: .prettyPrinted) {
            try? data.write(to: fileURL)
        }
    }
}
