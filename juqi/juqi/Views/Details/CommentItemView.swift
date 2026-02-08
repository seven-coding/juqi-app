//
//  CommentItemView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct CommentItemView: View {
    let comment: Comment
    let postId: String
    let postOwnerId: String?
    let currentUserId: String?
    let onReply: () -> Void
    let onLike: () async -> Void
    let onDelete: () async -> Void
    let onRefresh: (() async -> Void)?
    
    @State private var isLiked: Bool
    @State private var likeCount: Int
    @State private var showReplies = true
    @State private var selectedImage: String? = nil
    @State private var showImagePreview = false
    @State private var showActionSheet = false
    
    init(comment: Comment, postId: String, postOwnerId: String? = nil, currentUserId: String? = nil, onReply: @escaping () -> Void, onLike: @escaping () async -> Void, onDelete: @escaping () async -> Void = {}, onRefresh: (() async -> Void)? = nil) {
        self.comment = comment
        self.postId = postId
        self.postOwnerId = postOwnerId
        self.currentUserId = currentUserId
        self.onReply = onReply
        self.onLike = onLike
        self.onDelete = onDelete
        self.onRefresh = onRefresh
        _isLiked = State(initialValue: comment.isLiked)
        _likeCount = State(initialValue: comment.likeCount)
    }
    
    private var canDelete: Bool {
        guard let currentUserId = currentUserId else { return false }
        return comment.userId == currentUserId || postOwnerId == currentUserId
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 整个评论区域可点击弹出选项
            VStack(alignment: .leading, spacing: 12) {
                // 评论头部：用户信息 + 点赞按钮
                HStack(alignment: .top, spacing: 12) {
                    // 用户头像
                    NavigationLink(destination: UserProfileView(userId: comment.userId, userName: comment.userName)) {
                        AsyncImage(url: URL(string: comment.userAvatar ?? "")) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Circle()
                                .fill(Color(hex: "#2F3336"))
                                .overlay(
                                    Text(comment.userName.isEmpty ? "匿" : String(comment.userName.prefix(1)))
                                        .foregroundColor(.white)
                                        .font(.system(size: 14, weight: .medium))
                                )
                        }
                    }
                    .frame(width: 40, height: 40)
                    .clipShape(Circle())
                    
                    VStack(alignment: .leading, spacing: 6) {
                        // 用户名和时间
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(alignment: .center, spacing: 8) {
                                NavigationLink(destination: UserProfileView(userId: comment.userId, userName: comment.userName)) {
                                    Text(comment.userName.isEmpty ? "匿名用户" : comment.userName)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(Color(hex: "#FF6B35"))
                                }
                                
                                if comment.forwardStatus == true {
                                    Text("转发")
                                        .font(.system(size: 11))
                                        .foregroundColor(Color(hex: "#71767A"))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color(hex: "#2F3336"))
                                        .cornerRadius(4)
                                }
                            }
                            
                            Text(comment.formatDate)
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#71767A"))
                        }
                        
                        // 评论内容
                        if !comment.content.isEmpty {
                            RichTextView(text: comment.content)
                                .font(.system(size: 15))
                                .foregroundColor(.white)
                        }
                        
                        // 评论图片
                        if let imagePath = comment.imagePath, !imagePath.isEmpty {
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
                            .frame(width: 200, height: 200)
                            .cornerRadius(5)
                            .clipped()
                            .buttonStyle(PlainButtonStyle())
                        }
                        
                        // @用户显示
                        if let mentionedUsers = comment.mentionedUsers, !mentionedUsers.isEmpty {
                            HStack(spacing: 4) {
                                ForEach(mentionedUsers, id: \.id) { user in
                                    NavigationLink(destination: UserProfileView(userId: user.id, userName: user.userName)) {
                                        Text("@\(user.userName)")
                                            .font(.system(size: 14))
                                            .foregroundColor(Color(hex: "#FF6B35"))
                                    }
                                }
                            }
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
                        VStack(spacing: 4) {
                            Image(systemName: isLiked ? "heart.fill" : "heart")
                                .foregroundColor(isLiked ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                                .font(.system(size: 16))
                                .scaleEffect(isLiked ? 1.2 : 1.0)
                                .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isLiked)
                            
                            if likeCount > 0 {
                                Text("\(likeCount)")
                                    .font(.system(size: 12))
                                    .foregroundColor(isLiked ? Color(hex: "#FF6B35") : Color(hex: "#71767A"))
                                    .contentTransition(.numericText())
                            }
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .contentShape(Rectangle())
            .onTapGesture {
                showActionSheet = true
            }
            
            // 二级评论列表
            if let replies = comment.replies, !replies.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    if showReplies {
                        ForEach(replies) { reply in
                            ReplyItemView(
                                reply: reply,
                                postOwnerId: postOwnerId,
                                currentUserId: currentUserId,
                                onReply: {
                                    onReply()
                                },
                                onLike: {
                                    await toggleLikeReply(reply: reply, parentCommentId: comment.id)
                                },
                                onDelete: {
                                    await deleteReply(reply: reply, parentCommentId: comment.id)
                                }
                            )
                            .padding(.leading, 50)
                            .padding(.top, 8)
                        }
                    }
                    
                    // 展开/收起按钮
                    if replies.count > 2 {
                        Button(action: {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                showReplies.toggle()
                            }
                        }) {
                            HStack(spacing: 4) {
                                Text(showReplies ? "收起" : "展开 \(replies.count) 条回复")
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(hex: "#FF6B35"))
                                
                                Image(systemName: showReplies ? "chevron.up" : "chevron.down")
                                    .font(.system(size: 11))
                                    .foregroundColor(Color(hex: "#FF6B35"))
                            }
                            .padding(.leading, 50)
                            .padding(.top, 8)
                        }
                    }
                }
            }
        }
        .fullScreenCover(isPresented: $showImagePreview) {
            if let image = selectedImage {
                ImagePreviewView(images: [image], currentIndex: 0)
            }
        }
        .confirmationDialog("评论选项", isPresented: $showActionSheet, titleVisibility: .hidden) {
            Button("回复") {
                onReply()
            }
            
            Button("举报", role: .destructive) {
                // 举报逻辑
                print("Report comment: \(comment.id)")
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
    
    private func toggleLikeReply(reply: Comment, parentCommentId: String) async {
        do {
            _ = try await APIService.shared.likeComment(
                commentId: reply.id,
                postId: postId,
                isFirstLevel: false
            )
        } catch {
            print("Failed to like reply: \(error)")
            CrashReporter.shared.logError(error, context: [
                "action": "toggleLikeReply",
                "replyId": reply.id,
                "parentCommentId": parentCommentId
            ])
        }
    }
    
    private func deleteReply(reply: Comment, parentCommentId: String) async {
        do {
            _ = try await APIService.shared.deleteComment(
                commentId: reply.id,
                postId: postId,
                isFirstLevel: false
            )
            
            // 刷新评论列表
            if let onRefresh = onRefresh {
                await onRefresh()
            }
        } catch {
            print("Failed to delete reply: \(error)")
            CrashReporter.shared.logError(error, context: [
                "action": "deleteReply",
                "replyId": reply.id,
                "parentCommentId": parentCommentId
            ])
        }
    }
}
