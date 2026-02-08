//
//  MessageDetailView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct MessageDetailView: View {
    let from: String // 发送者ID
    let type: Int // 消息类型
    let title: String // 页面标题
    
    @StateObject private var viewModel: MessageCategoryViewModel
    @State private var inputText: String = ""
    @Environment(\.dismiss) private var dismiss
    
    init(from: String, type: Int, title: String) {
        self.from = from
        self.type = type
        self.title = title
        _viewModel = StateObject(wrappedValue: MessageCategoryViewModel(messageType: type, from: from))
    }
    
    var body: some View {
        ZStack {
            Color(hex: "#000000")
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                if viewModel.isEmpty && !viewModel.isLoading {
                    EmptyStateView(
                        icon: "tray",
                        title: "暂无消息",
                        message: "还没有收到任何消息"
                    )
                } else {
                    messageList
                }
                
                // 输入栏
                inputBar
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.loadMessages()
        }
    }
    
    private var messageList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                    ChatMessageView(
                        message: message,
                        isFromCurrentUser: false // 需要根据实际逻辑判断
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
            .padding(.vertical, 16)
        }
        .refreshable {
            viewModel.refresh()
        }
    }
    
    private var inputBar: some View {
        HStack(spacing: 12) {
            // 输入框
            TextField("输入新消息", text: $inputText)
                .font(.system(size: 15))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color(hex: "#1B1B1B"))
                .cornerRadius(20)
            
            // 附件按钮
            Button(action: {
                // 添加附件
            }) {
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
