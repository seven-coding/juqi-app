//
//  MessageViewModel.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import Foundation
import SwiftUI
import Combine

@MainActor
class MessageViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var isLoading = false
    @Published var allLoaded = false
    @Published var isEmpty = false
    
    @Published var navItems: [MessageNavItem] = [
        MessageNavItem(id: 0, title: "充电", icon: "bolt.fill", count: 0, url: nil),
        MessageNavItem(id: 1, title: "评论", icon: "bubble.left.and.bubble.right", count: 0, url: nil),
        MessageNavItem(id: 2, title: "艾特", icon: "at", count: 0, url: nil),
        MessageNavItem(id: 3, title: "访客", icon: "person.fill", count: 0, url: nil)
    ]
    
    private var page = 1
    private let limit = 20
    private var messagesWatchIds: [String] = []
    private var showVisit = true // 会员访客提示功能
    
    init() {
        loadMessages()
    }
    
    /// 加载消息列表
    func loadMessages() {
        guard !isLoading && !allLoaded else { return }
        
        isLoading = true
        page = 1
        allLoaded = false
        
        Task {
            do {
                let response: MessageListResponse = try await APIService.shared.getMessages(page: page, limit: limit)
                
                // 处理消息数据
                var processedMessages = response.messages
                for i in 0..<processedMessages.count {
                    processedMessages[i] = processMessage(processedMessages[i])
                }
                
                // 更新未读数量
                if let notReadCount = response.notReadCount {
                    updateNotReadCount(notReadCount)
                }
                
                // 保存消息ID用于后续更新
                messagesWatchIds = processedMessages.map { $0.id }
                
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
                let response: MessageListResponse = try await APIService.shared.getMessages(page: page, limit: limit)
                
                // 处理消息数据
                var processedMessages = response.messages
                for i in 0..<processedMessages.count {
                    processedMessages[i] = processMessage(processedMessages[i])
                }
                
                // 追加到现有列表
                messages.append(contentsOf: processedMessages)
                messagesWatchIds.append(contentsOf: processedMessages.map { $0.id })
                
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
        loadMessages()
    }
    
    /// 标记消息为已读
    func markAsRead(message: Message, index: Int) {
        Task {
            do {
                _ = try await APIService.shared.setMessage(
                    mesTypeId: message.id,
                    mesType: message.type,
                    status: 1,
                    grouptype: message.groupType,
                    messFromType: nil
                )
                
                // 更新本地状态
                if index < messages.count {
                    // 这里需要创建一个新的Message，但Message是struct，我们需要修改状态
                    // 由于Message是struct，我们需要重新创建
                    // 暂时先移除未读标记
                    let updatedMessage = messages[index]
                    // TODO: 更新消息状态为已读
                    _ = updatedMessage
                }
            } catch {
                print("标记已读失败: \(error)")
            }
        }
    }
    
    /// 删除消息
    func deleteMessage(message: Message, index: Int) {
        Task {
            do {
                _ = try await APIService.shared.setMessage(
                    mesTypeId: message.id,
                    mesType: message.type,
                    status: 3,
                    grouptype: message.groupType,
                    messFromType: nil
                )
                
                // 从列表中移除
                if index < messages.count {
                    messages.remove(at: index)
                    isEmpty = messages.isEmpty
                }
            } catch {
                print("删除消息失败: \(error)")
            }
        }
    }
    
    /// 点击导航栏项
    func onNavItemTap(_ index: Int) {
        // 清除该分类的未读数量
        if index < navItems.count {
            navItems[index].count = 0
        }
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
    
    /// 更新未读数量
    private func updateNotReadCount(_ notReadCount: MessageNotReadCount) {
        navItems[0].count = notReadCount.chargeNums.total
        navItems[1].count = notReadCount.commentNums.total
        navItems[2].count = notReadCount.aitType1Nums.total + notReadCount.aitType2Nums.total
        navItems[3].count = showVisit ? notReadCount.visitorNums.total : 0
    }
}
