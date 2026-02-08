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
        guard !isLoading && !allLoaded else { return }
        
        isLoading = true
        page = 1
        allLoaded = false
        
        Task {
            do {
                var data: [String: Any] = [
                    "page": page,
                    "limit": limit,
                    "type": messageType
                ]
                
                if let from = from {
                    data["from"] = from
                }
                
                if let aitType = aitType {
                    data["aitType"] = aitType
                }
                
                let response: MessageListResponse = try await NetworkService.shared.request(
                    operation: "getMessagesNew",
                    data: data
                )
                
                // 处理消息数据
                var processedMessages = response.messages
                for i in 0..<processedMessages.count {
                    processedMessages[i] = processMessage(processedMessages[i])
                }
                
                messages = processedMessages
                isEmpty = processedMessages.isEmpty
                allLoaded = processedMessages.count >= response.count
                
                isLoading = false
            } catch {
                print("加载消息失败: \(error)")
                isLoading = false
            }
        }
    }
    
    /// 加载更多消息
    func loadMore() {
        guard !isLoading && !allLoaded else { return }
        
        isLoading = true
        page += 1
        
        Task {
            do {
                var data: [String: Any] = [
                    "page": page,
                    "limit": limit,
                    "type": messageType
                ]
                
                if let from = from {
                    data["from"] = from
                }
                
                if let aitType = aitType {
                    data["aitType"] = aitType
                }
                
                let response: MessageListResponse = try await NetworkService.shared.request(
                    operation: "getMessagesNew",
                    data: data
                )
                
                // 处理消息数据
                var processedMessages = response.messages
                for i in 0..<processedMessages.count {
                    processedMessages[i] = processMessage(processedMessages[i])
                }
                
                // 追加到现有列表
                messages.append(contentsOf: processedMessages)
                
                allLoaded = messages.count >= response.count
                isLoading = false
            } catch {
                print("加载更多消息失败: \(error)")
                isLoading = false
            }
        }
    }
    
    /// 刷新消息
    func refresh() {
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
    
    // MARK: - 私有方法
    
    /// 处理消息数据，格式化消息文本
    private func processMessage(_ message: Message) -> Message {
        // 根据消息类型生成msgText
        var msgText = message.msgText ?? message.message ?? ""
        
        switch message.type {
        case 1:
            msgText = "设置圈子信息"
        case 2:
            msgText = "你成为了管理员"
        case 3:
            msgText = "你被取消了管理员资格"
        case 4:
            msgText = "你被管理员\(message.fromName)踢出了本电站"
        case 5:
            msgText = "你的帖子被加精了"
        case 6:
            msgText = "你的帖子被拒绝/取消加精了"
        case 7:
            msgText = "你的帖子被电站屏蔽了"
        case 8:
            msgText = "你的帖子被电站取消屏蔽了"
        case 9:
            msgText = "风控"
        case 10:
            msgText = "你的帖子被置顶了"
        case 11:
            msgText = "你的帖子被取消置顶了"
        case 12:
            msgText = "你的加入申请已被通过了"
        case 13:
            msgText = "你的加入申请被拒绝，还请仔细阅读电站说明"
        case 14:
            msgText = "你的投稿被通过了"
        case 15:
            msgText = "你的投稿被拒绝了"
        case 16:
            if let user = message.user?.first {
                msgText = "\(user.nickName ?? "")关注了你"
            }
        case 17:
            msgText = "有人对你取消关注"
        case 18:
            if let messageText = message.message {
                msgText = messageText
            } else if let riskControlReason = message.riskControlReason {
                msgText = riskControlReason
            } else if let messageInfo = message.messageInfo?.first?.message {
                msgText = messageInfo
            }
        case 19:
            msgText = "你的评论被点赞了"
        default:
            msgText = message.message ?? message.msgText ?? ""
        }
        
        // 创建新的Message对象，更新msgText和formatDate
        return Message(
            id: message.id,
            from: message.from,
            fromName: message.fromName,
            fromPhoto: message.fromPhoto,
            type: message.type,
            message: message.message,
            msgText: msgText,
            createTime: message.createTime,
            formatDate: message.createTime.formatMessageDate(),
            status: message.status,
            noReadCount: message.noReadCount,
            groupType: message.groupType,
            groupId: message.groupId,
            url: message.url,
            chatId: message.chatId,
            dynId: message.dynId,
            user: message.user,
            circles: message.circles,
            userInfo: message.userInfo,
            messageInfo: message.messageInfo,
            riskControlReason: message.riskControlReason
        )
    }
}
