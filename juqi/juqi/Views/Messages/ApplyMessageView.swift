//
//  ApplyMessageView.swift
//  juqi
//
//  微信申请列表（type 10），与小程序 messagesApply 等价。
//

import SwiftUI

/// 用于导航到申请/私信对话页
struct ChatDestination: Hashable {
    let from: String
    let title: String
    let messageTypeId: String
    let chatId: String
    let fromPhoto: String?
}

struct ApplyMessageView: View {
    @StateObject private var viewModel = MessageCategoryViewModel(messageType: MessageTypeConstant.wechatApply)
    @State private var selectedDynId: String?
    @State private var selectedUserId: String?
    @State private var selectedSession: SessionDetailDestination?
    @State private var selectedChat: ChatDestination?
    
    var body: some View {
        ZStack {
            Color(hex: "#000000")
                .ignoresSafeArea()
            
            if viewModel.loadFailed && !viewModel.isLoading {
                MessageLoadFailedView(message: viewModel.loadFailedMessage) {
                    viewModel.refresh()
                }
            } else if viewModel.isEmpty && !viewModel.isLoading {
                EmptyStateView(
                    icon: "envelope.fill",
                    title: "暂无申请消息",
                    message: "还没有收到任何申请消息"
                )
            } else {
                messageList
            }
        }
        .navigationTitle("申请")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.loadMessages()
        }
        .navigationDestination(item: $selectedDynId) { dynId in
            PostDetailLoaderView(dynId: dynId)
        }
        .navigationDestination(item: $selectedUserId) { userId in
            UserProfileView(userId: userId, userName: "")
        }
        .navigationDestination(item: $selectedSession) { s in
            MessageDetailView(from: s.from, type: s.type, title: s.title, isChatMode: false)
        }
        .navigationDestination(item: $selectedChat) { c in
            MessageChatView(from: c.from, type: 10, title: c.title, messageTypeId: c.messageTypeId, chatId: c.chatId, fromPhoto: c.fromPhoto)
        }
    }
    
    private var messageList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                    MessageItemView(
                        message: message,
                        onTap: {
                            if message.type == 20 || message.type == 21 || message.type == 22 || message.type == 23 {
                                selectedChat = ChatDestination(
                                    from: message.from,
                                    title: message.fromName,
                                    messageTypeId: message.id,
                                    chatId: message.chatId ?? "",
                                    fromPhoto: message.fromPhoto
                                )
                            } else if let d = message.dynId, !d.isEmpty {
                                selectedDynId = d
                            } else {
                                selectedUserId = message.from
                            }
                        },
                        onMarkRead: {},
                        onDelete: {}
                    )
                    .onAppear {
                        if index == viewModel.messages.count - 1 && !viewModel.allLoaded {
                            viewModel.loadMore()
                        }
                    }
                }
                if viewModel.isLoading && !viewModel.messages.isEmpty {
                    HStack {
                        Spacer()
                        ProgressView()
                            .tint(Color(hex: "#FF6B35"))
                            .padding()
                        Spacer()
                    }
                }
            }
            .padding(.top, 8)
        }
        .refreshable {
            viewModel.refresh()
        }
    }
}
