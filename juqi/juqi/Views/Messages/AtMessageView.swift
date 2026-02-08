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
    
    init() {
        _viewModel = StateObject(wrappedValue: MessageCategoryViewModel(messageType: 11, aitType: 1))
    }
    
    var body: some View {
        ZStack {
            Color(hex: "#000000")
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // 顶部Tab切换
                tabBar
                
                if viewModel.isEmpty && !viewModel.isLoading {
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
            // 切换Tab时重新加载
            viewModel.switchAitType(newValue)
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
                            // 跳转到帖子详情
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
