//
//  MessageChatViewModel.swift
//  juqi
//
//  申请/私信对话页（type 20-23）数据与发送。
//

import Foundation
import SwiftUI
import Combine

@MainActor
class MessageChatViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var isLoading = false
    @Published var allLoaded = false
    @Published var loadFailed = false
    @Published var loadFailedMessage: String?
    
    private let from: String
    private let messageTypeId: String
    private let chatId: String
    private var page = 1
    private let limit = 20
    
    init(from: String, messageTypeId: String, chatId: String) {
        self.from = from
        self.messageTypeId = messageTypeId
        self.chatId = chatId
    }
    
    func loadMessages() {
        guard !isLoading else { return }
        isLoading = true
        loadFailed = false
        loadFailedMessage = nil
        page = 1
        allLoaded = false
        
        Task {
            do {
                let response: MessageListResponse = try await APIService.shared.getChatMessages(
                    chatId: chatId,
                    chatOpenId: from,
                    messageTypeId: messageTypeId,
                    page: 1,
                    limit: limit
                )
                let processed = (response.messages).map { Message.formatForDisplay($0) }
                // 服务端按 createTime 倒序返回，展示为时间正序（旧在上、新在下），故反转
                messages = processed.reversed()
                allLoaded = response.count > 0 && processed.count >= response.count
                isLoading = false
            } catch {
                loadFailed = true
                loadFailedMessage = (error as? APIError)?.userMessage ?? "加载失败"
                isLoading = false
            }
        }
    }
    
    func loadMore() {
        guard !isLoading && !allLoaded else { return }
        isLoading = true
        page += 1
        
        Task {
            do {
                let response: MessageListResponse = try await APIService.shared.getChatMessages(
                    chatId: chatId,
                    chatOpenId: from,
                    messageTypeId: nil,
                    page: page,
                    limit: limit
                )
                let processed = (response.messages).map { Message.formatForDisplay($0) }
                // 加载更多为更早的消息，需插入到列表头部以保持时间正序
                messages.insert(contentsOf: processed.reversed(), at: 0)
                allLoaded = response.count > 0 && messages.count >= response.count
                isLoading = false
            } catch {
                page -= 1
                isLoading = false
            }
        }
    }
    
    func refresh() {
        page = 1
        allLoaded = false
        loadMessages()
    }
    
    /// 发送一条文本消息，成功后会刷新列表
    func sendMessage(text: String, onSent: @escaping () -> Void, onError: @escaping (String) -> Void) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        Task {
            do {
                _ = try await APIService.shared.sendChatMessage(chatId: chatId, to: from, message: trimmed, contentType: 1)
                await MainActor.run {
                    onSent()
                    refresh()
                }
            } catch {
                await MainActor.run {
                    onError((error as? APIError)?.userMessage ?? "发送失败")
                }
            }
        }
    }
    
    /// 发送一条图片消息（先上传得到 URL，再发送）
    func sendImage(imageURL: String, onSent: @escaping () -> Void, onError: @escaping (String) -> Void) {
        guard !imageURL.isEmpty else { return }
        
        Task {
            do {
                _ = try await APIService.shared.sendChatMessage(chatId: chatId, to: from, message: imageURL, contentType: 2)
                await MainActor.run {
                    onSent()
                    refresh()
                }
            } catch {
                await MainActor.run {
                    onError((error as? APIError)?.userMessage ?? "发送失败")
                }
            }
        }
    }
}
