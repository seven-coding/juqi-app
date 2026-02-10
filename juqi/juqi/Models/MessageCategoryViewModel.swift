//
//  MessageCategoryViewModel.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import Foundation
import SwiftUI
import Combine

/// 消息分类ViewModel（用于充电、评论、艾特、访客等分类页面）
@MainActor
class MessageCategoryViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var isLoading = false
    @Published var allLoaded = false
    @Published var isEmpty = false
    @Published var loadFailed = false
    @Published var loadFailedMessage: String?

    var page = 1
    private let limit = 20
    private var messageType: Int // 消息类型
    private let from: String? // 发送者ID（可选，用于详情页）
    private var aitType: Int? // 艾特类型（1=@我的帖子，2=@我的评论）
    
    init(messageType: Int, from: String? = nil, aitType: Int? = nil) {
        self.messageType = messageType
        self.from = from
        self.aitType = aitType
    }
    
    /// 加载消息列表
    func loadMessages() {
        guard !isLoading else {
            print("📤 [Messages] 分类 type=\(messageType) loadMessages 跳过 guard: isLoading=true")
            return
        }

        isLoading = true
        loadFailed = false
        loadFailedMessage = nil
        page = 1
        allLoaded = false
        
        var data: [String: Any] = [
            "page": page,
            "limit": limit,
            "type": messageType
        ]
        if let from = from { data["from"] = from }
        if let aitType = aitType { data["aitType"] = aitType }
        print("📤 [Messages] 分类 请求 type=\(messageType), page=1, limit=\(limit), from=\(from ?? "nil"), aitType=\(aitType.map { "\($0)" } ?? "nil")")
        
        Task {
            do {
                let response: MessageListResponse = try await NetworkService.shared.request(
                    operation: "getMessagesNew",
                    data: data,
                    useCache: false
                )
                
                let processedMessages = response.messages.map { Message.formatForDisplay($0) }
                messages = processedMessages
                isEmpty = processedMessages.isEmpty
                allLoaded = response.count > 0 && processedMessages.count >= response.count
                print("📥 [Messages] 分类 响应 type=\(messageType) messages=\(response.messages.count), count=\(response.count), isEmpty=\(isEmpty), allLoaded=\(allLoaded)")
                isLoading = false
            } catch let err as APIError {
                print("❌ [Messages] 分类 type=\(messageType) 失败 type: \(err.errorType), error: \(err.localizedDescription)")
                loadFailed = true
                loadFailedMessage = err.userMessage
                isLoading = false
            } catch {
                print("❌ [Messages] 分类 type=\(messageType) 失败: \(error)")
                loadFailed = true
                loadFailedMessage = "加载失败，请稍后重试"
                isLoading = false
            }
        }
    }
    
    /// 加载更多消息
    func loadMore() {
        guard !isLoading && !allLoaded else {
            print("📤 [Messages] 分类 type=\(messageType) loadMore 跳过 guard: isLoading=\(isLoading), allLoaded=\(allLoaded)")
            return
        }
        
        isLoading = true
        page += 1
        
        var data: [String: Any] = [
            "page": page,
            "limit": limit,
            "type": messageType
        ]
        if let from = from { data["from"] = from }
        if let aitType = aitType { data["aitType"] = aitType }
        print("📤 [Messages] 分类 loadMore type=\(messageType), page=\(page), limit=\(limit)")
        
        Task {
            do {
                let response: MessageListResponse = try await NetworkService.shared.request(
                    operation: "getMessagesNew",
                    data: data,
                    useCache: false
                )
                
                let processedMessages = response.messages.map { Message.formatForDisplay($0) }
                messages.append(contentsOf: processedMessages)
                
                allLoaded = response.count > 0 && messages.count >= response.count
                print("📥 [Messages] 分类 loadMore type=\(messageType) 追加=\(processedMessages.count), 当前总数=\(messages.count), count=\(response.count), allLoaded=\(allLoaded)")
                isLoading = false
            } catch {
                print("❌ [Messages] 分类 type=\(messageType) loadMore 失败: \(error)")
                page -= 1
                isLoading = false
            }
        }
    }
    
    /// 刷新消息
    func refresh() {
        print("📤 [Messages] 分类 type=\(messageType) refresh")
        page = 1
        allLoaded = false
        messages = []
        loadMessages()
    }
    
    /// 切换艾特类型（仅用于AtMessageView）
    func switchAitType(_ newAitType: Int) {
        aitType = newAitType
        page = 1
        allLoaded = false
        messages = []
        loadMessages()
    }
    
}
