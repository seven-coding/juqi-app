//
//  RequestManager.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation

/// 请求管理器，用于请求合并与去重
actor RequestManager {
    static let shared = RequestManager()
    
    private var pendingRequests: [String: Any] = [:]
    
    /// 执行请求（支持去重）
    func execute<T: Codable>(
        key: String,
        operation: String,
        data: [String: Any] = [:],
        needsToken: Bool = true,
        useCache: Bool = true
    ) async throws -> T {
        // 检查是否有相同的请求正在进行
        if let existingTask = pendingRequests[key] as? Task<T, Error> {
            // 等待现有请求完成
            return try await existingTask.value
        }
        
        // 创建新请求
        let task = Task<T, Error> {
            try await NetworkService.shared.request(
                operation: operation,
                data: data,
                needsToken: needsToken,
                useCache: useCache
            )
        }
        
        // 保存任务
        pendingRequests[key] = task
        
        do {
            let result = try await task.value
            pendingRequests.removeValue(forKey: key)
            return result
        } catch {
            pendingRequests.removeValue(forKey: key)
            throw error
        }
    }
    
    /// 生成请求唯一键
    static func generateKey(operation: String, data: [String: Any]) -> String {
        let sortedData = data.keys.sorted().map { "\($0)=\(data[$0] ?? "")" }.joined(separator: "&")
        return "\(operation)_\(sortedData)"
    }
}
