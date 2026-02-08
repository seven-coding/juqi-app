//
//  CommentListView.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import SwiftUI

struct CommentListView: View {
    let postId: String
    let postOwnerId: String?
    let currentUserId: String?
    @State private var comments: [Comment] = []
    @State private var isLoading = false
    @State private var hasMore = true
    @State private var currentPage = 1
    @State private var errorMessage: String?
    @State private var selectedComment: Comment? = nil
    @State private var replyToComment: Comment? = nil
    
    var onReply: ((Comment) -> Void)?
    
    private let pageSize = 20
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if isLoading && comments.isEmpty {
                ProgressView()
                    .tint(Color(hex: "#FF6B35"))
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if comments.isEmpty {
                emptyStateView
            } else {
                commentList
            }
        }
        .task {
            await loadComments()
        }
    }
    
    private var emptyStateView: some View {
        EmptyStateView(
            icon: "bubble.right",
            title: "暂无评论",
            message: "成为第一个评论的人吧"
        )
    }
    
    private var commentList: some View {
        LazyVStack(alignment: .leading, spacing: 0) {
            ForEach(comments) { comment in
                CommentItemView(
                    comment: comment,
                    postId: postId,
                    postOwnerId: postOwnerId,
                    currentUserId: currentUserId,
                    onReply: {
                        onReply?(comment)
                    },
                    onLike: {
                        await toggleLike(comment: comment, isFirstLevel: true)
                    },
                    onDelete: {
                        await deleteComment(comment: comment)
                    },
                    onRefresh: {
                        await refresh()
                    }
                )
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                
                Divider()
                    .background(Color(hex: "#2F3336"))
                    .padding(.leading, 68) // 16(padding) + 40(avatar) + 12(spacing)
                    .padding(.trailing, 16)
            }
            
            if hasMore && !isLoading {
                loadMoreButton
            } else if isLoading {
                loadingIndicator
            }
        }
    }
    
    private func deleteComment(comment: Comment) async {
        do {
            _ = try await APIService.shared.deleteComment(
                commentId: comment.id,
                postId: postId,
                isFirstLevel: true
            )
            
            await MainActor.run {
                withAnimation {
                    comments.removeAll { $0.id == comment.id }
                }
            }
        } catch {
            print("Failed to delete comment: \(error)")
            CrashReporter.shared.logError(error, context: [
                "action": "deleteComment",
                "commentId": comment.id,
                "postId": postId
            ])
            await MainActor.run {
                errorMessage = error.localizedDescription
            }
        }
    }
    
    private var loadMoreButton: some View {
        Button(action: {
            Task {
                await loadMoreComments()
            }
        }) {
            Text("加载更多")
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "#FF6B35"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
        }
    }
    
    private var loadingIndicator: some View {
        ProgressView()
            .tint(Color(hex: "#FF6B35"))
            .frame(maxWidth: .infinity)
            .padding()
    }
    
    private func loadComments() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await APIService.shared.getDynComment(
                postId: postId,
                page: 1,
                limit: pageSize
            )
            
            await MainActor.run {
                comments = response.list
                hasMore = response.hasMore
                currentPage = 1
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
    
    private func loadMoreComments() async {
        guard !isLoading && hasMore else { return }
        
        isLoading = true
        
        do {
            let nextPage = currentPage + 1
            let response = try await APIService.shared.getDynComment(
                postId: postId,
                page: nextPage,
                limit: pageSize
            )
            
            await MainActor.run {
                comments.append(contentsOf: response.list)
                hasMore = response.hasMore
                currentPage = nextPage
                isLoading = false
            }
        } catch {
            await MainActor.run {
                isLoading = false
            }
        }
    }
    
    private func toggleLike(comment: Comment, isFirstLevel: Bool = true) async {
        do {
            _ = try await APIService.shared.likeComment(
                commentId: comment.id,
                postId: postId,
                isFirstLevel: isFirstLevel
            )
        } catch {
            print("Failed to like comment: \(error)")
            // 如果失败，需要回滚UI状态，但这在CommentItemView中已经处理了
        }
    }
    
    func refresh() async {
        currentPage = 1
        comments = []
        await loadComments()
    }
}
