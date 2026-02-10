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
    @Published var isEmpty = true  // 初始为 true，避免首屏闪出空列表再变空状态
    
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
    /// 首屏仅首次加载，tab 切回不自动再请求（下拉刷新仍会请求）
    private var hasLoadedOnce = false
    /// 加载失败时展示「加载失败 / 重试」
    @Published var loadFailed = false
    @Published var loadFailedMessage: String?
    /// 未读数短时缓存（60s），首屏用 skipNotReadCount 时独立拉未读并缓存
    private var lastUnreadFetchTime: Date?
    private var cachedNotReadCount: MessageNotReadCount?
    private let unreadCacheInterval: TimeInterval = 60

    init() {
        // 不再在 init 里自动加载，由 View onAppear 触发；首次 onAppear 会调 loadMessages()
    }

    /// 加载消息列表（首屏使用 skipNotReadCount 减少首包）。仅首次加载或刷新时真正请求，tab 切回不自动再请求。
    /// - Parameter isRefresh: 为 true 时忽略「仅首次」限制，用于下拉刷新
    func loadMessages(isRefresh: Bool = false) {
        if !isRefresh && hasLoadedOnce {
            print("📤 [Messages] 首屏 loadMessages 跳过：已加载过，仅下拉刷新会再请求")
            return
        }
        guard !isLoading else {
            print("📤 [Messages] 首屏 loadMessages 跳过 guard: isLoading=true")
            return
        }

        isLoading = true
        loadFailed = false
        loadFailedMessage = nil
        if isRefresh || !hasLoadedOnce {
            page = 1
            allLoaded = false
        }
        print("📤 [Messages] 首屏 请求 page=1, limit=\(limit), skipNotReadCount=true")

        Task {
            do {
                let response: MessageListResponse = try await APIService.shared.getMessages(page: page, limit: limit, skipNotReadCount: true)

                let processedMessages = response.messages.map { Message.formatForDisplay($0) }

                if let notReadCount = response.notReadCount {
                    updateNotReadCount(notReadCount)
                    cachedNotReadCount = notReadCount
                    lastUnreadFetchTime = Date()
                } else {
                    fetchUnreadCountIfNeeded()
                }

                messagesWatchIds = processedMessages.map { $0.id }
                messages = processedMessages
                isEmpty = processedMessages.isEmpty
                allLoaded = response.count > 0 && processedMessages.count >= response.count
                hasLoadedOnce = true
                print("📥 [Messages] 首屏 响应 messages=\(response.messages.count), count=\(response.count), isEmpty=\(isEmpty), allLoaded=\(allLoaded)")
                isLoading = false
            } catch let err as APIError {
                print("❌ [Messages] 首屏 失败 type: \(err.errorType), error: \(err.localizedDescription)")
                loadFailed = true
                loadFailedMessage = err.userMessage
                isLoading = false
            } catch {
                print("❌ [Messages] 首屏 失败: \(error)")
                loadFailed = true
                loadFailedMessage = "加载失败，请稍后重试"
                isLoading = false
            }
        }
    }

    /// 未读数：缓存有效则用缓存，否则请求 appGetUnreadCount 并更新角标与缓存
    private func fetchUnreadCountIfNeeded() {
        if let cached = cachedNotReadCount, let last = lastUnreadFetchTime, Date().timeIntervalSince(last) < unreadCacheInterval {
            updateNotReadCount(cached)
            return
        }
        Task {
            do {
                let notReadCount = try await APIService.shared.getUnreadCount()
                updateNotReadCount(notReadCount)
                cachedNotReadCount = notReadCount
                lastUnreadFetchTime = Date()
            } catch {
                print("❌ [Messages] getUnreadCount 失败: \(error)")
            }
        }
    }
    
    /// 加载更多消息
    func loadMore() {
        guard !isLoading && !allLoaded else {
            print("📤 [Messages] 首屏 loadMore 跳过 guard: isLoading=\(isLoading), allLoaded=\(allLoaded)")
            return
        }
        
        isLoading = true
        page += 1
        print("📤 [Messages] 首屏 loadMore page=\(page), limit=\(limit)")
        
        Task {
            do {
                let response: MessageListResponse = try await APIService.shared.getMessages(page: page, limit: limit)
                
                // 处理消息数据
                let processedMessages = response.messages.map { Message.formatForDisplay($0) }
                // 追加到现有列表
                messages.append(contentsOf: processedMessages)
                messagesWatchIds.append(contentsOf: processedMessages.map { $0.id })
                
                allLoaded = response.count > 0 && messages.count >= response.count
                print("📥 [Messages] 首屏 loadMore 追加=\(processedMessages.count), 当前总数=\(messages.count), count=\(response.count), allLoaded=\(allLoaded)")
                isLoading = false
            } catch {
                print("❌ [Messages] 首屏 loadMore 失败: \(error)")
                page -= 1
                isLoading = false
            }
        }
    }
    
    /// 刷新消息（下拉刷新或重试时调用）
    func refresh() {
        print("📤 [Messages] 首屏 refresh")
        page = 1
        allLoaded = false
        lastUnreadFetchTime = nil
        loadMessages(isRefresh: true)
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
                
                // 更新本地状态为已读
                if index < messages.count {
                    let m = messages[index]
                    messages[index] = Message(
                        id: m.id,
                        from: m.from,
                        fromName: m.fromName,
                        fromPhoto: m.fromPhoto,
                        type: m.type,
                        message: m.message,
                        msgText: m.msgText,
                        createTime: m.createTime,
                        formatDate: m.formatDate,
                        status: 1,
                        noReadCount: 0,
                        groupType: m.groupType,
                        groupId: m.groupId,
                        url: m.url,
                        chatId: m.chatId,
                        dynId: m.dynId,
                        user: m.user,
                        circles: m.circles,
                        userInfo: m.userInfo,
                        messageInfo: m.messageInfo,
                        riskControlReason: m.riskControlReason
                    )
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
        // 清除该分类的未读数量（需替换整个元素以触发 @Published）
        if index < navItems.count {
            let item = navItems[index]
            navItems[index] = MessageNavItem(id: item.id, title: item.title, icon: item.icon, count: 0, url: item.url)
        }
    }
    
    // MARK: - 私有方法

    /// 更新未读数量
    private func updateNotReadCount(_ notReadCount: MessageNotReadCount) {
        navItems[0].count = notReadCount.chargeNums.total
        navItems[1].count = notReadCount.commentNums.total
        navItems[2].count = notReadCount.aitType1Nums.total + notReadCount.aitType2Nums.total
        navItems[3].count = showVisit ? notReadCount.visitorNums.total : 0
    }
}
