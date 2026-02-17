//
//  AtMessageView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct AtMessageView: View {
    @State private var selectedTab: Int = 1 // 1=@我的帖子，2=@我的评论
    @StateObject private var viewModel: MessageCategoryViewModel
    @State private var selectedDynId: String?
    @State private var selectedUserId: String?
    @State private var selectedSession: SessionDetailDestination?
    
    init() {
        _viewModel = StateObject(wrappedValue: MessageCategoryViewModel(messageType: MessageTypeConstant.at, aitType: 1))
    }
    
    var body: some View {
        ZStack {
            Color(hex: "#000000")
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // 顶部Tab切换
                tabBar
                
                if viewModel.loadFailed && !viewModel.isLoading {
                    MessageLoadFailedView(message: viewModel.loadFailedMessage) {
                        viewModel.refresh()
                    }
                } else if viewModel.isEmpty && !viewModel.isLoading {
                    EmptyStateView(
                        icon: "at",
                        title: "暂无艾特消息",
                        message: "还没有收到任何艾特消息"
                    )
                } else {
                    messageList
                }
            }
        }
        .navigationTitle("@ 列表")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.loadMessages()
        }
        .onChange(of: selectedTab) { _, newValue in
            viewModel.switchAitType(newValue)
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
    
    private var tabBar: some View {
        HStack(spacing: 0) {
            // @我的帖子
            Button(action: {
                selectedTab = 1
            }) {
                VStack(spacing: 0) {
                    Text("@我的帖子")
                        .font(.system(size: 16, weight: selectedTab == 1 ? .semibold : .regular))
                        .foregroundColor(.white)
                        .padding(.bottom, 12)
                    
                    if selectedTab == 1 {
                        Rectangle()
                            .fill(Color(hex: "#FF6B35"))
                            .frame(height: 3)
                    } else {
                        Rectangle()
                            .fill(Color.clear)
                            .frame(height: 3)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            
            // @我的评论
            Button(action: {
                selectedTab = 2
            }) {
                VStack(spacing: 0) {
                    Text("@我的评论")
                        .font(.system(size: 16, weight: selectedTab == 2 ? .semibold : .regular))
                        .foregroundColor(.white)
                        .padding(.bottom, 12)
                    
                    if selectedTab == 2 {
                        Rectangle()
                            .fill(Color(hex: "#FF6B35"))
                            .frame(height: 3)
                    } else {
                        Rectangle()
                            .fill(Color.clear)
                            .frame(height: 3)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 16)
        .background(Color(hex: "#000000"))
    }
    
    private var messageList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                    AtMessageItemView(
                        message: message,
                        onViewTap: {
                            if let d = message.dynId, !d.isEmpty {
                                selectedDynId = d
                            } else {
                                selectedUserId = message.from
                            }
                        }
                    )
                    .onAppear {
                        // 加载更多
                        if index == viewModel.messages.count - 1 && !viewModel.allLoaded {
                            viewModel.loadMore()
                        }
                    }
                }
                
                // 加载更多指示器
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
