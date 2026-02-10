//
//  MessageView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/11.
//

import SwiftUI

struct MessageView: View {
    @StateObject private var viewModel = MessageViewModel()
    @State private var draggedOffset: CGFloat = 0
    @State private var activeSwipeIndex: Int? = nil
    @State private var navigationPath = NavigationPath()
    
    var body: some View {
        NavigationStack(path: $navigationPath) {
            ZStack {
                Color(hex: "#000000")
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // 顶部导航栏（4个分类入口）- 紧贴最顶部
                    messageNavBar
                        .padding(.top, 0)
                        .padding(.bottom, 20)
                        .background(Color(hex: "#000000"))
                    
                    // 消息列表（首屏加载时显示 loading）
                    if viewModel.isLoading && viewModel.messages.isEmpty {
                        VStack {
                            Spacer()
                            ProgressView()
                                .tint(Color(hex: "#FF6B35"))
                                .scaleEffect(1.2)
                            Text("加载中...")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#605D5D"))
                                .padding(.top, 8)
                            Spacer()
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
                }
            }
            .onAppear {
                viewModel.loadMessages()
            }
            .navigationDestination(for: MessageNavDestination.self) { destination in
                destinationView(for: destination)
            }
        }
    }
    
    // MARK: - 顶部导航栏
    
    private var messageNavBar: some View {
        HStack(spacing: 0) {
            ForEach(viewModel.navItems) { item in
                Button(action: {
                    viewModel.onNavItemTap(item.id)
                    navigationPath.append(MessageNavDestination.category(item.id))
                }) {
                    VStack(spacing: 8) {
                        ZStack {
                            Image(systemName: item.icon)
                                .font(.system(size: 24))
                                .foregroundColor(Color(hex: "#D6D0D0"))
                            
                            // 角标
                            if item.count > 0 {
                                Text(item.count > 99 ? "99+" : "\(item.count)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, item.count > 99 ? 4 : 6)
                                    .padding(.vertical, 2)
                                    .background(Color(hex: "#FA5151"))
                                    .clipShape(Capsule())
                                    .offset(x: 12, y: -12)
                            }
                        }
                        .frame(width: 48, height: 48)
                        
                        Text(item.title)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Color(hex: "#D6D0D0"))
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - 消息列表
    
    private var messageList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                    MessageItemView(
                        message: message,
                        onTap: {
                            navigationPath.append(MessageNavDestination.detail(
                                from: message.from,
                                type: message.groupId ?? message.groupType ?? message.type,
                                title: message.fromName
                            ))
                        },
                        onMarkRead: {
                            viewModel.markAsRead(message: message, index: index)
                        },
                        onDelete: {
                            viewModel.deleteMessage(message: message, index: index)
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
            .padding(.top, 8)
        }
        .refreshable {
            viewModel.refresh()
        }
    }
    
    // MARK: - 导航目标视图
    
    @ViewBuilder
    private func destinationView(for destination: MessageNavDestination) -> some View {
        switch destination {
        case .category(let categoryId):
            switch categoryId {
            case 0:
                ChargeMessageView()
            case 1:
                CommentMessageView()
            case 2:
                AtMessageView()
            case 3:
                VisitorMessageView()
            default:
                EmptyView()
            }
        case .detail(let from, let type, let title):
            MessageDetailView(from: from, type: type, title: title)
        }
    }
}

// MARK: - 导航目标枚举

enum MessageNavDestination: Hashable {
    case category(Int) // 分类页面ID
    case detail(from: String, type: Int, title: String) // 详情页
}

// MARK: - 消息项视图

struct MessageItemView: View {
    let message: Message
    let onTap: () -> Void
    let onMarkRead: () -> Void
    let onDelete: () -> Void
    
    @State private var dragOffset: CGFloat = 0
    @State private var isSwiped = false
    
    private let swipeThreshold: CGFloat = 80
    
    var body: some View {
        ZStack(alignment: .trailing) {
            // 滑动操作按钮
            if isSwiped {
                HStack(spacing: 0) {
                    // 标记已读
                    Button(action: {
                        withAnimation {
                            isSwiped = false
                            dragOffset = 0
                        }
                        onMarkRead()
                    }) {
                        Text("标记为已读")
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                            .frame(width: 80, height: 120)
                            .background(Color(hex: "#1B1B1B"))
                    }
                    
                    // 删除
                    Button(action: {
                        withAnimation {
                            isSwiped = false
                            dragOffset = 0
                        }
                        onDelete()
                    }) {
                        Text("删除")
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                            .frame(width: 80, height: 120)
                            .background(Color(hex: "#CF552B"))
                    }
                }
                .transition(.move(edge: .trailing))
            }
            
            // 消息内容
            HStack(spacing: 0) {
                Button(action: onTap) {
                    HStack(spacing: 12) {
                        // 头像
                        LazyAsyncImage(url: message.fromPhoto) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Circle()
                                .fill(Color(hex: "#1B1B1B"))
                                .overlay(
                                    Image(systemName: message.type == 18 ? "person.fill" : "person")
                                        .font(.system(size: 20))
                                        .foregroundColor(Color(hex: "#605D5D"))
                                )
                        }
                        .frame(width: 56, height: 56)
                        .clipShape(Circle())
                        
                        // 消息内容
                        VStack(alignment: .leading, spacing: 6) {
                            // 发送者名称
                            Text(message.fromName)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(Color(hex: "#D6D0D0").opacity(0.69))
                                .lineLimit(1)
                            
                            // 消息文本
                            Text(message.msgText ?? message.message ?? "")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Color(hex: "#605D5D"))
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        
                        Spacer()
                        
                        // 右侧信息
                        VStack(alignment: .trailing, spacing: 8) {
                            // 时间
                            Text(message.formatDate ?? message.createTime.formatMessageDate())
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#605D5D"))
                            
                            // 未读角标
                            if message.status == 0 && message.noReadCount > 0 {
                                Text(message.noReadCount > 99 ? "99+" : "\(message.noReadCount)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, message.noReadCount > 99 ? 4 : 6)
                                    .padding(.vertical, 2)
                                    .background(Color(hex: "#FA5151"))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                    .background(Color(hex: "#000000"))
                }
                .offset(x: dragOffset)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            if value.translation.width < 0 {
                                dragOffset = max(value.translation.width, -160)
                                if dragOffset < -swipeThreshold {
                                    isSwiped = true
                                }
                            } else if value.translation.width > 0 {
                                dragOffset = min(value.translation.width, 0)
                                if dragOffset > -swipeThreshold {
                                    isSwiped = false
                                }
                            }
                        }
                        .onEnded { value in
                            withAnimation(.spring()) {
                                if value.translation.width < -swipeThreshold {
                                    dragOffset = -160
                                    isSwiped = true
                                } else {
                                    dragOffset = 0
                                    isSwiped = false
                                }
                            }
                        }
                )
            }
        }
        .background(Color(hex: "#000000"))
    }
}
