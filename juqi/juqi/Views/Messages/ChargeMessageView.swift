//
//  ChargeMessageView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct ChargeMessageView: View {
    @StateObject private var viewModel = MessageCategoryViewModel(messageType: MessageTypeConstant.charge)
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
                    ChargeMessageItemView(
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
