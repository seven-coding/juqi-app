//
//  ChargeMessageView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct ChargeMessageView: View {
    @StateObject private var viewModel = MessageCategoryViewModel(messageType: MessageTypeConstant.charge)
    
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
                    icon: "bolt.fill",
                    title: "暂无充电消息",
                    message: "还没有收到任何充电消息"
                )
            } else {
                messageList
            }
        }
        .navigationTitle("充电列表")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.loadMessages()
        }
    }
    
    private var messageList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                    ChargeMessageItemView(
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
