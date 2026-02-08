//
//  DataSyncService.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation

/// 数据同步服务，用于保障本地数据与服务器的一致性
class DataSyncService {
    static let shared = DataSyncService()
    
    private var syncQueue: [SyncTask] = []
    private var isSyncing = false
    private let queue = DispatchQueue(label: "com.juqi.dataSync", attributes: .concurrent)
    
    private init() {}
    
    // MARK: - 同步任务
    
    struct SyncTask {
        let id: String
        let operation: String
        let data: [String: Any]
        let timestamp: Date
        let retryCount: Int
    }
    
    // MARK: - 添加同步任务
    
    func addSyncTask(operation: String, data: [String: Any]) {
        let task = SyncTask(
            id: UUID().uuidString,
            operation: operation,
            data: data,
            timestamp: Date(),
            retryCount: 0
        )
        
        queue.async(flags: .barrier) {
            self.syncQueue.append(task)
        }
        
        startSyncIfNeeded()
    }
    
    // MARK: - 执行同步
    
    private func startSyncIfNeeded() {
        guard !isSyncing else { return }
        
        queue.async {
            self.isSyncing = true
            self.processSyncQueue()
        }
    }
    
    private func processSyncQueue() {
        guard !syncQueue.isEmpty else {
            isSyncing = false
            return
        }
        
        let task = syncQueue.removeFirst()
        
        Task {
            do {
                // 执行同步操作
                let _: EmptyResponse = try await NetworkService.shared.request(
                    operation: task.operation,
                    data: task.data,
                    needsToken: true,
                    useCache: false
                )
                
                // 同步成功，继续处理下一个
                queue.async {
                    self.processSyncQueue()
                }
            } catch {
                // 同步失败，重试
                if task.retryCount < 3 {
                    var retryTask = task
                    retryTask = SyncTask(
                        id: task.id,
                        operation: task.operation,
                        data: task.data,
                        timestamp: task.timestamp,
                        retryCount: task.retryCount + 1
                    )
                    
                    queue.async(flags: .barrier) {
                        self.syncQueue.insert(retryTask, at: 0)
                    }
                    
                    // 延迟重试
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(task.retryCount + 1) * 2.0) {
                        self.queue.async {
                            self.processSyncQueue()
                        }
                    }
                } else {
                    // 重试次数用完，保存到失败队列
                    self.saveFailedTask(task)
                    queue.async {
                        self.processSyncQueue()
                    }
                }
            }
        }
    }
    
    // MARK: - 保存失败任务
    
    private func saveFailedTask(_ task: SyncTask) {
        let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let failedTasksURL = documentsURL.appendingPathComponent("FailedSyncTasks")
        try? FileManager.default.createDirectory(at: failedTasksURL, withIntermediateDirectories: true)
        
        let fileName = "\(task.id).json"
        let fileURL = failedTasksURL.appendingPathComponent(fileName)
        
        let taskData: [String: Any] = [
            "id": task.id,
            "operation": task.operation,
            "data": task.data,
            "timestamp": task.timestamp.timeIntervalSince1970
        ]
        
        if let data = try? JSONSerialization.data(withJSONObject: taskData) {
            try? data.write(to: fileURL)
        }
    }
    
    // MARK: - 恢复失败任务
    
    func recoverFailedTasks() async {
        let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let failedTasksURL = documentsURL.appendingPathComponent("FailedSyncTasks")
        
        guard let files = try? FileManager.default.contentsOfDirectory(at: failedTasksURL, includingPropertiesForKeys: nil) else {
            return
        }
        
        for fileURL in files {
            guard let data = try? Data(contentsOf: fileURL),
                  let taskData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let operation = taskData["operation"] as? String,
                  let dataDict = taskData["data"] as? [String: Any] else {
                continue
            }
            
            do {
                let _: EmptyResponse = try await NetworkService.shared.request(
                    operation: operation,
                    data: dataDict,
                    needsToken: true,
                    useCache: false
                )
                
                // 同步成功，删除文件
                try? FileManager.default.removeItem(at: fileURL)
            } catch {
                // 同步失败，保留文件
                print("Failed to recover task: \(error)")
            }
        }
    }
}
