//
//  ReplyItemView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct ReplyItemView: View {
    let reply: Comment
    let postOwnerId: String?
    let currentUserId: String?
    let onReply: () -> Void
    let onLike: () async -> Void
    let onDelete: () async -> Void
    
    @State private var isLiked: Bool
    @State private var likeCount: Int
    @State private var selectedImage: String? = nil
    @State private var showImagePreview = false
    @State private var showActionSheet = false
    
    init(reply: Comment, postOwnerId: String? = nil, currentUserId: String? = nil, onReply: @escaping () -> Void, onLike: @escaping () async -> Void, onDelete: @escaping () async -> Void = {}) {
        self.reply = reply
        self.postOwnerId = postOwnerId
        self.currentUserId = currentUserId
        self.onReply = onReply
        self.onLike = onLike
        self.onDelete = onDelete
        _isLiked = State(initialValue: reply.isLiked)
        _likeCount = State(initialValue: reply.likeCount)
    }
    
    private var canDelete: Bool {
        guard let currentUserId = currentUserId else { return false }
        return reply.userId == currentUserId || postOwnerId == currentUserId
    }
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // 用户头像
            NavigationLink(destination: UserProfileView(userId: reply.userId, userName: reply.userName)) {
                AsyncImage(url: URL(string: reply.userAvatar ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color(hex: "#2F3336"))
                        .overlay(
                            Text(reply.userName.isEmpty ? "匿" : String(reply.userName.prefix(1)))
                                .foregroundColor(.white)
                                .font(.system(size: 12, weight: .medium))
                        )
                }
            }
            .frame(width: 32, height: 32)
            .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: 6) {
                // 内容区域可点击弹出选项
                VStack(alignment: .leading, spacing: 6) {
                    // 用户名和回复关系及时间
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(alignment: .center, spacing: 4) {
                            NavigationLink(destination: UserProfileView(userId: reply.userId, userName: reply.userName)) {
                                Text(reply.userName.isEmpty ? "匿名用户" : reply.userName)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(Color(hex: "#FF6B35"))
                            }
                            
                            if let replyToUserName = reply.replyToUserName {
                                Text("回复")
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(hex: "#71767A"))
                                
                                NavigationLink(destination: UserProfileView(userId: reply.replyToUserId ?? "", userName: replyToUserName)) {
                                    Text(replyToUserName)
                                        .font(.system(size: 14, weight: .regular))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        
                        Text(reply.formatDate)
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "#71767A"))
                    }
                    
                    // 回复内容
                    if !reply.content.isEmpty {
                        RichTextView(text: reply.content)
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                    }
                    
                    // 回复图片
                    if let imagePath = reply.imagePath, !imagePath.isEmpty {
                        Button(action: {
                            selectedImage = imagePath
                            showImagePreview = true
                        }) {
                            AsyncImage(url: URL(string: imagePath)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color(hex: "#2F3336"))
                                    .aspectRatio(1, contentMode: .fit)
                                    .overlay(
                                        ProgressView()
                                            .tint(Color(hex: "#FF6B35"))
                                    )
                            }
                        }
                        .frame(width: 150, height: 150)
                        .cornerRadius(5)
                        .clipped()
                        .buttonStyle(PlainButtonStyle())
                    }
                    
                    // @用户显示
                    if let mentionedUsers = reply.mentionedUsers, !mentionedUsers.isEmpty {
                        HStack(spacing: 4) {
                            ForEach(mentionedUsers, id: \.id) { user in
                                NavigationLink(destination: UserProfileView(userId: user.id, userName: user.userName)) {
                                    Text("@\(user.userName)")
                                        .font(.system(size: 13))
                                        .foregroundColor(Color(hex: "#FF6B35"))
                                }
                            }
                        }
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    showActionSheet = true
                }
            }
            
            Spacer()
            
            // 充电按钮 (心形图标)
            Button(action: {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                
                Task {
                    // 先更新UI（乐观更新）
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                        isLiked.toggle()
                        likeCount += isLiked ? 1 : -1
                    }
                    
                    // 然后调用API
                    await onLike()
                }
            }) {
                VStack(spacing: 2) {
                    Image(systemName: isLiked ? "heart.fill" : "heart")
                        .foregroundColor(isLiked ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                        .font(.system(size: 14))
                        .scaleEffect(isLiked ? 1.2 : 1.0)
                        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isLiked)
                    
                    if likeCount > 0 {
                        Text("\(likeCount)")
                            .font(.system(size: 11))
                            .foregroundColor(isLiked ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                            .contentTransition(.numericText())
                    }
                }
            }
            .buttonStyle(PlainButtonStyle())
        }
        .fullScreenCover(isPresented: $showImagePreview) {
            if let image = selectedImage {
                ImagePreviewView(images: [image], currentIndex: 0)
            }
        }
        .confirmationDialog("回复选项", isPresented: $showActionSheet, titleVisibility: .hidden) {
            Button("回复") {
                onReply()
            }
            
            Button("举报", role: .destructive) {
                // 举报逻辑
                print("Report reply: \(reply.id)")
            }
            
            if canDelete {
                Button("删除", role: .destructive) {
                    Task {
                        await onDelete()
                    }
                }
            }
            
            Button("取消", role: .cancel) {}
        }
    }
}
