//
//  MessageDetailView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct MessageDetailView: View {
    let from: String
    let type: Int
    let title: String
    /// false = 会话消息列表（只读，每条可点进动态/用户）；true = 保留兼容，当前由 MessageChatView 承担对话页
    let isChatMode: Bool
    
    @StateObject private var viewModel: MessageCategoryViewModel
    @State private var inputText: String = ""
    @State private var selectedDynId: String?
    @State private var selectedUserId: String?
    @Environment(\.dismiss) private var dismiss
    
    /// 当 title 为空或为「未知」时展示「会话」，避免导航栏显示未知
    private var displayTitle: String {
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty || t == "未知" { return "会话" }
        return t
    }

    init(from: String, type: Int, title: String, isChatMode: Bool = false) {
        self.from = from
        self.type = type
        self.title = title
        self.isChatMode = isChatMode
        _viewModel = StateObject(wrappedValue: MessageCategoryViewModel(messageType: type, from: from))
    }
    
    var body: some View {
        ZStack {
            Color(hex: "#000000")
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                if viewModel.isLoading && viewModel.messages.isEmpty {
                    VStack(spacing: 12) {
                        Spacer()
                        ProgressView()
                            .tint(Color(hex: "#FF6B35"))
                            .scaleEffect(1.2)
                        Text("加载中...")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "#605D5D"))
                        Spacer()
                    }
                } else if viewModel.loadFailed && !viewModel.isLoading {
                    MessageLoadFailedView(message: viewModel.loadFailedMessage) {
                        viewModel.loadMessages()
                    }
                } else if viewModel.isEmpty && !viewModel.isLoading {
                    EmptyStateView(
                        icon: "tray",
                        title: "暂无消息",
                        message: "还没有收到任何消息"
                    )
                } else {
                    messageList
                }
                
                if isChatMode {
                    inputBar
                }
            }
        }
        .navigationTitle(displayTitle)
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
    }
    
    private var messageList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                    Group {
                        if isChatMode {
                            ChatMessageView(message: message, isFromCurrentUser: false)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                        } else {
                            SessionMessageRowView(message: message) { dynId, userId in
                                if let d = dynId { selectedDynId = d }
                                if let u = userId { selectedUserId = u }
                            }
                        }
                    }
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
            .padding(.vertical, 16)
        }
        .refreshable {
            viewModel.refresh()
        }
    }
    
    private var inputBar: some View {
        HStack(spacing: 12) {
            TextField("输入新消息", text: $inputText)
                .font(.system(size: 15))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color(hex: "#1B1B1B"))
                .cornerRadius(20)
            
            Button(action: {}) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 20))
                    .foregroundColor(Color(hex: "#FF6B35"))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(hex: "#000000"))
    }
}
