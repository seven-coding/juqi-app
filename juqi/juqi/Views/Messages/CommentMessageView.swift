//
//  CommentMessageView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

/// 用于导航到会话详情页的参数
struct SessionDetailDestination: Hashable {
    let from: String
    let type: Int
    let title: String
}

struct CommentMessageView: View {
    @StateObject private var viewModel = MessageCategoryViewModel(messageType: MessageTypeConstant.comment)
    @State private var selectedDynId: String?
    @State private var selectedUserId: String?
    @State private var selectedSession: SessionDetailDestination?
    
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
                    icon: "bubble.left.and.bubble.right",
                    title: "暂无评论消息",
                    message: "还没有收到任何评论消息"
                )
            } else {
                messageList
            }
        }
        .navigationTitle("评论")
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
    }
    
    private var messageList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                    CommentMessageItemView(
                        message: message,
                        onReplyTap: {
                            selectedSession = SessionDetailDestination(
                                from: message.from,
                                type: message.groupId ?? message.groupType ?? message.type,
                                title: message.fromName
                            )
                        },
                        onViewTap: {
                            if let d = message.dynId, !d.isEmpty {
                                selectedDynId = d
                            } else {
                                selectedUserId = message.from
                            }
                        }
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
        }
        .refreshable {
            viewModel.refresh()
        }
    }
}
