//
//  VisitorMessageView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct VisitorMessageView: View {
    @StateObject private var viewModel = MessageCategoryViewModel(messageType: MessageTypeConstant.visit)
    @State private var selectedUserId: String?
    
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
                    icon: "person.fill",
                    title: "暂无访客消息",
                    message: "还没有访客记录"
                )
            } else {
                ScrollView {
                    VStack(spacing: 0) {
                        // 访客列表
                        LazyVStack(spacing: 0) {
                            ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                                VisitorMessageItemView(message: message) {
                                    selectedUserId = message.from
                                }
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
                        
                        // 推广区域
                        promotionSection
                            .padding(.top, 40)
                            .padding(.bottom, 40)
                    }
                }
                .refreshable {
                    viewModel.refresh()
                }
            }
        }
        .navigationTitle("访客")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.loadMessages()
        }
        .navigationDestination(item: $selectedUserId) { userId in
            UserProfileView(userId: userId, userName: "")
        }
    }
    
    private var promotionSection: some View {
        VStack(spacing: 16) {
            // 标签
            Text("橘气投食官")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(Color(hex: "#FF6B35"))
                .cornerRadius(12)
            
            // 标题
            Text("做橘气投食官")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)
            
            // 链接
            Button(action: {
                // 查看全部最近来访
            }) {
                Text("查看全部最近来访")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#605D5D"))
            }
            
            // 按钮
            Button(action: {
                // 立即投喂
            }) {
                Text("立即投喂")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color(hex: "#FF6B35"))
                    .cornerRadius(24)
            }
            .padding(.horizontal, 40)
            
            // 描述
            Text("帮助橘气做大做强")
                .font(.system(size: 12))
                .foregroundColor(Color(hex: "#605D5D"))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }
}
